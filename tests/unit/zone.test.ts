import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { BALL_RADIUS, PLATE } from '../../src/sim/field';
import type { Trajectory } from '../../src/sim/pitch/trajectory';
import { vec3 } from '../../src/sim/vec';
import { ABS_BOTTOM_FRACTION, ABS_TOP_FRACTION, absZone } from '../../src/sim/zone/absZone';
import { adjudicate, edgeDistanceIn } from '../../src/sim/zone/adjudicate';
import { classifyRegion } from '../../src/sim/zone/regions';

const batter = (heightFt: number, side: 'R' | 'L' = 'R') => ({ id: 'b', name: 'B', side, heightFt });

/** A straight-line pitch that crosses the ABS plane exactly at (x, z). */
const through = (x: number, z: number): Trajectory => ({
  p0: vec3(x, PLATE.midY + 50, z),
  v0: vec3(0, -130, 0),
  a: vec3(0, 0, 0),
});

const height = fc.double({ min: 5.3, max: 6.9, noNaN: true });
const coordX = fc.double({ min: -3, max: 3, noNaN: true });
const coordZ = fc.double({ min: 0, max: 6, noNaN: true });

describe('ABS-style zone', () => {
  it('scales with batter height at 27 and 53.5 percent', () => {
    fc.assert(
      fc.property(height, (h) => {
        const z = absZone.bounds(batter(h));
        expect(z.top).toBeCloseTo(ABS_TOP_FRACTION * h, 12);
        expect(z.bottom).toBeCloseTo(ABS_BOTTOM_FRACTION * h, 12);
        expect(z.planeY).toBeCloseTo(PLATE.midY, 12);
      }),
    );
  });

  it('calls a strike exactly when the signed edge distance is not positive', () => {
    fc.assert(
      fc.property(height, coordX, coordZ, (h, x, z) => {
        const zone = absZone.bounds(batter(h));
        const a = adjudicate(through(x, z), zone);
        expect(a.isStrike).toBe(a.edgeDistanceIn <= 1e-6);
        expect(a.crossing.x).toBeCloseTo(x, 9);
        expect(a.crossing.z).toBeCloseTo(z, 9);
      }),
    );
  });

  it('is a strike when the ball center is inside the zone and a ball when the whole ball is outside', () => {
    fc.assert(
      fc.property(height, coordX, coordZ, (h, x, z) => {
        const zone = absZone.bounds(batter(h));
        const a = adjudicate(through(x, z), zone);
        const inside = x >= zone.left && x <= zone.right && z >= zone.bottom && z <= zone.top;
        const clearlyOut =
          x > zone.right + BALL_RADIUS + 1e-9 ||
          x < zone.left - BALL_RADIUS - 1e-9 ||
          z > zone.top + BALL_RADIUS + 1e-9 ||
          z < zone.bottom - BALL_RADIUS - 1e-9;
        if (inside) expect(a.isStrike).toBe(true);
        if (clearlyOut) expect(a.isStrike).toBe(false);
      }),
    );
  });

  it('mirrors between the two sides of the plate', () => {
    fc.assert(
      fc.property(height, coordX, coordZ, (h, x, z) => {
        const zone = absZone.bounds(batter(h));
        const left = adjudicate(through(-x, z), zone);
        const right = adjudicate(through(x, z), zone);
        expect(left.isStrike).toBe(right.isStrike);
        expect(left.edgeDistanceIn).toBeCloseTo(right.edgeDistanceIn, 9);
      }),
    );
  });

  it('counts a ball that only touches an edge as a strike', () => {
    const zone = absZone.bounds(batter(6.1));
    for (const [x, z] of [
      [zone.right + BALL_RADIUS, 2.5],
      [zone.left - BALL_RADIUS, 2.5],
      [0, zone.top + BALL_RADIUS],
      [0, zone.bottom - BALL_RADIUS],
    ] as const) {
      expect(adjudicate(through(x, z), zone).isStrike).toBe(true);
      expect(
        adjudicate(through(x + Math.sign(x || 1) * 0.01, z + (x === 0 ? Math.sign(z - 2.5) * 0.01 : 0)), zone)
          .isStrike,
      ).toBe(false);
    }
  });

  it('rounds the corners by the ball radius', () => {
    const zone = absZone.bounds(batter(6.1));
    const d = BALL_RADIUS / Math.SQRT2;
    expect(edgeDistanceIn(zone, zone.right + d * 0.99, zone.top + d * 0.99)).toBeLessThan(0);
    expect(
      edgeDistanceIn(zone, zone.right + BALL_RADIUS * 0.9, zone.top + BALL_RADIUS * 0.9),
    ).toBeGreaterThan(0);
  });
});

describe('attack regions', () => {
  it('classifies by distance from the zone center in zone units', () => {
    const zone = absZone.bounds(batter(6.1));
    const cz = (zone.top + zone.bottom) / 2;
    const halfW = zone.right + BALL_RADIUS;
    expect(classifyRegion(zone, 0, cz)).toBe('heart');
    expect(classifyRegion(zone, halfW * 1.0, cz)).toBe('shadow');
    expect(classifyRegion(zone, halfW * 1.5, cz)).toBe('chase');
    expect(classifyRegion(zone, halfW * 2.2, cz)).toBe('waste');
  });
});
