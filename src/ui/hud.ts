import { TEAMS } from '../data/roster';
import { PITCH_TYPES } from '../data/pitchTypes';
import type { PitchRecord, Session, SessionMode } from '../sim/game/session';
import { el, formatHeight, formatInches } from './dom';
import { kzoneSvg } from './kzone';

/** Scorebug, score and streak, matchup, and the per-pitch result card. */
export class Hud {
  private readonly scorebug: HTMLElement;
  private readonly scorePanel: HTMLElement;
  private readonly matchup: HTMLElement;
  private readonly balkPill: HTMLElement;
  private readonly banner: HTMLElement;
  private readonly card: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly challengeCard: HTMLElement;
  private bannerTimer = 0;

  private readonly balkText: string;
  private readonly drillText: string;
  private readonly touch: boolean;

  constructor(root: HTMLElement, opts: { readonly touch: boolean }) {
    this.touch = opts.touch;
    this.balkText = opts.touch ? 'Runners on: tap BALK if he never stops' : 'Runners on: SPACE calls a balk';
    this.drillText = opts.touch
      ? 'Tap BALK only if he never stops in the set'
      : 'SPACE only if he never stops in the set';
    this.scorebug = el('div', 'scorebug panel', root);
    this.scorePanel = el('div', 'score-panel panel', root);
    this.matchup = el('div', 'matchup', root);
    this.balkPill = el('div', 'balk-pill', root);
    this.banner = el('div', 'banner', root);
    this.card = el('div', 'result-card panel', root);
    this.challengeCard = el('div', 'challenge-card panel', root);
    this.hint = el('div', 'controls-hint', root);
    this.setMode('game');
  }

  update(session: Session): void {
    const s = session.state;
    const outs = [0, 1, 2].map((i) => `<i class="${i < s.outs ? 'on' : ''}"></i>`).join('');
    const base = (on: boolean, cls: string) => `<b class="base ${cls} ${on ? 'on' : ''}"></b>`;
    this.scorebug.innerHTML = `
      <div class="teams"><span>${TEAMS.away.short} <strong>${s.runs.away}</strong></span><span>${TEAMS.home.short} <strong>${s.runs.home}</strong></span></div>
      <div class="inning">${s.half === 'top' ? '▲' : '▼'}${s.inning}</div>
      <div class="diamond">${base(s.bases.second, 'b2')}${base(s.bases.third, 'b3')}${base(s.bases.first, 'b1')}</div>
      <div class="count"><span>${s.balls}-${s.strikes}</span><span class="outs">${outs}</span></div>`;
    const progress = `${Math.min(session.records.length, session.pitchesTotal)}/${session.pitchesTotal}`;
    if (session.mode === 'balkDrill') {
      const done = session.records.filter((r) => r.resolvedAt !== null);
      const spotted = done.filter((r) => r.balk.correct === true).length;
      const falseAlarms = done.filter((r) => r.balk.calledAt !== null && r.balk.correct === false).length;
      this.scorePanel.innerHTML = `
      <div class="score">BALK DRILL</div>
      <div class="sub"><span>DELIVERY ${progress}</span><span>SPOTTED ${spotted}</span><span>FALSE ALARMS ${falseAlarms}</span></div>`;
    } else {
      const sc = session.score;
      const acc = sc.called > 0 ? Math.round((100 * sc.correct) / sc.called) : null;
      this.scorePanel.innerHTML = `
      <div class="score">${sc.total.toLocaleString('en-US')}</div>
      <div class="sub"><span>STREAK ${sc.streak}</span><span>PITCH ${progress}</span>${acc === null ? '' : `<span>${acc}% RIGHT</span>`}</div>`;
    }
    const r = session.current;
    if (r) {
      this.matchup.textContent = `${r.batter.name} (${r.batter.side}, ${formatHeight(r.batter.heightFt)}) vs ${r.pitcher.name}`;
    }
    const runnersOn = s.bases.first || s.bases.second || s.bases.third;
    const live = session.phase === 'prepitch' || session.phase === 'delivery' || session.phase === 'flight';
    this.balkPill.classList.toggle('show', runnersOn && live);
    this.balkPill.textContent = session.mode === 'balkDrill' ? this.drillText : this.balkText;
  }

  /** Resets the controls hint for a new session; the drill only uses BALK. */
  setMode(mode: SessionMode): void {
    if (mode === 'balkDrill') {
      this.hint.innerHTML = this.touch
        ? 'Tap BALK only when he never stops in the set'
        : '<kbd>Space</kbd> BALK only when he never stops · <kbd>R</kbd> REPLAY · <kbd>Enter</kbd> NEXT';
    } else {
      this.hint.innerHTML = this.touch
        ? 'Tap BALL or STRIKE after the catch'
        : '<kbd>F</kbd> BALL · <kbd>J</kbd> STRIKE · <kbd>Space</kbd> BALK · <kbd>R</kbd> REPLAY · <kbd>Enter</kbd> NEXT';
    }
    this.hint.classList.remove('fade');
  }

  hideHint(): void {
    this.hint.classList.add('fade');
  }

  flash(text: string, tone: 'good' | 'bad' | 'warn' | 'neutral' = 'neutral'): void {
    this.banner.textContent = text;
    this.banner.className = `banner show tone-${tone}`;
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.banner.classList.remove('show'), 1400);
  }

  clearResult(): void {
    this.card.classList.remove('show');
    this.challengeCard.classList.remove('show');
  }

  showResult(r: PitchRecord): void {
    const pitchName = PITCH_TYPES[r.pitch.typeId].name;
    const lines = r.scoreLines
      .map(
        (l) =>
          `<li><span>${l.label}</span><span class="${l.points >= 0 ? 'pos' : 'neg'}">${l.points >= 0 ? '+' : ''}${l.points}</span></li>`,
      )
      .join('');
    let verdict = '';
    if (r.outcome === 'noCall') {
      verdict = r.balk.missed
        ? '<div class="verdict bad">✗ Missed balk: he never stopped in the set (6.02(a)(13)).</div>'
        : '<div class="verdict good">✓ Legal delivery: he came set and stopped. Good no-call.</div>';
    } else if (r.outcome === 'balk') {
      verdict = r.balk.correct
        ? '<div class="verdict good">✓ BALK. No stop in the set (6.02(a)(13)). Runners advance.</div>'
        : r.balk.warning
          ? '<div class="verdict warn">⚠ Legal delivery: he stopped. Warning this time. Runners still advance on your call.</div>'
          : '<div class="verdict bad">✗ Phantom balk: he came to a complete stop. Runners advance on your call.</div>';
    } else if (r.timedOut) {
      verdict = '<div class="verdict bad">✗ NO CALL. You have to call every take.</div>';
    } else if (r.call) {
      const truth = r.truth.isStrike ? 'strike' : 'ball';
      const miss = r.truth.isStrike
        ? `${formatInches(r.truth.edgeDistanceIn)} inside`
        : `${formatInches(r.truth.edgeDistanceIn)} off`;
      verdict = r.correct
        ? `<div class="verdict good">✓ Correct. It was a ${truth}, ${miss}.</div>`
        : `<div class="verdict bad">✗ Missed. It was a ${truth}, ${miss}.</div>`;
      const timing = {
        quick: 'Quick call: wait for the glove to settle',
        clean: 'Clean timing',
        pro: 'Pro timing',
        hesitant: 'Hesitant call',
      }[r.call.grade];
      verdict += `<div class="timing">${timing} (${(r.call.time - r.times.catch).toFixed(2)} s after the catch)</div>`;
    }
    if (r.balk.missed && r.outcome !== 'noCall') {
      verdict += '<div class="verdict bad">✗ Missed balk: the pitcher never stopped in the set.</div>';
    }
    // A balk is a dead ball, so its card shows the delivery verdict without a pitch location.
    const zone = r.outcome === 'balk' || r.outcome === 'noCall' ? '' : kzoneSvg(r);
    this.card.innerHTML = `
      <div class="card-head"><span>${pitchName}</span><span>${r.pitch.speedMph.toFixed(1)} mph</span></div>
      <div class="card-body">${zone}<div class="card-text">${verdict}<ul class="points">${lines}</ul></div></div>
      <div class="card-foot">${this.touch ? 'Replay or Next below' : '<kbd>R</kbd> replay · <kbd>Enter</kbd> next'}</div>`;
    this.card.classList.add('show');
  }

  showChallenge(r: PitchRecord, revealed: boolean): void {
    const c = r.challenge;
    if (!c) return;
    const who = c.challenger === 'batter' ? 'BATTER' : 'CATCHER';
    this.challengeCard.innerHTML = revealed
      ? `<div class="challenge-title ${c.overturned ? 'bad' : 'good'}">${c.overturned ? 'OVERTURNED' : 'CALL STANDS'}</div>
         <div class="challenge-sub">Robo-Ump review requested by the ${who.toLowerCase()}</div>`
      : `<div class="challenge-title warn">${who} CHALLENGES</div><div class="challenge-sub">Robo-Ump is reviewing your call…</div>`;
    this.challengeCard.classList.add('show');
  }
}
