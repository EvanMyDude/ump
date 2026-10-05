import { inToFt } from './units';

/**
 * Sim coordinate frame (PITCHf/x convention), in feet:
 * origin at the back point of home plate on the ground, +x toward the catcher's right (first-base side),
 * +y toward the pitcher, +z up. Dimensions follow the 2026 Official Baseball Rules (2.01, 2.02, 3.01).
 */

/** Home plate: a 17-inch square with two corners removed (front edge 17 in, sides 8.5 in, rear edges 12 in). */
export const PLATE = {
  halfWidth: inToFt(8.5),
  /** The 17-inch front edge faces the pitcher. */
  frontY: inToFt(17),
  /** Where the 8.5-inch sides meet the 12-inch rear edges. */
  shoulderY: inToFt(8.5),
  /** Mid-depth plane, 8.5 in from front and back; the ABS zone plane. */
  midY: inToFt(8.5),
  /** Pentagon outline in (x, y), counterclockwise from the back point. */
  outline: [
    { x: 0, y: 0 },
    { x: inToFt(8.5), y: inToFt(8.5) },
    { x: inToFt(8.5), y: inToFt(17) },
    { x: -inToFt(8.5), y: inToFt(17) },
    { x: -inToFt(8.5), y: inToFt(8.5) },
  ],
} as const;

/** Front edge of the pitcher's rubber to the back point of home plate: 60 ft 6 in. */
export const RUBBER_FRONT_Y = 60.5;
export const RUBBER = { width: 2, depth: 0.5 } as const;
/** The rubber sits 10 in above the level of home plate. */
export const MOUND_HEIGHT = inToFt(10);

/** Ball circumference is 9 to 9.25 in, so the diameter is about 2.86 to 2.94 in. UMP uses 2.9 in. */
export const BALL_DIAMETER_IN = 2.9;
export const BALL_RADIUS = inToFt(BALL_DIAMETER_IN / 2);

/** Batter's boxes: 4 ft by 6 ft, inner lines 6 in from the plate, centered on the plate's mid-depth. */
export const BATTERS_BOX = {
  innerX: PLATE.halfWidth + inToFt(6),
  width: 4,
  length: 6,
  centerY: PLATE.midY,
} as const;

export type BattingSide = 'R' | 'L';

/** The batter stands on the third-base side (-x) when batting right-handed. */
export const batterSideSign = (side: BattingSide): -1 | 1 => (side === 'R' ? -1 : 1);
