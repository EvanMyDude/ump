import { COUNT_RUN_VALUE } from '../data/leverage';
import { CHALLENGES } from '../data/scoring';
import type { CallKind } from './game/rules';
import type { Rng } from './rng';

export type Challenger = 'batter' | 'catcher';

export interface ChallengeBudget {
  readonly away: number;
  readonly home: number;
}

export interface ChallengeResult {
  readonly challenger: Challenger;
  readonly overturned: boolean;
  /** The AI's estimated chance the call was wrong when it decided to challenge. */
  readonly confidence: number;
  readonly breakeven: number;
}

/** Arithmetic-only squashing (no exp) so decisions match across JavaScript engines (KTD2). */
const softSign = (x: number): number => 0.5 + 0.5 * (x / (1 + Math.abs(x)));

/** Baseball Savant's breakeven confidence for a challenge: 0.2 / (0.2 + run value at stake). */
export const breakevenConfidence = (runValue: number): number =>
  CHALLENGES.challengeValueRuns / (CHALLENGES.challengeValueRuns + runValue);

/**
 * The side hurt by the call may challenge: the batter after a strike, the catcher after a ball. The AI
 * perceives the true edge distance with noise and challenges when its confidence beats the breakeven.
 */
export function considerChallenge(
  rng: Rng,
  args: {
    readonly call: CallKind;
    readonly truthIsStrike: boolean;
    readonly edgeIn: number;
    readonly countKey: string;
    readonly remaining: number;
  },
): ChallengeResult | null {
  if (args.remaining <= 0) return null;
  const challenger: Challenger = args.call === 'strike' ? 'batter' : 'catcher';
  const noise = challenger === 'batter' ? CHALLENGES.batterNoiseIn : CHALLENGES.catcherNoiseIn;
  const perceivedEdge = args.edgeIn + rng.normal(0, noise);
  // The call is wrong if a strike call was really outside (edge > 0), or a ball call was really touching (edge <= 0).
  const signed = args.call === 'strike' ? perceivedEdge : -perceivedEdge;
  const confidence = softSign(signed / CHALLENGES.confidenceScaleIn);
  const breakeven = breakevenConfidence(COUNT_RUN_VALUE[args.countKey] ?? 0.14);
  if (confidence <= breakeven) return null;
  const callWasRight = (args.call === 'strike') === args.truthIsStrike;
  return { challenger, overturned: !callWasRight, confidence, breakeven };
}
