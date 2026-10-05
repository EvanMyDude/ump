import { PLATE } from '../field';
import { GRAVITY_FT_S2, ftPerSecToMph, inToFt, mphToFtPerSec } from '../units';
import { type Vec3, length, vec3 } from '../vec';
import { type Trajectory, timeAtY, velocityAt } from './trajectory';
import type { PitchTypeDef, ThrowingHand } from './types';

export interface PitchSpec {
  readonly type: PitchTypeDef;
  readonly hand: ThrowingHand;
  readonly speedMph: number;
  readonly inducedVerticalIn: number;
  /** Magnitude; the sign comes from the pitch type's direction and the throwing hand. */
  readonly horizontalIn: number;
  readonly release: Vec3;
  /** Where the pitch should cross the plane y = targetPlaneY, in feet. */
  readonly target: { readonly x: number; readonly z: number };
  readonly targetPlaneY: number;
  /** Arcade multiplier on movement; 1 is realistic. */
  readonly movementScale?: number;
}

export interface SolvedPitch {
  readonly trajectory: Trajectory;
  /** Seconds from release to the front of the plate. */
  readonly flightTimeS: number;
  readonly plateSpeedMph: number;
  /** Movement actually applied, in the catcher's frame (inches). */
  readonly movementIn: { readonly x: number; readonly z: number };
}

/** +1 moves toward the catcher's right. A right-hander's arm side is the third-base side (-x). */
export function horizontalSign(direction: 'arm' | 'glove', hand: ThrowingHand): 1 | -1 {
  const armSide = hand === 'R' ? -1 : 1;
  return direction === 'arm' ? armSide : (-armSide as 1 | -1);
}

/**
 * Solve the nine-parameter trajectory (KTD3) that leaves `release` at `speedMph`, carries the requested
 * induced movement over the flight to the front of the plate, loses the type's speed fraction, and crosses
 * the target plane at `target`. A short fixed-point iteration keeps the initial speed exact.
 */
export function solvePitch(spec: PitchSpec): SolvedPitch {
  const v = mphToFtPerSec(spec.speedMph);
  const distance = spec.release.y - PLATE.frontY;
  if (distance <= 0) throw new Error('Release must be in front of the plate');
  const plateSpeed = v * (1 - spec.type.speedLoss);
  const k = spec.movementScale ?? 1;
  const mx = inToFt(horizontalSign(spec.type.direction, spec.hand) * spec.horizontalIn * k);
  const mz = inToFt(spec.inducedVerticalIn * k);

  // Drag is modeled as a constant deceleration along y, tuned so the total speed at the front of the plate
  // matches the type's speed loss even when gravity speeds up the vertical component of a big breaker.
  let ay = (v * v - plateSpeed * plateSpeed) / (2 * distance);
  let vx = 0;
  let vy = -v;
  let vz = 0;
  let ax = 0;
  let az = -GRAVITY_FT_S2;
  let tFront = 0;
  for (let i = 0; i < 12; i++) {
    const yOnly: Trajectory = { p0: spec.release, v0: vec3(0, vy, 0), a: vec3(0, ay, 0) };
    const tf = timeAtY(yOnly, PLATE.frontY);
    const tp = timeAtY(yOnly, spec.targetPlaneY);
    if (tf === null || tp === null || tp <= 0) throw new Error('Pitch never reaches the plate');
    tFront = tf;
    ax = (2 * mx) / (tf * tf);
    az = -GRAVITY_FT_S2 + (2 * mz) / (tf * tf);
    vx = (spec.target.x - spec.release.x - 0.5 * ax * tp * tp) / tp;
    vz = (spec.target.z - spec.release.z - 0.5 * az * tp * tp) / tp;
    vy = -Math.sqrt(Math.max(v * v - vx * vx - vz * vz, 0.25 * v * v));
    const vxPlate = vx + ax * tf;
    const vzPlate = vz + az * tf;
    const vyPlate = Math.sqrt(
      Math.max(
        plateSpeed * plateSpeed - vxPlate * vxPlate - vzPlate * vzPlate,
        0.25 * plateSpeed * plateSpeed,
      ),
    );
    ay = (vy * vy - vyPlate * vyPlate) / (2 * distance);
  }
  const trajectory: Trajectory = { p0: spec.release, v0: vec3(vx, vy, vz), a: vec3(ax, ay, az) };
  return {
    trajectory,
    flightTimeS: tFront,
    plateSpeedMph: ftPerSecToMph(length(velocityAt(trajectory, tFront))),
    movementIn: { x: mx * 12, z: mz * 12 },
  };
}
