/* 推箱子 Sokoban —— 纯前端实现，数据来自 levels.js */
(function () {
  'use strict';

  var DIRS = {
    U: [0, -1],
    D: [0, 1],
    L: [-1, 0],
    R: [1, 0],
  };

  var STORAGE_KEY = 'sokoban-k3-progress-v1';

  var boardEl = document.getElementById('board');
  var boardWrap = document.getElementById('boardWrap');
  var levelButtonsEl = document.getElementById('levelButtons');
  var levelNameEl = document.getElementById('levelName');
  var movesEl = document.getElementById('moves');
  var pushesEl = document.getElementById('pushes');
  var bestEl = document.getElementById('best');
  var winOverlay = document.getElementById('winOverlay');
  var winStats = document.getElementById('winStats');
  var demoBar = document.getElementById('demoBar');
  var demoText = document.getElementById('demoText');

  var btnUndo = document.getElementById('btnUndo');
  var btnRestart = document.getElementById('btnRestart');
  var btnAnswer = document.getElementById('btnAnswer');
  var btnReplay = document.getElementById('btnReplay');
  var btnNext = document.getElementById('btnNext');
  var btnDemoStep = document.getElementById('btnDemoStep');
  var btnDemoAuto = document.getElementById('btnDemoAuto');
  var btnDemoExit = document.getElementById('btnDemoExit');

  var levelIndex = 0;
  var state = null; // {W,H,walls,goals,boxes,player,moves,pushes,history,dead}
  var mode = 'play'; // 'play' | 'demo'
  var demoIdx = 0;
  var demoTimer = null;
  var won = false;

  var boxEls = [];
  var playerEl = null;

  var progress = loadProgress();

  function loadProgress() {
    try {
      var p = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(p)) return p;
    } catch (e) {}
    return [];
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {}
  }

  function parseLevel(level) {
    var rows = level.map;
    var H = rows.length;
    var W = 0;
    for (var i = 0; i < H; i++) W = Math.max(W, rows[i].length);
    var walls = new Set();
    var goals = new Set();
    var boxes = [];
    var player = -1;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var c = rows[y][x] || ' ';
        var idx = y * W + x;
        if (c === '#') {
          walls.add(idx);
        } else {
          if (c === '.' || c === '*' || c === '+') goals.add(idx);
          if (c === '$' || c === '*') boxes.push(idx);
          if (c === '@' || c === '+') player = idx;
        }
      }
    }
    var dead = computeDead(W, H, walls, goals);
    return {
      W: W, H: H, walls: walls, goals: goals, boxes: boxes, player: player,
      moves: 0, pushes: 0, history: [], dead: dead,
    };
  }

  // 死角：非目标点，且 (上或下有墙) 且 (左或右有墙) —— 箱子进去就出不来
  function computeDead(W, H, walls, goals) {
    var dead = new Set();
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var i = y * W + x;
        if (walls.has(i) || goals.has(i)) continue;
        var up = y === 0 || walls.has(i - W);
        var dn = y === H - 1 || walls.has(i + W);
        var lf = x === 0 || walls.has(i - 1);
        var rt = x === W - 1 || walls.has(i + 1);
        if ((up || dn) && (lf || rt)) dead.add(i);
      }
    }
    return dead;
  }

  function loadLevel(i) {
    stopAuto();
    mode = 'play';
    demoBar.classList.add('hidden');
    levelIndex = i;
    won = false;
    winOverlay.classList.add('hidden');
    state = parseLevel(LEVELS[i]);
    buildBoard();
    updateStatus();
    buildLevelButtons();
  }

  function buildBoard() {
    boardEl.innerHTML = '';
    var tiles = document.createElement('div');
    tiles.className = 'tiles';
    tiles.style.gridTemplateColumns = 'repeat(' + state.W + ', var(--tile))';
    for (var y = 0; y < state.H; y++) {
      for (var x = 0; x < state.W; x++) {
        var idx = y * state.W + x;
        var cell = document.createElement('div');
        cell.className = 'tile ' + (state.walls.has(idx) ? 'wall' : 'floor');
        if (state.goals.has(idx)) cell.classList.add('goal');
        tiles.appendChild(cell);
      }
    }
    boardEl.appendChild(tiles);

    boxEls = [];
    for (var b = 0; b < state.boxes.length; b++) {
      var el = document.createElement('div');
      el.className = 'entity box';
      var inner = document.createElement('div');
      inner.className = 'box-inner';
      el.appendChild(inner);
      boardEl.appendChild(el);
      boxEls.push(el);
    }
    playerEl = document.createElement('div');
    playerEl.className = 'entity player';
    var pInner = document.createElement('div');
    pInner.className = 'player-inner';
    playerEl.appendChild(pInner);
    boardEl.appendChild(playerEl);

    layout();
    renderEntities(true);
  }

  function tileSize() {
    var maxW = Math.min(boardWrap.clientWidth, 680);
    var maxH = Math.max(220, Math.min(window.innerHeight * 0.52, 520));
    var t = Math.floor(Math.min(maxW / state.W, maxH / state.H));
    return Math.max(18, Math.min(52, t));
  }

  function layout() {
    var t = tileSize();
    boardEl.classList.add('noanim');
    boardEl.style.setProperty('--tile', t + 'px');
    boardEl.style.width = state.W * t + 'px';
    boardEl.style.height = state.H * t + 'px';
    renderEntities(true);
    requestAnimationFrame(function () {
      boardEl.classList.remove('noanim');
    });
  }

  function renderEntities() {
    var t = tileSize();
    for (var i = 0; i < state.boxes.length; i++) {
      var b = state.boxes[i];
      var el = boxEls[i];
      el.style.transform = 'translate(' + (b % state.W) * t + 'px,' + ((b / state.W) | 0) * t + 'px)';
      el.classList.toggle('on-goal', state.goals.has(b));
      el.classList.toggle('stuck', !state.goals.has(b) && state.dead.has(b));
    }
    var p = state.player;
    playerEl.style.transform = 'translate(' + (p % state.W) * t + 'px,' + ((p / state.W) | 0) * t + 'px)';
  }

  function updateStatus() {
    var lv = LEVELS[levelIndex];
    levelNameEl.textContent = '第 ' + (levelIndex + 1) + ' 关 · ' + lv.name;
    movesEl.textContent = state.moves;
    pushesEl.textContent = state.pushes;
    var best = progress[levelIndex];
    bestEl.textContent = best == null ? '-' : best + ' 步';
  }

  function buildLevelButtons() {
    levelButtonsEl.innerHTML = '';
    for (var i = 0; i < LEVELS.length; i++) {
      (function (i) {
        var btn = document.createElement('button');
        btn.textContent = i + 1;
        if (i === levelIndex) btn.classList.add('active');
        if (progress[i] != null) btn.classList.add('done');
        btn.title = '第 ' + (i + 1) + ' 关 · ' + LEVELS[i].name;
        btn.addEventListener('click', function () {
          loadLevel(i);
        });
        levelButtonsEl.appendChild(btn);
      })(i);
    }
  }

  // dirKey: 'U'|'D'|'L'|'R'，返回是否实际移动
  function applyMove(dirKey) {
    var d = DIRS[dirKey];
    var px = state.player % state.W;
    var py = (state.player / state.W) | 0;
    var t = (py + d[1]) * state.W + (px + d[0]);
    if (state.walls.has(t)) return false;

    var boxSet = new Set(state.boxes);
    var pushed = false;
    if (boxSet.has(t)) {
      var b = (py + 2 * d[1]) * state.W + (px + 2 * d[0]);
      if (state.walls.has(b) || boxSet.has(b)) return false;
      pushed = true;
    }

    state.history.push({ player: state.player, boxes: state.boxes.slice(), pushed: pushed });
    if (pushed) {
      var bi = state.boxes.indexOf(t);
      state.boxes[bi] = b;
      state.pushes++;
    }
    state.player = t;
    state.moves++;
    renderEntities();
    updateStatus();
    return true;
  }

  function undo() {
    var h = state.history.pop();
    if (!h) return;
    state.player = h.player;
    state.boxes = h.boxes;
    state.moves--;
    if (h.pushed) state.pushes--;
    renderEntities();
    updateStatus();
  }

  function isSolved() {
    for (var i = 0; i < state.boxes.length; i++) {
      if (!state.goals.has(state.boxes[i])) return false;
    }
    return true;
  }

  function afterPlayerMove() {
    if (mode === 'play' && !won && isSolved()) {
      won = true;
      var best = progress[levelIndex];
      if (best == null || state.moves < best) {
        progress[levelIndex] = state.moves;
        saveProgress();
      }
      winStats.textContent =
        '用了 ' + state.moves + ' 步 · 推箱 ' + state.pushes + ' 次' +
        (progress[levelIndex] === state.moves ? ' · 新纪录！' : ' · 最佳 ' + progress[levelIndex] + ' 步');
      btnNext.textContent = levelIndex + 1 < LEVELS.length ? '下一关 →' : '全部通关 🎉';
      winOverlay.classList.remove('hidden');
      buildLevelButtons();
      updateStatus();
    }
  }

  // ---------- 答案演示 ----------
  function startDemo() {
    stopAuto();
    winOverlay.classList.add('hidden');
    state = parseLevel(LEVELS[levelIndex]);
    won = false;
    mode = 'demo';
    demoIdx = 0;
    buildBoard();
    updateStatus();
    demoBar.classList.remove('hidden');
    updateDemoText();
  }

  function updateDemoText() {
    var total = LEVELS[levelIndex].solution.length;
    if (demoIdx >= total) {
      demoText.textContent = '✓ 演示完成（共 ' + total + ' 步）';
    } else {
      demoText.textContent = '答案演示 ' + demoIdx + ' / ' + total + ' 步';
    }
    btnDemoStep.disabled = demoIdx >= total;
  }

  function demoStep() {
    var sol = LEVELS[levelIndex].solution;
    if (demoIdx >= sol.length) {
      stopAuto();
      return;
    }
    applyMove(sol[demoIdx]);
    demoIdx++;
    updateDemoText();
    if (demoIdx >= sol.length) stopAuto();
  }

  function demoUndo() {
    if (demoIdx <= 0) return;
    undo();
    demoIdx--;
    updateDemoText();
  }

  function exitDemo() {
    stopAuto();
    mode = 'play';
    demoBar.classList.add('hidden');
    // 保留当前局面，玩家可接着自己玩
  }

  function toggleAuto() {
    if (demoTimer) {
      stopAuto();
    } else {
      btnDemoAuto.textContent = '⏸ 暂停';
      demoTimer = setInterval(demoStep, 300);
    }
  }

  function stopAuto() {
    if (demoTimer) {
      clearInterval(demoTimer);
      demoTimer = null;
    }
    btnDemoAuto.textContent = '▶ 自动播放';
  }

  // ---------- 输入 ----------
  var KEYMAP = {
    ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R',
    w: 'U', s: 'D', a: 'L', d: 'R',
    W: 'U', S: 'D', A: 'L', D: 'R',
  };

  document.addEventListener('keydown', function (e) {
    if (mode === 'demo') {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        demoStep();
      } else if (e.key === 'Escape') {
        exitDemo();
      } else if (e.key === 'u' || e.key === 'z' || e.key === 'U' || e.key === 'Z') {
        demoUndo();
      }
      return;
    }
    if (won) {
      if (e.key === 'Enter') btnNext.click();
      return;
    }
    var dir = KEYMAP[e.key];
    if (dir) {
      e.preventDefault();
      if (applyMove(dir)) afterPlayerMove();
    } else if (e.key === 'u' || e.key === 'z' || e.key === 'U' || e.key === 'Z') {
      undo();
    } else if (e.key === 'r' || e.key === 'R') {
      loadLevel(levelIndex);
    }
  });

  document.querySelectorAll('.dpad button').forEach(function (btn) {
    btn.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      if (mode !== 'play' || won) return;
      if (applyMove(btn.dataset.d)) afterPlayerMove();
    });
  });

  btnUndo.addEventListener('click', function () {
    if (mode === 'demo') demoUndo();
    else if (!won) undo();
  });
  btnRestart.addEventListener('click', function () {
    loadLevel(levelIndex);
  });
  btnAnswer.addEventListener('click', startDemo);
  btnReplay.addEventListener('click', function () {
    loadLevel(levelIndex);
  });
  btnNext.addEventListener('click', function () {
    if (levelIndex + 1 < LEVELS.length) loadLevel(levelIndex + 1);
    else loadLevel(0);
  });
  btnDemoStep.addEventListener('click', demoStep);
  btnDemoAuto.addEventListener('click', toggleAuto);
  btnDemoExit.addEventListener('click', exitDemo);

  window.addEventListener('resize', function () {
    if (state) layout();
  });

  loadLevel(0);
})();
