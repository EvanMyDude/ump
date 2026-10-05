import { BALL_RADIUS } from '../field';
import { type Trajectory, positionAt, timeAtY } from '../pitch/trajectory';
import { ftToIn } from '../units';
import type { ZoneBounds } from './model';
import { type Region, classifyRegion } from './regions';

/** Floating-point tolerance so a ball exactly tangent to an edge still counts as touching it. */
export const EDGE_EPSILON_IN = 1e-6;

export interface Adjudication {
  readonly isStrike: boolean;
  /**
   * Signed gap between the ball's surface and the zone, in inches: positive means the whole ball missed by
   * that much; zero or negative means some part of the ball touched the zone (a strike).
   */
  readonly edgeDistanceIn: number;
  /** Where the ball's center crossed the zone plane, in feet. */
  readonly crossing: { readonly x: number; readonly z: number };
  /** Seconds after release when the ball's center reached the zone plane. */
  readonly crossingTimeS: number;
  readonly region: Region;
}

/** Signed edge distance for a ball centered at (x, z) in the zone plane (inches; <= 0 is a strike). */
export function edgeDistanceIn(zone: ZoneBounds, x: number, z: number): number {
  const dx = Math.max(zone.left - x, 0, x - zone.right);
  const dz = Math.max(zone.bottom - z, 0, z - zone.top);
  if (dx === 0 && dz === 0) {
    const inside = Math.min(x - zone.left, zone.right - x, z - zone.bottom, zone.top - z);
    return -ftToIn(inside + BALL_RADIUS);
  }
  return ftToIn(Math.sqrt(dx * dx + dz * dz) - BALL_RADIUS);
}

/** The truth for a pitch (R5): geometry only. */
export function adjudicate(trajectory: Trajectory, zone: ZoneBounds): Adjudication {
  const t = timeAtY(trajectory, zone.planeY);
  if (t === null) throw new Error('Pitch never reached the zone plane');
  const p = positionAt(trajectory, t);
  const edge = edgeDistanceIn(zone, p.x, p.z);
  return {
    isStrike: edge <= EDGE_EPSILON_IN,
    edgeDistanceIn: edge,
    crossing: { x: p.x, z: p.z },
    crossingTimeS: t,
    region: classifyRegion(zone, p.x, p.z),
  };
}
