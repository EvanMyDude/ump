import * as THREE from 'three';

const REST = new THREE.Vector3(0, -1, 0);
const vS = new THREE.Vector3();
const vT = new THREE.Vector3();
const vE = new THREE.Vector3();
const dir = new THREE.Vector3();
const pole = new THREE.Vector3();
const side = new THREE.Vector3();
const local = new THREE.Vector3();
const qParent = new THREE.Quaternion();
const qTarget = new THREE.Quaternion();

function aimBone(bone: THREE.Object3D, worldDir: THREE.Vector3, weight: number): void {
  bone.parent!.getWorldQuaternion(qParent);
  local.copy(worldDir).applyQuaternion(qParent.invert()).normalize();
  qTarget.setFromUnitVectors(REST, local);
  bone.quaternion.slerp(qTarget, weight);
  bone.updateMatrixWorld(true);
}

/**
 * Two-bone IK (KTD5): turn `shoulder` and `elbow` so the end of the forearm reaches `target` (world space).
 * The elbow bends toward `poleHint`. The sim owns targets such as the release point; the rig adapts to it.
 */
export function solveTwoBone(
  shoulder: THREE.Object3D,
  elbow: THREE.Object3D,
  upper: number,
  lower: number,
  target: THREE.Vector3,
  poleHint: THREE.Vector3,
  weight = 1,
): void {
  if (weight <= 0) return;
  shoulder.updateMatrixWorld(true);
  shoulder.getWorldPosition(vS);
  vT.copy(target);
  dir.subVectors(vT, vS);
  const reach = Math.min(Math.max(dir.length(), Math.abs(upper - lower) + 1e-3), upper + lower - 1e-3);
  dir.normalize();
  const cosA = (upper * upper + reach * reach - lower * lower) / (2 * upper * reach);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  pole.copy(poleHint).sub(vS);
  side.copy(dir).multiplyScalar(pole.dot(dir));
  pole.sub(side);
  if (pole.lengthSq() < 1e-8) pole.set(0, -1, 0);
  pole.normalize();
  vE.copy(vS)
    .addScaledVector(dir, upper * cosA)
    .addScaledVector(pole, upper * sinA);
  aimBone(shoulder, dir.subVectors(vE, vS), weight);
  elbow.getWorldPosition(vE);
  aimBone(elbow, dir.subVectors(vT, vE), weight);
}
