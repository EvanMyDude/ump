import * as THREE from 'three';

/**
 * Primitive humanoid built from capsules and boxes (KTD5). Local frame: feet at the origin, facing +z, the
 * figure's left at +x. Limbs hang along -y from their joints, so a joint's local rotation bends its limb.
 */
export type JointName =
  | 'hips'
  | 'spine'
  | 'chest'
  | 'head'
  | 'shoulderL'
  | 'elbowL'
  | 'handL'
  | 'shoulderR'
  | 'elbowR'
  | 'handR'
  | 'hipL'
  | 'kneeL'
  | 'footL'
  | 'hipR'
  | 'kneeR'
  | 'footR';

export interface RigOptions {
  readonly heightFt: number;
  readonly jersey: number;
  readonly pants?: number;
  readonly trim: number;
  readonly skin?: number;
  readonly headwear: 'cap' | 'helmet' | 'catcher';
  readonly gloveHand?: 'L' | 'R' | null;
  readonly gear?: boolean;
  /** Arcade proportions: a slightly larger head and hands read better at 60 ft. */
  readonly headScale?: number;
}

export interface Rig {
  readonly root: THREE.Group;
  readonly joints: Record<JointName, THREE.Group>;
  readonly heightFt: number;
  readonly upperArm: number;
  readonly forearm: number;
  readonly glove: THREE.Mesh | null;
  readonly hips0: number;
}

function capsule(radius: number, length: number, color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.01, length - 2 * radius), 4, 10),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  return mesh;
}

function group(name: string, parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

export function buildRig(opts: RigOptions): Rig {
  const H = opts.heightFt;
  const skin = opts.skin ?? 0xc68e62;
  const pants = opts.pants ?? 0xe9e9e4;
  const headScale = opts.headScale ?? 1.15;
  const root = new THREE.Group();

  const thigh = 0.245 * H;
  const shin = 0.25 * H;
  const footH = 0.035 * H;
  const hipY = thigh + shin + footH;
  const spineLen = 0.28 * H;
  const upperArm = 0.17 * H;
  const forearm = 0.15 * H;
  const hipHalf = 0.055 * H;
  const shoulderHalf = 0.115 * H;

  const hips = group('hips', root, 0, hipY, 0);
  const pelvis = new THREE.Mesh(
    new THREE.BoxGeometry(0.2 * H, 0.09 * H, 0.12 * H),
    new THREE.MeshLambertMaterial({ color: pants }),
  );
  pelvis.castShadow = true;
  hips.add(pelvis);
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.205 * H, 0.02 * H, 0.125 * H),
    new THREE.MeshLambertMaterial({ color: 0x1b1b1b }),
  );
  belt.position.y = 0.045 * H;
  hips.add(belt);

  const spine = group('spine', hips, 0, 0.04 * H, 0);
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.24 * H, spineLen, 0.13 * H),
    new THREE.MeshLambertMaterial({ color: opts.jersey }),
  );
  torso.position.y = spineLen / 2;
  torso.castShadow = true;
  spine.add(torso);
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.245 * H, 0.025 * H, 0.135 * H),
    new THREE.MeshLambertMaterial({ color: opts.trim }),
  );
  stripe.position.y = spineLen * 0.62;
  spine.add(stripe);

  if (opts.gear) {
    const protector = new THREE.Mesh(
      new THREE.BoxGeometry(0.22 * H, spineLen * 0.95, 0.03 * H),
      new THREE.MeshLambertMaterial({ color: 0x232a36 }),
    );
    protector.position.set(0, spineLen / 2, 0.075 * H);
    spine.add(protector);
  }

  const chest = group('chest', spine, 0, spineLen, 0);
  const head = group('head', chest, 0, 0.03 * H, 0);
  const headR = 0.062 * H * headScale;
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(headR, 16, 12),
    new THREE.MeshLambertMaterial({ color: skin }),
  );
  skull.position.y = headR + 0.02 * H;
  skull.castShadow = true;
  head.add(skull);
  const hatColor = opts.headwear === 'catcher' ? 0x1c1f26 : opts.trim;
  // Headwear shells: a sphere cap that covers `cover` of the way from the crown to the chin, tipped back so it
  // sits low over the back of the head and high on the forehead.
  const shell = (radius: number, cover: number, tilt: number, color: number) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 18, 10, 0, Math.PI * 2, 0, Math.PI * cover),
      new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }),
    );
    mesh.position.y = skull.position.y;
    mesh.rotation.x = -tilt;
    mesh.castShadow = true;
    head.add(mesh);
    return mesh;
  };
  if (opts.headwear === 'cap') {
    shell(headR * 1.04, 0.5, 0.15, hatColor);
    const bill = new THREE.Mesh(
      new THREE.BoxGeometry(headR * 1.3, headR * 0.12, headR * 0.9),
      new THREE.MeshLambertMaterial({ color: hatColor }),
    );
    bill.position.set(0, skull.position.y + headR * 0.1, headR * 1.05);
    head.add(bill);
  }
  if (opts.headwear === 'helmet') {
    shell(headR * 1.12, 0.58, 0.35, hatColor);
    const bill = new THREE.Mesh(
      new THREE.BoxGeometry(headR * 1.2, headR * 0.1, headR * 0.55),
      new THREE.MeshLambertMaterial({ color: hatColor }),
    );
    bill.position.set(0, skull.position.y + headR * 0.25, headR * 1.05);
    head.add(bill);
  }
  if (opts.headwear === 'catcher') {
    // A hockey-style mask: a full dark shell with a cage over the face.
    shell(headR * 1.1, 0.78, 0.55, hatColor);
    const cage = new THREE.Mesh(
      new THREE.BoxGeometry(headR * 1.5, headR * 1.6, headR * 0.5),
      new THREE.MeshLambertMaterial({ color: 0x0f1115 }),
    );
    cage.position.set(0, skull.position.y - headR * 0.1, headR * 0.95);
    head.add(cage);
  }

  const armR = 0.035 * H;
  const legR = 0.045 * H;
  const joints = { hips, spine, chest, head } as Record<JointName, THREE.Group>;
  let glove: THREE.Mesh | null = null;

  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const shoulder = group(`shoulder${side}`, chest, sx * shoulderHalf, -0.02 * H, 0);
    shoulder.add(capsule(armR, upperArm, opts.jersey));
    const elbow = group(`elbow${side}`, shoulder, 0, -upperArm, 0);
    elbow.add(capsule(armR * 0.9, forearm, skin));
    const hand = group(`hand${side}`, elbow, 0, -forearm, 0);
    if (opts.gloveHand === side) {
      glove = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 * H, 14, 10),
        new THREE.MeshLambertMaterial({ color: 0x6b3f1f }),
      );
      glove.scale.set(1, 1.15, 0.55);
      glove.position.y = -0.03 * H;
      glove.castShadow = true;
      hand.add(glove);
    } else {
      const fist = new THREE.Mesh(
        new THREE.SphereGeometry(0.03 * H, 10, 8),
        new THREE.MeshLambertMaterial({ color: skin }),
      );
      fist.position.y = -0.02 * H;
      hand.add(fist);
    }
    joints[`shoulder${side}`] = shoulder;
    joints[`elbow${side}`] = elbow;
    joints[`hand${side}`] = hand;

    const hip = group(`hip${side}`, hips, sx * hipHalf, -0.02 * H, 0);
    hip.add(capsule(legR, thigh, pants));
    const knee = group(`knee${side}`, hip, 0, -thigh, 0);
    knee.add(capsule(legR * 0.85, shin, opts.gear ? 0x232a36 : pants));
    const foot = group(`foot${side}`, knee, 0, -shin, 0);
    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.06 * H, footH, 0.15 * H),
      new THREE.MeshLambertMaterial({ color: 0x151515 }),
    );
    shoe.position.set(0, -footH / 2, 0.04 * H);
    shoe.castShadow = true;
    foot.add(shoe);
    joints[`hip${side}`] = hip;
    joints[`knee${side}`] = knee;
    joints[`foot${side}`] = foot;
  }

  return { root, joints, heightFt: H, upperArm, forearm, glove, hips0: hipY };
}
