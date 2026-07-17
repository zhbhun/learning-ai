// Web Audio 合成音效, 无外部资源
export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
  }

  _ensure() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { /* 不支持 */ }
  }

  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }

  _tone(freq, dur, type = 'square', vol = 0.3, glide = null) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glide != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, glide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noise(dur, vol = 0.3, filterFreq = 1000) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  }

  shoot() { this._tone(820, 0.07, 'square', 0.12, 380); }
  hitBrick() { this._tone(220, 0.05, 'square', 0.1, 140); }
  hitSteel() { this._tone(1400, 0.04, 'square', 0.12, 900); }
  explodeSmall() { this._noise(0.22, 0.35, 900); this._tone(180, 0.2, 'sawtooth', 0.15, 60); }
  explodeBig() { this._noise(0.6, 0.5, 1200); this._tone(120, 0.5, 'sawtooth', 0.25, 40); }
  playerDie() { this._noise(0.9, 0.5, 1500); this._tone(110, 0.9, 'sawtooth', 0.3, 30); }
  powerup() {
    this._tone(523, 0.08, 'square', 0.18);
    setTimeout(() => this._tone(659, 0.08, 'square', 0.18), 80);
    setTimeout(() => this._tone(784, 0.12, 'square', 0.18), 160);
  }
  bonus() { this._tone(988, 0.1, 'triangle', 0.2); setTimeout(() => this._tone(1319, 0.15, 'triangle', 0.2), 100); }
  start() {
    this._tone(392, 0.12, 'square', 0.2);
    setTimeout(() => this._tone(523, 0.12, 'square', 0.2), 130);
    setTimeout(() => this._tone(659, 0.2, 'square', 0.2), 260);
  }
  gameOver() {
    this._tone(440, 0.25, 'sawtooth', 0.25, 330);
    setTimeout(() => this._tone(330, 0.25, 'sawtooth', 0.25, 247), 260);
    setTimeout(() => this._tone(220, 0.6, 'sawtooth', 0.25, 110), 520);
  }
  stageClear() {
    const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
    notes.forEach((n, i) => setTimeout(() => this._tone(n, 0.1, 'square', 0.18), i * 90));
  }
  freeze() { this._tone(2000, 0.3, 'sine', 0.15, 1200); }
  engine(on) {
    if (this.muted || !this.ctx) return;
    if (on && !this.engineOsc) {
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 60;
      this.engineGain.gain.value = 0.04;
      this.engineOsc.connect(this.engineGain); this.engineGain.connect(this.master);
      this.engineOsc.start();
    } else if (!on && this.engineOsc) {
      try { this.engineOsc.stop(); } catch (e) {}
      this.engineOsc = null; this.engineGain = null;
    }
  }
}
