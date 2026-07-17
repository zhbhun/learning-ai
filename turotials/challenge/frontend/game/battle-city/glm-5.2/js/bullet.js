import { CELL, DIR, DV, BULLET, COLOR } from './constants.js';

export class Bullet {
  constructor(x, y, dir, speed, owner, power = false) {
    this.x = x; this.y = y;
    this.dir = dir;
    this.speed = speed;
    this.owner = owner;   // 'player' | 'enemy'
    this.power = power;   // 可破钢
    this.dead = false;
    this.w = BULLET; this.h = BULLET;
  }

  get cx() { return this.x + BULLET / 2; }
  get cy() { return this.y + BULLET / 2; }

  update(dt, game) {
    const v = DV[this.dir];
    this.x += v.x * this.speed * dt;
    this.y += v.y * this.speed * dt;

    // 出界
    if (this.x < 0 || this.y < 0 || this.x > CELL * 26 || this.y > CELL * 26) {
      this.dead = true; game.fx.spark(this.cx, this.cy, true); game.audio.hitSteel(); return;
    }

    // 撞墙
    const res = game.map.bulletImpact(this.x, this.y, BULLET, BULLET, this.power);
    if (res.hit) {
      this.dead = true;
      if (res.base) { game.onBaseHit(); game.fx.spark(this.cx, this.cy, false); }
      else if (res.steel) { game.fx.spark(this.cx, this.cy, true); game.audio.hitSteel(); }
      else { game.fx.spark(this.cx, this.cy, false); game.audio.hitBrick(); }
      return;
    }
  }

  draw(ctx) {
    ctx.fillStyle = this.owner === 'player' ? '#ffffff' : '#ffd0d0';
    // 子弹画成小方块带尖
    const s = BULLET;
    ctx.fillRect(this.x, this.y, s, s);
    ctx.fillStyle = this.owner === 'player' ? '#ffe88a' : '#ff8080';
    ctx.fillRect(this.x + 1, this.y + 1, s - 2, s - 2);
  }
}
