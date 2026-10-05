import './styles.css';
import { Game, type UmpHooks } from './game';

declare global {
  interface Window {
    __ump?: UmpHooks;
  }
}

const app = document.querySelector<HTMLElement>('#app');
const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const hudRoot = document.querySelector<HTMLElement>('#hud');
if (!app || !canvas || !hudRoot) throw new Error('Missing #app, #scene, or #hud');

// URL options: ?seed=abc replays a session exactly, ?autostart=1 skips the title, ?debug=1 opens the tuning
// panel, ?pitches=N shortens the session, ?touch=1 forces the on-screen buttons, ?quality=low drops shadows
// and antialiasing, ?drill=balk starts the spot-the-balk drill.
const params = new URLSearchParams(window.location.search);
const pitchesParam = Number(params.get('pitches'));
const drill = params.get('drill') === 'balk';
const game = new Game({
  app,
  canvas,
  hudRoot,
  seed: params.get('seed') || `s${Date.now().toString(36)}`,
  // ?drill=balk goes straight into the spot-the-balk drill.
  autostart: params.has('autostart') || drill,
  touch: params.has('touch') || window.matchMedia('(pointer: coarse)').matches,
  pitches: Number.isInteger(pitchesParam) && pitchesParam > 0 ? Math.min(pitchesParam, 200) : undefined,
  quality: params.get('quality') === 'low' ? 'low' : 'high',
  mode: drill ? 'balkDrill' : 'game',
});
window.__ump = game.hooks();
if (params.has('debug')) void game.toggleDebug();
