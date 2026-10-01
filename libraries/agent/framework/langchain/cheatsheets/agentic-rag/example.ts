/**
 * 范例介绍：确定性模拟 Agentic RAG 的检索循环轨迹——模型决定是否检索（tool_calls
 * 的 args.query 是模型改写过的查询，不是用户原话）、gradeDocuments 条件边对检索
 * 结果打二元分并路由（yes → generate / no → rewrite）、rewrite 产出新问题后回到
 * 决策节点再次检索、多检索源按工具 description 分发（SQL 与 FAQ 而非向量库）、
 * 以及循环不收敛时 toolCallLimitMiddleware 按 runLimit 拦截，回传超限提示让模型
 * 强制收敛、承认不知道。
 * 输入：scenario（轨迹场景）与 step（回放进度，控制显示前几个块）。
 * 预期结果：切换场景对比五条轨迹的 messages 形态；拖动回放进度可见循环逐块推进，
 * 两个 grade 判定块分别出现在两次检索之后。
 * 不依赖 @langchain/*：消息类名与 type 字段对齐 @langchain/core 的真实形态，
 * 超限文案对齐 langchain 1.x toolCallLimitMiddleware 源码
 * （"Tool call limit exceeded. Do not call '...' again."）。
 * 阅读主线：先看五组轨迹常量与 grade 判定块，再看 draw 如何按 step 截取绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** grade 判定块（条件边路由，不是消息）的统一配色 */
const GRADE_COLOR = '#7c3aed';

export type ScenarioKey = 'chat' | 'one-shot' | 'rewrite' | 'route' | 'limit';

export interface ExampleOptions {
  scenario: ScenarioKey;
  step: number;
}

export interface ExampleSnapshot {
  scenarioLabel: string;
  messageCount: number;
  toolCalls: number;
  gradePath: string;
  ending: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

interface SimulatedBlock {
  /** 对齐 @langchain/core 的消息类名；grade 判定块用节点名 */
  className: string;
  /** 右侧标注：真实消息显示 type 字段，决策块显示路由信息 */
  tag: string;
  color: string;
  lines: string[];
  /** 带 tool_calls 的 AIMessage：计入「工具调用」读数 */
  toolCall?: boolean;
  badge?: string;
  badgeColor?: string;
  /** 决策块：虚线边框浅紫底，不是 messages 数组的成员 */
  dashed?: boolean;
  /** grade 决定块的判定值，进入「grade 判定」读数 */
  grade?: 'yes' | 'no';
}

// 场景一：闲聊。模型判断不需要检索，消息流里没有任何 tool_calls 与 ToolMessage
const CHAT_FLOW: SimulatedBlock[] = [
  {
    className: 'HumanMessage',
    tag: 'type: "human"',
    color: '#2563eb',
    lines: ['"你好，你能做什么？"'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    lines: [
      'content: "你好！我是公司政策问答助手，可以查退货、发货、会员政策。"',
      '无 tool_calls → shouldRetrieve 返回 END',
    ],
  },
];

// 场景二：一次命中。注意 args.query 是模型改写过的查询，不是用户原话
const ONE_SHOT_FLOW: SimulatedBlock[] = [
  {
    className: 'HumanMessage',
    tag: 'type: "human"',
    color: '#2563eb',
    lines: ['"买完东西多久能收到？"'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    toolCall: true,
    lines: [
      'tool_calls[0]: retrieve_docs({ query: "发货 时效" })',
      'id: "call_1"  ← 查询词由模型改写',
    ],
  },
  {
    className: 'ToolMessage',
    tag: 'type: "tool"',
    color: '#b45309',
    lines: [
      'tool_call_id: "call_1"',
      '"现货订单 48 小时内发出……（3 条结果拼接）"',
    ],
  },
  {
    className: 'gradeDocuments',
    tag: '条件边路由',
    color: GRADE_COLOR,
    dashed: true,
    grade: 'yes',
    lines: ['binaryScore = "yes"', '→ 路由到 generate（相关才作答）'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    lines: ['content: "现货订单 48 小时内发出，偏远地区顺延 2 天。"'],
  },
];

// 场景三：首查不足。grade 判 no → rewrite 产出新问题 → 回到决策节点再检索 → 命中
const REWRITE_FLOW: SimulatedBlock[] = [
  {
    className: 'HumanMessage',
    tag: 'type: "human"',
    color: '#2563eb',
    lines: ['"会员打折和退款怎么一起算？"'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    toolCall: true,
    lines: ['tool_calls[0]: retrieve_docs({ query: "会员 折扣" })', 'id: "call_1"'],
  },
  {
    className: 'ToolMessage',
    tag: 'type: "tool"',
    color: '#b45309',
    lines: [
      'tool_call_id: "call_1"',
      '"累计消费满 1000 元升级金卡……（缺退款侧信息）"',
    ],
  },
  {
    className: 'gradeDocuments',
    tag: '条件边路由',
    color: GRADE_COLOR,
    dashed: true,
    grade: 'no',
    lines: ['binaryScore = "no"', '→ 路由到 rewrite（结果不足以回答）'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    badge: 'rewrite 产出',
    badgeColor: GRADE_COLOR,
    lines: [
      'content: "会员折扣与退货政策如何同时适用？"',
      '← 新问题追加进消息，回到 generateQueryOrRespond',
    ],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    toolCall: true,
    lines: [
      'tool_calls[0]: retrieve_docs({ query: "会员 折扣 退货政策" })',
      'id: "call_2"  ← 用重写后的问题再次检索',
    ],
  },
  {
    className: 'ToolMessage',
    tag: 'type: "tool"',
    color: '#b45309',
    lines: ['tool_call_id: "call_2"', '"两条政策都命中（金卡 95 折 · 7 天退货）"'],
  },
  {
    className: 'gradeDocuments',
    tag: '条件边路由',
    color: GRADE_COLOR,
    dashed: true,
    grade: 'yes',
    lines: ['binaryScore = "yes"', '→ 路由到 generate'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    lines: ['content: "金卡会员退货按折后价计算，7 天内可无理由退……"'],
  },
];

// 场景四：多检索源路由。复合问题的两次调用分别去了 SQL 源与 FAQ 源，都没碰向量库
const ROUTE_FLOW: SimulatedBlock[] = [
  {
    className: 'HumanMessage',
    tag: 'type: "human"',
    color: '#2563eb',
    lines: ['"订单 1024 什么时候发货？顺便说下退货政策。"'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    toolCall: true,
    lines: [
      'tool_calls[0]: query_orders({ orderId: "1024" })',
      'id: "call_1"  ← 按 description 选了 SQL 源',
    ],
  },
  {
    className: 'ToolMessage',
    tag: 'type: "tool"',
    color: '#b45309',
    lines: ['tool_call_id: "call_1"', '"订单 1024：已发货，预计 3 月 8 日送达"'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    toolCall: true,
    lines: [
      'tool_calls[0]: search_faq({ keyword: "退货政策" })',
      'id: "call_2"  ← 复合问题，换了 FAQ 源',
    ],
  },
  {
    className: 'ToolMessage',
    tag: 'type: "tool"',
    color: '#b45309',
    lines: ['tool_call_id: "call_2"', '"签收后 7 天内可无理由退货，需保持完好"'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    lines: [
      'content: "订单 1024 预计 3 月 8 日送达；退货 7 天内可无理由申请。"',
    ],
  },
];

// 场景五：不收敛。语料里没有答案，模型反复换词重试，runLimit: 2 拦截第三次调用
const LIMIT_FLOW: SimulatedBlock[] = [
  {
    className: 'HumanMessage',
    tag: 'type: "human"',
    color: '#2563eb',
    lines: ['"2050 年公司年会主题是什么？"'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    toolCall: true,
    lines: ['tool_calls[0]: retrieve_docs({ query: "2050 年会主题" })', 'id: "call_1"'],
  },
  {
    className: 'ToolMessage',
    tag: 'type: "tool"',
    color: '#b45309',
    lines: ['tool_call_id: "call_1"', '"（命中结果与问题不相关）"'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    toolCall: true,
    lines: [
      'tool_calls[0]: retrieve_docs({ query: "年会 主题 计划" })',
      'id: "call_2"  ← 换说法再试，未收敛',
    ],
  },
  {
    className: 'ToolMessage',
    tag: 'type: "tool"',
    color: '#b45309',
    lines: ['tool_call_id: "call_2"', '"（仍不相关）"'],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    toolCall: true,
    lines: [
      'tool_calls[0]: retrieve_docs({ query: "annual meeting 2050" })',
      'id: "call_3"  ← 第三次尝试',
    ],
  },
  {
    className: 'ToolMessage',
    tag: 'type: "tool"',
    color: '#b45309',
    badge: 'runLimit: 2 超限拦截',
    badgeColor: '#dc2626',
    lines: [
      '"Tool call limit exceeded. Do not call \'retrieve_docs\' again."',
      'tool_call_id: "call_3"  · 调用被拦截，未真正执行',
    ],
  },
  {
    className: 'AIMessage',
    tag: 'type: "ai"',
    color: '#0d9488',
    lines: [
      'content: "抱歉，知识库里没有 2050 年年会主题的信息。"',
      '← 读到超限提示后被迫收敛：承认不知道',
    ],
  },
];

const SCENARIOS: Record<
  ScenarioKey,
  { label: string; flow: SimulatedBlock[]; ending: string }
> = {
  chat: {
    label: '闲聊 · 不检索',
    flow: CHAT_FLOW,
    ending: '直接回答 · 未检索',
  },
  'one-shot': {
    label: '一次命中',
    flow: ONE_SHOT_FLOW,
    ending: '一次命中 · 检索 1 次',
  },
  rewrite: {
    label: '首查不足 · 重写再检索',
    flow: REWRITE_FLOW,
    ending: '重写后命中 · 检索 2 次',
  },
  route: {
    label: '多检索源路由',
    flow: ROUTE_FLOW,
    ending: '双源路由 · SQL 与 FAQ 各 1 次',
  },
  limit: {
    label: '不收敛 · 次数上限',
    flow: LIMIT_FLOW,
    ending: '超限拦截 · 强制收敛',
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

// 块高度决定布局：two（类名行 + 两行内容）/ one（类名行 + 一行内容）/
// row（类名、徽标、首行内容挤在一行，右侧 tag 省略）
type BlockMode = 'two' | 'one' | 'row';

function drawBlock(
  context: CanvasRenderingContext2D,
  block: SimulatedBlock,
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
  mode: BlockMode,
): void {
  // 决策块（条件边路由）用虚线边框浅紫底，与 messages 成员区分
  context.fillStyle = block.dashed ? '#faf5ff' : '#ffffff';
  context.strokeStyle = block.dashed ? '#c4b5fd' : '#dbe3f0';
  context.lineWidth = block.dashed ? 1.5 : 1;
  context.setLineDash(block.dashed ? [6, 4] : []);
  roundedRectPath(context, x, y, width, height, 8);
  context.fill();
  context.stroke();
  context.setLineDash([]);

  // 左侧角色色条：一眼区分消息类型与决策块
  context.fillStyle = block.color;
  context.fillRect(x + 1, y + 5, 4, height - 10);

  // 序号：真实消息用数组下标，决策块用菱形标记（不是 messages 成员）
  context.fillStyle = block.color;
  context.font = `600 ${mode === 'row' ? 9.5 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillText(
    block.dashed ? '◆' : String(index),
    x + 13,
    y + (mode === 'row' ? height / 2 + 3.5 : 17),
  );

  const nameX = x + 28;
  const nameFont = `600 ${mode === 'row' ? 10.5 : mode === 'one' ? 11.5 : 12}px ui-sans-serif, system-ui, sans-serif`;
  context.font = nameFont;
  context.fillStyle = block.color;
  const nameBaseline =
    mode === 'row' ? y + height / 2 + 3.5 : mode === 'one' ? y + 15 : y + 17;
  const nameLimit = mode === 'row' ? width * 0.24 : width - 210;
  const name = clipText(context, block.className, nameLimit);
  context.fillText(name, nameX, nameBaseline);
  let cursor = nameX + context.measureText(name).width;

  // 徽标（如 rewrite 产出、超限拦截）紧跟类名
  if (block.badge) {
    cursor += 8;
    context.font = `${mode === 'row' ? 9 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillStyle = block.badgeColor ?? '#dc2626';
    const badge = clipText(
      context,
      block.badge,
      mode === 'row' ? 96 : width - 250 - (cursor - nameX),
    );
    context.fillText(badge, cursor, nameBaseline);
    cursor += context.measureText(badge).width;
  }

  // 右侧标注：真实消息显示 type 字段，决策块显示路由信息；单行模式省略
  if (mode !== 'row') {
    context.fillStyle = '#94a3b8';
    context.font = `${mode === 'one' ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const clippedTag = clipText(context, block.tag, 170);
    context.fillText(
      clippedTag,
      x + width - 12 - context.measureText(clippedTag).width,
      nameBaseline,
    );
  }

  // 内容行：two 显示两行，one 显示一行（贴底），row 把首行接到类名与徽标之后
  const lines =
    mode === 'two' ? block.lines.slice(0, 2) : block.lines.slice(0, 1);
  context.font = `${mode === 'row' ? 10 : mode === 'one' ? 10.5 : 11.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillStyle = '#334155';
  if (mode === 'row') {
    cursor += 8;
    context.fillText(
      clipText(context, lines[0], x + width - 10 - cursor),
      cursor,
      nameBaseline,
    );
  } else if (mode === 'one') {
    context.fillText(
      clipText(context, lines[0], width - 48),
      nameX,
      y + height - 8,
    );
  } else {
    lines.forEach((line, lineIndex) => {
      context.fillText(
        clipText(context, line, width - 48),
        nameX,
        y + 35 + lineIndex * 16,
      );
    });
  }
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

  let current: ExampleOptions = { scenario: 'one-shot', step: 5 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const scenario = SCENARIOS[current.scenario];
    const flow = scenario.flow;
    // step 可能超过该场景实际的块数，按实际上限截住
    const visibleCount = Math.max(1, Math.min(current.step, flow.length));
    const visible = flow.slice(0, visibleCount);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        'Agentic 检索循环的轨迹：决策 → 检索 → 评估 → 收敛',
        width - 80,
      ),
      40,
      34,
    );

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        `确定性模拟 · 对齐官方教程形态 · ${scenario.label}`,
        width - 80,
      ),
      40,
      54,
    );

    const startY = 72;
    const bottomReserve = 42; // 底部留白给共享 readout 读数
    const available = height - startY - bottomReserve;
    // 块多时收紧间距与高度，保证整条轨迹在画布内
    const gap = flow.length > 6 ? 6 : 10;
    const blockHeight = Math.max(
      18,
      Math.min(
        84,
        Math.floor((available - gap * (flow.length - 1)) / flow.length),
      ),
    );
    const mode: BlockMode =
      blockHeight >= 56 ? 'two' : blockHeight >= 38 ? 'one' : 'row';

    visible.forEach((block, index) => {
      drawBlock(
        drawingContext,
        block,
        index,
        40,
        startY + index * (blockHeight + gap),
        width - 80,
        blockHeight,
        mode,
      );
    });

    const grades = visible
      .filter((block) => block.grade)
      .map((block) => block.grade);
    emit({
      scenarioLabel: scenario.label,
      messageCount: visible.filter((block) => !block.dashed).length,
      toolCalls: visible.filter((block) => block.toolCall).length,
      gradePath: grades.length > 0 ? grades.join(' → ') : '—（未评估）',
      ending: visible.length < flow.length ? '回放中…' : scenario.ending,
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
