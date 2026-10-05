import GUI from 'lil-gui';
import type { Game } from '../game';

/** Tuning panel behind the backtick key (U5): camera, overlays, time, session, and audio. */
export function createDebugPanel(game: Game): { toggle(): void } {
  const gui = new GUI({ title: 'UMP tuning ( ` hides )' });
  gui.domElement.classList.add('ump-gui');

  const t = game.ump.tuning;
  const cam = gui.addFolder('Umpire camera');
  cam.add(t, 'verticalFovDeg', 30, 90, 0.5).name('Vertical FOV (deg)');
  cam.add(t, 'slotOffsetFt', 0, 1.8, 0.01).name('Slot offset (ft)');
  cam.add(t, 'eyeBehindFt', 2, 6, 0.05).name('Behind plate (ft)');
  cam.add(t, 'eyeHeightFt', 2.4, 4.6, 0.01).name('Eye height (ft)');
  cam.add(t, 'pitchDownDeg', -5, 25, 0.5).name('Tilt down (deg)');
  cam.add(t, 'swayFt', 0, 0.06, 0.001).name('Idle sway (ft)');

  const view = gui.addFolder('Overlays');
  view.add(game.overlays, 'zone').name('True zone');
  view.add(game.overlays, 'path').name('Ball path and crossing');

  const time = gui.addFolder('Time');
  time.add(game, 'timeScale', 0.1, 1.5, 0.05).name('Game speed');
  time.add(game, 'replaySlowSpeed', 0.05, 1, 0.05).name('Replay slow motion');

  const actions = {
    seed: game.session.seed,
    restart: () => game.restartWithSeed(actions.seed.trim() || `s${Date.now().toString(36)}`),
    pitch: 0,
    replay: () => game.replayPitch(actions.pitch),
    exportLog: () => game.downloadLog(),
    muted: game.audio.muted,
  };
  const session = gui.addFolder('Session');
  session.add(actions, 'seed').name('Seed');
  session.add(actions, 'restart').name('Restart with seed');
  session.add(actions, 'pitch', 0, 199, 1).name('Pitch number');
  session.add(actions, 'replay').name('Replay that pitch');
  session.add(actions, 'exportLog').name('Export pitch log (L)');

  const audio = gui.addFolder('Audio');
  audio
    .add(actions, 'muted')
    .name('Mute (M)')
    .onChange((v: boolean) => game.audio.setMuted(v));
  audio.add(game.audio, 'voiceEnabled').name('Call voice');

  let shown = true;
  return {
    toggle() {
      shown = !shown;
      gui.show(shown);
    },
  };
}
