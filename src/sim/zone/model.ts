import type { BattingSide } from '../field';

export interface Batter {
  readonly id: string;
  readonly name: string;
  readonly side: BattingSide;
  /** Measured standing height without cleats, in feet. */
  readonly heightFt: number;
}

/** Strike zone rectangle in a vertical plane y = planeY, in feet. */
export interface ZoneBounds {
  readonly left: number;
  readonly right: number;
  readonly bottom: number;
  readonly top: number;
  readonly planeY: number;
}

/** KTD4: the truth zone is pluggable so a stance-based rulebook zone can follow the ABS-style one. */
export interface ZoneModel {
  readonly id: 'abs' | 'rulebook';
  bounds(batter: Batter): ZoneBounds;
}
