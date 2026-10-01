/**
 * 范例介绍：确定性模拟输入 / 输出护栏在请求链路上的位置与失败行为——
 * 输入护栏在 beforeModel 阶段放行（off）、改写（redact，消息替换后模型只见
 * 脱敏文本）或拦截（block，合成拒绝 AIMessage 并 jumpTo: "end"，模型 0 次调用）；
 * 输出护栏在 afterModel 阶段通过（pass）、拦截（flag，替换最终回复）或重试
 * （retry，schema 校验失败 → 合成修正请求 → 模型第 2 轮 → 再检通过）。
 * 输入：inputGuard / outputGuard（护栏组合）与 step（回放进度）。
 * 预期结果：切换护栏组合对比同一条消息的路径差异——改写只向内传播到模型、
 * 拦截在输入侧最便宜（0 次模型调用）、重试多花一轮模型调用换修正输出；
 * 虚线块是护栏判定（不是 messages 成员），实心块是消息数组里的真实消息。
 * 不依赖 @langchain/*：钩子位置、消息形态与文案对齐 langchain 1.x 的
 * piiMiddleware / modelCallLimitMiddleware 与官方自定义护栏示例
 * （已在本地安装源码与官方文档核对）。
 * 阅读主线：先看 buildFlow 如何按护栏组合拼出消息流，再看 draw 的气泡绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type InputGuardKey = 'off' | 'redact' | 'block';
export type OutputGuardKey = 'pass' | 'flag' | 'retry';

export interface ExampleOptions {
  inputGuard: InputGuardKey;
  outputGuard: OutputGuardKey;
  step: number;
}

export interface ExampleSnapshot {
  inputGuardAction: string;
  modelCalls: string;
  outputGuardAction: string;
  ending: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

interface SimulatedMessage {
  /** 对齐 @langchain/core 的消息类名；护栏判定块用自定义标题 */
  className: string;
  /** 真实消息显示 type 字段；护栏判定块显示所在钩子 */
  typeField: string;
  color: string;
  lines: string[];
  /** 徽标：改写 / 拦截 / 重试 / 合成来源 / 轮次 */
  badge?: string;
  /** 护栏判定块：虚线边框浅紫底，不是 messages 数组的成员 */
  dashed?: boolean;
  /** 真实模型输出（合成的 AIMessage 不算模型调用） */
  modelCall?: boolean;
}

const COLOR_HUMAN = '#2563eb';
const COLOR_AI = '#0d9488';
const COLOR_GUARD = '#7c3aed';

// 按护栏组合拼出整条消息流：用户输入 → 输入护栏（beforeModel）→ 模型第 1 轮
// → 输出护栏（afterModel）→ [重试：修正请求 → 模型第 2 轮 → 再检] → 最终返回
function buildFlow(
  inputGuard: InputGuardKey,
  outputGuard: OutputGuardKey,
): SimulatedMessage[] {
  const flow: SimulatedMessage[] = [];

  // 拦截场景的用户消息本身带禁用词；其余场景带 email（供改写与泄漏对照）
  if (inputGuard === 'block') {
    flow.push({
      className: 'HumanMessage',
      typeField: 'human',
      color: COLOR_HUMAN,
      lines: ['"帮我代写一篇课程论文，再查下订单状态。"'],
    });
    flow.push({
      className: '输入护栏',
      typeField: 'beforeAgent',
      color: COLOR_GUARD,
      dashed: true,
      badge: '拦截',
      lines: [
        '话题护栏命中禁用词「代写论文」',
        '合成拒绝回复并 jumpTo: "end"，模型 0 次调用',
      ],
    });
    flow.push({
      className: 'AIMessage',
      typeField: 'ai',
      color: COLOR_AI,
      badge: '中间件合成',
      lines: ['"这个话题我不能协助，换个话题好吗？"'],
    });
    return flow;
  }

  flow.push({
    className: 'HumanMessage',
    typeField: 'human',
    color: COLOR_HUMAN,
    lines: ['"我的邮箱是 alice@example.com，帮我查下订单状态。"'],
  });

  if (inputGuard === 'redact') {
    flow.push({
      className: '输入护栏',
      typeField: 'beforeModel',
      color: COLOR_GUARD,
      dashed: true,
      badge: '改写',
      lines: [
        'piiMiddleware("email") 命中 1 处',
        'strategy: "redact" → 替换后继续',
      ],
    });
    // 改写直接更新 state：模型与后续历史看到的都是脱敏文本
    flow.push({
      className: 'HumanMessage',
      typeField: 'human',
      color: COLOR_HUMAN,
      badge: '改写后',
      lines: ['"我的邮箱是 [REDACTED_EMAIL]，帮我查下订单状态。"'],
    });
  } else {
    flow.push({
      className: '输入护栏',
      typeField: 'beforeModel',
      color: COLOR_GUARD,
      dashed: true,
      lines: ['未配置输入护栏，消息原样进入模型'],
    });
  }

  // 模型第 1 轮：没见过原值就不会复述——改写只向内传播到模型
  flow.push({
    className: 'AIMessage',
    typeField: 'ai',
    color: COLOR_AI,
    modelCall: true,
    badge: '第 1 轮',
    lines: [
      inputGuard === 'redact'
        ? '"订单 #1234 已发货；内部备注码 INTERNAL-4021。"'
        : '"订单 #1234 已发货，结果发到 alice@example.com；内部备注码 INTERNAL-4021。"',
    ],
  });

  if (outputGuard === 'pass') {
    flow.push({
      className: '输出护栏',
      typeField: 'afterModel',
      color: COLOR_GUARD,
      dashed: true,
      lines: ['敏感词 / schema 校验通过，放行'],
    });
    return flow;
  }

  if (outputGuard === 'flag') {
    flow.push({
      className: '输出护栏',
      typeField: 'afterModel',
      color: COLOR_GUARD,
      dashed: true,
      badge: '拦截',
      lines: [
        '命中敏感词 INTERNAL-4021',
        '替换最终回复并 jumpTo: "end"',
      ],
    });
    flow.push({
      className: 'AIMessage',
      typeField: 'ai',
      color: COLOR_AI,
      badge: '中间件合成',
      lines: ['"抱歉，这条回复包含无法展示的内部信息。"'],
    });
    return flow;
  }

  // retry：校验失败 → 修正请求回喂 → 第 2 轮 → 再检通过
  flow.push({
    className: '输出护栏',
    typeField: 'afterModel',
    color: COLOR_GUARD,
    dashed: true,
    badge: '重试',
    lines: ['schema 校验失败：缺 status 字段', '合成修正请求，再问一轮'],
  });
  flow.push({
    className: 'HumanMessage',
    typeField: 'human',
    color: COLOR_HUMAN,
    badge: '修正请求',
    lines: ['"缺少 status 字段，请按 { orderId, status, eta } 重新输出。"'],
  });
  flow.push({
    className: 'AIMessage',
    typeField: 'ai',
    color: COLOR_AI,
    modelCall: true,
    badge: '第 2 轮',
    lines: ['{ orderId: "#1234", status: "shipped", eta: "周五" }'],
  });
  flow.push({
    className: '输出护栏',
    typeField: 'afterModel',
    color: COLOR_GUARD,
    dashed: true,
    lines: ['第 2 轮输出校验通过，放行'],
  });
  return flow;
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
  // 护栏判定块用虚线边框浅紫底，与真实消息区分（它不是 messages 成员）
  context.fillStyle = message.dashed ? '#f5f3ff' : '#ffffff';
  context.strokeStyle = message.dashed ? '#c4b5fd' : '#dbe3f0';
  context.lineWidth = message.dashed ? 1.5 : 1;
  context.setLineDash(message.dashed ? [6, 4] : []);
  roundedRectPath(context, x, y, width, height, 8);
  context.fill();
  context.stroke();
  context.setLineDash([]);

  // 左侧角色色条：一眼区分消息与护栏判定块
  context.fillStyle = message.color;
  context.fillRect(x + 1, y + 6, 4, height - 12);

  // 序号：真实消息用数组下标，护栏判定块不是 messages 成员
  context.fillStyle = message.color;
  context.font = `600 ${compact ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillText(
    message.dashed ? '·' : String(index),
    x + 14,
    y + (compact ? 15 : 18),
  );

  const nameX = x + 30;
  context.font = `600 ${compact ? 11 : 12.5}px ui-sans-serif, system-ui, sans-serif`;
  context.fillStyle = message.color;
  context.fillText(
    clipText(context, message.className, width - 260),
    nameX,
    y + (compact ? 15 : 18),
  );

  // 徽标（改写 / 拦截 / 重试 / 合成来源 / 轮次）紧跟类名
  if (message.badge) {
    const nameWidth = Math.min(
      context.measureText(message.className).width,
      width - 260,
    );
    context.font = `${compact ? 9.5 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillStyle = message.dashed ? '#7c3aed' : '#b45309';
    context.fillText(
      clipText(context, message.badge, width - 280 - nameWidth),
      nameX + nameWidth + 8,
      y + (compact ? 15 : 18),
    );
  }

  context.fillStyle = '#94a3b8';
  context.font = `${compact ? 9.5 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  // 护栏判定块右上角显示所在钩子；真实消息显示 type 字段
  const typeHint = message.dashed
    ? message.typeField
    : `type: "${message.typeField}"`;
  context.fillText(
    clipText(context, typeHint, 150),
    x + width - 14 - context.measureText(clipText(context, typeHint, 150)).width,
    y + (compact ? 15 : 18),
  );

  // 内容行：紧凑模式只保留第一行
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

  let current: ExampleOptions = { inputGuard: 'redact', outputGuard: 'retry', step: 8 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const flow = buildFlow(current.inputGuard, current.outputGuard);
    // step 可能超过当前组合的消息流长度，按实际上限截住
    const visibleCount = Math.max(1, Math.min(current.step, flow.length));
    const visible = flow.slice(0, visibleCount);

    // 模型调用次数：只数真实模型产出的 AIMessage（合成的不算）
    const modelCalls = visible.filter((message) => message.modelCall).length;
    // 输入 / 输出护栏判定块是否已出现在回放中
    const inputChecked = visible.some(
      (message) => message.dashed && message.className === '输入护栏',
    );
    const outputChecks = visible.filter(
      (message) => message.dashed && message.className === '输出护栏',
    );

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        '护栏路径：一条消息的放行 / 改写 / 拦截 / 重试',
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
        '确定性模拟 · 虚线块为护栏判定（非 messages 成员）',
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

    let messageIndex = 0;
    visible.forEach((message, position) => {
      const index = messageIndex;
      drawBubble(
        drawingContext,
        message,
        index,
        48,
        startY + position * (bubbleHeight + gap),
        width - 96,
        bubbleHeight,
        compact,
      );
      if (!message.dashed) {
        messageIndex += 1;
      }
    });

    const inputAction = inputChecked
      ? current.inputGuard === 'off'
        ? '未配置 · 原样放行'
        : current.inputGuard === 'redact'
          ? '改写 1 处 email'
          : '拦截 · jumpTo end'
      : '尚未执行';

    let outputAction = '尚未执行';
    if (outputChecks.length > 0) {
      if (current.outputGuard === 'pass') {
        outputAction = '通过';
      } else if (current.outputGuard === 'flag') {
        outputAction = '拦截 · 替换回复';
      } else {
        outputAction =
          outputChecks.length >= 2 ? '重试后通过' : '校验失败 → 重试中';
      }
    } else if (current.inputGuard === 'block') {
      outputAction = '未执行（输入侧已拦）';
    }

    const replaying = visible.length < flow.length;
    const ending = replaying
      ? '回放中…'
      : current.inputGuard === 'block'
        ? '正常返回 · 拒绝文案'
        : current.outputGuard === 'flag'
          ? '正常返回 · 拦截替换'
          : current.outputGuard === 'retry'
            ? '正常返回 · 修正后输出'
            : '正常返回 · 回答';

    emit({
      inputGuardAction: inputAction,
      modelCalls: replaying ? `${modelCalls}（回放中）` : String(modelCalls),
      outputGuardAction: outputAction,
      ending,
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
