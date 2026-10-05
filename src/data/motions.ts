/** Delivery phase lengths in seconds (U8). The set-position stop length comes from each pitcher's profile. */
export const MOTION_TIMING = {
  stretchS: 0.75,
  comeSetS: 0.45,
  legLiftS: 0.42,
  strideS: 0.26,
  throwS: 0.1,
  followS: 0.7,
  /** With the bases empty no stop is required, so pitchers pause briefly or not at all. */
  basesEmptyStopS: [0.05, 0.9] as const,
} as const;
