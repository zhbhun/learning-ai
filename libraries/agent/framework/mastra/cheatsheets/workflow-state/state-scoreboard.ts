import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/**
 * 共享 state 记分板（离线示意，Canvas 2D 绘制，不调用真实模型、不真正运行 Mastra）
 *
 * 演示内容：三个生产步骤（fetch / validate / enrich）产出的字段（hits / errors / duration）
 *   如何到达末尾的汇总步——上路走 inputSchema / outputSchema 逐层转发，下路走 execute 上下文的
 *   setState 写入共享 state，汇总步直接读 state。
 * 输入：stateKeys（从左到右有几个步骤写入共享 state）、relayHops（从汇总步往回数，输出链上
 *   连续转发上游字段的跳数）、suspendBeforeSummary（汇总前模拟 suspend → resume）。
 * 操作：拖动滑杆或切换开关，画布即时重画两条数据流。
 * 预期结果：经共享 state 可见字段数 = stateKeys；经输入输出链可见字段数 = relayHops；
 *   打开挂起开关后 state 键仍全部点亮（随运行快照保留），汇总步照常读数。
 * 阅读主线：顶部步骤与转发箭头 → 中部共享 state 带（setState 写入 / initialState 初值）→
 *   底部汇总步两条可见性清单。
 */

export interface ScoreboardArgs {
  stateKeys: number;
  relayHops: number;
  suspendBeforeSummary: boolean;
}

export interface ScoreboardSnapshot {
  stateVisible: number;
  chainVisible: number;
  suspendNote: string;
}

export interface ScoreboardInstance {
  update(args: ScoreboardArgs): void;
  dispose(): void;
}

interface FieldDef {
  key: string;
  value: string;
}

const FIELDS: FieldDef[] = [
  { key: 'hits', value: '12' },
  { key: 'errors', value: '2' },
  { key: 'duration', value: '380ms' },
];

const STEP_TITLES = ['fetch 拉取', 'validate 校验', 'enrich 增强', 'summary 汇总'];
const STEP_SUBS = ['产出 hits', '产出 errors', '产出 duration', '读全部字段'];

// —— 布局常量 ——
const DESIGN_W = 880;
const DESIGN_H = 412;
const STEP_W = 150;
const STEP_H = 54;
const STEP_Y = 58;
const CENTERS = [115, 332, 548, 765];
const HOP_Y = STEP_Y + STEP_H / 2;
const BAND_X = 40;
const BAND_Y = 204;
const BAND_W = 800;
const BAND_H = 84;
const PANEL_Y = 306;
const PANEL_H = 84;

const UI_FONT = '"PingFang SC", system-ui, sans-serif';
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const BLUE = '#2f6bd8';
const BLUE_SOFT = '#e9f0fa';
const GREEN = '#1d7a46';
const GREEN_SOFT = '#e7f6ec';
const GRAY = '#aeb9c6';
const TEXT = '#42526b';
const SUBTLE = '#5f718a';

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function arrowRight(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 7, y - 4);
  ctx.lineTo(x - 7, y + 4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function arrowDown(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 4, y - 7);
  ctx.lineTo(x + 4, y - 7);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawTitle(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT;
  ctx.font = `600 13px ${UI_FONT}`;
  ctx.fillText(fit(ctx, '共享 state 记分板 —— 上路逐层转发 output，下路写入共享 state', DESIGN_W - 80), BAND_X, 28);
  ctx.restore();
}

function drawStep(ctx: CanvasRenderingContext2D, i: number): void {
  const x = CENTERS[i] - STEP_W / 2;
  const isSummary = i === 3;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, STEP_Y, STEP_W, STEP_H, 10);
  ctx.fillStyle = isSummary ? BLUE_SOFT : '#f3f5f8';
  ctx.fill();
  ctx.strokeStyle = isSummary ? BLUE : GRAY;
  ctx.lineWidth = isSummary ? 2 : 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT;
  ctx.font = `700 11px ${MONO_FONT}`;
  ctx.fillText(STEP_TITLES[i], CENTERS[i], STEP_Y + 20);
  ctx.fillStyle = SUBTLE;
  ctx.font = `9.5px ${UI_FONT}`;
  ctx.fillText(STEP_SUBS[i], CENTERS[i], STEP_Y + 39);
  ctx.restore();
}

// 输出链：hop i 连接步骤 i 与 i+1；从汇总步往回数，relayHops 跳内连续转发
function drawHop(
  ctx: CanvasRenderingContext2D,
  i: number,
  forwards: boolean,
  suspendHere: boolean,
): void {
  const x1 = CENTERS[i] + STEP_W / 2 + 2;
  const x2 = CENTERS[i + 1] - STEP_W / 2 - 2;
  const color = forwards ? BLUE : GRAY;
  ctx.save();
  ctx.globalAlpha = forwards ? 0.95 : 0.55;
  if (!forwards) {
    ctx.setLineDash([4, 3]);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = forwards ? 1.8 : 1.4;
  ctx.beginPath();
  ctx.moveTo(x1, HOP_Y);
  ctx.lineTo(x2 - 1, HOP_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  arrowRight(ctx, x2, HOP_Y, color);
  ctx.fillStyle = forwards ? BLUE : SUBTLE;
  ctx.font = `600 9.5px ${UI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(forwards ? '转发' : '不转发', (x1 + x2) / 2, HOP_Y - 13);
  ctx.restore();

  if (suspendHere && i === 2) {
    const label = '⏸ suspend → ▶ resume';
    ctx.save();
    ctx.font = `600 9.5px ${UI_FONT}`;
    const w = ctx.measureText(label).width + 16;
    const bx = (x1 + x2) / 2 - w / 2;
    const by = HOP_Y + 10;
    ctx.beginPath();
    ctx.roundRect(bx, by, w, 20, 10);
    ctx.fillStyle = GREEN_SOFT;
    ctx.fill();
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = GREEN;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, (x1 + x2) / 2, by + 10);
    ctx.restore();
  }
}

// 步骤到共享 state 的写入线：写入为绿色实线箭头，未写入为灰色虚线
function drawStateLink(
  ctx: CanvasRenderingContext2D,
  i: number,
  writes: boolean,
  first: boolean,
): void {
  const cx = CENTERS[i];
  const y1 = STEP_Y + STEP_H;
  const y2 = BAND_Y - 2;
  ctx.save();
  if (writes) {
    ctx.strokeStyle = GREEN;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, y1 + 2);
    ctx.lineTo(cx, y2 - 7);
    ctx.stroke();
    arrowDown(ctx, cx, y2, GREEN);
    ctx.fillStyle = GREEN;
    ctx.font = `600 9.5px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const label = first
      ? `await setState → ${FIELDS[i].key}`
      : `setState → ${FIELDS[i].key}`;
    ctx.fillText(label, cx + 8, (y1 + y2) / 2);
  } else {
    ctx.strokeStyle = GRAY;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, y1 + 2);
    ctx.lineTo(cx, y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBand(ctx: CanvasRenderingContext2D, args: ScoreboardArgs): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(BAND_X, BAND_Y, BAND_W, BAND_H, 12);
  ctx.fillStyle = '#f4f8fb';
  ctx.fill();
  ctx.strokeStyle = '#c9d3de';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT;
  ctx.font = `700 10.5px ${UI_FONT}`;
  ctx.fillText(
    fit(ctx, '共享 state —— 形状由 stateSchema（zod）约束，初值来自 run.start 的 initialState', BAND_W - 230),
    BAND_X + 18,
    BAND_Y + 15,
  );
  if (args.suspendBeforeSummary) {
    ctx.fillStyle = GREEN;
    ctx.font = `600 9.5px ${UI_FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('挂起前写入的值随快照保留', BAND_X + BAND_W - 18, BAND_Y + 15);
    ctx.textAlign = 'left';
  }
  FIELDS.forEach((f, i) => {
    const written = i < args.stateKeys;
    const x = 60 + i * 258;
    const y = BAND_Y + 30;
    ctx.beginPath();
    ctx.roundRect(x, y, 230, 36, 9);
    if (written) {
      ctx.fillStyle = GREEN_SOFT;
      ctx.fill();
      ctx.strokeStyle = GREEN;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = GREEN;
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = GRAY;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#93a1b3';
    }
    ctx.font = `700 11px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(written ? `${f.key} = ${f.value}` : `${f.key} = —`, x + 115, y + 18);
  });
  ctx.restore();
}

function drawPanel(ctx: CanvasRenderingContext2D, args: ScoreboardArgs): void {
  const chainKeys = FIELDS.slice(FIELDS.length - args.relayHops)
    .map((f) => f.key)
    .reverse();
  const stateKeys = FIELDS.slice(0, args.stateKeys).map((f) => f.key);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(BAND_X, PANEL_Y, BAND_W, PANEL_H, 12);
  ctx.fillStyle = '#f2f5f9';
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT;
  ctx.font = `700 11px ${UI_FONT}`;
  ctx.fillText('summary 汇总步可见字段对比', BAND_X + 18, PANEL_Y + 18);

  ctx.fillStyle = BLUE;
  ctx.beginPath();
  ctx.arc(BAND_X + 26, PANEL_Y + 45, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = TEXT;
  ctx.font = `600 10.5px ${UI_FONT}`;
  ctx.fillText('经输入输出链（须逐层转发）：', BAND_X + 38, PANEL_Y + 45);
  ctx.fillStyle = BLUE;
  ctx.font = `700 10.5px ${MONO_FONT}`;
  ctx.fillText(
    fit(ctx, chainKeys.length ? chainKeys.join(', ') : '（上游字段未转发，拿不到）', 520),
    BAND_X + 226,
    PANEL_Y + 45,
  );

  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(BAND_X + 26, PANEL_Y + 69, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = TEXT;
  ctx.font = `600 10.5px ${UI_FONT}`;
  ctx.fillText('经共享 state（任意步骤直读）：', BAND_X + 38, PANEL_Y + 69);
  ctx.fillStyle = GREEN;
  ctx.font = `700 10.5px ${MONO_FONT}`;
  ctx.fillText(
    fit(ctx, stateKeys.length ? stateKeys.join(', ') : '（无步骤写入）', 520),
    BAND_X + 226,
    PANEL_Y + 69,
  );
  ctx.restore();
}

export function createScoreboard(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ScoreboardSnapshot) => void,
): ScoreboardInstance {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let args: ScoreboardArgs = { stateKeys: 2, relayHops: 1, suspendBeforeSummary: false };

  function snapshotOf(a: ScoreboardArgs): ScoreboardSnapshot {
    return {
      stateVisible: a.stateKeys,
      chainVisible: a.relayHops,
      suspendNote: a.suspendBeforeSummary ? '汇总前挂起：state 随快照保留' : '未挂起',
    };
  }

  function draw(): void {
    const { width, height } = readCanvasSize(canvas);
    canvas.width = width;
    canvas.height = height;
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    const offsetX = (width - DESIGN_W * scale) / 2;
    const offsetY = (height - DESIGN_H * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f7f9fc';
    ctx.fillRect(0, 0, width, height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    drawTitle(ctx);
    for (let i = 0; i < 3; i += 1) {
      drawHop(ctx, i, args.relayHops >= 3 - i, args.suspendBeforeSummary);
    }
    for (let i = 0; i < 4; i += 1) {
      drawStep(ctx, i);
    }
    for (let i = 0; i < 3; i += 1) {
      drawStateLink(ctx, i, i < args.stateKeys, i === 0);
    }
    drawBand(ctx, args);
    drawPanel(ctx, args);
  }

  const observer = createResizeObserver(canvas, draw);
  draw();

  return {
    update(next: ScoreboardArgs): void {
      args = next;
      emit(snapshotOf(args));
      draw();
    },
    dispose(): void {
      observer.disconnect();
    },
  };
}
