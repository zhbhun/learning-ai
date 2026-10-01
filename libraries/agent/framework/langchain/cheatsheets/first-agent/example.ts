/**
 * 范例介绍：确定性模拟一次 agent.invoke 的消息流。需要实时信息的问题产生
 * 「HumanMessage → AIMessage(tool_calls) → ToolMessage → AIMessage」四条消息，
 * 不需要外部信息的问题只产生两条，以此对照「模型何时触发工具调用回合」。
 * 输入：question（问题类型）与 step（回放进度，控制显示前几条消息）。
 * 预期结果：拖动回放进度可见 messages 逐条追加；切换问题类型可见消息数 4 对 2。
 * 不依赖 @langchain/*：消息类名与 type 字段对齐 @langchain/core 的真实消息形态。
 * 阅读主线：先看两组消息流常量，再看 draw 如何按 step 截取并绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type QuestionKey = 'weather' | 'chat';

export interface ExampleOptions {
  question: QuestionKey;
  step: number;
}

export interface ExampleSnapshot {
  questionLabel: string;
  messageCount: number;
  toolCalled: boolean;
  latestType: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

interface SimulatedMessage {
  /** 对齐 @langchain/core 的消息类名 */
  className: string;
  /** 对齐消息实例的 type 字段 */
  typeField: string;
  color: string;
  lines: string[];
}

// 与正文 weather.ts 示例一一对应的「查天气」消息流：一问一答之间多出工具回合
const WEATHER_FLOW: SimulatedMessage[] = [
  {
    className: 'HumanMessage',
    typeField: 'human',
    color: '#2563eb',
    lines: ['"What\'s the weather in San Francisco?"'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: [
      'tool_calls: get_weather({ city: "San Francisco" })',
      'content 为空：模型只决定调用工具',
    ],
  },
  {
    className: 'ToolMessage',
    typeField: 'tool',
    color: '#b45309',
    lines: ['"It\'s always sunny in San Francisco!"'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: ['"It\'s sunny in San Francisco — a great day to be outside!"'],
  },
];

// 不需要外部信息的「闲聊」消息流：没有工具调用回合
const CHAT_FLOW: SimulatedMessage[] = [
  {
    className: 'HumanMessage',
    typeField: 'human',
    color: '#2563eb',
    lines: ['"Give me one reason to keep learning today."'],
  },
  {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines: ['"You showed up today — that already counts."'],
  },
];

const QUESTION_LABELS: Record<QuestionKey, string> = {
  weather: '查天气（需要工具）',
  chat: '日常闲聊（无需工具）',
};

function buildFlow(question: QuestionKey): SimulatedMessage[] {
  return question === 'weather' ? WEATHER_FLOW : CHAT_FLOW;
}

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
  context.fillStyle = '#ffffff';
  context.strokeStyle = '#dbe3f0';
  context.lineWidth = 1;
  roundedRectPath(context, x, y, width, height, 8);
  context.fill();
  context.stroke();

  // 左侧角色色条：一眼区分三类消息
  context.fillStyle = message.color;
  context.fillRect(x + 1, y + 6, 4, height - 12);

  // 消息在 messages 数组中的下标，体现追加式结构
  context.fillStyle = message.color;
  context.font = `600 ${compact ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillText(String(index), x + 14, y + (compact ? 15 : 18));

  const nameX = x + 30;
  context.font = `600 ${compact ? 11 : 12.5}px ui-sans-serif, system-ui, sans-serif`;
  context.fillStyle = message.color;
  context.fillText(
    clipText(context, message.className, width - 170),
    nameX,
    y + (compact ? 15 : 18),
  );

  context.fillStyle = '#94a3b8';
  context.font = `${compact ? 9.5 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const typeHint = `type: "${message.typeField}"`;
  context.fillText(
    typeHint,
    x + width - 14 - context.measureText(typeHint).width,
    y + (compact ? 15 : 18),
  );

  // 内容行：紧凑模式只保留第一行（如 tool_calls 那一行）
  const lines = compact ? message.lines.slice(0, 1) : message.lines.slice(0, 2);
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

  let current: ExampleOptions = { question: 'weather', step: 4 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const flow = buildFlow(current.question);
    // step 可能超过该问题实际的消息数（闲聊只有 2 条），按实际上限截住
    const visibleCount = Math.max(1, Math.min(current.step, flow.length));
    const visible = flow.slice(0, visibleCount);

    drawingContext.fillStyle = '#172033';
    drawingContext.font =
      '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        '一次 invoke 的 messages 数组怎样随执行追加',
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
        '确定性模拟：消息类名与 type 对齐 @langchain/core，非真实模型调用',
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
      questionLabel: QUESTION_LABELS[current.question],
      messageCount: visible.length,
      toolCalled: visible.some(
        (message) => message.className === 'ToolMessage',
      ),
      latestType: visible[visible.length - 1]?.className ?? '—',
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
