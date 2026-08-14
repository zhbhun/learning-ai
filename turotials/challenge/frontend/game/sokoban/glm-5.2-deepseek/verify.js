// 校验：用求解器返回的 moves 序列在棋盘上回放，确认确实能通关。
const Sokoban = require("./sokoban.js");
const LEVELS = require("./levels.js");

let allOk = true;
LEVELS.forEach((lv, i) => {
  const lvl = Sokoban.parseLevel(lv.text);
  const res = Sokoban.solve(lvl, { maxStates: 300000 });
  if (!res.ok) { console.log(`[${i + 1}] NO SOLUTION: ${res.reason}`); allOk = false; return; }
  // replay
  const DIR = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  const { W, H, walls, goals } = lvl;
  const boxes = new Set(lvl.boxes);
  let player = { x: lvl.player.x, y: lvl.player.y };
  let ok = true, reason = "";
  for (let k = 0; k < res.moves.length; k++) {
    const m = res.moves[k];
    const [dx, dy] = DIR[m];
    const nx = player.x + dx, ny = player.y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) { ok = false; reason = `step${k} ${m}: OOB`; break; }
    if (walls[ny][nx]) { ok = false; reason = `step${k} ${m}: into wall`; break; }
    const nid = ny * W + nx;
    if (boxes.has(nid)) {
      const bx = nx + dx, by = ny + dy;
      const bid = by * W + bx;
      if (bx < 0 || by < 0 || bx >= W || by >= H || walls[by][bx] || boxes.has(bid)) {
        ok = false; reason = `step${k} ${m}: bad push`; break;
      }
      boxes.delete(nid); boxes.add(bid);
    }
    player = { x: nx, y: ny };
  }
  if (ok) {
    for (const b of boxes) if (!goals.has(b)) { ok = false; reason = "未全部到达目标"; break; }
  }
  console.log(`[${i + 1}] ${lv.name} | moves=${res.moves.length} pushes=${res.pushes.length} | ${ok ? "REPLAY-OK ✅" : "REPLAY-FAIL ❌ " + reason}`);
  if (!ok) allOk = false;
});
console.log(allOk ? "\n全部回放通过 ✅" : "\n存在回放失败 ❌");
