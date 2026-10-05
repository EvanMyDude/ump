import * as THREE from 'three';
import { MOUND_HEIGHT, RUBBER_FRONT_Y } from '../../sim/field';
import type { PitcherProfile } from '../../sim/actors/pitcher';
import { phaseAt } from '../../sim/actors/pitcherMotion';
import type { PitchRecord } from '../../sim/game/session';
import { simXYZ, toThree } from '../coords';
import { solveTwoBone } from './ik';
import { type Pose, applyPose, mirrorPose } from './pose';
import { PITCHER_POSES } from './poses';
import { type Rig, buildRig } from './rig';

type PoseKey = keyof typeof PITCHER_POSES;

/** The arm reaches the release point a little short of full extension, so the elbow keeps a slight bend. */
const REACH_FRACTION = 0.97;

/** Draws the pitcher from the sim's DeliveryPlan; the throwing hand meets the sim release point by IK. */
export class PitcherActor {
  readonly group = new THREE.Group();
  private rig: Rig | null = null;
  private rigKey = '';
  private poses: Record<PoseKey, Pose> = PITCHER_POSES;
  private hand: 'R' | 'L' = 'R';
  private readonly anchor = simXYZ(0, RUBBER_FRONT_Y + 0.35, MOUND_HEIGHT);
  private readonly target = new THREE.Vector3();
  private readonly pole = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();

  setPitcher(p: PitcherProfile, colors: { readonly jersey: number; readonly trim: number }): void {
    const key = `${p.id}:${colors.jersey}:${colors.trim}`;
    if (key === this.rigKey) return;
    this.rigKey = key;
    this.hand = p.hand;
    if (this.rig) this.group.remove(this.rig.root);
    const heightFt = 6.2;
    this.rig = buildRig({
      heightFt,
      jersey: colors.jersey,
      trim: colors.trim,
      headwear: 'cap',
      gloveHand: p.hand === 'R' ? 'L' : 'R',
    });
    this.group.add(this.rig.root);
    const mirrored = Object.fromEntries(
      Object.entries(PITCHER_POSES).map(([k, v]) => [k, mirrorPose(v)]),
    ) as Record<PoseKey, Pose>;
    this.poses = p.hand === 'R' ? PITCHER_POSES : mirrored;
  }

  update(record: PitchRecord | undefined, time: number): void {
    const rig = this.rig;
    if (!rig) return;
    const P = this.poses;
    if (!record) {
      applyPose(rig, P.stand, P.stand, 1, this.anchor);
      return;
    }
    const { phase, progress } = phaseAt(record.delivery, time);
    switch (phase) {
      case 'idle':
        applyPose(rig, P.stand, P.stand, 1, this.anchor);
        break;
      case 'stretch':
        applyPose(rig, P.stand, P.stretch, progress, this.anchor);
        break;
      case 'comeSet':
        applyPose(rig, P.stretch, P.set, progress, this.anchor);
        break;
      case 'set':
        // Exactly still: the visible stop the rule requires (6.02(a)(13)).
        applyPose(rig, P.set, P.set, 1, this.anchor);
        break;
      case 'legLift':
        applyPose(rig, P.set, P.legLift, progress, this.anchor);
        break;
      case 'stride':
        applyPose(rig, P.legLift, P.stride, progress, this.anchor);
        break;
      case 'throw':
        applyPose(rig, P.stride, P.release, progress, this.anchor);
        this.reachRelease(record, progress);
        break;
      case 'follow': {
        const t = Math.min(1, (time - record.delivery.releaseTime) / 0.45);
        applyPose(rig, P.release, P.follow, t, this.anchor);
        this.reachRelease(record, 1 - t);
        break;
      }
    }
    rig.root.updateMatrixWorld(true);
  }

  /** World position of the ball while the pitcher holds it. */
  ballInHand(out: THREE.Vector3): THREE.Vector3 {
    const rig = this.rig;
    if (!rig) return out.copy(this.anchor);
    const hand = rig.joints[this.hand === 'R' ? 'handR' : 'handL'];
    return hand.getWorldPosition(out).add(this.tmp.set(0, -0.05, 0.05));
  }

  /**
   * Bring the throwing hand to the sim's release point. Pitchers differ in height, extension, and arm slot, so
   * when the key pose leaves the point out of reach, the whole body shifts toward it before the arm solves.
   */
  private reachRelease(record: PitchRecord, weight: number): void {
    const rig = this.rig!;
    const side = this.hand === 'R' ? 'R' : 'L';
    toThree(record.pitch.trajectory.p0, this.target);
    const shoulder = rig.joints[`shoulder${side}`];
    rig.root.updateMatrixWorld(true);
    shoulder.getWorldPosition(this.pole);
    this.tmp.subVectors(this.target, this.pole);
    const reach = (rig.upperArm + rig.forearm) * REACH_FRACTION;
    const gap = this.tmp.length() - reach;
    if (gap > 0) {
      rig.root.position.addScaledVector(this.tmp.normalize(), gap * weight);
      rig.root.updateMatrixWorld(true);
      shoulder.getWorldPosition(this.pole);
    }
    this.pole.add(this.tmp.set(this.hand === 'R' ? -1 : 1, -0.6, -0.8));
    solveTwoBone(
      shoulder,
      rig.joints[`elbow${side}`],
      rig.upperArm,
      rig.forearm,
      this.target,
      this.pole,
      weight,
    );
  }
}
