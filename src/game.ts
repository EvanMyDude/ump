import * as THREE from 'three';
import { AudioEngine } from './audio/engine';
import { REPLAY_VIEWS } from './data/camera';
import { FRAME, PRESENTATION, REPLAY } from './data/presentation';
import { BATTERS, PITCHERS, TEAMS } from './data/roster';
import { PerfLog } from './debug/perfLog';
import { GamepadInput } from './input/gamepad';
import { type GameIntent, IntentQueue, type TimedIntent } from './input/intents';
import { bindKeyboard } from './input/keyboard';
import { BatterActor } from './render/actors/batterActor';
import { CatcherActor } from './render/actors/catcherActor';
import { PitcherActor } from './render/actors/pitcherActor';
import { UmpireArms } from './render/actors/umpireArms';
import { UmpireCamera } from './render/camera/umpireCamera';
import { simXYZ, toThree } from './render/coords';
import { BallView } from './render/fx/ballView';
import { mountMask } from './render/overlay/mask';
import { ZoneOverlay } from './render/replay/zoneOverlay';
import { buildBallpark, buildEnvironment } from './render/scene/ballpark';
import type { BallStrikeCall, PitchRecord, SessionEvent, SessionMode } from './sim/game/session';
import { Session } from './sim/game/session';
import { sessionLog, summarize } from './sim/log/pitchLog';
import { el } from './ui/dom';
import { Hud } from './ui/hud';
import { showDrillSummary, showSummary, showTitle } from './ui/screens';
import { mountTouchControls } from './ui/touch';

export type ViewMode = 'umpire' | keyof typeof REPLAY_VIEWS;
const VIEW_ORDER: readonly ViewMode[] = ['umpire', 'catcher', 'side', 'overhead'];

export interface GameOptions {
  readonly app: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly hudRoot: HTMLElement;
  readonly seed: string;
  readonly autostart: boolean;
  readonly touch: boolean;
  readonly pitches?: number;
  /** The mode the session starts in; the title screen can switch it. */
  readonly mode?: SessionMode;
  /** 'low' turns off shadows and antialiasing for slow devices and software-rendered test runs. */
  readonly quality?: 'high' | 'low';
}

interface ReplayState {
  readonly record: PitchRecord;
  readonly start: number;
  readonly end: number;
  t: number;
  prev: number;
  view: ViewMode;
}

interface XYZ {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Test and tuning hooks exposed on `window.__ump` (e2e tests drive the game through these). */
export interface UmpHooks {
  readonly frames: number;
  readonly seed: string;
  readonly phase: string;
  readonly simTime: number;
  readonly score: number;
  readonly streakCount: number;
  pitch(): HookPitch | null;
  pause(): void;
  play(): void;
  advanceTo(time: number): void;
  /** Queues an intent as if a key were pressed now; it is applied on the next frame. */
  input(intent: GameIntent): void;
  /** Applies an intent immediately at the current sim time (scripted tests). */
  inputNow(intent: GameIntent): void;
  freeze(time: number, prev?: number): void;
  unfreeze(): void;
  setOverlays(o: { zone?: boolean; path?: boolean }): void;
  cameraMatrix(): number[];
  project(p: XYZ): { x: number; y: number };
  streakSegment(): { visible: boolean; from: XYZ; to: XYZ };
  armsVisible(): boolean;
  replayView(): ViewMode | null;
  /** Renders from an arbitrary sim-frame camera, for inspecting poses up close; null restores the game view. */
  setDebugCamera(view: { position: XYZ; lookAt: XYZ; fovDeg: number } | null): void;
}

export interface HookPitch {
  readonly index: number;
  readonly times: PitchRecord['times'];
  /** True crossing in the sim frame (feet), at the zone plane. */
  readonly crossing: XYZ;
  readonly truthIsStrike: boolean;
  readonly edgeIn: number;
  readonly runnersOn: boolean;
  readonly variant: string;
  readonly violationTime: number | null;
  readonly call: string | null;
  readonly grade: string | null;
  readonly balkCalled: boolean;
  readonly balkCorrect: boolean | null;
  readonly outcome: string | null;
  readonly correct: boolean | null;
  readonly resolved: boolean;
}

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const toXYZ = (v: THREE.Vector3): XYZ => ({ x: v.x, y: v.y, z: v.z });

/**
 * Owns the render loop and maps real time onto the session clock. The session (src/sim) decides everything
 * that matters; this class only presents it: actors, ball, camera, HUD, sound, and replays (U5 to U8, U24).
 */
export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly ump = new UmpireCamera();
  readonly overlays = { zone: false, path: false };
  readonly assists = { seeThroughBall: PRESENTATION.seeThroughBall as boolean };
  readonly audio = new AudioEngine();
  timeScale = 1;
  replaySlowSpeed: number = REPLAY.slowSpeed;
  session: Session;
  frames = 0;

  private readonly app: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly hudRoot: HTMLElement;
  private readonly baseSeed: string;
  private readonly pitches: number | undefined;
  private readonly replayCams: Record<Exclude<ViewMode, 'umpire'>, THREE.PerspectiveCamera>;
  private readonly pitcher = new PitcherActor();
  private readonly batter = new BatterActor();
  private readonly catcher: CatcherActor;
  private readonly ball = new BallView();
  private readonly zoneOverlay = new ZoneOverlay();
  private readonly arms = new UmpireArms();
  private readonly queue = new IntentQueue();
  private readonly gamepad: GamepadInput;
  private readonly hud: Hud;
  private readonly replayBadge: HTMLElement;
  private readonly perf = new PerfLog();
  private readonly held = new THREE.Vector3();
  private readonly caught = new THREE.Vector3();
  private readonly projected = new THREE.Vector3();

  private simTime = 0;
  private lastLiveTime = 0;
  private lastFrameMs: number | null = null;
  private running = false;
  private testPaused = false;
  private titleStart: ((mode: SessionMode) => void) | null = null;
  private replay: ReplayState | null = null;
  private frozen: { time: number; prev: number } | null = null;
  private reveal: { record: PitchRecord; at: number } | null = null;
  private pendingFeedback: { pitch: number; since: number } | null = null;
  private lastPhase = '';
  private sessionNumber = 1;
  private firstPitch = true;
  private debugPanel: { toggle(): void } | null = null;
  private debugCam: THREE.PerspectiveCamera | null = null;

  constructor(opts: GameOptions) {
    this.app = opts.app;
    this.canvas = opts.canvas;
    this.hudRoot = opts.hudRoot;
    this.baseSeed = opts.seed;
    this.pitches = opts.pitches;
    this.session = this.makeSession(opts.seed, opts.mode ?? 'game');

    const high = opts.quality !== 'low';
    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: high,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, 2) : 1);
    this.renderer.shadowMap.enabled = high;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    buildEnvironment(this.scene);
    this.scene.add(buildBallpark());
    const home = TEAMS.home;
    this.catcher = new CatcherActor(home.jersey, home.trim);
    this.scene.add(
      this.pitcher.group,
      this.batter.group,
      this.catcher.group,
      this.ball.group,
      this.zoneOverlay.group,
    );
    // The arms live in camera space, so the camera joins the scene graph.
    this.ump.camera.add(this.arms.group);
    this.scene.add(this.ump.camera);

    this.replayCams = {
      catcher: this.makeReplayCam('catcher'),
      side: this.makeReplayCam('side'),
      overhead: this.makeReplayCam('overhead'),
    };

    const mask = mountMask(this.app);
    this.app.insertBefore(mask, this.hudRoot);
    this.hud = new Hud(this.hudRoot, { touch: opts.touch });
    this.replayBadge = el('div', 'replay-badge', this.hudRoot);
    el('div', 'rotate-hint', this.hudRoot, 'Turn your phone sideways for the best view');
    mountTouchControls(this.hudRoot, this.queue);
    if (opts.touch) this.app.classList.add('force-touch');

    bindKeyboard(window, this.queue);
    this.gamepad = new GamepadInput(this.queue);
    const unlock = () => this.audio.unlock();
    for (const type of ['pointerdown', 'keydown', 'touchend'] as const)
      window.addEventListener(type, unlock, { capture: true });
    document.addEventListener('visibilitychange', () => {
      this.lastFrameMs = null;
    });
    window.addEventListener('resize', () => this.resize());
    this.resize();

    this.idlePose();
    if (opts.autostart) this.begin();
    else {
      this.titleStart = showTitle(this.hudRoot, (mode) => {
        if (mode !== this.session.mode) this.session = this.makeSession(this.baseSeed, mode);
        this.begin();
      });
    }

    this.renderer.setAnimationLoop((now) => this.frame(now));
  }

  // ---------------------------------------------------------------- loop

  private clockRunning(): boolean {
    return this.running && !this.replay && !this.frozen && !this.testPaused;
  }

  private frame(nowMs: number): void {
    this.frames++;
    const last = this.lastFrameMs ?? nowMs;
    const dt = clamp((nowMs - last) / 1000, 0, FRAME.maxDtS);
    this.lastFrameMs = nowMs;

    this.gamepad.poll();
    const base = this.simTime;
    const clockOn = this.clockRunning();
    for (const item of this.queue.drain()) {
      // Inputs land at their own timestamps inside the frame, not at the frame boundary (KTD6).
      const offset = clamp((item.timeStamp - last) / 1000, 0, dt);
      this.handleIntent(
        item,
        clockOn ? Math.max(this.simTime, base + offset * this.timeScale) : this.simTime,
      );
    }
    if (this.clockRunning()) {
      this.simTime = Math.max(this.simTime, base + dt * this.timeScale);
      this.handleEvents(this.session.update(this.simTime));
    }
    if (this.replay) this.advanceReplay(dt);
    this.checkReveal();
    this.present();
    this.renderer.render(this.scene, this.activeCamera());

    const current = this.session.current;
    if (current && this.clockRunning()) this.perf.frame(current.index, dt * 1000);
    if (this.pendingFeedback) {
      this.perf.feedback(this.pendingFeedback.pitch, performance.now() - this.pendingFeedback.since);
      this.pendingFeedback = null;
    }
    if (this.session.phase !== this.lastPhase) {
      this.lastPhase = this.session.phase;
      this.hud.update(this.session);
    }
  }

  private begin(): void {
    this.titleStart = null;
    this.running = true;
    this.app.classList.toggle('mode-drill', this.session.mode === 'balkDrill');
    this.hud.setMode(this.session.mode);
    this.queue.drain();
    this.handleEvents(this.session.start(this.simTime));
  }

  /** `pitches` from the URL shortens games only; the drill always runs its full set of deliveries. */
  private makeSession(seed: string, mode: SessionMode): Session {
    return new Session({ seed, mode, pitches: mode === 'game' ? this.pitches : undefined });
  }

  private newSession(mode: SessionMode = this.session.mode, seed?: string): void {
    this.sessionNumber++;
    document.querySelectorAll('.summary-screen, .title-screen').forEach((n) => n.remove());
    this.titleStart = null;
    this.session = this.makeSession(seed ?? `${this.baseSeed}-${this.sessionNumber}`, mode);
    this.simTime = 0;
    this.lastLiveTime = 0;
    this.replay = null;
    this.reveal = null;
    this.perf.reset();
    this.hud.clearResult();
    this.begin();
  }

  // ---------------------------------------------------------------- input

  private handleIntent(item: TimedIntent, at: number): void {
    const { intent } = item;
    if (intent === 'mute') {
      this.audio.setMuted(!this.audio.muted);
      this.hud.flash(this.audio.muted ? 'SOUND OFF' : 'SOUND ON');
      return;
    }
    if (intent === 'debug') {
      void this.toggleDebug();
      return;
    }
    if (intent === 'exportLog') {
      this.downloadLog();
      return;
    }
    if (this.titleStart) {
      if (intent === 'next' || intent === 'balk') this.titleStart('game');
      return;
    }
    if (!this.running) return;
    switch (intent) {
      case 'replay':
        if (this.replay) this.replay = null;
        else this.startReplay('umpire');
        return;
      case 'replayCamera':
        if (this.replay)
          this.replay.view = VIEW_ORDER[(VIEW_ORDER.indexOf(this.replay.view) + 1) % VIEW_ORDER.length]!;
        else this.startReplay('catcher');
        return;
      case 'next':
        this.replay = null;
        this.handleEvents(this.session.input('next', at));
        return;
      case 'strike':
      case 'ball':
      case 'balk': {
        if (this.replay) return;
        const events = this.session.input(intent, at);
        if (events.some((e) => e.type === 'called' || e.type === 'balkCalled')) {
          this.pendingFeedback = { pitch: this.session.current?.index ?? -1, since: item.timeStamp };
        }
        this.handleEvents(events);
        return;
      }
    }
  }

  // ---------------------------------------------------------------- session events

  private handleEvents(events: readonly SessionEvent[]): void {
    if (events.length === 0) return;
    for (const e of events) {
      switch (e.type) {
        case 'pitchStart':
          this.onPitchStart(e.record);
          break;
        case 'catch':
          this.audio.mittPop(clamp((e.record.pitch.plateSpeedMph - 70) / 25, 0.45, 1.2));
          break;
        case 'called':
          this.onCalled(e.record, e.call);
          break;
        case 'balkCalled':
          this.arms.play('balk', e.record.balk.calledAt ?? this.simTime);
          this.audio.say("That's a balk!");
          this.hud.flash('BALK!', e.correct ? 'good' : e.warning ? 'warn' : 'bad');
          break;
        case 'challenge':
          this.hud.showChallenge(e.record, false);
          this.reveal = { record: e.record, at: this.session.time + PRESENTATION.challengeRevealS };
          break;
        case 'resolved':
          // A challenged call keeps its verdict hidden until Robo-Ump answers.
          if (!e.record.challenge) this.showOutcome(e.record, true);
          break;
        case 'sessionOver':
          this.onSessionOver();
          break;
      }
    }
    this.hud.update(this.session);
  }

  private onPitchStart(r: PitchRecord): void {
    const fielding = r.half === 'top' ? TEAMS.home : TEAMS.away;
    const batting = r.half === 'top' ? TEAMS.away : TEAMS.home;
    this.pitcher.setPitcher(r.pitcher, fielding);
    this.catcher.setColors(fielding.jersey, fielding.trim);
    this.batter.setBatter(r.batter, batting.jersey, batting.trim);
    this.ump.setBatterSide(r.batter.side, r.times.start, this.firstPitch);
    this.firstPitch = false;
    this.replay = null;
    this.reveal = null;
    this.hud.clearResult();
  }

  private onCalled(r: PitchRecord, call: BallStrikeCall): void {
    const [balls, strikes] = r.countBefore.split('-').map(Number);
    if (call.kind === 'strike') {
      const three = strikes === 2;
      this.arms.play(three ? 'strikeThree' : 'strike', call.time);
      this.audio.say(three ? 'Strike three!' : 'Strike!');
    } else {
      // Balls get a voice and no arm signal, as in real mechanics.
      this.audio.say(balls === 3 ? 'Ball four' : 'Ball');
    }
  }

  private showOutcome(r: PitchRecord, withCrowd: boolean): void {
    this.hud.showResult(r);
    this.hud.hideHint();
    const good = r.outcome === 'balk' ? r.balk.correct === true : r.correct === true;
    // A legal drill delivery that passes without a call is a non-event, so the crowd stays quiet.
    const quiet = r.outcome === 'noCall' && good;
    if (withCrowd && !quiet) {
      if (good) this.audio.cheer(r.outcome === 'strikeout');
      else this.audio.boo();
    }
    if (r.outcome === 'walk') this.hud.flash('BALL FOUR');
    else if (r.outcome === 'strikeout')
      this.hud.flash(r.outsBefore === 2 ? 'STRIKE THREE · SIDE RETIRED' : 'STRIKE THREE');
    else if (
      good &&
      this.session.score.streak > 0 &&
      this.session.score.streak % PRESENTATION.streakBannerEvery === 0
    ) {
      this.hud.flash(`STREAK ${this.session.score.streak}!`, 'good');
    }
  }

  private checkReveal(): void {
    if (!this.reveal || this.session.time < this.reveal.at) return;
    const r = this.reveal.record;
    this.reveal = null;
    const c = r.challenge!;
    this.hud.showChallenge(r, true);
    if (c.overturned) this.audio.boo();
    else this.audio.cheer(true);
    this.showOutcome(r, false);
  }

  private onSessionOver(): void {
    this.running = false;
    this.replay = null;
    this.hud.clearResult();
    const summary = summarize(this.session);
    if (summary.drill) {
      showDrillSummary(
        this.hudRoot,
        summary.drill,
        () => this.newSession('balkDrill'),
        () => this.newSession('game'),
      );
      return;
    }
    showSummary(
      this.hudRoot,
      summary,
      () => this.newSession('game'),
      () => this.downloadLog(),
    );
  }

  // ---------------------------------------------------------------- replay

  private startReplay(view: ViewMode): void {
    const r = this.session.current;
    if (!r || r.resolvedAt === null) return;
    const start = r.runnersOn ? r.times.setStart - REPLAY.setLeadS : r.times.release - REPLAY.leadS;
    this.replay = { record: r, start, end: r.times.catch + REPLAY.tailS, t: start, prev: start, view };
  }

  private advanceReplay(dt: number): void {
    const rp = this.replay!;
    const { release, catch: catchT } = rp.record.times;
    const slow = rp.t >= release - REPLAY.slowBeforeReleaseS && rp.t <= catchT + REPLAY.slowAfterCatchS;
    rp.prev = rp.t;
    rp.t = Math.min(rp.end, rp.t + dt * (slow ? this.replaySlowSpeed : REPLAY.fastSpeed));
  }

  // ---------------------------------------------------------------- presentation

  private idlePose(): void {
    // Before the first pitch, the leadoff matchup stands in so the title screen has a scene behind it.
    this.pitcher.setPitcher(PITCHERS[0], TEAMS.home);
    this.batter.setBatter(BATTERS[0], TEAMS.away.jersey, TEAMS.away.trim);
    this.ump.setBatterSide(BATTERS[0].side, 0, true);
  }

  private swayWeight(r: PitchRecord | undefined, t: number): number {
    if (!r) return 1;
    const a = r.times.setStart;
    const b = r.times.catch + PRESENTATION.steadyAfterCatchS;
    if (t >= a && t <= b) return 0;
    return Math.min(1, (t < a ? a - t : t - b) / PRESENTATION.swayBlendS);
  }

  private present(): void {
    let record = this.session.current;
    let t = this.simTime;
    let prev = this.lastLiveTime;
    if (this.replay) {
      record = this.replay.record;
      t = this.replay.t;
      prev = this.replay.prev;
    } else if (this.frozen) {
      t = this.frozen.time;
      prev = this.frozen.prev;
    } else {
      this.lastLiveTime = t;
    }
    const view = this.replay?.view ?? 'umpire';

    this.pitcher.update(record, t);
    this.batter.update(t);
    this.catcher.update(record, t);
    this.catcher.group.visible = view !== 'catcher';
    this.ball.ghostEnabled = this.assists.seeThroughBall;
    this.ball.update(
      record,
      t,
      prev,
      this.pitcher.ballInHand(this.held),
      this.catcher.gloveWorld(this.caught),
    );

    const inReplay = this.replay !== null;
    this.zoneOverlay.show(record, {
      zone: inReplay || this.overlays.zone,
      path: inReplay || this.overlays.path,
      time: t,
    });
    this.ump.update(t, inReplay ? 0 : this.swayWeight(record, t));
    this.arms.update(this.simTime);
    if (inReplay) this.arms.group.visible = false;

    this.app.classList.toggle('replaying', inReplay);
    this.app.classList.toggle('replay-outside', inReplay && view !== 'umpire');
    if (this.replay) {
      const label = view === 'umpire' ? 'Umpire view' : REPLAY_VIEWS[view].label;
      const html = `REPLAY · ${label} <small><kbd>C</kbd> view · <kbd>R</kbd> close · <kbd>Enter</kbd> next</small>`;
      if (this.replayBadge.innerHTML !== html) this.replayBadge.innerHTML = html;
    }
  }

  private activeCamera(): THREE.PerspectiveCamera {
    if (this.debugCam) return this.debugCam;
    const view = this.replay?.view ?? 'umpire';
    return view === 'umpire' ? this.ump.camera : this.replayCams[view];
  }

  private makeReplayCam(view: keyof typeof REPLAY_VIEWS): THREE.PerspectiveCamera {
    const v = REPLAY_VIEWS[view];
    const cam = new THREE.PerspectiveCamera(v.fovDeg, 16 / 9, 0.05, 3000);
    cam.position.copy(simXYZ(v.position[0], v.position[1], v.position[2]));
    // Straight down needs an up vector that is not vertical; sim +y (toward the pitcher) reads as up.
    if (view === 'overhead') cam.up.copy(simXYZ(0, 1, 0));
    cam.lookAt(simXYZ(v.lookAt[0], v.lookAt[1], v.lookAt[2]));
    cam.updateMatrixWorld(true);
    return cam;
  }

  private resize(): void {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.ump.resize(aspect);
    for (const cam of Object.values(this.replayCams)) {
      cam.aspect = aspect;
      cam.updateProjectionMatrix();
    }
  }

  // ---------------------------------------------------------------- tools

  downloadLog(): void {
    const log = { ...sessionLog(this.session), perf: this.perf.export() };
    const blob = new Blob([`${JSON.stringify(log, null, 2)}\n`], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ump-log-${this.session.seed}.json`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  replayPitch(index: number): void {
    const r = this.session.records[index];
    if (!r || r.resolvedAt === null) return;
    const start = r.runnersOn ? r.times.setStart - REPLAY.setLeadS : r.times.release - REPLAY.leadS;
    this.replay = {
      record: r,
      start,
      end: r.times.catch + REPLAY.tailS,
      t: start,
      prev: start,
      view: this.replay?.view ?? 'umpire',
    };
  }

  restartWithSeed(seed: string): void {
    this.newSession(this.session.mode, seed);
  }

  async toggleDebug(): Promise<void> {
    if (!this.debugPanel) {
      const { createDebugPanel } = await import('./debug/panel');
      this.debugPanel = createDebugPanel(this);
      return;
    }
    this.debugPanel.toggle();
  }

  hooks(): UmpHooks {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const game = this;
    const pitchInfo = (r: PitchRecord): HookPitch => ({
      index: r.index,
      times: r.times,
      crossing: { x: r.truth.crossing.x, y: r.zone.planeY, z: r.truth.crossing.z },
      truthIsStrike: r.truth.isStrike,
      edgeIn: r.truth.edgeDistanceIn,
      runnersOn: r.runnersOn,
      variant: r.delivery.variant,
      violationTime: r.delivery.violationTime,
      call: r.call?.kind ?? null,
      grade: r.call?.grade ?? null,
      balkCalled: r.balk.calledAt !== null,
      balkCorrect: r.balk.correct,
      outcome: r.outcome,
      correct: r.correct,
      resolved: r.resolvedAt !== null,
    });
    return {
      get frames() {
        return game.frames;
      },
      get seed() {
        return game.session.seed;
      },
      get phase() {
        return game.session.phase;
      },
      get simTime() {
        return game.simTime;
      },
      get score() {
        return game.session.score.total;
      },
      get streakCount() {
        return game.session.score.streak;
      },
      pitch: () => (game.session.current ? pitchInfo(game.session.current) : null),
      pause: () => {
        game.testPaused = true;
      },
      play: () => {
        game.testPaused = false;
      },
      advanceTo: (time: number) => {
        game.simTime = Math.max(game.simTime, time);
        game.handleEvents(game.session.update(game.simTime));
      },
      input: (intent: GameIntent) =>
        game.queue.push({ intent, timeStamp: performance.now(), source: 'keyboard' }),
      inputNow: (intent: GameIntent) =>
        game.handleIntent({ intent, timeStamp: performance.now(), source: 'keyboard' }, game.simTime),
      freeze: (time: number, prev?: number) => {
        game.frozen = { time, prev: prev ?? time };
      },
      unfreeze: () => {
        game.frozen = null;
      },
      setOverlays: (o) => Object.assign(game.overlays, o),
      cameraMatrix: () => game.activeCamera().matrixWorld.toArray(),
      project: (p: XYZ) => {
        const v = toThree(p, game.projected).project(game.activeCamera());
        return {
          x: ((v.x + 1) / 2) * game.canvas.clientWidth,
          y: ((1 - v.y) / 2) * game.canvas.clientHeight,
        };
      },
      streakSegment: () => {
        const s = game.ball.lastSegment;
        return { visible: s.visible, from: toXYZ(s.from), to: toXYZ(s.to) };
      },
      armsVisible: () => game.arms.group.visible,
      replayView: () => game.replay?.view ?? null,
      setDebugCamera: (view) => {
        if (!view) {
          game.debugCam = null;
          return;
        }
        const cam = new THREE.PerspectiveCamera(view.fovDeg, game.ump.camera.aspect, 0.05, 3000);
        cam.position.copy(toThree(view.position));
        cam.lookAt(toThree(view.lookAt));
        cam.updateMatrixWorld(true);
        game.debugCam = cam;
      },
    };
  }
}
