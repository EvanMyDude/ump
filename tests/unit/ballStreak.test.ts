import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { toThree } from '../../src/render/coords';
import { BallView } from '../../src/render/fx/ballView';
import { BALL_RADIUS } from '../../src/sim/field';
import { type PitchRecord, Session } from '../../src/sim/game/session';

/** Plays a seeded session to the end, collecting every pitch record (calls are always right and on time). */
function records(seed: string, pitches: number): PitchRecord[] {
  const s = new Session({ seed, pitches });
  s.start(0);
  for (let guard = 0; guard < 400 && s.phase !== 'done'; guard++) {
    const r = s.current!;
    if (r.resolvedAt === null) s.input(r.truth.isStrike ? 'strike' : 'ball', r.times.catch + 0.8);
    // Step past any challenge card and the result hold; the next pitch starts on its own.
    s.update(s.time + 3);
  }
  return [...s.records];
}

function distanceToSegment(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = b.clone().sub(a);
  const t = Math.min(1, Math.max(0, p.clone().sub(a).dot(ab) / ab.lengthSq()));
  return a.clone().addScaledVector(ab, t).distanceTo(p);
}

describe('ball streak (KTD10)', () => {
  const pitches = [...records('streak-1', 25), ...records('streak-2', 25)];
  const held = new THREE.Vector3();
  const caught = new THREE.Vector3();

  it.each([30, 60, 120, 144])('passes within a ball radius of the true crossing at %d Hz', (hz) => {
    const view = new BallView();
    const dt = 1 / hz;
    for (const r of pitches) {
      const crossing = toThree({ x: r.truth.crossing.x, y: r.zone.planeY, z: r.truth.crossing.z });
      // Whatever phase the frame has relative to the crossing, the frame that spans it draws through it.
      for (const phase of [0.02, 0.5, 0.98]) {
        const prev = r.times.cross - phase * dt;
        view.update(r, prev + dt, prev, held, caught);
        expect(view.lastSegment.visible).toBe(true);
        expect(distanceToSegment(crossing, view.lastSegment.from, view.lastSegment.to)).toBeLessThan(
          BALL_RADIUS,
        );
      }
    }
  });

  it('draws no streak before the release or after the catch', () => {
    const view = new BallView();
    const r = pitches[0]!;
    view.update(r, r.times.release - 0.01, r.times.release - 0.03, held, caught);
    expect(view.lastSegment.visible).toBe(false);
    view.update(r, r.times.catch + 0.05, r.times.catch + 0.03, held, caught);
    expect(view.lastSegment.visible).toBe(false);
  });
});
