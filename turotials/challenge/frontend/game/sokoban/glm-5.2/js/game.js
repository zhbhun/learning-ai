/* 仓库番 Sokoban — game logic, rendering, controls, step-by-step solver playback. */
(function () {
  'use strict';

  const LEVELS = window.SokobanLevels || [];
  const SOLUTIONS = window.SokobanSolutions || [];
  const Solver = window.SokobanSolver;

  const DIRS = { U: [-1, 0], D: [1, 0], L: [0, -1], R: [0, 1] };

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  const el = {
    levelName: document.getElementById('levelName'),
    levelHint: document.getElementById('levelHint'),
    moveCount: document.getElementById('moveCount'),
    pushCount: document.getElementById('pushCount'),
    levelNo: document.getElementById('levelNo'),
    levelSelect: document.getElementById('levelSelect'),
    undo: document.getElementById('undoBtn'),
    reset: document.getElementById('resetBtn'),
    prevLevel: document.getElementById('prevLevel'),
    nextLevel: document.getElementById('nextLevel'),
    answerBtn: document.getElementById('answerBtn'),
    solverBar: document.getElementById('solverBar'),
    solStep: document.getElementById('solStep'),
    progressFill: document.getElementById('progressFill'),
    solPrev: document.getElementById('solPrev'),
    solNext: document.getElementById('solNext'),
    solAuto: document.getElementById('solAuto'),
    solExit: document.getElementById('solExit'),
    winOverlay: document.getElementById('winOverlay'),
    winStats: document.getElementById('winStats'),
    winNext: document.getElementById('winNext'),
    winReplay: document.getElementById('winReplay'),
    dpad: document.querySelector('.dpad'),
  };

  // ---- state ----
  let levelIdx = 0;
  let W = 0, H = 0;
  let grid = [];          // static: '#' wall, '.' goal, ' ' floor
  let goals = new Set();
  let boxes = new Set();  // dynamic box positions (index = r*W+c)
  let player = 0;
  let initBoxes = new Set();
  let initPlayer = 0;
  let history = [];       // {dir, pushed, boxFrom, boxTo}
  let moveCount = 0, pushCount = 0;
  let lastBox = -1;       // last moved box cell (for highlight)
  let cell = 48;
  let solMoves = '';
  let solIdx = 0;
  let solTimer = null;
  let solActive = false;

  // ---- parsing ----
  function parseLevel(map) {
    const h = map.length;
    let w = 0;
    for (const r of map) w = Math.max(w, r.length);
    const g = [];
    const gs = new Set();
    const bx = new Set();
    let pl = -1;
    for (let r = 0; r < h; r++) {
      const raw = (map[r] + '').padEnd(w, '#');
      let line = '';
      for (let c = 0; c < w; c++) {
        const ch = raw[c] || '#';
        const idx = r * w + c;
        switch (ch) {
          case '#': line += '#'; break;
          case '.': line += '.'; gs.add(idx); break;
          case '$': line += ' '; bx.add(idx); break;
          case '*': line += '.'; bx.add(idx); gs.add(idx); break;
          case '@': line += ' '; pl = idx; break;
          case '+': line += '.'; pl = idx; gs.add(idx); break;
          default: line += ' ';
        }
      }
      g.push(line);
    }
    return { w, h, grid: g, goals: gs, boxes: bx, player: pl };
  }

  // ---- level loading ----
  function loadLevel(i) {
    // reset solution-playback UI without redrawing on stale state
    stopAuto();
    solActive = false; solMoves = ''; solIdx = 0;
    el.solverBar.classList.add('hidden');
    el.answerBtn.classList.remove('hidden');
    levelIdx = Math.max(0, Math.min(LEVELS.length - 1, i));
    const lv = LEVELS[levelIdx];
    const p = parseLevel(lv.map);
    W = p.w; H = p.h; grid = p.grid; goals = p.goals;
    initBoxes = new Set(p.boxes); initPlayer = p.player;
    el.levelName.textContent = lv.name || ('第 ' + (levelIdx + 1) + ' 关');
    el.levelHint.textContent = lv.hint || '';
    el.levelSelect.value = String(levelIdx);
    resetBoard();
    computeCell();
    draw();
  }

  function resetBoard() {
    boxes = new Set(initBoxes);
    player = initPlayer;
    history = [];
    moveCount = 0; pushCount = 0;
    lastBox = -1;
    hideWin();
    updateStats();
    draw();
  }

  // ---- movement ----
  function applyMove(dir, record) {
    if (won()) return false;
    const [dr, dc] = DIRS[dir];
    const pr = (player / W) | 0, pc = player % W;
    const nr = pr + dr, nc = pc + dc, ni = nr * W + nc;
    if (nr < 0 || nr >= H || nc < 0 || nc >= W) return false;
    if (grid[nr][nc] === '#') return false;

    if (boxes.has(ni)) {
      const br = nr + dr, bc = nc + dc, bi = br * W + bc;
      if (br < 0 || br >= H || bc < 0 || bc >= W) return false;
      if (grid[br][bc] === '#' || boxes.has(bi)) return false;
      boxes.delete(ni); boxes.add(bi);
      player = ni;
      if (record) { history.push({ dir, pushed: true, boxFrom: ni, boxTo: bi }); moveCount++; pushCount++; lastBox = bi; }
      return true;
    }
    player = ni;
    if (record) { history.push({ dir, pushed: false, boxFrom: -1, boxTo: -1 }); moveCount++; }
    return true;
  }

  function undo() {
    if (solActive) return;
    const h = history.pop();
    if (!h) return;
    const [dr, dc] = DIRS[h.dir];
    player -= dr * W + dc;
    if (h.pushed) { boxes.delete(h.boxTo); boxes.add(h.boxFrom); pushCount--; lastBox = h.boxFrom; }
    moveCount--;
    hideWin();
    updateStats();
    draw();
  }

  function won() { for (const b of boxes) if (!goals.has(b)) return false; return true; }

  function userMove(dir) {
    if (solActive) return;
    if (applyMove(dir, true)) {
      updateStats();
      draw();
      if (won()) showWin();
    }
  }

  // ---- solution (answer) playback ----
  function getSolution() {
    if (SOLUTIONS[levelIdx]) return SOLUTIONS[levelIdx];
    if (Solver) {
      const s = Solver.solve(LEVELS[levelIdx].map, { limit: 2000000, timeLimit: 8000 });
      return s ? s.join('') : '';
    }
    return '';
  }

  function enterSolution() {
    const s = getSolution();
    if (!s) { flashAnswer('暂无此关解法'); return; }
    solMoves = s; solIdx = 0; solActive = true;
    resetBoard();
    el.answerBtn.classList.add('hidden');
    el.solverBar.classList.remove('hidden');
    updateSolverUI();
  }

  function stepTo(target) {
    if (!solActive) return;
    target = Math.max(0, Math.min(solMoves.length, target));
    resetBoard();
    for (let k = 0; k < target; k++) applyMove(solMoves[k], false);
    moveCount = target;
    pushCount = countPushesInSolution(target);
    solIdx = target;
    updateStats();
    updateSolverUI();
    draw();
    if (won()) showWin();
  }

  function countPushesInSolution(upTo) {
    // replay on a copy to count pushes accurately
    const bx = new Set(initBoxes); let pl = initPlayer; let pushes = 0;
    for (let k = 0; k < upTo; k++) {
      const [dr, dc] = DIRS[solMoves[k]];
      const nr = (pl / W | 0) + dr, nc = (pl % W) + dc, ni = nr * W + nc;
      if (bx.has(ni)) { const bi = (nr + dr) * W + (nc + dc); bx.delete(ni); bx.add(bi); pushes++; }
      pl = ni;
    }
    return pushes;
  }

  function solNext() { stepTo(solIdx + 1); }
  function solPrev() { stepTo(solIdx - 1); }
  function solAutoToggle() {
    if (solTimer) { stopAuto(); return; }
    if (solIdx >= solMoves.length) stepTo(0);
    el.solAuto.textContent = '⏸';
    solTimer = setInterval(() => {
      if (solIdx >= solMoves.length) { stopAuto(); return; }
      stepTo(solIdx + 1);
    }, 220);
  }
  function stopAuto() { if (solTimer) { clearInterval(solTimer); solTimer = null; } el.solAuto.textContent = '▶'; }
  function exitSolution() {
    stopAuto();
    solActive = false; solMoves = ''; solIdx = 0;
    el.solverBar.classList.add('hidden');
    el.answerBtn.classList.remove('hidden');
    resetBoard();
  }

  function updateSolverUI() {
    el.solStep.textContent = solIdx + ' / ' + solMoves.length;
    const pct = solMoves.length ? (solIdx / solMoves.length) * 100 : 0;
    el.progressFill.style.width = pct + '%';
    el.solAuto.textContent = solTimer ? '⏸' : '▶';
  }

  function flashAnswer(msg) {
    const old = el.answerBtn.textContent;
    el.answerBtn.textContent = msg;
    el.answerBtn.disabled = true;
    setTimeout(() => { el.answerBtn.textContent = old; el.answerBtn.disabled = false; }, 1500);
  }

  // ---- win overlay ----
  function showWin() {
    el.winStats.textContent = '用时 ' + moveCount + ' 步，推动 ' + pushCount + ' 次';
    el.winNext.textContent = (levelIdx >= LEVELS.length - 1) ? '已完成全部 ✨' : '下一关';
    el.winOverlay.classList.remove('hidden');
    stopAuto();
  }
  function hideWin() { el.winOverlay.classList.add('hidden'); }

  // ---- UI updates ----
  function updateStats() {
    el.moveCount.textContent = moveCount;
    el.pushCount.textContent = pushCount;
    el.levelNo.textContent = (levelIdx + 1) + '/' + LEVELS.length;
  }

  // ---- rendering ----
  function computeCell() {
    const wrap = canvas.parentElement;
    const maxW = Math.min(612, wrap.clientWidth - 28);
    const maxH = 612;
    cell = Math.max(20, Math.min(66, Math.floor(maxW / W), Math.floor(maxH / H)));
  }

  function draw() {
    if (W <= 0 || H <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = W * cell, ch = H * cell;
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        const x = c * cell, y = r * cell;
        const ch_ = grid[r][c];
        if (ch_ === '#') {
          drawWall(x, y);
        } else {
          drawFloor(x, y, (r + c) % 2 === 0);
          if (ch_ === '.') drawGoal(x, y);
        }
      }
    }
    // boxes
    for (const b of boxes) {
      const r = (b / W) | 0, c = b % W;
      drawBox(c * cell, r * cell, goals.has(b), b === lastBox);
    }
    // player
    {
      const r = (player / W) | 0, c = player % W;
      drawPlayer(c * cell, r * cell);
    }
  }

  function rr(x, y, w, h, rad) {
    const r = Math.min(rad, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawFloor(x, y, light) {
    ctx.fillStyle = light ? '#2f3540' : '#2a2f39';
    ctx.fillRect(x, y, cell, cell);
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
  }

  function drawWall(x, y) {
    ctx.fillStyle = '#10131a';
    ctx.fillRect(x, y, cell, cell);
    ctx.fillStyle = '#1c212c';
    ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + cell - 2, y + 2);
    ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 2, y + cell - 2);
    ctx.stroke();
  }

  function drawGoal(x, y) {
    const cx = x + cell / 2, cy = y + cell / 2, rad = cell * 0.18;
    ctx.strokeStyle = 'rgba(255,209,102,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, rad + 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
  }

  function drawBox(x, y, onGoal, highlight) {
    const pad = cell * 0.10;
    const bx = x + pad, by = y + pad, bs = cell - pad * 2;
    if (highlight) {
      ctx.fillStyle = 'rgba(91,156,255,0.25)';
      rr(x + 2, y + 2, cell - 4, cell - 4, 8); ctx.fill();
    }
    const grad = ctx.createLinearGradient(bx, by, bx, by + bs);
    if (onGoal) { grad.addColorStop(0, '#5fd068'); grad.addColorStop(1, '#3d9b46'); }
    else { grad.addColorStop(0, '#c98a3e'); grad.addColorStop(1, '#8a5a23'); }
    ctx.fillStyle = grad;
    rr(bx, by, bs, bs, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    rr(bx, by, bs, bs, 7); ctx.stroke();
    // crate cross
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 5, by + 5); ctx.lineTo(bx + bs - 5, by + bs - 5);
    ctx.moveTo(bx + bs - 5, by + 5); ctx.lineTo(bx + 5, by + bs - 5);
    ctx.stroke();
  }

  function drawPlayer(x, y) {
    const cx = x + cell / 2, cy = y + cell / 2, rad = cell * 0.30;
    const grad = ctx.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, rad * 0.2, cx, cy, rad);
    grad.addColorStop(0, '#8fb8ff');
    grad.addColorStop(1, '#3d7bd6');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
  }

  // ---- events ----
  function bind() {
    document.addEventListener('keydown', (e) => {
      const k = e.key;
      let dir = null;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') dir = 'U';
      else if (k === 'ArrowDown' || k === 's' || k === 'S') dir = 'D';
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') dir = 'L';
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') dir = 'R';
      else if (k === 'z' || k === 'Z' || k === 'Backspace') { undo(); e.preventDefault(); return; }
      else if (k === 'r' || k === 'R') { if (!solActive) resetBoard(); e.preventDefault(); return; }
      else if (k === 'Escape' && solActive) { exitSolution(); e.preventDefault(); return; }
      else if (solActive && (k === 'n' || k === 'N' || k === ' ')) { solNext(); e.preventDefault(); return; }
      else if (solActive && (k === 'p' || k === 'P')) { solPrev(); e.preventDefault(); return; }
      if (dir) { userMove(dir); e.preventDefault(); }
    });

    el.dpad.addEventListener('click', (e) => {
      const t = e.target.closest('.dpad-btn');
      if (t) userMove(t.dataset.dir);
    });

    el.undo.addEventListener('click', undo);
    el.reset.addEventListener('click', () => { if (solActive) exitSolution(); else resetBoard(); });
    el.prevLevel.addEventListener('click', () => loadLevel(levelIdx - 1));
    el.nextLevel.addEventListener('click', () => loadLevel(levelIdx + 1));
    el.levelSelect.addEventListener('change', () => loadLevel(parseInt(el.levelSelect.value, 10)));

    el.answerBtn.addEventListener('click', enterSolution);
    el.solNext.addEventListener('click', solNext);
    el.solPrev.addEventListener('click', solPrev);
    el.solAuto.addEventListener('click', solAutoToggle);
    el.solExit.addEventListener('click', exitSolution);

    el.winNext.addEventListener('click', () => {
      if (levelIdx < LEVELS.length - 1) loadLevel(levelIdx + 1);
      else { hideWin(); }
    });
    el.winReplay.addEventListener('click', () => resetBoard());

    window.addEventListener('resize', () => { computeCell(); draw(); });

    // swipe support on canvas
    let sx = 0, sy = 0, st = 0;
    canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now();
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      const adx = Math.abs(dx), ady = Math.abs(dy);
      if (Math.max(adx, ady) < 24 || Date.now() - st > 800) return;
      if (adx > ady) userMove(dx > 0 ? 'R' : 'L');
      else userMove(dy > 0 ? 'D' : 'U');
    }, { passive: true });
  }

  function populateSelect() {
    const frag = document.createDocumentFragment();
    LEVELS.forEach((lv, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = lv.name || ('第 ' + (i + 1) + ' 关');
      frag.appendChild(o);
    });
    el.levelSelect.appendChild(frag);
  }

  // ---- boot ----
  function init() {
    populateSelect();
    bind();
    loadLevel(0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
