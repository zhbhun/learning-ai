import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/**
 * 步骤链执行（离线示意，Canvas 2D 绘制，不调用真实模型、不真正运行 Mastra）
 *
 * 演示内容：一次 workflow run 的数据流 —— inputData 从链条起点进入，每个步骤的
 * execute 以上一步输出作为 inputData，中间插一个 .map() 重塑结构，最终 result 按
 * status 给出结果或错误。
 * 输入：message（run.start 的初始输入）、factor（.map() 重塑用的系数）、
 *   failAnalyze（让第二步 analyze 抛错）。
 * 操作：修改文本 / 拖动系数 / 开关抛错，画布重放一次 run。
 * 预期结果：成功时链上五个节点依次点亮，run.status = success，结果面板显示 result；
 *   开启抛错时链条停在 analyze，下游节点虚线灰显「未执行」，status = failed。
 * 阅读主线：启动输入 → step-1 format-message → step-2 analyze → .map() → step-3 conclude → result。
 */

export interface ChainRunArgs {
  message: string;
  factor: number;
  failAnalyze: boolean;
}

export interface ChainRunSnapshot {
  status: 'success' | 'failed';
  formatted: string;
  analyze: string;
  result: string;
}

export interface ChainRunInstance {
  update(args: ChainRunArgs): void;
  dispose(): void;
}

// —— 步骤链模拟：对应 createStep 的 execute（输入 → 输出）——

const STRENGTH_THRESHOLD = 30;

// step-1 format-message：inputSchema { message } → outputSchema { formatted }
function formatStep(message: string): string {
  return message.trim().toUpperCase() || '(空)';
}

// step-2 analyze：inputSchema { formatted } → outputSchema { length, words }
// failAnalyze 模拟 execute 抛错：run.status 变为 failed，链条不再向后传递
function analyzeStep(formatted: string): { length: number; words: number } {
  return {
    length: formatted.length,
    words: formatted.split(/\s+/).filter(Boolean).length,
  };
}

// .map()：拿 getStepResult(step-1) 的输出重塑为下一步的输入 { strength }
function mapToStrength(formatted: string, factor: number): number {
  return Number((formatted.length * factor).toFixed(1));
}

// step-3 conclude：inputSchema { strength } → outputSchema { summary }
function concludeStep(strength: number): string {
  return strength >= STRENGTH_THRESHOLD
    ? `强度 ${strength} 达标，继续下发`
    : `强度 ${strength} 不足，转人工确认`;
}

export function buildSnapshot(args: ChainRunArgs): ChainRunSnapshot {
  const formatted = formatStep(args.message);
  if (args.failAnalyze) {
    return {
      status: 'failed',
      formatted,
      analyze: '抛出异常（模拟）',
      result: 'Error: analyze 步骤执行失败',
    };
  }
  const { length, words } = analyzeStep(formatted);
  const strength = mapToStrength(formatted, args.factor);
  return {
    status: 'success',
    formatted,
    analyze: `length=${length} words=${words}`,
    result: concludeStep(strength),
  };
}

// —— 绘制 —— 

const DESIGN_W = 880;
const DESIGN_H = 400;
const AREA_X = 30;
const BOX_W = 140;
const BOX_H = 96;
const BOX_GAP = 30;
const CHAIN_Y = 56;

const UI_FONT = '"PingFang SC", system-ui, sans-serif';
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const STATUS_KEYS = ['success', 'failed', 'suspended', 'tripwire', 'paused'] as const;

interface ChainNode {
  label: string;
  title: string;
  subIn: string;
  subOut: string;
}

const NODES: ChainNode[] = [
  { label: '启动输入', title: 'inputData', subIn: 'run.start 的初始输入', subOut: '{ message }' },
  { label: 'step-1', title: 'format-message', subIn: 'in { message }', subOut: 'out { formatted }' },
  { label: 'step-2', title: 'analyze', subIn: 'in { formatted }', subOut: 'out { length, words }' },
  { label: '步骤间映射', title: '.map()', subIn: 'getStepResult(step-1)', subOut: '→ { strength }' },
  { label: 'step-3', title: 'conclude', subIn: 'in { strength }', subOut: 'out { summary }' },
];

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

function drawNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  node: ChainNode,
  value: string,
  alpha: number,
  style: 'normal' | 'map' | 'failed' | 'skipped',
): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0.08, alpha);
  ctx.beginPath();
  ctx.roundRect(x, CHAIN_Y, BOX_W, BOX_H, 10);
  if (style === 'failed') {
    ctx.fillStyle = '#fdecec';
    ctx.fill();
    ctx.strokeStyle = '#d64545';
  } else if (style === 'map') {
    ctx.fillStyle = '#efe9fb';
    ctx.fill();
    ctx.strokeStyle = '#7c5cd6';
  } else if (style === 'skipped') {
    ctx.fillStyle = '#f3f5f8';
    ctx.fill();
    ctx.strokeStyle = '#aeb9c6';
    ctx.setLineDash([5, 4]);
  } else {
    ctx.fillStyle = '#e9f0fa';
    ctx.fill();
    ctx.strokeStyle = '#2f6bd8';
  }
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8494a8';
  ctx.font = `600 9.5px ${UI_FONT}`;
  ctx.fillText(node.label, x + BOX_W / 2, CHAIN_Y + 17);
  ctx.fillStyle = style === 'map' ? '#5a3fb0' : '#1d4fa8';
  ctx.font = `700 12px ${MONO_FONT}`;
  ctx.fillText(fit(ctx, node.title, BOX_W - 12), x + BOX_W / 2, CHAIN_Y + 36);
  ctx.fillStyle = '#5f718a';
  ctx.font = `9px ${MONO_FONT}`;
  ctx.fillText(fit(ctx, node.subIn, BOX_W - 10), x + BOX_W / 2, CHAIN_Y + 55);
  ctx.fillText(fit(ctx, node.subOut, BOX_W - 10), x + BOX_W / 2, CHAIN_Y + 69);
  ctx.fillStyle = style === 'failed' ? '#b03030' : '#2c3e57';
  ctx.font = `700 10px ${MONO_FONT}`;
  ctx.fillText(fit(ctx, value, BOX_W - 12), x + BOX_W / 2, CHAIN_Y + 86);
  if (style === 'skipped') {
    ctx.fillStyle = '#93a1b3';
    ctx.font = `600 9px ${UI_FONT}`;
    ctx.fillText('未执行', x + BOX_W / 2, CHAIN_Y + BOX_H + 10);
  }
  ctx.restore();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  alpha: number,
  dashed: boolean,
): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0.1, alpha);
  const y = CHAIN_Y + BOX_H / 2;
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + BOX_GAP - 6, y);
  if (dashed) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#aeb9c6';
  } else {
    ctx.strokeStyle = '#2f6bd8';
  }
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x + BOX_GAP - 6, y);
  ctx.lineTo(x + BOX_GAP - 12, y - 4);
  ctx.lineTo(x + BOX_GAP - 12, y + 4);
  ctx.closePath();
  ctx.fillStyle = dashed ? '#aeb9c6' : '#2f6bd8';
  ctx.fill();
  ctx.restore();
}

function drawResultPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: ChainRunSnapshot,
  alpha: number,
): void {
  if (alpha <= 0.05) {
    return;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  const y = 168;
  const h = 58;
  ctx.beginPath();
  ctx.roundRect(AREA_X, y, DESIGN_W - AREA_X * 2, h, 12);
  ctx.fillStyle = snapshot.status === 'success' ? '#f0f7f2' : '#fdf3f3';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = snapshot.status === 'success' ? '#9ed3b3' : '#e8b4b4';
  ctx.stroke();

  const chipW = 168;
  ctx.beginPath();
  ctx.roundRect(AREA_X + 16, y + 15, chipW, 28, 14);
  ctx.fillStyle = snapshot.status === 'success' ? '#dcf3e5' : '#fde3e3';
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = snapshot.status === 'success' ? '#1d7a46' : '#b03030';
  ctx.font = `700 11.5px ${MONO_FONT}`;
  ctx.fillText(`run.status: ${snapshot.status}`, AREA_X + 16 + chipW / 2, y + 29);

  const textX = AREA_X + 16 + chipW + 20;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8494a8';
  ctx.font = `600 9.5px ${UI_FONT}`;
  ctx.fillText(snapshot.status === 'success' ? 'result.result' : 'result.error', textX, y + 19);
  ctx.fillStyle = '#2c3e57';
  ctx.font = `600 12px ${MONO_FONT}`;
  ctx.fillText(fit(ctx, snapshot.result, DESIGN_W - textX - AREA_X - 12), textX, y + 40);
  ctx.restore();
}

function drawStatusChips(ctx: CanvasRenderingContext2D, status: string): void {
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const y = 250;
  ctx.fillStyle = '#5f718a';
  ctx.font = `600 11px ${UI_FONT}`;
  ctx.fillText('result.status 取值', AREA_X, y + 12);
  let x = AREA_X + 104;
  for (const key of STATUS_KEYS) {
    const active = key === status;
    ctx.beginPath();
    ctx.roundRect(x, y, 92, 24, 12);
    if (active) {
      ctx.fillStyle = key === 'success' ? '#dcf3e5' : '#fde3e3';
      ctx.fill();
      ctx.strokeStyle = key === 'success' ? '#2f9e5f' : '#d64545';
      ctx.fillStyle = key === 'success' ? '#1d7a46' : '#b03030';
    } else {
      ctx.strokeStyle = '#c9d3de';
      ctx.fillStyle = '#93a1b3';
    }
    ctx.lineWidth = active ? 1.6 : 1;
    ctx.stroke();
    ctx.font = `${active ? 700 : 500} 10.5px ${MONO_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(key, x + 46, y + 12);
    ctx.textAlign = 'left';
    x += 100;
  }
  ctx.restore();
}

function drawRules(
  ctx: CanvasRenderingContext2D,
  snapshot: ChainRunSnapshot,
  fail: boolean,
): void {
  ctx.save();
  const y = 296;
  const h = 84;
  ctx.beginPath();
  ctx.roundRect(AREA_X, y, DESIGN_W - AREA_X * 2, h, 12);
  ctx.fillStyle = '#f2f5f9';
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `11.5px ${UI_FONT}`;
  ctx.fillStyle = '#42526b';
  ctx.fillText(
    fit(ctx, '传递规则：上一步的输出满足下一步 inputSchema 才能进入 execute；execute 返回值必须满足自己的 outputSchema。', DESIGN_W - AREA_X * 2 - 32),
    AREA_X + 16,
    y + 22,
  );
  ctx.fillText(
    fit(ctx, '.map() 回调：inputData 是上游输出；getStepResult(步骤对象) 取任意上游输出；getInitData() 取初始输入。', DESIGN_W - AREA_X * 2 - 32),
    AREA_X + 16,
    y + 43,
  );
  ctx.font = `600 11.5px ${UI_FONT}`;
  ctx.fillStyle = fail ? '#b03030' : '#1d7a46';
  ctx.fillText(
    fit(
      ctx,
      fail
        ? 'analyze 抛出异常：链条在此终止，result.status = failed，result.error 携带原因。'
        : `当前 run 全链执行完成：result.status = success，result = "${snapshot.result}"`,
      DESIGN_W - AREA_X * 2 - 32,
    ),
    AREA_X + 16,
    y + 64,
  );
  ctx.restore();
}

export function createChainRun(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ChainRunSnapshot) => void,
): ChainRunInstance {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let args: ChainRunArgs = { message: 'hello workflow', factor: 2.5, failAnalyze: false };
  let progress = 0;
  let lastKey = '';

  function draw(): void {
    const snapshot = buildSnapshot(args);
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

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#42526b';
    ctx.font = `600 13.5px ${UI_FONT}`;
    ctx.fillText('一次 run 的数据流 —— 三个步骤 + 一次 .map() 重塑', AREA_X, 28);
    ctx.restore();

    // 节点取值（模拟各 execute 的返回值）
    const fail = args.failAnalyze;
    const strength = mapToStrength(snapshot.formatted, args.factor);
    const values = [
      args.message,
      snapshot.formatted,
      snapshot.analyze,
      fail ? '—' : `strength=${strength}`,
      snapshot.result,
    ];

    for (let i = 0; i < NODES.length; i += 1) {
      const alpha = Math.max(0, Math.min(1, progress - i));
      const skipped = fail && i >= 3;
      const style = skipped ? 'skipped' : i === 2 && fail ? 'failed' : i === 3 ? 'map' : 'normal';
      drawNode(ctx, AREA_X + i * (BOX_W + BOX_GAP), NODES[i], values[i], alpha, style);
      if (i < NODES.length - 1) {
        drawArrow(ctx, AREA_X + i * (BOX_W + BOX_GAP) + BOX_W, alpha, skipped);
      }
    }
    drawResultPanel(ctx, snapshot, Math.max(0, Math.min(1, progress - 5)));
    drawStatusChips(ctx, snapshot.status);
    drawRules(ctx, snapshot, fail);
  }

  const loop = createRenderLoop(canvas, (delta: number) => {
    progress += (6 - progress) * Math.min(1, delta * 5);
    if (Math.abs(6 - progress) < 0.02) {
      progress = 6;
    }
    draw();
  });
  const observer = createResizeObserver(canvas, draw);
  draw();

  return {
    update(next: ChainRunArgs): void {
      const key = `${next.message}|${next.factor}|${next.failAnalyze}`;
      if (key !== lastKey) {
        lastKey = key;
        progress = 0; // 每次调整输入都重放一次 run
        emit(buildSnapshot(next));
      }
      args = next;
      draw();
    },
    dispose(): void {
      loop.dispose();
      observer.disconnect();
    },
  };
}
