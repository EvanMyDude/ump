import type { GameIntent, IntentQueue } from './intents';

/** Standard-mapping button indices. Gamepads have no events, so intents carry the poll time (KTD6). */
const BUTTONS: Array<[number, GameIntent]> = [
  [7, 'strike'], // right trigger
  [6, 'ball'], // left trigger
  [0, 'balk'], // bottom face button
  [3, 'replay'], // top face button
  [9, 'next'], // start
  [1, 'next'], // right face button
];

export class GamepadInput {
  private readonly previous = new Map<number, boolean[]>();

  constructor(private readonly queue: IntentQueue) {}

  poll(): void {
    const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad || pad.mapping !== 'standard') continue;
      const prev = this.previous.get(pad.index) ?? [];
      const now = pad.buttons.map((b) => b.pressed || b.value > 0.5);
      const stamp = pad.timestamp || performance.now();
      for (const [i, intent] of BUTTONS) {
        if (now[i] && !prev[i])
          this.queue.push({ intent, timeStamp: Math.min(stamp, performance.now()), source: 'gamepad' });
      }
      this.previous.set(pad.index, now);
    }
  }
}
