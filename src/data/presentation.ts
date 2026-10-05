/** Presentation timing. None of this feeds the sim; it only shapes what the player sees and hears. */
export const FRAME = {
  /** Longest real-time step one frame may apply, so a hidden tab or a hitch never skips a pitch. */
  maxDtS: 0.1,
} as const;

export const PRESENTATION = {
  /** The camera holds still from the set until this long after the catch (U5). */
  steadyAfterCatchS: 0.25,
  /** Idle sway fades in and out over this long around the steady window. */
  swayBlendS: 0.5,
  /** Seconds after a challenge starts before Robo-Ump's answer shows. */
  challengeRevealS: 1.3,
  /** Streak lengths that earn a banner. */
  streakBannerEvery: 5,
  /** A faint copy of the ball in flight draws over the mitt and helmets (OQ6); the tuning panel toggles it. */
  seeThroughBall: true,
} as const;

/** Replays run fast through the windup and slow through the flight (U7). */
export const REPLAY = {
  /** Seconds shown before the release when the bases are empty. */
  leadS: 0.6,
  /** Seconds shown before the set when runners are on, so the stop (or its absence) is visible. */
  setLeadS: 0.3,
  tailS: 0.5,
  slowSpeed: 0.25,
  fastSpeed: 0.6,
  /** The slow band starts this long before the release and ends this long after the catch. */
  slowBeforeReleaseS: 0.12,
  slowAfterCatchS: 0.2,
} as const;
