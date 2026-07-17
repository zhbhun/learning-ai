import { T } from './constants.js';

// 超格映射: 每个超格展开为 2x2 单元
const SC = {
  '.': T.EMPTY, '#': T.BRICK, 'o': T.STEEL,
  '~': T.WATER, 't': T.TREE, 'i': T.ICE,
};

// 每关用 13x13 超格字符串表示(每个字符=2x2单元), 底部基地堡垒由代码叠加
// fortress: 'brick' 普通砖 / 'steel' 钢板
const RAW = [
  { // Stage 1 — 开门见山
    fortress: 'brick',
    rows: [
      "...#...#...#..",
      "...#...#...#..",
      "..............",
      "..#.......#...",
      "..#..###..#...",
      ".....###......",
      ".....###......",
      "..#.......#...",
      "..#.......#...",
      "..............",
      "...tttttttt...",
      "...tttttttt...",
      "..............",
    ],
  },
  { // Stage 2 — 钢铁迷宫
    fortress: 'brick',
    rows: [
      ".#.#.#.#.#.#..",
      ".#.#.#.#.#.#..",
      "..............",
      "oo..######..oo",
      "..............",
      "..#.#.#.#.#...",
      "..#.#.#.#.#...",
      "..............",
      "ttt........ttt",
      "ttt........ttt",
      "..............",
      ".#.#.#.#.#.#..",
      "..............",
    ],
  },
  { // Stage 3 — 跨越江河
    fortress: 'brick',
    rows: [
      "..#.......#...",
      "..............",
      "~~~~~~..~~~~~~",
      "~~~~~~..~~~~~~",
      "..............",
      "..oo......oo..",
      "..oo......oo..",
      "..............",
      "~~~~~~..~~~~~~",
      "~~~~~~..~~~~~~",
      "..............",
      "..#.......#...",
      "..............",
    ],
  },
  { // Stage 4 — 森林伏击
    fortress: 'brick',
    rows: [
      "ttttt....ttttt",
      "ttttt....ttttt",
      "..............",
      "..#..#..#..#..",
      "..#..#..#..#..",
      "..............",
      ".oo..oooo..oo.",
      ".oo..oooo..oo.",
      "..............",
      "..#..#..#..#..",
      "..#..#..#..#..",
      "..............",
      "..............",
    ],
  },
  { // Stage 5 — 钢铁堡垒(钢制基地)
    fortress: 'steel',
    rows: [
      "o.o.o.o.o.o.o.",
      "..............",
      "##..##..##..##",
      "##..##..##..##",
      "..............",
      "tt..~~~~~~..tt",
      "tt..~~~~~~..tt",
      "..............",
      "##..##..##..##",
      "##..##..##..##",
      "..............",
      "o.o.o.o.o.o.o.",
      "..............",
    ],
  },
  { // Stage 6 — 终极挑战
    fortress: 'brick',
    rows: [
      "#o#o#o#o#o#o#o",
      "..............",
      "#.#.#.#.#.#.#.",
      "..............",
      "oo.########.oo",
      "..#.t.t.t.#...",
      "..#.t.t.t.#...",
      "..#.t.t.t.#...",
      "oo.########.oo",
      "..............",
      "#.#.#.#.#.#.#.",
      "..............",
      "#o#o#o#o#o#o#o",
    ],
  },
];

function expand(raw) {
  const grid = [];
  for (let r = 0; r < 26; r++) {
    const row = new Array(26).fill(T.EMPTY);
    grid.push(row);
  }
  for (let sr = 0; sr < 13; sr++) {
    const line = (raw.rows[sr] || '').padEnd(13, '.').slice(0, 13);
    for (let sc = 0; sc < 13; sc++) {
      const t = SC[line[sc]] ?? T.EMPTY;
      grid[sr * 2][sc * 2] = t;
      grid[sr * 2][sc * 2 + 1] = t;
      grid[sr * 2 + 1][sc * 2] = t;
      grid[sr * 2 + 1][sc * 2 + 1] = t;
    }
  }
  return grid;
}

// 基地堡垒位置(围绕老鹰的 U 形墙)
const FORTRESS = [
  [11, 23], [12, 23], [13, 23], [14, 23],
  [11, 24], [14, 24],
  [11, 25], [14, 25],
];
const EAGLE_CELLS = [[12, 24], [13, 24], [12, 25], [13, 25]];

// 需清空的出生区(2x2): [col,row]
const CLEAR_ZONES = [
  [8, 24], [16, 24],   // 玩家
  [0, 0], [12, 0], [24, 0], // 敌人
];

function applyBase(grid, fortressMat) {
  for (const [c, r] of FORTRESS) grid[r][c] = fortressMat;
  for (const [c, r] of EAGLE_CELLS) grid[r][c] = T.BASE;
  for (const [c, r] of CLEAR_ZONES) {
    grid[r][c] = T.EMPTY; grid[r][c + 1] = T.EMPTY;
    grid[r + 1][c] = T.EMPTY; grid[r + 1][c + 1] = T.EMPTY;
  }
}

export const STAGES = RAW.map((raw) => {
  const grid = expand(raw);
  applyBase(grid, raw.fortress === 'steel' ? T.STEEL : T.BRICK);
  return { grid, fortress: raw.fortress };
});

export const STAGE_COUNT = STAGES.length;
