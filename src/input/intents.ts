/** Semantic input intents (KTD6). Availability depends on game state only, never on whether an event is happening. */
export type GameIntent =
  'strike' | 'ball' | 'balk' | 'next' | 'replay' | 'replayCamera' | 'debug' | 'exportLog' | 'mute';

export interface TimedIntent {
  readonly intent: GameIntent;
  /** DOMHighResTimeStamp on the performance.now() clock. */
  readonly timeStamp: number;
  readonly source: 'keyboard' | 'gamepad' | 'touch';
}

export class IntentQueue {
  private items: TimedIntent[] = [];

  push(item: TimedIntent): void {
    this.items.push(item);
  }

  drain(): TimedIntent[] {
    const out = this.items.sort((a, b) => a.timeStamp - b.timeStamp);
    this.items = [];
    return out;
  }
}
