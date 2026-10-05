import { COUNT_WEIGHT } from '../../data/leverage';
import { SCORING } from '../../data/scoring';
import type { TimingGrade } from '../call/timing';

export interface ScoreState {
  readonly total: number;
  readonly streak: number;
  readonly bestStreak: number;
  readonly correct: number;
  readonly called: number;
}

export const INITIAL_SCORE: ScoreState = { total: 0, streak: 0, bestStreak: 0, correct: 0, called: 0 };

export interface ScoreLine {
  readonly label: string;
  readonly points: number;
}

export interface ScoredCall {
  readonly state: ScoreState;
  readonly delta: number;
  readonly lines: readonly ScoreLine[];
}

/** Peaks within an inch of the edge and tapers to 1 by four inches (KTD8). */
export function edgeFactor(edgeIn: number): number {
  const d = Math.abs(edgeIn);
  const { edgePeakIn, edgeTaperIn, edgeMaxFactor } = SCORING;
  if (d <= edgePeakIn) return edgeMaxFactor;
  if (d >= edgeTaperIn) return 1;
  return edgeMaxFactor + ((1 - edgeMaxFactor) * (d - edgePeakIn)) / (edgeTaperIn - edgePeakIn);
}

export const streakMultiplier = (streak: number): number =>
  Math.min(SCORING.streakMaxMultiplier, 1 + SCORING.streakStep * streak);

export function scoreBallStrikeCall(
  state: ScoreState,
  args: {
    readonly correct: boolean;
    readonly countKey: string;
    readonly edgeIn: number;
    readonly timing: TimingGrade | 'timeout';
  },
): ScoredCall {
  const lines: ScoreLine[] = [];
  const leverage = COUNT_WEIGHT[args.countKey] ?? 1;
  let streak = state.streak;
  if (args.timing === 'timeout') {
    lines.push({ label: 'No call', points: -SCORING.timeoutPenalty });
    streak = 0;
  } else if (args.correct) {
    streak += 1;
    const pts = Math.round(
      SCORING.correctBase * leverage * edgeFactor(args.edgeIn) * streakMultiplier(streak - 1),
    );
    lines.push({ label: `Correct x${leverage.toFixed(1)} count`, points: pts });
  } else {
    const egregious = Math.abs(args.edgeIn) >= SCORING.egregiousIn ? 2 : 1;
    lines.push({
      label: egregious > 1 ? 'Missed by a mile' : 'Missed call',
      points: -Math.round(SCORING.wrongBase * leverage * egregious),
    });
    streak = 0;
  }
  if (args.timing === 'quick') lines.push({ label: 'Quick call', points: -SCORING.quickPenalty });
  if (args.timing === 'hesitant') lines.push({ label: 'Hesitant call', points: -SCORING.hesitantPenalty });
  if (args.timing === 'pro' && args.correct) lines.push({ label: 'Pro timing', points: SCORING.proBonus });

  const delta = lines.reduce((s, l) => s + l.points, 0);
  return {
    delta,
    lines,
    state: {
      total: state.total + delta,
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
      correct: state.correct + (args.correct && args.timing !== 'timeout' ? 1 : 0),
      called: state.called + 1,
    },
  };
}

export function scoreLines(state: ScoreState, lines: readonly ScoreLine[]): ScoredCall {
  const delta = lines.reduce((s, l) => s + l.points, 0);
  return { delta, lines, state: { ...state, total: state.total + delta } };
}
