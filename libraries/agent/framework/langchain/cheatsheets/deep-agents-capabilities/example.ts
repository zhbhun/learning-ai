/**
 * 范例介绍：Deep Agents 能力组合对主上下文 token 轨迹影响的确定性模拟器。
 * 同一任务形态下并排绘制三档配置的曲线——bare（裸 createAgent：工具结果
 * 全量进上下文、无任何压缩）、harness（Deep Agents 默认栈：文件系统 +
 * 自动摘要 + 大结果卸载）、full（默认栈 + subagents 委派 + skills/memory
 * 的输入上下文配置）。三种任务形态：单次大结果（一次工具返回 30k token，
 * 触发 20k 卸载阈值）；长程研究（12 轮、每轮 12k 工具结果，触发 128k 窗口
 * 的 85% 摘要线）；领域问答 + 偏好记忆（两个 thread，展示输入上下文的
 * 常驻与按需之别——默认栈在此与裸 Agent 完全重合）。
 * 输入或前置状态：Controls 提供的任务形态；窗口 128k / 85% 触发 / 保留
 * 10% / 20k 卸载阈值取自 deepagents 1.14 的默认配置；轨迹为查表数据，
 * 真实行为见正文代码示例。
 * 主要操作：切换任务形态。
 * 预期结果：三条曲线的形状差异、事件标记（卸载/摘要/委派/爆窗/激活）
 * 与读数同步变化。
 * 阅读主线：SCENARIOS 查表 → draw() 的坐标映射与曲线绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleOptions {
  taskType: 'bigResult' | 'longResearch' | 'domainMemory';
}

// 曲线对应的配置档位：裸 createAgent / 默认栈 / 组合配置
type SeriesKey = 'bare' | 'harness' | 'full';

// 曲线上的事件标记：卸载 / 摘要 / 委派 / 爆窗 / 技能激活
type EventKind = 'offload' | 'summarize' | 'delegate' | 'overflow' | 'activate';

interface PointEvent {
  kind: EventKind;
  label: string;
  /** 事件标签的水平偏移，避免同列多个事件重叠 */
  labelDx?: number;
}

interface SeriesPoint {
  /** 轮次序号（0 起），与 xLabels 对齐 */
  i: number;
  /** 该时点主上下文 token（单位 k） */
  tokens: number;
  /**
   * 峰值回落：tokens 是触发机制的瞬时峰值（如摘要触发前的 121.5k），
   * dropTo 是机制生效后的实际水位（折叠后的 14.8k）——曲线先画到峰值，
   * 再用虚线垂落到 dropTo 继续画。
   */
  dropTo?: number;
  event?: PointEvent;
}

interface Series {
  key: SeriesKey;
  points: SeriesPoint[];
}

interface Scenario {
  taskLabel: string;
  subtitle: string;
  xLabels: string[];
  /** y 轴上限（单位 k） */
  yMax: number;
  series: Series[];
  footer: string;
  stats: {
    barePeak: string;
    harnessPeak: string;
    fullPeak: string;
    offloads: number;
    summaries: number;
    delegations: number;
  };
}

export interface ExampleSnapshot {
  taskLabel: string;
  barePeak: string;
  harnessPeak: string;
  fullPeak: string;
  offloads: number;
  summaries: number;
  delegations: number;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const LINE = '#dbe3f0';
const GRAY = '#94a3b8';
const BLUE = '#4f7cff';
const GREEN = '#047857';
const AMBER = '#b45309';
const RED = '#b91c1c';
const PURPLE = '#7c3aed';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 三档配置的展示名与颜色：读数和图例共用
const SERIES_META: Record<
  SeriesKey,
  { color: string; label: string; short: string }
> = {
  bare: { color: GRAY, label: '裸 createAgent', short: '裸' },
  harness: {
    color: BLUE,
    label: 'Deep Agents 默认栈',
    short: '默认栈',
  },
  full: { color: GREEN, label: '默认栈 + 组合配置', short: '组合' },
};

const EVENT_COLORS: Record<EventKind, string> = {
  offload: BLUE,
  summarize: AMBER,
  delegate: GREEN,
  overflow: RED,
  activate: PURPLE,
};

const TASK_LABELS: Record<ExampleOptions['taskType'], string> = {
  bigResult: '单次大结果',
  longResearch: '长程研究',
  domainMemory: '领域问答 + 偏好记忆',
};

// 模型窗口与压缩阈值：与 deepagents 1.14 默认一致
const CONTEXT_WINDOW = 128; // 128k max input tokens
const SUMMARIZE_TRIGGER = CONTEXT_WINDOW * 0.85; // 85% 窗口触发摘要

/*
 * 三种任务形态 × 三档配置的确定性轨迹（单位 k token）。
 * bigResult：提问 0.5k，一次工具返回 30k，随后三轮追问各 +1.5k。
 *   - bare：30k 全量常驻，此后每轮都背着；
 *   - harness：30k > 20k 阈值 → 卸载到 /large_tool_results/，主上下文
 *     只剩路径 + 预览（约 0.3k）；
 *   - full：委派给子代理，0.4k 报告回流。
 * longResearch：12 轮、每轮工具结果 12k + 对话 1.5k。
 *   - bare：每轮 +13.5k 线性膨胀，第 10 轮 135k 超出 128k 窗口；
 *   - harness：第 9 轮 121.5k 越过 85% 线 → 折叠为摘要 2k + 保留 12.8k，
 *     历史全文落盘 /conversation_history/{thread_id}.md；
 *   - full：每轮重活委派，主上下文每轮仅 +1.5k。
 * domainMemory：thread1 问 SQL 口径，thread2 问偏好报表。
 *   - bare / harness：口径 + 偏好写死系统提示，常驻 2.5k（两条曲线重合）；
 *   - full：常驻 = 技能清单 0.1k + AGENTS.md 0.5k；命中技能当轮 +1.0k
 *     正文；thread2 自动带上记忆里的偏好，无需重述。
 */
const SCENARIOS: Record<ExampleOptions['taskType'], Scenario> = {
  bigResult: {
    taskLabel: TASK_LABELS.bigResult,
    subtitle: '提问 0.5k → 一次工具返回 30k → 三轮追问各 +1.5k（窗口 128k）',
    xLabels: ['提问', '工具 30k', '追问 1', '追问 2', '追问 3'],
    yMax: 36,
    series: [
      {
        key: 'bare',
        points: [
          { i: 0, tokens: 0.5 },
          { i: 1, tokens: 30.5 },
          { i: 2, tokens: 32 },
          { i: 3, tokens: 33.5 },
          { i: 4, tokens: 35 },
        ],
      },
      {
        key: 'harness',
        points: [
          { i: 0, tokens: 0.5 },
          {
            i: 1,
            tokens: 0.8,
            event: {
              kind: 'offload',
              label: '⤓ 30k 超 20k 阈值 → 卸载留引用',
              labelDx: -130,
            },
          },
          { i: 2, tokens: 2.3 },
          { i: 3, tokens: 3.8 },
          { i: 4, tokens: 5.3 },
        ],
      },
      {
        key: 'full',
        points: [
          { i: 0, tokens: 0.5 },
          {
            i: 1,
            tokens: 0.9,
            event: {
              kind: 'delegate',
              label: '→ task 委派：只回 0.4k 报告',
              labelDx: 130,
            },
          },
          { i: 2, tokens: 2.4 },
          { i: 3, tokens: 3.9 },
          { i: 4, tokens: 5.4 },
        ],
      },
    ],
    footer:
      '卸载与委派殊途同归：一个把 30k 结果搬进文件只留引用，一个把过程搬进隔离气泡只回报告——后续要反复引用原文选卸载（read_file/grep 随取），要消化改写选委派',
    stats: {
      barePeak: '35.0k',
      harnessPeak: '5.3k',
      fullPeak: '5.4k',
      offloads: 1,
      summaries: 0,
      delegations: 1,
    },
  },
  longResearch: {
    taskLabel: TASK_LABELS.longResearch,
    subtitle: '12 轮研究，每轮工具结果 12k + 对话 1.5k（窗口 128k · 85% 线 108.8k）',
    xLabels: Array.from({ length: 12 }, (_, i) => `r${i + 1}`),
    yMax: 170,
    series: [
      {
        key: 'bare',
        points: Array.from({ length: 12 }, (_, i) => ({
          i,
          tokens: (i + 1) * 13.5,
          event:
            i === 9
              ? {
                  kind: 'overflow',
                  label: '✕ 135k 超出 128k 窗口',
                  labelDx: -10,
                }
              : undefined,
        })),
      },
      {
        key: 'harness',
        points: [
          ...Array.from({ length: 8 }, (_, i) => ({ i, tokens: (i + 1) * 13.5 })),
          {
            i: 8,
            // 峰值 121.5k 越过 85% 线触发摘要，实际水位折叠到 14.8k
            tokens: 121.5,
            dropTo: 14.8,
            event: {
              kind: 'summarize',
              label: 'Σ 越 85% 线 → 摘要 2k + 保留 12.8k，全文落盘可 grep',
              labelDx: -20,
            },
          },
          { i: 9, tokens: 28.3 },
          { i: 10, tokens: 41.8 },
          { i: 11, tokens: 55.3 },
        ],
      },
      {
        key: 'full',
        points: [
          {
            i: 0,
            tokens: 1.5,
            event: { kind: 'delegate', label: '→ 每轮重活 task 委派（×12）' },
          },
          ...Array.from({ length: 11 }, (_, i) => ({
            i: i + 1,
            tokens: (i + 2) * 1.5,
          })),
        ],
      },
    ],
    footer:
      '裸 Agent 线性爆窗；默认栈在 85% 线折叠成锯齿（历史全文落盘 /conversation_history）；组合档把 12k 重活推进隔离气泡，12 轮只长到 18k',
    stats: {
      barePeak: '162k',
      harnessPeak: '121.5k（触发时瞬时）',
      fullPeak: '18k',
      offloads: 1,
      summaries: 1,
      delegations: 12,
    },
  },
  domainMemory: {
    taskLabel: TASK_LABELS.domainMemory,
    subtitle: 'thread1 问 SQL 口径（命中技能），thread2 问偏好报表（靠记忆）',
    xLabels: ['T1 提问', 'T1 回答', 'T2 提问', 'T2 回答'],
    yMax: 4,
    series: [
      {
        key: 'bare',
        points: [
          { i: 0, tokens: 2.5 },
          { i: 1, tokens: 3.4 },
          { i: 2, tokens: 2.5 },
          { i: 3, tokens: 3.2 },
        ],
      },
      {
        key: 'harness',
        points: [
          { i: 0, tokens: 2.5 },
          { i: 1, tokens: 3.4 },
          { i: 2, tokens: 2.5 },
          { i: 3, tokens: 3.2 },
        ],
      },
      {
        key: 'full',
        points: [
          { i: 0, tokens: 0.6 },
          {
            i: 1,
            tokens: 2.5,
            event: {
              kind: 'activate',
              label: '✚ read_file 激活 sales-analytics 正文 +1.0k（仅本 thread）',
              labelDx: 24,
            },
          },
          { i: 2, tokens: 0.6 },
          { i: 3, tokens: 1.4 },
        ],
      },
    ],
    footer:
      '输入上下文的账与运行时相反：memory 常驻（每轮 0.5k 都付）、skills 按需（命中才付 1.0k）；默认栈压缩不了这条曲线——灰蓝重合正说明：只有配置 skills/memory 才改变输入侧',
    stats: {
      barePeak: '3.4k（常驻 2.5k）',
      harnessPeak: '3.4k（常驻 2.5k）',
      fullPeak: '2.5k（常驻 0.6k）',
      offloads: 0,
      summaries: 0,
      delegations: 0,
    },
  },
};

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

function formatK(value: number) {
  return Number.isInteger(value) ? `${value}k` : `${value.toFixed(1)}k`;
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

  let current: ExampleOptions = { taskType: 'longResearch' };

  function draw() {
    const scenario = SCENARIOS[current.taskType];
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = Math.max(460, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = 32;
    const plotLeft = pad + 48;
    const plotRight = width - pad - 8;
    const plotTop = 118;
    const plotBottom = height - 74;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    // 标题与副标题
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(
      '主上下文 token 轨迹：同一任务的三档配置对照',
      pad,
      40,
    );

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `${scenario.taskLabel} · ${scenario.subtitle}`,
      pad,
      62,
    );

    // 图例（横排，位于绘图区上方）
    let legendX = plotLeft;
    ctx.font = `12px ${FONT}`;
    Object.values(SERIES_META).forEach((meta) => {
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(legendX, 86);
      ctx.lineTo(legendX + 18, 86);
      ctx.stroke();
      ctx.fillStyle = meta.color;
      ctx.fillText(meta.label, legendX + 24, 90);
      legendX += ctx.measureText(meta.label).width + 56;
    });

    // 坐标映射
    const n = scenario.xLabels.length;
    const xOf = (i: number) => plotLeft + (plotW / (n - 1)) * i;
    const yOf = (tokens: number) =>
      plotBottom - (plotH / scenario.yMax) * tokens;

    // y 轴刻度与网格线
    ctx.font = `11px ${MONO}`;
    for (let step = 0; step <= 4; step += 1) {
      const value = (scenario.yMax / 4) * step;
      const y = yOf(value);
      ctx.strokeStyle = step === 0 ? LINE : '#edf1f7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'right';
      ctx.fillText(formatK(Math.round(value * 10) / 10), plotLeft - 8, y + 4);
    }

    // 85% 摘要触发线（窗口在本场景量程内才绘制）
    if (SUMMARIZE_TRIGGER <= scenario.yMax) {
      const y = yOf(SUMMARIZE_TRIGGER);
      ctx.strokeStyle = AMBER;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = AMBER;
      ctx.textAlign = 'left';
      ctx.fillText(
        `85% 窗口 = ${formatK(SUMMARIZE_TRIGGER)}（摘要触发线）`,
        plotLeft + 8,
        y - 6,
      );
    }

    // x 轴标签
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.font = `11px ${FONT}`;
    scenario.xLabels.forEach((label, i) => {
      ctx.fillText(label, xOf(i), plotBottom + 20);
    });

    // 三条曲线：先画线（dropTo 处先到峰值再虚线垂落），再画点与事件标记
    scenario.series.forEach((series) => {
      const meta = SERIES_META[series.key];
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      series.points.forEach((point, index) => {
        const x = xOf(point.i);
        const y = yOf(point.tokens);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        if (point.dropTo != null) {
          // 结束当前实线段，画垂直虚线下落，再从低水位继续
          ctx.stroke();
          ctx.save();
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, yOf(point.dropTo));
          ctx.stroke();
          ctx.restore();
          ctx.beginPath();
          ctx.moveTo(x, yOf(point.dropTo));
        }
      });
      ctx.stroke();
    });

    scenario.series.forEach((series) => {
      const meta = SERIES_META[series.key];
      series.points.forEach((point) => {
        const x = xOf(point.i);
        const y = yOf(point.tokens);
        // 带垂落的点：峰值画事件环，落点画普通数据点
        const dotY = point.dropTo != null ? yOf(point.dropTo) : y;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = meta.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(x, dotY, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (point.event) {
          const color = EVENT_COLORS[point.event.kind];
          // 事件标记：峰点外一圈空心环
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(x, y, 7, 0, Math.PI * 2);
          ctx.stroke();
          if (point.dropTo != null) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.font = `600 11px ${FONT}`;
          ctx.fillStyle = color;
          const text = fitText(ctx, point.event.label, Math.min(plotW - 8, 330));
          const half = ctx.measureText(text).width / 2 + 4;
          ctx.textAlign = 'center';
          ctx.fillText(
            text,
            Math.max(
              plotLeft + half,
              Math.min(plotRight - half, x + (point.event.labelDx ?? 0)),
            ),
            y - 16,
          );
          ctx.textAlign = 'left';
        }
      });
    });

    // 底部结论行
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'left';
    ctx.fillText(
      fitText(ctx, scenario.footer, width - pad * 2),
      pad,
      height - 36,
    );

    emit({
      taskLabel: scenario.taskLabel,
      barePeak: scenario.stats.barePeak,
      harnessPeak: scenario.stats.harnessPeak,
      fullPeak: scenario.stats.fullPeak,
      offloads: scenario.stats.offloads,
      summaries: scenario.stats.summaries,
      delegations: scenario.stats.delegations,
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
