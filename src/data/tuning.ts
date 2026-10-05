import type { Region } from '../sim/zone/regions';

/** Pitch location mix. Defaults follow Tango's 2019-era attack-zone shares (plan Appendix C). */
export const TARGETING = {
  regionWeights: { heart: 0.25, shadow: 0.42, chase: 0.25, waste: 0.08 } satisfies Record<Region, number>,
  /** Pitchers come in when behind in the count and expand when ahead. */
  hitterAheadCounts: ['1-0', '2-0', '3-0', '2-1', '3-1'],
  pitcherAheadCounts: ['0-2', '1-2'],
  hitterAheadMultipliers: { heart: 1.7, shadow: 1.0, chase: 0.6, waste: 0.4 } satisfies Record<
    Region,
    number
  >,
  pitcherAheadMultipliers: { heart: 0.5, shadow: 1.0, chase: 1.6, waste: 1.6 } satisfies Record<
    Region,
    number
  >,
  /** No pitches in the dirt in M1; the sim has no bounce model yet. */
  minTargetHeightFt: 0.7,
} as const;

/**
 * Call timing (R3). The clean window opens after the glove settles so framing has a chance to fool the
 * player; coaching says good umpires wait about 0.75 to 1.15 s after the ball hits the glove (Appendix C).
 */
export const TIMING = {
  settleDelayS: 0.35,
  proWindowS: [0.75, 1.15] as const,
  lateThresholdS: 2.0,
  timeoutS: 3.5,
} as const;

/** Where the catcher receives the pitch, in feet behind the plate's back point (negative y). */
export const CATCH_Y = -1.0;

export const SESSION = {
  pitchesPerSession: 50,
  /** Seconds before the pitcher starts the stretch: batter digs in, catcher sets up. */
  prePitchS: 1.0,
  /** Seconds the result stays up before the next pitch starts on its own. */
  resultHoldS: 2.4,
  /** Pace target the gate records (U24): seconds from one pitch's start to the next. */
  paceTargetS: 8,
  /** Chance a new batter starts with a runner on first, so balks can happen before swings exist (M1). */
  runnerOnFirstChance: 0.4,
  /** Chance a delivery with runners on is a balk variant (arcade frequency, R15). */
  balkChanceWithRunners: 0.25,
  /** No balks in the first plate appearances of a session, so players learn the legal delivery (R19). */
  balkFreeOpeningPitches: 6,
} as const;

/** Game's operationalization of the rule's "complete stop": hands still for a visible beat (U8, U17). */
export const SET_POSITION = {
  stillnessThresholdS: 0.3,
} as const;
