/**
 * 范例介绍：确定性模拟一条 OKF Claim 的「证据锚点 ↔ 源码漂移 → 增量更新 → PR」链路。
 * 两个场景各 5 步：改动落在证据窗口外（页面不动、不开 PR）与落在证据窗口内
 * （Claim 转 stale → 页面重写 → 时间戳推进 → 开 PR）。
 * 输入：scenario（本次提交落在窗口内还是外）与 step（时间线进度，控制执行到第几步）。
 * 预期结果：拖动时间线可见中栏源码行出现修改标记、Claim 徽章与 front matter
 * 时间戳随步骤演化、右下 PR 卡给出开不开 PR 的决定及理由。
 * 不依赖 @langchain/*：路径、命令与字段对齐 openwiki 官方文档的真实形态。
 * 阅读主线：先看两份时间线剧本常量与 deriveState，再看 draw 如何分三栏绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ScenarioKey = 'outside' | 'inside';

export interface ExampleOptions {
  scenario: ScenarioKey;
  step: number;
}

export interface ExampleSnapshot {
  scenarioLabel: string;
  stepLabel: string;
  claimState: string;
  prLabel: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

/** 时间线上的一步：一条命令或事件 + 这一步在做什么 */
interface TimelineStep {
  /** 命令或事件名（等宽展示） */
  command: string;
  /** 这一步在做什么（中文说明） */
  note: string;
  /** 步骤类别，决定卡片配色 */
  kind: 'init' | 'commit' | 'update' | 'result' | 'pr';
}

/** 推导出的 wiki 状态：Claim 徽章、front matter 时间戳与 PR 决定 */
interface DerivedState {
  /** 源码里是否已出现本次提交的修改标记 */
  edited: boolean;
  /** Claim 状态：未建立 / 已验证(t1) / 过期 / 重新验证(t2) */
  claim: 'none' | 'verified1' | 'stale' | 'verified2';
  /** architecture.md 的 generated.at（正文变化才推进） */
  generatedAt: string;
  /** architecture.md 的 verified.at（Claims 复核通过才推进） */
  verifiedAt: string;
  /** PR 决定的一句话结论 */
  prLabel: string;
}

/** 源码面板里展示的一行：行号 + 代码文本；'ellipsis' 表示折叠的省略段 */
type SourceRow = { line: number; text: string } | 'ellipsis';

const T1 = '10-01 08:00';
const T2 = '10-03 08:00';

// 证据窗口：repo://src/server.ts#L40-L82（与官方文档的示例锚点一致）
const CLAIM_REF = 'repo://src/server.ts#L40-L82';
const WINDOW_START = 40;
const WINDOW_END = 82;

// 场景一：改动在证据窗口外——L120 的注释行
const TIMELINE_OUTSIDE: TimelineStep[] = [
  {
    command: 'openwiki --init',
    note: '生成 architecture.md，Claim 锚定 L40-L82，快照 a1b2c3d',
    kind: 'init',
  },
  {
    command: 'git commit（改 L120）',
    note: '编辑窗口外的注释行，提交 e5f6g7h',
    kind: 'commit',
  },
  {
    command: 'openwiki code --update',
    note: 'diff HEAD 与上次文档提交：改动未命中任何 Claim 窗口',
    kind: 'update',
  },
  {
    command: '复核通过，页面不动',
    note: '正文无变化，generated.at 保持；仅刷新 .last-update.json',
    kind: 'result',
  },
  {
    command: 'CI 决定：不开 PR',
    note: 'wiki 与 Claims 零变化，本次检查到此结束',
    kind: 'pr',
  },
];

// 场景二：改动在证据窗口内——L55 的监听行
const TIMELINE_INSIDE: TimelineStep[] = [
  {
    command: 'openwiki --init',
    note: '生成 architecture.md，Claim 锚定 L40-L82，快照 a1b2c3d',
    kind: 'init',
  },
  {
    command: 'git commit（改 L55）',
    note: '编辑窗口内的监听行，提交 e5f6g7h',
    kind: 'commit',
  },
  {
    command: 'openwiki code --update',
    note: 'diff 命中 Claim 证据窗口：Claim 转 stale，页面进入刷新队列',
    kind: 'update',
  },
  {
    command: '页面重写，Claims 重核',
    note: '正文更新推进 generated.at；Claim sidecar 持久化后盖 verified',
    kind: 'result',
  },
  {
    command: 'CI 决定：开 PR',
    note: 'openwiki/ 下有变化：architecture.md 与 .claims/ sidecar',
    kind: 'pr',
  },
];

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  outside: '改动在证据窗口外（L120）',
  inside: '改动在证据窗口内（L55）',
};

// 源码窗口视图：只展示与证据窗口、编辑位置相关的行，其余折叠
const SOURCE_ROWS: SourceRow[] = [
  { line: 36, text: "import { createRouter } from './router';" },
  'ellipsis',
  { line: 39, text: 'export interface ServerOptions {' },
  { line: 40, text: 'export async function startServer(opts) {' },
  { line: 41, text: '  const app = createRouter(opts.routes);' },
  'ellipsis',
  { line: 54, text: '  // graceful shutdown' },
  { line: 55, text: '  app.listen(opts.port, opts.host);' },
  'ellipsis',
  { line: 81, text: '  return shutdown;' },
  { line: 82, text: '}' },
  'ellipsis',
  { line: 118, text: '// 部署备注：端口来自环境变量' },
  { line: 120, text: '// TODO: 迁移到 config 模块' },
];

/** 由场景与时间线进度推导 Claim 状态、时间戳与 PR 决定 */
function deriveState(scenario: ScenarioKey, step: number): DerivedState {
  const edited = step >= 2;

  if (scenario === 'outside') {
    return {
      edited,
      claim: step >= 1 ? 'verified1' : 'none',
      generatedAt: T1,
      verifiedAt: T1,
      prLabel: step >= 5 ? '不开 PR（仅刷新 .last-update.json）' : '—',
    };
  }

  if (step >= 4) {
    return {
      edited,
      claim: 'verified2',
      generatedAt: T2,
      verifiedAt: T2,
      prLabel: step >= 5 ? '开 PR（architecture.md + .claims/）' : '—',
    };
  }
  if (step === 3) {
    return { edited, claim: 'stale', generatedAt: T1, verifiedAt: T1, prLabel: '—' };
  }
  return {
    edited,
    claim: step >= 1 ? 'verified1' : 'none',
    generatedAt: T1,
    verifiedAt: T1,
    prLabel: '—',
  };
}

const CLAIM_BADGES: Record<
  DerivedState['claim'],
  { label: string; color: string }
> = {
  none: { label: '—（未初始化）', color: '#94a3b8' },
  verified1: { label: `verified (${T1})`, color: '#15803d' },
  stale: { label: 'stale（证据已漂移）', color: '#b45309' },
  verified2: { label: `verified (${T2})`, color: '#15803d' },
};

const KIND_COLORS: Record<TimelineStep['kind'], string> = {
  init: '#2563eb',
  commit: '#7c3aed',
  update: '#2563eb',
  result: '#0d9488',
  pr: '#b45309',
};

function buildTimeline(scenario: ScenarioKey): TimelineStep[] {
  return scenario === 'outside' ? TIMELINE_OUTSIDE : TIMELINE_INSIDE;
}

// 超出可用宽度时截断加省略号，保证文字不溢出卡片
function clipText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let clipped = text;
  while (
    clipped.length > 1 &&
    context.measureText(`${clipped}…`).width > maxWidth
  ) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

// 用 arcTo 手绘圆角矩形，不依赖较新的 roundRect API
function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
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

  let current: ExampleOptions = { scenario: 'inside', step: 5 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const timeline = buildTimeline(current.scenario);
    const visibleCount = Math.max(1, Math.min(current.step, timeline.length));
    const activeIndex = visibleCount - 1;
    const state = deriveState(current.scenario, visibleCount);
    const compact = width < 760;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        '一条 Claim 的证据锚点、源码漂移与更新链路',
        width - 96,
      ),
      48,
      40,
    );

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        '确定性模拟：路径、命令与字段对齐 openwiki 官方文档，非真实运行',
        width - 96,
      ),
      48,
      62,
    );

    // 三栏布局：时间线（约 30%）、源码面板（约 36%）、wiki 状态（约 34%）
    const startY = 84;
    const bottomReserve = 64;
    const usableWidth = width - 96;
    const gap = 16;
    const leftWidth = Math.round(usableWidth * 0.3);
    const middleWidth = Math.round(usableWidth * 0.36);
    const rightWidth = usableWidth - leftWidth - middleWidth - gap * 2;
    const middleX = 48 + leftWidth + gap;
    const rightX = middleX + middleWidth + gap;
    const available = height - startY - bottomReserve;

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('时间线', 48, startY - 8);
    drawingContext.fillText('src/server.ts', middleX, startY - 8);
    drawingContext.fillText('openwiki/（OKF 页面与 Claim）', rightX, startY - 8);

    drawTimeline(
      drawingContext,
      timeline,
      activeIndex,
      48,
      startY,
      leftWidth,
      available,
      compact,
    );
    drawSource(
      drawingContext,
      state,
      middleX,
      startY,
      middleWidth,
      available,
      compact,
    );
    drawWiki(
      drawingContext,
      state,
      rightX,
      startY,
      rightWidth,
      available,
      compact,
    );

    emit({
      scenarioLabel: SCENARIO_LABELS[current.scenario],
      stepLabel: `${visibleCount} / ${timeline.length}`,
      claimState: CLAIM_BADGES[state.claim].label,
      prLabel: state.prLabel,
    });
  }

  /** 左栏：时间线步骤卡，激活步骤高亮 */
  function drawTimeline(
    context: CanvasRenderingContext2D,
    timeline: TimelineStep[],
    activeIndex: number,
    x: number,
    y: number,
    panelWidth: number,
    panelHeight: number,
    compact: boolean,
  ): void {
    const cardGap = 6;
    const cardHeight = Math.max(
      24,
      Math.min(
        58,
        Math.floor((panelHeight - cardGap * (timeline.length - 1)) / timeline.length),
      ),
    );

    timeline.forEach((step, index) => {
      const cardY = y + index * (cardHeight + cardGap);
      const active = index === activeIndex;
      const color = KIND_COLORS[step.kind];

      context.fillStyle = active ? '#f0f5ff' : '#ffffff';
      context.strokeStyle = active ? color : '#dbe3f0';
      context.lineWidth = active ? 1.5 : 1;
      roundedRectPath(context, x, cardY, panelWidth, cardHeight, 7);
      context.fill();
      context.stroke();

      context.fillStyle = color;
      context.fillRect(x + 1, cardY + 5, 4, cardHeight - 10);
      context.font = `600 ${compact ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.fillText(String(index + 1), x + 11, cardY + (compact ? 14 : 17));

      context.font = `600 ${compact ? 9.5 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.fillStyle = active ? color : '#334155';
      context.fillText(
        clipText(context, step.command, panelWidth - 34),
        x + 24,
        cardY + (compact ? 14 : 17),
      );

      if (!compact && cardHeight >= 40) {
        context.font = '10.5px ui-sans-serif, system-ui, sans-serif';
        context.fillStyle = '#64748b';
        context.fillText(
          clipText(context, step.note, panelWidth - 24),
          x + 11,
          cardY + cardHeight - 9,
        );
      }
    });
  }

  /** 中栏：源码窗口视图，证据窗口高亮，编辑行打修改标记 */
  function drawSource(
    context: CanvasRenderingContext2D,
    state: DerivedState,
    x: number,
    y: number,
    panelWidth: number,
    panelHeight: number,
    compact: boolean,
  ): void {
    context.fillStyle = '#f8fafc';
    context.strokeStyle = '#dbe3f0';
    context.lineWidth = 1;
    roundedRectPath(context, x, y, panelWidth, panelHeight, 8);
    context.fill();
    context.stroke();

    const editedLine = current.scenario === 'outside' ? 120 : 55;
    const rows = SOURCE_ROWS.filter((row) => {
      if (row === 'ellipsis') {
        return true;
      }
      // 窄面板丢掉与窗口、编辑位置都无关的行，保证关键行可见
      if (compact && row.line !== editedLine) {
        return (
          row.line === 36 ||
          row.line === WINDOW_START ||
          row.line === WINDOW_END ||
          row.line === 118
        );
      }
      return true;
    });

    const rowGap = compact ? 20 : 22;
    const maxRows = Math.max(
      3,
      Math.floor((panelHeight - 40) / rowGap),
    );
    // 空间不足时先丢省略行；关键行（窗口边界与编辑行）尽量保留
    let visibleRows = rows;
    if (rows.length > maxRows) {
      const dense = rows.filter((row) => row !== 'ellipsis');
      visibleRows = dense.slice(0, Math.min(maxRows, dense.length));
    }
    const innerX = x + 12;
    const innerWidth = panelWidth - 24;

    visibleRows.forEach((row, index) => {
      const rowY = y + 30 + index * rowGap;

      if (row === 'ellipsis') {
        context.fillStyle = '#94a3b8';
        context.font = `${compact ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.fillText('⋮', innerX + 26, rowY);
        return;
      }

      const inWindow = row.line >= WINDOW_START && row.line <= WINDOW_END;
      if (inWindow) {
        // 证据窗口底色：这一行被 Claim 锚定覆盖
        context.fillStyle = 'rgba(79, 124, 255, 0.12)';
        context.fillRect(innerX - 4, rowY - 13, innerWidth + 8, rowGap - 4);
      }

      context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.fillStyle = inWindow ? '#4f7cff' : '#94a3b8';
      context.fillText(`L${row.line}`, innerX, rowY);

      context.fillStyle = inWindow ? '#1e293b' : '#64748b';
      context.fillText(
        clipText(context, row.text, innerWidth - (compact ? 70 : 96)),
        innerX + 34,
        rowY,
      );

      // 窗口边界标注
      if (row.line === WINDOW_START) {
        context.fillStyle = '#4f7cff';
        context.font = '600 9.5px ui-sans-serif, system-ui, sans-serif';
        context.fillText('▲ 窗口起点', innerX + innerWidth - 56, rowY);
      }
      if (row.line === WINDOW_END) {
        context.fillStyle = '#4f7cff';
        context.font = '600 9.5px ui-sans-serif, system-ui, sans-serif';
        context.fillText('▼ 窗口终点', innerX + innerWidth - 56, rowY);
      }

      // 本次提交的编辑标记：只在已提交后显示
      if (state.edited && row.line === editedLine) {
        context.fillStyle = '#b45309';
        context.font = '600 9.5px ui-sans-serif, system-ui, sans-serif';
        context.fillText('●修改 e5f6g7h', innerX + innerWidth - 76, rowY - 1);
      }
    });
  }

  /** 右栏：front matter 卡、Claim 卡与 PR 决定卡 */
  function drawWiki(
    context: CanvasRenderingContext2D,
    state: DerivedState,
    x: number,
    y: number,
    panelWidth: number,
    panelHeight: number,
    compact: boolean,
  ): void {
    const cardGap = 10;
    const prCardHeight = Math.max(48, Math.min(72, panelHeight * 0.24));
    const claimCardHeight = Math.max(56, Math.min(88, panelHeight * 0.3));
    const fmCardHeight = Math.max(
      40,
      panelHeight - claimCardHeight - prCardHeight - cardGap * 2,
    );

    // 卡一：architecture.md 的 front matter 摘要
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#dbe3f0';
    roundedRectPath(context, x, y, panelWidth, fmCardHeight, 8);
    context.fill();
    context.stroke();

    context.fillStyle = '#172033';
    context.font = '600 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText('openwiki/architecture.md', x + 12, y + 20);

    const fmRows: Array<[string, string, boolean]> = [
      ['type:', 'architecture', false],
      ['generated.at:', state.generatedAt, state.generatedAt === T2],
      ['verified.at:', state.verifiedAt, state.verifiedAt === T2],
      ['sources[0]:', CLAIM_REF, false],
    ];
    fmRows.forEach(([key, value, changed], index) => {
      const rowY = y + 40 + index * (compact ? 17 : 19);
      context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.fillStyle = '#64748b';
      context.fillText(key, x + 12, rowY);
      context.fillStyle = changed ? '#b45309' : '#15803d';
      context.fillText(
        clipText(context, `${value}${changed ? '  ← 已推进' : ''}`, panelWidth - 90),
        x + 100,
        rowY,
      );
    });

    // 卡二：Claim sidecar 的证据锚点与状态
    const claimY = y + fmCardHeight + cardGap;
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#dbe3f0';
    roundedRectPath(context, x, claimY, panelWidth, claimCardHeight, 8);
    context.fill();
    context.stroke();

    context.fillStyle = '#172033';
    context.font = '600 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText('openwiki/.claims/ sidecar', x + 12, claimY + 20);

    context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillStyle = '#64748b';
    context.fillText('evidence:', x + 12, claimY + 40);
    context.fillStyle = '#4f7cff';
    context.fillText(
      clipText(context, CLAIM_REF, panelWidth - 90),
      x + 66,
      claimY + 40,
    );
    context.fillStyle = '#64748b';
    context.fillText('snapshot: a1b2c3d', x + 12, claimY + 58);

    const badge = CLAIM_BADGES[state.claim];
    context.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    const badgeWidth = context.measureText(badge.label).width + 16;
    context.fillStyle = '#ffffff';
    context.strokeStyle = badge.color;
    context.lineWidth = 1.2;
    roundedRectPath(
      context,
      x + panelWidth - badgeWidth - 12,
      claimY + claimCardHeight - 24,
      badgeWidth,
      18,
      9,
    );
    context.fill();
    context.stroke();
    context.fillStyle = badge.color;
    context.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText(
      badge.label,
      x + panelWidth - badgeWidth - 4,
      claimY + claimCardHeight - 11,
    );

    // 卡三：PR 决定
    const prY = claimY + claimCardHeight + cardGap;
    const prReady = visiblePrReady();
    context.fillStyle = prReady ? '#fff7ed' : '#f8fafc';
    context.strokeStyle = prReady ? '#fdba74' : '#dbe3f0';
    roundedRectPath(context, x, prY, panelWidth, prCardHeight, 8);
    context.fill();
    context.stroke();

    context.fillStyle = '#7c2d12';
    context.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    context.fillText('PR 决定', x + 12, prY + 19);

    context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillStyle = state.prLabel === '—' ? '#94a3b8' : '#172033';
    context.fillText(
      clipText(
        context,
        state.prLabel === '—' ? '等待时间线推进…' : state.prLabel,
        panelWidth - 24,
      ),
      x + 12,
      prY + 40,
    );
    if (!compact && prCardHeight >= 60) {
      context.font = '10px ui-sans-serif, system-ui, sans-serif';
      context.fillStyle = '#9a3412';
      context.fillText(
        clipText(
          context,
          current.scenario === 'inside'
            ? 'wiki Markdown / Claims 有变化才开 PR'
            : '无变化时 CI 不开 PR，只记录检查',
          panelWidth - 24,
        ),
        x + 12,
        prY + 56,
      );
    }
  }

  /** PR 卡是否进入已判定状态（时间线推进到第 5 步） */
  function visiblePrReady(): boolean {
    return (
      Math.max(1, Math.min(current.step, buildTimeline(current.scenario).length)) >=
      buildTimeline(current.scenario).length
    );
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
