import { BALL_RADIUS } from '../field';
import type { Rng } from '../rng';
import type { ZoneBounds } from './model';

/**
 * Statcast attack regions (Tango's zone chart, plan Appendix C), measured from the zone center as a fraction
 * of the half-width or half-height of the zone for the ball's center (edge plus ball radius):
 * heart < 0.67, shadow 0.67 to 1.33, chase 1.33 to 2.0, waste beyond. Regions drive scoring difficulty and
 * reports only, never truth.
 */
export type Region = 'heart' | 'shadow' | 'chase' | 'waste';
export const REGIONS: readonly Region[] = ['heart', 'shadow', 'chase', 'waste'];

export const REGION_BANDS: Readonly<Record<Region, readonly [number, number]>> = {
  heart: [0, 0.67],
  shadow: [0.67, 1.33],
  chase: [1.33, 2.0],
  waste: [2.0, 2.6],
};

interface ZoneFrame {
  cx: number;
  cz: number;
  halfW: number;
  halfH: number;
}

function frame(zone: ZoneBounds): ZoneFrame {
  return {
    cx: (zone.left + zone.right) / 2,
    cz: (zone.bottom + zone.top) / 2,
    halfW: (zone.right - zone.left) / 2 + BALL_RADIUS,
    halfH: (zone.top - zone.bottom) / 2 + BALL_RADIUS,
  };
}

/** Chebyshev distance from the zone center, in zone units (1 = the ball-center edge). */
export function zoneUnits(zone: ZoneBounds, x: number, z: number): number {
  const f = frame(zone);
  return Math.max(Math.abs((x - f.cx) / f.halfW), Math.abs((z - f.cz) / f.halfH));
}

export function classifyRegion(zone: ZoneBounds, x: number, z: number): Region {
  const r = zoneUnits(zone, x, z);
  if (r < REGION_BANDS.heart[1]) return 'heart';
  if (r < REGION_BANDS.shadow[1]) return 'shadow';
  if (r < REGION_BANDS.chase[1]) return 'chase';
  return 'waste';
}

/** Uniform point inside a region's square ring, by rejection sampling. */
export function sampleInRegion(rng: Rng, zone: ZoneBounds, region: Region): { x: number; z: number } {
  const f = frame(zone);
  const [r1, r2] = REGION_BANDS[region];
  for (let i = 0; i < 200; i++) {
    const u = rng.float(-r2, r2);
    const w = rng.float(-r2, r2);
    const r = Math.max(Math.abs(u), Math.abs(w));
    if (r >= r1 && r < r2) return { x: f.cx + u * f.halfW, z: f.cz + w * f.halfH };
  }
  return { x: f.cx + r1 * f.halfW, z: f.cz };
}
