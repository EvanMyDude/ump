import * as THREE from 'three';
import { CATCHER } from '../../data/camera';
import { CATCH_Y } from '../../data/tuning';
import { positionAt } from '../../sim/pitch/trajectory';
import type { PitchRecord } from '../../sim/game/session';
import { simXYZ, toThree } from '../coords';
import { solveTwoBone } from './ik';
import { applyPose, smooth } from './pose';
import { CATCHER_POSES } from './poses';
import { type Rig, buildRig } from './rig';

/** Crouched catcher whose helmet partly blocks the low view, as in real umpiring. M1 has no framing yet. */
export class CatcherActor {
  readonly group = new THREE.Group();
  private rig: Rig;
  private colorKey = '';
  private readonly anchor = simXYZ(0, CATCHER.y, 0);
  private readonly setup = new THREE.Vector3();
  private readonly catchPoint = new THREE.Vector3();
  private readonly glove = new THREE.Vector3();
  private readonly pole = new THREE.Vector3();

  constructor(jersey: number, trim: number) {
    this.rig = this.build(jersey, trim);
  }

  /** The catcher wears the fielding team's colors, which change every half-inning. */
  setColors(jersey: number, trim: number): void {
    if (`${jersey}:${trim}` === this.colorKey) return;
    this.group.remove(this.rig.root);
    this.rig = this.build(jersey, trim);
  }

  private build(jersey: number, trim: number): Rig {
    this.colorKey = `${jersey}:${trim}`;
    const rig = buildRig({
      heightFt: CATCHER.heightFt,
      jersey,
      trim,
      headwear: 'catcher',
      gloveHand: 'L',
      gear: true,
      headScale: 0.85,
    });
    this.group.add(rig.root);
    return rig;
  }

  /** Where the glove is now (world), for drawing the ball after the catch. */
  gloveWorld(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.glove);
  }

  update(record: PitchRecord | undefined, time: number): void {
    const rig = this.rig;
    applyPose(rig, CATCHER_POSES.crouch, CATCHER_POSES.crouch, 1, this.anchor, 180);
    rig.root.updateMatrixWorld(true);
    if (!record) return;
    simXYZ(record.pitch.intended.x, CATCH_Y + 0.15, Math.max(1.0, record.pitch.intended.z), this.setup);
    const tCatch = record.times.catch - record.times.release;
    toThree(positionAt(record.pitch.trajectory, tCatch), this.catchPoint);
    const reactStart = record.times.catch - 0.2;
    const k = smooth((time - reactStart) / 0.2);
    this.glove.lerpVectors(this.setup, this.catchPoint, k);
    // A little give back toward the body after the catch.
    if (time > record.times.catch) this.glove.z += Math.min(0.25, (time - record.times.catch) * 1.2);
    rig.joints.shoulderL.getWorldPosition(this.pole);
    this.pole.add(new THREE.Vector3(-0.8, -0.6, 0.3));
    solveTwoBone(
      rig.joints.shoulderL,
      rig.joints.elbowL,
      rig.upperArm,
      rig.forearm,
      this.glove,
      this.pole,
      1,
    );
  }
}
