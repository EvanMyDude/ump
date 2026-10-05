import { DRILL } from '../data/tuning';
import type { SessionMode } from '../sim/game/session';
import type { DrillSummary, SessionSummary } from '../sim/log/pitchLog';
import { el } from './dom';

/**
 * Title card. The game routes Enter, Space, and the gamepad's start button to the returned `start` with
 * 'game'; the drill button starts the spot-the-balk drill.
 */
export function showTitle(
  root: HTMLElement,
  onStart: (mode: SessionMode) => void,
): (mode: SessionMode) => void {
  const overlay = el('div', 'screen title-screen', root);
  overlay.innerHTML = `
    <div class="screen-inner">
      <h1 class="logo">UMP</h1>
      <p class="tagline">You're behind the plate. Every take is yours to call.</p>
      <ul class="howto">
        <li><kbd>F</kbd> or <kbd>←</kbd> calls a <strong>ball</strong>; <kbd>J</kbd> or <kbd>→</kbd> calls a <strong>strike</strong>. On a phone, tap the buttons.</li>
        <li>Wait for the glove to settle before you call. A quick call costs points.</li>
        <li>With runners on, watch the set. If the pitcher never stops, hit <kbd>Space</kbd> or <strong>BALK</strong>.</li>
        <li>Miss one and the batter or catcher may challenge. Robo-Ump has the final word.</li>
      </ul>
      <div class="row">
        <button class="start-btn" type="button" data-mode="game">PLAY BALL</button>
        <button class="ghost-btn" type="button" data-mode="balkDrill">Balk drill: ${DRILL.deliveries} deliveries</button>
      </div>
      <p class="fineprint">Prototype M1 · fictional league · 50 pitches · sound on · <kbd>R</kbd> replays a pitch</p>
    </div>`;
  let started = false;
  const start = (mode: SessionMode) => {
    if (started) return;
    started = true;
    overlay.remove();
    onStart(mode);
  };
  for (const button of overlay.querySelectorAll<HTMLButtonElement>('button[data-mode]')) {
    button.addEventListener('click', () => start(button.dataset.mode as SessionMode));
  }
  return start;
}

/** End of the spot-the-balk drill (U8), graded against U9's starting balk bar. */
export function showDrillSummary(
  root: HTMLElement,
  d: DrillSummary,
  onAgain: () => void,
  onGame: () => void,
): void {
  const pct = d.detection === null ? 'n/a' : `${Math.round(100 * d.detection)}%`;
  const bar = `The bar is at least ${Math.round(100 * DRILL.passDetection)}% of balks spotted with no more than ${DRILL.passMaxFalseAlarms} false alarm.`;
  const overlay = el('div', 'screen summary-screen drill-summary', root);
  overlay.innerHTML = `
    <div class="screen-inner">
      <h2 class="logo small">BALK DRILL</h2>
      <div class="big-stats">
        <div><span>${pct}</span><label>balks spotted</label></div>
        <div><span>${d.spotted} of ${d.balks}</span><label>no-stop deliveries</label></div>
        <div><span>${d.falseAlarms}</span><label>false alarms</label></div>
      </div>
      <p class="verdict ${d.passed ? 'good' : 'bad'}">${d.passed ? 'PASS.' : 'NOT YET.'} ${bar}</p>
      <p class="fineprint">The rule asks for a complete stop in the set with runners on (6.02(a)(13)). The game reads a stop as the hands holding still for a visible beat; that threshold is the game's interpretation, not the rule's text.</p>
      <div class="row">
        <button class="start-btn" type="button" data-act="again">DRILL AGAIN</button>
        <button class="ghost-btn" type="button" data-act="game">Play a game</button>
      </div>
    </div>`;
  overlay.querySelector('[data-act="again"]')!.addEventListener('click', () => {
    overlay.remove();
    onAgain();
  });
  overlay.querySelector('[data-act="game"]')!.addEventListener('click', () => {
    overlay.remove();
    onGame();
  });
}

export function showSummary(
  root: HTMLElement,
  s: SessionSummary,
  onAgain: () => void,
  onDownload: () => void,
): void {
  const pct = (c: number, n: number) => (n > 0 ? `${Math.round((100 * c) / n)}%` : 'n/a');
  const reg = s.byRegion;
  const overlay = el('div', 'screen summary-screen', root);
  overlay.innerHTML = `
    <div class="screen-inner">
      <h2 class="logo small">UMP CARD</h2>
      <div class="big-stats">
        <div><span>${s.accuracy === null ? 'n/a' : `${(100 * s.accuracy).toFixed(1)}%`}</span><label>accuracy</label></div>
        <div><span>${s.score.toLocaleString('en-US')}</span><label>score</label></div>
        <div><span>${s.bestStreak}</span><label>best streak</label></div>
      </div>
      <table class="stat-table">
        <tr><th>Heart</th><td>${pct(reg.heart.correct, reg.heart.called)}</td><th>Shadow</th><td>${pct(reg.shadow.correct, reg.shadow.called)}</td></tr>
        <tr><th>Chase</th><td>${pct(reg.chase.correct, reg.chase.called)}</td><th>Waste</th><td>${pct(reg.waste.correct, reg.waste.called)}</td></tr>
        <tr><th>Pro timing</th><td>${s.timing.pro}</td><th>Quick calls</th><td>${s.timing.quick}</td></tr>
        <tr><th>Balks spotted</th><td>${s.balks.spotted} of ${s.balks.occurred}</td><th>Phantom balks</th><td>${s.balks.phantom}</td></tr>
        <tr><th>Challenges</th><td>${s.challenges.total}</td><th>Overturned</th><td>${s.challenges.overturned}</td></tr>
        <tr><th>Sec per pitch</th><td>${s.secondsPerPitch ?? 'n/a'}</td><th>No calls</th><td>${s.timing.timeouts}</td></tr>
      </table>
      <div class="row">
        <button class="start-btn" type="button" data-act="again">PLAY AGAIN</button>
        <button class="ghost-btn" type="button" data-act="log">Download pitch log</button>
      </div>
      <p class="fineprint">By Umpire Scorecards' grading, MLB plate umpires got about 94% of called pitches right from 2023 to 2026.</p>
    </div>`;
  overlay.querySelector('[data-act="again"]')!.addEventListener('click', () => {
    overlay.remove();
    onAgain();
  });
  overlay.querySelector('[data-act="log"]')!.addEventListener('click', onDownload);
}
