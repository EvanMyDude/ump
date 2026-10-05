import type { SessionSummary } from '../sim/log/pitchLog';
import { el } from './dom';

/** Title card. The game routes Enter, Space, and the gamepad's start button to the returned `start`. */
export function showTitle(root: HTMLElement, onStart: () => void): () => void {
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
      <button class="start-btn" type="button">PLAY BALL</button>
      <p class="fineprint">Prototype M1 · fictional league · 50 pitches · sound on · <kbd>R</kbd> replays a pitch</p>
    </div>`;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    overlay.remove();
    onStart();
  };
  overlay.querySelector('button')!.addEventListener('click', start);
  return start;
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
