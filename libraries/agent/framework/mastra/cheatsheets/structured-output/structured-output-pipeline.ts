/**
 * 范例介绍：离线演示 structuredOutput 校验失败时 errorStrategy 的三种结局（不调用真实 LLM）。
 * 演示内容：agent.generate 的 structuredOutput 选项包——schema 定义结果形状，errorStrategy
 *          决定「解析或 schema 校验失败」时 strict / warn / fallback 各自发生什么。
 * 输入：errorStrategy（strict / warn / fallback）、simulateFailure（模拟模型输出无法通过校验）。
 * 操作：切换两个控件，观察第 4 列结局卡、底部策略对照与左下角读数。
 * 预期结果：校验通过时一律返回 response.object；失败时 strict 抛出错误（没有 response）、
 *          warn 记录警告后继续、fallback 返回 fallbackValue 且 usedFallbackValue 为 true。
 * 阅读主线：runStructuredPipeline() 模拟 generate 内部的校验与分派，draw() 只负责呈现。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export const STRATEGIES = ['strict', 'warn', 'fallback'] as const;
export type ErrorStrategy = (typeof STRATEGIES)[number];

export interface StructuredOutputArgs {
  errorStrategy: ErrorStrategy;
  simulateFailure: boolean;
}

export type PipelineOutcome = 'object' | 'warn-object' | 'fallback' | 'throw';

export interface StructuredOutputSnapshot {
  failed: boolean;
  strategy: ErrorStrategy;
  outcome: PipelineOutcome;
  /** null 表示调用已抛错，没有 response 可拿 */
  usedFallbackValue: boolean | null;
}

export interface StructuredOutputInstance {
  update(args: StructuredOutputArgs): void;
  dispose(): void;
}

// —— 与官方示例对齐的演示 schema：z.object({ summary, priority }) ——

type PlanObject = { summary: string; priority: string };

const VALID_OBJECT: PlanObject = {
  summary: '上午写周报，下午评审需求文档。',
  priority: 'high',
};
const FALLBACK_VALUE: PlanObject = {
  summary: '本次未能生成计划，请稍后重试。',
  priority: 'low',
};
// 校验失败样本：summary 应为 string、priority 只允许 'low' | 'high'
const BAD_OUTPUT_TEXT = '{"summary": 123, "priority": "ASAP"}';

function isPlanObject(value: unknown): value is PlanObject {
  if (typeof value !== 'object' || value === null) return false;
  const plan = value as PlanObject;
  return (
    typeof plan.summary === 'string' &&
    (plan.priority === 'low' || plan.priority === 'high')
  );
}

// 模拟 generate({ structuredOutput }) 的校验与 errorStrategy 分派
export function runStructuredPipeline(
  args: StructuredOutputArgs,
): StructuredOutputSnapshot {
  // 模拟模型输出：simulateFailure 时给一份类型不符的 JSON，否则给合法对象
  const raw: unknown = args.simulateFailure
    ? JSON.parse(BAD_OUTPUT_TEXT)
    : VALID_OBJECT;

  // 校验通过：errorStrategy 不参与，直接给出 response.object
  if (isPlanObject(raw)) {
    return {
      failed: false,
      strategy: args.errorStrategy,
      outcome: 'object',
      usedFallbackValue: false,
    };
  }
  // 校验失败：三种策略对应三种结局
  switch (args.errorStrategy) {
    case 'strict':
      // 默认策略：立刻抛错，generate 整体 reject，连 response 都没有
      return {
        failed: true,
        strategy: args.errorStrategy,
        outcome: 'throw',
        usedFallbackValue: null,
      };
    case 'warn':
      // 记录警告并继续，调用不中断
      return {
        failed: true,
        strategy: args.errorStrategy,
        outcome: 'warn-object',
        usedFallbackValue: false,
      };
    case 'fallback':
      // 返回兜底值，用 usedFallbackValue 标记「这是替换数据」
      return {
        failed: true,
        strategy: args.errorStrategy,
        outcome: 'fallback',
        usedFallbackValue: true,
      };
  }
}

export function createStructuredOutputPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StructuredOutputSnapshot) => void,
): StructuredOutputInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: StructuredOutputArgs = {
    errorStrategy: 'strict',
    simulateFailure: true,
  };

  const MONO = '12px ui-monospace, SFMono-Regular, Menlo, monospace';

  function roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
    stroke: string,
  ) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function text(
    value: string,
    x: number,
    y: number,
    color: string,
    font = '13px ui-sans-serif, system-ui, sans-serif',
  ) {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(value, x, y);
  }

  function arrow(x1: number, y1: number, x2: number, y2: number, color: string) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - 8 * Math.cos(angle - Math.PI / 6),
      y2 - 8 * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      x2 - 8 * Math.cos(angle + Math.PI / 6),
      y2 - 8 * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const snapshot = runStructuredPipeline(current);
    emit(snapshot);

    const P = 28;
    const gap = 10;
    const colW = (width - 2 * P - 3 * gap) / 4;
    const rowY = 88;
    const rowH = 142;
    const midY = rowY + rowH / 2;

    text(
      '同一 prompt 的两种结局：errorStrategy 决定校验失败时怎么办',
      P,
      38,
      '#172033',
      '600 16px ui-sans-serif, system-ui, sans-serif',
    );
    text(
      'generate(prompt, { structuredOutput: { schema, errorStrategy } })',
      P,
      60,
      '#64748b',
      MONO,
    );

    const x1 = P;
    const x2 = P + (colW + gap);
    const x3 = P + 2 * (colW + gap);
    const x4 = P + 3 * (colW + gap);

    // 第 1 列：generate 调用与 structuredOutput 选项
    roundRect(x1, rowY, colW, rowH, 10, '#f8fafc', '#cbd5e1');
    text('generate 调用', x1 + 14, rowY + 24, '#172033', '600 13px ui-sans-serif, system-ui, sans-serif');
    text('prompt: 帮我排今天的计划', x1 + 14, rowY + 48, '#4f7cff', MONO);
    text('structuredOutput: {', x1 + 14, rowY + 70, '#64748b', MONO);
    text('  schema,', x1 + 14, rowY + 88, '#64748b', MONO);
    text(
      `  errorStrategy: '${snapshot.strategy}'`,
      x1 + 14,
      rowY + 106,
      '#4f7cff',
      MONO,
    );
    text('}', x1 + 14, rowY + 124, '#64748b', MONO);

    // 第 2 列：模型原始输出（成功 = 合法 JSON；失败 = 类型不符）
    const bad = snapshot.failed;
    roundRect(x2, rowY, colW, rowH, 10, bad ? '#fef2f2' : '#f8fafc', bad ? '#dc2626' : '#cbd5e1');
    text('模型输出', x2 + 14, rowY + 24, '#172033', '600 13px ui-sans-serif, system-ui, sans-serif');
    if (bad) {
      text('{ "summary": 123,', x2 + 14, rowY + 50, '#dc2626', MONO);
      text('  "priority": "ASAP" }', x2 + 14, rowY + 68, '#dc2626', MONO);
      text('summary 给了数字', x2 + 14, rowY + 94, '#b91c1c');
      text('priority 超出枚举', x2 + 14, rowY + 112, '#b91c1c');
    } else {
      text(
        `{ "summary": "${VALID_OBJECT.summary.slice(0, 6)}…",`,
        x2 + 14,
        rowY + 50,
        '#16a34a',
        MONO,
      );
      text('  "priority": "high" }', x2 + 14, rowY + 68, '#16a34a', MONO);
      text('符合 schema', x2 + 14, rowY + 94, '#15803d');
    }

    // 第 3 列：解析 + schema 校验
    roundRect(x3, rowY, colW, rowH, 10, '#f8fafc', '#cbd5e1');
    text('解析 + schema 校验', x3 + 14, rowY + 24, '#172033', '600 13px ui-sans-serif, system-ui, sans-serif');
    if (bad) {
      text('✗ 校验失败', x3 + 14, rowY + 62, '#dc2626', '700 17px ui-sans-serif, system-ui, sans-serif');
      text('交给 errorStrategy', x3 + 14, rowY + 88, '#b91c1c');
      text('决定结局', x3 + 14, rowY + 106, '#b91c1c');
    } else {
      text('✓ 通过', x3 + 14, rowY + 62, '#16a34a', '700 17px ui-sans-serif, system-ui, sans-serif');
      text('response.object 就绪', x3 + 14, rowY + 88, '#15803d');
    }

    // 第 4 列：结局卡——按当前组合展示 generate 的最终表现
    const outcomeCards: Record<
      PipelineOutcome,
      { fill: string; stroke: string; title: string; titleColor: string; lines: string[] }
    > = {
      object: {
        fill: '#f0fdf4',
        stroke: '#16a34a',
        title: 'response.object',
        titleColor: '#15803d',
        lines: [
          `summary: "${VALID_OBJECT.summary.slice(0, 6)}…"`,
          'priority: "high"',
          'usedFallbackValue: false',
        ],
      },
      'warn-object': {
        fill: '#fffbeb',
        stroke: '#d97706',
        title: '警告后继续',
        titleColor: '#b45309',
        lines: ['console.warn 已记录', '调用不中断', 'usedFallbackValue: false'],
      },
      fallback: {
        fill: '#eff6ff',
        stroke: '#2563eb',
        title: 'fallbackValue',
        titleColor: '#1d4ed8',
        lines: [
          `summary: "${FALLBACK_VALUE.summary.slice(0, 6)}…"`,
          'priority: "low"',
          'usedFallbackValue: true',
        ],
      },
      throw: {
        fill: '#fef2f2',
        stroke: '#dc2626',
        title: '抛出错误',
        titleColor: '#b91c1c',
        lines: ['generate 整体 reject', '没有 response', '需 try/catch 处理'],
      },
    };
    const card = outcomeCards[snapshot.outcome];
    roundRect(x4, rowY, colW, rowH, 10, card.fill, card.stroke);
    text('结局', x4 + 14, rowY + 24, '#172033', '600 13px ui-sans-serif, system-ui, sans-serif');
    text(card.title, x4 + 14, rowY + 54, card.titleColor, '700 13px ui-monospace, SFMono-Regular, Menlo, monospace');
    card.lines.forEach((line, i) => {
      text(line, x4 + 14, rowY + 82 + i * 18, '#475569', MONO);
    });

    // 箭头：失败时校验之后的链路换成结局卡的颜色
    arrow(x1 + colW, midY, x2 - 2, midY, '#475569');
    arrow(x2 + colW, midY, x3 - 2, midY, bad ? '#dc2626' : '#16a34a');
    arrow(x3 + colW, midY, x4 - 2, midY, bad ? card.stroke : '#16a34a');

    // 底部：三种策略对照（校验通过时全部置灰，均不触发）
    const miniY = rowY + rowH + 22;
    const miniH = 54;
    const miniW = (width - 2 * P - 2 * gap) / 3;
    const strategyMeta: Array<{ key: ErrorStrategy; desc: string }> = [
      { key: 'strict', desc: '失败即抛错（默认）' },
      { key: 'warn', desc: '警告后继续' },
      { key: 'fallback', desc: '返回 fallbackValue' },
    ];
    strategyMeta.forEach((item, i) => {
      const mx = P + i * (miniW + gap);
      const active = bad && item.key === snapshot.strategy;
      roundRect(
        mx,
        miniY,
        miniW,
        miniH,
        10,
        active ? card.fill : '#f8fafc',
        active ? card.stroke : '#e2e8f0',
      );
      text(
        item.key,
        mx + 12,
        miniY + 21,
        active ? '#172033' : '#94a3b8',
        '600 13px ui-monospace, SFMono-Regular, Menlo, monospace',
      );
      text(item.desc, mx + 12, miniY + 40, active ? '#475569' : '#94a3b8');
    });

    // 底注：当前组合的判断
    const noteY = miniY + miniH + 26;
    if (!bad) {
      text(
        '校验通过：errorStrategy 不参与，直接返回 response.object。',
        P,
        noteY,
        '#15803d',
      );
    } else if (snapshot.outcome === 'throw') {
      text(
        'strict：失败立刻抛错，调用方必须 try/catch；适合结果错误就应中止的路径。',
        P,
        noteY,
        '#b91c1c',
      );
    } else if (snapshot.outcome === 'warn-object') {
      text(
        'warn：警告写进日志、调用不中断；消费结果前需自行确认内容可用。',
        P,
        noteY,
        '#b45309',
      );
    } else {
      text(
        'fallback：response.object 换成 fallbackValue，用 usedFallbackValue 区分兜底与真实结果。',
        P,
        noteY,
        '#1d4ed8',
      );
    }
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(args) {
      current = args;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
