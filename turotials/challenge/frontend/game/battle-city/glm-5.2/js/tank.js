import { CELL, GRID, W, H, TANK, DIR, DV, SPEED, COLOR, ENEMY, T } from './constants.js';
import { Bullet } from './bullet.js';

let UID = 1;

export class Tank {
  constructor(col, row, opts = {}) {
    this.id = UID++;
    this.x = col * CELL;
    this.y = row * CELL;
    this.dir = opts.dir ?? DIR.UP;
    this.kind = opts.kind || 'enemy'; // 'player' | 'enemy'
    this.w = TANK; this.h = TANK;
    this.moving = false;
    this.anim = 0;
    this.animT = 0;
    this.cooldown = 0;
    this.dead = false;
    this.shieldTime = opts.shieldTime || 0;
    this.spawn = opts.spawn ?? 0.55; // 出生动画时长
    this.frozen = false;
    this.freezeFlash = 0;

    // 敌人
    this.enemyType = opts.enemyType ?? ENEMY.BASIC;
    this.health = opts.health ?? 1;
    this.maxHealth = this.health;
    this.carriesPower = !!opts.carriesPower;
    this.aiTimer = 0;
    this.aiShoot = 0;
    this.aiDir = this.dir;

    // 玩家
    this.level = opts.level || 0; // 星级 0..3
    this.player = opts.player || 1;

    this.speed = opts.speed ?? SPEED.ENEMY_NORMAL;
    this.bulletSpeed = opts.bulletSpeed ?? SPEED.BULLET_E;
    this.maxBullets = opts.maxBullets ?? 1;
    this.scoreVal = opts.scoreVal ?? 100;
  }

  get cx() { return this.x + TANK / 2; }
  get cy() { return this.y + TANK / 2; }
  get isPlayer() { return this.kind === 'player'; }
  get active() { return this.spawn <= 0 && !this.frozen; }
  get invuln() { return this.spawn > 0 || this.shieldTime > 0; }

  // 出生时对齐到格子
  snapAll() { this.x = Math.round(this.x / CELL) * CELL; this.y = Math.round(this.y / CELL) * CELL; }

  update(dt, game) {
    if (this.spawn > 0) { this.spawn -= dt; return; }
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.shieldTime > 0) this.shieldTime -= dt;

    if (this.frozen) {
      this.freezeFlash = (this.freezeFlash + dt) % 1;
      return;
    }

    if (this.isPlayer) this._updatePlayer(dt, game);
    else this._updateAI(dt, game);

    // 履带动画
    if (this.moving) {
      this.animT += dt;
      if (this.animT > 0.06) { this.animT = 0; this.anim ^= 1; }
    }
  }

  // ---------- 玩家 ----------
  _updatePlayer(dt, game) {
    const want = game.input.dir;
    if (want != null) this.move(want, dt, game);
    else this.moving = false;

    if (game.input.fire) this.tryFire(game);
  }

  // ---------- 敌人 AI ----------
  _updateAI(dt, game) {
    this.aiTimer -= dt;
    this.aiShoot -= dt;

    // 周期换向 / 阻挡换向
    if (this.aiTimer <= 0) {
      this.aiDir = this._chooseDir(game);
      this.aiTimer = 0.6 + Math.random() * 1.6;
    }

    const moved = this.move(this.aiDir, dt, game);
    if (!moved) {
      // 被挡, 立即换向
      this.aiDir = this._chooseDir(game);
      this.aiTimer = 0.4 + Math.random() * 1.2;
    }

    if (this.aiShoot <= 0) {
      this.tryFire(game);
      this.aiShoot = 0.5 + Math.random() * 1.3;
      if (this.enemyType === ENEMY.POWER) this.aiShoot *= 0.6;
    }
  }

  _chooseDir(game) {
    // 大部分时间向下(攻基地) / 朝玩家, 偶尔随机
    const r = Math.random();
    if (r < 0.45) return DIR.DOWN;
    if (r < 0.65) {
      // 朝玩家方向
      const p = game.playerTank;
      if (p && !p.dead) {
        if (Math.abs(p.x - this.x) > Math.abs(p.y - this.y))
          return p.x > this.x ? DIR.RIGHT : DIR.LEFT;
        return p.y > this.y ? DIR.DOWN : DIR.UP;
      }
      return DIR.DOWN;
    }
    return Math.floor(Math.random() * 4);
  }

  // ---------- 移动 ----------
  move(dir, dt, game) {
    this.dir = dir;
    // 转向时对齐交叉轴到格
    const horiz = dir === DIR.LEFT || dir === DIR.RIGHT;
    if (horiz) this.y = Math.round(this.y / CELL) * CELL;
    else this.x = Math.round(this.x / CELL) * CELL;

    const v = DV[dir];
    const step = this.speed * dt;
    const nx = this.x + v.x * step;
    const ny = this.y + v.y * step;

    if (this._canMove(nx, ny, game)) {
      this.x = nx; this.y = ny;
      this.moving = true;
      return true;
    }
    // 贴墙对齐
    this.moving = false;
    this._snapToWall(dir, game);
    return false;
  }

  _canMove(nx, ny, game) {
    if (nx < 0 || ny < 0 || nx > W - TANK || ny > H - TANK) return false;
    if (game.map.rectHitsTile(nx, ny, TANK, TANK)) return false;
    // 与其它坦克碰撞 (留 1px 缝)
    const inset = 1;
    for (const t of game.tanks) {
      if (t === this || t.dead || t.spawn > 0) continue;
      if (nx < t.x + TANK - inset && nx + TANK - inset > t.x &&
          ny < t.y + TANK - inset && ny + TANK - inset > t.y) return false;
    }
    return true;
  }

  _snapToWall(dir, game) {
    // 沿方向小步推进直到撞墙, 实现贴齐
    const v = DV[dir];
    const probe = 2;
    let moved = false;
    for (let i = 0; i < 4; i++) {
      const nx = this.x + v.x * probe;
      const ny = this.y + v.y * probe;
      if (this._canMove(nx, ny, game)) { this.x = nx; this.y = ny; moved = true; }
      else break;
    }
  }

  // ---------- 开火 ----------
  tryFire(game) {
    if (this.cooldown > 0) return;
    // 限制同屏子弹数
    let max = this.maxBullets;
    let count = 0;
    for (const b of game.bullets) if (b.ownerRef === this) count++;
    if (count >= max) return;

    let bx, by;
    const half = TANK / 2 - 3 / 2;
    switch (this.dir) {
      case DIR.UP: bx = this.x + half; by = this.y - 4; break;
      case DIR.DOWN: bx = this.x + half; by = this.y + TANK - 4; break;
      case DIR.LEFT: bx = this.x - 4; by = this.y + half; break;
      case DIR.RIGHT: bx = this.x + TANK - 4; by = this.y + half; break;
    }
    const owner = this.isPlayer ? 'player' : 'enemy';
    const spd = this.bulletSpeed;
    const power = this.isPlayer && this.level >= 3;
    const b = new Bullet(bx, by, this.dir, spd, owner, power);
    b.ownerRef = this;
    game.bullets.push(b);
    this.cooldown = this.isPlayer ? 0.28 : (0.45 + Math.random() * 0.3);
    game.audio.shoot();
  }

  hit(game, fromPlayer) {
    // 返回 true 表示被消灭
    if (this.invuln) return false;
    if (this.isPlayer) {
      // 玩家被击中 -> 死亡(护盾除外, 已被 invuln 拦截)
      return true;
    }
    // 敌人
    this.health--;
    if (this.health <= 0) return true;
    return false; // 仅受损
  }

  // ---------- 渲染 ----------
  draw(ctx, game) {
    if (this.spawn > 0) { this._drawSpawn(ctx); return; }
    const pal = this._palette();
    this._drawBody(ctx, pal);
    if (this.shieldTime > 0) this._drawShield(ctx);
    if (this.frozen && Math.floor(this.freezeFlash * 6) % 2) {
      // 冻结闪烁覆盖
      ctx.fillStyle = 'rgba(120,200,255,0.25)';
      ctx.fillRect(this.x, this.y, TANK, TANK);
    }
  }

  _drawSpawn(ctx) {
    const cx = this.cx, cy = this.cy;
    const p = 1 - this.spawn / 0.55;
    const r = 4 + p * 14;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p * Math.PI * 4);
    ctx.fillStyle = Math.floor(p * 10) % 2 ? '#fff' : '#e23b3b';
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r, -r / 3);
      ctx.lineTo(r, r / 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _palette() {
    if (this.isPlayer) {
      const lv = this.level;
      return {
        body: COLOR.player, dark: COLOR.playerDark, trim: '#fff',
        turret: lv >= 1 ? '#fff' : COLOR.playerDark,
      };
    }
    let base, dark;
    switch (this.enemyType) {
      case ENEMY.FAST: base = COLOR.enemyFast; dark = '#3a7fa0'; break;
      case ENEMY.POWER: base = COLOR.enemyPower; dark = '#3a6b2a'; break;
      case ENEMY.ARMOR:
        // 随血量变色
        { const cols = ['#c8a0e0', '#a0c0ff', '#80e0a0', '#ff9090'];
          base = cols[Math.max(0, this.health - 1)] || '#ff9090'; dark = '#553a6a'; }
        break;
      default: base = COLOR.enemyBasic; dark = '#555';
    }
    return { body: base, dark, trim: '#222', turret: '#222' };
  }

  _drawBody(ctx, pal) {
    const x = this.x, y = this.y, s = TANK;
    const d = this.dir;
    const a = this.anim;
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    // 旋转使 UP 为基准
    const rot = [0, Math.PI / 2, Math.PI, -Math.PI / 2][d];
    ctx.rotate(rot);

    const u = s / 2; // 半径
    // 履带 (左右两条)
    ctx.fillStyle = pal.dark;
    ctx.fillRect(-u, -u, 6, s);          // 左履带
    ctx.fillRect(u - 6, -u, 6, s);       // 右履带
    ctx.fillStyle = pal.trim;
    for (let i = 0; i < 6; i++) {
      const ty = -u + i * (s / 6) + (a ? 0 : s / 12);
      ctx.fillRect(-u, ty, 6, 2);
      ctx.fillRect(u - 6, ty, 6, 2);
    }
    // 车身
    ctx.fillStyle = pal.body;
    ctx.fillRect(-u + 6, -u + 3, s - 12, s - 6);
    // 炮塔
    ctx.fillStyle = pal.turret;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = pal.dark;
    ctx.fillRect(-3, -3, 6, 6);
    // 炮管 (朝上)
    ctx.fillStyle = pal.body;
    ctx.fillRect(-2, -u - 1, 4, u + 4);
    ctx.restore();

    // 闪烁(携带道具的敌人)
    if (this.carriesPower && Math.floor(performance.now() / 120) % 2) {
      ctx.fillStyle = 'rgba(255,80,80,0.35)';
      ctx.fillRect(x, y, s, s);
    }
  }

  _drawShield(ctx) {
    const blink = Math.floor(performance.now() / 80) % 2;
    ctx.strokeStyle = blink ? '#7fd0ff' : '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x - 2, this.y - 2, TANK + 4, TANK + 4);
    ctx.strokeRect(this.x + 1, this.y + 1, TANK - 2, TANK - 2);
  }
}
