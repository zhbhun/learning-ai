// 关卡验证：检查每关可解性、箱子数、解的步数与推动次数。
const Sokoban = require("./sokoban.js");
const LEVELS = require("./levels.js");

let allOk = true;
LEVELS.forEach((lv, i) => {
  const lvl = Sokoban.parseLevel(lv.text);
  const nBoxes = lvl.boxes.size;
  const nGoals = lvl.goals.size;
  const t0 = Date.now();
  const res = Sokoban.solve(lvl, { maxStates: 300000 });
  const ms = Date.now() - t0;
  const status = res.ok ? "OK" : "FAIL";
  if (!res.ok) allOk = false;
  console.log(
    `[${i + 1}] ${lv.name} | 箱${nBoxes}/目${nGoals} | ${status} | ` +
      (res.ok
        ? `推${res.pushes.length} 步${res.moves.length} | ${ms}ms`
        : `${res.reason} | ${ms}ms`)
  );
});
console.log(allOk ? "\n全部可解 ✅" : "\n存在不可解关卡 ❌");
