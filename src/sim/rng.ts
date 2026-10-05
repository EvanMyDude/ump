/**
 * Seeded, forkable PRNG (sfc32 seeded by cyrb128).
 *
 * Streams are addressed by a label path, so a fork's sequence depends only on the root seed and its labels,
 * never on how many draws another stream made. Adding a draw in one subsystem therefore cannot shift any
 * other subsystem's sequence, which keeps golden logs stable (KTD2).
 *
 * Only integer and IEEE-exact arithmetic is used, so sequences match across JavaScript engines.
 */
export interface Rng {
  /** Label path that identifies this stream, e.g. "seed-1/pitch:3". */
  readonly key: string;
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [min, max). */
  float(min: number, max: number): number;
  /** Uniform integer in [minInclusive, maxExclusive). */
  int(minInclusive: number, maxExclusive: number): number;
  chance(probability: number): boolean;
  /** Approximately normal (Irwin-Hall sum of 12 uniforms), bounded to mean +/- 6 sd. */
  normal(mean?: number, sd?: number): number;
  pick<T>(items: readonly T[]): T;
  /** Weighted pick; weights need not sum to 1. */
  weighted<T>(items: readonly { readonly item: T; readonly weight: number }[]): T;
  /** Independent child stream addressed by label. */
  fork(label: string): Rng;
}

function cyrb128(text: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return () => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

function makeRng(key: string): Rng {
  const [a, b, c, d] = cyrb128(key);
  const gen = sfc32(a, b, c, d);
  for (let i = 0; i < 12; i++) gen();

  return {
    key,
    next: gen,
    float: (min, max) => min + (max - min) * gen(),
    int: (min, max) => min + Math.floor((max - min) * gen()),
    chance: (p) => gen() < p,
    normal: (mean = 0, sd = 1) => {
      let sum = 0;
      for (let i = 0; i < 12; i++) sum += gen();
      return mean + sd * (sum - 6);
    },
    pick: (items) => {
      if (items.length === 0) throw new Error('Rng.pick called with no items');
      return items[Math.floor(gen() * items.length)]!;
    },
    weighted: (items) => {
      const total = items.reduce((s, it) => s + Math.max(0, it.weight), 0);
      if (items.length === 0 || total <= 0) throw new Error('Rng.weighted needs a positive total weight');
      let r = gen() * total;
      for (const it of items) {
        r -= Math.max(0, it.weight);
        if (r < 0) return it.item;
      }
      return items[items.length - 1]!.item;
    },
    fork: (label) => makeRng(`${key}/${label}`),
  };
}

export function createRng(seed: string | number): Rng {
  return makeRng(String(seed));
}
