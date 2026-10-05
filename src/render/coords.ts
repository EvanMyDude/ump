import * as THREE from 'three';
import type { Vec3 } from '../sim/vec';

/**
 * Sim frame (x catcher's right, y toward the pitcher, z up) to Three.js (y up, camera looking down -z):
 * three.x = sim.x, three.y = sim.z, three.z = -sim.y. One unit is one foot in both.
 */
export function toThree(v: Vec3, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(v.x, v.z, -v.y);
}

export function simXYZ(x: number, y: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(x, z, -y);
}
