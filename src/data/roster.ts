import type { PitcherProfile } from '../sim/actors/pitcher';
import type { Batter } from '../sim/zone/model';

/** Fictional players only (R24). Heights are in feet. */
export const PITCHERS = [
  {
    id: 'calloway',
    name: 'Ray "Rocket" Calloway',
    hand: 'R',
    releaseHeightFt: 6.1,
    releaseSideFt: 1.9,
    extensionFt: 6.6,
    commandSdIn: 4.5,
    mix: [
      { type: 'FF', weight: 55, speedOffsetMph: 2.0 },
      { type: 'SL', weight: 30 },
      { type: 'CH', weight: 15 },
    ],
    setStopS: [0.55, 1.6],
  },
  {
    id: 'marquez',
    name: 'Tito "Smooth" Marquez',
    hand: 'L',
    releaseHeightFt: 5.8,
    releaseSideFt: 2.2,
    extensionFt: 6.2,
    commandSdIn: 4.0,
    mix: [
      { type: 'SI', weight: 40 },
      { type: 'CH', weight: 30 },
      { type: 'ST', weight: 30 },
    ],
    setStopS: [0.6, 1.4],
  },
  {
    id: 'whitfield',
    name: 'Hal "The Professor" Whitfield',
    hand: 'R',
    releaseHeightFt: 5.9,
    releaseSideFt: 1.6,
    extensionFt: 6.3,
    commandSdIn: 3.0,
    mix: [
      { type: 'FF', weight: 35, speedOffsetMph: -2.0 },
      { type: 'FC', weight: 35 },
      { type: 'CU', weight: 30 },
    ],
    setStopS: [0.5, 1.8],
  },
] as const satisfies readonly PitcherProfile[];

export const BATTERS = [
  { id: 'okafor', name: 'Buzz Okafor', side: 'R', heightFt: 6.0 },
  { id: 'pennington', name: 'Dash Pennington', side: 'L', heightFt: 5.75 },
  { id: 'kowalski', name: 'Big Ed Kowalski', side: 'R', heightFt: 6.5 },
  { id: 'sato', name: 'Kenji Sato', side: 'L', heightFt: 5.9 },
  { id: 'albright', name: 'Moose Albright', side: 'R', heightFt: 6.25 },
  { id: 'reyes', name: 'Jojo Reyes', side: 'R', heightFt: 5.6 },
  { id: 'delgado', name: 'Huck Delgado', side: 'L', heightFt: 6.4 },
  { id: 'vance', name: 'Rico Vance', side: 'R', heightFt: 6.1 },
] as const satisfies readonly Batter[];

/** Home whites and road grays keep the batter and the battery easy to tell apart at a glance. */
export const TEAMS = {
  home: { name: 'Harbor City Gulls', short: 'HCG', jersey: 0xf4f4ef, trim: 0x1d3a6b },
  away: { name: 'Mesa Gila Monsters', short: 'MGM', jersey: 0x8f99a4, trim: 0xe0701f },
} as const;
