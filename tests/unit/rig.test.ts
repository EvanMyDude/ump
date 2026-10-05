import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CAMERA, CATCHER } from '../../src/data/camera';
import { BATTERS, PITCHERS, TEAMS } from '../../src/data/roster';
import { BatterActor } from '../../src/render/actors/batterActor';
import { CatcherActor } from '../../src/render/actors/catcherActor';
import { PitcherActor } from '../../src/render/actors/pitcherActor';
import { BallView } from '../../src/render/fx/ballView';
import { simXYZ, toThree } from '../../src/render/coords';
import { BALL_RADIUS, batterSideSign } from '../../src/sim/field';
import { type PitchRecord, Session } from '../../src/sim/game/session';
import { absZone } from '../../src/sim/zone/absZone';

function records(seed: string, pitches: number): PitchRecord[] {
  const s = new Session({ seed, pitches });
  s.start(0);
  for (let guard = 0; guard < 400 && s.phase !== 'done'; guard++) {
    const r = s.current!;
    if (r.resolvedAt === null) s.input(r.truth.isStrike ? 'strike' : 'ball', r.times.catch + 0.8);
    s.update(s.time + 3);
  }
  return [...s.records];
}

const eyeFor = (side: 'R' | 'L') =>
  simXYZ(batterSideSign(side) * CAMERA.slotOffsetFt, -CAMERA.eyeBehindFt, CAMERA.eyeHeightFt);

/** True when the straight line from the eye to `target` hits any mesh of `blockers` first. */
function blocked(eye: THREE.Vector3, target: THREE.Vector3, blockers: THREE.Object3D[]): boolean {
  const dir = target.clone().sub(eye);
  const ray = new THREE.Raycaster(eye, dir.clone().normalize(), 0, dir.length() - BALL_RADIUS);
  return blockers.some((b) => ray.intersectObject(b, true).length > 0);
}

describe('catcher and batter rigs (U5)', () => {
  it('crouches the catcher so the helmet top sits at the target height', () => {
    const catcher = new CatcherActor(TEAMS.home.jersey, TEAMS.home.trim);
    catcher.update(undefined, 0);
    catcher.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(catcher.group);
    expect(box.max.y).toBeGreaterThan(CATCHER.helmetTopFt - 0.12);
    expect(box.max.y).toBeLessThan(CATCHER.helmetTopFt + 0.12);
    // Feet stay on the ground rather than sinking through it.
    expect(box.min.y).toBeGreaterThan(-0.1);
  });

  it.each(BATTERS.map((b) => [b.id, b] as const))(
    'lets the slot camera see every strike location for %s',
    (_id, b) => {
      const catcher = new CatcherActor(TEAMS.home.jersey, TEAMS.home.trim);
      catcher.update(undefined, 0);
      const batter = new BatterActor();
      batter.setBatter(b, TEAMS.away.jersey, TEAMS.away.trim);
      batter.update(0);
      for (const o of [catcher.group, batter.group]) o.updateMatrixWorld(true);
      const z = absZone.bounds(b);
      const eye = eyeFor(b.side);
      const misses: string[] = [];
      // Every ball-center position that touches the zone, on a grid that includes the ball-radius rim.
      for (let i = 0; i <= 12; i++) {
        for (let j = 0; j <= 12; j++) {
          const x = z.left - BALL_RADIUS + ((z.right - z.left + 2 * BALL_RADIUS) * i) / 12;
          const h = z.bottom - BALL_RADIUS + ((z.top - z.bottom + 2 * BALL_RADIUS) * j) / 12;
          if (blocked(eye, simXYZ(x, z.planeY, h), [catcher.group, batter.group]))
            misses.push(`${x.toFixed(2)},${h.toFixed(2)}`);
        }
      }
      expect(misses).toEqual([]);
    },
  );

  it('hides few near-edge crossings behind the reaching catcher, and the ghost ball covers those', () => {
    // From the slot, the mitt sits on the sightline of eye-level pitches as it reaches for them, as it does for
    // a real umpire; BallView's see-through copy keeps those readable. This guards the staging: a camera or
    // crouch change that hides many more crossings should fail here. The baseline was 20 of 279 (7%).
    const catcher = new CatcherActor(TEAMS.home.jersey, TEAMS.home.trim);
    const batter = new BatterActor();
    let near = 0;
    let hidden = 0;
    let hiddenByBody = 0;
    for (const seed of ['sight-1', 'sight-2', 'sight-3', 'sight-4', 'sight-5', 'sight-6']) {
      for (const r of records(seed, 60)) {
        if (r.truth.edgeDistanceIn >= 3) continue;
        near++;
        catcher.update(r, r.times.cross);
        batter.setBatter(r.batter, TEAMS.away.jersey, TEAMS.away.trim);
        batter.update(r.times.cross);
        for (const o of [catcher.group, batter.group]) o.updateMatrixWorld(true);
        const crossing = simXYZ(r.truth.crossing.x, r.zone.planeY, r.truth.crossing.z);
        if (!blocked(eyeFor(r.batter.side), crossing, [catcher.group, batter.group])) continue;
        hidden++;
        if (blocked(eyeFor(r.batter.side), crossing, [batter.group])) hiddenByBody++;
      }
    }
    expect(near).toBeGreaterThan(150);
    expect(hidden / near).toBeLessThan(0.1);
    // The batter never hides the crossing.
    expect(hiddenByBody).toBe(0);
  });

  it('draws the ghost ball over occluders only while the ball is in flight', () => {
    const view = new BallView();
    const r = records('ghost-1', 1)[0]!;
    const held = new THREE.Vector3();
    const caught = new THREE.Vector3();
    const ghosts = () =>
      view.group.children.filter(
        (c) => (c as THREE.Mesh).material && !((c as THREE.Mesh).material as THREE.Material).depthTest,
      );
    view.update(r, r.times.cross, r.times.cross - 1 / 60, held, caught);
    expect(ghosts().length).toBe(2);
    expect(ghosts().some((g) => g.visible)).toBe(true);
    view.update(r, r.times.release - 0.05, r.times.release - 0.07, held, caught);
    expect(ghosts().some((g) => g.visible)).toBe(false);
    view.update(r, r.times.catch + 0.1, r.times.catch + 0.08, held, caught);
    expect(ghosts().some((g) => g.visible)).toBe(false);
    // The tuning panel can turn it off (OQ6) without touching the solid ball and streak.
    view.ghostEnabled = false;
    view.update(r, r.times.cross, r.times.cross - 1 / 60, held, caught);
    expect(ghosts().some((g) => g.visible)).toBe(false);
    expect(view.lastSegment.visible).toBe(true);
  });
});

describe('pitcher IK (KTD5, U8)', () => {
  it('puts the throwing hand on the sim release point at the release for every pitcher', () => {
    const actor = new PitcherActor();
    const hand = new THREE.Vector3();
    const byPitcher = new Map<string, number>();
    for (const r of [...records('ik-1', 120), ...records('ik-2', 120)]) {
      actor.setPitcher(r.pitcher, TEAMS.home);
      actor.update(r, r.delivery.releaseTime);
      const rig = (actor as unknown as { rig: { joints: Record<string, THREE.Object3D> } }).rig;
      rig.joints[r.pitcher.hand === 'R' ? 'handR' : 'handL']!.getWorldPosition(hand);
      const gap = hand.distanceTo(toThree(r.pitch.trajectory.p0));
      byPitcher.set(r.pitcher.id, Math.max(byPitcher.get(r.pitcher.id) ?? 0, gap));
    }
    // Every roster pitcher appears in the sample, and each one's worst gap is under an inch.
    expect([...byPitcher.keys()].sort()).toEqual(PITCHERS.map((p) => p.id).sort());
    for (const gap of byPitcher.values()) expect(gap).toBeLessThan(1 / 12);
  });
});
