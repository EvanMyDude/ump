import { describe, expect, it } from 'vitest';
import { Session } from '../../src/sim/game/session';
import { SESSION } from '../../src/data/tuning';
import { sessionLog, summarize } from '../../src/sim/log/pitchLog';
import { runScriptedSession } from '../sessionScript';

const advanceUntil = (s: Session, pred: () => boolean, from: number, dt = 1 / 240) => {
  let t = from;
  for (let i = 0; i < 100_000 && !pred(); i++) {
    t += dt;
    s.update(t);
  }
  return t;
};

describe('Session flow', () => {
  it('runs a full session and resolves every pitch', () => {
    const s = runScriptedSession('flow-1', 30);
    expect(s.phase).toBe('done');
    expect(s.records).toHaveLength(30);
    expect(s.records.every((r) => r.resolvedAt !== null)).toBe(true);
    const sum = summarize(s);
    expect(sum.pitches).toBe(30);
    expect(sum.accuracy).not.toBeNull();
  });

  it('ignores ball and strike calls before release', () => {
    const s = new Session({ seed: 'early', pitches: 1 });
    s.start(0);
    const r = s.current!;
    s.input('strike', r.times.release - 0.2);
    expect(r.call).toBeNull();
  });

  it('grades a call before the glove settles as quick and still adjudicates it', () => {
    const s = new Session({ seed: 'quick', pitches: 1 });
    s.start(0);
    const r = s.current!;
    advanceUntil(s, () => s.phase === 'flight', 0);
    s.input(r.truth.isStrike ? 'strike' : 'ball', r.times.catch - 0.01);
    advanceUntil(s, () => r.resolvedAt !== null, r.times.catch - 0.01);
    expect(r.call!.grade).toBe('quick');
    expect(r.correct).toBe(true);
    expect(r.scoreLines.some((l) => l.label === 'Quick call')).toBe(true);
  });

  it('times out an uncalled pitch as a missed call', () => {
    const s = new Session({ seed: 'timeout', pitches: 1 });
    s.start(0);
    const r = s.current!;
    advanceUntil(s, () => r.resolvedAt !== null, 0);
    expect(r.timedOut).toBe(true);
    expect(r.correct).toBe(false);
  });

  it('follows the call, not the truth, for the count', () => {
    const s = new Session({ seed: 'follow', pitches: 1 });
    s.start(0);
    const r = s.current!;
    advanceUntil(s, () => s.phase === 'call', 0);
    const wrong = r.truth.isStrike ? 'ball' : 'strike';
    s.input(wrong, r.times.catch + 0.5);
    advanceUntil(s, () => r.resolvedAt !== null, r.times.catch + 0.5);
    if (!r.challenge?.overturned) {
      expect(r.finalCall).toBe(wrong);
      expect(wrong === 'strike' ? s.state.strikes : s.state.balls).toBe(1);
    }
  });

  it('only opens the balk window with runners on, from the set to the catch', () => {
    for (let seed = 0; seed < 40; seed++) {
      const s = new Session({ seed: `balk-window-${seed}`, pitches: 1 });
      s.start(0);
      const r = s.current!;
      s.input('balk', r.times.setStart - 0.05);
      expect(r.balk.calledAt).toBeNull();
      advanceUntil(s, () => s.phase === 'delivery', 0);
      s.input('balk', r.times.setStart + 0.05);
      if (r.runnersOn) expect(r.balk.calledAt).not.toBeNull();
      else expect(r.balk.calledAt).toBeNull();
    }
  });

  it('awards bases on a balk call even when it is a phantom, after one warning', () => {
    const s = runScriptedSession('phantom', 50);
    const phantoms = s.records.filter((r) => r.balk.calledAt !== null && !r.balk.correct);
    if (phantoms.length > 0) {
      expect(phantoms[0]!.balk.warning).toBe(true);
      expect(phantoms[0]!.scoreDelta).toBe(0);
      for (const p of phantoms.slice(1)) expect(p.scoreDelta).toBeLessThan(0);
    }
    for (const r of s.records.filter((x) => x.balk.calledAt !== null)) expect(r.outcome).toBe('balk');
  });

  it('never exceeds the challenge budget and keeps successful challenges', () => {
    const s = runScriptedSession('challenges', 50, { missEvery: 2 });
    const byTeam = { away: { stands: 0 }, home: { stands: 0 } };
    for (const r of s.records) {
      if (!r.challenge) continue;
      const batting = r.half === 'top' ? 'away' : 'home';
      const fielding = r.half === 'top' ? 'home' : 'away';
      const team = r.challenge.challenger === 'batter' ? batting : fielding;
      expect(r.challenge.overturned).toBe(r.correct === false);
      if (!r.challenge.overturned) byTeam[team].stands++;
    }
    expect(byTeam.away.stands).toBeLessThanOrEqual(2);
    expect(byTeam.home.stands).toBeLessThanOrEqual(2);
  });

  it('starts the next pitch on the pace target when the player lets the game run (U24)', () => {
    const s = new Session({ seed: 'pace', pitches: 12 });
    s.start(0);
    for (let guard = 0; guard < 200 && s.phase !== 'done'; guard++) {
      const r = s.current!;
      if (r.resolvedAt === null) s.input(r.truth.isStrike ? 'strike' : 'ball', r.times.catch + 0.6);
      s.update(s.time + 0.5);
    }
    for (let i = 1; i < s.records.length; i++) {
      const prev = s.records[i - 1]!;
      const gap = s.records[i]!.times.start - prev.times.start;
      const shownAt = prev.challenge ? prev.resolvedAt! + SESSION.challengeShowS : prev.resolvedAt!;
      const expected = Math.max(SESSION.paceTargetS, shownAt + SESSION.minResultHoldS - prev.times.start);
      expect(gap).toBeCloseTo(expected, 6);
      expect(gap).toBeGreaterThanOrEqual(SESSION.paceTargetS - 1e-9);
    }
  });

  it('lets Next start the following pitch ahead of the pace target', () => {
    const s = new Session({ seed: 'pace-next', pitches: 3 });
    s.start(0);
    const r = s.current!;
    s.input(r.truth.isStrike ? 'strike' : 'ball', r.times.catch + 0.6);
    const tap = r.times.catch + 1.0;
    s.input('next', tap);
    expect(s.records).toHaveLength(r.challenge ? 1 : 2);
    if (!r.challenge) expect(s.records[1]!.times.start).toBeCloseTo(tap, 9);
  });

  it('records the pace target and each pitch start in every log entry', () => {
    const log = sessionLog(runScriptedSession('pace-log', 10));
    expect(log.pitches).toHaveLength(10);
    for (const e of log.pitches) {
      expect(e.paceTargetS).toBe(SESSION.paceTargetS);
      expect(typeof e.times.start).toBe('number');
    }
  });

  it('is deterministic for a seed and scripted inputs', () => {
    const a = runScriptedSession('determinism', 25);
    const b = runScriptedSession('determinism', 25);
    expect(a.records.map((r) => [r.pitch.speedMph, r.truth.edgeDistanceIn, r.outcome])).toEqual(
      b.records.map((r) => [r.pitch.speedMph, r.truth.edgeDistanceIn, r.outcome]),
    );
  });
});
