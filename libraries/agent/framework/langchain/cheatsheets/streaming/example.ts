/**
 * 范例介绍：确定性回放一次聊天模型调用在两种流式 API 下的输出形态。
 * 左侧是 model.stream() 的视角：每个 AIMessageChunk 只带增量文本，
 * 用 concat 逐步拼出完整消息；右侧是 model.streamEvents() 的视角：
 * on_chat_model_start → on_chat_model_stream × 8 → on_chat_model_end
 * 的事件序列与关键字段（data.input / data.chunk / data.output）。
 * 输入：step（回放进度，0=调用刚发出，10=事件全部到达）。
 * 预期结果：拖动回放进度，左侧 chunk 逐块到达、拼接进度条同步增长；
 * 右侧事件按固定顺序出现、当前事件高亮；到第 10 步两种视角拼出同一句话。
 * 不依赖 @langchain/*：chunk 与事件的名称、字段对齐官方文档的模型级示例。
 * 阅读主线：先看 CHUNKS / TIMELINE 常量（时间线的单一真源），再看
 * describeReplay() 如何按 step 截取，最后看 draw() 如何呈现两栏对照。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleArgs {
  step: number;
}

/** 一个事件的展示模型：事件名 + 载荷表达式 + 到达时 stream() 侧已收到的 chunk 数。 */
export interface ReplayEvent {
  name: 'on_chat_model_start' | 'on_chat_model_stream' | 'on_chat_model_end';
  dataField: string;
  chunksAfter: number;
}

/** 按 step 截取后的回放状态：左右两栏共用的数据。 */
export interface ReplayState {
  step: number;
  totalSteps: number;
  chunks: string[];
  assembled: string;
  answerLength: number;
  events: ReplayEvent[];
  activeEventIndex: number;
  percent: number;
}

export interface ExampleSnapshot {
  step: number;
  totalSteps: number;
  chunkCount: number;
  totalChunks: number;
  assembledLength: number;
  answerLength: number;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

// 模拟一次模型回复：8 个增量块拼成一句话。块边界故意不均匀，对齐真实 token 形态。
const CHUNKS = [
  '流式输出',
  '让应用',
  '在模型生成的',
  '同时逐段',
  '展示内容，',
  '不必等',
  '完整回复',
  '生成完毕。',
];
const ANSWER = CHUNKS.join('');

// 事件时间线：start → 8 个 stream 事件（每个对应一个 chunk）→ end。
const START_EVENT: ReplayEvent = {
  name: 'on_chat_model_start',
  dataField: 'data.input = [发出的消息]',
  chunksAfter: 0,
};
const STREAM_EVENTS: ReplayEvent[] = CHUNKS.map((text, index) => ({
  name: 'on_chat_model_stream',
  dataField: `data.chunk.text = "${text}"`,
  chunksAfter: index + 1,
}));
const END_EVENT: ReplayEvent = {
  name: 'on_chat_model_end',
  dataField: 'data.output.text = "<聚合好的完整消息>"',
  chunksAfter: CHUNKS.length,
};
const TIMELINE: ReplayEvent[] = [START_EVENT, ...STREAM_EVENTS, END_EVENT];

export const TOTAL_STEPS = TIMELINE.length;
export const TOTAL_CHUNKS = CHUNKS.length;

/** 截取逻辑：正文断言的单一真源。step 就是「已到达的事件数」。 */
export function describeReplay(step: number): ReplayState {
  const safeStep = Math.max(0, Math.min(Math.round(step), TOTAL_STEPS));
  const received = TIMELINE.slice(0, safeStep);
  const chunksAfter = received.at(-1)?.chunksAfter ?? 0;
  const chunks = CHUNKS.slice(0, chunksAfter);
  const assembled = chunks.join('');

  return {
    step: safeStep,
    totalSteps: TOTAL_STEPS,
    chunks,
    assembled,
    answerLength: ANSWER.length,
    events: received,
    activeEventIndex: safeStep - 1,
    percent: Math.round((assembled.length / ANSWER.length) * 100),
  };
}

const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const COLOR = {
  title: '#172033',
  sub: '#64748b',
  streamAccent: '#4f7cff',
  eventAccent: '#0f8a5f',
  boundary: '#7c6bb0',
  text: '#334155',
  ghost: '#b6c2d1',
  cardStroke: '#dbe3f0',
};

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x, y + height, radius);
    ctx.arcTo(x + width, y + height, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

/** 中文逐字换行：把已拼接文本折成多行，便于放进聚合卡。 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    if (ctx.measureText(line + char).width > maxWidth) {
      lines.push(line);
      line = char;
      if (lines.length === maxLines) {
        break;
      }
    } else {
      line += char;
    }
  }
  if (lines.length < maxLines && line) {
    lines.push(line);
  }
  return lines;
}

function eventColor(event: ReplayEvent): string {
  if (event.name === 'on_chat_model_stream') {
    return COLOR.eventAccent;
  }
  return COLOR.boundary;
}

function drawStreamColumn(
  ctx: CanvasRenderingContext2D,
  x: number,
  width: number,
  bottom: number,
  state: ReplayState,
): void {
  ctx.fillStyle = COLOR.streamAccent;
  ctx.font = `600 12.5px ${SANS}`;
  ctx.fillText('stream()：内容的增量', x, 0);

  ctx.fillStyle = COLOR.sub;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText(
    fitText(ctx, 'for await (const chunk of model.stream(input))', width),
    x,
    18,
  );

  // 已到达的 chunk：每个 chunk 只带“新增”的片段。行距随可用高度自适应。
  const rowH = Math.max(14, Math.min(19, (bottom - 158) / TOTAL_CHUNKS));
  let y = 44;
  ctx.font = `11px ${MONO}`;
  if (state.chunks.length === 0) {
    ctx.fillStyle = COLOR.ghost;
    ctx.fillText('（等待第一个 chunk…）', x, y + 10);
    y += rowH + 10;
  } else {
    state.chunks.forEach((text, index) => {
      ctx.fillStyle = COLOR.streamAccent;
      ctx.fillText(`chunk ${index + 1}`, x, y);
      ctx.fillStyle = COLOR.text;
      ctx.fillText(
        fitText(ctx, `.text = "${text}"`, width - 64),
        x + 58,
        y,
      );
      y += rowH;
    });
  }

  // 聚合卡：concat 出的完整消息 + 进度条。
  const cardTop = y + 8;
  const textWidth = width - 24;
  const maxBodyLines = bottom > 320 ? 3 : 2;
  ctx.font = `11px ${MONO}`;
  const bodyLines = wrapText(
    ctx,
    state.assembled || ' ',
    textWidth,
    maxBodyLines,
  );
  const cardHeight = 40 + bodyLines.length * 16 + 26;

  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, x, cardTop, width, cardHeight, 8);
  ctx.fill();
  ctx.strokeStyle = COLOR.cardStroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLOR.streamAccent;
  roundedRect(ctx, x, cardTop, 4, cardHeight, 2);
  ctx.fill();

  ctx.fillStyle = COLOR.sub;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText('full = full ? full.concat(chunk) : chunk', x + 14, cardTop + 22);

  ctx.fillStyle = COLOR.title;
  ctx.font = `12.5px ${MONO}`;
  bodyLines.forEach((line, index) => {
    const isLast = index === bodyLines.length - 1;
    const caret =
      state.percent < 100 && isLast && state.assembled ? ' ▌' : '';
    ctx.fillText(
      fitText(ctx, line + caret, textWidth),
      x + 14,
      cardTop + 44 + index * 16,
    );
  });

  // 进度条：拼接进度与 chunk 到达数严格同步。
  const barTop = cardTop + 48 + bodyLines.length * 16;
  const barWidth = width - 28 - 40;
  ctx.fillStyle = '#e2e8f0';
  roundedRect(ctx, x + 14, barTop, barWidth, 6, 3);
  ctx.fill();
  ctx.fillStyle = COLOR.streamAccent;
  roundedRect(
    ctx,
    x + 14,
    barTop,
    Math.max(2, (state.percent / 100) * barWidth),
    6,
    3,
  );
  ctx.fill();
  ctx.fillStyle = COLOR.sub;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText(`${state.percent}%`, x + width - 34, barTop + 8);
}

function drawEventsColumn(
  ctx: CanvasRenderingContext2D,
  x: number,
  width: number,
  bottom: number,
  state: ReplayState,
): void {
  ctx.fillStyle = COLOR.eventAccent;
  ctx.font = `600 12.5px ${SANS}`;
  ctx.fillText('streamEvents()：过程的事件', x, 0);

  ctx.fillStyle = COLOR.sub;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText(
    fitText(ctx, 'for await (const event of model.streamEvents(input))', width),
    x,
    18,
  );

  // 事件序列固定：start → stream × 8 → end。未到达的画成灰影，呈现顺序形态。
  const rowH = Math.max(16, Math.min(26, (bottom - 44) / TIMELINE.length));
  const nameSize = rowH >= 22 ? 11 : 9.5;

  TIMELINE.forEach((event, index) => {
    const top = 30 + index * rowH;
    const arrived = index < state.events.length;
    const active = index === state.activeEventIndex;

    if (active) {
      ctx.fillStyle = '#fff7e0';
      roundedRect(ctx, x - 6, top - 2, width + 12, rowH - 2, 5);
      ctx.fill();
      ctx.strokeStyle = '#f0d68a';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.font = `${active ? '700' : '400'} ${nameSize}px ${MONO}`;
    ctx.fillStyle = arrived ? eventColor(event) : COLOR.ghost;
    ctx.fillText(
      fitText(ctx, event.name, width - 10),
      x + (active ? 4 : 0),
      top + 10,
    );

    // 空间充裕时第二行显示载荷字段；空间紧张时退化为只显示事件名。
    if (arrived && rowH >= 20) {
      ctx.font = `9.5px ${MONO}`;
      ctx.fillStyle = active ? '#8a6100' : COLOR.text;
      ctx.fillText(
        fitText(ctx, event.dataField, width - 26),
        x + 14,
        top + 22,
      );
    }
  });
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: ReplayState,
): void {
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = COLOR.title;
  ctx.font = `600 15.5px ${SANS}`;
  ctx.fillText('回放一次模型调用：两种流式 API 各自看到什么', 36, 38);

  const pad = 36;
  const gap = 28;
  const columnWidth = Math.max(180, (width - pad * 2 - gap) / 2);
  const rightX = pad + columnWidth + gap;
  const columnBottom = height - 34;

  ctx.save();
  ctx.translate(0, 72);
  drawStreamColumn(ctx, pad, columnWidth, columnBottom - 72, state);
  drawEventsColumn(ctx, rightX, columnWidth, columnBottom - 72, state);
  ctx.restore();

  // 收尾证据：事件全部到达后，两种视角拼出同一句话。
  ctx.font = `11.5px ${SANS}`;
  const done = state.percent >= 100;
  ctx.fillStyle = done ? COLOR.eventAccent : COLOR.sub;
  const footnote = done
    ? `完成：full.text 与 on_chat_model_end 的 data.output 是同一句话——stream 给内容，streamEvents 给过程`
    : state.step === 0
      ? '拖动「回放进度」：事件按 start → stream × 8 → end 的固定顺序到达'
      : `生成中：chunk 到达 ${state.chunks.length}/${TOTAL_CHUNKS}，事件到达 ${state.step}/${TOTAL_STEPS}`;
  ctx.fillText(fitText(ctx, footnote, width - pad * 2), pad, height - 14);
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

  let current: ExampleArgs = { step: TOTAL_STEPS };

  function drawCurrent(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const state = describeReplay(current.step);
    draw(drawingContext, width, height, state);
    emit({
      step: state.step,
      totalSteps: state.totalSteps,
      chunkCount: state.chunks.length,
      totalChunks: TOTAL_CHUNKS,
      assembledLength: state.assembled.length,
      answerLength: state.answerLength,
    });
  }

  const resizeObserver = createResizeObserver(canvas, drawCurrent);

  return {
    update(options) {
      current = options;
      drawCurrent();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
