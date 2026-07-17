// 爆炸/火花特效
export class FX {
  constructor() { this.list = []; }

  // 小火花(子弹击中)
  spark(x, y, steel = false) {
    this.list.push({ kind: 'spark', x, y, life: 0.18, max: 0.18, steel });
  }
  // 大爆炸(坦克被毁)
  boom(x, y) {
    this.list.push({ kind: 'boom', x, y, life: 0.7, max: 0.7 });
  }
  // 玩家阵亡爆炸(更大)
  bigBoom(x, y) {
    this.list.push({ kind: 'bigboom', x, y, life: 1.0, max: 1.0 });
  }

  update(dt) {
    for (const f of this.list) f.life -= dt;
    this.list = this.list.filter((f) => f.life > 0);
  }

  draw(ctx) {
    for (const f of this.list) {
      const p = 1 - f.life / f.max; // 0..1 进度
      if (f.kind === 'spark') {
        ctx.fillStyle = f.steel ? '#fff' : '#ffcf3f';
        const r = 4 + p * 4;
        ctx.fillRect(f.x - r / 2, f.y - r / 2, r, r);
        ctx.fillStyle = f.steel ? '#ddd' : '#ff7a00';
        ctx.fillRect(f.x - 2, f.y - 2, 4, 4);
      } else {
        const max = f.kind === 'bigboom' ? 36 : 22;
        const r = p < 0.5 ? max * (p / 0.5) : max * (1 - (p - 0.5) / 0.5);
        ctx.fillStyle = '#fff';
        ctx.fillRect(f.x - r / 2, f.y - r / 2, r, r);
        ctx.fillStyle = '#ffcf3f';
        ctx.fillRect(f.x - r / 2 + 3, f.y - r / 2 + 3, r - 6, r - 6);
        ctx.fillStyle = '#ff4d00';
        ctx.fillRect(f.x - r / 4, f.y - r / 4, r / 2, r / 2);
      }
    }
  }

  clear() { this.list = []; }
}
