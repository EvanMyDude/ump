/**
 * Umpire camera starting values (plan, Pitch and Perception Model). Coaching puts the nose on or just inside
 * the inside corner (8.5 in from center) and the chin no lower than the top of the catcher's helmet. The game
 * sits about 5 in farther toward the batter so the low outside corner stays visible beside the catcher's helmet;
 * a unit test checks those sightlines for every batter.
 */
export const CAMERA = {
  verticalFovDeg: 55,
  /** Toward the batter's side of the plate's center line, in feet. */
  slotOffsetFt: 1.1,
  /** Behind the back point of the plate, in feet. */
  eyeBehindFt: 3.6,
  eyeHeightFt: 3.55,
  /** Downward tilt so the plate's front edge stays in view below the pitcher. */
  pitchDownDeg: 13,
  /** Breathing sway between pitches only; the camera holds still from the set to the catch. */
  swayFt: 0.012,
  swayHz: 0.22,
  /**
   * Narrow portrait screens widen the vertical FOV until the view spans at least this much horizontally,
   * so the far edge of the plate stays on screen from the slot.
   */
  minHorizontalFovDeg: 46,
} as const;

/** Replay cameras (U7): sim-frame positions and look targets in feet, and vertical FOV in degrees. */
export const REPLAY_VIEWS = {
  catcher: { label: 'Catcher view', position: [0, -5.2, 2.9], lookAt: [0, 10, 2.2], fovDeg: 34 },
  side: { label: 'Side view', position: [13, 0.71, 2.6], lookAt: [0, 0.71, 2.4], fovDeg: 30 },
  overhead: { label: 'Overhead', position: [0, 1.2, 12], lookAt: [0, 1.2, 0], fovDeg: 42 },
} as const;

/**
 * Catcher setup behind the plate (feet, sim frame). `y` places the hips; the forward lean puts the helmet
 * about 1.1 ft ahead of them, close to the umpire, which is what keeps the slot view of the zone open.
 */
export const CATCHER = {
  y: -3.45,
  heightFt: 5.8,
  /** Target helmet-top height in the crouch; unit tests hold the rig to it. */
  helmetTopFt: 3.2,
} as const;
