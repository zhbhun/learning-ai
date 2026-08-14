/*
 * Sokoban pure logic + BFS solver (UMD: browser global `Sokoban` or Node require).
 *
 * Legend (classic Sokoban):
 *   #  wall
 *   (space) floor
 *   .  goal / target
 *   $  box
 *   *  box on goal
 *   @  player
 *   +  player on goal
 *
 * The solver finds an optimal PUSH sequence via BFS over normalized states, then
 * expands it into elementary player moves (walk + push) for step-by-step replay.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.Sokoban = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // ---- Direction helpers -------------------------------------------------
  const DIRS = [
    { dx: 0, dy: -1, ch: "U", name: "上" },
    { dx: 0, dy: 1, ch: "D", name: "下" },
    { dx: -1, dy: 0, ch: "L", name: "左" },
    { dx: 1, dy: 0, ch: "R", name: "右" },
  ];

  // ---- Level parsing -----------------------------------------------------
  function parseLevel(text) {
    const lines = text.replace(/\r/g, "").replace(/^\n+|\n+$/g, "").split("\n");
    let W = 0;
    for (const l of lines) W = Math.max(W, l.length);
    const H = lines.length;

    const walls = []; // boolean grid
    const goals = new Set(); // y*W+x
    const boxes = new Set();
    let player = null;

    for (let y = 0; y < H; y++) {
      const row = [];
      const line = lines[y];
      for (let x = 0; x < W; x++) {
        const ch = x < line.length ? line[x] : " ";
        let wall = false;
        switch (ch) {
        case "#":
          wall = true;
          break;
        case ".":
          goals.add(y * W + x);
          break;
        case "$":
          boxes.add(y * W + x);
          break;
        case "*":
          boxes.add(y * W + x);
          goals.add(y * W + x);
          break;
        case "@":
          player = { x: x, y: y };
          break;
        case "+":
          player = { x: x, y: y };
          goals.add(y * W + x);
          break;
        default:
          break; // space => floor
        }
        row.push(wall);
      }
      walls.push(row);
    }
    if (!player) throw new Error("关卡缺少玩家 (@/+)");

    return { W: W, H: H, walls: walls, goals: goals, boxes: boxes, player: player };
  }

  // ---- Static reachability (flood fill, blocked by walls + boxes) --------
  function reachable(level, boxes, player, W, H) {
    const walls = level.walls;
    const visited = new Uint8Array(W * H);
    const start = player.y * W + player.x;
    const stack = [start];
    visited[start] = 1;
    while (stack.length) {
      const cur = stack.pop();
      const cx = cur % W;
      const cy = (cur - cx) / W;
      for (let i = 0; i < 4; i++) {
        const d = DIRS[i];
        const nx = cx + d.dx;
        const ny = cy + d.dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (walls[ny][nx]) continue;
        const id = ny * W + nx;
        if (visited[id]) continue;
        if (boxes.has(id)) continue;
        visited[id] = 1;
        stack.push(id);
      }
    }
    return visited;
  }

  function normalizedPlayer(visited, len) {
    for (let i = 0; i < len; i++) if (visited[i]) return i;
    return -1;
  }

  // ---- Push-distance + dead-square map (reverse BFS from goals) ---------
  // For each floor square, dist[id] = minimum number of PUSHES needed to move
  // a box from that square to some goal (boxes are pushed, never pulled).
  // dist<0 means a box there can never reach a goal -> a dead square.
  // This both prunes deadlock pushes and feeds the A* heuristic (sum of dist).
  function computePushDistances(level) {
    const { W, H, walls, goals } = level;
    const isWall = (x, y) =>
      x < 0 || y < 0 || x >= W || y >= H ? true : walls[y][x];
    const dist = new Int32Array(W * H).fill(-1);
    const queue = [];
    let qh = 0;
    for (const g of goals) {
      const gx = g % W;
      const gy = (g - gx) / W;
      if (!isWall(gx, gy) && dist[g] < 0) {
        dist[g] = 0;
        queue.push(g);
      }
    }
    while (qh < queue.length) {
      const c = queue[qh++];
      const cx = c % W;
      const cy = (c - cx) / W;
      for (let i = 0; i < 4; i++) {
        const d = DIRS[i];
        // box at B=C-d can be pushed to C iff B and B-d=C-2d are both floor
        const bx = cx - d.dx, by = cy - d.dy;
        const bx2 = cx - 2 * d.dx, by2 = cy - 2 * d.dy;
        if (isWall(bx, by) || isWall(bx2, by2)) continue;
        const bid = by * W + bx;
        if (dist[bid] >= 0) continue;
        dist[bid] = dist[c] + 1;
        queue.push(bid);
      }
    }
    const dead = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if (dist[i] < 0) dead[i] = 1;
    return { dist: dist, dead: dead };
  }

  // keep old name as a thin shim (returns dead map only) for compatibility
  function buildDeadlocks(level) {
    return computePushDistances(level).dead;
  }

  // ---- Solver: A* over push-states (min pushes, with dist heuristic) ----
  function solve(level, opts) {
    opts = opts || {};
    const maxStates = opts.maxStates || 600000;
    const timeBudget = opts.timeMs || Infinity;
    const t0 = Date.now();
    const { W, H, goals } = level;
    const { dist, dead } = computePushDistances(level);
    const goalCount = goals.size;

    const startBoxes = new Set(level.boxes);
    if (startBoxes.size !== goalCount) {
      return { ok: false, reason: "箱子数与目标数不一致" };
    }

    // admissible heuristic: sum of each box's min pushes to any goal
    const hOf = (boxes) => {
      let s = 0;
      for (const b of boxes) {
        const dv = dist[b];
        if (dv < 0) return Infinity; // contains a dead box -> infeasible here
        s += dv;
      }
      return s;
    };

    // already solved?
    if (hOf(startBoxes) === 0) return { ok: true, pushes: [], moves: [] };

    const startReach = reachable(level, startBoxes, level.player, W, H);
    const startNorm = normalizedPlayer(startReach, W * H);

    const boxesKey = (boxes) => {
      const a = Array.from(boxes).sort((p, q) => p - q);
      return a.join(",");
    };
    const startKey = startNorm + ":" + boxesKey(startBoxes);

    // best-known g per state key
    const gBest = new Map();
    gBest.set(startKey, 0);
    const parent = new Map();
    parent.set(startKey, null);

    // binary min-heap by f
    const heap = [];
    const pushHeap = (node) => {
      heap.push(node);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p].f <= heap[i].f) break;
        const t = heap[p]; heap[p] = heap[i]; heap[i] = t;
        i = p;
      }
    };
    const popHeap = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        const n = heap.length;
        while (true) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < n && heap[l].f < heap[m].f) m = l;
          if (r < n && heap[r].f < heap[m].f) m = r;
          if (m === i) break;
          const t = heap[m]; heap[m] = heap[i]; heap[i] = t;
          i = m;
        }
      }
      return top;
    };

    pushHeap({ f: hOf(startBoxes), g: 0, key: startKey, boxes: startBoxes, norm: startNorm });
    let found = null;
    let expansions = 0;

    while (heap.length) {
      if (++expansions > maxStates) {
        return { ok: false, reason: "状态空间过大，未能求解" };
      }
      if ((expansions & 2047) === 0 && Date.now() - t0 > timeBudget) {
        return { ok: false, reason: "求解超时" };
      }
      const cur = popHeap();
      // stale entry?
      const knownG = gBest.get(cur.key);
      if (knownG === undefined || cur.g > knownG) continue;

      // goal: all boxes on goals (h == 0)
      if (hOf(cur.boxes) === 0) { found = cur.key; break; }

      const reach = reachable(level, cur.boxes, idToPos(cur.norm, W), W, H);

      for (const bId of cur.boxes) {
        const bx = bId % W;
        const by = (bId - bx) / W;
        for (let i = 0; i < 4; i++) {
          const d = DIRS[i];
          const fromId = (by - d.dy) * W + (bx - d.dx); // player stand cell
          const toId = (by + d.dy) * W + (bx + d.dx);   // box destination
          if (!reach[fromId]) continue;
          const tox = bx + d.dx, toy = by + d.dy;
          if (tox < 0 || toy < 0 || tox >= W || toy >= H) continue;
          if (level.walls[toy][tox]) continue;
          if (cur.boxes.has(toId)) continue;
          if (dead[toId]) continue; // onto a dead square

          const newBoxes = new Set(cur.boxes);
          newBoxes.delete(bId);
          newBoxes.add(toId);
          const newNorm = by * W + bx;
          const nk = newNorm + ":" + boxesKey(newBoxes);
          const ng = cur.g + 1;
          const prevG = gBest.get(nk);
          if (prevG !== undefined && prevG <= ng) continue;
          gBest.set(nk, ng);
          parent.set(nk, { prevKey: cur.key, dir: d.ch, boxFrom: bId, boxTo: toId });
          pushHeap({ f: ng + hOf(newBoxes), g: ng, key: nk, boxes: newBoxes, norm: newNorm });
        }
      }
    }

    if (!found) return { ok: false, reason: "未找到解（可能无解或超时）" };

    // reconstruct push sequence
    const pushes = [];
    let k = found;
    while (parent.get(k)) {
      const p = parent.get(k);
      pushes.push(p);
      k = p.prevKey;
    }
    pushes.reverse();

    // expand pushes into elementary moves (walk path + the push move)
    const moves = expandMoves(level, pushes, W, H);

    return { ok: true, pushes: pushes, moves: moves };
  }

  function idToPos(id, W) {
    const x = id % W;
    return { x: x, y: (id - x) / W };
  }

  // BFS shortest path on floor avoiding boxes; returns list of move chars.
  function walkPath(level, boxes, from, to, W, H) {
    if (from.x === to.x && from.y === to.y) return [];
    const walls = level.walls;
    const prev = new Int32Array(W * H).fill(-1);
    const prevDir = new Int8Array(W * H).fill(-1);
    const startId = from.y * W + from.x;
    const goalId = to.y * W + to.x;
    const visited = new Uint8Array(W * H);
    visited[startId] = 1;
    const q = [startId];
    let h = 0;
    while (h < q.length) {
      const cur = q[h++];
      if (cur === goalId) break;
      const cx = cur % W;
      const cy = (cur - cx) / W;
      for (let i = 0; i < 4; i++) {
        const d = DIRS[i];
        const nx = cx + d.dx;
        const ny = cy + d.dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (walls[ny][nx]) continue;
        const id = ny * W + nx;
        if (visited[id]) continue;
        if (id !== goalId && boxes.has(id)) continue; // can't walk through boxes
        visited[id] = 1;
        prev[id] = cur;
        prevDir[id] = i;
        q.push(id);
      }
    }
    if (!visited[goalId]) return null;
    const path = [];
    let c = goalId;
    while (c !== startId) {
      path.push(DIRS[prevDir[c]].ch);
      c = prev[c];
    }
    path.reverse();
    return path;
  }

  function expandMoves(level, pushes, W, H) {
    const boxes = new Set(level.boxes);
    let player = { x: level.player.x, y: level.player.y };
    const moves = [];
    for (const p of pushes) {
      const dirIndex = DIRS.findIndex((d) => d.ch === p.dir);
      const d = DIRS[dirIndex];
      const fromPos = idToPos(p.boxFrom, W);
      const toPos = idToPos(p.boxTo, W);
      // player must reach the cell opposite the push direction
      const standPos = { x: fromPos.x - d.dx, y: fromPos.y - d.dy };
      const walk = walkPath(level, boxes, player, standPos, W, H);
      if (!walk) {
        // should not happen for a valid solution
        return null;
      }
      for (const m of walk) moves.push(m);
      moves.push(d.ch); // the push itself
      // update state
      boxes.delete(p.boxFrom);
      boxes.add(p.boxTo);
      player = { x: fromPos.x, y: fromPos.y };
    }
    return moves;
  }

  return {
    DIRS: DIRS,
    parseLevel: parseLevel,
    solve: solve,
    reachable: reachable,
    computePushDistances: computePushDistances,
    buildDeadlocks: buildDeadlocks,
  };
});
