import * as THREE from 'three';
import { CAMERA } from '../../data/camera';
import { type BattingSide, batterSideSign } from '../../sim/field';
import { simXYZ } from '../coords';
import { smooth } from '../actors/pose';

export interface CameraTuning {
  verticalFovDeg: number;
  slotOffsetFt: number;
  eyeBehindFt: number;
  eyeHeightFt: number;
  pitchDownDeg: number;
  swayFt: number;
}

const DEG = Math.PI / 180;
const SIDE_MOVE_S = 0.5;

/** Vertical FOV that keeps at least `minHorizontalDeg` across on narrow screens. */
export function effectiveVerticalFov(verticalDeg: number, aspect: number, minHorizontalDeg: number): number {
  const needed = (2 * Math.atan(Math.tan((minHorizontalDeg * DEG) / 2) / Math.max(aspect, 0.01))) / DEG;
  return Math.max(verticalDeg, needed);
}

/**
 * The umpire's eyes in the slot (R1). The owner passes a sway weight: zero from the set to the catch, so the
 * view holds still while the pitch is judged, and up to one between pitches. A new batter's side moves the
 * slot with a short glide instead of a cut.
 */
export class UmpireCamera {
  readonly camera: THREE.PerspectiveCamera;
  readonly tuning: CameraTuning = { ...CAMERA };
  private side: BattingSide = 'R';
  private fromSign = -1;
  private toSign = -1;
  private moveStart = -Infinity;
  private readonly base = new THREE.Vector3();

  constructor() {
    this.camera = new THREE.PerspectiveCamera(CAMERA.verticalFovDeg, 16 / 9, 0.05, 3000);
    this.camera.rotation.order = 'YXZ';
  }

  /** Changes sides with a glide that starts at `time`; the first call places the camera directly. */
  setBatterSide(side: BattingSide, time: number, immediate = false): void {
    const sign = batterSideSign(side);
    if (side === this.side && !immediate) return;
    this.side = side;
    this.fromSign = immediate ? sign : this.currentSign(time);
    this.toSign = sign;
    this.moveStart = time;
  }

  private currentSign(time: number): number {
    const k = smooth((time - this.moveStart) / SIDE_MOVE_S);
    return this.fromSign + (this.toSign - this.fromSign) * k;
  }

  update(time: number, swayWeight: number): void {
    const t = this.tuning;
    simXYZ(this.currentSign(time) * t.slotOffsetFt, -t.eyeBehindFt, t.eyeHeightFt, this.base);
    this.camera.position.copy(this.base);
    if (swayWeight > 0) {
      const amp = swayWeight * t.swayFt;
      this.camera.position.y += Math.sin(time * Math.PI * 2 * CAMERA.swayHz) * amp;
      this.camera.position.x += Math.sin(time * Math.PI * 2 * CAMERA.swayHz * 0.61) * amp * 0.6;
    }
    this.camera.rotation.set(-t.pitchDownDeg * DEG, 0, 0);
    const fov = effectiveVerticalFov(t.verticalFovDeg, this.camera.aspect, CAMERA.minHorizontalFovDeg);
    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld(true);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
