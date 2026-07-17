/*
 * Deterministic Sokoban level generator and validator.
 *
 * Levels are made by starting in a solved state and making legal reverse pulls.
 * Every emitted board is then independently solved with a push-based A* search.
 */

const DIRS = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

class Random {
  constructor(seed) {
    this.seed = seed >>> 0;
  }

  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(max) {
    return Math.floor(this.next() * max);
  }

  pick(items) {
    return items[this.int(items.length)];
  }

  shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const other = this.int(index + 1);
      [items[index], items[other]] = [items[other], items[index]];
    }
    return items;
  }
}

const keyOf = (row, column) => `${row},${column}`;
const parseKey = (key) => key.split(",").map(Number);

function isConnected(floors) {
  const first = floors.values().next().value;
  if (!first) return false;
  const seen = new Set([first]);
  const queue = [first];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const [row, column] = parseKey(queue[cursor]);
    for (const [dr, dc] of DIRS) {
      const next = keyOf(row + dr, column + dc);
      if (floors.has(next) && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen.size === floors.size;
}

function makeBoard(random, width, height, density) {
  const floors = new Set();
  for (let row = 1; row < height - 1; row += 1) {
    for (let column = 1; column < width - 1; column += 1) {
      floors.add(keyOf(row, column));
    }
  }

  const cells = random.shuffle([...floors]);
  const removeCount = Math.floor(cells.length * density);
  let removed = 0;
  for (const cell of cells) {
    if (removed >= removeCount) break;
    floors.delete(cell);
    if (isConnected(floors)) {
      removed += 1;
    } else {
      floors.add(cell);
    }
  }
  return { width, height, floors };
}

function reachable(board, player, boxes, withParents = false) {
  const seen = new Set([player]);
  const queue = [player];
  const parents = withParents ? new Map() : null;
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const [row, column] = parseKey(current);
    for (let direction = 0; direction < DIRS.length; direction += 1) {
      const [dr, dc] = DIRS[direction];
      const next = keyOf(row + dr, column + dc);
      if (!board.floors.has(next) || boxes.has(next) || seen.has(next)) continue;
      seen.add(next);
      if (parents) parents.set(next, [current, direction]);
      queue.push(next);
    }
  }
  return { seen, parents };
}

function enumeratePulls(board, state) {
  const area = reachable(board, state.player, state.boxes).seen;
  const pulls = [];
  for (const box of state.boxes) {
    const [boxRow, boxColumn] = parseKey(box);
    for (let direction = 0; direction < DIRS.length; direction += 1) {
      const [dr, dc] = DIRS[direction];
      const playerCell = keyOf(boxRow - dr, boxColumn - dc);
      const playerDestination = keyOf(boxRow - 2 * dr, boxColumn - 2 * dc);
      if (
        area.has(playerCell) &&
        board.floors.has(playerDestination) &&
        !state.boxes.has(playerDestination)
      ) {
        pulls.push({ box, playerCell, playerDestination });
      }
    }
  }
  return pulls;
}

function reverseScramble(board, goals, player, random, targetPulls) {
  let state = { boxes: new Set(goals), player };
  const seen = new Set();
  let pullsMade = 0;

  while (pullsMade < targetPulls) {
    const options = random.shuffle(enumeratePulls(board, state));
    let selected = null;
    for (const option of options) {
      const nextBoxes = new Set(state.boxes);
      nextBoxes.delete(option.box);
      nextBoxes.add(option.playerCell);
      const signature = [...nextBoxes].sort().join("|");
      if (!seen.has(signature)) {
        selected = { option, nextBoxes, signature };
        break;
      }
    }
    if (!selected) break;
    seen.add(selected.signature);
    state = {
      boxes: selected.nextBoxes,
      player: selected.option.playerDestination,
    };
    pullsMade += 1;
  }
  return { ...state, pullsMade };
}

function isCornerDeadlock(board, cell, goals) {
  if (goals.has(cell)) return false;
  const [row, column] = parseKey(cell);
  const wall = (dr, dc) => !board.floors.has(keyOf(row + dr, column + dc));
  return (
    (wall(-1, 0) && wall(0, -1)) ||
    (wall(-1, 0) && wall(0, 1)) ||
    (wall(1, 0) && wall(0, -1)) ||
    (wall(1, 0) && wall(0, 1))
  );
}

function assignmentHeuristic(boxes, goals) {
  const boxList = [...boxes].map(parseKey);
  const goalList = [...goals].map(parseKey);
  const memo = new Map();

  function visit(index, usedMask) {
    if (index === boxList.length) return 0;
    const key = `${index}:${usedMask}`;
    if (memo.has(key)) return memo.get(key);
    let best = Infinity;
    for (let goalIndex = 0; goalIndex < goalList.length; goalIndex += 1) {
      if (usedMask & (1 << goalIndex)) continue;
      const distance =
        Math.abs(boxList[index][0] - goalList[goalIndex][0]) +
        Math.abs(boxList[index][1] - goalList[goalIndex][1]);
      best = Math.min(best, distance + visit(index + 1, usedMask | (1 << goalIndex)));
    }
    memo.set(key, best);
    return best;
  }
  return visit(0, 0);
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].priority <= item.priority) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }

  pop() {
    if (!this.items.length) return null;
    const root = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.items.length) break;
        const child = right < this.items.length && this.items[right].priority < this.items[left].priority
          ? right
          : left;
        if (this.items[child].priority >= last.priority) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = last;
    }
    return root;
  }
}

function playerRegionKey(board, player, boxes) {
  const area = reachable(board, player, boxes).seen;
  return [...area].sort()[0];
}

function stateKey(board, player, boxes) {
  return `${[...boxes].sort().join("|")}@${playerRegionKey(board, player, boxes)}`;
}

function reconstructMoves(parents, target) {
  const path = [];
  let current = target;
  while (parents.has(current)) {
    const [previous, direction] = parents.get(current);
    path.push(direction);
    current = previous;
  }
  return path.reverse();
}

function solve(board, initial, goals, limit = 500000) {
  const open = new MinHeap();
  const startKey = stateKey(board, initial.player, initial.boxes);
  open.push({
    priority: assignmentHeuristic(initial.boxes, goals),
    pushes: 0,
    moves: 0,
    player: initial.player,
    boxes: initial.boxes,
    solution: [],
  });
  const best = new Map([[startKey, 0]]);
  let expanded = 0;

  while (open.items.length && expanded < limit) {
    const node = open.pop();
    expanded += 1;
    if ([...node.boxes].every((box) => goals.has(box))) {
      return {
        solved: true,
        pushes: node.pushes,
        moves: node.moves,
        expanded,
        solution: node.solution,
      };
    }

    const { seen: area, parents } = reachable(board, node.player, node.boxes, true);
    for (const box of node.boxes) {
      const [boxRow, boxColumn] = parseKey(box);
      for (let direction = 0; direction < DIRS.length; direction += 1) {
        const [dr, dc] = DIRS[direction];
        const stand = keyOf(boxRow - dr, boxColumn - dc);
        const destination = keyOf(boxRow + dr, boxColumn + dc);
        if (
          !area.has(stand) ||
          !board.floors.has(destination) ||
          node.boxes.has(destination) ||
          isCornerDeadlock(board, destination, goals)
        ) continue;

        const boxes = new Set(node.boxes);
        boxes.delete(box);
        boxes.add(destination);
        const pushes = node.pushes + 1;
        const player = box;
        const key = stateKey(board, player, boxes);
        if ((best.get(key) ?? Infinity) <= pushes) continue;
        best.set(key, pushes);
        const walking = reconstructMoves(parents, stand);
        const solution = node.solution.concat(walking, direction);
        open.push({
          priority: pushes + assignmentHeuristic(boxes, goals),
          pushes,
          moves: node.moves + walking.length + 1,
          player,
          boxes,
          solution,
        });
      }
    }
  }
  return { solved: false, expanded };
}

function chooseGoals(board, random, count) {
  const candidates = [...board.floors].filter((cell) => {
    const [row, column] = parseKey(cell);
    let walls = 0;
    for (const [dr, dc] of DIRS) {
      if (!board.floors.has(keyOf(row + dr, column + dc))) walls += 1;
    }
    return walls <= 1;
  });
  return new Set(random.shuffle(candidates).slice(0, count));
}

function encode(board, state, goals) {
  const rows = [];
  for (let row = 0; row < board.height; row += 1) {
    let line = "";
    for (let column = 0; column < board.width; column += 1) {
      const cell = keyOf(row, column);
      if (!board.floors.has(cell)) line += "#";
      else if (state.player === cell && goals.has(cell)) line += "+";
      else if (state.player === cell) line += "@";
      else if (state.boxes.has(cell) && goals.has(cell)) line += "*";
      else if (state.boxes.has(cell)) line += "$";
      else if (goals.has(cell)) line += ".";
      else line += " ";
    }
    rows.push(line.replace(/ +$/, ""));
  }
  return rows;
}

function makeCandidate(seed, index) {
  const random = new Random(seed);
  const boxCount = 3 + Math.floor(index / 170);
  const width = 9 + Math.floor(index / 240) + random.int(3);
  const height = 8 + Math.floor(index / 280) + random.int(3);
  const density = 0.045 + random.next() * 0.075;
  const board = makeBoard(random, width, height, density);
  const goals = chooseGoals(board, random, Math.min(boxCount, 6));
  if (goals.size !== boxCount) return null;
  const availablePlayers = [...board.floors].filter((cell) => !goals.has(cell));
  const solvedPlayer = random.pick(availablePlayers);
  const targetPulls = 16 + Math.floor(index / 16) + random.int(24);
  const state = reverseScramble(board, goals, solvedPlayer, random, targetPulls);
  if (state.pullsMade < targetPulls * 0.72) return null;
  if ([...state.boxes].filter((box) => goals.has(box)).length > Math.floor(boxCount / 2)) return null;
  const result = solve(board, state, goals);
  if (!result.solved || result.pushes < 11) return null;
  const score = result.pushes * 12 + Math.log2(result.expanded + 1) * 18 + boxCount * 25;
  return {
    seed,
    board: encode(board, state, goals),
    boxes: boxCount,
    width,
    height,
    score: Math.round(score),
    optimalPushes: result.pushes,
    optimalMoves: result.moves,
    expanded: result.expanded,
    solution: result.solution.map((direction) => "URDL"[direction]).join(""),
  };
}

const candidates = [];
const baseSeed = 0x19820218;
for (let index = 0; index < 900; index += 1) {
  const candidate = makeCandidate(baseSeed + index * 7919, index);
  if (candidate) candidates.push(candidate);
  if ((index + 1) % 50 === 0) {
    process.stderr.write(`\rGenerated ${index + 1}/900; accepted ${candidates.length}`);
  }
}
process.stderr.write("\n");

candidates.sort((a, b) => a.score - b.score);
const selected = [];
const usedSeeds = new Set();
const startIndex = Math.max(0, Math.floor(candidates.length * 0.34));
const pool = candidates.slice(startIndex);
for (let level = 0; level < 20; level += 1) {
  const targetIndex = Math.floor((level / 19) * (pool.length - 1));
  let choice = pool[targetIndex];
  let offset = 0;
  while (choice && usedSeeds.has(choice.seed)) {
    offset += 1;
    choice = pool[Math.min(pool.length - 1, targetIndex + offset)];
  }
  if (!choice) break;
  usedSeeds.add(choice.seed);
  selected.push(choice);
}

console.log(JSON.stringify(selected, null, 2));
