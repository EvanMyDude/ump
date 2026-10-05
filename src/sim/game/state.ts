export type Half = 'top' | 'bottom';

export interface Bases {
  readonly first: boolean;
  readonly second: boolean;
  readonly third: boolean;
}

export interface GameState {
  readonly inning: number;
  readonly half: Half;
  readonly outs: number;
  readonly balls: number;
  readonly strikes: number;
  readonly bases: Bases;
  readonly runs: { readonly away: number; readonly home: number };
  /** Plate appearances started so far in the game (the next batter's index). */
  readonly plateAppearances: number;
}

export const EMPTY_BASES: Bases = { first: false, second: false, third: false };

export function initialGameState(): GameState {
  return {
    inning: 1,
    half: 'top',
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: EMPTY_BASES,
    runs: { away: 0, home: 0 },
    plateAppearances: 0,
  };
}

export const runnersOn = (s: GameState): boolean => s.bases.first || s.bases.second || s.bases.third;
export const countKey = (s: { readonly balls: number; readonly strikes: number }): string =>
  `${s.balls}-${s.strikes}`;
