import { describe, expect, it } from 'vitest';
import { PITCHERS } from '../../src/data/roster';
import { SET_POSITION } from '../../src/data/tuning';
import { isLegalSet, phaseAt, planDelivery } from '../../src/sim/actors/pitcherMotion';
import { createRng } from '../../src/sim/rng';

describe('deliveries and the no-stop balk (6.02(a)(13), U8)', () => {
  it('gives every legal set with runners on a stop at least as long as the stillness threshold', () => {
    for (const pitcher of PITCHERS) {
      const rng = createRng(`legal-${pitcher.id}`);
      for (let i = 0; i < 500; i++) {
        const plan = planDelivery(rng.fork(`${i}`), pitcher, { startS: 0, runnersOn: true, balk: false });
        expect(plan.variant).toBe('legal');
        expect(plan.stopDuration).toBeGreaterThanOrEqual(SET_POSITION.stillnessThresholdS);
        expect(isLegalSet(plan)).toBe(true);
        expect(plan.violationTime).toBeNull();
      }
    }
  });

  it('removes the stop in the balk variant and marks when the violation happens', () => {
    const plan = planDelivery(createRng('balk'), PITCHERS[0], { startS: 5, runnersOn: true, balk: true });
    expect(plan.variant).toBe('noStop');
    expect(plan.stopDuration).toBe(0);
    expect(isLegalSet(plan)).toBe(false);
    expect(plan.violationTime).toBe(plan.setTime);
    expect(plan.releaseTime).toBeGreaterThan(plan.setTime);
  });

  it('never balks with the bases empty', () => {
    const plan = planDelivery(createRng('empty'), PITCHERS[1], { startS: 0, runnersOn: false, balk: true });
    expect(plan.variant).toBe('legal');
    expect(isLegalSet(plan)).toBe(true);
  });

  it('orders the phases and reports the phase at a time', () => {
    const plan = planDelivery(createRng('phases'), PITCHERS[2], { startS: 1, runnersOn: true, balk: false });
    for (let i = 1; i < plan.phases.length; i++)
      expect(plan.phases[i]!.start).toBeCloseTo(plan.phases[i - 1]!.end, 12);
    expect(phaseAt(plan, 0.5).phase).toBe('idle');
    expect(phaseAt(plan, plan.setTime + plan.stopDuration / 2).phase).toBe('set');
    expect(phaseAt(plan, plan.releaseTime + 0.01).phase).toBe('follow');
  });
});
