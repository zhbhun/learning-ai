// Sokoban 关卡求解器（开发工具）
// 用法: node tools/solver.mjs          -> 求解所有候选关卡并打印结果
//       node tools/solver.mjs write    -> 按 SELECTED 顺序生成 ../levels.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CANDIDATES = [
  {
    id: 'c1', title: '第一步',
    map: `
#####
#@$.#
#####`,
  },
  {
    id: 'c2', title: '绕过去',
    map: `
######
#    #
# @$ #
#  . #
#    #
######`,
  },
  {
    id: 'c3', title: '双胞胎',
    map: `
#######
#     #
# $.$ #
# .@  #
#     #
#######`,
  },
  {
    id: 'c4', title: '转个弯',
    map: `
########
#      #
# ##$@ #
# ##   #
# .    #
#      #
########`,
  },
  {
    id: 'c5', title: '左右开弓',
    map: `
#######
# .   #
# $$  #
#  @ .#
#######`,
  },
  {
    id: 'c6', title: '三个货位',
    map: `
#########
#       #
# $ $ $ #
# #.#.#.#
#   @   #
#########`,
  },
  {
    id: 'c7', title: '门厅',
    map: `
########
#      #
# $  . #
###@####
# $  . #
#      #
########`,
  },
  {
    id: 'c8', title: '四室',
    map: `
########
#   ####
# $$   #
# ..@  #
# $$   #
# ..####
########`,
  },
  {
    id: 'c9', title: '中央仓库',
    map: `
#########
#       #
# $ $ $ #
#       #
## . . ##
#  .@   #
#########`,
  },
  {
    id: 'c10', title: '仓库大厅',
    map: `
##########
#        #
# ###### #
# #    # #
# # $$ # #
# # $  . #
# #@$ .  #
# ####.  #
#    .   #
##########`,
  },
  {
    id: 'c11', title: '竖井',
    map: `
######
#    #
# .$ #
# .$ #
# .$ #
# @  #
######`,
  },
  {
    id: 'c12', title: '十字路口',
    map: `
#########
#   #   #
# .$ $. #
#  # #  #
# .$@$. #
#  # #  #
#   #   #
#########`,
  },
  {
    id: 'c13', title: '小屋',
    map: `
####
# .#
#  ###
#*@  #
#  $ #
#  ###
####`,
  },
  {
    id: 'c14', title: '经典第一关',
    map: `
    #####
    #   #
    #$  #
  ###  $##
  #  $ $ #
### # ## #   ######
#   # ## #####  ..#
# $  $          ..#
##### ### #@##  ..#
    #     #########
    #######`,
  },
  {
    id: 'c15', title: '夹击',
    map: `
########
#  #   #
#  $ . #
# @$ . #
#  #   #
########`,
  },
];

// 最终选关顺序（先跑一遍报告再填）
const SELECTED = ['c1', 'c2', 'c3', 'c11', 'c15', 'c5', 'c12', 'c7', 'c6', 'c13', 'c10', 'c14'];

const DIRS = [
  [1, 0, 'R'],
  [-1, 0, 'L'],
  [0, 1, 'D'],
  [0, -1, 'U'],
];

function parseMap(mapStr) {
  const rows = mapStr.replace(/^\n/, '').replace(/\n$/, '').split('\n');
  const H = rows.length;
  const W = Math.max(...rows.map((r) => r.length));
  const walls = new Set();
  const goals = new Set();
  const boxes = [];
  let player = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = rows[y][x] ?? ' ';
      const i = y * W + x;
      if (c === '#') walls.add(i);
      else {
        if (c === '.' || c === '*' || c === '+') goals.add(i);
        if (c === '$' || c === '*') boxes.push(i);
        if (c === '@' || c === '+') player = i;
      }
    }
  }
  return { W, H, walls, goals, boxes, player };
}

// 死角：非目标点上，上/下有墙 且 左/右有墙 的格子（箱子推进去就再也出不来）
function deadSquares(g) {
  const dead = new Set();
  for (let y = 0; y < g.H; y++) {
    for (let x = 0; x < g.W; x++) {
      const i = y * g.W + x;
      if (g.walls.has(i) || g.goals.has(i)) continue;
      const up = y === 0 || g.walls.has(i - g.W);
      const dn = y === g.H - 1 || g.walls.has(i + g.W);
      const lf = x === 0 || g.walls.has(i - 1);
      const rt = x === g.W - 1 || g.walls.has(i + 1);
      if ((up || dn) && (lf || rt)) dead.add(i);
    }
  }
  return dead;
}

// 从 player 出发可达区域（避开墙和箱子），返回 parent 数组（-1 不可达）
function reachable(g, boxes, player) {
  const boxSet = boxes instanceof Set ? boxes : new Set(boxes);
  const seen = new Int32Array(g.W * g.H).fill(-1);
  seen[player] = player;
  const q = [player];
  let head = 0;
  while (head < q.length) {
    const cur = q[head++];
    const cx = cur % g.W;
    const cy = (cur / g.W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= g.W || ny >= g.H) continue;
      const ni = ny * g.W + nx;
      if (g.walls.has(ni) || boxSet.has(ni) || seen[ni] !== -1) continue;
      seen[ni] = cur;
      q.push(ni);
    }
  }
  return seen;
}

function pathTo(seen, from, to, W) {
  const moves = [];
  let cur = to;
  while (cur !== from) {
    const p = seen[cur];
    const d = cur - p;
    moves.push(d === 1 ? 'R' : d === -1 ? 'L' : d === W ? 'D' : 'U');
    cur = p;
  }
  return moves.reverse().join('');
}

function canonicalPlayer(seen) {
  for (let i = 0; i < seen.length; i++) if (seen[i] !== -1) return i;
  return -1;
}

function solve(cand, cap = 2_000_000) {
  const g = parseMap(cand.map);
  if (g.player < 0) return { error: 'no player' };
  if (g.boxes.length !== g.goals.size)
    return { error: `boxes(${g.boxes.length}) != goals(${g.goals.size})` };
  const dead = deadSquares(g);
  const startBoxes = [...g.boxes].sort((a, b) => a - b);
  const start = { boxes: startBoxes, player: g.player, moves: '', pushes: 0 };
  const startKey =
    startBoxes.join(',') + '|' + canonicalPlayer(reachable(g, startBoxes, g.player));
  const visited = new Set([startKey]);
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    if (visited.size > cap) return { error: `state cap (${cap}) exceeded`, states: visited.size };
    const st = queue[head++];
    const boxSet = new Set(st.boxes);
    const seen = reachable(g, boxSet, st.player);
    for (let bi = 0; bi < st.boxes.length; bi++) {
      const b = st.boxes[bi];
      const bx = b % g.W;
      const by = (b / g.W) | 0;
      for (const [dx, dy, ch] of DIRS) {
        const px = bx - dx;
        const py = by - dy;
        const tx = bx + dx;
        const ty = by + dy;
        if (px < 0 || py < 0 || px >= g.W || py >= g.H) continue;
        if (tx < 0 || ty < 0 || tx >= g.W || ty >= g.H) continue;
        const pf = py * g.W + px;
        const pt = ty * g.W + tx;
        if (seen[pf] === -1) continue;
        if (g.walls.has(pt) || boxSet.has(pt)) continue;
        if (dead.has(pt)) continue;
        const walk = pf === st.player ? '' : pathTo(seen, st.player, pf, g.W);
        const nb = [...st.boxes];
        nb[bi] = pt;
        nb.sort((a, b2) => a - b2);
        const nmoves = st.moves + walk + ch;
        if (nb.every((x) => g.goals.has(x)))
          return { moves: nmoves, pushes: st.pushes + 1, states: visited.size };
        const nseen = reachable(g, nb, b);
        const key = nb.join(',') + '|' + canonicalPlayer(nseen);
        if (visited.has(key)) continue;
        visited.add(key);
        queue.push({ boxes: nb, player: b, moves: nmoves, pushes: st.pushes + 1 });
      }
    }
  }
  return { error: 'unsolvable', states: visited.size };
}

// 回放验证：逐步执行 moves，必须每步合法且最终全部箱子在目标点上
function replay(mapStr, moves) {
  const g = parseMap(mapStr);
  const boxSet = new Set(g.boxes);
  let player = g.player;
  for (const m of moves) {
    const [dx, dy] = m === 'R' ? [1, 0] : m === 'L' ? [-1, 0] : m === 'D' ? [0, 1] : [0, -1];
    const px = player % g.W;
    const py = (player / g.W) | 0;
    const t = (py + dy) * g.W + (px + dx);
    if (g.walls.has(t)) return { ok: false, why: `walk into wall at move ${m}` };
    if (boxSet.has(t)) {
      const b = (py + 2 * dy) * g.W + (px + 2 * dx);
      if (g.walls.has(b) || boxSet.has(b)) return { ok: false, why: `push blocked at move ${m}` };
      boxSet.delete(t);
      boxSet.add(b);
    }
    player = t;
  }
  const done = [...boxSet].every((x) => g.goals.has(x));
  return { ok: done, why: done ? '' : 'not all goals covered' };
}

const results = [];
for (const cand of CANDIDATES) {
  const t0 = Date.now();
  const r = solve(cand);
  const ms = Date.now() - t0;
  if (r.error) {
    console.log(`${cand.id} [${cand.title}]  FAILED: ${r.error} (${ms}ms)`);
    results.push({ ...cand, error: r.error });
  } else {
    const check = replay(cand.map, r.moves);
    console.log(
      `${cand.id} [${cand.title}]  boxes=${parseMap(cand.map).boxes.length} pushes=${r.pushes} moves=${r.moves.length} states=${r.states} replay=${check.ok ? 'OK' : 'FAIL:' + check.why} (${ms}ms)`
    );
    results.push({ ...cand, ...r, replayOk: check.ok });
  }
}

if (process.argv[2] === 'write') {
  if (SELECTED.length === 0) {
    console.log('\nSELECTED 为空，未生成 levels.js');
    process.exit(0);
  }
  const byId = new Map(results.map((r) => [r.id, r]));
  const levels = [];
  for (const id of SELECTED) {
    const r = byId.get(id);
    if (!r || r.error || !r.replayOk) {
      console.error(`选中关卡 ${id} 不可用，中止`);
      process.exit(1);
    }
    levels.push({
      name: r.title,
      map: r.map.replace(/^\n/, '').replace(/\n$/, '').split('\n'),
      solution: r.moves,
    });
  }
  const out =
    `// 关卡数据（由 tools/solver.mjs 求解生成并回放验证）\n` +
    `// solution 为最优解之一：U/D/L/R 表示玩家每一步的移动方向\n` +
    `const LEVELS = ${JSON.stringify(levels, null, 2)};\n`;
  fs.writeFileSync(path.join(__dirname, '..', 'levels.js'), out);
  console.log(`\n已生成 levels.js，共 ${levels.length} 关`);
}
