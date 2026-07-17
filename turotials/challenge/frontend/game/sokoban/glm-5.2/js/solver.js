/*
 * Sokoban solver: push-based BFS with simple-deadlock (dead-square) pruning.
 * Works in browser (global SokobanSolver) and Node (module.exports).
 */
(function (global) {
  'use strict';

  const DIRS = [
    { dr: -1, dc: 0, ch: 'U' },
    { dr: 1, dc: 0, ch: 'D' },
    { dr: 0, dc: -1, ch: 'L' },
    { dr: 0, dc: 1, ch: 'R' }
  ];

  function parseLevel(map) {
    const h = map.length;
    let w = 0;
    for (const row of map) w = Math.max(w, row.length);
    const grid = [];
    let player = -1;
    const boxes = [];
    const goals = [];
    for (let r = 0; r < h; r++) {
      const raw = (map[r] + '').padEnd(w, '#');
      let line = '';
      for (let c = 0; c < w; c++) {
        const ch = raw[c] || '#';
        const idx = r * w + c;
        switch (ch) {
          case '#': line += '#'; break;
          case ' ': line += ' '; break;
          case '.': line += '.'; goals.push(idx); break;
          case '$': line += ' '; boxes.push(idx); break;
          case '*': line += '.'; boxes.push(idx); goals.push(idx); break;
          case '@': line += ' '; player = idx; break;
          case '+': line += '.'; player = idx; goals.push(idx); break;
          default: line += ' '; break;
        }
      }
      grid.push(line);
    }
    return { grid, w, h, player, boxes, goals };
  }

  function isWall(parsed, i) {
    const r = (i / parsed.w) | 0, c = i % parsed.w;
    if (r < 0 || r >= parsed.h || c < 0 || c >= parsed.w) return true;
    return parsed.grid[r][c] === '#';
  }

  // Squares from which a box can never reach any goal (reverse pull-BFS from goals).
  function computeDeadSquares(parsed) {
    const { w, h, goals } = parsed;
    const alive = new Set(goals);
    const q = goals.slice();
    while (q.length) {
      const i = q.shift();
      const r = (i / w) | 0, c = i % w;
      for (const d of DIRS) {
        const br = r - d.dr, bc = c - d.dc;        // previous box cell
        const pr = r - 2 * d.dr, pc = c - 2 * d.dc; // player cell needed for the push
        if (br < 0 || br >= h || bc < 0 || bc >= w) continue;
        if (pr < 0 || pr >= h || pc < 0 || pc >= w) continue;
        if (parsed.grid[br][bc] === '#') continue;
        if (parsed.grid[pr][pc] === '#') continue;
        const bi = br * w + bc;
        if (!alive.has(bi)) { alive.add(bi); q.push(bi); }
      }
    }
    const dead = new Set();
    for (let r = 0; r < h; r++)
      for (let c = 0; c < w; c++)
        if (parsed.grid[r][c] !== '#') {
          const i = r * w + c;
          if (!alive.has(i)) dead.add(i);
        }
    return dead;
  }

  // Flood fill: cells reachable by the player without moving any box.
  function flood(player, boxesSet, parsed) {
    const { w, h, grid } = parsed;
    const seen = new Set([player]);
    const stack = [player];
    while (stack.length) {
      const i = stack.pop();
      const r = (i / w) | 0, c = i % w;
      for (const d of DIRS) {
        const nr = r + d.dr, nc = c + d.dc;
        if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue;
        if (grid[nr][nc] === '#') continue;
        const ni = nr * w + nc;
        if (boxesSet.has(ni) || seen.has(ni)) continue;
        seen.add(ni);
        stack.push(ni);
      }
    }
    return seen;
  }

  // Shortest walking path (move letters) from start to target avoiding boxes.
  function pathTo(start, target, boxesSet, parsed) {
    if (start === target) return '';
    const { w, h, grid } = parsed;
    const prev = new Map(); // ni -> { from, ch }
    prev.set(start, null);
    const q = [start];
    let head = 0;
    while (head < q.length) {
      const i = q[head++];
      if (i === target) break;
      const r = (i / w) | 0, c = i % w;
      for (const d of DIRS) {
        const nr = r + d.dr, nc = c + d.dc;
        if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue;
        if (grid[nr][nc] === '#') continue;
        const ni = nr * w + nc;
        if (boxesSet.has(ni) || prev.has(ni)) continue;
        prev.set(ni, { from: i, ch: d.ch });
        q.push(ni);
      }
    }
    if (!prev.has(target)) return null;
    const moves = [];
    let cur = target;
    while (prev.get(cur) !== null) {
      const node = prev.get(cur);
      moves.push(node.ch);
      cur = node.from;
    }
    return moves.reverse().join('');
  }

  // Cheap but effective: a 2x2 block of walls/boxes that contains a non-goal box is frozen.
  function is2x2Deadlock(box, boxSet, parsed, goalSet) {
    const { w, h, grid } = parsed;
    const r = (box / w) | 0, c = box % w;
    const blocked = (i) => {
      const rr = (i / w) | 0, cc = i % w;
      if (rr < 0 || rr >= h || cc < 0 || cc >= w) return true;
      if (grid[rr][cc] === '#') return true;
      return boxSet.has(i);
    };
    const origins = [[0, 0], [-1, 0], [0, -1], [-1, -1]];
    for (let o = 0; o < origins.length; o++) {
      const R = r + origins[o][0], C = c + origins[o][1];
      const cells = [R * w + C, R * w + (C + 1), (R + 1) * w + C, (R + 1) * w + (C + 1)];
      let allBlocked = true, anyBoxNotGoal = false;
      for (let k = 0; k < cells.length; k++) {
        const i = cells[k];
        if (!blocked(i)) { allBlocked = false; break; }
        if (boxSet.has(i) && !goalSet.has(i)) anyBoxNotGoal = true;
      }
      if (allBlocked && anyBoxNotGoal) return true;
    }
    return false;
  }

  // Recursive frozen-box deadlock detection (standard algorithm).
  function isFrozenDeadlock(box, boxSet, parsed, goalSet, dead) {
    if (goalSet.has(box)) return false; // a frozen box already on a goal is acceptable here
    const guard = new Set();
    return blockedAxis(box, boxSet, parsed, goalSet, dead, guard, true) &&
           blockedAxis(box, boxSet, parsed, goalSet, dead, guard, false);
  }

  function blockedAxis(box, boxSet, parsed, goalSet, dead, guard, horizontal) {
    if (guard.has(box)) return true; // break cycles pessimistically
    guard.add(box);
    const { w, h, grid } = parsed;
    const r = (box / w) | 0, c = box % w;
    const a = horizontal ? { dr: 0, dc: -1 } : { dr: -1, dc: 0 };
    const b = horizontal ? { dr: 0, dc: 1 } : { dr: 1, dc: 0 };
    const ia = (r + a.dr) * w + (c + a.dc);
    const ib = (r + b.dr) * w + (c + b.dc);
    const isBlockedCell = (i) => {
      const rr = (i / w) | 0, cc = i % w;
      if (rr < 0 || rr >= h || cc < 0 || cc >= w) return true;
      if (grid[rr][cc] === '#') return true;
      return false;
    };
    let res = false;
    if (isBlockedCell(ia) || isBlockedCell(ib)) res = true;
    else if (dead.has(ia) && dead.has(ib)) res = true;
    else {
      let blk = false;
      if (boxSet.has(ia) && blockedAxis(ia, boxSet, parsed, goalSet, dead, guard, !horizontal)) blk = true;
      if (!blk && boxSet.has(ib) && blockedAxis(ib, boxSet, parsed, goalSet, dead, guard, !horizontal)) blk = true;
      res = blk;
    }
    guard.delete(box);
    return res;
  }

  function keyOf(player, boxes) {
    return player + '|' + boxes.join(',');
  }

  // Admissible heuristic: for each floor cell, the min grid-distance (4-neighbour,
  // ignoring boxes) to any goal. Lower bound on pushes for a box sitting there.
  function precomputeHeuristic(parsed, goalSet) {
    const { w, h, grid } = parsed;
    const dist = new Array(w * h).fill(Infinity);
    const q = [];
    for (const g of goalSet) { dist[g] = 0; q.push(g); }
    let head = 0;
    while (head < q.length) {
      const i = q[head++];
      const r = (i / w) | 0, c = i % w;
      for (const d of DIRS) {
        const nr = r + d.dr, nc = c + d.dc, ni = nr * w + nc;
        if (nr < 0 || nr >= h || nc < 0 || nc >= w) continue;
        if (grid[nr][nc] === '#') continue;
        if (dist[ni] <= dist[i] + 1) continue;
        dist[ni] = dist[i] + 1;
        q.push(ni);
      }
    }
    return dist;
  }

  // Binary min-heap keyed by priority f.
  function makeHeap() {
    const keys = [], pris = [];
    function swim(i) {
      const k = keys[i], p = pris[i];
      while (i > 0) {
        const j = (i - 1) >> 1;
        if (pris[j] <= p) break;
        keys[i] = keys[j]; pris[i] = pris[j]; i = j;
      }
      keys[i] = k; pris[i] = p;
    }
    function sink(i) {
      const n = keys.length, k = keys[i], p = pris[i];
      while (true) {
        let l = 2 * i + 1, r = l + 1, s = i;
        if (l < n && pris[l] < pris[s]) s = l;
        if (r < n && pris[r] < pris[s]) s = r;
        if (s === i) break;
        keys[i] = keys[s]; pris[i] = pris[s]; i = s;
      }
      keys[i] = k; pris[i] = p;
    }
    return {
      size() { return keys.length; },
      push(key, pri) { keys.push(key); pris.push(pri); swim(keys.length - 1); },
      pop() { const k = keys[0]; const last = keys.length - 1;
        keys[0] = keys[last]; pris[0] = pris[last]; keys.pop(); pris.pop();
        if (keys.length > 1) sink(0); return k; }
    };
  }

  // Returns array of move letters ('U'/'D'/'L'/'R') or null. A* over macro-pushes
  // (cost = number of pushes). Walks are recomputed during reconstruction so the
  // final move sequence is always valid and uses shortest walks between pushes.
  function solve(map, options) {
    const opts = options || {};
    const LIMIT = opts.limit || 2000000;
    const TIME_LIMIT = opts.timeLimit || 0; // ms, 0 = no wall-clock cap
    const tStart = TIME_LIMIT ? Date.now() : 0;
    const parsed = parseLevel(map);
    if (parsed.player < 0 || parsed.boxes.length !== parsed.goals.length) return null;

    const { w, h, player, boxes, goals } = parsed;
    const goalSet = new Set(goals);
    const dead = computeDeadSquares(parsed);
    for (const b of boxes) if (dead.has(b) && !goalSet.has(b)) return null;

    const hcell = precomputeHeuristic(parsed, goalSet);
    const heuristic = (bx) => {
      let s = 0;
      for (const b of bx) s += hcell[b];
      return s;
    };

    const startBoxes = boxes.slice().sort((a, b) => a - b);
    const startReach = flood(player, new Set(startBoxes), parsed);
    const startNorm = Math.min(...startReach);
    const startKey = keyOf(startNorm, startBoxes);

    if (startBoxes.every((i) => goalSet.has(i))) return [];

    // parent edges: key -> { prev, fromCell, boxOld, boxNew }
    const parent = new Map();
    const stateBoxes = new Map(); // key -> sorted box array (for expansion)
    const statePlayer = new Map(); // key -> any cell in the reachable region
    const bestG = new Map();       // key -> push depth
    const closed = new Set();
    parent.set(startKey, null);
    stateBoxes.set(startKey, startBoxes);
    statePlayer.set(startKey, player);
    bestG.set(startKey, 0);

    const heap = makeHeap();
    heap.push(startKey, heuristic(startBoxes));
    let expanded = 0;

    while (heap.size()) {
      if (expanded > LIMIT) return null;
      if (TIME_LIMIT && (expanded & 0x1ff) === 0 && Date.now() - tStart > TIME_LIMIT) return null;
      const key = heap.pop();
      if (closed.has(key)) continue;
      closed.add(key);
      expanded++;
      const g = bestG.get(key);
      const curBoxes = stateBoxes.get(key);
      const curPlayer = statePlayer.get(key);
      const boxSet = new Set(curBoxes);
      const reach = flood(curPlayer, boxSet, parsed);

      for (let bi = 0; bi < curBoxes.length; bi++) {
        const box = curBoxes[bi];
        const br = (box / w) | 0, bc = box % w;
        for (let o = 0; o < DIRS.length; o++) {
          const d = DIRS[o];
          const toR = br + d.dr, toC = bc + d.dc, to = toR * w + toC;
          if (isWall(parsed, to) || boxSet.has(to)) continue;
          if (dead.has(to) && !goalSet.has(to)) continue;
          const fromR = br - d.dr, fromC = bc - d.dc, from = fromR * w + fromC;
          if (isWall(parsed, from) || boxSet.has(from)) continue;
          if (!reach.has(from)) continue;

          const newBoxes = curBoxes.slice();
          newBoxes[bi] = to;
          newBoxes.sort((a, b) => a - b);
          const newBoxSet = new Set(newBoxes);
          if (is2x2Deadlock(to, newBoxSet, parsed, goalSet)) continue;
          if (isFrozenDeadlock(to, newBoxSet, parsed, goalSet, dead)) continue;

          const newReach = flood(box, newBoxSet, parsed); // player ends where the box was
          const newNorm = Math.min(...newReach);
          const nKey = keyOf(newNorm, newBoxes);
          if (closed.has(nKey)) continue;
          const nd = g + 1;
          if (bestG.has(nKey) && bestG.get(nKey) <= nd) continue;
          bestG.set(nKey, nd);
          parent.set(nKey, { prev: key, fromCell: from, boxOld: box, boxNew: to });
          stateBoxes.set(nKey, newBoxes);
          statePlayer.set(nKey, box);

          if (newBoxes.every((i) => goalSet.has(i)))
            return reconstruct(parent, nKey, player, startBoxes, parsed);
          heap.push(nKey, nd + heuristic(newBoxes));
        }
      }
    }
    return null;
  }

  function dirChar(dr, dc) {
    if (dr === -1) return 'U';
    if (dr === 1) return 'D';
    if (dc === -1) return 'L';
    return 'R';
  }

  function reconstruct(parent, goalKey, startPlayer, startBoxes, parsed) {
    const chain = [];
    let k = goalKey;
    while (parent.get(k)) { chain.push(parent.get(k)); k = parent.get(k).prev; }
    chain.reverse();

    const { w } = parsed;
    const boxes = new Set(startBoxes);
    let player = startPlayer;
    const moves = [];
    for (const edge of chain) {
      const walk = pathTo(player, edge.fromCell, boxes, parsed);
      for (let i = 0; walk && i < walk.length; i++) moves.push(walk[i]);
      const dr = ((edge.boxNew / w) | 0) - ((edge.boxOld / w) | 0);
      const dc = (edge.boxNew % w) - (edge.boxOld % w);
      moves.push(dirChar(dr, dc));
      boxes.delete(edge.boxOld);
      boxes.add(edge.boxNew);
      player = edge.boxOld;
    }
    return moves;
  }

  const API = { solve, parseLevel, computeDeadSquares };
  global.SokobanSolver = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
