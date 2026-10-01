/**
 * 范例介绍：同一份多轮消息历史在同一 token 预算下，分别经过「裁剪」（trimMessages，
 * strategy "last" + startOn "human"）与「摘要」（summarizationMiddleware 的
 * trigger / keep 语义）后，模型实际看到的消息窗口有什么不同。裁剪把超预算的
 * 旧消息挡在窗口外；摘要把旧消息压缩成一条 summary 后替换历史，含姓名的
 * 关键信息得以保留。
 * 输入：turns（对话轮数）、budget（token 预算，同时充当裁剪的 maxTokens 与
 * 摘要的 trigger.tokens）、keep（摘要触发后保留的最近消息数）。
 * 预期结果：预算调小后，裁剪栏丢失含姓名的第 1 条消息，摘要栏姓名仍在
 * summary 中；历史总 token 低于触发线时，摘要不修改历史，两栏都完整。
 * 不依赖 @langchain/*：token 计数与触发/保留规则是确定性模拟，规则对齐真实 API。
 * 阅读主线：先看 TURN_SCRIPT 与 simulateTrim / simulateSummarize，再看 draw 布局。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleOptions {
  turns: number;
  budget: number;
  keep: number;
}

export interface ExampleSnapshot {
  historyTokens: number;
  historyCount: number;
  trimCount: number;
  trimTokens: number;
  summaryTriggered: boolean;
  summaryCount: number;
  summaryTokens: number;
  trimHasName: boolean;
  summaryHasName: boolean;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

type MessageKind = 'human' | 'ai';

interface SimMessage {
  /** 在完整历史中的下标，体现追加式结构 */
  index: number;
  kind: MessageKind;
  /** 模拟 token 数（演示用设计值，非真实计数） */
  tokens: number;
  text: string;
}

// 固定的 6 轮对话脚本：第 1 条 human 消息含姓名，后面几轮围绕 Mochi 展开。
// 每条的 token 是设计好的固定值，保证裁剪/摘要结果可以确定性复现。
const TURN_SCRIPT: Array<{
  human: string;
  humanTokens: number;
  ai: string;
  aiTokens: number;
}> = [
  {
    human: '你好！我叫 Bob。',
    humanTokens: 10,
    ai: '你好 Bob！很高兴认识你，想聊点什么？',
    aiTokens: 16,
  },
  {
    human: '我想聊聊我养的猫 Mochi，它今天早上把花瓶碰倒了。',
    humanTokens: 22,
    ai: '听起来 Mochi 很活泼！它平时还爱做什么？',
    aiTokens: 30,
  },
  {
    human: '它最爱追逗猫棒，玩累了就睡在窗台上晒太阳。',
    humanTokens: 28,
    ai: '画面感十足。想给它写点什么，还是继续聊聊它的日常？',
    aiTokens: 44,
  },
  {
    human: '帮我写一首关于 Mochi 的短诗吧。',
    humanTokens: 34,
    ai: '《窗台上的 Mochi》：午后光线落在爪尖……（八行短诗）',
    aiTokens: 58,
  },
  {
    human: '写得真好！再帮我把它翻译成英文。',
    humanTokens: 40,
    ai: 'Mochi on the Windowsill: afternoon light on her paws…（英文译文）',
    aiTokens: 72,
  },
  {
    human: '最后用一句话总结我们聊了什么。',
    humanTokens: 46,
    ai: '我们聊了 Mochi 的日常，写了一首短诗并译成了英文。',
    aiTokens: 86,
  },
];

// 一条 summary 消息的模拟 token：压缩后体量很小
const SUMMARY_TOKENS = 20;
const SUMMARY_TEXT =
  'Here is a summary…: 用户自称 Bob；聊了 Mochi 的日常并写了短诗。';

const HUMAN_COLOR = '#2563eb';
const AI_COLOR = '#0d9488';
const SUMMARY_COLOR = '#7c3aed';

function buildHistory(turns: number): SimMessage[] {
  const messages: SimMessage[] = [];
  TURN_SCRIPT.slice(0, turns).forEach((turn, turnIndex) => {
    messages.push({
      index: turnIndex * 2,
      kind: 'human',
      tokens: turn.humanTokens,
      text: turn.human,
    });
    messages.push({
      index: turnIndex * 2 + 1,
      kind: 'ai',
      tokens: turn.aiTokens,
      text: turn.ai,
    });
  });
  return messages;
}

/**
 * 裁剪模拟，对齐 trimMessages({ strategy: "last", startOn: "human" })：
 * 1. 从最后一条消息往前装，累计 token 不超过预算，得到窗口起点；
 * 2. 若窗口第一条是 ai 消息，回退到最近的 human 消息对齐（对齐可能超预算）。
 * 返回 cut：前 cut 条被挡在窗口外。
 */
function simulateTrim(
  messages: SimMessage[],
  budget: number,
): { cut: number; windowTokens: number } {
  let total = 0;
  let cut = messages.length;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (total + messages[i].tokens > budget) {
      break;
    }
    total += messages[i].tokens;
    cut = i;
  }
  // 预算连最后一条都装不下时，仍至少保留最后一条，避免空窗口
  if (cut >= messages.length) {
    cut = messages.length - 1;
    total = messages[cut].tokens;
  }
  // startOn: "human" 对齐：窗口第一条尽量从 human 消息开始
  while (cut > 0 && messages[cut].kind === 'ai') {
    cut -= 1;
    total += messages[cut].tokens;
  }
  return { cut, windowTokens: total };
}

/**
 * 摘要模拟，对齐 summarizationMiddleware 的 trigger / keep 语义：
 * 1. 历史总 token 达到触发线（trigger.tokens）才动历史，否则原样保留；
 * 2. 触发后保留最近 keep 条，其余压缩成一条 summary；
 * 3. summary 固定包含被压缩消息里的关键信息（姓名 Bob）。
 * 返回 cut：前 cut 条被压缩进 summary（cut 为 0 表示未触发）。
 */
function simulateSummarize(
  messages: SimMessage[],
  budget: number,
  keep: number,
): { triggered: boolean; cut: number; windowTokens: number } {
  const historyTokens = messages.reduce((sum, m) => sum + m.tokens, 0);
  if (historyTokens < budget) {
    return { triggered: false, cut: 0, windowTokens: historyTokens };
  }
  const cut = Math.max(0, messages.length - keep);
  const keptTokens = messages.slice(cut).reduce((sum, m) => sum + m.tokens, 0);
  return {
    triggered: true,
    cut,
    windowTokens: SUMMARY_TOKENS + keptTokens,
  };
}

// 超出可用宽度时截断加省略号，保证文字不溢出
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

type RowState = 'visible' | 'cut' | 'compressed' | 'summary';

function drawRow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  row: { label: string; badge: string; tokens: number; text: string },
  state: RowState,
  compact: boolean,
): void {
  const dimmed = state === 'cut' || state === 'compressed';
  const color =
    state === 'summary'
      ? SUMMARY_COLOR
      : row.badge === 'H'
        ? HUMAN_COLOR
        : AI_COLOR;

  context.save();
  context.globalAlpha = dimmed ? 0.4 : 1;

  context.fillStyle = state === 'summary' ? '#f5f0ff' : '#ffffff';
  context.strokeStyle = state === 'summary' ? SUMMARY_COLOR : '#dbe3f0';
  context.lineWidth = 1;
  roundedRectPath(context, x, y, width, height, 5);
  context.fill();
  context.stroke();

  // 左侧角色色条：human / ai / summary 三种来源一眼可分
  context.fillStyle = color;
  context.fillRect(x + 1, y + 3, 3, height - 6);

  const baseY = compact ? y + height - 2.5 : y + height / 2 + 4;

  if (compact) {
    // 紧凑模式：只保留下标、类型与 token
    context.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillStyle = color;
    context.fillText(`${row.label} ${row.badge}`, x + 9, baseY);
    const tokenText = `${row.tokens}t`;
    context.fillStyle = '#64748b';
    context.fillText(
      tokenText,
      x + width - 8 - context.measureText(tokenText).width,
      baseY,
    );
  } else {
    context.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillStyle = color;
    const labelWidth = context.measureText(`${row.label} ${row.badge}`).width;
    context.fillText(`${row.label} ${row.badge}`, x + 10, baseY);

    context.font = '10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillStyle = '#64748b';
    const tokenText = `${row.tokens} tok`;
    const tokenWidth = context.measureText(tokenText).width;
    context.fillText(tokenText, x + width - 8 - tokenWidth, baseY);

    const stateText =
      state === 'cut' ? '✂ 裁掉' : state === 'compressed' ? '被压缩' : '';
    if (stateText) {
      context.fillStyle = '#b45309';
      const stateWidth = context.measureText(stateText).width;
      context.fillText(
        stateText,
        x + width - 14 - tokenWidth - stateWidth,
        baseY,
      );
    }

    context.font = '11px ui-sans-serif, system-ui, sans-serif';
    context.fillStyle = '#334155';
    const textLeft = x + 18 + labelWidth;
    const textMax =
      width - (18 + labelWidth) - tokenWidth - (stateText ? 58 : 14);
    context.fillText(
      clipText(context, row.text, Math.max(24, textMax)),
      textLeft,
      baseY,
    );
  }
  context.restore();
}

function drawColumnHeader(
  context: CanvasRenderingContext2D,
  x: number,
  width: number,
  title: string,
  paramLine: string,
  note: string,
  noteColor: string,
  hasName: boolean,
): void {
  context.font = '600 13px ui-sans-serif, system-ui, sans-serif';
  context.fillStyle = '#172033';
  context.fillText(clipText(context, title, width - 96), x, 96);

  // 姓名徽标：关键信息（Bob）是否还留在该策略的窗口里
  const badge = hasName ? '姓名：在窗口' : '姓名：不在窗口';
  context.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
  context.fillStyle = hasName ? '#15803d' : '#b91c1c';
  const badgeWidth = context.measureText(badge).width;
  context.fillText(badge, x + width - badgeWidth, 96);

  context.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  context.fillStyle = '#64748b';
  context.fillText(clipText(context, paramLine, width), x, 114);

  context.fillStyle = noteColor;
  context.fillText(clipText(context, note, width), x, 132);
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

  let current: ExampleOptions = { turns: 6, budget: 300, keep: 3 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const history = buildHistory(current.turns);
    const historyTokens = history.reduce((sum, m) => sum + m.tokens, 0);
    const trim = simulateTrim(history, current.budget);
    const summary = simulateSummarize(history, current.budget, current.keep);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        'token 预算下，裁剪与摘要分别让模型看到什么',
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
        '确定性模拟：左侧对齐 trimMessages(strategy "last", startOn "human")，右侧对齐 summarizationMiddleware(trigger / keep)',
        width - 96,
      ),
      48,
      62,
    );

    const gutter = 16;
    const columnWidth = Math.floor((width - 96 - gutter) / 2);
    const leftX = 48;
    const rightX = leftX + columnWidth + gutter;

    // 姓名（关键信息）判定：裁剪只看含姓名的第 1 条消息是否还在窗口内；
    // 摘要未触发时历史完整，触发后姓名被压进 summary 文案，两种情况都保留。
    const trimHasName = trim.cut === 0;
    const summaryHasName =
      !summary.triggered || SUMMARY_TEXT.includes('Bob');

    const summaryCount = summary.triggered
      ? 1 + (history.length - summary.cut)
      : history.length;

    // 左栏：裁剪
    drawColumnHeader(
      drawingContext,
      leftX,
      columnWidth,
      '裁剪 trimMessages',
      `maxTokens: ${current.budget} · strategy: "last" · startOn: "human"`,
      `窗口 ${history.length - trim.cut} 条 / ${trim.windowTokens} tok（历史 ${history.length} 条 / ${historyTokens} tok）`,
      '#334155',
      trimHasName,
    );

    // 右栏：摘要
    drawColumnHeader(
      drawingContext,
      rightX,
      columnWidth,
      '摘要 summarizationMiddleware',
      `trigger: { tokens: ${current.budget} } · keep: { messages: ${current.keep} }`,
      summary.triggered
        ? `已触发：前 ${summary.cut} 条压缩为 1 条 summary，窗口 ${summaryCount} 条 / ${summary.windowTokens} tok`
        : `未触发：历史 ${historyTokens} tok 低于触发线，原样保留（${summaryCount} 条 / ${summary.windowTokens} tok）`,
      summary.triggered ? '#334155' : '#b45309',
      summaryHasName,
    );

    // 消息行区域：两栏行数按需要的最大行数均分高度
    const listTop = 146;
    const bottomReserve = 96; // 底部留白给共享 readout 读数
    const available = Math.max(60, height - listTop - bottomReserve);
    const rightRows = summary.triggered ? history.length + 1 : history.length;
    const maxRows = Math.max(history.length, rightRows);
    const rowHeight = Math.max(
      9,
      Math.min(26, Math.floor(available / maxRows) - 3),
    );
    const compact = rowHeight < 18;
    const rowStep = rowHeight + 3;

    history.forEach((message, i) => {
      drawRow(
        drawingContext,
        leftX,
        listTop + i * rowStep,
        columnWidth,
        rowHeight,
        {
          label: `#${String(message.index).padStart(2, '0')}`,
          badge: message.kind === 'human' ? 'H' : 'A',
          tokens: message.tokens,
          text: message.text,
        },
        i < trim.cut ? 'cut' : 'visible',
        compact,
      );
    });

    if (summary.triggered) {
      // summary 行占据列表第一行，其后是被压缩消息与保留消息
      drawRow(
        drawingContext,
        rightX,
        listTop,
        columnWidth,
        rowHeight,
        {
          label: 'SUM',
          badge: 'S',
          tokens: SUMMARY_TOKENS,
          text: SUMMARY_TEXT,
        },
        'summary',
        compact,
      );
      history.forEach((message, i) => {
        drawRow(
          drawingContext,
          rightX,
          listTop + (i + 1) * rowStep,
          columnWidth,
          rowHeight,
          {
            label: `#${String(message.index).padStart(2, '0')}`,
            badge: message.kind === 'human' ? 'H' : 'A',
            tokens: message.tokens,
            text: message.text,
          },
          i < summary.cut ? 'compressed' : 'visible',
          compact,
        );
      });
    } else {
      history.forEach((message, i) => {
        drawRow(
          drawingContext,
          rightX,
          listTop + i * rowStep,
          columnWidth,
          rowHeight,
          {
            label: `#${String(message.index).padStart(2, '0')}`,
            badge: message.kind === 'human' ? 'H' : 'A',
            tokens: message.tokens,
            text: message.text,
          },
          'visible',
          compact,
        );
      });
    }

    emit({
      historyTokens,
      historyCount: history.length,
      trimCount: history.length - trim.cut,
      trimTokens: trim.windowTokens,
      summaryTriggered: summary.triggered,
      summaryCount,
      summaryTokens: summary.windowTokens,
      trimHasName,
      summaryHasName,
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
