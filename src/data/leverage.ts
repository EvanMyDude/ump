/**
 * Runs swung by turning a ball into a strike in each count: the mean of Walsh 2007, BP 2008-13 (2-1 excluded),
 * Meyer 2014, and Tango RE288 (bases empty, no outs), from the plan's Appendix C. Weights are normalized to 0-0.
 */
export const COUNT_RUN_VALUE: Readonly<Record<string, number>> = {
  '0-0': 0.078,
  '1-0': 0.113,
  '2-0': 0.184,
  '3-0': 0.19,
  '0-1': 0.084,
  '1-1': 0.111,
  '2-1': 0.174,
  '3-1': 0.267,
  '0-2': 0.187,
  '1-2': 0.228,
  '2-2': 0.326,
  '3-2': 0.592,
};

export const COUNT_WEIGHT: Readonly<Record<string, number>> = Object.fromEntries(
  Object.entries(COUNT_RUN_VALUE).map(([k, v]) => [k, Math.round((v / 0.078) * 10) / 10]),
);
