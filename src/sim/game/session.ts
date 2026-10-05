import { BATTERS, PITCHERS } from '../../data/roster';
import { CHALLENGES, SCORING } from '../../data/scoring';
import { CATCH_Y, SESSION, TIMING } from '../../data/tuning';
import { type PitcherProfile, type ThrownPitch, throwPitch } from '../actors/pitcher';
import { type DeliveryPlan, planDelivery } from '../actors/pitcherMotion';
import { type TimingGrade, gradeTiming } from '../call/timing';
import { type ChallengeResult, considerChallenge } from '../challenge';
import { timeAtY } from '../pitch/trajectory';
import { type Rng, createRng } from '../rng';
import {
  INITIAL_SCORE,
  type ScoreLine,
  type ScoreState,
  scoreBallStrikeCall,
  scoreLines,
} from '../scoring/arcade';
import { absZone } from '../zone/absZone';
import { type Adjudication, adjudicate } from '../zone/adjudicate';
import type { Batter, ZoneBounds, ZoneModel } from '../zone/model';
import { type CallKind, type PlateOutcome, applyBalk, applyCall, putRunnerOnFirst } from './rules';
import { type Bases, type GameState, type Half, countKey, initialGameState, runnersOn } from './state';

export type Intent = 'strike' | 'ball' | 'balk' | 'next';
export type FlowPhase =
  'ready' | 'prepitch' | 'delivery' | 'flight' | 'call' | 'challenge' | 'result' | 'done';

export interface PitchTimes {
  /** All times are seconds on the session clock. */
  readonly start: number;
  readonly setStart: number;
  readonly release: number;
  readonly cross: number;
  readonly catch: number;
  readonly settle: number;
}

export interface BallStrikeCall {
  readonly kind: CallKind;
  readonly time: number;
  readonly grade: TimingGrade;
}

export interface BalkInfo {
  readonly variant: DeliveryPlan['variant'];
  calledAt: number | null;
  correct: boolean | null;
  missed: boolean;
  warning: boolean;
}

export interface PitchRecord {
  readonly index: number;
  readonly pitcher: PitcherProfile;
  readonly batter: Batter;
  readonly inning: number;
  readonly half: Half;
  readonly outsBefore: number;
  readonly countBefore: string;
  readonly basesBefore: Bases;
  readonly runnersOn: boolean;
  readonly pitch: ThrownPitch;
  readonly zone: ZoneBounds;
  readonly truth: Adjudication;
  readonly delivery: DeliveryPlan;
  readonly times: PitchTimes;
  call: BallStrikeCall | null;
  timedOut: boolean;
  balk: BalkInfo;
  challenge: ChallengeResult | null;
  /** The call that counts after any challenge. */
  finalCall: CallKind | null;
  outcome: PlateOutcome | 'balk' | null;
  correct: boolean | null;
  scoreLines: ScoreLine[];
  scoreDelta: number;
  resolvedAt: number | null;
}

export type SessionEvent =
  | { type: 'pitchStart'; record: PitchRecord }
  | { type: 'release'; record: PitchRecord }
  | { type: 'catch'; record: PitchRecord }
  | { type: 'called'; record: PitchRecord; call: BallStrikeCall }
  | { type: 'balkCalled'; record: PitchRecord; correct: boolean; warning: boolean }
  | { type: 'challenge'; record: PitchRecord; challenge: ChallengeResult }
  | { type: 'resolved'; record: PitchRecord }
  | { type: 'sessionOver' };

export interface SessionOptions {
  readonly seed: string;
  readonly pitches?: number;
  readonly movementScale?: number;
  readonly zoneModel?: ZoneModel;
}

const CHALLENGE_SHOW_S = 2.2;

/**
 * One M1 session: a run of pitches with calls, balks, and challenges (F1, F2). Deterministic for a given
 * seed and timed inputs. The game state follows the umpire's calls, right or wrong, like a real game.
 */
export class Session {
  readonly seed: string;
  readonly pitchesTotal: number;
  private readonly rng: Rng;
  private readonly zoneModel: ZoneModel;
  private readonly movementScale: number;

  state: GameState = initialGameState();
  phase: FlowPhase = 'ready';
  readonly records: PitchRecord[] = [];
  score: ScoreState = INITIAL_SCORE;
  budget = { away: CHALLENGES.perTeam, home: CHALLENGES.perTeam };
  falseBalkWarned = false;
  time = 0;

  private lastPlateAppearance = -1;
  private resultUntil = 0;
  private challengeUntil = 0;
  private pending: SessionEvent[] = [];

  constructor(options: SessionOptions) {
    this.seed = options.seed;
    this.pitchesTotal = options.pitches ?? SESSION.pitchesPerSession;
    this.rng = createRng(options.seed);
    this.zoneModel = options.zoneModel ?? absZone;
    this.movementScale = options.movementScale ?? 1;
  }

  get current(): PitchRecord | undefined {
    return this.records[this.records.length - 1];
  }

  start(time: number): SessionEvent[] {
    if (this.phase !== 'ready') return [];
    this.time = time;
    this.beginPitch(time);
    return this.flush();
  }

  /** Advance the flow to `time`, applying every transition whose moment has passed. */
  update(time: number): SessionEvent[] {
    this.time = Math.max(this.time, time);
    for (let guard = 0; guard < 16; guard++) {
      if (!this.step(this.time)) break;
    }
    return this.flush();
  }

  input(intent: Intent, time: number): SessionEvent[] {
    this.update(time);
    const r = this.current;
    if (intent === 'next') {
      if (this.phase === 'ready') return this.start(time);
      if (this.phase === 'result' && r && r.resolvedAt !== null)
        this.resultUntil = Math.min(this.resultUntil, time);
      return [...this.flush(), ...this.update(time)];
    }
    if (!r) return this.flush();
    if (intent === 'balk') this.callBalk(r, time);
    else this.callBallStrike(r, intent, time);
    return [...this.flush(), ...this.update(time)];
  }

  private flush(): SessionEvent[] {
    const out = this.pending;
    this.pending = [];
    return out;
  }

  private beginPitch(time: number): void {
    const index = this.records.length;
    const prng = this.rng.fork(`pitch:${index}`);

    if (this.state.plateAppearances !== this.lastPlateAppearance) {
      this.lastPlateAppearance = this.state.plateAppearances;
      const pa = this.rng.fork(`pa:${this.state.plateAppearances}`);
      if (!this.state.bases.first && pa.chance(SESSION.runnerOnFirstChance))
        this.state = putRunnerOnFirst(this.state);
    }

    const s = this.state;
    const batter = BATTERS[s.plateAppearances % BATTERS.length]!;
    const halfIndex = (s.inning - 1) * 2 + (s.half === 'top' ? 0 : 1);
    const pitcher = PITCHERS[halfIndex % PITCHERS.length]!;
    const zone = this.zoneModel.bounds(batter);
    const pitch = throwPitch(
      prng.fork('throw'),
      pitcher,
      zone,
      { balls: s.balls, strikes: s.strikes },
      this.movementScale,
    );
    const hasRunners = runnersOn(s);
    const balk =
      hasRunners &&
      index >= SESSION.balkFreeOpeningPitches &&
      prng.fork('balk').chance(SESSION.balkChanceWithRunners);
    const delivery = planDelivery(prng.fork('delivery'), pitcher, {
      startS: time + SESSION.prePitchS,
      runnersOn: hasRunners,
      balk,
    });
    const truth = adjudicate(pitch.trajectory, zone);
    const catchAfterRelease = timeAtY(pitch.trajectory, CATCH_Y) ?? truth.crossingTimeS + 0.02;
    const release = delivery.releaseTime;
    const comeSet = delivery.phases.find((p) => p.phase === 'comeSet')!;

    const record: PitchRecord = {
      index,
      pitcher,
      batter,
      inning: s.inning,
      half: s.half,
      outsBefore: s.outs,
      countBefore: countKey(s),
      basesBefore: s.bases,
      runnersOn: hasRunners,
      pitch,
      zone,
      truth,
      delivery,
      times: {
        start: time,
        setStart: comeSet.start,
        release,
        cross: release + truth.crossingTimeS,
        catch: release + catchAfterRelease,
        settle: release + catchAfterRelease + TIMING.settleDelayS,
      },
      call: null,
      timedOut: false,
      balk: { variant: delivery.variant, calledAt: null, correct: null, missed: false, warning: false },
      challenge: null,
      finalCall: null,
      outcome: null,
      correct: null,
      scoreLines: [],
      scoreDelta: 0,
      resolvedAt: null,
    };
    this.records.push(record);
    this.phase = 'prepitch';
    this.pending.push({ type: 'pitchStart', record });
  }

  /** One transition at most; returns true when something changed. */
  private step(time: number): boolean {
    const r = this.current;
    if (!r) return false;
    switch (this.phase) {
      case 'prepitch':
        if (time >= r.delivery.phases[0]!.start) {
          this.phase = 'delivery';
          return true;
        }
        return false;
      case 'delivery':
        if (time >= r.times.release) {
          this.phase = 'flight';
          this.pending.push({ type: 'release', record: r });
          return true;
        }
        return false;
      case 'flight':
        if (time >= r.times.catch) {
          this.phase = 'call';
          this.pending.push({ type: 'catch', record: r });
          if (r.call && r.resolvedAt === null) this.resolveBallStrike(r, Math.max(time, r.times.catch));
          return true;
        }
        return false;
      case 'call':
        if (r.resolvedAt === null && r.call === null && time >= r.times.catch + TIMING.timeoutS) {
          this.resolveTimeout(r, r.times.catch + TIMING.timeoutS);
          return true;
        }
        return false;
      case 'challenge':
        if (time >= this.challengeUntil) {
          this.phase = 'result';
          this.resultUntil = this.challengeUntil + SESSION.resultHoldS;
          return true;
        }
        return false;
      case 'result':
        if (time >= this.resultUntil && time >= r.times.catch) {
          if (this.records.length >= this.pitchesTotal) {
            this.phase = 'done';
            this.pending.push({ type: 'sessionOver' });
          } else {
            this.beginPitch(Math.max(this.resultUntil, r.times.catch));
          }
          return true;
        }
        return false;
      default:
        return false;
    }
  }

  private callBallStrike(r: PitchRecord, kind: CallKind, time: number): void {
    if (r.call || r.resolvedAt !== null || r.balk.calledAt !== null) return;
    if (this.phase !== 'flight' && this.phase !== 'call') return;
    const call: BallStrikeCall = { kind, time, grade: gradeTiming(time, r.times.catch) };
    r.call = call;
    this.pending.push({ type: 'called', record: r, call });
    if (time >= r.times.catch) this.resolveBallStrike(r, time);
  }

  private callBalk(r: PitchRecord, time: number): void {
    if (!r.runnersOn || r.balk.calledAt !== null || r.resolvedAt !== null || r.call) return;
    if (time < r.times.setStart || time > r.times.catch) return;
    const correct = r.delivery.violationTime !== null && time >= r.delivery.violationTime;
    r.balk.calledAt = time;
    r.balk.correct = correct;
    const lines: ScoreLine[] = [];
    if (correct) {
      lines.push({ label: 'Balk spotted', points: SCORING.balkSpotted });
      if (time < r.times.release)
        lines.push({ label: 'Before the pitch', points: SCORING.balkSpottedBeforeRelease });
    } else if (!this.falseBalkWarned) {
      this.falseBalkWarned = true;
      r.balk.warning = true;
      lines.push({ label: 'Legal delivery (warning)', points: 0 });
    } else {
      lines.push({ label: 'Phantom balk', points: -SCORING.falseBalk });
    }
    const scored = scoreLines(this.score, lines);
    // A phantom balk breaks the streak; a spotted balk or a first-time warning leaves it alone.
    const breaksStreak = !correct && !r.balk.warning;
    this.score = breaksStreak ? { ...scored.state, streak: 0 } : scored.state;
    r.scoreLines = [...lines];
    r.scoreDelta = scored.delta;
    // The call stands either way: a balk call is a judgment call that awards the bases (applyBalk).
    this.state = applyBalk(this.state).state;
    r.outcome = 'balk';
    r.resolvedAt = time;
    this.phase = 'result';
    this.resultUntil = Math.max(time, r.times.catch) + SESSION.resultHoldS;
    this.pending.push({ type: 'balkCalled', record: r, correct, warning: r.balk.warning });
    this.pending.push({ type: 'resolved', record: r });
  }

  private resolveBallStrike(r: PitchRecord, time: number): void {
    const call = r.call!;
    const correct = (call.kind === 'strike') === r.truth.isStrike;
    r.correct = correct;
    const scored = scoreBallStrikeCall(this.score, {
      correct,
      countKey: r.countBefore,
      edgeIn: r.truth.edgeDistanceIn,
      timing: call.grade,
    });
    const lines = [...scored.lines];
    let state = scored.state;
    if (r.balk.variant !== 'legal') {
      r.balk.missed = true;
      lines.push({ label: 'Missed balk', points: -SCORING.missedBalk });
      state = { ...state, total: state.total - SCORING.missedBalk };
    }

    let finalCall = call.kind;
    const battingTeam = r.half === 'top' ? 'away' : 'home';
    const fieldingTeam = r.half === 'top' ? 'home' : 'away';
    const challengerTeam = call.kind === 'strike' ? battingTeam : fieldingTeam;
    const challenge = considerChallenge(this.rng.fork(`challenge:${r.index}`), {
      call: call.kind,
      truthIsStrike: r.truth.isStrike,
      edgeIn: r.truth.edgeDistanceIn,
      countKey: r.countBefore,
      remaining: this.budget[challengerTeam],
    });
    if (challenge) {
      r.challenge = challenge;
      if (challenge.overturned) {
        finalCall = call.kind === 'strike' ? 'ball' : 'strike';
        lines.push({ label: 'Overturned', points: -SCORING.challengeOverturned });
        state = { ...state, total: state.total - SCORING.challengeOverturned };
      } else {
        this.budget = { ...this.budget, [challengerTeam]: this.budget[challengerTeam] - 1 };
        lines.push({ label: 'Call stands', points: SCORING.challengeStands });
        state = { ...state, total: state.total + SCORING.challengeStands };
      }
    }

    this.score = state;
    r.scoreLines = lines;
    r.scoreDelta = lines.reduce((s, l) => s + l.points, 0);
    r.finalCall = finalCall;
    const result = applyCall(this.state, finalCall);
    this.state = result.state;
    r.outcome = result.outcome;
    r.resolvedAt = time;
    if (challenge) {
      this.phase = 'challenge';
      this.challengeUntil = time + CHALLENGE_SHOW_S;
      this.pending.push({ type: 'challenge', record: r, challenge });
    } else {
      this.phase = 'result';
      this.resultUntil = time + SESSION.resultHoldS;
    }
    this.pending.push({ type: 'resolved', record: r });
  }

  private resolveTimeout(r: PitchRecord, time: number): void {
    r.timedOut = true;
    r.correct = false;
    const scored = scoreBallStrikeCall(this.score, {
      correct: false,
      countKey: r.countBefore,
      edgeIn: r.truth.edgeDistanceIn,
      timing: 'timeout',
    });
    this.score = scored.state;
    r.scoreLines = [...scored.lines];
    r.scoreDelta = scored.delta;
    // Nobody called it, so the game takes the true call to keep moving; the player still loses the points.
    r.finalCall = r.truth.isStrike ? 'strike' : 'ball';
    const result = applyCall(this.state, r.finalCall);
    this.state = result.state;
    r.outcome = result.outcome;
    r.resolvedAt = time;
    if (r.balk.variant !== 'legal') r.balk.missed = true;
    this.phase = 'result';
    this.resultUntil = time + SESSION.resultHoldS;
    this.pending.push({ type: 'resolved', record: r });
  }
}
