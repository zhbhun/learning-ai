import { Game } from './game.js';
import { Input } from './input.js';
import { Audio } from './audio.js';

const canvas = document.getElementById('game');
const input = new Input();
const audio = new Audio();
const game = new Game(canvas, input, audio);

// 移动端显示虚拟按键
if (input.isTouch()) input.showTouch(true);

// 首次交互后恢复音频
const resumeAudio = () => audio.resume();
window.addEventListener('pointerdown', resumeAudio, { once: true });
window.addEventListener('keydown', resumeAudio, { once: true });

// 主循环
let last = performance.now();
let acc = 0;
const STEP = 1 / 120; // 固定步长, 保证物理稳定

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1; // 防止卡顿大跳

  acc += dt;
  while (acc >= STEP) {
    game.update(STEP);
    acc -= STEP;
  }
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 暴露到 window 便于调试
window.__game = game;
