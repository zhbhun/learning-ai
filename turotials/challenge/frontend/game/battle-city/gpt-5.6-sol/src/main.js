import './styles.css';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const startOverlay = document.querySelector('#startOverlay');
const startBtn = document.querySelector('#startBtn');
const messageOverlay = document.querySelector('#messageOverlay');
const messageTitle = document.querySelector('#messageTitle');
const messageSubtitle = document.querySelector('#messageSubtitle');
const pauseBtn = document.querySelector('#pauseBtn');
const soundBtn = document.querySelector('#soundBtn');

const TILE = 24;
const CELLS = 26;
const FIELD = TILE * CELLS;
const HUD = 168;
const WIDTH = FIELD + HUD;
const HEIGHT = FIELD;

const EMPTY = 0;
const BRICK = 1;
const STEEL = 2;
const WATER = 3;
const GRASS = 4;
const ICE = 5;

const DIR = {
  up: { x: 0, y: -1, angle: 0 },
  right: { x: 1, y: 0, angle: Math.PI / 2 },
  down: { x: 0, y: 1, angle: Math.PI },
  left: { x: -1, y: 0, angle: -Math.PI / 2 },
};

const MAPS = [
  [
    '.............',
    '.B.B.B.B.B.B.',
    '.B.B.B.B.B.B.',
    '.B.B.B.B.B.B.',
    '.B.B.WWW.B.B.',
    '.B.B.WWW.B.B.',
    '.B.B.....B.B.',
    '.B.B.BSB.B.B.',
    '.B...B.B...B.',
    '.BBB.....BBB.',
    '.....BBB.....',
    '.BB.......BB.',
    '.............',
  ],
  [
    '.............',
    '.BBS.....SBB.',
    '.B...BBB...B.',
    '.B.WWW.WWW.B.',
    '.B.WGW.WGW.B.',
    '...WWW.WWW...',
    '.BB.......BB.',
    '....SS.SS....',
    '.BBB.....BBB.',
    '.B...BBB...B.',
    '.B.B.....B.B.',
    '...B.B.B.B...',
    '.............',
  ],
  [
    '.............',
    '.S.B.B.B.B.S.',
    '.B.GGG.GGG.B.',
    '.B.GWG.GWG.B.',
    '...GWGWGWG...',
    '.BB.GGGGG.BB.',
    '.....SSS.....',
    '.BBB.....BBB.',
    '.IIB.B.B.BII.',
    '.II..B.B..II.',
    '.BB.......BB.',
    '....B.B.B....',
    '.............',
  ],
];

const TILE_FROM_CHAR = { B: BRICK, S: STEEL, W: WATER, G: GRASS, I: ICE, '.': EMPTY };
const keys = new Set();
const inputOrder = [];
const directionKeys = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
};

let grid = [];
let player = null;
let enemies = [];
let bullets = [];
let particles = [];
let powerups = [];
let popups = [];
let state = 'title';
let score = 0;
let highScore = loadHighScore();
let lives = 3;
let stage = 1;
let playerLevel = 1;
let enemySpawned = 0;
let enemyKilled = 0;
let spawnClock = 0;
let respawnClock = 0;
let stageIntro = 0;
let stageClearClock = 0;
let freezeClock = 0;
let baseAlive = true;
let lastTime = performance.now();
let screenShake = 0;

class SoundFX {
  constructor() {
    this.context = null;
    this.enabled = true;
  }

  init() {
    if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === 'suspended') this.context.resume();
  }

  tone(frequency, duration = .08, type = 'square', volume = .035, endFrequency = frequency) {
    if (!this.enabled) return;
    this.init();
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  shoot() { this.tone(190, .07, 'square', .035, 85); }
  hit() { this.tone(105, .09, 'square', .04, 55); }
  explode() { this.tone(90, .2, 'sawtooth', .055, 32); }
  pickup() { this.tone(440, .07, 'square', .04, 880); setTimeout(() => this.tone(660, .1, 'square', .03, 1100), 55); }
  start() { [180, 240, 320, 480].forEach((note, i) => setTimeout(() => this.tone(note, .12, 'square', .035), i * 90)); }
}

const sfx = new SoundFX();

function loadHighScore() {
  try { return Number(localStorage.getItem('battle-city-high-score')) || 20000; }
  catch { return 20000; }
}

function saveHighScore() {
  highScore = Math.max(highScore, score);
  try { localStorage.setItem('battle-city-high-score', String(highScore)); }
  catch { /* local storage may be unavailable */ }
}

function createMap(stageNumber) {
  const map = Array.from({ length: CELLS }, () => Array(CELLS).fill(EMPTY));
  const design = MAPS[(stageNumber - 1) % MAPS.length];
  design.forEach((rawRow, blockY) => {
    const row = rawRow.padEnd(13, '.').slice(0, 13);
    [...row].forEach((char, blockX) => {
      const tile = TILE_FROM_CHAR[char] ?? EMPTY;
      for (let y = 0; y < 2; y += 1) {
        for (let x = 0; x < 2; x += 1) map[blockY * 2 + y][blockX * 2 + x] = tile;
      }
    });
  });

  // Clear spawn lanes and build the classic brick nest around the eagle.
  for (const x of [0, 1, 12, 13, 24, 25]) for (let y = 0; y < 3; y += 1) map[y][x] = EMPTY;
  for (let x = 11; x <= 14; x += 1) map[23][x] = BRICK;
  for (let y = 24; y <= 25; y += 1) {
    map[y][11] = BRICK;
    map[y][14] = BRICK;
    map[y][12] = EMPTY;
    map[y][13] = EMPTY;
  }
  for (let y = 23; y < 26; y += 1) for (let x = 7; x <= 9; x += 1) map[y][x] = EMPTY;
  return map;
}

function makePlayer() {
  return {
    kind: 'player', x: 8 * TILE + 3, y: FIELD - 2 * TILE + 3, w: 42, h: 42,
    dir: 'up', speed: 104, cooldown: 0, shield: 3, spawn: .65,
  };
}

function enemyStats(index) {
  const sequence = ['basic', 'fast', 'power', 'basic', 'armor', 'fast', 'basic', 'power'];
  const type = sequence[(index + stage - 1) % sequence.length];
  const stats = {
    basic: { speed: 63, hp: 1, score: 100, color: '#d9d1b4' },
    fast: { speed: 91, hp: 1, score: 200, color: '#d8bd66' },
    power: { speed: 68, hp: 2, score: 300, color: '#d97f3f' },
    armor: { speed: 56, hp: 4, score: 400, color: '#b9c0bc' },
  }[type];
  return { type, ...stats };
}

function makeEnemy(x, index) {
  const stats = enemyStats(index);
  return {
    kind: 'enemy', x, y: 3, w: 42, h: 42, dir: 'down',
    cooldown: .7 + Math.random() * 1.1, turnClock: .4 + Math.random() * 1.3,
    spawn: .85, bonus: index % 4 === 3, bonusDropped: false, ...stats,
  };
}

function resetGame() {
  score = 0;
  lives = 3;
  stage = 1;
  playerLevel = 1;
  startStage();
}

function startStage() {
  grid = createMap(stage);
  player = makePlayer();
  enemies = [];
  bullets = [];
  particles = [];
  powerups = [];
  popups = [];
  enemySpawned = 0;
  enemyKilled = 0;
  spawnClock = .25;
  respawnClock = 0;
  stageIntro = 1.45;
  stageClearClock = 0;
  freezeClock = 0;
  baseAlive = true;
  state = 'playing';
  hideMessage();
}

function begin() {
  sfx.init();
  sfx.start();
  startOverlay.classList.remove('show');
  resetGame();
}

function showMessage(title, subtitle) {
  messageTitle.textContent = title;
  messageSubtitle.textContent = subtitle;
  messageOverlay.classList.add('show');
}

function hideMessage() { messageOverlay.classList.remove('show'); }

function togglePause() {
  if (state === 'playing') {
    state = 'paused';
    keys.clear();
    pauseBtn.classList.add('active');
    showMessage('PAUSE', '按 P 或右上角按钮继续');
  } else if (state === 'paused') {
    state = 'playing';
    pauseBtn.classList.remove('active');
    hideMessage();
    lastTime = performance.now();
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function baseRect() { return { x: 12 * TILE, y: 24 * TILE, w: 2 * TILE, h: 2 * TILE }; }

function blockingTile(tile) { return tile === BRICK || tile === STEEL || tile === WATER; }

function collidesWithMap(x, y, w, h) {
  if (x < 0 || y < 0 || x + w > FIELD || y + h > FIELD) return true;
  const left = Math.floor(x / TILE);
  const right = Math.floor((x + w - .01) / TILE);
  const top = Math.floor(y / TILE);
  const bottom = Math.floor((y + h - .01) / TILE);
  for (let gy = top; gy <= bottom; gy += 1) {
    for (let gx = left; gx <= right; gx += 1) if (blockingTile(grid[gy]?.[gx])) return true;
  }
  return baseAlive && rectsOverlap({ x, y, w, h }, baseRect());
}

function tankBlocked(tank, x, y) {
  if (collidesWithMap(x, y, tank.w, tank.h)) return true;
  const next = { x, y, w: tank.w, h: tank.h };
  const others = [player, ...enemies].filter((other) => other && other !== tank && other.spawn <= 0);
  return others.some((other) => rectsOverlap(next, other));
}

function moveTank(tank, direction, distance) {
  tank.dir = direction;
  const vector = DIR[direction];
  const nx = tank.x + vector.x * distance;
  const ny = tank.y + vector.y * distance;
  if (tankBlocked(tank, nx, ny)) return false;
  tank.x = nx;
  tank.y = ny;
  return true;
}

function currentMoveDirection() {
  for (let i = inputOrder.length - 1; i >= 0; i -= 1) {
    const key = inputOrder[i];
    if (keys.has(key) && directionKeys[key]) return directionKeys[key];
  }
  return null;
}

function shoot(tank) {
  if (!tank || tank.spawn > 0 || tank.cooldown > 0) return;
  const ownBullets = bullets.filter((bullet) => bullet.owner === tank);
  const maxBullets = tank.kind === 'player' && playerLevel >= 2 ? 2 : 1;
  if (ownBullets.length >= maxBullets) return;
  const vector = DIR[tank.dir];
  const size = playerLevel >= 3 && tank.kind === 'player' ? 9 : 8;
  bullets.push({
    x: tank.x + tank.w / 2 - size / 2 + vector.x * 23,
    y: tank.y + tank.h / 2 - size / 2 + vector.y * 23,
    w: size, h: size, dir: tank.dir, owner: tank,
    speed: tank.kind === 'player' && playerLevel >= 2 ? 390 : 310,
    power: tank.kind === 'player' && playerLevel >= 3 ? 2 : 1,
    dead: false,
  });
  tank.cooldown = tank.kind === 'player' ? .23 : .65 + Math.random() * .75;
  sfx.shoot();
}

function spawnEnemy() {
  if (enemySpawned >= 20 || enemies.length >= Math.min(4 + Math.floor(stage / 4), 6)) return;
  const spots = [3, FIELD / 2 - 21, FIELD - 45];
  const spot = spots[enemySpawned % spots.length];
  const candidate = makeEnemy(spot, enemySpawned);
  if ([player, ...enemies].filter(Boolean).some((tank) => rectsOverlap(candidate, tank))) return;
  enemies.push(candidate);
  enemySpawned += 1;
  spawnClock = 1.15;
}

function updatePlayer(dt) {
  if (!player) {
    if (respawnClock > 0) respawnClock -= dt;
    if (respawnClock <= 0 && lives > 0 && baseAlive) player = makePlayer();
    return;
  }
  player.cooldown = Math.max(0, player.cooldown - dt);
  player.shield = Math.max(0, player.shield - dt);
  player.spawn = Math.max(0, player.spawn - dt);
  const moveDirection = currentMoveDirection();
  if (moveDirection && player.spawn <= 0) {
    let speed = player.speed;
    const tileBelow = grid[Math.floor((player.y + player.h / 2) / TILE)]?.[Math.floor((player.x + player.w / 2) / TILE)];
    if (tileBelow === ICE) speed *= 1.18;
    moveTank(player, moveDirection, speed * dt);
  }
  if (keys.has('Space')) shoot(player);
}

function chooseEnemyDirection(enemy) {
  const choices = ['down', 'left', 'right', 'up'];
  if (player && Math.random() < .38) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const chase = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    return chase;
  }
  return choices[Math.floor(Math.random() * choices.length)];
}

function updateEnemies(dt) {
  const frozen = freezeClock > 0;
  for (const enemy of enemies) {
    enemy.spawn = Math.max(0, enemy.spawn - dt);
    enemy.cooldown -= dt;
    if (enemy.spawn > 0 || frozen) continue;
    enemy.turnClock -= dt;
    if (enemy.turnClock <= 0) {
      enemy.dir = chooseEnemyDirection(enemy);
      enemy.turnClock = .35 + Math.random() * 1.5;
    }
    if (!moveTank(enemy, enemy.dir, enemy.speed * dt)) {
      enemy.dir = chooseEnemyDirection(enemy);
      enemy.turnClock = .15 + Math.random() * .45;
    }
    if (enemy.cooldown <= 0 && (Math.random() < .025 || enemy.dir === 'down')) shoot(enemy);
  }
}

function damageTile(bullet) {
  const centerX = bullet.x + bullet.w / 2;
  const centerY = bullet.y + bullet.h / 2;
  const gx = Math.floor(centerX / TILE);
  const gy = Math.floor(centerY / TILE);
  const tile = grid[gy]?.[gx];
  if (tile === BRICK) {
    grid[gy][gx] = EMPTY;
    bullet.dead = true;
    addImpact(centerX, centerY, '#c7582e', 5);
    sfx.hit();
  } else if (tile === STEEL) {
    if (bullet.power >= 2) grid[gy][gx] = EMPTY;
    bullet.dead = true;
    addImpact(centerX, centerY, '#e7e3d2', 5);
    sfx.hit();
  } else if (tile === WATER) {
    // Water is impassable for tanks, but shells travel over it.
  }
}

function destroyBase() {
  if (!baseAlive) return;
  baseAlive = false;
  addExplosion(FIELD / 2, FIELD - TILE, 30);
  screenShake = .45;
  sfx.explode();
  endGame();
}

function hitPlayer() {
  if (!player || player.shield > 0 || player.spawn > 0) return;
  addExplosion(player.x + player.w / 2, player.y + player.h / 2, 18);
  player = null;
  lives -= 1;
  playerLevel = 1;
  screenShake = .25;
  sfx.explode();
  if (lives <= 0) endGame();
  else respawnClock = 1.05;
}

function hitEnemy(enemy) {
  if (enemy.bonus && !enemy.bonusDropped) {
    enemy.bonusDropped = true;
    spawnPowerup();
  }
  enemy.hp -= 1;
  addImpact(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#ffe28a', 7);
  if (enemy.hp > 0) {
    sfx.hit();
    enemy.color = enemy.hp % 2 ? '#d27a42' : '#d9d1b4';
    return;
  }
  enemy.dead = true;
  enemyKilled += 1;
  addScore(enemy.score, enemy.x + enemy.w / 2, enemy.y);
  addExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 17);
  screenShake = .12;
  sfx.explode();
}

function updateBullets(dt) {
  for (const bullet of bullets) {
    const vector = DIR[bullet.dir];
    bullet.x += vector.x * bullet.speed * dt;
    bullet.y += vector.y * bullet.speed * dt;
    if (bullet.x < -12 || bullet.y < -12 || bullet.x > FIELD + 12 || bullet.y > FIELD + 12) {
      bullet.dead = true;
      continue;
    }

    damageTile(bullet);
    if (bullet.dead) continue;

    if (baseAlive && rectsOverlap(bullet, baseRect())) {
      bullet.dead = true;
      destroyBase();
      continue;
    }

    if (bullet.owner.kind === 'player') {
      const target = enemies.find((enemy) => !enemy.dead && enemy.spawn <= 0 && rectsOverlap(bullet, enemy));
      if (target) {
        bullet.dead = true;
        hitEnemy(target);
      }
    } else if (player && rectsOverlap(bullet, player)) {
      bullet.dead = true;
      hitPlayer();
    }
  }

  for (let i = 0; i < bullets.length; i += 1) {
    for (let j = i + 1; j < bullets.length; j += 1) {
      if (!bullets[i].dead && !bullets[j].dead && bullets[i].owner.kind !== bullets[j].owner.kind && rectsOverlap(bullets[i], bullets[j])) {
        bullets[i].dead = true;
        bullets[j].dead = true;
        addImpact(bullets[i].x, bullets[i].y, '#fff2bc', 4);
      }
    }
  }

  bullets = bullets.filter((bullet) => !bullet.dead);
  enemies = enemies.filter((enemy) => !enemy.dead);
}

function spawnPowerup() {
  const types = ['star', 'helmet', 'grenade', 'life', 'clock'];
  const type = types[Math.floor(Math.random() * types.length)];
  let x;
  let y;
  do {
    x = TILE + Math.floor(Math.random() * 22) * TILE;
    y = 3 * TILE + Math.floor(Math.random() * 18) * TILE;
  } while (collidesWithMap(x, y, 36, 36));
  powerups = [{ type, x, y, w: 36, h: 36, life: 12, pulse: 0 }];
}

function collectPowerup(powerup) {
  const labels = { star: 'POWER UP', helmet: 'SHIELD', grenade: 'BOMB', life: '1 UP', clock: 'TIME STOP' };
  if (powerup.type === 'star') playerLevel = Math.min(3, playerLevel + 1);
  if (powerup.type === 'helmet' && player) player.shield = 10;
  if (powerup.type === 'life') lives += 1;
  if (powerup.type === 'clock') freezeClock = 7;
  if (powerup.type === 'grenade') {
    for (const enemy of enemies) {
      if (enemy.spawn <= 0) {
        enemy.dead = true;
        enemyKilled += 1;
        addScore(enemy.score, enemy.x, enemy.y);
        addExplosion(enemy.x + 21, enemy.y + 21, 14);
      }
    }
    enemies = enemies.filter((enemy) => !enemy.dead);
  }
  addScore(500, powerup.x, powerup.y, labels[powerup.type]);
  addExplosion(powerup.x + 18, powerup.y + 18, 9, '#fff3a6');
  sfx.pickup();
  powerup.dead = true;
}

function updatePowerups(dt) {
  for (const powerup of powerups) {
    powerup.life -= dt;
    powerup.pulse += dt;
    if (powerup.life <= 0) powerup.dead = true;
    if (player && rectsOverlap(powerup, player)) collectPowerup(powerup);
  }
  powerups = powerups.filter((powerup) => !powerup.dead);
}

function addImpact(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 35 + Math.random() * 95;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .16 + Math.random() * .2, max: .36, color, size: 2 + Math.random() * 4 });
  }
}

function addExplosion(x, y, size = 15, color = '#f08b24') {
  for (let i = 0; i < size; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 180;
    particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: .3 + Math.random() * .45, max: .75,
      color: i % 3 === 0 ? '#fff3ae' : (i % 2 ? color : '#d83c16'), size: 3 + Math.random() * 8,
    });
  }
}

function addScore(points, x, y, label = null) {
  score += points;
  saveHighScore();
  popups.push({ x, y, text: label || String(points), life: 1, color: label ? '#ffe278' : '#ffffff' });
}

function updateEffects(dt) {
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= .94;
    particle.vy *= .94;
    particle.life -= dt;
  }
  particles = particles.filter((particle) => particle.life > 0);
  for (const popup of popups) { popup.y -= 24 * dt; popup.life -= dt; }
  popups = popups.filter((popup) => popup.life > 0);
  screenShake = Math.max(0, screenShake - dt);
}

function endGame() {
  if (state === 'gameover') return;
  state = 'gameover';
  keys.clear();
  saveHighScore();
  setTimeout(() => {
    if (state === 'gameover') showMessage('GAME OVER', '按 ENTER 或点击游戏区重新开始');
  }, 650);
}

function update(dt) {
  updateEffects(dt);
  if (state !== 'playing') return;
  if (stageIntro > 0) {
    stageIntro -= dt;
    return;
  }
  if (stageClearClock > 0) {
    stageClearClock -= dt;
    if (stageClearClock <= 0) {
      stage += 1;
      lives = Math.min(6, lives + 1);
      startStage();
    }
    return;
  }

  freezeClock = Math.max(0, freezeClock - dt);
  spawnClock -= dt;
  if (spawnClock <= 0) spawnEnemy();
  updatePlayer(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updatePowerups(dt);

  if (enemyKilled >= 20 && enemies.length === 0 && baseAlive) {
    stageClearClock = 2.3;
    bullets = [];
    addScore(1000 * stage, FIELD / 2 - 30, FIELD / 2, 'STAGE CLEAR');
    sfx.pickup();
  }
}

function drawBrick(x, y) {
  ctx.fillStyle = '#6b241d';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#b84c2d';
  ctx.fillRect(x + 2, y + 2, 9, 8);
  ctx.fillRect(x + 13, y + 2, 9, 8);
  ctx.fillRect(x + 2, y + 13, 15, 8);
  ctx.fillRect(x + 19, y + 13, 3, 8);
  ctx.fillStyle = '#e07745';
  ctx.fillRect(x + 2, y + 2, 9, 2);
  ctx.fillRect(x + 13, y + 2, 9, 2);
  ctx.fillRect(x + 2, y + 13, 15, 2);
}

function drawSteel(x, y) {
  ctx.fillStyle = '#737574';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#c9cecb';
  ctx.fillRect(x + 2, y + 2, 8, 8);
  ctx.fillRect(x + 14, y + 2, 8, 8);
  ctx.fillRect(x + 2, y + 14, 8, 8);
  ctx.fillRect(x + 14, y + 14, 8, 8);
  ctx.fillStyle = '#f2f0df';
  for (const [dx, dy] of [[3,3],[15,3],[3,15],[15,15]]) ctx.fillRect(x + dx, y + dy, 5, 2);
  ctx.fillStyle = '#3e4140';
  for (const [dx, dy] of [[3,8],[15,8],[3,20],[15,20]]) ctx.fillRect(x + dx, y + dy, 6, 2);
}

function drawWater(x, y, time) {
  ctx.fillStyle = '#142c72';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#2d69b2';
  const shift = Math.floor(time * 3) % 8;
  ctx.fillRect(x + shift, y + 5, 10, 3);
  ctx.fillRect(x + ((shift + 11) % 18), y + 15, 9, 3);
  ctx.fillStyle = '#54a2cf';
  ctx.fillRect(x + ((shift + 4) % 14), y + 9, 8, 2);
}

function drawIce(x, y) {
  ctx.fillStyle = '#b6d9d7';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#e6f5e9';
  ctx.fillRect(x + 3, y + 3, 13, 3);
  ctx.fillRect(x + 5, y + 6, 3, 5);
  ctx.fillStyle = '#75aaa9';
  ctx.fillRect(x + 15, y + 15, 6, 2);
  ctx.fillRect(x + 19, y + 11, 2, 6);
}

function drawGrass(x, y) {
  ctx.fillStyle = '#1c4c22';
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = '#337a35';
  ctx.fillRect(x + 2, y + 3, 4, 9);
  ctx.fillRect(x + 9, y + 1, 3, 12);
  ctx.fillRect(x + 16, y + 5, 5, 12);
  ctx.fillStyle = '#4c9c44';
  ctx.fillRect(x + 5, y + 12, 3, 8);
  ctx.fillRect(x + 13, y + 9, 3, 12);
  ctx.fillRect(x + 20, y + 2, 2, 8);
}

function drawMap(time, grassOnly = false) {
  for (let y = 0; y < CELLS; y += 1) {
    for (let x = 0; x < CELLS; x += 1) {
      const tile = grid[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (grassOnly) {
        if (tile === GRASS) drawGrass(px, py);
        continue;
      }
      if (tile === BRICK) drawBrick(px, py);
      if (tile === STEEL) drawSteel(px, py);
      if (tile === WATER) drawWater(px, py, time);
      if (tile === ICE) drawIce(px, py);
    }
  }
}

function drawTank(tank, time) {
  if (tank.spawn > 0 && Math.floor(tank.spawn * 14) % 2 === 0) return;
  const centerX = tank.x + tank.w / 2;
  const centerY = tank.y + tank.h / 2;
  const playerPalette = ['#e2b327', '#f0cf32', '#fff087'];
  const main = tank.kind === 'player' ? playerPalette[Math.min(playerLevel - 1, 2)] : tank.color;
  const dark = tank.kind === 'player' ? '#705310' : '#4f5047';
  const flash = tank.bonus && !tank.bonusDropped && Math.floor(time * 8) % 2 === 0;

  ctx.save();
  ctx.translate(Math.round(centerX), Math.round(centerY));
  ctx.rotate(DIR[tank.dir].angle);
  ctx.fillStyle = flash ? '#dc3c28' : '#2c2d28';
  ctx.fillRect(-19, -20, 8, 40);
  ctx.fillRect(11, -20, 8, 40);
  ctx.fillStyle = '#111';
  for (let y = -17; y <= 14; y += 8) {
    ctx.fillRect(-18, y, 6, 4);
    ctx.fillRect(12, y, 6, 4);
  }
  ctx.fillStyle = flash ? '#f4e5b2' : main;
  ctx.fillRect(-10, -16, 20, 31);
  ctx.fillRect(-14, -11, 28, 18);
  ctx.fillStyle = dark;
  ctx.fillRect(-7, -12, 14, 16);
  ctx.fillStyle = flash ? '#ffdb5b' : main;
  ctx.fillRect(-5, -10, 10, 12);
  ctx.fillRect(-3, -26, 6, 20);
  ctx.fillStyle = '#f8e3a3';
  ctx.fillRect(-2, -25, 2, 15);
  if (tank.type === 'armor') {
    ctx.fillStyle = '#8a342c';
    ctx.fillRect(-10, 9, 20, 5);
  }
  if (tank.kind === 'player' && playerLevel >= 2) {
    ctx.fillStyle = '#f7f2c2';
    ctx.fillRect(-12, -4, 3, 9);
    ctx.fillRect(9, -4, 3, 9);
  }
  ctx.restore();

  if (tank.shield > 0 || tank.spawn > 0) {
    ctx.save();
    ctx.strokeStyle = Math.floor(time * 10) % 2 ? '#72eaff' : '#f7ed83';
    ctx.lineWidth = 3;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25 + Math.sin(time * 8) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBase() {
  const x = 12 * TILE;
  const y = 24 * TILE;
  ctx.fillStyle = '#2a2a28';
  ctx.fillRect(x, y, 48, 48);
  if (!baseAlive) {
    ctx.fillStyle = '#151515';
    ctx.fillRect(x + 7, y + 7, 34, 34);
    ctx.fillStyle = '#75402c';
    ctx.fillRect(x + 10, y + 12, 9, 7);
    ctx.fillRect(x + 26, y + 25, 12, 8);
    return;
  }
  ctx.fillStyle = '#d4c696';
  ctx.fillRect(x + 8, y + 7, 32, 33);
  ctx.fillStyle = '#191a18';
  ctx.fillRect(x + 12, y + 12, 24, 24);
  ctx.fillStyle = '#d4c696';
  ctx.fillRect(x + 21, y + 12, 6, 17);
  ctx.fillRect(x + 16, y + 17, 16, 6);
  ctx.fillRect(x + 12, y + 13, 8, 5);
  ctx.fillRect(x + 28, y + 13, 8, 5);
  ctx.fillRect(x + 18, y + 28, 12, 6);
}

function drawBullet(bullet) {
  ctx.fillStyle = bullet.owner.kind === 'player' ? '#fffbd0' : '#ffcf65';
  ctx.fillRect(Math.round(bullet.x), Math.round(bullet.y), bullet.w, bullet.h);
  ctx.fillStyle = '#e8712d';
  ctx.fillRect(Math.round(bullet.x + 2), Math.round(bullet.y + 2), bullet.w - 4, bullet.h - 4);
}

function drawPowerup(powerup, time) {
  if (powerup.life < 3 && Math.floor(time * 7) % 2 === 0) return;
  const colors = { star: '#f4d33c', helmet: '#80dbe4', grenade: '#e54c31', life: '#6dd45d', clock: '#f4eee0' };
  const symbols = { star: '★', helmet: '◒', grenade: '●', life: '1↑', clock: '◷' };
  const x = Math.round(powerup.x);
  const y = Math.round(powerup.y + Math.sin(time * 5) * 2);
  ctx.fillStyle = Math.floor(time * 6) % 2 ? '#eee5c8' : '#c7bda1';
  ctx.fillRect(x, y, 36, 36);
  ctx.fillStyle = '#25231e';
  ctx.fillRect(x + 4, y + 4, 28, 28);
  ctx.fillStyle = colors[powerup.type];
  ctx.font = powerup.type === 'life' ? '12px monospace' : '22px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbols[powerup.type], x + 18, y + 18);
}

function drawEffects() {
  for (const particle of particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    const size = Math.max(2, particle.size * particle.life / particle.max);
    ctx.fillRect(Math.round(particle.x - size / 2), Math.round(particle.y - size / 2), Math.ceil(size), Math.ceil(size));
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '9px "Press Start 2P", monospace';
  for (const popup of popups) {
    ctx.globalAlpha = Math.min(1, popup.life * 2);
    ctx.fillStyle = popup.color;
    ctx.fillText(popup.text, popup.x, popup.y);
  }
  ctx.globalAlpha = 1;
}

function drawMiniTank(x, y, color = '#272727') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 2, 5, 12);
  ctx.fillRect(x + 11, y + 2, 5, 12);
  ctx.fillRect(x + 4, y + 4, 8, 9);
  ctx.fillRect(x + 7, y, 3, 7);
}

function drawHud() {
  const x = FIELD;
  ctx.fillStyle = '#a9a69a';
  ctx.fillRect(x, 0, HUD, HEIGHT);
  ctx.fillStyle = '#8e8c82';
  ctx.fillRect(x, 0, 4, HEIGHT);
  ctx.fillStyle = '#20201e';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText('HI-SCORE', x + 24, 34);
  ctx.fillStyle = '#8b261e';
  ctx.fillText(String(highScore).padStart(6, '0'), x + 24, 55);

  ctx.fillStyle = '#20201e';
  ctx.fillText('ENEMY', x + 24, 92);
  const remaining = Math.max(0, 20 - enemyKilled);
  for (let i = 0; i < remaining; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawMiniTank(x + 27 + col * 25, 108 + row * 19, i >= remaining - enemies.length ? '#5c211d' : '#292927');
  }

  const lowerY = 338;
  ctx.fillStyle = '#232321';
  ctx.fillText('1 PLAYER', x + 24, lowerY);
  ctx.fillStyle = '#f3f0d8';
  ctx.fillText(String(score).padStart(6, '0'), x + 24, lowerY + 22);

  drawMiniTank(x + 25, lowerY + 44, '#b27f17');
  ctx.fillStyle = '#242421';
  ctx.font = '13px "Press Start 2P", monospace';
  ctx.fillText(`×${lives}`, x + 50, lowerY + 58);

  ctx.fillStyle = '#343430';
  ctx.fillRect(x + 24, lowerY + 88, 88, 4);
  ctx.fillStyle = '#232321';
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText('STAGE', x + 24, lowerY + 124);
  ctx.fillStyle = '#eee8cf';
  ctx.fillRect(x + 25, lowerY + 139, 36, 36);
  ctx.fillStyle = '#242421';
  ctx.fillRect(x + 31, lowerY + 147, 24, 18);
  ctx.fillStyle = '#8b261e';
  ctx.fillRect(x + 39, lowerY + 141, 8, 27);
  ctx.fillStyle = '#242421';
  ctx.font = '15px "Press Start 2P", monospace';
  ctx.fillText(String(stage), x + 73, lowerY + 166);

  if (freezeClock > 0) {
    ctx.fillStyle = '#2c6472';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(`TIME ${Math.ceil(freezeClock)}`, x + 24, 558);
  }
  ctx.fillStyle = '#59584f';
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillText('DEFEND', x + 24, 595);
}

function drawStageBanner() {
  if (stageIntro <= 0) return;
  ctx.fillStyle = 'rgba(0,0,0,.72)';
  ctx.fillRect(0, FIELD / 2 - 48, FIELD, 96);
  ctx.fillStyle = '#f4eee0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '20px "Press Start 2P", monospace';
  ctx.fillText(`STAGE  ${stage}`, FIELD / 2, FIELD / 2);
}

function draw(time) {
  ctx.save();
  if (screenShake > 0) ctx.translate((Math.random() - .5) * 7, (Math.random() - .5) * 7);
  ctx.fillStyle = '#070707';
  ctx.fillRect(0, 0, FIELD, FIELD);
  drawMap(time, false);
  drawBase();
  for (const powerup of powerups) drawPowerup(powerup, time);
  for (const tank of enemies) drawTank(tank, time);
  if (player) drawTank(player, time);
  for (const bullet of bullets) drawBullet(bullet);
  drawMap(time, true);
  drawEffects();
  drawHud();
  drawStageBanner();

  if (stageClearClock > 0) {
    ctx.fillStyle = 'rgba(0,0,0,.74)';
    ctx.fillRect(105, 265, 414, 92);
    ctx.fillStyle = '#ffd84a';
    ctx.font = '19px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STAGE CLEAR', FIELD / 2, 312);
  }

  // Very light scanlines keep the CRT character without hiding the playfield.
  ctx.globalAlpha = .065;
  ctx.fillStyle = '#000';
  for (let y = 0; y < HEIGHT; y += 4) ctx.fillRect(0, y, WIDTH, 1);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function loop(now) {
  const dt = Math.min(.033, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw(now / 1000);
  requestAnimationFrame(loop);
}

function pressKey(code) {
  keys.add(code);
  if (directionKeys[code]) {
    const oldIndex = inputOrder.indexOf(code);
    if (oldIndex >= 0) inputOrder.splice(oldIndex, 1);
    inputOrder.push(code);
  }
}

function releaseKey(code) {
  keys.delete(code);
  const index = inputOrder.indexOf(code);
  if (index >= 0) inputOrder.splice(index, 1);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Space'].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyP' && !event.repeat) {
    togglePause();
    return;
  }
  if (event.code === 'Enter' && (state === 'title' || state === 'gameover')) {
    begin();
    return;
  }
  pressKey(event.code);
});

window.addEventListener('keyup', (event) => releaseKey(event.code));
window.addEventListener('blur', () => {
  keys.clear();
  inputOrder.length = 0;
  if (state === 'playing' && stageIntro <= 0) togglePause();
});

document.querySelectorAll('[data-key]').forEach((button) => {
  const code = button.dataset.key;
  const release = (event) => {
    event.preventDefault();
    releaseKey(code);
    button.classList.remove('pressed');
  };
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    pressKey(code);
    button.classList.add('pressed');
  });
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('contextmenu', (event) => event.preventDefault());
});

startBtn.addEventListener('click', begin);
pauseBtn.addEventListener('click', togglePause);
soundBtn.addEventListener('click', () => {
  sfx.enabled = !sfx.enabled;
  soundBtn.textContent = sfx.enabled ? '♪' : '×';
  soundBtn.classList.toggle('active', !sfx.enabled);
  if (sfx.enabled) sfx.pickup();
});
canvas.addEventListener('pointerup', () => {
  if (state === 'gameover') begin();
});

grid = createMap(1);
player = makePlayer();
player.shield = 0;
player.spawn = 0;
requestAnimationFrame(loop);
