import { DIR } from './constants.js';

// 输入管理: 键盘 + 触摸统一为方向/开火事件
export class Input {
  constructor() {
    this.dir = null;          // 当前移动方向(DIR) 或 null
    this.fire = false;        // 开火按住
    this.firePressed = false; // 开火按下(边沿)
    this.keys = new Set();

    // 一次性按键回调
    this.onOnce = {}; // key -> [fn...]

    this._bind();
  }

  on(name, fn) {
    (this.onOnce[name] ||= []).push(fn);
  }
  _emit(name) {
    (this.onOnce[name] || []).forEach(f => f());
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys.add(k);
      this._update();
      // 阻止滚动
      if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();

      if (k === 'enter') this._emit('enter');
      if (k === 'p') this._emit('pause');
      if (k === 'm') this._emit('mute');
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      this.keys.delete(k);
      this._update();
    });

    // 触摸
    this._bindTouch();
  }

  _update() {
    const k = this.keys;
    let dir = null;
    if (k.has('arrowup') || k.has('w')) dir = DIR.UP;
    else if (k.has('arrowdown') || k.has('s')) dir = DIR.DOWN;
    else if (k.has('arrowleft') || k.has('a')) dir = DIR.LEFT;
    else if (k.has('arrowright') || k.has('d')) dir = DIR.RIGHT;
    this.dir = dir;
    this.fire = k.has(' ') || k.has('j');
  }

  _bindTouch() {
    const pad = document.querySelector('.touch-dpad');
    const fireBtn = document.getElementById('t-fire');
    if (!pad) return;

    const setDir = (dir) => { this.dir = dir; };

    pad.querySelectorAll('.t-btn').forEach(btn => {
      const dirName = btn.dataset.dir;
      const dirMap = { up: DIR.UP, down: DIR.DOWN, left: DIR.LEFT, right: DIR.RIGHT };
      const press = (e) => { e.preventDefault(); setDir(dirMap[dirName]); };
      const release = (e) => { e.preventDefault(); if (this.dir === dirMap[dirName]) setDir(null); };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);
    });

    const fpress = (e) => { e.preventDefault(); this.fire = true; };
    const frel = (e) => { e.preventDefault(); this.fire = false; };
    if (fireBtn) {
      fireBtn.addEventListener('touchstart', fpress, { passive: false });
      fireBtn.addEventListener('touchend', frel, { passive: false });
      fireBtn.addEventListener('touchcancel', frel, { passive: false });
      fireBtn.addEventListener('mousedown', fpress);
      fireBtn.addEventListener('mouseup', frel);
    }
  }

  // 触摸面板可见性
  showTouch(show) {
    document.getElementById('touch')?.classList.toggle('hidden', !show);
  }

  isTouch() {
    return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  }
}
