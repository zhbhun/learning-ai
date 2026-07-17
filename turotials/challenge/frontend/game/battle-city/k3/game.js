'use strict';

const T = 16, MT = 26, FIELD = T * MT, PANEL = 80, VW = FIELD + PANEL, VH = FIELD;
const DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const EMPTY = 0, BRICK = 1, STEEL = 2, WATER = 3, TREE = 4, ICE = 5;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const keys = {};
let lastDir = 0, fireEdge = false, enterEdge = false, pauseEdge = false, muteEdge = false;
const DIRKEYS = { ArrowUp: 0, KeyW: 0, ArrowRight: 1, KeyD: 1, ArrowDown: 2, KeyS: 2, ArrowLeft: 3, KeyA: 3 };
addEventListener('keydown', e => {
  if (DIRKEYS[e.code] != null || e.code === 'Space' || e.code === 'Enter') e.preventDefault();
  if (!keys[e.code]) {
    if (DIRKEYS[e.code] != null) lastDir = DIRKEYS[e.code];
    if (e.code === 'Space' || e.code === 'KeyZ') fireEdge = true;
    if (e.code === 'Enter') enterEdge = true;
    if (e.code === 'KeyP') pauseEdge = true;
    if (e.code === 'KeyM') muteEdge = true;
  }
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });

let state = 'title', paused = false;
let map = [], baseDead = false;
let stage = 1, score = 0, hi = +(localStorage.getItem('bc_hi') || 0);
let spareLives = 2, frame = 0, stateTimer = 0;
let freezeTimer = 0, shovelTimer = 0, spawnCount = 0;
let enemyQueue = [], pendingSpawns = [];
let player = null, enemies = [], bullets = [], explosions = [], popups = [], powerUp = null;
let respawnTimer = -1, muted = false;

const BASE = { x: 12 * T, y: 24 * T, w: 2 * T, h: 2 * T };
const PLAYER_SPAWN = { x: 8 * T, y: 24 * T };
const SPAWN_SLOTS = [0, 12 * T, 24 * T];
const FLASH_IDX = [4, 12, 18];
const POW_TYPES = ['star', 'life', 'grenade', 'helmet', 'clock', 'shovel'];

const STAGE_COMP = [
  { basic: 10, fast: 6, power: 4, armor: 0 },
  { basic: 8, fast: 6, power: 4, armor: 2 },
  { basic: 6, fast: 6, power: 4, armor: 4 },
];

const PLAYER_PAL = { body: '#d8a028', track: '#6e4e08', tread: '#f0c860', barrel: '#f8e090' };
const ENEMY_TYPES = {
  basic: { speed: 1.0, hp: 1, score: 100, bs: 3.5, body: '#b8b8b8', track: '#505050', tread: '#e8e8e8', barrel: '#d8d8d8' },
  fast:  { speed: 2.0, hp: 1, score: 200, bs: 4.0, body: '#f0f0f0', track: '#686868', tread: '#ffffff', barrel: '#ffffff' },
  power: { speed: 1.3, hp: 1, score: 300, bs: 5.0, body: '#40c040', track: '#0c540c', tread: '#a0f0a0', barrel: '#c8ffc8' },
  armor: { speed: 1.1, hp: 4, score: 400, bs: 4.0, body: '#58a858', track: '#285428', tread: '#a8d8a8', barrel: '#d0f0d0' },
};
const ARMOR_COLORS = {
  4: ['#58a858', '#285428'],
  3: ['#e0b840', '#6e5410'],
  2: ['#e07030', '#6e3010'],
  1: ['#c0c0c0', '#585858'],
};

const EAGLE = [
  '................',
  '.......XX.......',
  '......XXXX......',
  '.....XXXXXX.....',
  '....XXXXXXXX....',
  '.X..XXXXXXXX..X.',
  '.XX.XXXXXXXX.XX.',
  '..XXXXXXXXXXXX..',
  '...XXXXXXXXXX...',
  '....XXXXXXXX....',
  '.....XXXXXX.....',
  '......XXXX......',
  '......XXXX......',
  '.....XXXXXX.....',
  '....XXXXXXXX....',
  '..XXXXXXXXXXXX..',
];

function loadLevel(idx) {
  map = [];
  const rows = LEVELS[idx];
  for (let r = 0; r < 13; r++) {
    const line = (rows[r] || '').padEnd(13, '.').slice(0, 13);
    for (let sub = 0; sub < 2; sub++) {
      const arr = new Array(MT).fill(EMPTY);
      for (let c = 0; c < 13; c++) {
        const ch = line[c];
        const code = ch === 'B' ? BRICK : ch === 'S' ? STEEL : ch === 'W' ? WATER : ch === 'T' ? TREE : ch === 'I' ? ICE : EMPTY;
        arr[c * 2] = code;
        arr[c * 2 + 1] = code;
      }
      map.push(arr);
    }
  }
}

function baseWallCells() {
  const cells = [];
  for (let ty = 22; ty < 26; ty++) for (let tx = 10; tx < 16; tx++) {
    if (ty >= 24 && tx >= 12 && tx <= 13) continue;
    cells.push([tx, ty]);
  }
  return cells;
}

function setBaseWall(code) {
  for (const [tx, ty] of baseWallCells()) {
    if (code === STEEL) map[ty][tx] = STEEL;
    else if (map[ty][tx] === STEEL) map[ty][tx] = BRICK;
  }
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function rectHitsMap(x, y, w, h) {
  if (x < 0 || y < 0 || x + w > FIELD || y + h > FIELD) return true;
  const x0 = Math.floor(x / T), y0 = Math.floor(y / T);
  const x1 = Math.floor((x + w - 1) / T), y1 = Math.floor((y + h - 1) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const t = map[ty][tx];
    if (t === BRICK || t === STEEL || t === WATER) return true;
  }
  return !baseDead && rectsOverlap(x, y, w, h, BASE.x, BASE.y, BASE.w, BASE.h);
}

function rectHitsTanks(x, y, self) {
  const all = player && !player.dead ? [player, ...enemies] : enemies;
  for (const t of all) {
    if (t === self || t.dead) continue;
    if (rectsOverlap(x, y, 32, 32, t.x, t.y, 32, 32)) return true;
  }
  return false;
}

function onIce(t) {
  const tx = Math.floor((t.x + 16) / T), ty = Math.floor((t.y + 16) / T);
  return map[ty] && map[ty][tx] === ICE;
}

function keysHeldDir(d) {
  for (const k in DIRKEYS) if (DIRKEYS[k] === d && keys[k]) return true;
  return false;
}

class Tank {
  constructor(x, y) {
    this.x = x; this.y = y; this.dir = 2; this.speed = 1.4;
    this.moving = false; this.blocked = false; this.anim = 0; this.dead = false;
  }
  setDir(d) {
    if (d !== this.dir) {
      this.dir = d;
      if (d === 0 || d === 2) this.x = Math.round(this.x / 8) * 8;
      else this.y = Math.round(this.y / 8) * 8;
    }
  }
  move() {
    const [dx, dy] = DIRV[this.dir];
    const nx = this.x + dx * this.speed, ny = this.y + dy * this.speed;
    if (rectHitsMap(nx, ny, 32, 32) || rectHitsTanks(nx, ny, this)) {
      this.blocked = true; this.moving = false; return;
    }
    this.x = nx; this.y = ny; this.blocked = false; this.moving = true;
    if (frame % 6 === 0) this.anim ^= 1;
  }
  fire(power, speed, maxBullets) {
    if (bullets.filter(b => b.owner === this).length >= maxBullets) return;
    const [dx, dy] = DIRV[this.dir];
    bullets.push(new Bullet(this.x + 16 + dx * 16 - 3, this.y + 16 + dy * 16 - 3, this.dir, speed, this, power));
    SFX.shoot();
  }
}

class Player extends Tank {
  constructor() {
    super(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    this.dir = 0; this.level = 0; this.shield = 180; this.cool = 0; this.slide = 0;
    this.isPlayer = true;
  }
  update() {
    if (this.shield > 0) this.shield--;
    if (this.cool > 0) this.cool--;
    let d = null;
    if (keysHeldDir(lastDir)) d = lastDir;
    else for (const k in DIRKEYS) if (keys[k]) { d = DIRKEYS[k]; break; }
    if (d != null) {
      this.slide = 0;
      this.setDir(d);
      this.move();
    } else if (this.slide > 0) {
      this.move();
      this.slide -= this.speed;
    } else {
      if (onIce(this)) this.slide = 14;
      this.moving = false;
    }
    if (fireEdge && this.cool <= 0) {
      this.fire(this.level >= 3 ? 1 : 0, this.level >= 1 ? 5.5 : 4, this.level >= 2 ? 2 : 1);
      this.cool = 10;
    }
  }
}

class Enemy extends Tank {
  constructor(type, x, flashing) {
    super(x, 0);
    this.type = type; this.dir = 2;
    const spec = ENEMY_TYPES[type];
    this.speed = spec.speed; this.hp = spec.hp; this.score = spec.score; this.bs = spec.bs;
    this.flashing = flashing;
    this.dirTimer = (30 + Math.random() * 90) | 0;
    this.fireTimer = (60 + Math.random() * 120) | 0;
    this.hitFlash = 0;
  }
  update() {
    if (this.hitFlash > 0) this.hitFlash--;
    this.dirTimer--;
    if (this.dirTimer <= 0 || this.blocked) this.pickDir();
    this.move();
    this.fireTimer--;
    if (this.fireTimer <= 0) {
      this.fire(0, this.bs, 1);
      this.fireTimer = ((90 + Math.random() * 150) * Math.max(0.5, 1 - (stage - 1) * 0.15)) | 0;
    }
  }
  pickDir() {
    const opts = [];
    for (let d = 0; d < 4; d++) {
      const w = d === 2 ? 4 : d === this.dir ? 3 : d === 0 ? 1 : 2;
      opts.push([d, w]);
    }
    const free = opts.filter(([d]) => {
      const [dx, dy] = DIRV[d];
      let tx = this.x, ty = this.y;
      if (d === 0 || d === 2) tx = Math.round(tx / 8) * 8; else ty = Math.round(ty / 8) * 8;
      return !rectHitsMap(tx + dx * 4, ty + dy * 4, 32, 32);
    });
    const pool = free.length ? free : opts;
    let total = 0;
    for (const [, w] of pool) total += w;
    let r = Math.random() * total;
    for (const [d, w] of pool) {
      r -= w;
      if (r <= 0) { this.setDir(d); break; }
    }
    this.dirTimer = (40 + Math.random() * 140) | 0;
  }
}

class Bullet {
  constructor(x, y, dir, speed, owner, power) {
    this.x = x; this.y = y; this.dir = dir; this.speed = speed;
    this.owner = owner; this.power = power; this.size = 6; this.dead = false;
  }
  update() {
    const [dx, dy] = DIRV[this.dir];
    this.x += dx * this.speed;
    this.y += dy * this.speed;
    if (this.x < 0 || this.y < 0 || this.x + this.size > FIELD || this.y + this.size > FIELD) {
      this.dead = true;
      explosions.push({ cx: this.x + 3, cy: this.y + 3, f: 0, big: false, dead: false });
      return;
    }
    if (!baseDead && rectsOverlap(this.x, this.y, this.size, this.size, BASE.x, BASE.y, BASE.w, BASE.h)) {
      baseDead = true;
      this.dead = true;
      explosions.push({ cx: BASE.x + 16, cy: BASE.y + 16, f: 0, big: true, dead: false });
      SFX.explode();
      gameOver();
      return;
    }
    if (this.hitTiles()) return;
    if (this.owner.isPlayer) {
      for (const e of enemies) {
        if (e.dead) continue;
        if (rectsOverlap(this.x, this.y, this.size, this.size, e.x, e.y, 32, 32)) {
          this.dead = true;
          damageEnemy(e);
          return;
        }
      }
    } else if (player && !player.dead) {
      if (rectsOverlap(this.x, this.y, this.size, this.size, player.x, player.y, 32, 32)) {
        this.dead = true;
        if (player.shield > 0) {
          explosions.push({ cx: this.x + 3, cy: this.y + 3, f: 0, big: false, dead: false });
        } else {
          killPlayer();
        }
        return;
      }
    }
    for (const b of bullets) {
      if (b === this || b.dead) continue;
      if (!!b.owner.isPlayer === !!this.owner.isPlayer) continue;
      if (rectsOverlap(this.x, this.y, this.size, this.size, b.x, b.y, b.size, b.size)) {
        this.dead = true;
        b.dead = true;
        explosions.push({ cx: (this.x + b.x) / 2 + 3, cy: (this.y + b.y) / 2 + 3, f: 0, big: false, dead: false });
        return;
      }
    }
  }
  hitTiles() {
    const [dx, dy] = DIRV[this.dir];
    const vert = this.dir === 0 || this.dir === 2;
    const front = this.dir === 0 ? this.y : this.dir === 2 ? this.y + this.size - 1
      : this.dir === 3 ? this.x : this.x + this.size - 1;
    const line = Math.floor(front / T);
    const a = vert ? Math.floor(this.x / T) : Math.floor(this.y / T);
    const b2 = vert ? Math.floor((this.x + this.size - 1) / T) : Math.floor((this.y + this.size - 1) / T);
    let stopped = false;
    for (let depth = 0; depth <= this.power; depth++) {
      const row = line + (vert ? dy * depth : 0);
      const col = line + (vert ? 0 : dx * depth);
      for (const c of [a, b2]) {
        const tx = vert ? c : col, ty = vert ? row : c;
        if (tx < 0 || ty < 0 || tx >= MT || ty >= MT) continue;
        const t = map[ty][tx];
        if (t === BRICK) { map[ty][tx] = EMPTY; stopped = true; }
        else if (t === STEEL) {
          if (this.power) map[ty][tx] = EMPTY;
          stopped = true;
        }
      }
      if (stopped && !this.power) break;
    }
    if (stopped) {
      this.dead = true;
      explosions.push({ cx: this.x + 3, cy: this.y + 3, f: 0, big: false, dead: false });
      SFX.hitBrick();
    }
    return stopped;
  }
}

function damageEnemy(e) {
  e.hp--;
  SFX.hitSteel();
  if (e.hp > 0) { e.hitFlash = 6; return; }
  killEnemy(e, true);
}

function killEnemy(e, byBullet) {
  e.dead = true;
  explosions.push({ cx: e.x + 16, cy: e.y + 16, f: 0, big: true, dead: false });
  popups.push({ x: e.x + 16, y: e.y, text: '' + e.score, t: 0 });
  score += e.score;
  SFX.explode();
  if (e.flashing && byBullet) spawnPowerUp();
}

function killPlayer() {
  explosions.push({ cx: player.x + 16, cy: player.y + 16, f: 0, big: true, dead: false });
  SFX.explode();
  player.dead = true;
  if (spareLives > 0) {
    spareLives--;
    respawnTimer = 80;
  } else {
    gameOver();
  }
}

function spawnPowerUp() {
  for (let tries = 0; tries < 40; tries++) {
    const bx = 1 + ((Math.random() * 11) | 0), by = 1 + ((Math.random() * 11) | 0);
    let ok = true;
    for (let ty = by * 2; ty < by * 2 + 2 && ok; ty++) for (let tx = bx * 2; tx < bx * 2 + 2 && ok; tx++) {
      const t = map[ty][tx];
      if (t === STEEL || t === WATER) ok = false;
    }
    if (!ok) continue;
    powerUp = { x: bx * 32, y: by * 32, type: POW_TYPES[(Math.random() * POW_TYPES.length) | 0], t: 0 };
    return;
  }
}

function applyPowerUp(type) {
  score += 500;
  popups.push({ x: player.x + 16, y: player.y - 4, text: '500', t: 0 });
  SFX.powerup();
  switch (type) {
    case 'star': player.level = Math.min(3, player.level + 1); break;
    case 'life': spareLives++; break;
    case 'grenade': enemies.slice().forEach(e => { if (!e.dead) killEnemy(e, false); }); break;
    case 'helmet': player.shield = 600; break;
    case 'clock': freezeTimer = 600; break;
    case 'shovel': shovelTimer = 1200; setBaseWall(STEEL); break;
  }
}

function buildQueue() {
  const comp = STAGE_COMP[(stage - 1) % STAGE_COMP.length];
  enemyQueue = [];
  const first = Math.min(6, comp.basic);
  for (let i = 0; i < first; i++) enemyQueue.push('basic');
  const rest = [];
  for (let i = first; i < comp.basic; i++) rest.push('basic');
  for (let i = 0; i < comp.fast; i++) rest.push('fast');
  for (let i = 0; i < comp.power; i++) rest.push('power');
  for (let i = 0; i < comp.armor; i++) rest.push('armor');
  for (let i = rest.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  enemyQueue.push(...rest);
}

function updateSpawns() {
  for (const p of pendingSpawns) {
    p.timer--;
    if (p.timer <= 0 && !p.done) {
      p.done = true;
      enemies.push(new Enemy(p.type, p.x, p.flashing));
    }
  }
  pendingSpawns = pendingSpawns.filter(p => !p.done);
  if (freezeTimer > 0) return;
  if (enemyQueue.length === 0) return;
  if (enemies.length + pendingSpawns.length >= 4) return;
  for (const sx of SPAWN_SLOTS) {
    if (pendingSpawns.some(p => p.x === sx)) continue;
    if (rectHitsTanks(sx, 0, null)) continue;
    const type = enemyQueue.shift();
    spawnCount++;
    pendingSpawns.push({ x: sx, type, flashing: FLASH_IDX.includes(spawnCount), timer: 60, done: false });
    SFX.spawn();
    break;
  }
}

function saveHi() {
  if (score > hi) {
    hi = score;
    localStorage.setItem('bc_hi', hi);
  }
}

function startGame() {
  stage = 1;
  score = 0;
  spareLives = 2;
  startStage();
}

function startStage() {
  loadLevel(stage - 1);
  baseDead = false;
  bullets = []; explosions = []; popups = []; enemies = []; pendingSpawns = [];
  powerUp = null;
  freezeTimer = 0; shovelTimer = 0; respawnTimer = -1; spawnCount = 0; paused = false;
  player = new Player();
  buildQueue();
  state = 'intro';
  stateTimer = 110;
}

function gameOver() {
  saveHi();
  state = 'gameover';
  SFX.gameover();
}

function updatePlay() {
  frame++;
  if (pauseEdge) paused = !paused;
  if (paused) return;
  if (freezeTimer > 0) freezeTimer--;
  if (shovelTimer > 0 && --shovelTimer === 0) setBaseWall(BRICK);

  updateSpawns();

  if (respawnTimer > 0) {
    respawnTimer--;
    if (respawnTimer === 0) {
      const cand = new Player();
      if (rectHitsTanks(cand.x, cand.y, cand)) {
        respawnTimer = 30;
      } else {
        player = cand;
      }
    }
  }

  if (player && !player.dead) player.update();
  for (const e of enemies) if (!e.dead && freezeTimer === 0) e.update();
  for (const b of bullets) if (!b.dead) b.update();
  for (const ex of explosions) { ex.f++; if (ex.f >= (ex.big ? 30 : 15)) ex.dead = true; }
  for (const p of popups) p.t++;

  if (powerUp) {
    powerUp.t++;
    if (powerUp.t > 900) powerUp = null;
    else if (player && !player.dead && rectsOverlap(player.x, player.y, 32, 32, powerUp.x, powerUp.y, 32, 32)) {
      applyPowerUp(powerUp.type);
      powerUp = null;
    }
  }

  bullets = bullets.filter(b => !b.dead);
  enemies = enemies.filter(e => !e.dead);
  explosions = explosions.filter(e => !e.dead);
  popups = popups.filter(p => p.t < 50);

  if (state !== 'play') return;
  if (enemyQueue.length === 0 && enemies.length === 0 && pendingSpawns.length === 0 && respawnTimer <= 0) {
    state = 'clear';
    stateTimer = 150;
  }
}

function update() {
  if (muteEdge) { muted = !muted; SFX.setMuted(muted); }
  switch (state) {
    case 'title':
      if (enterEdge) { SFX.init(); startGame(); }
      break;
    case 'intro':
      stateTimer--;
      if (stateTimer <= 0 || enterEdge) state = 'play';
      break;
    case 'play':
      updatePlay();
      break;
    case 'clear':
      stateTimer--;
      if (stateTimer <= 0) {
        if (stage >= LEVELS.length) { saveHi(); state = 'victory'; }
        else { stage++; startStage(); }
      }
      break;
    case 'gameover':
    case 'victory':
      if (enterEdge) state = 'title';
      break;
  }
  fireEdge = false; enterEdge = false; pauseEdge = false; muteEdge = false;
}

function drawBrick(x, y) {
  ctx.fillStyle = '#7a2c08';
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = '#c05c18';
  for (let r = 0; r < 4; r++) {
    const off = (r % 2) ? 4 : 0;
    for (let c = -1; c < 3; c++) ctx.fillRect(x + off + c * 8 + 1, y + r * 4 + 1, 6, 2);
  }
}

function drawSteel(x, y) {
  ctx.fillStyle = '#8c8c8c';
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(x + 1, y + 1, 6, 6);
  ctx.fillRect(x + 9, y + 9, 6, 6);
  ctx.fillStyle = '#585858';
  ctx.fillRect(x + 9, y + 1, 6, 6);
  ctx.fillRect(x + 1, y + 9, 6, 6);
}

function drawWater(x, y) {
  ctx.fillStyle = '#1038a8';
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = '#5c96f0';
  const o = ((frame >> 5) & 1) * 3;
  ctx.fillRect(x + 1 + o, y + 3, 5, 2);
  ctx.fillRect(x + 9 - o, y + 7, 5, 2);
  ctx.fillRect(x + 2 + o, y + 11, 5, 2);
}

function drawIce(x, y) {
  ctx.fillStyle = '#cfe4f4';
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 2, y + 2, 2, 2);
  ctx.fillRect(x + 10, y + 5, 2, 2);
  ctx.fillRect(x + 5, y + 11, 2, 2);
  ctx.fillRect(x + 12, y + 12, 2, 2);
}

function drawTree(x, y) {
  ctx.fillStyle = '#0a4a12';
  ctx.fillRect(x, y, 16, 16);
  ctx.fillStyle = '#1e7a28';
  ctx.fillRect(x + 1, y + 1, 6, 6);
  ctx.fillRect(x + 9, y + 1, 6, 6);
  ctx.fillRect(x + 5, y + 5, 6, 6);
  ctx.fillRect(x + 1, y + 9, 6, 6);
  ctx.fillRect(x + 9, y + 9, 6, 6);
  ctx.fillStyle = '#3cb848';
  ctx.fillRect(x + 2, y + 2, 3, 3);
  ctx.fillRect(x + 10, y + 10, 3, 3);
  ctx.fillRect(x + 6, y + 6, 3, 3);
}

function drawBase() {
  const x = BASE.x, y = BASE.y;
  if (baseDead) {
    ctx.fillStyle = '#303030';
    ctx.fillRect(x, y, 32, 32);
    ctx.fillStyle = '#585858';
    ctx.fillRect(x + 4, y + 18, 24, 10);
    ctx.fillRect(x + 10, y + 10, 12, 8);
    return;
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, 32, 32);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
    if (EAGLE[r][c] === 'X') {
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
    }
  }
}

function drawTank(tk, pal) {
  ctx.save();
  ctx.translate(tk.x + 16, tk.y + 16);
  ctx.rotate(tk.dir * Math.PI / 2);
  ctx.translate(-16, -16);
  const a = tk.moving ? tk.anim : 0;
  ctx.fillStyle = pal.track;
  ctx.fillRect(0, 2, 8, 28);
  ctx.fillRect(24, 2, 8, 28);
  ctx.fillStyle = pal.tread;
  for (let i = 0; i < 5; i++) {
    const y = 3 + i * 6 + a * 3;
    ctx.fillRect(1, y, 6, 2);
    ctx.fillRect(25, y, 6, 2);
  }
  ctx.fillStyle = pal.body;
  ctx.fillRect(8, 6, 16, 22);
  ctx.fillStyle = pal.tread;
  ctx.fillRect(11, 10, 10, 12);
  ctx.fillStyle = pal.track;
  ctx.fillRect(13, 13, 6, 6);
  if (tk.isPlayer && tk.level >= 2) {
    ctx.fillStyle = pal.barrel;
    ctx.fillRect(8, 6, 3, 22);
    ctx.fillRect(21, 6, 3, 22);
  }
  if (tk.isPlayer && tk.level >= 3) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(11, 24, 10, 3);
  }
  ctx.fillStyle = pal.barrel;
  ctx.fillRect(14, 0, 4, 12);
  if (tk.isPlayer && tk.level >= 1) ctx.fillRect(12, 0, 8, 3);
  ctx.restore();
}

function enemyPal(e) {
  if (e.type === 'armor') {
    const [body, track] = ARMOR_COLORS[e.hp] || ARMOR_COLORS[1];
    return { body, track, tread: '#e8e8e8', barrel: '#ffffff' };
  }
  const s = ENEMY_TYPES[e.type];
  return { body: s.body, track: s.track, tread: s.tread, barrel: s.barrel };
}

function drawShield(t) {
  const x = t.x - 2, y = t.y - 2, s = 36;
  ctx.strokeStyle = ((frame >> 2) % 2) ? '#7ce8f8' : '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 8); ctx.lineTo(x, y); ctx.lineTo(x + 8, y);
  ctx.moveTo(x + s - 8, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y + 8);
  ctx.moveTo(x + s, y + s - 8); ctx.lineTo(x + s, y + s); ctx.lineTo(x + s - 8, y + s);
  ctx.moveTo(x + 8, y + s); ctx.lineTo(x, y + s); ctx.lineTo(x, y + s - 8);
  ctx.stroke();
}

function drawSpawnFx(p) {
  const cx = p.x + 16, cy = p.y + 16;
  const r = 4 + (1 - p.timer / 60) * 12;
  ctx.strokeStyle = ((frame >> 2) % 2) ? '#ffffff' : '#7ce8f8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
  const d = r * 0.7;
  ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
  ctx.moveTo(cx - d, cy + d); ctx.lineTo(cx + d, cy - d);
  ctx.stroke();
}

function drawExplosion(e) {
  if (e.big) {
    const r = 4 + e.f * 0.8;
    ctx.fillStyle = (e.f % 4 < 2) ? '#ffd23f' : '#f06818';
    ctx.beginPath();
    ctx.arc(e.cx, e.cy, r, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(e.cx, e.cy, r * 0.45, 0, 7);
    ctx.fill();
  } else {
    ctx.fillStyle = '#f0c860';
    ctx.beginPath();
    ctx.arc(e.cx, e.cy, 2 + e.f * 0.4, 0, 7);
    ctx.fill();
  }
}

function star(cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / 5;
    const rr = i % 2 ? r * 0.45 : r;
    const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPowerUp(p) {
  if (p.t > 700 && ((p.t >> 3) & 1)) return;
  const x = p.x, y = p.y;
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, 32, 32);
  ctx.strokeStyle = ((p.t >> 4) & 1) ? '#ffffff' : '#ffd23f';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, 30, 30);
  const cx = x + 16, cy = y + 16;
  switch (p.type) {
    case 'star':
      star(cx, cy, 11, '#ffd23f');
      break;
    case 'life':
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(x + 6, y + 10, 5, 16);
      ctx.fillRect(x + 21, y + 10, 5, 16);
      ctx.fillRect(x + 11, y + 12, 10, 12);
      ctx.fillRect(x + 14, y + 5, 4, 9);
      break;
    case 'grenade':
      ctx.fillStyle = '#40c040';
      ctx.beginPath();
      ctx.arc(cx, cy + 3, 9, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(cx - 3, cy - 12, 6, 6);
      break;
    case 'helmet':
      ctx.fillStyle = '#c8c8c8';
      ctx.beginPath();
      ctx.arc(cx, cy + 4, 10, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x + 4, cy + 3, 24, 5);
      break;
    case 'clock':
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, 7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 7);
      ctx.moveTo(cx, cy); ctx.lineTo(cx + 5, cy + 2);
      ctx.stroke();
      break;
    case 'shovel':
      ctx.fillStyle = '#c8c8c8';
      ctx.fillRect(cx - 2, y + 5, 4, 14);
      ctx.fillRect(cx - 6, y + 18, 12, 9);
      ctx.fillStyle = '#7ce8f8';
      ctx.fillRect(cx - 6, y + 24, 12, 3);
      break;
  }
}

function drawMiniTank(x, y) {
  ctx.fillStyle = '#161616';
  ctx.fillRect(x, y + 2, 3, 10);
  ctx.fillRect(x + 9, y + 2, 3, 10);
  ctx.fillRect(x + 3, y + 3, 6, 8);
  ctx.fillRect(x + 5, y, 2, 6);
}

function drawPanel() {
  ctx.fillStyle = '#707070';
  ctx.fillRect(FIELD, 0, PANEL, VH);
  ctx.fillStyle = '#161616';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('ENEMY', FIELD + 14, 12);
  for (let i = 0; i < enemyQueue.length; i++) {
    drawMiniTank(FIELD + 16 + (i % 2) * 22, 26 + Math.floor(i / 2) * 14);
  }
  ctx.fillStyle = '#161616';
  ctx.fillText('SCORE', FIELD + 14, 210);
  ctx.fillText(String(score).padStart(6, '0'), FIELD + 10, 224);
  ctx.fillText('HI', FIELD + 14, 248);
  ctx.fillText(String(hi).padStart(6, '0'), FIELD + 10, 262);
  ctx.fillText('P1', FIELD + 14, 300);
  drawMiniTank(FIELD + 14, 314);
  ctx.fillText('x ' + spareLives, FIELD + 30, 316);
  ctx.fillText('STAGE', FIELD + 12, 350);
  ctx.fillText(String(stage), FIELD + 30, 364);
  ctx.fillText(muted ? 'MUTE' : 'SOUND', FIELD + 12, 392);
}

function drawField() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, FIELD, FIELD);
  for (let ty = 0; ty < MT; ty++) for (let tx = 0; tx < MT; tx++) {
    const t = map[ty][tx], x = tx * T, y = ty * T;
    if (t === BRICK) drawBrick(x, y);
    else if (t === STEEL) drawSteel(x, y);
    else if (t === WATER) drawWater(x, y);
    else if (t === ICE) drawIce(x, y);
  }
  drawBase();
  if (powerUp) drawPowerUp(powerUp);
  for (const p of pendingSpawns) drawSpawnFx(p);
  if (player && !player.dead) {
    drawTank(player, PLAYER_PAL);
    if (player.shield > 0) drawShield(player);
  }
  for (const e of enemies) {
    drawTank(e, enemyPal(e));
    if (freezeTimer > 0) {
      ctx.fillStyle = 'rgba(120,200,255,0.35)';
      ctx.fillRect(e.x, e.y, 32, 32);
    }
    if (e.flashing && ((frame >> 3) & 1)) {
      ctx.fillStyle = 'rgba(255,40,40,0.55)';
      ctx.fillRect(e.x, e.y, 32, 32);
    }
    if (e.hitFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(e.x, e.y, 32, 32);
    }
  }
  for (const b of bullets) {
    ctx.fillStyle = '#f8f0d0';
    ctx.fillRect(b.x, b.y, b.size, b.size);
  }
  for (const ex of explosions) drawExplosion(ex);
  for (let ty = 0; ty < MT; ty++) for (let tx = 0; tx < MT; tx++) {
    if (map[ty][tx] === TREE) drawTree(tx * T, ty * T);
  }
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  for (const p of popups) {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(p.text, p.x, p.y - p.t * 0.4);
  }
  ctx.textAlign = 'left';
}

function banner(text, color, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(FIELD / 2 - 150, y - 26, 300, 52);
  ctx.fillStyle = color;
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, FIELD / 2, y);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
}

function drawTitle() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c8c8c8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('HI-SCORE ' + String(hi).padStart(6, '0'), VW / 2, 40);
  ctx.fillStyle = '#e0a028';
  ctx.font = 'bold 44px monospace';
  ctx.fillText('BATTLE', VW / 2, 120);
  ctx.fillText('CITY', VW / 2, 172);
  drawTank({ x: VW / 2 - 96, y: 228, dir: 1, anim: 0, moving: false, level: 0, isPlayer: true }, PLAYER_PAL);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('1 PLAYER', VW / 2 + 16, 250);
  if (Math.floor(performance.now() / 400) % 2 === 0) {
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('PRESS ENTER', VW / 2, 302);
  }
  ctx.fillStyle = '#666666';
  ctx.font = '10px monospace';
  ctx.fillText('ARROWS / WASD : MOVE    SPACE : FIRE', VW / 2, 352);
  ctx.fillText('P : PAUSE    M : MUTE', VW / 2, 368);
  ctx.textAlign = 'left';
}

function render() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, VW, VH);
  if (state === 'title') {
    drawTitle();
    return;
  }
  drawField();
  drawPanel();
  if (state === 'intro') {
    ctx.fillStyle = 'rgba(154,154,154,0.95)';
    ctx.fillRect(0, 0, FIELD, FIELD);
    ctx.fillStyle = '#161616';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STAGE ' + stage, FIELD / 2, FIELD / 2);
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
  }
  if (state === 'play' && paused) banner('PAUSE', '#ffd23f', 200);
  if (state === 'clear') banner('STAGE ' + stage + ' CLEAR!', '#ffd23f', 190);
  if (state === 'gameover') {
    banner('GAME OVER', '#e03030', 170);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('SCORE ' + score, FIELD / 2, 220);
    if (Math.floor(performance.now() / 400) % 2 === 0) {
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('PRESS ENTER', FIELD / 2, 250);
    }
    ctx.textAlign = 'left';
  }
  if (state === 'victory') {
    banner('YOU WIN!', '#ffd23f', 150);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('ALL STAGES CLEARED', FIELD / 2, 200);
    ctx.fillText('SCORE ' + score, FIELD / 2, 224);
    if (Math.floor(performance.now() / 400) % 2 === 0) {
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('PRESS ENTER', FIELD / 2, 260);
    }
    ctx.textAlign = 'left';
  }
}

let last = 0, acc = 0;
const STEP = 1000 / 60;
function loop(ts) {
  requestAnimationFrame(loop);
  if (!last) last = ts;
  acc += Math.min(ts - last, 100);
  last = ts;
  while (acc >= STEP) {
    update();
    acc -= STEP;
  }
  render();
}
requestAnimationFrame(loop);
