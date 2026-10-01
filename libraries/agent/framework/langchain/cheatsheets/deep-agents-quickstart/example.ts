/**
 * 范例介绍：确定性模拟一次 Deep Agent 任务的「工具调用时间线 + 虚拟文件系统演化」。
 * 两个场景各 8 步：调研写报告（task → write_file → grep → read_file → …）与
 * 重构现有模块（glob → read_file → grep → write_file → … → delete）。
 * 输入：scenario（任务场景）与 step（回放进度，控制执行到第几步）。
 * 预期结果：拖动回放进度可见左侧时间线逐条追加内置工具调用、右侧目录树随
 * write_file / edit_file / delete 生长变化；切换场景可见两种典型编排。
 * 不依赖 @langchain/*：工具名与 files 状态键对齐 deepagents 包的真实形态。
 * 阅读主线：先看两组剧本常量（TIMELINE_*），再看 draw 如何按 step 截取并绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ScenarioKey = 'research' | 'refactor';

export interface ExampleOptions {
  scenario: ScenarioKey;
  step: number;
}

export interface ExampleSnapshot {
  scenarioLabel: string;
  stepLabel: string;
  toolCalls: number;
  fileCount: number;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

/** 虚拟文件系统里一个文件的快照：路径 + 相对上一步的变化 */
interface FsEntry {
  path: string;
  status: 'existing' | 'created' | 'modified';
}

/** 时间线上的一步：一次内置工具调用（或最终回答）+ 执行后的文件快照 */
interface TimelineStep {
  /** 内置工具名；最终回答用 'ai' 标记 */
  tool: string;
  isFinal?: boolean;
  /** 发给模型的参数摘要（等宽展示） */
  args: string;
  /** 这一步在做什么（中文说明） */
  note: string;
  fsAfter: FsEntry[];
}

// 场景一：调研并写报告——检索结果卸载进文件系统，再检索、取回、成稿
const TIMELINE_RESEARCH: TimelineStep[] = [
  {
    tool: 'task',
    args: 'description: "检索 LangGraph 部署文档"',
    note: '委派 general-purpose 子代理：隔离上下文里检索，只回流报告',
    fsAfter: [],
  },
  {
    tool: 'write_file',
    args: 'path: "/research/notes.md", content: 检索要点…',
    note: '把大块检索结果卸载出上下文，写进虚拟文件系统',
    fsAfter: [{ path: '/research/notes.md', status: 'created' }],
  },
  {
    tool: 'grep',
    args: 'pattern: "deploy", path: "/research"',
    note: '在已写下的笔记里定位部署相关段落，不重读全文',
    fsAfter: [{ path: '/research/notes.md', status: 'existing' }],
  },
  {
    tool: 'read_file',
    args: 'path: "/research/notes.md", offset…',
    note: '只取回相关段落回填上下文',
    fsAfter: [{ path: '/research/notes.md', status: 'existing' }],
  },
  {
    tool: 'write_file',
    args: 'path: "/report/draft.md", content: 初稿…',
    note: '产出初稿：中间产物先落文件，不占对话',
    fsAfter: [
      { path: '/research/notes.md', status: 'existing' },
      { path: '/report/draft.md', status: 'created' },
    ],
  },
  {
    tool: 'edit_file',
    args: 'path: "/report/draft.md", old/new: 结论段…',
    note: '局部修订：改一段，不重写整个文件',
    fsAfter: [
      { path: '/research/notes.md', status: 'existing' },
      { path: '/report/draft.md', status: 'modified' },
    ],
  },
  {
    tool: 'write_file',
    args: 'path: "/report/summary.md", content: 定稿…',
    note: '定稿单独成文，draft 留作中间产物',
    fsAfter: [
      { path: '/research/notes.md', status: 'existing' },
      { path: '/report/draft.md', status: 'existing' },
      { path: '/report/summary.md', status: 'created' },
    ],
  },
  {
    tool: 'ai',
    isFinal: true,
    args: 'content: "报告已写入 /report/summary.md…"',
    note: '最终回答：上下文里只剩精炼结论，细节都在文件里',
    fsAfter: [
      { path: '/research/notes.md', status: 'existing' },
      { path: '/report/draft.md', status: 'existing' },
      { path: '/report/summary.md', status: 'existing' },
    ],
  },
];

// 场景二：重构现有模块——先圈定文件，读、改、委派校验，最后删旧文件
const TIMELINE_REFACTOR: TimelineStep[] = [
  {
    tool: 'glob',
    args: 'pattern: "src/**/*.ts"',
    note: '圈定候选文件：只拿路径清单，不读内容',
    fsAfter: [{ path: '/src/utils.ts', status: 'existing' }],
  },
  {
    tool: 'read_file',
    args: 'path: "/src/utils.ts"',
    note: '通读现状，进上下文做重构决策',
    fsAfter: [{ path: '/src/utils.ts', status: 'existing' }],
  },
  {
    tool: 'grep',
    args: 'pattern: "parseConfig", path: "/src"',
    note: '找调用点：确认要改的函数被谁使用',
    fsAfter: [{ path: '/src/utils.ts', status: 'existing' }],
  },
  {
    tool: 'write_file',
    args: 'path: "/src/utils.v2.ts", content: 重构版…',
    note: '写新版本，旧文件先不动',
    fsAfter: [
      { path: '/src/utils.ts', status: 'existing' },
      { path: '/src/utils.v2.ts', status: 'created' },
    ],
  },
  {
    tool: 'edit_file',
    args: 'path: "/src/utils.v2.ts", old/new: 边界处理…',
    note: '补边界处理：对新文件做局部修订',
    fsAfter: [
      { path: '/src/utils.ts', status: 'existing' },
      { path: '/src/utils.v2.ts', status: 'modified' },
    ],
  },
  {
    tool: 'task',
    args: 'description: "校验 utils.v2 的行为一致性"',
    note: '委派子代理跑校验：隔离窗口里逐项核对，回流结论',
    fsAfter: [
      { path: '/src/utils.ts', status: 'existing' },
      { path: '/src/utils.v2.ts', status: 'existing' },
    ],
  },
  {
    tool: 'delete',
    args: 'path: "/src/utils.ts"',
    note: '校验通过后移除旧文件：files 状态键里置为 null',
    fsAfter: [{ path: '/src/utils.v2.ts', status: 'existing' }],
  },
  {
    tool: 'ai',
    isFinal: true,
    args: 'content: "重构完成，校验通过…"',
    note: '最终回答：新旧文件的去留都反映在目录树里',
    fsAfter: [{ path: '/src/utils.v2.ts', status: 'existing' }],
  },
];

const SCENARIO_LABELS: Record<ScenarioKey, string> = {
  research: '调研并写报告',
  refactor: '重构现有模块',
};

function buildTimeline(scenario: ScenarioKey): TimelineStep[] {
  return scenario === 'research' ? TIMELINE_RESEARCH : TIMELINE_REFACTOR;
}

// 内置工具的徽章配色：文件系统一类、委派一类、最终回答一类
function toolColor(step: TimelineStep): string {
  if (step.isFinal) {
    return '#0d9488';
  }
  if (step.tool === 'task') {
    return '#7c3aed';
  }
  return '#2563eb';
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

function drawStepCard(
  context: CanvasRenderingContext2D,
  step: TimelineStep,
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
  active: boolean,
  compact: boolean,
): void {
  const color = toolColor(step);

  context.fillStyle = active ? '#f0f5ff' : '#ffffff';
  context.strokeStyle = active ? color : '#dbe3f0';
  context.lineWidth = active ? 1.5 : 1;
  roundedRectPath(context, x, y, width, height, 7);
  context.fill();
  context.stroke();

  // 左侧类型色条 + 步骤序号
  context.fillStyle = color;
  context.fillRect(x + 1, y + 5, 4, height - 10);
  context.font = `600 ${compact ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillText(String(index + 1), x + 12, y + (compact ? 14 : 17));

  // 第一行：工具名（或「最终回答」）+ 参数摘要
  const nameX = x + 26;
  context.font = `600 ${compact ? 11 : 12.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillStyle = color;
  const label = step.isFinal ? 'AI 最终回答' : step.tool;
  context.fillText(clipText(context, label, width * 0.34), nameX, y + (compact ? 14 : 17));

  context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillStyle = '#64748b';
  context.fillText(
    clipText(context, step.args, width - (compact ? 120 : 150)),
    x + (compact ? width * 0.36 : width * 0.33),
    y + (compact ? 14 : 17),
  );

  // 第二行：这一步在做什么（只在高度足够时绘制）
  if (!compact) {
    context.font = '11px ui-sans-serif, system-ui, sans-serif';
    context.fillStyle = '#475569';
    context.fillText(
      clipText(context, step.note, width - 40),
      nameX,
      y + height - 9,
    );
  }
}

/** 把路径列表按目录层级折算成缩进行，树形展示 files 状态 */
function buildTreeLines(entries: FsEntry[]): Array<{
  text: string;
  status: FsEntry['status'];
  depth: number;
}> {
  // 汇总所有目录前缀，保持稳定顺序：先目录后文件、按字典序
  const dirs = new Set<string>();
  for (const entry of entries) {
    const parts = entry.path.split('/').filter(Boolean);
    parts.slice(0, -1).forEach((_, cut) => {
      dirs.add(`/${parts.slice(0, cut + 1).join('/')}`);
    });
  }
  const sortedDirs = [...dirs].sort();
  const sortedFiles = [...entries].sort((a, b) =>
    a.path.localeCompare(b.path),
  );

  const lines: Array<{ text: string; status: FsEntry['status']; depth: number }> = [
    { text: '/（backend 根）', status: 'existing', depth: 0 },
  ];
  for (const dir of sortedDirs) {
    const parts = dir.split('/').filter(Boolean);
    lines.push({
      text: `${parts.at(-1)}/`,
      status: 'existing',
      depth: parts.length,
    });
  }
  for (const file of sortedFiles) {
    const parts = file.path.split('/').filter(Boolean);
    lines.push({
      text: parts.at(-1) ?? file.path,
      status: file.status,
      depth: parts.length,
    });
  }
  return lines;
}

const STATUS_MARKS: Record<FsEntry['status'], { mark: string; color: string }> = {
  existing: { mark: '', color: '#334155' },
  created: { mark: ' +新增', color: '#15803d' },
  modified: { mark: ' ●修改', color: '#b45309' },
};

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleOptions = { scenario: 'research', step: 8 };

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
    // step 越界时按剧本上限截住（两场景固定 8 步，控件上限即 8）
    const visibleCount = Math.max(1, Math.min(current.step, timeline.length));
    const activeIndex = visibleCount - 1;
    const snapshot = timeline[activeIndex];

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        '一次 Deep Agent 任务的工具调用时间线与虚拟文件系统演化',
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
        '确定性模拟：工具名与 files 状态键对齐 deepagents 包，非真实模型调用',
        width - 96,
      ),
      48,
      62,
    );

    // 双栏布局：左侧时间线（约 62%），右侧目录树
    const startY = 84;
    const bottomReserve = 60; // 底部留白给共享 readout 读数
    const leftWidth = Math.round((width - 96) * 0.62);
    const rightX = 48 + leftWidth + 24;
    const rightWidth = width - rightX - 48;

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('工具调用时间线（result.messages）', 48, startY - 8);
    drawingContext.fillText('虚拟文件系统（result.files）', rightX, startY - 8);

    const available = height - startY - bottomReserve;
    const gap = 6;
    const cardHeight = Math.max(
      26,
      Math.min(
        52,
        Math.floor((available - gap * (timeline.length - 1)) / timeline.length),
      ),
    );
    const compact = cardHeight < 40;

    timeline.slice(0, visibleCount).forEach((step, index) => {
      drawStepCard(
        drawingContext,
        step,
        index,
        48,
        startY + index * (cardHeight + gap),
        leftWidth,
        cardHeight,
        index === activeIndex,
        compact,
      );
    });

    // 右栏：目录树面板 + 逐步快照
    drawingContext.fillStyle = '#f8fafc';
    drawingContext.strokeStyle = '#dbe3f0';
    drawingContext.lineWidth = 1;
    roundedRectPath(drawingContext, rightX, startY, rightWidth, available, 8);
    drawingContext.fill();
    drawingContext.stroke();

    // 空文件系统只画根目录行 + 空提示；非空时按层级绘制树形快照
    if (snapshot.fsAfter.length === 0) {
      drawingContext.font =
        '600 12.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillStyle = '#172033';
      drawingContext.fillText('/（backend 根）', rightX + 16, startY + 30);
      drawingContext.fillStyle = '#94a3b8';
      drawingContext.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText('（空：还没有任何文件）', rightX + 32, startY + 52);
    } else {
      buildTreeLines(snapshot.fsAfter).forEach((line, lineIndex) => {
        const status = STATUS_MARKS[line.status];
        drawingContext.font =
          lineIndex === 0
            ? '600 12.5px ui-monospace, SFMono-Regular, Menlo, monospace'
            : '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        drawingContext.fillStyle = lineIndex === 0 ? '#172033' : status.color;
        const indent = line.depth * 16;
        drawingContext.fillText(
          clipText(
            drawingContext,
            `${line.text}${status.mark}`,
            rightWidth - 32 - indent,
          ),
          rightX + 16 + indent,
          startY + 30 + lineIndex * 22,
        );
      });
    }

    emit({
      scenarioLabel: SCENARIO_LABELS[current.scenario],
      stepLabel: `${visibleCount} / ${timeline.length}`,
      toolCalls: timeline
        .slice(0, visibleCount)
        .filter((step) => !step.isFinal).length,
      fileCount: snapshot.fsAfter.length,
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
