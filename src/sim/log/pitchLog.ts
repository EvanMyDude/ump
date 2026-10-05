import { DRILL, SESSION } from '../../data/tuning';
import type { PitchRecord, Session } from '../game/session';
import { roundTo } from '../units';
import type { Region } from '../zone/regions';

export const LOG_VERSION = 2;

const r4 = (v: number) => roundTo(v, 4);
const r2 = (v: number) => roundTo(v, 2);

/** Deterministic, rounded fields only, so golden logs compare exactly across runs and engines (R22, KTD2). */
export function logEntry(p: PitchRecord) {
  return {
    i: p.index,
    pitcher: p.pitcher.id,
    batter: p.batter.id,
    side: p.batter.side,
    heightFt: p.batter.heightFt,
    inning: `${p.half === 'top' ? 'T' : 'B'}${p.inning}`,
    outs: p.outsBefore,
    count: p.countBefore,
    runners: [p.basesBefore.first ? 1 : 0, p.basesBefore.second ? 1 : 0, p.basesBefore.third ? 1 : 0].join(
      '',
    ),
    type: p.pitch.typeId,
    mph: r2(p.pitch.speedMph),
    plateMph: r2(p.pitch.plateSpeedMph),
    breakIn: { x: r2(p.pitch.movementIn.x), z: r2(p.pitch.movementIn.z) },
    aimRegion: p.pitch.intended.region,
    crossIn: { x: r2(p.truth.crossing.x * 12), z: r2(p.truth.crossing.z * 12) },
    zoneIn: { bottom: r2(p.zone.bottom * 12), top: r2(p.zone.top * 12) },
    truth: p.truth.isStrike ? 'strike' : 'ball',
    edgeIn: r2(p.truth.edgeDistanceIn),
    region: p.truth.region,
    delivery: { variant: p.delivery.variant, stopS: r4(p.delivery.stopDuration) },
    times: {
      start: r4(p.times.start),
      release: r4(p.times.release - p.times.start),
      catch: r4(p.times.catch - p.times.start),
    },
    paceTargetS: SESSION.paceTargetS,
    call: p.call
      ? { kind: p.call.kind, afterCatchS: r4(p.call.time - p.times.catch), grade: p.call.grade }
      : null,
    timedOut: p.timedOut,
    balk: {
      variant: p.balk.variant,
      calledAtS: p.balk.calledAt === null ? null : r4(p.balk.calledAt - p.times.start),
      correct: p.balk.correct,
      missed: p.balk.missed,
      warning: p.balk.warning,
    },
    challenge: p.challenge ? { by: p.challenge.challenger, overturned: p.challenge.overturned } : null,
    finalCall: p.finalCall,
    outcome: p.outcome,
    correct: p.correct,
    points: p.scoreDelta,
  };
}

export interface SessionSummary {
  readonly pitches: number;
  readonly called: number;
  readonly correct: number;
  readonly accuracy: number | null;
  readonly byRegion: Record<Region, { called: number; correct: number }>;
  readonly timing: { quick: number; clean: number; pro: number; hesitant: number; timeouts: number };
  readonly balks: { occurred: number; spotted: number; missed: number; phantom: number; warnings: number };
  readonly challenges: { total: number; overturned: number; stands: number };
  readonly score: number;
  readonly bestStreak: number;
  /** Mean seconds from one pitch's start to the next (U24 pace target). */
  readonly secondsPerPitch: number | null;
  /** Spot-the-balk drill results (U8), measured against U9's starting balk bar; null in a game. */
  readonly drill: DrillSummary | null;
}

export interface DrillSummary {
  readonly deliveries: number;
  readonly balks: number;
  readonly spotted: number;
  readonly missed: number;
  /** BALK calls made before any violation (on a legal delivery, or too early on a no-stop one), warning included. */
  readonly falseAlarms: number;
  readonly detection: number | null;
  readonly passed: boolean;
}

export function summarize(session: Session): SessionSummary {
  const recs = session.records.filter((r) => r.resolvedAt !== null);
  const byRegion = {
    heart: { called: 0, correct: 0 },
    shadow: { called: 0, correct: 0 },
    chase: { called: 0, correct: 0 },
    waste: { called: 0, correct: 0 },
  };
  const timing = { quick: 0, clean: 0, pro: 0, hesitant: 0, timeouts: 0 };
  const balks = { occurred: 0, spotted: 0, missed: 0, phantom: 0, warnings: 0 };
  const challenges = { total: 0, overturned: 0, stands: 0 };
  let called = 0;
  let correct = 0;
  for (const r of recs) {
    if (r.balk.variant !== 'legal') balks.occurred++;
    if (r.balk.calledAt !== null) {
      if (r.balk.correct) balks.spotted++;
      else if (r.balk.warning) balks.warnings++;
      else balks.phantom++;
    }
    if (r.balk.missed) balks.missed++;
    if (r.timedOut) timing.timeouts++;
    if (r.call) timing[r.call.grade]++;
    if (r.call || r.timedOut) {
      called++;
      byRegion[r.truth.region].called++;
      if (r.correct) {
        correct++;
        byRegion[r.truth.region].correct++;
      }
    }
    if (r.challenge) {
      challenges.total++;
      if (r.challenge.overturned) challenges.overturned++;
      else challenges.stands++;
    }
  }
  const falseAlarms = balks.phantom + balks.warnings;
  const detection = balks.occurred > 0 ? balks.spotted / balks.occurred : null;
  const drill: DrillSummary | null =
    session.mode === 'balkDrill'
      ? {
          deliveries: recs.length,
          balks: balks.occurred,
          spotted: balks.spotted,
          missed: balks.missed,
          falseAlarms,
          detection: detection === null ? null : roundTo(detection, 4),
          passed:
            detection !== null && detection >= DRILL.passDetection && falseAlarms <= DRILL.passMaxFalseAlarms,
        }
      : null;
  const starts = session.records.map((r) => r.times.start);
  const secondsPerPitch =
    starts.length > 1 ? (starts[starts.length - 1]! - starts[0]!) / (starts.length - 1) : null;
  return {
    pitches: recs.length,
    called,
    correct,
    accuracy: called > 0 ? correct / called : null,
    byRegion,
    timing,
    balks,
    challenges,
    score: session.score.total,
    bestStreak: session.score.bestStreak,
    secondsPerPitch: secondsPerPitch === null ? null : roundTo(secondsPerPitch, 2),
    drill,
  };
}

export function sessionLog(session: Session) {
  return {
    version: LOG_VERSION,
    seed: session.seed,
    mode: session.mode,
    pitches: session.records.filter((r) => r.resolvedAt !== null).map(logEntry),
    summary: summarize(session),
  };
}
