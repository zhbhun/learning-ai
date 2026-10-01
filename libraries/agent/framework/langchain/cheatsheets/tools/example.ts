/**
 * 范例介绍：确定性模拟一个工具回合的消息协议——AIMessage.tool_calls 如何携带
 * name/args/id，ToolMessage 如何用 tool_call_id 回传，以及工具失败时 Agent 看到
 * 什么：抛错被默认兜底转成错误 ToolMessage、handleToolErrors: false 时异常冒泡
 * 终止、返回错误文本让模型转向用户、调用不存在的工具时 status: "error" 回传。
 * 输入：mode（执行模式）与 step（回放进度，控制显示前几条消息）。
 * 预期结果：切换模式对比各结局的 messages 形态；拖动回放进度可见消息逐条追加。
 * 不依赖 @langchain/*：消息类名、type 字段与错误文案对齐 langchain 1.x
 * createAgent 内置 ToolNode 的真实行为（默认模板已在安装源码中核对）。
 * 阅读主线：先看五组消息流常量，再看 draw 如何按 step 截取并绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ModeKey =
  | 'ok'
  | 'throw-caught'
  | 'throw-bubble'
  | 'return-error'
  | 'unknown-tool';

export interface ExampleOptions {
  mode: ModeKey;
  step: number;
}

export interface ExampleSnapshot {
  modeLabel: string;
  messageCount: number;
  toolOutcome: string;
  ending: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

interface SimulatedMessage {
  /** 对齐 @langchain/core 的消息类名；异常终止块用自定义标题 */
  className: string;
  /** 对齐消息实例的 type 字段；异常终止块显示触发条件 */
  typeField: string;
  color: string;
  lines: string[];
  /** 红色徽标，如 status: "error" */
  badge?: string;
  /** 异常终止块：虚线边框浅红底，不是 messages 数组的成员 */
  dashed?: boolean;
}

// 正常回合：意图（call_1）→ 结果回传 → 最终回答
const OK_FLOW: SimulatedMessage[] = [
  {
    className: 'HumanMessage',
    typeField: 'human',
    color: '#2563eb',
    lines: ['"帮我找姓 Zhang 的客户，最多 3 条。"'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: [
      'tool_calls[0]: search_database({ query: "Zhang", limit: 3 })',
      'id: "call_1"',
    ],
  },
  {
    className: 'ToolMessage',
    typeField: 'tool',
    color: '#b45309',
    lines: ['tool_call_id: "call_1"', '"Found 3 results for \'Zhang\'"'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: ['"找到 3 位姓 Zhang 的客户…"'],
  },
];

// 工具抛错、默认兜底：错误被转成固定模板的 ToolMessage，模型修正参数重试
const THROW_CAUGHT_FLOW: SimulatedMessage[] = [
  {
    className: 'HumanMessage',
    typeField: 'human',
    color: '#2563eb',
    lines: ['"列出姓 Zhang 的客户，最多 3000 条。"'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: [
      'tool_calls[0]: search_database({ query: "Zhang", limit: 3000 })',
      'id: "call_1"',
    ],
  },
  {
    className: 'ToolMessage',
    typeField: 'tool',
    color: '#b45309',
    lines: [
      'tool_call_id: "call_1"  · 抛错被默认兜底',
      '"Error: limit must be ≤ 100\\n Please fix your mistakes."',
    ],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: [
      'tool_calls[0]: search_database({ query: "Zhang", limit: 50 })',
      'id: "call_2"  ← 看到错误后修正参数',
    ],
  },
  {
    className: 'ToolMessage',
    typeField: 'tool',
    color: '#b45309',
    lines: ['tool_call_id: "call_2"', '"Found 50 results for \'Zhang\'"'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: ['"共 50 条记录，已列出…"'],
  },
];

// 工具抛错、异常冒泡（handleToolErrors: false 一类硬失败）：
// 没有 ToolMessage，消息流停在 AIMessage，invoke 以异常拒绝
const THROW_BUBBLE_FLOW: SimulatedMessage[] = [
  {
    className: 'HumanMessage',
    typeField: 'human',
    color: '#2563eb',
    lines: ['"列出姓 Zhang 的客户，最多 3000 条。"'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: [
      'tool_calls[0]: search_database({ query: "Zhang", limit: 3000 })',
      'id: "call_1"',
    ],
  },
  {
    className: '异常冒泡',
    typeField: 'handleToolErrors: false',
    color: '#dc2626',
    dashed: true,
    lines: [
      'ToolInvocationError 向上冒泡',
      '没有 ToolMessage · invoke 以异常终止',
    ],
  },
];

// 工具返回错误文本：文案完全自控，模型读后转而向用户澄清
const RETURN_ERROR_FLOW: SimulatedMessage[] = [
  {
    className: 'HumanMessage',
    typeField: 'human',
    color: '#2563eb',
    lines: ['"帮我查一下姓 z 的客户。"'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: ['tool_calls[0]: search_database({ query: "z" })', 'id: "call_1"'],
  },
  {
    className: 'ToolMessage',
    typeField: 'tool',
    color: '#b45309',
    lines: [
      'tool_call_id: "call_1"  · 工具返回的错误文本',
      '"query too short: \'z\' — give at least 2 characters"',
    ],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: ['"关键词太短了，能给我至少两个字符吗？"'],
  },
];

// 模型幻觉了不存在的工具名：优雅回传错误（status: "error"），模型改用正确名字
const UNKNOWN_TOOL_FLOW: SimulatedMessage[] = [
  {
    className: 'HumanMessage',
    typeField: 'human',
    color: '#2563eb',
    lines: ['"帮我找姓 Zhang 的客户，最多 3 条。"'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: [
      'tool_calls[0]: search_db({ query: "Zhang", limit: 3 })',
      'id: "call_1"  ← 工具名拼错',
    ],
  },
  {
    className: 'ToolMessage',
    typeField: 'tool',
    color: '#b45309',
    badge: 'status: "error"',
    lines: [
      'tool_call_id: "call_1"',
      '"Error: search_db is not a valid tool, try one of [search_database]."',
    ],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: [
      'tool_calls[0]: search_database({ query: "Zhang", limit: 3 })',
      'id: "call_2"  ← 改用正确工具名',
    ],
  },
  {
    className: 'ToolMessage',
    typeField: 'tool',
    color: '#b45309',
    lines: ['tool_call_id: "call_2"', '"Found 3 results for \'Zhang\'"'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: ['"找到 3 位姓 Zhang 的客户…"'],
  },
];

const MODES: Record<
  ModeKey,
  {
    label: string;
    flow: SimulatedMessage[];
    toolOutcome: string;
    ending: string;
  }
> = {
  ok: {
    label: '正常回合',
    flow: OK_FLOW,
    toolOutcome: '正常回传',
    ending: '模型给出回答',
  },
  'throw-caught': {
    label: '工具抛错 · 默认捕获',
    flow: THROW_CAUGHT_FLOW,
    toolOutcome: '错误回传 · 默认模板',
    ending: '模型修正参数后回答',
  },
  'throw-bubble': {
    label: '工具抛错 · 冒泡终止',
    flow: THROW_BUBBLE_FLOW,
    toolOutcome: '未生成 ToolMessage',
    ending: 'invoke 以异常终止',
  },
  'return-error': {
    label: '返回错误文本',
    flow: RETURN_ERROR_FLOW,
    toolOutcome: '错误回传 · 自写文案',
    ending: '模型向用户澄清',
  },
  'unknown-tool': {
    label: '调用不存在的工具',
    flow: UNKNOWN_TOOL_FLOW,
    toolOutcome: '错误回传 · status: error',
    ending: '模型改用正确工具名',
  },
};

// 超出可用宽度时截断加省略号，保证文字不溢出气泡
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

function drawBubble(
  context: CanvasRenderingContext2D,
  message: SimulatedMessage,
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
  compact: boolean,
): void {
  // 异常终止块用虚线边框浅红底，与真实消息区分
  context.fillStyle = message.dashed ? '#fef2f2' : '#ffffff';
  context.strokeStyle = message.dashed ? '#fca5a5' : '#dbe3f0';
  context.lineWidth = message.dashed ? 1.5 : 1;
  context.setLineDash(message.dashed ? [6, 4] : []);
  roundedRectPath(context, x, y, width, height, 8);
  context.fill();
  context.stroke();
  context.setLineDash([]);

  // 左侧角色色条：一眼区分消息与异常块
  context.fillStyle = message.color;
  context.fillRect(x + 1, y + 6, 4, height - 12);

  // 序号：真实消息用数组下标，异常块不是 messages 成员
  context.fillStyle = message.color;
  context.font = `600 ${compact ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillText(message.dashed ? '!' : String(index), x + 14, y + (compact ? 15 : 18));

  const nameX = x + 30;
  context.font = `600 ${compact ? 11 : 12.5}px ui-sans-serif, system-ui, sans-serif`;
  context.fillStyle = message.color;
  context.fillText(
    clipText(context, message.className, width - 200),
    nameX,
    y + (compact ? 15 : 18),
  );

  // 红色徽标（如 status: "error"）紧跟类名
  if (message.badge) {
    const nameWidth = Math.min(
      context.measureText(message.className).width,
      width - 200,
    );
    context.font = `${compact ? 9.5 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillStyle = '#dc2626';
    context.fillText(
      clipText(context, message.badge, width - 240 - nameWidth),
      nameX + nameWidth + 8,
      y + (compact ? 15 : 18),
    );
  }

  context.fillStyle = '#94a3b8';
  context.font = `${compact ? 9.5 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const typeHint = message.dashed
    ? message.typeField
    : `type: "${message.typeField}"`;
  const clippedHint = clipText(context, typeHint, 180);
  context.fillText(
    clippedHint,
    x + width - 14 - context.measureText(clippedHint).width,
    y + (compact ? 15 : 18),
  );

  // 内容行：紧凑模式只保留第一行（tool_calls 概要 / tool_call_id）
  const lines = compact
    ? message.lines.slice(0, 1)
    : message.lines.slice(0, 2);
  context.font = `${compact ? 10.5 : 12}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillStyle = '#334155';
  lines.forEach((line, lineIndex) => {
    context.fillText(
      clipText(context, line, width - 52),
      nameX,
      y + (compact ? 29 : 38 + lineIndex * 17),
    );
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
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleOptions = { mode: 'ok', step: 4 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const mode = MODES[current.mode];
    const flow = mode.flow;
    // step 可能超过该模式实际的消息数，按实际上限截住
    const visibleCount = Math.max(1, Math.min(current.step, flow.length));
    const visible = flow.slice(0, visibleCount);
    // ToolMessage 已出现（或异常块已出现）才能判定工具结果的形态
    const toolResultShown = visible.some(
      (message) => message.className === 'ToolMessage' || message.dashed,
    );

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        '一个工具回合的消息协议：tool_calls 与 ToolMessage',
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
        `确定性模拟 · 对齐 createAgent 默认行为 · ${mode.label}`,
        width - 96,
      ),
      48,
      62,
    );

    const gap = 10;
    const startY = 84;
    const bottomReserve = 60; // 底部留白给共享 readout 读数
    const available = height - startY - bottomReserve;
    // 气泡高度按整条消息流均分，回放过程中不会跳动
    const bubbleHeight = Math.max(
      34,
      Math.min(
        86,
        Math.floor((available - gap * (flow.length - 1)) / flow.length),
      ),
    );
    const compact = bubbleHeight < 58;

    visible.forEach((message, index) => {
      drawBubble(
        drawingContext,
        message,
        index,
        48,
        startY + index * (bubbleHeight + gap),
        width - 96,
        bubbleHeight,
        compact,
      );
    });

    emit({
      modeLabel: mode.label,
      messageCount: visible.filter((message) => !message.dashed).length,
      toolOutcome: toolResultShown
        ? mode.toolOutcome
        : '尚未生成 ToolMessage',
      ending: visible.length < flow.length ? '回放中…' : mode.ending,
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
