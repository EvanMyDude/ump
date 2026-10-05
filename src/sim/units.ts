export const IN_PER_FT = 12;
export const FT_PER_S_PER_MPH = 5280 / 3600;
/** Standard gravity in ft/s^2. */
export const GRAVITY_FT_S2 = 32.174;

export const inToFt = (inches: number): number => inches / IN_PER_FT;
export const ftToIn = (feet: number): number => feet * IN_PER_FT;
export const mphToFtPerSec = (mph: number): number => mph * FT_PER_S_PER_MPH;
export const ftPerSecToMph = (ftPerSec: number): number => ftPerSec / FT_PER_S_PER_MPH;

/** Round to a fixed number of decimals so logged values compare exactly across engines (KTD2). */
export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
