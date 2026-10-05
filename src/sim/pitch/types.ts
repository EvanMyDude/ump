export type ThrowingHand = 'R' | 'L';

export type PitchTypeId = 'FF' | 'SI' | 'FC' | 'SL' | 'ST' | 'CU' | 'CH' | 'FS';

export interface Spread {
  readonly mean: number;
  readonly sd: number;
}

/** League-typical shape of a pitch type. Movement is in inches over the flight to the front of the plate. */
export interface PitchTypeDef {
  readonly id: PitchTypeId;
  readonly name: string;
  readonly speedMph: Spread;
  /** Induced vertical break: movement relative to a gravity-only path; positive means less drop. */
  readonly inducedVerticalIn: Spread;
  /** Horizontal break magnitude; its sign comes from `direction` and the throwing hand. */
  readonly horizontalIn: Spread;
  readonly direction: 'arm' | 'glove';
  /** Fraction of release speed lost by the front of the plate. */
  readonly speedLoss: number;
}
