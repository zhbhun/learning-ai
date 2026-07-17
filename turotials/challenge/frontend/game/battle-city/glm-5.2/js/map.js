import { CELL, GRID, W, H, T, COLOR } from './constants.js';

export class GameMap {
  constructor() {
    this.time = 0;
    this.baseAlive = true;
    this.grid = this._empty();
  }

  _empty() {
    const g = [];
    for (let r = 0; r < GRID; r++) g.push(new Array(GRID).fill(T.EMPTY));
    return g;
  }

  load(stage) {
    this.grid = stage.grid.map((row) => row.slice());
    this.baseAlive = true;
    this.fortress = stage.fortress;
  }

  inBounds(c, r) { return c >= 0 && c < GRID && r >= 0 && r < GRID; }

  get(c, r) {
    if (!this.inBounds(c, r)) return T.STEEL; // 边界视为钢板(不可出界)
    return this.grid[r][c];
  }

  set(c, r, v) { if (this.inBounds(c, r)) this.grid[r][c] = v; }

  tankSolid(c, r) {
    const t = this.get(c, r);
    return t === T.BRICK || t === T.STEEL || t === T.WATER || t === T.BASE;
  }
  bulletSolid(c, r) {
    const t = this.get(c, r);
    return t === T.BRICK || t === T.STEEL || t === T.BASE;
  }

  // AABB 是否撞到坦克不可通行瓦片
  rectHitsTile(x, y, w, h) {
    const c0 = Math.floor(x / CELL), c1 = Math.floor((x + w - 1) / CELL);
    const r0 = Math.floor(y / CELL), r1 = Math.floor((y + h - 1) / CELL);
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++)
        if (this.tankSolid(c, r)) return true;
    return false;
  }

  // 子弹撞击处理: 返回 {hit, base}
  bulletImpact(bx, by, bw, bh, powerBullet) {
    const c0 = Math.floor(bx / CELL), c1 = Math.floor((bx + bw - 1) / CELL);
    const r0 = Math.floor(by / CELL), r1 = Math.floor((by + bh - 1) / CELL);
    let hit = false, base = false, steel = false;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const t = this.get(c, r);
        if (t === T.BRICK) { this.set(c, r, T.EMPTY); hit = true; }
        else if (t === T.STEEL) { hit = true; steel = true; if (powerBullet) this.set(c, r, T.EMPTY); }
        else if (t === T.BASE) { hit = true; base = true; }
      }
    }
    return { hit, base, steel };
  }

  destroyBase() {
    if (!this.baseAlive) return;
    this.baseAlive = false;
    for (let r = 24; r <= 25; r++)
      for (let c = 12; c <= 13; c++) this.set(c, r, T.EMPTY);
  }

  // 铲子道具: 临时把基地墙变钢/恢复砖
  setFortress(mat) {
    const F = [[11, 23], [12, 23], [13, 23], [14, 23], [11, 24], [14, 24], [11, 25], [14, 25]];
    for (const [c, r] of F) {
      if (this.get(c, r) === T.STEEL || this.get(c, r) === T.BRICK || this.get(c, r) === T.EMPTY) {
        // 仅当不是老鹰时设置
        if (this.get(c, r) !== T.BASE) this.set(c, r, mat);
      }
    }
  }

  update(dt) { this.time += dt; }

  // ---- 渲染 ----
  drawGround(ctx) {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const t = this.grid[r][c];
        if (t === T.EMPTY) continue;
        if (t === T.TREE) continue; // 树木最后画(盖住坦克)
        if (t === T.BASE) continue; // 老鹰由 drawBase 单独绘制
        this._drawTile(ctx, c, r, t);
      }
    }
    this.drawBase(ctx);
  }

  drawBase(ctx) {
    const ox = 12 * CELL, oy = 24 * CELL;
    const S = CELL * 2;
    if (this.baseAlive) {
      this._eagle(ctx, ox, oy, true);
    } else {
      // 残骸
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(ox, oy, S, S);
      this._eagle(ctx, ox, oy, false);
    }
  }

  drawOverlay(ctx) {
    // 树木盖在坦克之上
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (this.grid[r][c] === T.TREE) this._drawTile(ctx, c, r, T.TREE);
  }

  _drawTile(ctx, c, r, t) {
    const x = c * CELL, y = r * CELL;
    switch (t) {
      case T.BRICK: this._brick(ctx, x, y); break;
      case T.STEEL: this._steel(ctx, x, y); break;
      case T.WATER: this._water(ctx, x, y); break;
      case T.TREE: this._tree(ctx, x, y); break;
      case T.ICE: ctx.fillStyle = '#b8c4cc'; ctx.fillRect(x, y, CELL, CELL); break;
      case T.BASE: this._eagle(ctx, x, y, this.baseAlive); break;
    }
  }

  _brick(ctx, x, y) {
    ctx.fillStyle = COLOR.brickDark;
    ctx.fillRect(x, y, CELL, CELL);
    ctx.fillStyle = COLOR.brick;
    // 两排砖, 错缝
    const bw = CELL / 2 - 1, bh = CELL / 2 - 1;
    ctx.fillRect(x + 1, y + 1, bw, bh);
    ctx.fillRect(x + CELL / 2 + 0.5, y + 1, bw, bh);
    ctx.fillRect(x + 1, y + CELL / 2 + 0.5, bw, bh);
    ctx.fillRect(x + CELL / 2 + 0.5, y + CELL / 2 + 0.5, bw, bh);
  }

  _steel(ctx, x, y) {
    ctx.fillStyle = COLOR.steelDark;
    ctx.fillRect(x, y, CELL, CELL);
    ctx.fillStyle = COLOR.steel;
    ctx.fillRect(x + 1, y + 1, CELL - 3, CELL - 3);
    ctx.fillStyle = COLOR.steelLight;
    ctx.fillRect(x + 1, y + 1, CELL - 3, 2);
    ctx.fillRect(x + 1, y + 1, 2, CELL - 3);
  }

  _water(ctx, x, y) {
    const f = Math.floor(this.time * 2) % 2;
    ctx.fillStyle = COLOR.water1;
    ctx.fillRect(x, y, CELL, CELL);
    ctx.fillStyle = COLOR.water2;
    const p = f === 0 ? 3 : 9;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + (p + i * 6) % CELL, y + 3, 3, 2);
      ctx.fillRect(x + (p + 9 + i * 6) % CELL, y + 9, 3, 2);
    }
  }

  _tree(ctx, x, y) {
    ctx.fillStyle = COLOR.treeDark;
    ctx.fillRect(x, y, CELL, CELL);
    ctx.fillStyle = COLOR.tree;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        if ((i + j) % 2 === 0) ctx.fillRect(x + i * 4, y + j * 4, 4, 4);
  }

  _eagle(ctx, x, y, alive) {
    // 2x2 单元的老鹰图标: 画在传入的左上角单元, 实际占 32x32
    // 注意: drawGround 对每个 BASE 单元都调用, 这里只在 (12,24) 画一次完整图案
    const c = Math.floor(x / CELL), r = Math.floor(y / CELL);
    if (c !== 12 || r !== 24) return;
    const ox = 12 * CELL, oy = 24 * CELL;
    const S = CELL * 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(ox, oy, S, S);
    const col = alive ? COLOR.eagle : COLOR.eagleDead;
    ctx.fillStyle = col;
    // 简易鹰徽像素图 (8x8 放大 4x)
    const px = (gx, gy, w, h) => ctx.fillRect(ox + gx * 4, oy + gy * 4, w * 4, h * 4);
    // 翅膀
    px(0, 2, 1, 3); px(1, 1, 1, 4);
    px(2, 1, 1, 5); px(3, 1, 1, 6);
    // 身体
    px(4, 0, 4, 1); px(4, 1, 4, 6);
    px(3, 6, 5, 1);
    // 右翼
    px(8, 1, 1, 6); px(9, 1, 1, 5); px(10, 1, 1, 4); px(11, 2, 1, 3);
    // 头/喙
    ctx.fillStyle = alive ? '#fff' : '#aaa';
    px(5, 1, 2, 2);
    ctx.fillStyle = '#ff8c00';
    px(6, 2, 1, 1);
  }
}
