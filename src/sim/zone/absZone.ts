import { PLATE } from '../field';
import type { ZoneModel } from './model';

/**
 * MLB's 2026 ABS challenge zone (plan Appendix A): a 2D rectangle at the plate's mid-depth, 17 in wide,
 * from 27 percent to 53.5 percent of the batter's measured height. A pitch is a strike if any part of the
 * ball touches it (see adjudicate.ts).
 */
export const ABS_TOP_FRACTION = 0.535;
export const ABS_BOTTOM_FRACTION = 0.27;

export const absZone: ZoneModel = {
  id: 'abs',
  bounds: (batter) => ({
    left: -PLATE.halfWidth,
    right: PLATE.halfWidth,
    bottom: ABS_BOTTOM_FRACTION * batter.heightFt,
    top: ABS_TOP_FRACTION * batter.heightFt,
    planeY: PLATE.midY,
  }),
};
