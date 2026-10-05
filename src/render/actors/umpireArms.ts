import * as THREE from 'three';
import { smooth } from './pose';

export type Gesture = 'strike' | 'strikeThree' | 'balk' | 'none';

const DURATION: Record<Gesture, number> = { strike: 0.6, strikeThree: 0.95, balk: 0.9, none: 0 };

/**
 * First-person right arm (U24): the called-strike hammer, the strike-three punch-out, and the balk point.
 * Balls get a voice and no signal, as in real mechanics. Lives in camera space.
 */
export class UmpireArms {
  readonly group = new THREE.Group();
  private readonly shoulder = new THREE.Group();
  private readonly elbow = new THREE.Group();
  private gesture: Gesture = 'none';
  private startedAt = -10;

  constructor() {
    const sleeve = new THREE.MeshLambertMaterial({ color: 0x1b2a4a });
    const skin = new THREE.MeshLambertMaterial({ color: 0xc68e62 });
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.75, 4, 10), sleeve);
    upper.position.y = -0.45;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.7, 4, 10), sleeve);
    fore.position.y = -0.42;
    const fist = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), skin);
    fist.position.y = -0.85;
    this.elbow.position.y = -0.9;
    this.elbow.add(fore, fist);
    this.shoulder.add(upper, this.elbow);
    this.group.add(this.shoulder);
    this.group.visible = false;
  }

  play(gesture: Gesture, time: number): void {
    this.gesture = gesture;
    this.startedAt = time;
  }

  update(time: number): void {
    const dur = DURATION[this.gesture];
    const t = dur > 0 ? (time - this.startedAt) / dur : 1;
    if (this.gesture === 'none' || t >= 1 || t < 0) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    // In: 0 to 0.35, hold, out: 0.75 to 1.
    const inK = smooth(t / 0.35);
    const outK = smooth((t - 0.75) / 0.25);
    const k = inK * (1 - outK);
    const s = this.shoulder;
    const e = this.elbow;
    if (this.gesture === 'strike') {
      // Hammer: forearm up, then the fist closes forward.
      s.position.set(0.55, -0.55 - (1 - k) * 0.8, -0.55);
      s.rotation.set(-1.1 * k, 0, 0.55);
      e.rotation.set(-1.7 * k + Math.sin(Math.min(1, t * 3) * Math.PI) * 0.35, 0, 0);
    } else if (this.gesture === 'strikeThree') {
      // Punch-out to the right side.
      s.position.set(0.5 + 0.35 * k, -0.5 - (1 - k) * 0.8, -0.65);
      s.rotation.set(-1.25 * k, 0, 1.25 * k);
      e.rotation.set(-0.25 * (1 - k), 0, 0);
    } else {
      // Point at the pitcher.
      s.position.set(0.42, -0.5 - (1 - k) * 0.8, -0.5);
      s.rotation.set(-1.45 * k, 0, 0.12);
      e.rotation.set(-0.1, 0, 0);
    }
  }
}
