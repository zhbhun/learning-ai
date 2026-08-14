/*
 * Sokoban 游戏前端逻辑：渲染棋盘、键盘/按钮移动、撤销、逐步解题回放。
 * 依赖全局 Sokoban（求解器）与 LEVELS（关卡数据）。
 */
(function () {
  "use strict";

  const DIR = {
    U: { dx: 0, dy: -1 }, D: { dx: 0, dy: 1 },
    L: { dx: -1, dy: 0 }, R: { dx: 1, dy: 0 },
  };
  const KEY2DIR = {
    ArrowUp: "U", ArrowDown: "D", ArrowLeft: "L", ArrowRight: "R",
    w: "U", W: "U", s: "D", S: "D", a: "L", A: "L", d: "R", D: "R",
  };

  const $ = (id) => document.getElementById(id);
  const boardEl = $("board");
  const levelSelect = $("levelSelect");
  const hudLevel = $("hudLevel");
  const hudMoves = $("hudMoves");
  const hudPushes = $("hudPushes");
  const hudBoxes = $("hudBoxes");
  const banner = $("banner");
  const solverPanel = $("solverPanel");

  let levelIndex = 0;
  let level = null;     // parsed {W,H,walls,goals,boxes,player}
  let W = 0, H = 0;
  let walls = [], goals = new Set();
  let boxes = new Set();
  let player = null;
  let history = [];     // undo stack
  let moves = 0, pushes = 0;
  let won = false;

  // solver state
  let solution = null;  // {moves:[...], pushes:[...]}
  let stepIndex = 0;
  let playTimer = null;

  // ---- level selector ----
  LEVELS.forEach((lv, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = lv.name;
    levelSelect.appendChild(opt);
  });

  function loadLevel(i) {
    levelIndex = i;
    levelSelect.value = i;
    level = Sokoban.parseLevel(LEVELS[i].text);
    W = level.W; H = level.H;
    walls = level.walls;
    goals = new Set(level.goals);
    resetState();
    hudLevel.textContent = i + 1;
  }

  function resetState() {
    boxes = new Set(level.boxes);
    player = { x: level.player.x, y: level.player.y };
    history = [];
    moves = 0; pushes = 0; won = false;
    banner.classList.add("hidden");
    stopSolverPlayback();
    solution = null; stepIndex = 0;
    solverPanel.classList.add("hidden");
    $("solverInfo").textContent = "";
    $("solverStep").textContent = "0 / 0";
    render();
  }

  // ---- rendering ----
  function render() {
    boardEl.innerHTML = "";
    boardEl.style.gridTemplateColumns = `repeat(${W}, max-content)`;
    let done = 0;
    for (const b of boxes) if (goals.has(b)) done++;
    hudMoves.textContent = moves;
    hudPushes.textContent = pushes;
    hudBoxes.textContent = `${done}/${boxes.size}`;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const id = y * W + x;
        const c = document.createElement("div");
        c.className = "cell";
        if (walls[y][x]) {
          c.classList.add("wall");
        } else {
          c.classList.add("floor");
          const onGoal = goals.has(id);
          const isBox = boxes.has(id);
          const isPlayer = player.x === x && player.y === y;
          if (onGoal) c.classList.add("goal");
          if (isBox) {
            c.classList.add("box");
            if (onGoal) c.classList.add("box-done");
          }
          if (isPlayer) c.classList.add("player");
        }
        boardEl.appendChild(c);
      }
    }
  }

  // ---- movement ----
  function tryMove(dirKey) {
    if (won) return false;
    const d = DIR[dirKey];
    if (!d) return false;
    const nx = player.x + d.dx, ny = player.y + d.dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return false;
    if (walls[ny][nx]) return false;
    const nid = ny * W + nx;
    if (boxes.has(nid)) {
      const bx = nx + d.dx, by = ny + d.dy;
      if (bx < 0 || by < 0 || bx >= W || by >= H) return false;
      if (walls[by][bx]) return false;
      const bid = by * W + bx;
      if (boxes.has(bid)) return false;
      boxes.delete(nid);
      boxes.add(bid);
      player = { x: nx, y: ny };
      history.push({ pushed: true, from: nid, to: bid });
      moves++; pushes++;
    } else {
      history.push({ pushed: false, from: { x: player.x, y: player.y } });
      player = { x: nx, y: ny };
      moves++;
    }
    render();
    checkWin();
    return true;
  }

  function undo() {
    if (won || history.length === 0) return;
    const h = history.pop();
    if (h.pushed) {
      boxes.delete(h.to);
      boxes.add(h.from);
      pushes--;
      // player steps back: opposite direction of the push
      const bx = h.from % W, by = (h.from - bx) / W;
      const tx = h.to % W, ty = (h.to - tx) / W;
      const ddx = tx - bx, ddy = ty - by; // push direction
      player = { x: bx - ddx, y: by - ddy };
    } else {
      player = h.from;
    }
    moves--;
    render();
  }

  function checkWin() {
    for (const b of boxes) if (!goals.has(b)) return;
    won = true;
    stopSolverPlayback();
    setTimeout(() => banner.classList.remove("hidden"), 150);
  }

  // ---- solver ----
  function ensureSolution() {
    if (solution) return true;
    $("solverInfo").textContent = "正在求解…";
    // run in a microtask so the UI can paint the "求解中" text first
    return new Promise((resolve) => {
      setTimeout(() => {
        const res = Sokoban.solve(level, { maxStates: 800000 });
        if (!res.ok) {
          $("solverInfo").textContent = "⚠ " + res.reason;
          resolve(false);
          return;
        }
        solution = res;
        resolve(true);
      }, 30);
    });
  }

  async function startSolver() {
    if (won) return;
    solverPanel.classList.remove("hidden");
    const ok = await ensureSolution();
    if (!ok) return;
    stepIndex = 0;
    updateSolverInfo();
  }

  function updateSolverInfo() {
    const total = solution ? solution.moves.length : 0;
    $("solverStep").textContent = `${stepIndex} / ${total}`;
    $("solverInfo").textContent =
      `最优解：${solution.pushes.length} 次推动 / ${total} 步`;
  }

  function solverStep(delta) {
    if (!solution) return;
    if (delta > 0 && stepIndex >= solution.moves.length) return;
    if (delta < 0 && stepIndex <= 0) return;
    // advance/revert one elementary move
    if (delta > 0) {
      const ok = tryMove(solution.moves[stepIndex]);
      if (ok) stepIndex++;
    } else {
      undo();
      stepIndex--;
    }
    updateSolverInfo();
  }

  function startSolverPlayback() {
    if (!solution || won) return;
    stopSolverPlayback();
    const speed = +$("solverSpeed").value;
    playTimer = setInterval(() => {
      if (stepIndex >= solution.moves.length || won) {
        stopSolverPlayback();
        return;
      }
      solverStep(1);
    }, speed);
  }

  function stopSolverPlayback() {
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
  }

  // ---- events ----
  document.addEventListener("keydown", (e) => {
    if (e.key in KEY2DIR) {
      e.preventDefault();
      // typing in select is fine; ignore
      if (document.activeElement && document.activeElement.tagName === "SELECT") return;
      stopSolverPlayback();
      tryMove(KEY2DIR[e.key]);
    } else if (e.key === "z" || e.key === "Z") {
      stopSolverPlayback();
      undo();
    } else if (e.key === "r" || e.key === "R") {
      resetState();
    }
  });

  document.querySelectorAll(".dpad .dp").forEach((btn) => {
    btn.addEventListener("click", () => {
      stopSolverPlayback();
      tryMove(btn.dataset.dir);
      boardEl.focus();
    });
  });

  $("resetBtn").addEventListener("click", resetState);
  $("undoBtn").addEventListener("click", () => { stopSolverPlayback(); undo(); });
  $("solveBtn").addEventListener("click", startSolver);
  $("solveNext").addEventListener("click", () => { stopSolverPlayback(); solverStep(1); });
  $("solvePrev").addEventListener("click", () => { stopSolverPlayback(); solverStep(-1); });
  $("solvePlay").addEventListener("click", startSolverPlayback);

  $("prevLevel").addEventListener("click", () => {
    if (levelIndex > 0) loadLevel(levelIndex - 1);
  });
  $("nextLevel").addEventListener("click", nextLevel);
  $("nextOnWin").addEventListener("click", nextLevel);
  levelSelect.addEventListener("change", () => loadLevel(+levelSelect.value));

  function nextLevel() {
    if (levelIndex < LEVELS.length - 1) loadLevel(levelIndex + 1);
  }

  // ---- boot ----
  loadLevel(0);
  boardEl.focus();
})();
