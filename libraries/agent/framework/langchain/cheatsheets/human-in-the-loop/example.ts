/**
 * 范例介绍：确定性模拟工具审批闭环的状态机——模型产出 tool_calls 后，
 * humanInTheLoopMiddleware 在 afterModel 阶段命中 interruptOn 策略，invoke 正常
 * 返回 __interrupt__（actionRequests + reviewConfigs），状态落入 checkpoint 挂起；
 * 人用同 thread_id 的 Command({ resume }) 恢复：approve 原参数执行、edit 用
 * editedAction 改参后执行（id 不变）、reject 不执行并合成 status: "error" 的
 * 拒绝 ToolMessage 回喂模型。
 * 输入：decision（恢复决定）与 step（回放进度，控制显示到第几个环节）。
 * 预期结果：切换决定对比三条恢复路径的 messages 形态与最终回答；拖动回放进度
 * 可见执行停在第 3 步（messages 止于 AIMessage(tool_calls)，虚线块不是 messages
 * 成员，是 invoke 返回的审批请求）。
 * 不依赖 @langchain/*：字段名、默认文案与行为对齐 langchain 1.x
 * humanInTheLoopMiddleware 的真实实现（已在本地安装源码中核对）。
 * 阅读主线：先看 buildFlow 如何按决定拼出五段消息流，再看 draw 的气泡绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type DecisionKey = 'approve' | 'edit' | 'reject';

export interface ExampleOptions {
  decision: DecisionKey;
  step: number;
}

export interface ExampleSnapshot {
  decisionLabel: string;
  toolExecution: string;
  feedback: string;
  ending: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

interface SimulatedMessage {
  /** 对齐 @langchain/core 的消息类名；挂起块用自定义标题 */
  className: string;
  /** 对齐消息实例的 type 字段；挂起块显示 resume 输入概要 */
  typeField: string;
  color: string;
  lines: string[];
  /** 红色徽标，如 status: "error" */
  badge?: string;
  /** 挂起块：虚线边框浅紫底，不是 messages 数组的成员 */
  dashed?: boolean;
}

const DECISIONS: Record<
  DecisionKey,
  { label: string; toolExecution: string; feedback: string }
> = {
  approve: {
    label: '批准 · 原样执行',
    toolExecution: '已执行 · 原参数',
    feedback: '工具结果 ToolMessage',
  },
  edit: {
    label: '改参 · 编辑后执行',
    toolExecution: '已执行 · editedAction 新参数',
    feedback: '工具结果 ToolMessage',
  },
  reject: {
    label: '拒绝 · 不执行',
    toolExecution: '未执行',
    feedback: '拒绝消息 ToolMessage · status: error',
  },
};

// 按恢复决定拼出整条消息流：1 用户请求 → 2 模型意图 → 3 挂起（非 messages 成员）
// → 4 恢复后的 ToolMessage → 5 模型最终回答
function buildFlow(decision: DecisionKey): SimulatedMessage[] {
  // 恢复后模型看到的回传，与最终回答，随决定分叉
  const resumedTool: SimulatedMessage =
    decision === 'reject'
      ? {
          className: 'ToolMessage',
          typeField: 'tool',
          color: '#b45309',
          badge: 'status: "error"',
          lines: [
            'tool_call_id: "call_1"  · 未执行，合成拒绝回传',
            '"收件人不在白名单，禁止外发；请改用内部中转。"',
          ],
        }
      : decision === 'edit'
        ? {
            className: 'ToolMessage',
            typeField: 'tool',
            color: '#b45309',
            lines: [
              'tool_call_id: "call_1"  · editedAction 改参后执行',
              '"Email sent to bob@example.com: 请假"',
            ],
          }
        : {
            className: 'ToolMessage',
            typeField: 'tool',
            color: '#b45309',
            lines: [
              'tool_call_id: "call_1"  · 原参数执行',
              '"Email sent to alice@example.com: 请假"',
            ],
          };

  const finalAnswer: SimulatedMessage = {
    className: 'AIMessage',
    typeField: 'ai',
    color: '#0d9488',
    lines:
      decision === 'reject'
        ? ['"邮件没能发送：收件人不在白名单，需要我改发别处吗？"']
        : decision === 'edit'
          ? ['"已按修改后的收件人 bob@example.com 发出邮件。"']
          : ['"已给 alice@example.com 发出主题为「请假」的邮件。"'],
  };

  return [
    {
      className: 'HumanMessage',
      typeField: 'human',
      color: '#2563eb',
      lines: ['"给 alice@example.com 发一封主题为「请假」的邮件。"'],
    },
    {
      className: 'AIMessage',
      typeField: 'ai',
      color: '#0d9488',
      lines: [
        'tool_calls[0]: send_email({ to: "alice@example.com", subject: "请假" })',
        'id: "call_1"',
      ],
    },
    {
      className: 'Interrupt 挂起',
      typeField: `resume: { decisions: [{ type: "${decision}" }] }`,
      color: '#7c3aed',
      dashed: true,
      lines: [
        '__interrupt__[0].value.actionRequests[0]: send_email({ to: "alice@…" })',
        'reviewConfigs[0].allowedDecisions: ["approve", "edit", "reject"]',
      ],
    },
    resumedTool,
    finalAnswer,
  ];
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
  // 挂起块用虚线边框浅紫底，与真实消息区分（它不是 messages 成员）
  context.fillStyle = message.dashed ? '#f5f3ff' : '#ffffff';
  context.strokeStyle = message.dashed ? '#c4b5fd' : '#dbe3f0';
  context.lineWidth = message.dashed ? 1.5 : 1;
  context.setLineDash(message.dashed ? [6, 4] : []);
  roundedRectPath(context, x, y, width, height, 8);
  context.fill();
  context.stroke();
  context.setLineDash([]);

  // 左侧角色色条：一眼区分消息与挂起块
  context.fillStyle = message.color;
  context.fillRect(x + 1, y + 6, 4, height - 12);

  // 序号：真实消息用数组下标，挂起块不是 messages 成员
  context.fillStyle = message.color;
  context.font = `600 ${compact ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillText(message.dashed ? 'i' : String(index), x + 14, y + (compact ? 15 : 18));

  const nameX = x + 30;
  context.font = `600 ${compact ? 11 : 12.5}px ui-sans-serif, system-ui, sans-serif`;
  context.fillStyle = message.color;
  context.fillText(
    clipText(context, message.className, width - 260),
    nameX,
    y + (compact ? 15 : 18),
  );

  // 红色徽标（如 status: "error"）紧跟类名
  if (message.badge) {
    const nameWidth = Math.min(
      context.measureText(message.className).width,
      width - 260,
    );
    context.font = `${compact ? 9.5 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillStyle = '#dc2626';
    context.fillText(
      clipText(context, message.badge, width - 280 - nameWidth),
      nameX + nameWidth + 8,
      y + (compact ? 15 : 18),
    );
  }

  context.fillStyle = '#94a3b8';
  context.font = `${compact ? 9.5 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  // 挂起块右上角显示本次 resume 输入；真实消息显示 type 字段
  const typeHint = message.dashed
    ? message.typeField
    : `type: "${message.typeField}"`;
  const clippedHint = clipText(context, typeHint, message.dashed ? 300 : 150);
  context.fillText(
    clippedHint,
    x + width - 14 - context.measureText(clippedHint).width,
    y + (compact ? 15 : 18),
  );

  // 内容行：紧凑模式只保留第一行（tool_calls 概要 / 拒绝回传）
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

  let current: ExampleOptions = { decision: 'approve', step: 5 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const decision = DECISIONS[current.decision];
    const flow = buildFlow(current.decision);
    // step 可能超过消息流长度，按实际上限截住
    const visibleCount = Math.max(1, Math.min(current.step, flow.length));
    const visible = flow.slice(0, visibleCount);
    // ToolMessage 已出现才能判定工具是否执行、模型看到什么回传
    const toolResultShown = visible.some(
      (message) => message.className === 'ToolMessage',
    );

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        '审批闭环：interrupt 挂起与三种恢复',
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
        `确定性模拟 · 对齐 humanInTheLoopMiddleware · ${decision.label}`,
        width - 96,
      ),
      48,
      62,
    );

    const gap = 8;
    const startY = 80;
    const bottomReserve = 56; // 底部留白给共享 readout 读数
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
      decisionLabel: decision.label,
      toolExecution: toolResultShown
        ? decision.toolExecution
        : '尚未恢复（挂起中）',
      feedback: toolResultShown ? decision.feedback : '尚无',
      ending: visible.length < flow.length ? '回放中…' : '模型给出最终回答',
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
