import * as THREE from 'three';
import { BATTERS_BOX, MOUND_HEIGHT, PLATE, RUBBER, RUBBER_FRONT_Y } from '../../sim/field';
import { simXYZ } from '../coords';
import { crowdTexture, dirtTexture, grassTexture, skyTexture } from './textures';

const MOUND_CENTER_Y = 59; // OBR: the 18 ft mound's center is 59 ft from the back of home plate.
const BASE_DIST = 90;

function flat(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  heightFt: number,
  simX = 0,
  simY = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(simXYZ(simX, simY, heightFt));
  mesh.receiveShadow = true;
  return mesh;
}

function chalkLine(
  from: { x: number; y: number },
  to: { x: number; y: number },
  width: number,
  mat: THREE.Material,
): THREE.Mesh {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const mesh = flat(
    new THREE.PlaneGeometry(width, len),
    mat,
    0.015,
    (from.x + to.x) / 2,
    (from.y + to.y) / 2,
  );
  // Rotate within the plane so local +y (sim +y after the flat tilt) points along the line.
  mesh.rotation.z = Math.atan2(-dx, dy);
  return mesh;
}

/** Real-scale graybox ballpark (U5). One unit is one foot. */
export function buildBallpark(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'ballpark';

  const grass = grassTexture();
  grass.repeat.set(60, 60);
  g.add(flat(new THREE.CircleGeometry(700, 96), new THREE.MeshLambertMaterial({ map: grass }), 0));

  const dirt = dirtTexture();
  dirt.repeat.set(20, 20);
  const dirtMat = new THREE.MeshLambertMaterial({
    map: dirt,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  g.add(flat(new THREE.CircleGeometry(95, 96), dirtMat, 0.005, 0, MOUND_CENTER_Y));

  const infieldGrass = new THREE.MeshLambertMaterial({
    map: grass,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const diamond = new THREE.Shape();
  const inset = 11;
  diamond.moveTo(0, inset * 1.3);
  diamond.lineTo(BASE_DIST / Math.SQRT2 - inset, BASE_DIST / Math.SQRT2);
  diamond.lineTo(0, BASE_DIST * Math.SQRT2 - inset * 1.3);
  diamond.lineTo(-(BASE_DIST / Math.SQRT2 - inset), BASE_DIST / Math.SQRT2);
  const diamondMesh = new THREE.Mesh(new THREE.ShapeGeometry(diamond), infieldGrass);
  diamondMesh.rotation.x = -Math.PI / 2;
  diamondMesh.position.y = 0.01;
  diamondMesh.receiveShadow = true;
  g.add(diamondMesh);

  const homeDirt = new THREE.MeshLambertMaterial({
    map: dirt,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  g.add(flat(new THREE.CircleGeometry(13, 64), homeDirt, 0.015, 0, PLATE.midY));
  g.add(flat(new THREE.CircleGeometry(9, 64), homeDirt, 0.015, 0, MOUND_CENTER_Y));

  // Mound: an 18 ft circle rising to the rubber's 10 in height.
  const mound = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 9, MOUND_HEIGHT, 48),
    new THREE.MeshLambertMaterial({ map: dirt }),
  );
  mound.position.copy(simXYZ(0, MOUND_CENTER_Y + 0.8, MOUND_HEIGHT / 2));
  mound.receiveShadow = true;
  g.add(mound);

  const white = new THREE.MeshLambertMaterial({ color: 0xf7f7f2 });
  const rubber = new THREE.Mesh(new THREE.BoxGeometry(RUBBER.width, 0.08, RUBBER.depth), white);
  rubber.position.copy(simXYZ(0, RUBBER_FRONT_Y + RUBBER.depth / 2, MOUND_HEIGHT + 0.04));
  g.add(rubber);

  // Home plate, with its black bevel.
  const plateShape = new THREE.Shape(PLATE.outline.map((p) => new THREE.Vector2(p.x, p.y)));
  // Polygon offsets layer the flat ground pieces: grass, dirt, home dirt, chalk, then the plate on top.
  const plate = new THREE.Mesh(
    new THREE.ShapeGeometry(plateShape),
    new THREE.MeshLambertMaterial({
      color: 0xfcfcf8,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
    }),
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0.03;
  plate.receiveShadow = true;
  g.add(plate);
  const bevel = new THREE.Mesh(
    new THREE.ShapeGeometry(plateShape),
    new THREE.MeshLambertMaterial({
      color: 0x1a1a1a,
      polygonOffset: true,
      polygonOffsetFactor: -5,
      polygonOffsetUnits: -5,
    }),
  );
  bevel.rotation.x = -Math.PI / 2;
  bevel.scale.set(1.06, 1.05, 1);
  bevel.position.set(0, 0.025, -0.02);
  g.add(bevel);

  // Chalk: foul lines and batter's boxes.
  const chalk = new THREE.MeshBasicMaterial({
    color: 0xf2f2ea,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const far = 380 / Math.SQRT2;
  g.add(chalkLine({ x: PLATE.halfWidth, y: PLATE.shoulderY }, { x: far, y: far }, 0.25, chalk));
  g.add(chalkLine({ x: -PLATE.halfWidth, y: PLATE.shoulderY }, { x: -far, y: far }, 0.25, chalk));
  for (const side of [-1, 1]) {
    const x0 = side * BATTERS_BOX.innerX;
    const x1 = side * (BATTERS_BOX.innerX + BATTERS_BOX.width);
    const y0 = BATTERS_BOX.centerY - BATTERS_BOX.length / 2;
    const y1 = BATTERS_BOX.centerY + BATTERS_BOX.length / 2;
    g.add(chalkLine({ x: x0, y: y0 }, { x: x0, y: y1 }, 0.2, chalk));
    g.add(chalkLine({ x: x1, y: y0 }, { x: x1, y: y1 }, 0.2, chalk));
    g.add(chalkLine({ x: x0, y: y1 }, { x: x1, y: y1 }, 0.2, chalk));
    g.add(chalkLine({ x: x0, y: y0 }, { x: x1, y: y0 }, 0.2, chalk));
  }

  // Bases.
  for (const [x, y] of [
    [BASE_DIST / Math.SQRT2, BASE_DIST / Math.SQRT2],
    [0, BASE_DIST * Math.SQRT2],
    [-BASE_DIST / Math.SQRT2, BASE_DIST / Math.SQRT2],
  ] as const) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.25, 1.25), white);
    base.position.copy(simXYZ(x, y, 0.12));
    base.rotation.y = Math.PI / 4;
    base.castShadow = true;
    g.add(base);
  }

  // Outfield wall and foul poles across fair territory (three.js theta 0 points behind home plate).
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(390, 390, 12, 96, 1, true, (3 * Math.PI) / 4, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x1f4d2e, side: THREE.DoubleSide }),
  );
  wall.position.y = 6;
  g.add(wall);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(389.5, 389.5, 0.8, 96, 1, true, (3 * Math.PI) / 4, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xf2c230, side: THREE.DoubleSide }),
  );
  cap.position.y = 12.2;
  g.add(cap);
  const poleMat = new THREE.MeshBasicMaterial({ color: 0xf2c230 });
  for (const s of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 70, 8), poleMat);
    pole.position.copy(simXYZ((s * 390) / Math.SQRT2, 390 / Math.SQRT2, 35));
    g.add(pole);
  }

  // Stands with a speckled crowd, wrapping past the foul poles.
  const crowd = crowdTexture();
  crowd.repeat.set(24, 3);
  const stands = new THREE.Mesh(
    new THREE.CylinderGeometry(560, 405, 95, 128, 1, true, (3 * Math.PI) / 4 - 0.55, Math.PI / 2 + 1.1),
    new THREE.MeshLambertMaterial({ map: crowd, side: THREE.DoubleSide }),
  );
  stands.position.y = 12 + 47.5;
  g.add(stands);

  // Dugout-side grandstands near the lines, in the umpire's peripheral view.
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(
      new THREE.BoxGeometry(6, 26, 210),
      new THREE.MeshLambertMaterial({ map: crowd, color: 0xcfd6e3 }),
    );
    side.position.copy(simXYZ(s * 95, 85, 13));
    side.rotation.y = s * (Math.PI / 4);
    g.add(side);
  }

  return g;
}

export function buildEnvironment(scene: THREE.Scene): THREE.DirectionalLight {
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xcfe3f7, 300, 1600);
  scene.add(new THREE.HemisphereLight(0xe3f1ff, 0x56733b, 1.35));
  const sun = new THREE.DirectionalLight(0xfff6e5, 2.1);
  const target = simXYZ(0, 30, 0);
  sun.position.copy(target).add(simXYZ(-55, -35, 110));
  sun.target.position.copy(target);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera;
  cam.left = -50;
  cam.right = 50;
  cam.top = 50;
  cam.bottom = -50;
  cam.near = 1;
  cam.far = 400;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  return sun;
}
