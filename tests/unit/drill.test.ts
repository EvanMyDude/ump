import { describe, expect, it } from 'vitest';
import { SCORING } from '../../src/data/scoring';
import { DRILL } from '../../src/data/tuning';
import { type PitchRecord, Session } from '../../src/sim/game/session';
import { summarize } from '../../src/sim/log/pitchLog';

/**
 * Plays a balk drill to the end. `decide` returns when to press BALK for a delivery (session seconds), or null
 * to let it go.
 */
function runDrill(seed: string, decide: (r: PitchRecord) => number | null = () => null): Session {
  const s = new Session({ seed, mode: 'balkDrill' });
  s.start(0);
  for (let guard = 0; guard < 400 && s.phase !== 'done'; guard++) {
    const r = s.current!;
    if (r.resolvedAt === null) {
      const at = decide(r);
      if (at !== null) s.input('balk', at);
    }
    s.update(s.time + 0.5);
  }
  return s;
}

describe('spot-the-balk drill (U8)', () => {
  it('delivers every pitch from the stretch with a runner on and mixes in no-stop balks', () => {
    let balks = 0;
    let total = 0;
    for (const seed of ['drill-1', 'drill-2', 'drill-3', 'drill-4']) {
      const s = runDrill(seed);
      expect(s.phase).toBe('done');
      expect(s.records).toHaveLength(DRILL.deliveries);
      for (const r of s.records) {
        expect(r.runnersOn).toBe(true);
        expect(r.basesBefore).toEqual({ first: true, second: false, third: false });
        expect(r.countBefore).toBe('0-0');
      }
      balks += s.records.filter((r) => r.delivery.variant === 'noStop').length;
      total += s.records.length;
    }
    // About half; with 96 deliveries the share lands well inside this band.
    expect(balks / total).toBeGreaterThan(0.3);
    expect(balks / total).toBeLessThan(0.7);
  });

  it('ignores ball and strike calls', () => {
    const s = new Session({ seed: 'drill-calls', mode: 'balkDrill' });
    s.start(0);
    const r = s.current!;
    s.input('strike', r.times.catch + 0.1);
    expect(r.call).toBeNull();
  });

  it('rewards letting a legal delivery go and penalizes letting a balk go', () => {
    const s = runDrill('drill-let-go');
    for (const r of s.records) {
      expect(r.outcome).toBe('noCall');
      if (r.delivery.variant === 'legal') {
        expect(r.correct).toBe(true);
        expect(r.scoreDelta).toBe(SCORING.drillLegalNoCall);
      } else {
        expect(r.correct).toBe(false);
        expect(r.balk.missed).toBe(true);
        expect(r.scoreDelta).toBe(-SCORING.missedBalk);
      }
    }
  });

  it('passes a run that spots every balk with no false alarms', () => {
    const s = runDrill('drill-perfect', (r) =>
      r.delivery.violationTime === null ? null : r.delivery.violationTime + 0.25,
    );
    const d = summarize(s).drill!;
    expect(d.balks).toBeGreaterThan(0);
    expect(d.spotted).toBe(d.balks);
    expect(d.falseAlarms).toBe(0);
    expect(d.detection).toBe(1);
    expect(d.passed).toBe(true);
  });

  it('fails a run that calls a balk on every delivery, counting the warning as a false alarm', () => {
    // A call while the hands are still coming set is a guess: nothing illegal has happened yet, even on a
    // delivery that is about to skip the stop, so every one of these calls is a false alarm.
    const s = runDrill('drill-trigger-happy', (r) => r.times.setStart + 0.2);
    const d = summarize(s).drill!;
    expect(d.spotted).toBe(0);
    expect(d.falseAlarms).toBe(s.records.length);
    expect(d.passed).toBe(false);
  });

  it('reports no drill block for a regular game', () => {
    const s = new Session({ seed: 'not-a-drill', pitches: 1 });
    s.start(0);
    expect(summarize(s).drill).toBeNull();
  });
});
