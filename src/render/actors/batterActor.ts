import * as THREE from 'three';
import { BATTERS_BOX, PLATE, batterSideSign } from '../../sim/field';
import type { Batter } from '../../sim/zone/model';
import { simXYZ } from '../coords';
import { solveTwoBone } from './ik';
import { applyPose, mirrorPose } from './pose';
import { BATTER_POSES } from './poses';
import { type Rig, buildRig } from './rig';

/** Bat and hands in the stance, in the rig's local frame for a right-handed batter (feet, +z toward the plate). */
const STANCE = {
  /** Hands just below and behind the back shoulder, as fractions of height for y. */
  handsBack: 0.5,
  handsHeight: 0.73,
  handsTowardPlate: 0.3,
  /** The bat points up and back over the rear shoulder, so it never crosses the umpire's view of the plate. */
  batDir: [-0.5, 0.8, -0.32] as const,
  batLengthFt: 2.8,
} as const;

/**
 * Batter in the box. Stance stays nearly identical across batters so the truth zone (a fixed share of standing
 * height) sits in the same place on every body; stance variety waits for OQ1 (U10). The hands reach the bat by
 * IK, so the bat's placement is data, not a side effect of joint angles.
 */
export class BatterActor {
  readonly group = new THREE.Group();
  private rig: Rig | null = null;
  private rigKey = '';
  private readonly bat: THREE.Mesh;
  private side: 1 | -1 = -1;
  private readonly anchor = new THREE.Vector3();
  private readonly knobLocal = new THREE.Vector3();
  private readonly dirLocal = new THREE.Vector3();
  private readonly knob = new THREE.Vector3();
  private readonly pole = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();

  constructor() {
    const geometry = new THREE.CylinderGeometry(0.105, 0.04, STANCE.batLengthFt, 12);
    geometry.translate(0, STANCE.batLengthFt / 2, 0);
    this.bat = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xc9a46a }));
    this.bat.castShadow = true;
  }

  setBatter(b: Batter, jersey: number, trim: number): void {
    const key = `${b.id}:${jersey}:${trim}`;
    if (key === this.rigKey) return;
    this.rigKey = key;
    if (this.rig) this.group.remove(this.rig.root);
    this.side = batterSideSign(b.side);
    this.rig = buildRig({ heightFt: b.heightFt, jersey, trim, headwear: 'helmet', gloveHand: null });
    this.rig.root.add(this.bat);
    this.group.add(this.rig.root);
    simXYZ(this.side * (BATTERS_BOX.innerX + 1.55), PLATE.midY - 0.15, 0, this.anchor);
    // A lefty mirrors the stance across the rig's left-right axis.
    const mx = this.side < 0 ? 1 : -1;
    const H = b.heightFt;
    this.knobLocal.set(-STANCE.handsBack * mx, STANCE.handsHeight * H, STANCE.handsTowardPlate);
    this.dirLocal.set(STANCE.batDir[0] * mx, STANCE.batDir[1], STANCE.batDir[2]).normalize();
  }

  update(time: number): void {
    const rig = this.rig;
    if (!rig) return;
    const pose = this.side < 0 ? BATTER_POSES.stance : mirrorPose(BATTER_POSES.stance);
    applyPose(rig, pose, pose, 1, this.anchor, this.side < 0 ? 90 : -90);
    // Small idle sway; the hips stay put so knee height does not wander.
    rig.joints.spine.rotation.z += Math.sin(time * 1.7) * 0.01;
    // Bat waggle: a slow circle of the barrel around its rest direction.
    this.bat.position.copy(this.knobLocal);
    this.tmp
      .set(Math.sin(time * 2.1) * 0.06, 0, Math.cos(time * 2.1) * 0.06)
      .add(this.dirLocal)
      .normalize();
    this.bat.quaternion.setFromUnitVectors(UP, this.tmp);
    rig.root.updateMatrixWorld(true);

    // Both hands grip the handle: the bottom hand (the glove-side hand) at the knob, the top hand above it.
    const bottom = this.side < 0 ? 'L' : 'R';
    const top = this.side < 0 ? 'R' : 'L';
    for (const [side, along] of [
      [bottom, 0.04],
      [top, 0.3],
    ] as const) {
      this.knob.copy(this.dirLocal).multiplyScalar(along).add(this.knobLocal);
      rig.root.localToWorld(this.knob);
      const shoulder = rig.joints[`shoulder${side}`];
      shoulder.getWorldPosition(this.pole);
      this.pole.y -= 1;
      solveTwoBone(shoulder, rig.joints[`elbow${side}`], rig.upperArm, rig.forearm, this.knob, this.pole, 1);
    }
  }
}

const UP = new THREE.Vector3(0, 1, 0);
