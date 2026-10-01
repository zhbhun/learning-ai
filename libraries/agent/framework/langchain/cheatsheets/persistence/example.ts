/**
 * 范例介绍：持久化机制模拟器。一个编译图（START → nodeA → nodeB → END）
 * 在两个 thread 上各自推进，checkpoint 只在 super-step 边界产生；
 * 对照三种存储实现——无 checkpointer、MemorySaver（进程内存）、
 * 数据库 checkpointer（以 PostgresSaver 为代表）——在「进程重启」下的差异。
 * 输入或前置状态：Controls 提供存储实现、thread-1 / thread-2 推进的
 * checkpoint 数（0-4）、是否模拟进程重启；纯本地 TS 确定性模拟，
 * 不依赖 @langchain/*，不发起模型调用、不连接数据库。
 * 主要操作：切换存储实现；分别推进两个 thread；打开「模拟进程重启」。
 * 预期结果：checkpoint 链随步进在节点边界逐格增长（step / next 变化）；
 * 两个 thread 的链互相独立；无实现与 MemorySaver 在重启后链清空，
 * 数据库实现重启后链完整保留。阅读主线：simulate() 的存储语义分支。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type CheckpointerKind = 'none' | 'memory' | 'postgres';

export interface ExampleOptions {
  checkpointerKind: CheckpointerKind;
  stepsThread1: number;
  stepsThread2: number;
  restarted: boolean;
}

export interface SimCheckpoint {
  step: number;
  source: string;
  next: string;
  notes: string[];
}

export interface ExampleSnapshot {
  thread1Count: number;
  thread2Count: number;
  recoverable: '是' | '否' | '—';
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const GREEN = '#1f9d63';
const RED = '#c2402f';
const LINE = '#dbe3f0';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 顺序图 START → nodeA → nodeB → END 一次 invoke 的 4 个 checkpoint，
// 与官方文档的 foo/bar 算例一一对应：空输入(-1) → 输入就绪(0) →
// nodeA 完成(1) → nodeB 完成(2)。notes 通道走追加 reducer，逐步累积。
function checkpointChain(steps: number): SimCheckpoint[] {
  const all: SimCheckpoint[] = [
    { step: -1, source: 'input', next: '__start__', notes: [] },
    { step: 0, source: 'loop', next: 'nodeA', notes: ['hello'] },
    { step: 1, source: 'loop', next: 'nodeB', notes: ['hello', 'A'] },
    { step: 2, source: 'loop', next: '', notes: ['hello', 'A', 'B'] },
  ];
  return all.slice(0, Math.max(0, Math.min(4, steps)));
}

// 存储语义：none 从不落盘；memory 落在 RAM，重启清零；
// postgres 落在进程外的数据库，重启后按 thread_id 读回。
function visibleChain(
  kind: CheckpointerKind,
  steps: number,
  restarted: boolean,
): SimCheckpoint[] {
  if (kind === 'none') {
    return [];
  }
  if (kind === 'memory' && restarted) {
    return [];
  }
  return checkpointChain(steps);
}

function summaryLine(options: ExampleOptions): string {
  const { checkpointerKind, restarted } = options;
  if (checkpointerKind === 'none') {
    return '无 checkpointer：不产生任何 checkpoint，调用 getState 会直接报错（No checkpointer set）';
  }
  if (checkpointerKind === 'memory') {
    return restarted
      ? '进程重启：RAM 清空，两个 thread 的 checkpoint 链全部丢失'
      : 'MemorySaver：同进程内按 thread_id 存取，重启前一切正常';
  }
  return restarted
    ? '进程重启：新进程按 thread_id 从数据库读回，两个 thread 的历史完整保留'
    : '数据库 checkpointer：每个 super-step 写入即落盘，重启后仍可恢复';
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let cut = text.length;
  while (cut > 1 && ctx.measureText(`${text.slice(0, cut)}…`).width > maxWidth) {
    cut -= 1;
  }
  return `${text.slice(0, cut)}…`;
}

function drawGraphStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
) {
  const names = ['START', 'nodeA', 'nodeB', 'END'];
  const slot = w / names.length;
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = MUTED;

  names.forEach((name, index) => {
    const cx = x + slot * index + slot / 2;
    ctx.beginPath();
    ctx.arc(cx, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = index === 0 || index === names.length - 1 ? MUTED : BLUE;
    ctx.fill();
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.fillText(name, cx, y + 22);
    if (index < names.length - 1) {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx + 8, y);
      ctx.lineTo(x + slot * (index + 1) + slot / 2 - 8, y);
      ctx.stroke();
    }
  });
  ctx.textAlign = 'left';
}

function drawChainRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  chain: SimCheckpoint[],
  lost: boolean,
  emptyLabel: string,
) {
  ctx.font = `700 13px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.fillText(label, x, y + 9);

  const top = y + 18;
  const gap = 14;

  if (chain.length === 0) {
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = lost ? RED : LINE;
    ctx.lineWidth = 1.4;
    roundedRect(ctx, x, top, w, h, 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = lost ? RED : MUTED;
    ctx.fillText(emptyLabel, x + 14, top + h / 2 + 4);
    return;
  }

  const cardWidth = Math.floor((w - gap * (chain.length - 1)) / chain.length);
  const accent = lost ? RED : BLUE;

  chain.forEach((ckpt, index) => {
    const cx = x + index * (cardWidth + gap);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    roundedRect(ctx, cx, top, cardWidth, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = accent;
    ctx.fillText(
      `step ${ckpt.step}`,
      cx + 10,
      top + 18,
    );

    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(
      fitText(
        ctx,
        ckpt.next ? `next: ${ckpt.next}` : 'next: []（完成）',
        cardWidth - 20,
      ),
      cx + 10,
      top + 34,
    );
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(ctx, `notes: ${ckpt.notes.join(',') || '[]'}`, cardWidth - 20),
      cx + 10,
      top + 49,
    );

    if (index < chain.length - 1) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx + cardWidth + 2, top + h / 2);
      ctx.lineTo(cx + cardWidth + gap - 3, top + h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + cardWidth + gap - 3, top + h / 2);
      ctx.lineTo(cx + cardWidth + gap - 7, top + h / 2 - 3.5);
      ctx.lineTo(cx + cardWidth + gap - 7, top + h / 2 + 3.5);
      ctx.closePath();
      ctx.fillStyle = accent;
      ctx.fill();
    }
  });
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: ExampleOptions = {
    checkpointerKind: 'memory',
    stepsThread1: 4,
    stepsThread2: 2,
    restarted: false,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = 36;
    const inner = width - pad * 2;

    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('一个图 × 两个 thread × 三种存储', pad, pad + 4);

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'right';
    ctx.fillText(
      current.restarted ? '已模拟进程重启' : '进程运行中',
      width - pad,
      pad + 4,
    );
    ctx.textAlign = 'left';

    drawGraphStrip(ctx, pad + 20, pad + 34, inner - 40);

    const chainTop = pad + 92;
    const chainHeight = 64;
    const rowGap = 52;

    const lost = (kind: CheckpointerKind) =>
      current.restarted && kind !== 'postgres';

    const chain1 = visibleChain(
      current.checkpointerKind,
      current.stepsThread1,
      current.restarted,
    );
    const chain2 = visibleChain(
      current.checkpointerKind,
      current.stepsThread2,
      current.restarted,
    );

    // 空链的三种原因：未运行 / 无 checkpointer / 重启后丢失
    const emptyLabelFor = (steps: number): string => {
      if (current.checkpointerKind === 'none') {
        return '（无 checkpointer：不产生 checkpoint，state 只活在进程内存里）';
      }
      if (steps === 0) {
        return '（该 thread 尚未 invoke）';
      }
      return '重启后：无可恢复状态';
    };

    drawChainRow(
      ctx,
      pad,
      chainTop,
      inner,
      chainHeight,
      "thread_id: 't1'",
      chain1,
      lost(current.checkpointerKind) && current.stepsThread1 > 0,
      emptyLabelFor(current.stepsThread1),
    );
    drawChainRow(
      ctx,
      pad,
      chainTop + chainHeight + rowGap,
      inner,
      chainHeight,
      "thread_id: 't2'",
      chain2,
      lost(current.checkpointerKind) && current.stepsThread2 > 0,
      emptyLabelFor(current.stepsThread2),
    );

    const summaryY = chainTop + (chainHeight + rowGap) * 2 + 18;
    ctx.fillStyle = current.restarted && current.checkpointerKind === 'memory'
      ? RED
      : current.checkpointerKind === 'postgres'
        ? GREEN
        : MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(fitText(ctx, summaryLine(current), inner), pad, summaryY);

    const recoverable: ExampleSnapshot['recoverable'] = !current.restarted
      ? '—'
      : current.checkpointerKind === 'postgres'
        ? '是'
        : '否';

    emit({
      thread1Count: chain1.length,
      thread2Count: chain2.length,
      recoverable,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
