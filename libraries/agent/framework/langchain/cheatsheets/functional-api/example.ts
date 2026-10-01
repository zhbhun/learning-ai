/**
 * 范例介绍：两段确定性模拟，正文断言的可核对证据。
 * 1. createBoundaryExample：task 边界对执行语义的影响——固定流程
 *    enrich → fetch（fetch 第一次执行必失败），模拟 run 1 与恢复
 *    invoke(null, config) 两次执行轨迹：已完成 task 从 checkpoint 恢复、
 *    失败 task 重跑、非 task 普通代码重放；fetch 带 retry 策略时失败在
 *    task 内被消化，流程不中断。
 * 2. createMemoryExample：previous 前值——固定输入序列 [3, 1, 5] 连续三次
 *    调用同一 thread，展示 previous 读到什么、调用者拿到什么、checkpoint
 *    保存什么；entrypoint.final 解耦返回值与保存值。
 * 输入或前置状态：Controls 提供的开关（enrich 是否包成 task、fetch 是否带
 * retry、是否用 final 解耦）；纯本地 TS 模拟，不依赖 @langchain/*，
 * 不发起模型调用。
 * 主要操作：切换任一开关。
 * 预期结果：执行轨迹卡片与计数读数同步变化，与正文 replay-probe /
 * previous-acc 两个脚本的实测计数一致。阅读主线：simulateBoundary 与
 * simulateMemory 的规则实现。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/* ------------------------------------------------------------------ */
/* Boundary：task 边界模拟                                              */
/* ------------------------------------------------------------------ */

export interface BoundaryOptions {
  enrichIsTask: boolean;
  fetchHasRetry: boolean;
}

export type StepOutcome =
  | 'ran' // 执行成功
  | 'failed' // 执行失败
  | 'restored' // 从 checkpoint 恢复（不执行）
  | 'rerun' // 重新执行
  | 'retried' // 首次失败后按策略重试成功
  | 'not-reached'; // 未到达（在其之前失败）

export interface TraceStep {
  label: string;
  isTask: boolean;
  outcome: StepOutcome;
}

export interface BoundaryTrace {
  title: string;
  status: 'failed' | 'succeeded' | 'not-needed';
  steps: TraceStep[];
}

export interface BoundaryResult {
  run1: BoundaryTrace;
  resume: BoundaryTrace;
  enrichRuns: number;
  fetchAttempts: number;
  outcomeLabel: string;
}

export interface BoundarySnapshot {
  enrichRuns: number;
  fetchAttempts: number;
  outcomeLabel: string;
}

export interface BoundaryInstance {
  update(options: BoundaryOptions): void;
  dispose(): void;
}

// 模拟规则与正文「重放与恢复」一致：恢复时 entrypoint 从头重放；
// 已完成 task 从 checkpoint 恢复、失败 task 重跑、普通代码重放。
// premise：fetch 第一次执行必失败；恢复前视为已修复；retry 模拟 maxAttempts=3。
export function simulateBoundary(options: BoundaryOptions): BoundaryResult {
  let enrichRuns = 0;
  let fetchAttempts = 0;

  // run 1：enrich 执行成功；fetch 首次失败
  enrichRuns += 1;
  fetchAttempts += 1;

  const run1Steps: TraceStep[] = [
    {
      label: 'enrich',
      isTask: options.enrichIsTask,
      outcome: 'ran',
    },
    {
      label: 'fetch',
      isTask: true,
      outcome: options.fetchHasRetry ? 'retried' : 'failed',
    },
  ];

  if (options.fetchHasRetry) {
    // retry 在 task 内消化失败：第 2 次尝试成功，流程完成，无需恢复
    fetchAttempts += 1;
    return {
      run1: { title: 'run 1', status: 'succeeded', steps: run1Steps },
      resume: { title: 'resume', status: 'not-needed', steps: [] },
      enrichRuns,
      fetchAttempts,
      outcomeLabel: '重试成功，无需恢复',
    };
  }

  // run 1 失败上抛；恢复：invoke(null, config)，entrypoint 从头重放
  const resumeSteps: TraceStep[] = [
    {
      label: 'enrich',
      isTask: options.enrichIsTask,
      outcome: options.enrichIsTask ? 'restored' : 'rerun',
    },
    {
      label: 'fetch',
      isTask: true,
      outcome: 'rerun', // 已修复，重跑成功
    },
  ];
  if (!options.enrichIsTask) {
    enrichRuns += 1; // 普通代码重放时重新执行
  }
  fetchAttempts += 1;

  return {
    run1: { title: 'run 1', status: 'failed', steps: run1Steps },
    resume: { title: 'resume：invoke(null)', status: 'succeeded', steps: resumeSteps },
    enrichRuns,
    fetchAttempts,
    outcomeLabel: options.enrichIsTask
      ? 'enrich 恢复，fetch 重跑'
      : 'enrich 重放，fetch 重跑',
  };
}

const OUTCOME_TEXT: Record<StepOutcome, string> = {
  ran: '执行成功',
  failed: '失败 → 上抛',
  restored: 'checkpoint 恢复',
  rerun: '重新执行',
  retried: '重试成功',
  'not-reached': '未到达',
};

const OUTCOME_COLOR: Record<StepOutcome, string> = {
  ran: '#2f855a',
  failed: '#c53030',
  restored: '#4f7cff',
  rerun: '#b7791f',
  retried: '#2f855a',
  'not-reached': '#94a3b8',
};

export function createBoundaryExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BoundarySnapshot) => void,
): BoundaryInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: BoundaryOptions = { enrichIsTask: true, fetchHasRetry: false };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(400, size.width);
    const height = Math.max(360, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const result = simulateBoundary(current);
    const pad = 32;

    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('task 边界对恢复语义的影响', pad, pad + 4);

    ctx.fillStyle = MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(
      '固定流程 enrich → fetch，fetch 第一次执行必失败；恢复 = invoke(null, config)',
      pad,
      pad + 24,
    );

    // 两行执行轨迹：run 1 与 resume；底部预留计数条与底注
    const traceTop = pad + 44;
    const traceHeight = (height - traceTop - 88) / 2;
    drawTrace(
      ctx,
      pad,
      traceTop,
      width - pad * 2,
      traceHeight,
      result.run1,
    );
    drawTrace(
      ctx,
      pad,
      traceTop + traceHeight + 12,
      width - pad * 2,
      traceHeight,
      result.resume,
    );

    // 底部计数条
    const barY = height - 62;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    roundedRect(ctx, pad, barY, width - pad * 2, 44, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(
      `enrich 执行 ${result.enrichRuns} 次（task=${current.enrichIsTask ? '是' : '否'}）`,
      pad + 16,
      barY + 27,
    );
    ctx.fillText(
      `fetch 尝试 ${result.fetchAttempts} 次`,
      pad + 16 + (width - pad * 2) * 0.4,
      barY + 27,
    );
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(ctx, result.outcomeLabel, (width - pad * 2) * 0.35),
      pad + 16 + (width - pad * 2) * 0.62,
      barY + 27,
    );

    ctx.fillStyle = MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(
      '规则与正文 replay-probe 实测计数一致：task 恢复、普通代码重放',
      pad,
      height - 12,
    );

    emit({
      enrichRuns: result.enrichRuns,
      fetchAttempts: result.fetchAttempts,
      outcomeLabel: result.outcomeLabel,
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

function drawTrace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  trace: BoundaryTrace,
) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  roundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.font = `700 13px ${FONT}`;
  ctx.fillStyle = trace.status === 'failed' ? '#c53030' : trace.status === 'not-needed' ? MUTED : '#2f855a';
  const statusText =
    trace.status === 'failed'
      ? '（流程中断：错误上抛）'
      : trace.status === 'not-needed'
        ? '（run 1 已成功，无需恢复）'
        : '（流程完成）';
  ctx.fillText(`${trace.title} ${statusText}`, x + 14, y + 22);

  if (trace.steps.length === 0) {
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText('retry 在 task 内消化了失败，不产生恢复场景', x + 14, y + h / 2 + 4);
    return;
  }

  const rowAreaTop = y + 32;
  const rowAreaH = h - 38;
  const rowH = Math.min(
    26,
    Math.max(14, rowAreaH / trace.steps.length - 4),
  );
  trace.steps.forEach((step, index) => {
    const rowY = rowAreaTop + index * (rowH + 4);
    if (rowY + rowH > y + h - 4) {
      return;
    }

    // 步骤名 + task 徽标
    ctx.font = `600 13px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText(step.label, x + 14, rowY + rowH / 2 + 4.5);

    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = step.isTask ? BLUE : MUTED;
    ctx.fillText(step.isTask ? '[task]' : '[普通]', x + 74, rowY + rowH / 2 + 4.5);

    // 结果 chip
    const chipText = OUTCOME_TEXT[step.outcome];
    ctx.font = `12px ${FONT}`;
    const chipW = ctx.measureText(chipText).width + 20;
    const chipX = x + w - chipW - 14;
    ctx.strokeStyle = OUTCOME_COLOR[step.outcome];
    ctx.lineWidth = 1.3;
    roundedRect(ctx, chipX, rowY, chipW, rowH, rowH / 2);
    ctx.stroke();
    ctx.fillStyle = OUTCOME_COLOR[step.outcome];
    ctx.fillText(chipText, chipX + 10, rowY + rowH / 2 + 4.5);
  });
}

/* ------------------------------------------------------------------ */
/* Memory：previous 前值模拟                                            */
/* ------------------------------------------------------------------ */

export interface MemoryOptions {
  useFinal: boolean;
}

export interface MemoryRow {
  input: number;
  previous: number | undefined;
  returned: string | number;
  saved: number;
}

export interface MemoryResult {
  rows: MemoryRow[];
}

export interface MemorySnapshot {
  lastReturned: string;
  totalSaved: number;
  modeLabel: string;
}

export interface MemoryInstance {
  update(options: MemoryOptions): void;
  dispose(): void;
}

// 模拟规则与正文 previous-acc 脚本一致：previous 读上次保存值，首跑 undefined；
// 不用 final 时保存值 = 返回值；用 final 时 value 返回、save 保存。
const MEMORY_INPUTS = [3, 1, 5];

export function simulateMemory(options: MemoryOptions): MemoryResult {
  const rows: MemoryRow[] = [];
  let saved: number | undefined;

  for (const n of MEMORY_INPUTS) {
    const previous = saved;
    const sum = (previous ?? 0) + n;
    if (options.useFinal) {
      // entrypoint.final({ value: 上次的值, save: 新累计 })
      rows.push({
        input: n,
        previous,
        returned: previous === undefined ? 0 : previous,
        saved: sum,
      });
      saved = sum;
    } else {
      // 默认：保存返回值本身
      rows.push({ input: n, previous, returned: sum, saved: sum });
      saved = sum;
    }
  }

  return { rows };
}

export function createMemoryExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MemorySnapshot) => void,
): MemoryInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: MemoryOptions = { useFinal: false };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(400, size.width);
    const height = Math.max(320, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { rows } = simulateMemory(current);
    const pad = 32;

    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('previous：同 thread 的跨调用记忆', pad, pad + 4);

    ctx.fillStyle = MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(
      `同一 thread 连续三次调用，输入固定为 [${MEMORY_INPUTS.join(', ')}]`,
      pad,
      pad + 24,
    );

    // 表格：输入 | previous 读到 | 调用者拿到 | checkpoint 保存
    const tableTop = pad + 44;
    const tableH = height - tableTop - 60;
    const headers = ['invoke(n)', 'previous 读到', '调用者拿到', 'checkpoint 保存'];
    const colW = (width - pad * 2) / headers.length;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    roundedRect(ctx, pad, tableTop, width - pad * 2, tableH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = MUTED;
    headers.forEach((header, index) => {
      ctx.fillText(header, pad + 16 + index * colW, tableTop + 24);
    });
    ctx.strokeStyle = '#eef2f8';
    ctx.beginPath();
    ctx.moveTo(pad + 12, tableTop + 34);
    ctx.lineTo(width - pad - 12, tableTop + 34);
    ctx.stroke();

    const rowH = (tableH - 44) / rows.length;
    rows.forEach((row, index) => {
      const rowY = tableTop + 44 + index * rowH;
      const cellW = colW - 12;

      ctx.font = `13px ${MONO}`;
      ctx.fillStyle = INK;
      ctx.fillText(
        fitText(ctx, String(row.input), cellW),
        pad + 16,
        rowY + rowH / 2 + 4.5,
      );

      ctx.fillStyle = row.previous === undefined ? MUTED : INK;
      ctx.fillText(
        fitText(
          ctx,
          row.previous === undefined ? 'undefined（首跑）' : String(row.previous),
          cellW,
        ),
        pad + 16 + colW,
        rowY + rowH / 2 + 4.5,
      );

      ctx.fillStyle = BLUE;
      ctx.font = `600 13px ${MONO}`;
      ctx.fillText(
        fitText(ctx, String(row.returned), cellW),
        pad + 16 + colW * 2,
        rowY + rowH / 2 + 4.5,
      );

      ctx.fillStyle = '#2f855a';
      ctx.fillText(
        fitText(ctx, String(row.saved), cellW),
        pad + 16 + colW * 3,
        rowY + rowH / 2 + 4.5,
      );
    });

    const last = rows.at(-1);
    ctx.fillStyle = MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(
      current.useFinal
        ? 'entrypoint.final：调用者拿到上次的累计，checkpoint 保存新累计（两个数字分家）'
        : '默认：保存的就是返回值，previous 读到上次返回值',
      pad,
      height - 14,
    );

    emit({
      lastReturned: String(last?.returned ?? ''),
      totalSaved: last?.saved ?? 0,
      modeLabel: current.useFinal ? 'final 解耦' : '默认（保存返回值）',
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

/* ------------------------------------------------------------------ */
/* 共享绘制 helper                                                      */
/* ------------------------------------------------------------------ */

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const LINE = '#dbe3f0';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

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
