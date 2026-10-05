/** Explicit simulation time in seconds. The sim never reads wall-clock time; its owner advances it (KTD2). */
export class SimClock {
  private current = 0;

  get time(): number {
    return this.current;
  }

  advance(dtSeconds: number): number {
    if (dtSeconds < 0 || !Number.isFinite(dtSeconds)) throw new Error(`Invalid clock step: ${dtSeconds}`);
    this.current += dtSeconds;
    return this.current;
  }
}
