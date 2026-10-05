import { describe, expect, it } from 'vitest';
import { applyBalk, applyCall, forceAdvance } from '../../src/sim/game/rules';
import { initialGameState } from '../../src/sim/game/state';
import type { GameState } from '../../src/sim/game/state';
import { gradeTiming } from '../../src/sim/call/timing';
import { TIMING } from '../../src/data/tuning';

const withState = (patch: Partial<GameState>): GameState => ({ ...initialGameState(), ...patch });

describe('count and plate appearance rules', () => {
  it('walks the batter on ball four and forces runners', () => {
    const r = applyCall(withState({ balls: 3, bases: { first: true, second: true, third: true } }), 'ball');
    expect(r.outcome).toBe('walk');
    expect(r.runsScored).toBe(1);
    expect(r.state.runs.away).toBe(1);
    expect(r.state.balls).toBe(0);
    expect(r.state.plateAppearances).toBe(1);
  });

  it('moves only forced runners on a walk', () => {
    expect(forceAdvance({ first: false, second: true, third: false })).toEqual({
      bases: { first: true, second: true, third: false },
      runs: 0,
    });
    expect(forceAdvance({ first: true, second: false, third: true })).toEqual({
      bases: { first: true, second: true, third: true },
      runs: 0,
    });
  });

  it('records an out on strike three and ends the half on the third out', () => {
    const k = applyCall(withState({ strikes: 2 }), 'strike');
    expect(k.outcome).toBe('strikeout');
    expect(k.state.outs).toBe(1);
    const third = applyCall(
      withState({ strikes: 2, outs: 2, bases: { first: true, second: false, third: false } }),
      'strike',
    );
    expect(third.halfInningOver).toBe(true);
    expect(third.state.half).toBe('bottom');
    expect(third.state.outs).toBe(0);
    expect(third.state.bases).toEqual({ first: false, second: false, third: false });
    const bottomThird = applyCall(withState({ half: 'bottom', strikes: 2, outs: 2 }), 'strike');
    expect(bottomThird.state.inning).toBe(2);
    expect(bottomThird.state.half).toBe('top');
  });

  it('advances every runner one base on a balk and leaves the count alone', () => {
    const r = applyBalk(
      withState({ balls: 1, strikes: 2, half: 'bottom', bases: { first: true, second: false, third: true } }),
    );
    expect(r.state.bases).toEqual({ first: false, second: true, third: false });
    expect(r.runsScored).toBe(1);
    expect(r.state.runs.home).toBe(1);
    expect(r.state.balls).toBe(1);
    expect(r.state.strikes).toBe(2);
  });
});

describe('call timing (R3)', () => {
  const c = 10;
  it('grades against the glove settling, the coached window, and the late threshold', () => {
    expect(gradeTiming(c - 0.1, c)).toBe('quick');
    expect(gradeTiming(c + TIMING.settleDelayS - 1e-6, c)).toBe('quick');
    expect(gradeTiming(c + TIMING.settleDelayS, c)).toBe('clean');
    expect(gradeTiming(c + TIMING.proWindowS[0], c)).toBe('pro');
    expect(gradeTiming(c + TIMING.proWindowS[1], c)).toBe('pro');
    expect(gradeTiming(c + TIMING.proWindowS[1] + 0.01, c)).toBe('clean');
    expect(gradeTiming(c + TIMING.lateThresholdS + 0.01, c)).toBe('hesitant');
  });
});
