import { type Vec3, vec3 } from '../vec';

/**
 * Constant-acceleration flight (the PITCHf/x nine-parameter model, KTD3): initial position, initial velocity,
 * and acceleration on three axes. Time t is seconds since release.
 */
export interface Trajectory {
  readonly p0: Vec3;
  readonly v0: Vec3;
  readonly a: Vec3;
}

export function positionAt(tr: Trajectory, t: number): Vec3 {
  const h = 0.5 * t * t;
  return vec3(
    tr.p0.x + tr.v0.x * t + tr.a.x * h,
    tr.p0.y + tr.v0.y * t + tr.a.y * h,
    tr.p0.z + tr.v0.z * t + tr.a.z * h,
  );
}

export function velocityAt(tr: Trajectory, t: number): Vec3 {
  return vec3(tr.v0.x + tr.a.x * t, tr.v0.y + tr.a.y * t, tr.v0.z + tr.a.z * t);
}

/**
 * Earliest t >= 0 at which the ball's y equals `y`, solved in closed form so plate crossings never depend on
 * frame timing. Returns null if the ball never reaches that plane.
 */
export function timeAtY(tr: Trajectory, y: number): number | null {
  const A = 0.5 * tr.a.y;
  const B = tr.v0.y;
  const C = tr.p0.y - y;
  const EPS = 1e-12;
  if (Math.abs(A) < EPS) {
    if (Math.abs(B) < EPS) return null;
    const t = -C / B;
    return t >= -EPS ? Math.max(0, t) : null;
  }
  const disc = B * B - 4 * A * C;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const q = -0.5 * (B + (B >= 0 ? sq : -sq));
  const roots = [q / A, q !== 0 ? C / q : Number.NaN].filter((t) => Number.isFinite(t) && t >= -EPS);
  if (roots.length === 0) return null;
  return Math.max(0, Math.min(...roots));
}
