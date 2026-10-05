/**
 * Synthesized placeholder audio (KTD11, U24): mitt pop, crowd bed, swells, boos, and a spoken call.
 * Unlocks on the first input to satisfy browser autoplay rules.
 */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private bed: AudioBufferSourceNode | null = null;
  muted = false;
  voiceEnabled = true;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state !== 'running') void this.ctx.resume();
      return;
    }
    // iOS only lets speech start inside a user gesture; a silent utterance here unlocks later calls.
    if ('speechSynthesis' in window) {
      try {
        const primer = new SpeechSynthesisUtterance(' ');
        primer.volume = 0;
        window.speechSynthesis.speak(primer);
      } catch {
        // Speech is optional.
      }
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.startBed();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
    if (m && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  private noiseSource(): AudioBufferSourceNode | null {
    if (!this.ctx || !this.noise) return null;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    return src;
  }

  private startBed(): void {
    const ctx = this.ctx!;
    const src = this.noiseSource()!;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 650;
    const g = ctx.createGain();
    g.gain.value = 0.045;
    src.connect(lp).connect(g).connect(this.master!);
    src.start();
    this.bed = src;
  }

  /** The leather pop of the catch. */
  mittPop(intensity = 1): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const src = this.noiseSource()!;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9 * intensity, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(bp).connect(g).connect(this.master!);
    src.start(t, Math.random());
    src.stop(t + 0.1);
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(170, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.09);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.7 * intensity, t + 0.004);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(og).connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  private crowd(freq: number, peak: number, duration: number): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const src = this.noiseSource()!;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 0.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(bp).connect(g).connect(this.master!);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  cheer(big = false): void {
    this.crowd(1100, big ? 0.32 : 0.14, big ? 1.8 : 0.9);
  }

  boo(): void {
    this.crowd(320, 0.22, 1.4);
  }

  say(text: string): void {
    if (this.muted || !this.voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.15;
      u.pitch = 0.75;
      u.volume = 0.9;
      window.speechSynthesis.speak(u);
    } catch {
      // Speech is optional; some browsers block it without a user gesture.
    }
  }

  dispose(): void {
    this.bed?.stop();
    void this.ctx?.close();
  }
}
