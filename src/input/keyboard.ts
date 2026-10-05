import type { GameIntent, IntentQueue } from './intents';

/** Strike sits on the right hand (J, Right Arrow), echoing the umpire's right-arm strike signal. */
const BINDINGS: Record<string, GameIntent> = {
  KeyJ: 'strike',
  ArrowRight: 'strike',
  KeyF: 'ball',
  ArrowLeft: 'ball',
  Space: 'balk',
  Enter: 'next',
  KeyR: 'replay',
  KeyC: 'replayCamera',
  Backquote: 'debug',
  KeyL: 'exportLog',
  KeyM: 'mute',
};

export function bindKeyboard(target: Window, queue: IntentQueue): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLSelectElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    const intent = BINDINGS[e.code];
    if (!intent) return;
    e.preventDefault();
    queue.push({ intent, timeStamp: e.timeStamp, source: 'keyboard' });
  };
  target.addEventListener('keydown', onKey);
  return () => target.removeEventListener('keydown', onKey);
}
