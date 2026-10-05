import * as THREE from 'three';
import { BALL_RADIUS } from '../../sim/field';
import { positionAt } from '../../sim/pitch/trajectory';
import type { PitchRecord } from '../../sim/game/session';
import { simXYZ, toThree } from '../coords';

const SEGMENTS = 80;

/** Zone rectangle, ball path, and crossing marker for replays and the debug overlay (R4). */
export class ZoneOverlay {
  readonly group = new THREE.Group();
  private readonly zone: THREE.LineLoop;
  private readonly path: THREE.Line;
  private readonly marker: THREE.Mesh;
  private built: PitchRecord | null = null;

  constructor() {
    this.zone = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false }),
    );
    this.path = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, depthTest: false }),
    );
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(BALL_RADIUS * 0.95, BALL_RADIUS * 1.25, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffd23f,
        side: THREE.DoubleSide,
        depthTest: false,
        transparent: true,
      }),
    );
    for (const o of [this.zone, this.path, this.marker]) o.renderOrder = 10;
    this.group.add(this.zone, this.path, this.marker);
    this.group.visible = false;
  }

  /**
   * @param opts.time presentation time on the session clock; the path draws up to the ball's position then,
   * and the crossing marker appears once the ball has crossed.
   */
  show(record: PitchRecord | undefined, opts: { zone: boolean; path: boolean; time: number }): void {
    if (!record) {
      this.group.visible = false;
      return;
    }
    this.build(record);
    const since = opts.time - record.times.release;
    const total = record.times.catch - record.times.release;
    const drawn = since <= 0 ? 0 : Math.min(SEGMENTS + 1, Math.floor((since / total) * SEGMENTS) + 2);
    this.path.geometry.setDrawRange(0, drawn);
    this.group.visible = opts.zone || opts.path;
    this.zone.visible = opts.zone;
    this.path.visible = opts.path && drawn > 1;
    this.marker.visible = opts.path && opts.time >= record.times.cross;
  }

  private build(record: PitchRecord): void {
    if (record === this.built) return;
    this.built = record;
    const z = record.zone;
    const pts = [
      simXYZ(z.left, z.planeY, z.bottom),
      simXYZ(z.right, z.planeY, z.bottom),
      simXYZ(z.right, z.planeY, z.top),
      simXYZ(z.left, z.planeY, z.top),
    ];
    this.zone.geometry.dispose();
    this.zone.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    const tr = record.pitch.trajectory;
    const total = record.times.catch - record.times.release;
    const path: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGMENTS; i++) path.push(toThree(positionAt(tr, (total * i) / SEGMENTS)));
    this.path.geometry.dispose();
    this.path.geometry = new THREE.BufferGeometry().setFromPoints(path);
    this.marker.position.copy(simXYZ(record.truth.crossing.x, z.planeY, record.truth.crossing.z));
  }
}
