import { describe, expect, it } from 'vitest';
import { PITCH_TYPES, PITCH_TYPE_IDS } from '../../src/data/pitchTypes';
import { type PitcherProfile, releasePoint, throwPitch } from '../../src/sim/actors/pitcher';
import { PLATE } from '../../src/sim/field';
import { solvePitch } from '../../src/sim/pitch/generator';
import { positionAt, timeAtY, velocityAt } from '../../src/sim/pitch/trajectory';
import type { ThrowingHand } from '../../src/sim/pitch/types';
import { createRng } from '../../src/sim/rng';
import { ftPerSecToMph, ftToIn } from '../../src/sim/units';
import { length, vec3 } from '../../src/sim/vec';
import { absZone } from '../../src/sim/zone/absZone';

const release = (hand: ThrowingHand) => vec3(hand === 'R' ? -1.9 : 1.9, 54.1, 6.0);

describe('solvePitch', () => {
  const rng = createRng('solve');
  const cases = PITCH_TYPE_IDS.flatMap((id) =>
    (['R', 'L'] as const).map((hand) => ({ id, hand, x: rng.float(-1.5, 1.5), z: rng.float(1.0, 4.0) })),
  );

  it.each(cases)('$id from a $hand hander crosses within 0.1 in of its target', ({ id, hand, x, z }) => {
    const def = PITCH_TYPES[id];
    const solved = solvePitch({
      type: def,
      hand,
      speedMph: def.speedMph.mean,
      inducedVerticalIn: def.inducedVerticalIn.mean,
      horizontalIn: def.horizontalIn.mean,
      release: release(hand),
      target: { x, z },
      targetPlaneY: PLATE.midY,
    });
    const t = timeAtY(solved.trajectory, PLATE.midY)!;
    const p = positionAt(solved.trajectory, t);
    expect(ftToIn(Math.abs(p.x - x))).toBeLessThan(0.1);
    expect(ftToIn(Math.abs(p.z - z))).toBeLessThan(0.1);
    expect(ftPerSecToMph(length(solved.trajectory.v0))).toBeCloseTo(def.speedMph.mean, 2);
    const loss = 1 - solved.plateSpeedMph / def.speedMph.mean;
    expect(loss).toBeGreaterThan(def.speedLoss - 0.01);
    expect(loss).toBeLessThan(def.speedLoss + 0.01);
  });

  it('matches a 0.1 ms numeric integration at the plate within 0.05 in', () => {
    const def = PITCH_TYPES.CU;
    const { trajectory } = solvePitch({
      type: def,
      hand: 'R',
      speedMph: 80,
      inducedVerticalIn: -12,
      horizontalIn: 9,
      release: release('R'),
      target: { x: 0.4, z: 1.8 },
      targetPlaneY: PLATE.midY,
    });
    const dt = 1e-4;
    let prev = positionAt(trajectory, 0);
    let v = velocityAt(trajectory, 0);
    let p = prev;
    while (p.y > PLATE.midY) {
      prev = p;
      // Semi-implicit Euler with a small step: independent of the closed form.
      v = vec3(v.x + trajectory.a.x * dt, v.y + trajectory.a.y * dt, v.z + trajectory.a.z * dt);
      p = vec3(p.x + v.x * dt, p.y + v.y * dt, p.z + v.z * dt);
    }
    const f = (prev.y - PLATE.midY) / (prev.y - p.y);
    const numeric = { x: prev.x + (p.x - prev.x) * f, z: prev.z + (p.z - prev.z) * f };
    const exact = positionAt(trajectory, timeAtY(trajectory, PLATE.midY)!);
    expect(ftToIn(Math.abs(numeric.x - exact.x))).toBeLessThan(0.05);
    expect(ftToIn(Math.abs(numeric.z - exact.z))).toBeLessThan(0.05);
  });

  it('moves arm-side pitches toward the third-base side for a right-hander and mirrors for a left-hander', () => {
    const base = {
      speedMph: 94,
      inducedVerticalIn: 15,
      horizontalIn: 8,
      target: { x: 0, z: 2.5 },
      targetPlaneY: PLATE.midY,
    };
    const rhpFastball = solvePitch({ ...base, type: PITCH_TYPES.FF, hand: 'R', release: release('R') });
    const rhpSlider = solvePitch({ ...base, type: PITCH_TYPES.SL, hand: 'R', release: release('R') });
    const lhpFastball = solvePitch({ ...base, type: PITCH_TYPES.FF, hand: 'L', release: release('L') });
    expect(rhpFastball.trajectory.a.x).toBeLessThan(0);
    expect(rhpSlider.trajectory.a.x).toBeGreaterThan(0);
    expect(lhpFastball.trajectory.a.x).toBeGreaterThan(0);
  });

  it('takes about 0.4 s from release to the front of the plate at 95 mph', () => {
    const { flightTimeS } = solvePitch({
      type: PITCH_TYPES.FF,
      hand: 'R',
      speedMph: 94.8,
      inducedVerticalIn: 15.6,
      horizontalIn: 7.8,
      release: release('R'),
      target: { x: 0, z: 2.5 },
      targetPlaneY: PLATE.midY,
    });
    expect(flightTimeS).toBeGreaterThan(0.38);
    expect(flightTimeS).toBeLessThan(0.42);
  });
});

describe('throwPitch', () => {
  const zone = absZone.bounds({ id: 't', name: 'Test', side: 'R', heightFt: 6.1 });

  it.each(PITCH_TYPE_IDS)('keeps %s inside the configured spread around the Appendix B means', (id) => {
    const def = PITCH_TYPES[id];
    const pitcher: PitcherProfile = {
      id: 'p',
      name: 'Test',
      hand: 'R',
      releaseHeightFt: 6,
      releaseSideFt: 1.8,
      extensionFt: 6.4,
      commandSdIn: 3,
      mix: [{ type: id, weight: 1 }],
      setStopS: [0.5, 1.5],
    };
    const rng = createRng(`spread-${id}`);
    let sum = 0;
    const n = 10_000;
    for (let i = 0; i < n; i++) {
      const p = throwPitch(rng.fork(`p${i}`), pitcher, zone, { balls: 0, strikes: 0 });
      expect(Math.abs(p.speedMph - def.speedMph.mean)).toBeLessThanOrEqual(6 * def.speedMph.sd + 1e-9);
      expect(Math.abs(p.movementIn.z - def.inducedVerticalIn.mean)).toBeLessThanOrEqual(
        6 * def.inducedVerticalIn.sd + 1e-9,
      );
      sum += p.speedMph;
    }
    expect(sum / n).toBeCloseTo(def.speedMph.mean, 0);
  });

  it('releases from the arm side, in front of the rubber', () => {
    const r = releasePoint({
      id: 'p',
      name: 'Test',
      hand: 'R',
      releaseHeightFt: 6,
      releaseSideFt: 1.8,
      extensionFt: 6.4,
      commandSdIn: 3,
      mix: [{ type: 'FF', weight: 1 }],
      setStopS: [0.5, 1.5],
    });
    expect(r.x).toBeCloseTo(-1.8);
    expect(r.y).toBeCloseTo(54.1);
  });
});
