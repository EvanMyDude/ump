import { describe, expect, it } from 'vitest';
import { BALL_RADIUS, PLATE, RUBBER_FRONT_Y } from '../../src/sim/field';
import { ftToIn } from '../../src/sim/units';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('field geometry (OBR 2.01, 2.02, 3.01)', () => {
  it('builds home plate with a 17 in front edge, 8.5 in sides, and 12 in rear edges', () => {
    const [back, rightRear, rightFront, leftFront, leftRear] = PLATE.outline;
    expect(ftToIn(dist(rightFront!, leftFront!))).toBeCloseTo(17, 6);
    expect(ftToIn(dist(rightRear!, rightFront!))).toBeCloseTo(8.5, 6);
    expect(ftToIn(dist(leftRear!, leftFront!))).toBeCloseTo(8.5, 6);
    expect(ftToIn(dist(back!, rightRear!))).toBeCloseTo(12.02, 2);
    expect(ftToIn(dist(back!, leftRear!))).toBeCloseTo(12.02, 2);
  });

  it('puts the ABS plane at mid-depth, 8.5 in from front and back', () => {
    expect(ftToIn(PLATE.frontY - PLATE.midY)).toBeCloseTo(8.5, 6);
    expect(ftToIn(PLATE.midY)).toBeCloseTo(8.5, 6);
  });

  it('uses the official distances and ball size', () => {
    expect(RUBBER_FRONT_Y).toBe(60.5);
    const circumference = 2 * Math.PI * ftToIn(BALL_RADIUS);
    expect(circumference).toBeGreaterThanOrEqual(9);
    expect(circumference).toBeLessThanOrEqual(9.25);
  });
});
