import type { GameIntent, IntentQueue } from '../input/intents';
import { el } from './dom';

/**
 * On-screen buttons for touch review (pulled forward from U22 so the prototype can be played on a phone).
 * They show on coarse pointers or narrow screens; BALK is always present but only acts with runners on.
 */
export function mountTouchControls(root: HTMLElement, queue: IntentQueue): HTMLElement {
  const bar = el('div', 'touch-controls', root);
  const make = (label: string, intent: GameIntent, cls: string) => {
    const b = el('button', `touch-btn ${cls}`, bar, label);
    b.type = 'button';
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      queue.push({ intent, timeStamp: e.timeStamp, source: 'touch' });
    });
    return b;
  };
  make('BALL', 'ball', 'ball');
  make('BALK', 'balk', 'balk');
  make('STRIKE', 'strike', 'strike');
  const util = el('div', 'touch-util', root);
  for (const [label, intent] of [
    ['Replay', 'replay'],
    ['Next', 'next'],
  ] as const) {
    const b = el('button', 'touch-small', util, label);
    b.type = 'button';
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      queue.push({ intent, timeStamp: e.timeStamp, source: 'touch' });
    });
  }
  return bar;
}
