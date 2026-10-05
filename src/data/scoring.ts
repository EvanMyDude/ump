/** Arcade scoring tuning for the U24 slice (KTD8). All values are starting points for playtests. */
export const SCORING = {
  correctBase: 100,
  wrongBase: 60,
  /** Edge factor peaks within this many inches of the zone edge... */
  edgePeakIn: 1,
  /** ...and tapers to 1 by this many inches (humans are unsure across about 3 in each way, Appendix C). */
  edgeTaperIn: 4,
  edgeMaxFactor: 2.5,
  /** Misses beyond this many inches are egregious and cost double. */
  egregiousIn: 3,
  streakStep: 0.1,
  streakMaxMultiplier: 2,
  quickPenalty: 30,
  hesitantPenalty: 15,
  proBonus: 25,
  timeoutPenalty: 80,
  balkSpotted: 300,
  balkSpottedBeforeRelease: 100,
  falseBalk: 150,
  missedBalk: 100,
  challengeStands: 150,
  challengeOverturned: 200,
} as const;

/** Robo-Ump challenge AI (U24): perception noise in inches and the per-team budget (2026 ABS rules). */
export const CHALLENGES = {
  perTeam: 2,
  batterNoiseIn: 1.6,
  catcherNoiseIn: 1.1,
  /** Softness of the AI's sense of whether a call was wrong, in inches. */
  confidenceScaleIn: 0.9,
  /** Value of keeping a challenge, in runs (Baseball Savant's breakeven uses 0.2). */
  challengeValueRuns: 0.2,
} as const;
