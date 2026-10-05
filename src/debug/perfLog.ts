/**
 * Frame times and input-to-feedback latency per pitch (U7). They live outside the sim log because they vary
 * by machine; the exported log carries them in a separate `perf` field so golden comparisons skip them.
 */
export interface PitchPerf {
  readonly pitch: number;
  readonly frames: number;
  readonly frameMsP50: number | null;
  readonly frameMsP95: number | null;
  readonly frameMsMax: number | null;
  readonly inputToFeedbackMs: number[];
}

export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[rank]!;
}

const round1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

export class PerfLog {
  private frames = new Map<number, number[]>();
  private latency = new Map<number, number[]>();

  frame(pitch: number, ms: number): void {
    let list = this.frames.get(pitch);
    if (!list) this.frames.set(pitch, (list = []));
    list.push(ms);
  }

  feedback(pitch: number, ms: number): void {
    let list = this.latency.get(pitch);
    if (!list) this.latency.set(pitch, (list = []));
    list.push(Math.round(ms * 10) / 10);
  }

  reset(): void {
    this.frames.clear();
    this.latency.clear();
  }

  export(): PitchPerf[] {
    const pitches = [...new Set([...this.frames.keys(), ...this.latency.keys()])].sort((a, b) => a - b);
    return pitches.map((pitch) => {
      const f = this.frames.get(pitch) ?? [];
      return {
        pitch,
        frames: f.length,
        frameMsP50: round1(percentile(f, 50)),
        frameMsP95: round1(percentile(f, 95)),
        frameMsMax: round1(f.length ? Math.max(...f) : null),
        inputToFeedbackMs: this.latency.get(pitch) ?? [],
      };
    });
  }
}
