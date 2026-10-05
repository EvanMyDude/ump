import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/sim/rng';

const draw = (seed: string, n: number) => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => rng.next());
};

describe('Rng', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(draw('ump', 50)).toEqual(draw('ump', 50));
  });

  it('differs across seeds', () => {
    expect(draw('ump-a', 10)).not.toEqual(draw('ump-b', 10));
  });

  it('keeps forked streams independent of draws on other streams', () => {
    const a = createRng('root');
    const before = a.fork('pitch').next();
    const b = createRng('root');
    for (let i = 0; i < 1000; i++) b.next();
    b.fork('other').next();
    expect(b.fork('pitch').next()).toBe(before);
  });

  it('stays inside its documented ranges', () => {
    const rng = createRng('ranges');
    for (let i = 0; i < 10_000; i++) {
      const u = rng.next();
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      const n = rng.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThan(7);
      const z = rng.normal(0, 1);
      expect(Math.abs(z)).toBeLessThanOrEqual(6);
    }
  });

  it('produces a roughly standard normal', () => {
    const rng = createRng('normal');
    const xs = Array.from({ length: 20_000 }, () => rng.normal(10, 2));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length);
    expect(mean).toBeCloseTo(10, 1);
    expect(sd).toBeGreaterThan(1.9);
    expect(sd).toBeLessThan(2.1);
  });

  it('respects weights', () => {
    const rng = createRng('weights');
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 10_000; i++)
      counts[
        rng.weighted([
          { item: 'a' as const, weight: 3 },
          { item: 'b' as const, weight: 1 },
        ])
      ]++;
    expect(counts.a / 10_000).toBeGreaterThan(0.72);
    expect(counts.a / 10_000).toBeLessThan(0.78);
  });
});
