import { PITCH_TYPES } from '../../data/pitchTypes';
import { TARGETING } from '../../data/tuning';
import { RUBBER_FRONT_Y } from '../field';
import { type SolvedPitch, horizontalSign, solvePitch } from '../pitch/generator';
import type { PitchTypeId, ThrowingHand } from '../pitch/types';
import type { Rng } from '../rng';
import { inToFt } from '../units';
import { type Vec3, vec3 } from '../vec';
import type { ZoneBounds } from '../zone/model';
import { REGIONS, type Region, sampleInRegion } from '../zone/regions';

export interface PitchMixEntry {
  readonly type: PitchTypeId;
  readonly weight: number;
  readonly speedOffsetMph?: number;
  readonly verticalOffsetIn?: number;
  readonly horizontalOffsetIn?: number;
}

export interface PitcherProfile {
  readonly id: string;
  readonly name: string;
  readonly hand: ThrowingHand;
  /** Release height above the level of home plate, in feet. */
  readonly releaseHeightFt: number;
  /** Release distance to the arm side of the rubber's center, in feet. */
  readonly releaseSideFt: number;
  /** How far in front of the rubber the ball is released, in feet (a typical MLB value is about 6.4). */
  readonly extensionFt: number;
  /** Standard deviation of the miss from the aim point, in inches. */
  readonly commandSdIn: number;
  readonly mix: readonly PitchMixEntry[];
  /** Range of legal set-position stop lengths with runners on, in seconds. */
  readonly setStopS: readonly [number, number];
}

export interface Count {
  readonly balls: number;
  readonly strikes: number;
}

export interface ThrownPitch extends SolvedPitch {
  readonly typeId: PitchTypeId;
  readonly speedMph: number;
  /** Where the pitcher aimed before command noise, and which region that was. */
  readonly intended: { readonly x: number; readonly z: number; readonly region: Region };
}

export function releasePoint(p: PitcherProfile): Vec3 {
  return vec3(
    horizontalSign('arm', p.hand) * p.releaseSideFt,
    RUBBER_FRONT_Y - p.extensionFt,
    p.releaseHeightFt,
  );
}

function regionWeights(count: Count): { item: Region; weight: number }[] {
  const key = `${count.balls}-${count.strikes}`;
  const mult = (TARGETING.hitterAheadCounts as readonly string[]).includes(key)
    ? TARGETING.hitterAheadMultipliers
    : (TARGETING.pitcherAheadCounts as readonly string[]).includes(key)
      ? TARGETING.pitcherAheadMultipliers
      : null;
  return REGIONS.map((r) => ({ item: r, weight: TARGETING.regionWeights[r] * (mult ? mult[r] : 1) }));
}

/** Choose a pitch, an aim point by attack region, and a command miss, then solve its flight. */
export function throwPitch(
  rng: Rng,
  pitcher: PitcherProfile,
  zone: ZoneBounds,
  count: Count,
  movementScale = 1,
): ThrownPitch {
  const entry = rng.weighted(pitcher.mix.map((m) => ({ item: m, weight: m.weight })));
  const def = PITCH_TYPES[entry.type];
  const speedMph = rng.normal(def.speedMph.mean + (entry.speedOffsetMph ?? 0), def.speedMph.sd);
  const inducedVerticalIn = rng.normal(
    def.inducedVerticalIn.mean + (entry.verticalOffsetIn ?? 0),
    def.inducedVerticalIn.sd,
  );
  const horizontalIn = Math.max(
    0,
    rng.normal(def.horizontalIn.mean + (entry.horizontalOffsetIn ?? 0), def.horizontalIn.sd),
  );

  const region = rng.weighted(regionWeights(count));
  const aim = sampleInRegion(rng, zone, region);
  const target = {
    x: aim.x + inToFt(rng.normal(0, pitcher.commandSdIn)),
    z: Math.max(TARGETING.minTargetHeightFt, aim.z + inToFt(rng.normal(0, pitcher.commandSdIn))),
  };

  const solved = solvePitch({
    type: def,
    hand: pitcher.hand,
    speedMph,
    inducedVerticalIn,
    horizontalIn,
    release: releasePoint(pitcher),
    target,
    targetPlaneY: zone.planeY,
    movementScale,
  });
  return { ...solved, typeId: entry.type, speedMph, intended: { x: aim.x, z: aim.z, region } };
}
