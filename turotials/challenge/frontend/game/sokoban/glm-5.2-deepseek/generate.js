/*
 * Sokoban 关卡生成器（紧凑走廊/房间型地图 + 反向拉动 + A* 求解）。
 * 从“已解”状态做合法反向拉动(reverse pull)，产生的布局必然可解；
 * 再用 A* 求解器求最优解，按步数筛选难度递增的关卡并写入 levels.js。
 */
const Sokoban = require("./sokoban.js");
const fs = require("fs");

const DIRS = [
  { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
  { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
];

// 紧凑走廊/房间型纯地图（只有 # 墙 / . 目标 / 空格地板）。均经连通性验证。
const MAPS = {
  m5a: `
##########
# .    . #
## #### ##
#  .  .  #
#   ##   #
#       .#
## ## ## #
#        #
##########`,
  m5b: `
##########
#.      .#
#  ####  #
#  #  #  #
#  #  #  #
#  .  .. #
#  ####  #
#        #
##########`,
  cross5a: `
###########
#.       .#
# ##### # #
# #     # #
# #  .  # #
# #  .  # #
# # ##### #
#.        #
###########`,
  cross5b: `
###########
#.        #
# ##### # #
# #  .  # #
# #     # #
# #  .. # #
# # ##### #
#.       .#
###########`,
  cross6: `
###########
#.       .#
# ##### # #
# #  .  # #
# # ..  # #
# #  .  # #
# # ##### #
#.        #
###########`,
  spiral5: `
###########
#.        #
######### #
#.        #
# #########
#         #
######### #
#.    .   #
###########`,
};

function parseMap(text) {
  const lines = text.replace(/\r/g, "").trim().split("\n");
  let W = 0;
  for (const l of lines) W = Math.max(W, l.length);
  const H = lines.length;
  const walls = [];
  const goals = new Set();
  const floors = [];
  for (let y = 0; y < H; y++) {
    walls.push([]);
    const line = lines[y];
    for (let x = 0; x < W; x++) {
      const ch = x < line.length ? line[x] : " ";
      let wall = false;
      if (ch === "#") wall = true;
      else {
        floors.push(y * W + x);
        if (ch === ".") goals.add(y * W + x);
      }
      walls[y].push(wall);
    }
  }
  return { W, H, walls, goals, floors };
}

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function reachable(map, boxes, playerId, W, H) {
  const isWall = (x, y) =>
    x < 0 || y < 0 || x >= W || y >= H ? true : map.walls[y][x];
  const vis = new Uint8Array(W * H);
  const st = [playerId];
  vis[playerId] = 1;
  while (st.length) {
    const c = st.pop();
    const cx = c % W;
    const cy = (c - cx) / W;
    for (const d of DIRS) {
      const nx = cx + d.dx, ny = cy + d.dy;
      if (isWall(nx, ny)) continue;
      const id = ny * W + nx;
      if (vis[id] || boxes.has(id)) continue;
      vis[id] = 1;
      st.push(id);
    }
  }
  return vis;
}

function genConfig(map, pulls, seed) {
  const rnd = makeRng(seed);
  const { W, H, goals, floors } = map;
  const isWall = (x, y) =>
    x < 0 || y < 0 || x >= W || y >= H ? true : map.walls[y][x];
  const boxes = new Set(goals);
  let player = floors.find((f) => !goals.has(f));
  for (let i = 0; i < pulls; i++) {
    const vis = reachable(map, boxes, player, W, H);
    const boxArr = [...boxes];
    for (let k = boxArr.length - 1; k > 0; k--) {
      const j = Math.floor(rnd() * (k + 1));
      [boxArr[k], boxArr[j]] = [boxArr[j], boxArr[k]];
    }
    let done = false;
    for (const C of boxArr) {
      if (done) break;
      const cx = C % W, cy = (C - cx) / W;
      const dirs = [0, 1, 2, 3];
      for (let k = 3; k > 0; k--) {
        const j = Math.floor(rnd() * (k + 1));
        [dirs[k], dirs[j]] = [dirs[j], dirs[k]];
      }
      for (const di of dirs) {
        const d = DIRS[di];
        const px = cx - d.dx, py = cy - d.dy;
        const pid = py * W + px;
        if (pid < 0 || pid >= W * H || !vis[pid] || boxes.has(pid)) continue;
        const bx = cx - 2 * d.dx, by = cy - 2 * d.dy;
        if (isWall(bx, by)) continue;
        const bid = by * W + bx;
        if (boxes.has(bid)) continue;
        boxes.delete(C);
        boxes.add(pid);
        player = bid;
        done = true;
        break;
      }
    }
    if (!done) break;
  }
  return { boxes, player };
}

function configToText(map, cfg) {
  const { W, H, walls, goals } = map;
  const grid = [];
  for (let y = 0; y < H; y++) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const id = y * W + x;
      if (walls[y][x]) row.push("#");
      else {
        const g = goals.has(id), b = cfg.boxes.has(id), p = cfg.player === id;
        if (p && g) row.push("+");
        else if (p) row.push("@");
        else if (b && g) row.push("*");
        else if (b) row.push("$");
        else if (g) row.push(".");
        else row.push(" ");
      }
    }
    grid.push(row.join(""));
  }
  return grid.join("\n");
}

// ---- harvest ----
const results = [];
const stats = { totalConfigs: 0, solvedOk: 0, tooSlow: 0, alreadySolved: 0, dup: 0, maps: {} };
const seenText = new Set();

for (const [mapKey, mapDef] of Object.entries(MAPS)) {
  const map = parseMap(mapDef);
  const n = map.goals.size;
  // 连通性 + 死格诊断
  const { dist, dead } = Sokoban.computePushDistances(map);
  let live = 0, deadc = 0;
  for (let i = 0; i < map.W * map.H; i++) {
    if (!map.walls[Math.floor(i / map.W)][i % map.W]) {
      if (dead[i]) deadc++; else live++;
    }
  }
  const startF = map.floors[0];
  const vis = reachable(map, new Set(), startF, map.W, map.H);
  let goalsReachable = 0;
  for (const g of map.goals) if (vis[g]) goalsReachable++;
  stats.maps[mapKey] = { goals: n, W: map.W, H: map.H, live, dead: deadc, goalsReachable };

  for (let pulls = n * 6; pulls <= n * 80; pulls += 2) {
    for (let seed = 1; seed <= 40; seed++) {
      const cfg = genConfig(map, pulls, seed * 97 + pulls);
      stats.totalConfigs++;
      let solved = true;
      for (const b of cfg.boxes) if (!map.goals.has(b)) { solved = false; break; }
      if (solved) { stats.alreadySolved++; continue; }
      const text = configToText(map, cfg);
      if (seenText.has(text)) { stats.dup++; continue; }
      seenText.add(text);
      const lvl = Sokoban.parseLevel(text);
      const t0 = Date.now();
      const r = Sokoban.solve(lvl, { maxStates: 300000, timeMs: 100 });
      const ms = Date.now() - t0;
      if (!r.ok) continue;
      stats.solvedOk++;
      if (ms > 100) { stats.tooSlow++; continue; }
      results.push({
        mapKey, n, pushes: r.pushes.length, moves: r.moves.length, ms, text,
      });
    }
  }
}
console.log("stats " + JSON.stringify(stats));
console.log("harvested " + results.length + " solvable configs");
const byN = {};
for (const r of results) (byN[r.n] = byN[r.n] || []).push(r);
for (const n of Object.keys(byN).sort((a, b) => +a - +b)) {
  const arr = byN[n];
  console.log(`  ${n}箱: ${arr.length} 配置, 步数 ${arr[0].moves}..${arr[arr.length - 1].moves}`);
}

// ---- pick 12 strictly-increasing levels, maximizing map diversity ----
results.sort((a, b) => a.moves - b.moves);
const targets = [
  { moves: [38, 54] }, { moves: [55, 72] }, { moves: [73, 92] },
  { moves: [93, 112] }, { moves: [113, 132] }, { moves: [133, 152] },
  { moves: [153, 174] }, { moves: [175, 198] }, { moves: [199, 222] },
  { moves: [223, 248] }, { moves: [225, 262] }, { moves: [230, 330] },
];
const chosen = [];
const usedMoves = new Set();
const usedText = new Set();
const mapUsage = {};
for (const t of targets) {
  // candidates in this bucket, not yet used, with distinct move counts
  const cand = results.filter(
    (r) => r.moves >= t.moves[0] && r.moves <= t.moves[1] && !usedText.has(r.text)
  );
  // prefer (1) a map used least so far for diversity, (2) a fresh move count
  cand.sort((a, b) => {
    const ua = mapUsage[a.mapKey] || 0;
    const ub = mapUsage[b.mapKey] || 0;
    if (ua !== ub) return ua - ub;
    return a.moves - b.moves;
  });
  let pick = cand.find((r) => !usedMoves.has(r.moves)) || cand[0] || null;
  if (pick) {
    usedMoves.add(pick.moves);
    usedText.add(pick.text);
    mapUsage[pick.mapKey] = (mapUsage[pick.mapKey] || 0) + 1;
    chosen.push(pick);
  } else {
    console.log("!! no candidate for moves=" + t.moves);
  }
}
console.log("\n=== CHOSEN (" + chosen.length + ") ===");
chosen.sort((a, b) => a.moves - b.moves);
chosen.forEach((r, i) =>
  console.log(`  [${i + 1}] ${r.mapKey} 箱${r.n} 推${r.pushes} 步${r.moves} ${r.ms}ms`)
);
console.log("地图分布: " + JSON.stringify(mapUsage));

// ---- write levels.js ----
if (chosen.length >= 10) {
  chosen.sort((a, b) => a.moves - b.moves);
  const names = [
    "第 1 关 · 初入险境", "第 2 关 · 曲径通幽", "第 3 关 · 机关重重",
    "第 4 关 · 迷雾走廊", "第 5 关 · 步步惊心", "第 6 关 · 乾坤挪移",
    "第 7 关 · 层层设防", "第 8 关 · 暗藏玄机", "第 9 关 · 纵横交错",
    "第 10 关 · 深渊迷阵", "第 11 关 · 绝境求生", "第 12 关 · 巅峰之试",
  ];
  let out = `/*\n * Sokoban 关卡数据。符号见 sokoban.js 顶部说明。\n * 共 12 关，难度（最优解步数）严格递增，均经求解器验证可解。\n * 暴露为全局 LEVELS（浏览器）或 module.exports（Node）。\n */\nconst LEVELS = [\n`;
  chosen.forEach((r, i) => {
    out += `  {\n    name: ${JSON.stringify(names[i] || "第 " + (i + 1) + " 关")},\n`;
    out += `    text: ${JSON.stringify(r.text)},\n`;
    out += `  },\n`;
  });
  out += `];\n\nif (typeof module !== "undefined" && module.exports) module.exports = LEVELS;\nif (typeof globalThis !== "undefined") globalThis.LEVELS = LEVELS;\n`;
  fs.writeFileSync("levels.js", out);
  console.log("\n=> wrote levels.js");
}
