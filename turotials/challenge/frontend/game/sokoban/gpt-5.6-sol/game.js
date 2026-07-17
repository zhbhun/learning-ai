"use strict";

const LEVELS = [
  {
    name: "三箱调度",
    difficulty: "困难",
    code: "HARD · 10 PUSHES",
    map: [
      "########",
      "#     .#",
      "#  $@$ #",
      "#   $  #",
      "# .  # #",
      "#      #",
      "# .    #",
      "########",
    ],
    solution: "ULDDUURRRDDLULURDLDDDRDLLURUL",
  },
  {
    name: "折返走廊",
    difficulty: "困难+",
    code: "HARD · 11 PUSHES",
    map: [
      "#########",
      "# .   $ #",
      "#       #",
      "#  @$   #",
      "#  #$  .#",
      "#       #",
      "#    .  #",
      "#########",
    ],
    solution: "URRRRULDLLLDRDDLDRUUUURDLDRRUUULLL",
  },
  {
    name: "错位装卸",
    difficulty: "艰难",
    code: "EXPERT · 12 PUSHES",
    map: [
      "#########",
      "#       #",
      "#     $ #",
      "#.    $ #",
      "#    .  #",
      "#  $# #.#",
      "#  @$ . #",
      "#       #",
      "#########",
    ],
    solution: "UURULLUURRRRRDLULDLDDLDDRRUULUURDRURDD",
  },
  {
    name: "狭口四联",
    difficulty: "艰难+",
    code: "EXPERT · 15 PUSHES",
    map: [
      "##########",
      "#        #",
      "#.   .   #",
      "#      $ #",
      "# .    $ #",
      "# #$  .  #",
      "#  @ $#  #",
      "#        #",
      "##########",
    ],
    solution: "URRRRRUULULLDDRURULLLLLDRRDDRRRUURULLDDDLLDDRULURULL",
  },
  {
    name: "盲角回旋",
    difficulty: "专家",
    code: "MASTER · 16 PUSHES",
    map: [
      "##########",
      "#  .  .  #",
      "#        #",
      "# $#     #",
      "#.   $   #",
      "# #      #",
      "#     .  #",
      "#  # $@$ #",
      "#        #",
      "##########",
    ],
    solution: "UULUUDLLLUDRDDRDDRULUUUURULURDDDDRDDDRURULDLLUURULLLLUULUR",
  },
  {
    name: "五箱夜班",
    difficulty: "专家+",
    code: "MASTER · 18 PUSHES",
    map: [
      "###########",
      "#.   .    #",
      "#     . $$#",
      "#     $   #",
      "# $$    # #",
      "#  @  .   #",
      "#    # #  #",
      "#        .#",
      "#         #",
      "###########",
    ],
    solution: "RUUUURRRRRDDLLDLUUDLLLDURRRRRRDDLLLLLDLLURUUURRRRULDDDLLLDRRURRDRRDULLULLDLLLUUURULDDRRRRRRRULL",
  },
  {
    name: "岔路禁区",
    difficulty: "大师",
    code: "MASTER+ · 20 PUSHES",
    map: [
      "###########",
      "#         #",
      "#  #      #",
      "#.      $ #",
      "#         #",
      "#    #$@  #",
      "#      $  #",
      "#  $  . . #",
      "#   $#  # #",
      "#.      . #",
      "###########",
    ],
    solution: "DUUUURDLDDDLDLLDUUUURRDRDDUUUURDDLLDRDDLDLLLURUURRURRDLDDLDRLLLLLURUUUURULL",
  },
  {
    name: "六箱矩阵",
    difficulty: "大师+",
    code: "NIGHTMARE · 32 PUSHES",
    map: [
      "############",
      "#          #",
      "# $      $ #",
      "#.  #.     #",
      "#      $ # #",
      "#     . .  #",
      "#   #  . $ #",
      "#     # .  #",
      "# $  $     #",
      "# @        #",
      "############",
    ],
    solution: "ULURLUUUUURDDDDDDRRULRRURRUULLLLDDDDLULUURUUURURRRRDDLDDRDDDLLULLUUUUURLDDDDDLURULDLURRRRRRRRRUUULDLLLLDLLLDLURRRRRUULDDLLDDDDRRUURUURURRULRRDDDDLULLLLDDDRLUURUUUUURDRDLDLLDDDDRRUUUUUULDRRDLULLUULLDRURRRDDDDDDDDRULUUUUULUULDRRRRRDDDLDLRRUUULLLLDLDDDL",
  },
  {
    name: "逆序仓单",
    difficulty: "噩梦",
    code: "NIGHTMARE+ · 40 PUSHES",
    map: [
      "############",
      "#   .      #",
      "#     .    #",
      "#      $$ .#",
      "#    . @$  #",
      "#       $  #",
      "#      $ $ #",
      "# .   #.   #",
      "#  ###     #",
      "#       #  #",
      "#          #",
      "############",
    ],
    solution: "ULUURRRDDDLRULRRDDDDLLULRDRRUULLDLLRRULRUUUULLLLDDDDDRUURUUURRDDDLRRRDDLULUULDDDRLLRRURDLUUUUULLLLDDDDDRUURLUURURRDDDDLLLDLURRUUDDRURRDDDLLULLULURRRRRRDDDDLLULULLULDRDLRURUUURRLLUDRRULULRRDDRLLLLULDLDDRDDLRRURRUUUUULLDLLDDRDRRRRRDDDDDLLUUR",
  },
  {
    name: "终局封仓",
    difficulty: "极限",
    code: "ULTIMATE · 60 PUSHES",
    map: [
      "#############",
      "#          .#",
      "# $#   $  # #",
      "#  .    $   #",
      "# $ #       #",
      "#    .   #@ #",
      "#. #      $ #",
      "#      . .  #",
      "#       # $ #",
      "#  $    .   #",
      "#           #",
      "#############",
    ],
    solution: "DUULUULLRDRDLULUULDRDDLDRDRRRRDLULLLLLLDDDLRRRRUURURDLLUUUUULDLLLLLDDDDDDRLUUUUURURRRRRRDDLLLLLLDDDDRURRRRUURLUUULDLDRLDDDDLRRRUURRRULDLLLLUUUULUULLDURRRRDDDDDRRLLLLDDDDLULUUUUUUDDDDDDRURRRUUUURDRDRLULDRDLDLLLLLURDRRRULULDRRRRRRURDDDLUDLLLLLUULDRRRURRDULLLLUUUULLDLDDDRDDRUUUULRRRRRDRRRDLUUULLLLLDLLLRRRRRDDDDRRURUUUULURLLLDDDDLDDDLULURURRRRLLLLDRURRRURRUUUDDDDDDLULULLLLLLLUUULDRRRRRRRDRRRDLDDDLLLUULLUUUUULUULLDURRRDDDDDDRURRRRRUUUUDLLLLDDLRRDRRDDDLDLLLLLLLUUUUULUURDDDDD",
  },
];

const DIRS = {
  U: { dr: -1, dc: 0, label: "向上", arrow: "↑" },
  D: { dr: 1, dc: 0, label: "向下", arrow: "↓" },
  L: { dr: 0, dc: -1, label: "向左", arrow: "←" },
  R: { dr: 0, dc: 1, label: "向右", arrow: "→" },
};

const KEY_DIRECTIONS = {
  ArrowUp: "U",
  w: "U",
  W: "U",
  ArrowDown: "D",
  s: "D",
  S: "D",
  ArrowLeft: "L",
  a: "L",
  A: "L",
  ArrowRight: "R",
  d: "R",
  D: "R",
};

const els = {
  board: document.querySelector("#board"),
  gameTitle: document.querySelector("#gameTitle"),
  levelEyebrow: document.querySelector("#levelEyebrow"),
  difficultyBadge: document.querySelector("#difficultyBadge"),
  moveCount: document.querySelector("#moveCount"),
  pushCount: document.querySelector("#pushCount"),
  timeCount: document.querySelector("#timeCount"),
  goalCount: document.querySelector("#goalCount"),
  goalProgress: document.querySelector("#goalProgress"),
  levelList: document.querySelector("#levelList"),
  clearCount: document.querySelector("#clearCount"),
  campaignProgress: document.querySelector("#campaignProgress"),
  undoButton: document.querySelector("#undoButton"),
  restartButton: document.querySelector("#restartButton"),
  answerButton: document.querySelector("#answerButton"),
  answerPanel: document.querySelector("#answerPanel"),
  answerStepButton: document.querySelector("#answerStepButton"),
  answerCloseButton: document.querySelector("#answerCloseButton"),
  answerDirection: document.querySelector("#answerDirection"),
  answerArrow: document.querySelector("#answerArrow"),
  answerProgressText: document.querySelector("#answerProgressText"),
  answerProgress: document.querySelector("#answerProgress"),
  completeCard: document.querySelector("#completeCard"),
  completeTitle: document.querySelector("#completeTitle"),
  completeStats: document.querySelector("#completeStats"),
  replayButton: document.querySelector("#replayButton"),
  nextLevelButton: document.querySelector("#nextLevelButton"),
  soundButton: document.querySelector("#soundButton"),
  toast: document.querySelector("#toast"),
};

const storageKey = "sokoban-night-shift-v1";
let saved = readSavedData();
let levelIndex = Math.min(Number(saved.lastLevel) || 0, LEVELS.length - 1);
let state;
let history = [];
let elapsed = 0;
let timerStarted = false;
let solved = false;
let assisted = false;
let facing = "D";
let answerOpen = false;
let answerIndex = 0;
let toastTimer;
let audioContext;
let soundEnabled = saved.soundEnabled !== false;

function key(r, c) {
  return `${r},${c}`;
}

function readSavedData() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || { cleared: {}, best: {} };
  } catch {
    return { cleared: {}, best: {} };
  }
}

function writeSavedData() {
  localStorage.setItem(storageKey, JSON.stringify(saved));
}

function parseLevel(level) {
  const walls = new Set();
  const goals = new Set();
  const boxes = new Set();
  let player = { r: 0, c: 0 };

  level.map.forEach((row, r) => {
    [...row].forEach((char, c) => {
      const position = key(r, c);
      if (char === "#") walls.add(position);
      if (".+*".includes(char)) goals.add(position);
      if ("$*".includes(char)) boxes.add(position);
      if ("@+".includes(char)) player = { r, c };
    });
  });

  return {
    walls,
    goals,
    boxes,
    player,
    rows: level.map.length,
    cols: Math.max(...level.map.map((row) => row.length)),
    moves: 0,
    pushes: 0,
  };
}

function loadLevel(index, message = "") {
  levelIndex = (index + LEVELS.length) % LEVELS.length;
  state = parseLevel(LEVELS[levelIndex]);
  history = [];
  elapsed = 0;
  timerStarted = false;
  solved = false;
  assisted = false;
  facing = "D";
  closeAnswer();
  hideCompleteCard();
  saved.lastLevel = levelIndex;
  writeSavedData();
  renderAll();
  if (message) showToast(message);
}

function renderAll() {
  const level = LEVELS[levelIndex];
  els.gameTitle.textContent = level.name;
  els.levelEyebrow.textContent = `第 ${String(levelIndex + 1).padStart(2, "0")} 号仓库`;
  els.difficultyBadge.lastChild.textContent = level.difficulty;
  document.title = `${level.name} · 仓库番`;
  renderBoard();
  renderStats();
  renderLevelList();
  renderAnswer();
}

function renderBoard() {
  const fragment = document.createDocumentFragment();
  els.board.innerHTML = "";
  els.board.style.setProperty("--cols", state.cols);
  els.board.style.setProperty("--rows", state.rows);
  els.board.style.setProperty("--board-max", `${Math.min(650, state.cols * 56)}px`);
  els.board.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
  els.board.setAttribute("aria-rowcount", state.rows);
  els.board.setAttribute("aria-colcount", state.cols);

  for (let r = 0; r < state.rows; r += 1) {
    for (let c = 0; c < state.cols; c += 1) {
      const position = key(r, c);
      const cell = document.createElement("div");
      const isWall = state.walls.has(position);
      const isGoal = state.goals.has(position);
      const isBox = state.boxes.has(position);
      const isPlayer = state.player.r === r && state.player.c === c;

      cell.className = `cell ${isWall ? "wall" : "floor"} ${(r + c) % 2 ? "alt" : ""}`;
      cell.setAttribute("role", "gridcell");
      if (isGoal) cell.classList.add("goal");
      if (isBox) {
        cell.classList.add("box");
        const crate = document.createElement("div");
        crate.className = "crate";
        cell.append(crate);
      }
      if (isGoal && isBox) cell.classList.add("box-on-goal");
      if (isPlayer) {
        const keeper = document.createElement("div");
        keeper.className = `keeper face-${facing}`;
        cell.append(keeper);
      }
      fragment.append(cell);
    }
  }
  els.board.append(fragment);
}

function renderStats() {
  const goalsFilled = [...state.goals].filter((goal) => state.boxes.has(goal)).length;
  const totalGoals = state.goals.size;
  els.moveCount.textContent = String(state.moves).padStart(3, "0");
  els.pushCount.textContent = String(state.pushes).padStart(3, "0");
  els.timeCount.textContent = formatTime(elapsed);
  els.goalCount.textContent = `${goalsFilled} / ${totalGoals}`;
  els.goalProgress.style.width = `${(goalsFilled / totalGoals) * 100}%`;
  els.undoButton.disabled = history.length === 0 || solved;
}

function renderLevelList() {
  els.levelList.innerHTML = "";
  const clearedCount = Object.keys(saved.cleared || {}).filter((index) => saved.cleared[index]).length;
  els.clearCount.textContent = `${clearedCount} / ${LEVELS.length}`;
  els.campaignProgress.style.width = `${(clearedCount / LEVELS.length) * 100}%`;

  LEVELS.forEach((level, index) => {
    const button = document.createElement("button");
    const cleared = Boolean(saved.cleared?.[index]);
    button.type = "button";
    button.className = `level-item${index === levelIndex ? " active" : ""}${cleared ? " cleared" : ""}`;
    button.dataset.level = String(index);
    button.setAttribute("aria-label", `进入第 ${index + 1} 关：${level.name}`);
    button.innerHTML = `
      <span class="level-number">${cleared ? "✓" : String(index + 1).padStart(2, "0")}</span>
      <span class="level-name"><strong>${level.name}</strong><small>${level.code}</small></span>
      <span class="level-status">${index === levelIndex ? "▶" : cleared ? "✓" : "·"}</span>
    `;
    els.levelList.append(button);
  });
}

function renderAnswer() {
  els.answerPanel.classList.toggle("open", answerOpen);
  els.answerPanel.setAttribute("aria-hidden", String(!answerOpen));
  if (!answerOpen) return;

  const solution = LEVELS[levelIndex].solution;
  const next = solution[answerIndex];
  const progress = solution.length ? (answerIndex / solution.length) * 100 : 100;
  els.answerProgress.style.width = `${progress}%`;
  els.answerStepButton.disabled = !next || solved;

  if (next) {
    els.answerDirection.textContent = `下一步：${DIRS[next].label}`;
    els.answerArrow.textContent = DIRS[next].arrow;
    els.answerProgressText.textContent = `步骤 ${answerIndex + 1} / ${solution.length} · 每次只走一格`;
  } else {
    els.answerDirection.textContent = "答案演示完成";
    els.answerArrow.textContent = "✓";
    els.answerProgressText.textContent = `共执行 ${solution.length} 步`;
  }
}

function snapshot() {
  return {
    boxes: new Set(state.boxes),
    player: { ...state.player },
    moves: state.moves,
    pushes: state.pushes,
    facing,
  };
}

function move(direction, source = "manual") {
  if (solved || !DIRS[direction]) return false;
  if (source === "manual" && answerOpen) closeAnswer();

  const { dr, dc } = DIRS[direction];
  facing = direction;
  const next = { r: state.player.r + dr, c: state.player.c + dc };
  const nextKey = key(next.r, next.c);
  if (state.walls.has(nextKey)) {
    bump();
    tone("blocked");
    renderBoard();
    return false;
  }

  let pushed = false;
  if (state.boxes.has(nextKey)) {
    const beyond = { r: next.r + dr, c: next.c + dc };
    const beyondKey = key(beyond.r, beyond.c);
    if (state.walls.has(beyondKey) || state.boxes.has(beyondKey)) {
      bump();
      tone("blocked");
      renderBoard();
      return false;
    }
    history.push(snapshot());
    state.boxes.delete(nextKey);
    state.boxes.add(beyondKey);
    state.pushes += 1;
    pushed = true;
  } else {
    history.push(snapshot());
  }

  state.player = next;
  state.moves += 1;
  timerStarted = true;
  if (source === "answer") assisted = true;
  tone(pushed ? "push" : "step");
  renderBoard();
  renderStats();

  if (isSolved()) finishLevel();
  return true;
}

function undo() {
  if (!history.length || solved) return;
  if (answerOpen) closeAnswer();
  const previous = history.pop();
  state.boxes = previous.boxes;
  state.player = previous.player;
  state.moves = previous.moves;
  state.pushes = previous.pushes;
  facing = previous.facing;
  tone("undo");
  renderBoard();
  renderStats();
}

function restart() {
  loadLevel(levelIndex, "本关已重新装载");
}

function openAnswer() {
  if (solved) return;
  if (state.moves > 0) {
    state = parseLevel(LEVELS[levelIndex]);
    history = [];
    elapsed = 0;
    timerStarted = false;
    facing = "D";
    renderBoard();
    renderStats();
    showToast("已回到本关起点，答案将从第一步开始");
  }
  answerOpen = true;
  answerIndex = 0;
  assisted = true;
  renderAnswer();
}

function closeAnswer() {
  answerOpen = false;
  answerIndex = 0;
  renderAnswer();
}

function stepAnswer() {
  if (!answerOpen || solved) return;
  const direction = LEVELS[levelIndex].solution[answerIndex];
  if (!direction) return;
  if (move(direction, "answer")) {
    answerIndex += 1;
    renderAnswer();
  } else {
    showToast("答案路径被打断，请关闭答案后重开本关");
  }
}

function isSolved() {
  return [...state.goals].every((goal) => state.boxes.has(goal));
}

function finishLevel() {
  solved = true;
  timerStarted = false;
  saved.cleared ||= {};
  saved.best ||= {};
  saved.cleared[levelIndex] = true;

  const previousBest = saved.best[levelIndex];
  if (!assisted && (!previousBest || state.moves < previousBest.moves)) {
    saved.best[levelIndex] = { moves: state.moves, pushes: state.pushes, time: elapsed };
  }
  writeSavedData();
  renderStats();
  renderLevelList();
  tone("complete");

  window.setTimeout(() => {
    els.completeTitle.textContent = assisted ? "路线已经掌握" : "漂亮的调度！";
    els.completeStats.textContent = `${String(state.moves).padStart(3, "0")} MOVES · ${String(state.pushes).padStart(3, "0")} PUSHES · ${formatTime(elapsed)}`;
    els.nextLevelButton.textContent = levelIndex === LEVELS.length - 1 ? "回到第一关" : "下一仓库";
    els.completeCard.classList.add("show");
    els.completeCard.setAttribute("aria-hidden", "false");
  }, 280);
}

function hideCompleteCard() {
  els.completeCard.classList.remove("show");
  els.completeCard.setAttribute("aria-hidden", "true");
}

function bump() {
  els.board.classList.remove("bump");
  void els.board.offsetWidth;
  els.board.classList.add("bump");
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function tone(type) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    const notes = {
      step: [180, 0.025, 0.018],
      push: [95, 0.08, 0.045],
      blocked: [62, 0.05, 0.025],
      undo: [150, 0.06, 0.025],
    };

    if (type === "complete") {
      [261, 329, 392, 523].forEach((frequency, index) => {
        playOscillator(frequency, now + index * 0.1, 0.16, 0.04);
      });
      return;
    }
    const [frequency, duration, gain] = notes[type] || notes.step;
    playOscillator(frequency, now, duration, gain);
  } catch {
    soundEnabled = false;
  }
}

function playOscillator(frequency, start, duration, volume) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  saved.soundEnabled = soundEnabled;
  writeSavedData();
  els.soundButton.classList.toggle("muted", !soundEnabled);
  els.soundButton.setAttribute("aria-label", soundEnabled ? "关闭音效" : "开启音效");
  if (soundEnabled) tone("undo");
}

function bindEvents() {
  document.addEventListener("keydown", (event) => {
    if (KEY_DIRECTIONS[event.key]) {
      event.preventDefault();
      move(KEY_DIRECTIONS[event.key]);
      return;
    }
    if (event.key === "z" || event.key === "Z") undo();
    if (event.key === "r" || event.key === "R") restart();
    if ((event.key === "Enter" || event.key === " ") && answerOpen) {
      event.preventDefault();
      stepAnswer();
    }
  });

  els.undoButton.addEventListener("click", undo);
  els.restartButton.addEventListener("click", restart);
  els.answerButton.addEventListener("click", openAnswer);
  els.answerStepButton.addEventListener("click", stepAnswer);
  els.answerCloseButton.addEventListener("click", closeAnswer);
  els.replayButton.addEventListener("click", restart);
  els.nextLevelButton.addEventListener("click", () => loadLevel(levelIndex + 1));
  els.soundButton.addEventListener("click", toggleSound);

  els.levelList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-level]");
    if (button) loadLevel(Number(button.dataset.level));
  });

  document.querySelectorAll(".mobile-controls [data-dir]").forEach((button) => {
    button.addEventListener("click", () => move(button.dataset.dir));
  });

  let touchStart = null;
  els.board.addEventListener("pointerdown", (event) => {
    touchStart = { x: event.clientX, y: event.clientY };
  });
  els.board.addEventListener("pointerup", (event) => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : dy > 0 ? "D" : "U");
  });
}

window.setInterval(() => {
  if (timerStarted && !solved) {
    elapsed += 1;
    els.timeCount.textContent = formatTime(elapsed);
  }
}, 1000);

saved.cleared ||= {};
saved.best ||= {};
els.soundButton.classList.toggle("muted", !soundEnabled);
els.soundButton.setAttribute("aria-label", soundEnabled ? "关闭音效" : "开启音效");
bindEvents();
loadLevel(levelIndex);
