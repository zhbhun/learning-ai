// 冒烟测试：用最小 DOM 桩加载 game.js，逐关用键盘事件回放答案，验证能触发过关
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

class El {
  constructor(tag = 'div') {
    this.tagName = tag;
    this.children = [];
    this.classSet = new Set();
    this.style = { setProperty: (k, v) => { this.style[k] = v; } };
    this.dataset = {};
    this._text = '';
    this.clientWidth = 600;
  }
  set className(v) {
    this._cls = v;
    this.classSet = new Set(v.split(/\s+/).filter(Boolean));
  }
  get className() { return this._cls || ''; }
  get classList() {
    const s = this.classSet;
    return {
      add: (...c) => c.forEach((x) => s.add(x)),
      remove: (...c) => c.forEach((x) => s.delete(x)),
      toggle: (c, f) => { if (f === undefined) f = !s.has(c); if (f) s.add(c); else s.delete(c); },
      contains: (c) => s.has(c),
    };
  }
  set innerHTML(v) { this.children = []; this._html = v; }
  get innerHTML() { return this._html || ''; }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener(t, f) { (this._ev ||= {})[t] = f; }
  click() { this._ev && this._ev.click && this._ev.click(); }
  set textContent(v) { this._text = String(v); }
  get textContent() { return this._text; }
}

const registry = new Map();
function getEl(id) {
  if (!registry.has(id)) registry.set(id, new El());
  return registry.get(id);
}

let keydownHandler = null;
const listeners = {};

global.document = {
  getElementById: getEl,
  createElement: (tag) => new El(tag),
  querySelectorAll: (sel) => [],
  addEventListener: (t, f) => { listeners[t] = f; },
};
global.window = {
  addEventListener: () => {},
  innerHeight: 800,
};
global.requestAnimationFrame = (f) => f();
global.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k, v) { this._m.set(k, v); },
};

const levelsCode = fs.readFileSync(path.join(root, 'levels.js'), 'utf8');
const gameCode = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
eval(levelsCode + '\n;globalThis.LEVELS = LEVELS;');
const LEVELS = globalThis.LEVELS;
eval(gameCode);

keydownHandler = listeners.keydown;
if (!keydownHandler) throw new Error('keydown handler 未注册');

const KEY = { U: 'ArrowUp', D: 'ArrowDown', L: 'ArrowLeft', R: 'ArrowRight' };
const levelButtons = getEl('levelButtons');
const winOverlay = getEl('winOverlay');
const movesEl = getEl('moves');
const board = getEl('board');

let pass = 0;
for (let i = 0; i < LEVELS.length; i++) {
  // 点击关卡按钮切换关卡
  levelButtons.children[i].click();
  if (board.children.length === 0) throw new Error(`第${i + 1}关棋盘未渲染`);
  const sol = LEVELS[i].solution;
  for (const ch of sol) {
    keydownHandler({ key: KEY[ch], preventDefault: () => {} });
  }
  const won = !winOverlay.classList.contains('hidden');
  const moves = Number(movesEl.textContent);
  if (!won) throw new Error(`第${i + 1}关回放答案后未触发过关`);
  if (moves !== sol.length) throw new Error(`第${i + 1}关步数不符: ${moves} != ${sol.length}`);
  console.log(`第${i + 1}关 [${LEVELS[i].name}] ✓ ${sol.length}步过关`);
  pass++;
}
console.log(`\n全部 ${pass} 关冒烟测试通过`);

// 演示模式测试：第1关 点「答案」→ 逐步点「下一步」→ 应演示完成且局面已解
getEl('levelButtons').children[0].click();
getEl('btnAnswer').click();
const sol0 = LEVELS[0].solution.length;
for (let i = 0; i < sol0; i++) getEl('btnDemoStep').click();
const demoText = getEl('demoText').textContent;
if (!demoText.includes('演示完成')) throw new Error('演示模式未显示完成: ' + demoText);
if (!getEl('winOverlay').classList.contains('hidden')) throw new Error('演示模式不应弹出过关浮层');
// 退出演示后可继续手动玩
getEl('btnDemoExit').click();
console.log('演示模式（答案→下一步→退出）✓');

// 撤销测试：第2关走一步再撤销，步数应回到 0
getEl('levelButtons').children[1].click();
keydownHandler({ key: 'ArrowRight', preventDefault: () => {} });
getEl('btnUndo').click();
if (Number(getEl('moves').textContent) !== 0) throw new Error('撤销后步数未归零');
if (Number(getEl('pushes').textContent) !== 0) throw new Error('撤销后推箱数未归零');
console.log('撤销 ✓');
