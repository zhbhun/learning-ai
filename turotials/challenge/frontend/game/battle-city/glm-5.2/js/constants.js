// 游戏全局常量配置
export const CELL = 16;            // 单元格像素
export const GRID = 26;            // 网格数 (26x26)
export const W = CELL * GRID;      // 画布宽 = 416
export const H = CELL * GRID;      // 画布高 = 416
export const TANK = CELL * 2;      // 坦克尺寸 = 32
export const BULLET = 6;           // 子弹尺寸

// 方向
export const DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };
export const DV = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
};

// 瓦片类型
export const T = {
  EMPTY: 0,
  BRICK: 1,
  STEEL: 2,
  WATER: 3,
  TREE: 4,
  ICE: 5,
  BASE: 9,     // 老鹰基地(仅渲染/胜负用)
};

// 游戏状态
export const STATE = {
  TITLE: 'title',
  READY: 'ready',     // 关卡过场/准备
  PLAYING: 'playing',
  PAUSED: 'paused',
  STAGECLEAR: 'stageclear',
  GAMEOVER: 'gameover',
  WIN: 'win',
};

// 速度 (像素/秒)
export const SPEED = {
  PLAYER: 110,
  PLAYER_FAST: 130,
  ENEMY_SLOW: 55,
  ENEMY_NORMAL: 75,
  ENEMY_FAST: 105,
  BULLET_P: 300,
  BULLET_E: 210,
  BULLET_P_FAST: 430,
};

// 颜色
export const COLOR = {
  bg: '#000000',
  brick: '#a0522d',
  brickLight: '#c8794a',
  brickDark: '#6b3410',
  steel: '#9aa0a6',
  steelDark: '#5f6368',
  steelLight: '#cdd2d8',
  water1: '#1a3a8a',
  water2: '#2a5fd0',
  tree: '#2e8b3d',
  treeDark: '#1c5e28',
  eagle: '#d4af37',
  eagleDead: '#777',
  player: '#f0d040',
  playerDark: '#b89020',
  enemyBasic: '#9a9a9a',
  enemyFast: '#7fd0ff',
  enemyPower: '#9ee06b',
  enemyArmor: '#e8b0ff',
  shield: '#ffffff',
};

// 敌人类型
export const ENEMY = {
  BASIC: 0,   // 普通 100分
  FAST: 1,    // 快速 200分
  POWER: 2,   // 重火力 300分
  ARMOR: 3,   // 装甲(需4发) 400分
};

export const SCORE = {
  0: 100, 1: 200, 2: 300, 3: 400,
};

export const ENEMY_MAX = 20;        // 每关敌军总数
export const ENEMY_ONSCREEN = 4;    // 同屏最大敌军

// 玩家出生点 & 敌军出生点(格子)
export const P1_SPAWN = { col: 8, row: 24 };   // 左下 (8*16=128)
export const P1_SPAWN2 = { col: 16, row: 24 }; // 右下 (P2用)
export const ENEMY_SPAWNS = [
  { col: 0, row: 0 },
  { col: 12, row: 0 },
  { col: 24, row: 0 },
];

// 基地位置(占 2x2 格)
export const BASE_CELLS = [
  { c: 12, r: 24 }, { c: 13, r: 24 },
  { c: 12, r: 25 }, { c: 13, r: 25 },
];
export const BASE_CENTER = { x: 13 * CELL + CELL / 2, y: 25 * CELL + CELL / 2 };
