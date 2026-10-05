import type { PitchTypeDef, PitchTypeId } from '../sim/pitch/types';

/**
 * Means are the 2026 Baseball Savant pitch movement leaderboard values in the plan's Appendix B.
 * Standard deviations are per-pitch tuning spreads, not measured league values.
 * Speed loss is an assumption (plan A5) to tune.
 */
export const PITCH_TYPES = {
  FF: {
    id: 'FF',
    name: 'Four-seam fastball',
    speedMph: { mean: 94.8, sd: 1.0 },
    inducedVerticalIn: { mean: 15.6, sd: 1.5 },
    horizontalIn: { mean: 7.8, sd: 1.5 },
    direction: 'arm',
    speedLoss: 0.08,
  },
  SI: {
    id: 'SI',
    name: 'Sinker',
    speedMph: { mean: 94.1, sd: 1.0 },
    inducedVerticalIn: { mean: 7.6, sd: 1.5 },
    horizontalIn: { mean: 15.1, sd: 1.5 },
    direction: 'arm',
    speedLoss: 0.08,
  },
  FC: {
    id: 'FC',
    name: 'Cutter',
    speedMph: { mean: 89.8, sd: 1.0 },
    inducedVerticalIn: { mean: 8.0, sd: 1.5 },
    horizontalIn: { mean: 2.5, sd: 1.2 },
    direction: 'glove',
    speedLoss: 0.08,
  },
  SL: {
    id: 'SL',
    name: 'Slider',
    speedMph: { mean: 86.4, sd: 1.0 },
    inducedVerticalIn: { mean: 1.4, sd: 1.5 },
    horizontalIn: { mean: 4.0, sd: 1.5 },
    direction: 'glove',
    speedLoss: 0.08,
  },
  ST: {
    id: 'ST',
    name: 'Sweeper',
    speedMph: { mean: 82.8, sd: 1.0 },
    inducedVerticalIn: { mean: 1.0, sd: 1.5 },
    horizontalIn: { mean: 13.6, sd: 1.8 },
    direction: 'glove',
    speedLoss: 0.08,
  },
  CU: {
    id: 'CU',
    name: 'Curveball',
    speedMph: { mean: 80.7, sd: 1.0 },
    inducedVerticalIn: { mean: -10.2, sd: 1.8 },
    horizontalIn: { mean: 8.6, sd: 1.8 },
    direction: 'glove',
    speedLoss: 0.08,
  },
  CH: {
    id: 'CH',
    name: 'Changeup',
    speedMph: { mean: 86.0, sd: 1.0 },
    inducedVerticalIn: { mean: 4.2, sd: 1.5 },
    horizontalIn: { mean: 14.1, sd: 1.8 },
    direction: 'arm',
    speedLoss: 0.08,
  },
  FS: {
    id: 'FS',
    name: 'Splitter',
    speedMph: { mean: 86.6, sd: 1.0 },
    inducedVerticalIn: { mean: 3.0, sd: 1.5 },
    horizontalIn: { mean: 10.3, sd: 1.8 },
    direction: 'arm',
    speedLoss: 0.08,
  },
} as const satisfies Record<PitchTypeId, PitchTypeDef>;

export const PITCH_TYPE_IDS = Object.keys(PITCH_TYPES) as PitchTypeId[];
