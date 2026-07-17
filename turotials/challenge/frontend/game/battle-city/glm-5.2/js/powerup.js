import { CELL, TANK, COLOR } from './constants.js';

// 道具类型
export const PU = {
  STAR: 'star',       // 升级坦克
  GRENADE: 'grenade', // 清屏(消灭所有场上敌人)
  HELMET: 'helmet',   // 临时无敌护盾
  SHOVEL: 'shovel',   // 基地墙变钢一段时间
  TANK: 'tank',       // 加一条命
  TIMER: 'timer',     // 冻结敌人一段时间
};

const ALL = Object.values(PU);

export class PowerUp {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type = type;
    this.w = TANK; this.h = TANK;
    this.life = 14; // 14秒后消失
    this.dead = false;
    this.t = 0;
  }

  get cx() { return this.x + TANK / 2; }
  get cy() { return this.y + TANK / 2; }

  update(dt) {
    this.t += dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  hits(tank) {
    return !(this.x + this.w <= tank.x || this.x >= tank.x + TANK ||
             this.y + this.h <= tank.y || this.y >= tank.y + TANK);
  }

  draw(ctx) {
    // 闪烁
    if (Math.floor(this.t * 6) % 2 === 0 && this.life < 4) {
      // 即将消失快闪
    }
    const s = TANK;
    ctx.fillStyle = Math.floor(this.t * 4) % 2 ? '#e23b3b' : '#3b6ee2';
    ctx.fillRect(this.x, this.y, s, s);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.strokeRect(this.x + 0.5, this.y + 0.5, s - 1, s - 1);
    ctx.fillStyle = '#fff';
    this._icon(ctx);
  }

  _icon(ctx) {
    const x = this.x, y = this.y, c = x + TANK / 2, m = y + TANK / 2;
    ctx.save();
    ctx.fillStyle = '#fff';
    switch (this.type) {
      case PU.STAR: {
        const pts = 5, R = 9, r = 4;
        ctx.beginPath();
        for (let i = 0; i < pts * 2; i++) {
          const rad = i % 2 === 0 ? R : r;
          const a = (Math.PI / pts) * i - Math.PI / 2;
          const px = c + Math.cos(a) * rad, py = m + Math.sin(a) * rad;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        break;
      }
      case PU.GRENADE: {
        ctx.fillRect(c - 4, m - 6, 8, 10);
        ctx.fillRect(c - 1, m - 9, 2, 4);
        ctx.fillStyle = COLOR.eagle;
        ctx.fillRect(c - 1, m - 10, 4, 2);
        break;
      }
      case PU.HELMET: {
        ctx.beginPath();
        ctx.arc(c, m, 8, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(c - 8, m, 16, 3);
        break;
      }
      case PU.SHOVEL: {
        ctx.fillRect(c - 1, m - 8, 2, 10);
        ctx.fillRect(c - 5, m - 9, 10, 3);
        ctx.fillRect(c - 2, m + 2, 4, 5);
        break;
      }
      case PU.TANK: {
        ctx.fillRect(c - 7, m - 3, 12, 8);
        ctx.fillRect(c - 3, m - 6, 6, 3);
        ctx.fillRect(c, m - 5, 9, 2);
        break;
      }
      case PU.TIMER: {
        ctx.beginPath(); ctx.arc(c, m, 8, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillRect(c - 1, m - 8, 2, 3);
        ctx.fillRect(c, m, 4, 2);
        break;
      }
    }
    ctx.restore();
  }
}

export function randomPowerUpType() {
  return ALL[Math.floor(Math.random() * ALL.length)];
}

// 随机道具位置(对齐到格子, 避开边缘)
export function randomPowerUpPos() {
  const c = 1 + Math.floor(Math.random() * 11) * 2; // 偶数列 2..22
  const r = 1 + Math.floor(Math.random() * 11) * 2;
  return { x: c * CELL, y: r * CELL };
}
