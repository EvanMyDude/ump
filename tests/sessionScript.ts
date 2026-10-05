import { Session, type Intent, type PitchRecord } from '../src/sim/game/session';

/**
 * Deterministic scripted player for tests: calls each pitch at a chosen delay after the catch, deliberately
 * misses some calls, and calls some balks, stepping the clock at a fixed rate.
 */
export function runScriptedSession(
  seed: string,
  pitches: number,
  opts: { dt?: number; missEvery?: number } = {},
) {
  const dt = opts.dt ?? 1 / 120;
  const missEvery = opts.missEvery ?? 5;
  const session = new Session({ seed, pitches });
  let t = 0;
  session.start(t);
  const plan = new Map<number, { intent: Intent; at: number }>();
  for (let guard = 0; guard < 200_000 && session.phase !== 'done'; guard++) {
    t += dt;
    session.update(t);
    const r: PitchRecord | undefined = session.current;
    if (!r) continue;
    if (!plan.has(r.index)) {
      const wantsBalk = r.balk.variant !== 'legal' && r.index % 2 === 0;
      const falseBalk = r.runnersOn && r.balk.variant === 'legal' && r.index % 7 === 3;
      if (wantsBalk) plan.set(r.index, { intent: 'balk', at: r.delivery.violationTime! + 0.25 });
      else if (falseBalk) plan.set(r.index, { intent: 'balk', at: r.times.setStart + 0.2 });
      else {
        const truthful = r.truth.isStrike ? 'strike' : 'ball';
        const wrong = truthful === 'strike' ? 'ball' : 'strike';
        const intent: Intent = r.index % missEvery === missEvery - 1 ? wrong : truthful;
        const delay = r.index % 4 === 0 ? 0.1 : r.index % 4 === 1 ? 0.9 : 0.5;
        plan.set(r.index, { intent, at: r.times.catch + delay });
      }
    }
    const step = plan.get(r.index)!;
    if (step.at <= t && step.at > t - dt) session.input(step.intent, step.at);
    if (session.phase === 'result' && r.index % 3 === 0) session.input('next', t);
  }
  return session;
}
