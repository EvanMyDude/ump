import { MOTION_TIMING } from '../../data/motions';
import { SET_POSITION } from '../../data/tuning';
import type { Rng } from '../rng';
import type { PitcherProfile } from './pitcher';

export type MotionPhase = 'idle' | 'stretch' | 'comeSet' | 'set' | 'legLift' | 'stride' | 'throw' | 'follow';
/** U8 ships the no-stop balk (6.02(a)(13)); U17 adds flinch, dropped ball, and rolling sets. */
export type DeliveryVariant = 'legal' | 'noStop';

export interface PhaseSpan {
  readonly phase: MotionPhase;
  readonly start: number;
  readonly end: number;
}

/** A delivery's timeline in seconds on the session clock (startS offsets every phase). The renderer poses the rig from it. */
export interface DeliveryPlan {
  readonly variant: DeliveryVariant;
  readonly runnersOn: boolean;
  readonly phases: readonly PhaseSpan[];
  /** When the hands come together in the set position. */
  readonly setTime: number;
  /** How long the hands stay still in the set. */
  readonly stopDuration: number;
  readonly releaseTime: number;
  /** When the delivery became a balk (the motion resumed without a stop), or null if legal. */
  readonly violationTime: number | null;
}

export function planDelivery(
  rng: Rng,
  pitcher: PitcherProfile,
  opts: { readonly startS: number; readonly runnersOn: boolean; readonly balk: boolean },
): DeliveryPlan {
  const t = MOTION_TIMING;
  const variant: DeliveryVariant = opts.runnersOn && opts.balk ? 'noStop' : 'legal';
  const stopDuration =
    variant === 'noStop'
      ? 0
      : opts.runnersOn
        ? rng.float(pitcher.setStopS[0], pitcher.setStopS[1])
        : rng.float(t.basesEmptyStopS[0], t.basesEmptyStopS[1]);

  const spans: PhaseSpan[] = [];
  let cursor = opts.startS;
  const push = (phase: MotionPhase, duration: number) => {
    spans.push({ phase, start: cursor, end: cursor + duration });
    cursor += duration;
  };
  push('stretch', t.stretchS);
  push('comeSet', t.comeSetS);
  const setTime = cursor;
  push('set', stopDuration);
  push('legLift', t.legLiftS);
  push('stride', t.strideS);
  push('throw', t.throwS);
  const releaseTime = cursor;
  push('follow', t.followS);

  return {
    variant,
    runnersOn: opts.runnersOn,
    phases: spans,
    setTime,
    stopDuration,
    releaseTime,
    violationTime: variant === 'noStop' ? setTime : null,
  };
}

/** The game's reading of 6.02(a)(13): with runners on, the hands must be still for a visible beat. */
export function isLegalSet(
  plan: DeliveryPlan,
  stillnessThresholdS: number = SET_POSITION.stillnessThresholdS,
): boolean {
  return !plan.runnersOn || plan.stopDuration >= stillnessThresholdS;
}

export function phaseAt(plan: DeliveryPlan, time: number): { phase: MotionPhase; progress: number } {
  for (const span of plan.phases) {
    if (time < span.end) {
      if (time < span.start) return { phase: 'idle', progress: 0 };
      const d = span.end - span.start;
      return { phase: span.phase, progress: d > 0 ? (time - span.start) / d : 1 };
    }
  }
  return { phase: 'follow', progress: 1 };
}
