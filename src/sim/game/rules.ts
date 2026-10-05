import { type Bases, EMPTY_BASES, type GameState } from './state';

export type CallKind = 'strike' | 'ball';
export type PlateOutcome = 'ball' | 'strike' | 'walk' | 'strikeout';

export interface RulesResult {
  readonly state: GameState;
  readonly outcome: PlateOutcome;
  readonly runsScored: number;
  /** The plate appearance ended (walk or strikeout). */
  readonly plateAppearanceOver: boolean;
  /** The third out ended the half-inning. */
  readonly halfInningOver: boolean;
}

function addRuns(state: GameState, runs: number): GameState['runs'] {
  if (runs === 0) return state.runs;
  return state.half === 'top'
    ? { ...state.runs, away: state.runs.away + runs }
    : { ...state.runs, home: state.runs.home + runs };
}

/** Walk: only forced runners move. */
export function forceAdvance(bases: Bases): { bases: Bases; runs: number } {
  if (!bases.first) return { bases: { ...bases, first: true }, runs: 0 };
  if (!bases.second) return { bases: { ...bases, first: true, second: true }, runs: 0 };
  if (!bases.third) return { bases: { first: true, second: true, third: true }, runs: 0 };
  return { bases: { first: true, second: true, third: true }, runs: 1 };
}

/** Balk award (6.02(a) penalty): every runner advances one base; the batter stays. */
export function advanceAllRunners(bases: Bases): { bases: Bases; runs: number } {
  return { bases: { first: false, second: bases.first, third: bases.second }, runs: bases.third ? 1 : 0 };
}

function nextBatter(state: GameState): GameState {
  return { ...state, balls: 0, strikes: 0, plateAppearances: state.plateAppearances + 1 };
}

function endHalf(state: GameState): GameState {
  const toBottom = state.half === 'top';
  return {
    ...state,
    half: toBottom ? 'bottom' : 'top',
    inning: toBottom ? state.inning : state.inning + 1,
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: EMPTY_BASES,
  };
}

/** Apply the umpire's call. The game follows the call, right or wrong, exactly as a real game does. */
export function applyCall(state: GameState, call: CallKind): RulesResult {
  if (call === 'ball') {
    if (state.balls < 3) {
      return {
        state: { ...state, balls: state.balls + 1 },
        outcome: 'ball',
        runsScored: 0,
        plateAppearanceOver: false,
        halfInningOver: false,
      };
    }
    const { bases, runs } = forceAdvance(state.bases);
    return {
      state: nextBatter({ ...state, bases, runs: addRuns(state, runs) }),
      outcome: 'walk',
      runsScored: runs,
      plateAppearanceOver: true,
      halfInningOver: false,
    };
  }
  if (state.strikes < 2) {
    return {
      state: { ...state, strikes: state.strikes + 1 },
      outcome: 'strike',
      runsScored: 0,
      plateAppearanceOver: false,
      halfInningOver: false,
    };
  }
  const outs = state.outs + 1;
  const afterOut = nextBatter({ ...state, outs });
  if (outs >= 3) {
    return {
      state: endHalf(afterOut),
      outcome: 'strikeout',
      runsScored: 0,
      plateAppearanceOver: true,
      halfInningOver: true,
    };
  }
  return {
    state: afterOut,
    outcome: 'strikeout',
    runsScored: 0,
    plateAppearanceOver: true,
    halfInningOver: false,
  };
}

/** Apply a balk call. Like any judgment call, a wrong balk call still awards the bases. */
export function applyBalk(state: GameState): { state: GameState; runsScored: number } {
  const { bases, runs } = advanceAllRunners(state.bases);
  return { state: { ...state, bases, runs: addRuns(state, runs) }, runsScored: runs };
}

/** Scenario helper while M1 has no balls in play: a new batter may start with a runner already on first. */
export function putRunnerOnFirst(state: GameState): GameState {
  return state.bases.first ? state : { ...state, bases: { ...state.bases, first: true } };
}
