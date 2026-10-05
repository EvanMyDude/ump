import * as THREE from 'three';
import './styles.css';

// M0 placeholder scene: proves the build, renderer, and headless test harness end to end.
const canvas = document.querySelector<HTMLCanvasElement>('#scene');
if (!canvas) throw new Error('Missing #scene canvas');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5e8);
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 2000);
camera.position.set(0, 3.5, 4);
camera.lookAt(0, 2.5, -60);

scene.add(new THREE.HemisphereLight(0xdfefff, 0x4a6b2f, 1.6));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x3f8f3a }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.121, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
ball.position.set(0, 2.5, -10);
scene.add(ball);

const state = { frames: 0 };
(window as unknown as { __ump: typeof state }).__ump = state;

function resize(): void {
  const { clientWidth: w, clientHeight: h } = canvas!;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

renderer.setAnimationLoop(() => {
  state.frames++;
  renderer.render(scene, camera);
});
