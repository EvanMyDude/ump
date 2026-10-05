import * as THREE from 'three';
import { BALL_RADIUS } from '../../sim/field';
import { positionAt } from '../../sim/pitch/trajectory';
import type { PitchRecord } from '../../sim/game/session';
import { toThree } from '../coords';

const UP = new THREE.Vector3(0, 1, 0);
/** Opacity of the see-through copy that shows the ball in flight when the mitt or a helmet hides it. */
const GHOST_OPACITY = 0.4;

/**
 * The ball and its motion streak (KTD10). Each frame draws the ball's path since the previous frame, so the
 * frame that spans the plate passes the streak through the true crossing. A frame that also spans the catch
 * ends the streak at the catch point, so even a slow frame never skips the crossing.
 *
 * From the slot, the catcher's mitt sits on the sightline of eye-level pitches as they arrive, as it does for
 * a real umpire. During flight a faint copy of the ball and streak draws on top of everything, so the player
 * can still read the pitch through the mitt or a helmet.
 */
export class BallView {
  readonly group = new THREE.Group();
  private readonly ball: THREE.Mesh;
  private readonly streak: THREE.Mesh;
  private readonly ghost: THREE.Mesh;
  private readonly ghostStreak: THREE.Mesh;
  private readonly streaks: readonly THREE.Mesh[];
  private readonly a = new THREE.Vector3();
  private readonly b = new THREE.Vector3();
  private readonly mid = new THREE.Vector3();
  private readonly d = new THREE.Vector3();
  /** Last drawn streak endpoints, exposed for tests and replays. */
  readonly lastSegment = { from: new THREE.Vector3(), to: new THREE.Vector3(), visible: false };

  constructor() {
    const sphere = new THREE.SphereGeometry(BALL_RADIUS, 18, 12);
    const tube = new THREE.CylinderGeometry(BALL_RADIUS * 0.92, BALL_RADIUS * 0.92, 1, 12, 1, false);
    this.ball = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.streak = new THREE.Mesh(
      tube,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, depthWrite: false }),
    );
    const ghostMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: GHOST_OPACITY,
      depthTest: false,
      depthWrite: false,
    });
    this.ghost = new THREE.Mesh(sphere, ghostMaterial);
    this.ghostStreak = new THREE.Mesh(tube, ghostMaterial);
    this.ghost.renderOrder = 20;
    this.ghostStreak.renderOrder = 20;
    this.group.add(this.ball, this.streak, this.ghost, this.ghostStreak);
    this.streaks = [this.streak, this.ghostStreak];
  }

  /**
   * @param held where the ball is while the pitcher holds it (before release)
   * @param caught where the ball is after the catch (the glove)
   */
  update(
    record: PitchRecord | undefined,
    time: number,
    prevTime: number,
    held: THREE.Vector3,
    caught: THREE.Vector3,
  ): void {
    this.lastSegment.visible = false;
    this.streak.visible = false;
    this.ghost.visible = false;
    this.ghostStreak.visible = false;
    if (!record) {
      this.ball.visible = false;
      return;
    }
    this.ball.visible = true;
    const { release, catch: catchT } = record.times;
    if (time < release) {
      this.ball.position.copy(held);
      return;
    }
    const t0 = Math.max(release, Math.min(prevTime, time));
    if (t0 >= catchT) {
      this.ball.position.copy(caught);
      return;
    }
    const t1 = Math.min(time, catchT);
    const tr = record.pitch.trajectory;
    toThree(positionAt(tr, t0 - release), this.a);
    toThree(positionAt(tr, t1 - release), this.b);
    this.ball.position.copy(time > catchT ? caught : this.b);
    this.ghost.position.copy(this.b);
    this.ghost.visible = true;
    this.d.subVectors(this.b, this.a);
    const len = this.d.length();
    if (len > BALL_RADIUS * 0.5) {
      this.mid.addVectors(this.a, this.b).multiplyScalar(0.5);
      this.d.divideScalar(len);
      for (const mesh of this.streaks) {
        mesh.position.copy(this.mid);
        mesh.quaternion.setFromUnitVectors(UP, this.d);
        mesh.scale.set(1, len, 1);
        mesh.visible = true;
      }
      this.lastSegment.from.copy(this.a);
      this.lastSegment.to.copy(this.b);
      this.lastSegment.visible = true;
    }
  }
}
