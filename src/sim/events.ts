export type Listener<T> = (event: T) => void;

/** Minimal typed event bus. Emission order is registration order, so it stays deterministic. */
export class EventBus<Events extends object> {
  private readonly listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as Listener<never>);
    return () => set.delete(listener as Listener<never>);
  }

  emit<K extends keyof Events>(type: K, event: Events[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of set) (listener as Listener<Events[K]>)(event);
  }
}
