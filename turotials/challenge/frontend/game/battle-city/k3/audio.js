'use strict';

const SFX = (() => {
  let ctx = null, muted = false;
  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function beep(freq, dur, type, vol, delay) {
    if (muted) return;
    const c = ac();
    if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  return {
    init() { ac(); },
    setMuted(m) { muted = m; },
    shoot() { beep(920, 0.05, 'square', 0.04); },
    hitBrick() { beep(200, 0.05, 'square', 0.05); },
    hitSteel() { beep(140, 0.04, 'square', 0.04); },
    explode() { beep(320, 0.2, 'sawtooth', 0.07); beep(160, 0.28, 'sawtooth', 0.06, 0.04); },
    spawn() { beep(660, 0.05, 'square', 0.03); },
    powerup() { [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.08, 'square', 0.05, i * 0.06)); },
    gameover() { [392, 330, 262, 196].forEach((f, i) => beep(f, 0.16, 'triangle', 0.06, i * 0.14)); },
  };
})();
