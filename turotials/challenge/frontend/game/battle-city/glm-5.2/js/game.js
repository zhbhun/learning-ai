import {
  CELL, GRID, W, H, TANK, DIR, DV, STATE, SPEED, COLOR, T,
  ENEMY, SCORE, ENEMY_MAX, ENEMY_ONSCREEN, ENEMY_SPAWNS, P1_SPAWN, BASE_CENTER,
} from './constants.js';
import { GameMap } from './map.js';
import { Tank } from './tank.js';
import { Bullet } from './bullet.js';
import { FX } from './explosion.js';
import { PowerUp, randomPowerUpType, randomPowerUpPos, PU } from './powerup.js';
import { STAGES, STAGE_COUNT } from './stages.js';

const HIGH_KEY = 'battlecity_high_v1';

export class Game {
  constructor(canvas, input, audio) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = input;
    this.audio = audio;

    this.map = new GameMap();
    this.fx = new FX();
    this.tanks = [];
    this.bullets = [];
    this.powerups = [];

    this.state = STATE.TITLE;
    this.score = 0;
    this.high = +(localStorage.getItem(HIGH_KEY) || 0);
    this.lives = 3;
    this.stageIndex = 0;
    this.playerLevel = 0;
    this.playerTank = null;

    this.roster = [];
    this.spawnTimer = 0;
    this.spawnPointIdx = 0;
    this.enemiesDefeated = 0;
    this.kills = { 0: 0, 1: 0, 2: 0, 3: 0 };

    this.respawnTimer = 0;
    this.freezeTime = 0;
    this.shovelTime = 0;
    this.transition = null; // {state, time}
    this.readyTimer = 0;

    this._bindInput();
    this.showTitle();
  }

  _bindInput() {
    this.input.on('enter', () => this.handleEnter());
    this.input.on('pause', () => this.togglePause());
    this.input.on('mute', () => this.audio.setMuted(!this.audio.muted));
  }

  handleEnter() {
    this.audio.resume();
    if (this.state === STATE.TITLE || this.state === STATE.GAMEOVER || this.state === STATE.WIN) {
      this.newGame();
    } else if (this.state === STATE.STAGECLEAR) {
      this.advanceFromClear();
    }
  }

  togglePause() {
    if (this.state === STATE.PLAYING) { this.state = STATE.PAUSED; this._overlay('已暂停', '按 P 继续', '#ffb400'); }
    else if (this.state === STATE.PAUSED) { this.state = STATE.PLAYING; this.hideOverlay(); }
  }

  // ============ 流程 ============
  newGame() {
    this.score = 0;
    this.lives = 3;
    this.stageIndex = 0;
    this.playerLevel = 0;
    this.audio.start();
    this.loadStage();
  }

  loadStage() {
    const stage = STAGES[this.stageIndex];
    this.map.load(stage);
    this.tanks = [];
    this.bullets = [];
    this.powerups = [];
    this.fx.clear();
    this.playerTank = null;
    this.roster = this._makeRoster(this.stageIndex);
    this.enemiesDefeated = 0;
    this.kills = { 0: 0, 1: 0, 2: 0, 3: 0 };
    this.spawnTimer = 0.6;
    this.spawnPointIdx = 0;
    this.freezeTime = 0;
    this.shovelTime = 0;
    this.respawnTimer = 0;
    this.transition = null;
    this._spawnPlayer();
    this.state = STATE.READY;
    this.readyTimer = 2.2;
    this._overlay(`STAGE ${this.stageIndex + 1}`, '准备战斗', '#2a9df4');
    this._updateHUD();
  }

  nextStage() {
    this.stageIndex++;
    if (this.stageIndex >= STAGE_COUNT) { this._win(); return; }
    this.loadStage();
  }

  _makeRoster(stageIndex) {
    const arr = [];
    const hard = Math.min(0.65, 0.18 + stageIndex * 0.09);
    for (let i = 0; i < ENEMY_MAX; i++) {
      const rnd = Math.random();
      let type;
      if (rnd < hard * 0.28) type = ENEMY.ARMOR;
      else if (rnd < hard * 0.6) type = ENEMY.POWER;
      else if (rnd < hard) type = ENEMY.FAST;
      else type = ENEMY.BASIC;
      arr.push({ type });
    }
    // 标记若干携带道具的敌人
    const carrierCount = 3 + Math.min(2, Math.floor(stageIndex / 2));
    const idxs = [...arr.keys()].sort(() => Math.random() - 0.5).slice(0, carrierCount);
    for (const i of idxs) arr[i].carries = true;
    return arr;
  }

  // ============ 生成 ============
  _spawnPlayer() {
    const lv = this.playerLevel;
    const t = new Tank(P1_SPAWN.col, P1_SPAWN.row, {
      kind: 'player', dir: DIR.UP,
      speed: SPEED.PLAYER, bulletSpeed: lv >= 1 ? SPEED.BULLET_P_FAST : SPEED.BULLET_P,
      maxBullets: lv >= 2 ? 2 : 1, level: lv, shieldTime: 2.5, spawn: 0.5,
    });
    this.playerTank = t;
    this.tanks.push(t);
  }

  _spawnEnemy() {
    if (this.roster.length === 0) return;
    // 选可用出生点
    let placed = false;
    for (let tries = 0; tries < 3; tries++) {
      const sp = ENEMY_SPAWNS[this.spawnPointIdx % ENEMY_SPAWNS.length];
      this.spawnPointIdx++;
      if (this._spawnClear(sp)) {
        const data = this.roster.shift();
        const params = this._enemyParams(data.type);
        const t = new Tank(sp.col, sp.row, {
          kind: 'enemy', dir: DIR.DOWN, spawn: 0.5,
          enemyType: data.type, health: params.health, maxHealth: params.health,
          speed: params.speed, bulletSpeed: params.bulletSpeed,
          maxBullets: params.maxBullets, scoreVal: SCORE[data.type],
          carriesPower: !!data.carries,
        });
        this.tanks.push(t);
        placed = true;
        break;
      }
    }
    if (placed) this.spawnTimer = 2.2;
  }

  _enemyParams(type) {
    switch (type) {
      case ENEMY.FAST: return { health: 1, speed: SPEED.ENEMY_FAST, bulletSpeed: SPEED.BULLET_E, maxBullets: 1 };
      case ENEMY.POWER: return { health: 1, speed: SPEED.ENEMY_NORMAL, bulletSpeed: SPEED.BULLET_P * 0.8, maxBullets: 1 };
      case ENEMY.ARMOR: return { health: 4, speed: SPEED.ENEMY_SLOW, bulletSpeed: SPEED.BULLET_E, maxBullets: 1 };
      default: return { health: 1, speed: SPEED.ENEMY_SLOW, bulletSpeed: SPEED.BULLET_E, maxBullets: 1 };
    }
  }

  _spawnClear(sp) {
    const x = sp.col * CELL, y = sp.row * CELL;
    for (const t of this.tanks) {
      if (t.dead) continue;
      if (x < t.x + TANK && x + TANK > t.x && y < t.y + TANK && y + TANK > t.y) return false;
    }
    return true;
  }

  // ============ 事件 ============
  onBaseHit() {
    if (!this.map.baseAlive) return;
    this.map.destroyBase();
    this.fx.bigBoom(BASE_CENTER.x, BASE_CENTER.y);
    this.audio.playerDie();
    this.transition = { state: STATE.GAMEOVER, time: 2.0, reason: '基地被摧毁！' };
  }

  killEnemy(tank) {
    if (tank.dead) return;
    tank.dead = true;
    this.score += SCORE[tank.enemyType];
    this.kills[tank.enemyType] = (this.kills[tank.enemyType] || 0) + 1;
    this.enemiesDefeated++;
    this.fx.boom(tank.cx, tank.cy);
    this.audio.explodeBig();
    if (tank.carriesPower) this._dropPowerup();
    this._updateHUD();
    this._checkStageClear();
  }

  killPlayer() {
    if (!this.playerTank || this.playerTank.dead) return;
    this.playerTank.dead = true;
    this.fx.bigBoom(this.playerTank.cx, this.playerTank.cy);
    this.audio.playerDie();
    this.playerLevel = 0; // 死亡重置星级
    this.lives--;
    this._updateHUD();
    if (this.lives <= 0) {
      this.playerTank = null;
      this.transition = { state: STATE.GAMEOVER, time: 2.0, reason: '游戏结束' };
    } else {
      this.respawnTimer = 1.4;
      this.playerTank = null;
    }
  }

  _checkStageClear() {
    const onField = this.tanks.filter((t) => !t.isPlayer && !t.dead && t.spawn <= 0).length;
    if (this.roster.length === 0 && onField === 0) {
      // 还有 spawn 动画中的敌人不算清场
      const spawning = this.tanks.filter((t) => !t.isPlayer && !t.dead && t.spawn > 0).length;
      if (spawning === 0) this._stageClear();
    }
  }

  _stageClear() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.STAGECLEAR;
    this.audio.stageClear();
    if (this.score > this.high) { this.high = this.score; localStorage.setItem(HIGH_KEY, this.high); }
    // 计分表
    let tbl = '';
    let totalKills = 0;
    const names = { 0: '普通坦克', 1: '快速坦克', 2: '重炮坦克', 3: '装甲坦克' };
    for (const k of [0, 1, 2, 3]) {
      const n = this.kills[k] || 0;
      totalKills += n;
      tbl += `<div>${names[k]} × ${n}<span class="pts">${n * SCORE[k]}</span></div>`;
    }
    tbl += `<div style="margin-top:6px;border-top:1px solid #444;padding-top:6px;">合计 × ${totalKills}<span class="pts">${this.score}</span></div>`;
    this._overlayRaw(
      `<div class="ov-title" style="color:#4caf50">关卡 ${this.stageIndex + 1} 通过！</div>
       <div class="score-table">${tbl}</div>
       <div class="ov-hint">按 Enter 继续</div>`
    );
  }

  _win() {
    this.state = STATE.WIN;
    if (this.score > this.high) { this.high = this.score; localStorage.setItem(HIGH_KEY, this.high); }
    this.audio.stageClear();
    this._overlayRaw(
      `<div class="ov-title" style="color:#ffb400">全部通关！</div>
       <div class="ov-sub">最终得分 ${this.score}</div>
       <div class="ov-hint">按 Enter 重新开始</div>`
    );
  }

  gameOver(reason) {
    this.state = STATE.GAMEOVER;
    this.audio.gameOver();
    if (this.score > this.high) { this.high = this.score; localStorage.setItem(HIGH_KEY, this.high); }
    this._overlayRaw(
      `<div class="ov-title" style="color:#e23b3b">GAME OVER</div>
       <div class="ov-sub">${reason || ''}<br/>得分 ${this.score}</div>
       <div class="ov-hint">按 Enter 重新开始</div>`
    );
  }

  showTitle() {
    this.state = STATE.TITLE;
    this._overlayRaw(
      `<div class="ov-title"><span style="color:#ffb400">坦克</span><span style="color:#2a9df4">大战</span></div>
       <div class="ov-sub">BATTLE CITY · 复刻版<br/>保护基地 · 消灭所有敌军</div>
       <div class="ov-hint">按 Enter 开始</div>`
    );
  }

  // ============ 道具 ============
  _dropPowerup() {
    if (this.powerups.length > 0) return;
    const p = randomPowerUpPos();
    this.powerups.push(new PowerUp(p.x, p.y, randomPowerUpType()));
    this.audio.powerup();
  }

  _usePowerup(pu, tank) {
    this.audio.bonus();
    switch (pu.type) {
      case PU.STAR:
        this.playerLevel = Math.min(3, this.playerLevel + 1);
        if (this.playerTank) {
          this.playerTank.level = this.playerLevel;
          this.playerTank.bulletSpeed = SPEED.BULLET_P_FAST;
          this.playerTank.maxBullets = this.playerLevel >= 2 ? 2 : 1;
        }
        break;
      case PU.GRENADE: {
        for (const t of this.tanks) {
          if (!t.isPlayer && !t.dead) { this.score += SCORE[t.enemyType]; this.kills[t.enemyType]++; this.enemiesDefeated++; t.dead = true; this.fx.boom(t.cx, t.cy); }
        }
        this.audio.explodeBig();
        this._checkStageClear();
        break;
      }
      case PU.HELMET:
        if (this.playerTank) this.playerTank.shieldTime = 10;
        break;
      case PU.SHOVEL:
        this.shovelTime = 15;
        this.map.setFortress(T.STEEL);
        break;
      case PU.TANK:
        this.lives++;
        break;
      case PU.TIMER:
        this.freezeTime = 10;
        this.audio.freeze();
        break;
    }
    this._updateHUD();
  }

  // ============ 更新 ============
  update(dt) {
    // 状态转换计时
    if (this.transition) {
      this.transition.time -= dt;
      if (this.transition.time <= 0) {
        const st = this.transition.state, reason = this.transition.reason;
        this.transition = null;
        if (st === STATE.GAMEOVER) this.gameOver(reason);
      }
      // 过渡期间仍更新特效
      this.fx.update(dt);
      this._updateEntitiesLight(dt);
      return;
    }

    if (this.state === STATE.READY) {
      this.readyTimer -= dt;
      this.map.update(dt);
      this._updateEntitiesLight(dt);
      if (this.readyTimer <= 0) { this.state = STATE.PLAYING; this.hideOverlay(); }
      return;
    }

    if (this.state === STATE.STAGECLEAR || this.state === STATE.GAMEOVER || this.state === STATE.WIN) {
      this.fx.update(dt);
      return;
    }

    if (this.state === STATE.PAUSED || this.state === STATE.TITLE) return;

    // PLAYING
    this._updatePlay(dt);
  }

  // 轻量更新(出生/特效), 不推进 AI
  _updateEntitiesLight(dt) {
    for (const t of this.tanks) {
      if (t.spawn > 0) t.spawn -= dt;
    }
    this.fx.update(dt);
  }

  _updatePlay(dt) {
    this.map.update(dt);

    // 全局计时器
    if (this.freezeTime > 0) {
      this.freezeTime -= dt;
      if (this.freezeTime < 0) this.freezeTime = 0;
    }
    if (this.shovelTime > 0) {
      this.shovelTime -= dt;
      // 末段闪烁
      if (this.shovelTime < 3 && Math.floor(this.shovelTime * 4) % 2 === 0) {
        this.map.setFortress(T.STEEL);
      } else if (this.shovelTime < 3) {
        this.map.setFortress(T.BRICK);
      }
      if (this.shovelTime <= 0) { this.shovelTime = 0; this.map.setFortress(T.BRICK); }
    }

    // 设置冻结
    for (const t of this.tanks) if (!t.isPlayer) t.frozen = this.freezeTime > 0;

    // 生成敌人
    if (this.roster.length > 0) {
      const onField = this.tanks.filter((t) => !t.isPlayer && !t.dead).length;
      if (onField < ENEMY_ONSCREEN) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) this._spawnEnemy();
      }
    }

    // 玩家复活
    if (!this.playerTank && this.respawnTimer > 0) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0 && this.lives > 0) this._spawnPlayer();
    }

    // 更新坦克
    for (const t of this.tanks) {
      if (t.dead) continue;
      t.update(dt, this);
    }
    // 清理死亡坦克
    this.tanks = this.tanks.filter((t) => !t.dead);

    // 更新子弹 + 碰撞
    for (const b of this.bullets) b.update(dt, this);
    this._collideBullets();
    this.bullets = this.bullets.filter((b) => !b.dead);

    // 道具
    for (const pu of this.powerups) pu.update(dt);
    if (this.playerTank && !this.playerTank.dead) {
      for (const pu of this.powerups) {
        if (!pu.dead && pu.hits(this.playerTank)) { pu.dead = true; this._usePowerup(pu, this.playerTank); }
      }
    }
    this.powerups = this.powerups.filter((p) => !p.dead);

    this.fx.update(dt);
    this._updateHUD();
  }

  _collideBullets() {
    // 子弹 vs 坦克
    for (const b of this.bullets) {
      if (b.dead) continue;
      for (const t of this.tanks) {
        if (t.dead || t.spawn > 0) continue;
        if (b.owner === 'player' && t.isPlayer) continue; // 无友军伤害
        if (b.owner === 'enemy' && !t.isPlayer) continue;
        if (this._rectHit(b.x, b.y, b.w, b.h, t.x, t.y, TANK, TANK)) {
          const killed = t.hit(this, b.owner === 'player');
          b.dead = true;
          if (t.isPlayer) {
            if (!killed) { this.fx.spark(b.x, b.y, false); } // 护盾挡住
            else this.killPlayer();
          } else {
            if (killed) this.killEnemy(t);
            else { this.fx.spark(b.x, b.y, false); this.audio.hitSteel(); }
          }
          break;
        }
      }
    }
    // 子弹 vs 子弹
    const bs = this.bullets.filter((b) => !b.dead);
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], c = bs[j];
        if (a.dead || c.dead) continue;
        if (this._rectHit(a.x, a.y, a.w, a.h, c.x, c.y, c.w, c.h)) { a.dead = true; c.dead = true; }
      }
    }
  }

  _rectHit(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  // ============ 渲染 ============
  render() {
    const ctx = this.ctx;
    ctx.fillStyle = COLOR.bg;
    ctx.fillRect(0, 0, W, H);

    this.map.drawGround(ctx);

    for (const pu of this.powerups) pu.draw(ctx);

    for (const t of this.tanks) { if (!t.dead) t.draw(ctx, this); }

    for (const b of this.bullets) b.draw(ctx);

    this.fx.draw(ctx);

    this.map.drawOverlay(ctx);

    // READY/STAGECLEAR 时半透明遮罩由 DOM overlay 处理
  }

  // ============ HUD / Overlay ============
  _updateHUD() {
    const $ = (id) => document.getElementById(id);
    if (!$('hud-stage')) return;
    $('hud-stage').textContent = String(this.stageIndex + 1).padStart(2, '0');
    $('hud-score').textContent = this.score;
    $('hud-high').textContent = Math.max(this.high, this.score);
    $('hud-lives').textContent = this.lives;
    $('hud-level').textContent = '★'.repeat((this.playerLevel || 0) + 1);
    const remaining = this.roster.length + this.tanks.filter((t) => !t.isPlayer && !t.dead).length;
    $('hud-enemies').textContent = remaining;
    // 敌军图标
    const box = $('enemy-icons');
    if (box && box.childElementCount !== ENEMY_MAX) {
      box.innerHTML = '';
      for (let i = 0; i < ENEMY_MAX; i++) { const d = document.createElement('div'); d.className = 'e'; box.appendChild(d); }
    }
    if (box) {
      const kids = box.children;
      for (let i = 0; i < ENEMY_MAX; i++) kids[i].classList.toggle('dead', i < this.enemiesDefeated);
    }
  }

  _overlay(title, sub, color = '#ffb400') {
    this._overlayRaw(`<div class="ov-title" style="color:${color}">${title}</div><div class="ov-sub">${sub}</div>`);
  }

  _overlayRaw(html) {
    const ov = document.getElementById('overlay');
    if (!ov) return;
    ov.innerHTML = html;
    ov.classList.remove('hidden');
  }

  hideOverlay() {
    document.getElementById('overlay')?.classList.add('hidden');
  }

  // STAGECLEAR 时按 Enter 进入下一关
  advanceFromClear() {
    if (this.state === STATE.STAGECLEAR) { this.hideOverlay(); this.nextStage(); }
  }
}
