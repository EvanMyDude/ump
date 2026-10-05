import { TIMING } from '../../data/tuning';

export type TimingGrade = 'quick' | 'clean' | 'pro' | 'hesitant';

export interface TimingConfig {
  readonly settleDelayS: number;
  readonly proWindowS: readonly [number, number];
  readonly lateThresholdS: number;
  readonly timeoutS: number;
}

/**
 * R3: a call before the glove settles is quick, a call after the late threshold is hesitant, and a call
 * inside the coached window (about 0.75 to 1.15 s after the catch) earns a pro tag. Grades never change truth.
 */
export function gradeTiming(callTimeS: number, catchTimeS: number, cfg: TimingConfig = TIMING): TimingGrade {
  // Tolerance keeps exact window edges stable under floating-point subtraction.
  const EPS = 1e-9;
  const dt = callTimeS - catchTimeS;
  if (dt < cfg.settleDelayS - EPS) return 'quick';
  if (dt > cfg.lateThresholdS + EPS) return 'hesitant';
  if (dt >= cfg.proWindowS[0] - EPS && dt <= cfg.proWindowS[1] + EPS) return 'pro';
  return 'clean';
}
