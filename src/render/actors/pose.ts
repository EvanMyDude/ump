import * as THREE from 'three';
import type { JointName, Rig } from './rig';

type Deg3 = readonly [number, number, number];

/** A key pose: joint rotations in degrees (XYZ), plus root placement relative to the actor's anchor. */
export interface Pose {
  readonly joints: Partial<Record<JointName, Deg3>>;
  /** Root yaw in degrees (0 faces +z). */
  readonly yaw?: number;
  /** Lowers the hips by this fraction of height (crouch). */
  readonly hipDrop?: number;
  /** Root offset in world feet: x sideways, z toward home plate (+z in three.js). */
  readonly offset?: readonly [number, number];
}

const DEG = Math.PI / 180;
const ALL_JOINTS: JointName[] = [
  'hips',
  'spine',
  'chest',
  'head',
  'shoulderL',
  'elbowL',
  'handL',
  'shoulderR',
  'elbowR',
  'handR',
  'hipL',
  'kneeL',
  'footL',
  'hipR',
  'kneeR',
  'footR',
];

const swapSide = (j: JointName): JointName =>
  (j.endsWith('L') ? `${j.slice(0, -1)}R` : j.endsWith('R') ? `${j.slice(0, -1)}L` : j) as JointName;

/** Mirror a right-hander's pose for a left-hander: swap sides and flip rotations about y and z. */
export function mirrorPose(p: Pose): Pose {
  const joints: Partial<Record<JointName, Deg3>> = {};
  for (const [name, r] of Object.entries(p.joints) as [JointName, Deg3][])
    joints[swapSide(name)] = [r[0], -r[1], -r[2]];
  return {
    joints,
    yaw: p.yaw === undefined ? undefined : -p.yaw,
    hipDrop: p.hipDrop,
    offset: p.offset ? [-p.offset[0], p.offset[1]] : undefined,
  };
}

const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const ea = new THREE.Euler();

function quat(r: Deg3 | undefined, out: THREE.Quaternion): THREE.Quaternion {
  if (!r) return out.identity();
  return out.setFromEuler(ea.set(r[0] * DEG, r[1] * DEG, r[2] * DEG, 'XYZ'));
}

export const smooth = (t: number): number => {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return c * c * (3 - 2 * c);
};

/** Pose the rig between two key poses. `anchor` is the actor's world placement before the pose offset. */
export function applyPose(
  rig: Rig,
  a: Pose,
  b: Pose,
  t: number,
  anchor: THREE.Vector3,
  baseYawDeg = 0,
): void {
  const k = smooth(t);
  for (const name of ALL_JOINTS) {
    quat(a.joints[name], qa);
    quat(b.joints[name], qb);
    rig.joints[name].quaternion.slerpQuaternions(qa, qb, k);
  }
  const yaw = (a.yaw ?? 0) + ((b.yaw ?? 0) - (a.yaw ?? 0)) * k + baseYawDeg;
  rig.root.rotation.set(0, yaw * DEG, 0);
  const drop = (a.hipDrop ?? 0) + ((b.hipDrop ?? 0) - (a.hipDrop ?? 0)) * k;
  rig.joints.hips.position.y = rig.hips0 - drop * rig.heightFt;
  const ox = (a.offset?.[0] ?? 0) + ((b.offset?.[0] ?? 0) - (a.offset?.[0] ?? 0)) * k;
  const oz = (a.offset?.[1] ?? 0) + ((b.offset?.[1] ?? 0) - (a.offset?.[1] ?? 0)) * k;
  rig.root.position.set(anchor.x + ox, anchor.y, anchor.z + oz);
}
