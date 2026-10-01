/**
 * 范例介绍：确定性回放一条预置的 LangSmith trace（weather-agent 一次带工具
 * 错误的完整回合），演示「慢 / 贵 / 错」三个排查入口如何定位到 run 树上的
 * 具体 run。控件只有一个：排查入口；切换入口只改变高亮目标与定位结论，
 * 不改变 trace 本身——这正是排查的语义：入口是问题，run 树是答案。
 * 输入：entry（latency=慢 / cost=贵 / error=错）。
 * 预期结果：慢 → 高亮 get_weather（外部 API 超时 2.6s，占 52%）；贵 → 高亮
 * 第 2 次 ChatOpenAI（$0.0031 占 65%，输入比第 1 次多 126 token——上下文只增
 * 不减）；错 → 高亮 get_weather（status=error，读 error 字段而非时间区间）。
 * 数据为按官方 run（span）数据格式字段构造的示意值：耗时、token、成本
 * 三者相互自洽（成本按 $1.25/M 输入、$10/M 输出换算），不依赖 @langchain/*。
 * 阅读主线：先看 TRACE / RUNS 常量（一条 trace 的单一真源），再看
 * targetFor() 如何按入口定位，最后看 draw() 如何呈现瀑布与结论。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TriageEntry = 'latency' | 'cost' | 'error';

export interface ExampleArgs {
  entry: TriageEntry;
}

/** run_type 取三种最常见形态；字段名对齐官方 run（span）数据格式。 */
type RunType = 'chain' | 'llm' | 'tool';

interface TraceRun {
  name: string;
  runType: RunType;
  /** 层级深度：0 = 根 run（聚合整条 trace），1 = agent 循环内的一步。 */
  depth: number;
  /** 相对 trace 起点的区间（毫秒），瀑布条按它定位。 */
  startMs: number;
  endMs: number;
  /** 流式模型 run 才有：首 token 相对本 run 开始的时刻。 */
  firstTokenMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  costUsd?: number;
  status: 'success' | 'error';
  /** 行右侧的回查摘要：耗时 / token / 成本 / 状态。 */
  stats: string;
}

/** trace 头：UI 里点开一行 trace 时先看到的汇总。 */
const TRACE = {
  project: 'weather-agent-dev',
  thread: 'demo',
  totalMs: 5000,
  promptTokens: 2334,
  completionTokens: 194,
  totalTokens: 2528,
  totalCostUsd: 0.0049,
};

/**
 * 一次 agent.invoke 留下的 run 树：根 run（chain）聚合整条 trace；模型
 * 决定调工具（llm #1）→ 工具超时报错（tool）→ 模型消化失败给出最终回复
 * （llm #2）。第二轮输入 = 第一轮输入 + tool_call 消息 + 工具报错消息，
 * 多出的 126 token 就是「上下文只增不减」的直接证据。
 */
const RUNS: TraceRun[] = [
  {
    name: 'agent',
    runType: 'chain',
    depth: 0,
    startMs: 0,
    endMs: 5000,
    promptTokens: 2334,
    completionTokens: 194,
    costUsd: 0.0049,
    status: 'success',
    stats: '5.0s · 2,528 tok · $0.0049',
  },
  {
    name: 'ChatOpenAI',
    runType: 'llm',
    depth: 1,
    startMs: 150,
    endMs: 1050,
    firstTokenMs: 420,
    promptTokens: 1104,
    completionTokens: 38,
    costUsd: 0.0018,
    status: 'success',
    stats: '0.9s · in 1,104 / out 38 · $0.0018',
  },
  {
    name: 'get_weather',
    runType: 'tool',
    depth: 1,
    startMs: 1050,
    endMs: 3650,
    status: 'error',
    stats: '2.6s · status=error',
  },
  {
    name: 'ChatOpenAI',
    runType: 'llm',
    depth: 1,
    startMs: 3650,
    endMs: 5000,
    firstTokenMs: 620,
    promptTokens: 1230,
    completionTokens: 156,
    costUsd: 0.0031,
    status: 'success',
    stats: '1.35s · in 1,230 / out 156 · $0.0031',
  },
];

/**
 * 按排查入口定位目标 run：根 run 聚合整条 trace，永远最长最贵，
 * 定位时排除它，只在具体执行步骤里找答案。
 */
export function targetFor(entry: TriageEntry): TraceRun {
  const steps = RUNS.filter((run) => run.depth > 0);
  if (entry === 'error') {
    const failed = steps.find((run) => run.status === 'error');
    if (!failed) {
      throw new Error('预置 trace 中没有 error run。');
    }
    return failed;
  }
  if (entry === 'cost') {
    return steps.reduce((best, run) => ((run.costUsd ?? 0) > (best.costUsd ?? 0) ? run : best));
  }
  return steps.reduce((best, run) =>
    run.endMs - run.startMs > best.endMs - best.startMs ? run : best,
  );
}

/** 每个入口的定位结论：与正文断言一一对应。 */
function footnoteFor(entry: TriageEntry): string {
  if (entry === 'latency') {
    return '慢 → get_weather：start→end 区间 2.6s，占全 trace 52%——外部 API 超时，先查工具与外部依赖，不是模型慢';
  }
  if (entry === 'cost') {
    return '贵 → 第 2 次 ChatOpenAI：$0.0031 占 64%，输入 1,230 比第 1 次多的 126 token 是上一轮 tool_call 与报错消息——上下文只增不减';
  }
  return '错 → get_weather：status=error，error 字段写明 Weather API timeout——与「慢」落到同一个 run，但读的是 error 字段';
}

export interface ExampleSnapshot {
  entry: TriageEntry;
  targetName: string;
  totalMs: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const COLOR = {
  title: '#172033',
  sub: '#64748b',
  text: '#334155',
  ghost: '#b6c2d1',
  grid: '#e6ecf5',
  chain: '#4f7cff',
  llm: '#7c6bb0',
  tool: '#b45309',
  error: '#b91c1c',
  highlight: '#0f172a',
};

function runColor(runType: RunType): string {
  if (runType === 'llm') {
    return COLOR.llm;
  }
  if (runType === 'tool') {
    return COLOR.tool;
  }
  return COLOR.chain;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  args: ExampleArgs,
): void {
  ctx.clearRect(0, 0, width, height);
  const target = targetFor(args.entry);
  const pad = 36;

  ctx.fillStyle = COLOR.title;
  ctx.font = `600 15.5px ${SANS}`;
  ctx.fillText('同一条 trace，三个排查入口各定位到哪里', pad, 36);

  ctx.fillStyle = COLOR.sub;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(
    `project: ${TRACE.project} · thread: ${TRACE.thread} · status: success`,
    pad,
    58,
  );

  // 图例：run_type 配色 + 错误标记，与瀑布条一一对应。
  const legend = [
    ['chain', COLOR.chain],
    ['llm', COLOR.llm],
    ['tool', COLOR.tool],
  ] as const;
  let legendX = width - pad;
  ctx.font = `10.5px ${MONO}`;
  const errorText = '✕ error';
  legendX -= ctx.measureText(errorText).width;
  ctx.fillStyle = COLOR.error;
  ctx.fillText(errorText, legendX, 58);
  legendX -= 10;
  for (const [label, color] of [...legend].reverse()) {
    legendX -= ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillText(label, legendX, 58);
    legendX -= 14;
    ctx.fillStyle = color;
    ctx.fillRect(legendX - 8, 49, 8, 8);
    legendX -= 8;
  }

  // 瀑布区：左侧名称列 + 右侧时间轴；x(t) 把相对毫秒映射到像素。
  const chartTop = 84;
  const chartBottom = height - 66;
  const nameColumnWidth = 132;
  const axisX0 = pad + nameColumnWidth;
  const axisX1 = width - pad;
  const timeToX = (ms: number): number =>
    axisX0 + (ms / TRACE.totalMs) * (axisX1 - axisX0);

  for (let second = 0; second <= TRACE.totalMs / 1000; second += 1) {
    const x = timeToX(second * 1000);
    ctx.strokeStyle = COLOR.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, chartTop);
    ctx.lineTo(x, chartBottom - 14);
    ctx.stroke();
    ctx.fillStyle = COLOR.ghost;
    ctx.font = `10px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(second === 0 ? '0' : `${second}s`, x, chartBottom - 2);
    ctx.textAlign = 'left';
  }

  const rowHeight = (chartBottom - chartTop - 18) / RUNS.length;
  RUNS.forEach((run, index) => {
    const rowTop = chartTop + index * rowHeight;
    const isTarget = run === target;
    const alpha = isTarget || run.depth === 0 ? 1 : 0.28;

    // 名称行：缩进表达层级；名称 + 着色 run_type；目标 run 加深加粗。
    ctx.globalAlpha = run.depth === 0 && !isTarget ? 0.75 : alpha;
    ctx.fillStyle = isTarget ? COLOR.highlight : COLOR.text;
    ctx.font = `600 11.5px ${MONO}`;
    ctx.fillText(
      `${run.depth > 0 ? '└ ' : ''}${run.name}`,
      pad + run.depth * 14,
      rowTop + 16,
    );
    const nameWidth = ctx.measureText(`${run.depth > 0 ? '└ ' : ''}${run.name}`).width;
    ctx.fillStyle = runColor(run.runType);
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(run.runType, pad + run.depth * 14 + nameWidth + 8, rowTop + 16);

    // 行右侧回查摘要：这一层各自记录什么的一句话投影。
    ctx.fillStyle = COLOR.sub;
    ctx.textAlign = 'right';
    ctx.fillText(run.stats, width - pad, rowTop + 16);
    ctx.textAlign = 'left';

    // 瀑布条：根 run 铺满整条 trace 且淡化；子 run 按区间落位。
    const barLeft = timeToX(run.startMs);
    const barRight = timeToX(run.endMs);
    const barWidth = Math.max(4, barRight - barLeft);
    const barY = rowTop + 28;
    const color = run.status === 'error' ? COLOR.error : runColor(run.runType);
    ctx.globalAlpha = run.depth === 0 ? 0.32 : alpha * 0.9;
    ctx.fillStyle = color;
    roundedRect(ctx, barLeft, barY, barWidth, 13, 4);
    ctx.fill();
    if (run.depth > 0) {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = isTarget ? COLOR.highlight : color;
      ctx.lineWidth = isTarget ? 2 : 1;
      ctx.stroke();
    }

    // 首 token 分界：把 llm run 的耗时切成「等首 token」与「生成中」两段。
    if (run.firstTokenMs !== undefined && barWidth > 56) {
      const markerX = barLeft + (run.firstTokenMs / (run.endMs - run.startMs)) * barWidth;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = COLOR.sub;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(markerX, barY - 3);
      ctx.lineTo(markerX, barY + 16);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLOR.sub;
      ctx.font = `9.5px ${SANS}`;
      ctx.fillText('首 token', markerX + 4, barY + 24);
    }

    ctx.globalAlpha = 1;
  });

  // 定位结论：与正文断言对应的可观察证据。
  ctx.fillStyle = COLOR.sub;
  ctx.font = `11.5px ${SANS}`;
  ctx.fillText(fitText(ctx, footnoteFor(args.entry), width - pad * 2), pad, height - 40);
  ctx.fillStyle = COLOR.ghost;
  ctx.font = `10.5px ${SANS}`;
  ctx.fillText(
    fitText(
      ctx,
      '读法：入口是问题（慢 / 贵 / 错），run 树是答案——不同入口可能落到同一个 run，但读的字段不同',
      width - pad * 2,
    ),
    pad,
    height - 20,
  );
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleArgs = { entry: 'latency' };

  function drawCurrent(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    draw(drawingContext, width, height, current);
    emit({
      entry: current.entry,
      targetName: targetFor(current.entry).name,
      totalMs: TRACE.totalMs,
      totalTokens: TRACE.totalTokens,
      totalCostUsd: TRACE.totalCostUsd,
    });
  }

  const resizeObserver = createResizeObserver(canvas, drawCurrent);

  return {
    update(options) {
      current = options;
      drawCurrent();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
