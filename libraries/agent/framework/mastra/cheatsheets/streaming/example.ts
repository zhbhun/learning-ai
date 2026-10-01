import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/**
 * 事件流时间轴（离线示意，Canvas 2D 动画绘制，不调用真实模型）
 *
 * 演示内容：一次「查天气再作答」的 agent.stream() 运行，fullStream 会依次产出哪些
 * chunk（start → step → tool-call → writer 自定义事件 → tool-result → text-delta → finish），
 * 以及按类别过滤后时间轴如何变化。
 * 输入：showTools（是否显示 tool-call / tool-result）、showCustom（是否显示 writer 写入的
 *   自定义事件）、step（把流推进到第几个 chunk，0~14）。
 * 操作：拖动「步进进度」滑块，或开关两个事件过滤器。
 * 预期结果：chunk 按真实顺序依次点亮；「当前 chunk」详情卡显示 type / from / 载荷；
 *   transient 自定义事件用虚线框标记；被过滤的事件从时间轴消失，# 编号出现跳号。
 * 阅读主线：生命周期灰 → 工具橙 → 自定义紫（虚线 = 只发不存）→ 文本蓝 → finish。
 */

export interface StreamArgs {
  showTools: boolean;
  showCustom: boolean;
  step: number;
}

export interface StreamSnapshot {
  currentType: string;
  textChars: number;
  progressLabel: string;
}

export interface StreamInstance {
  update(args: StreamArgs): void;
  dispose(): void;
}

type ChunkKind = 'lifecycle' | 'tool' | 'custom' | 'text';

interface SimChunk {
  type: string;
  kind: ChunkKind;
  desc: string;
  detail?: string;
  text?: string;
  transient?: boolean;
}

const CHUNKS: SimChunk[] = [
  { type: 'start', kind: 'lifecycle', desc: '运行开始，MastraModelOutput 就绪', detail: 'runId: run_7f3a' },
  { type: 'step-start', kind: 'lifecycle', desc: '第 1 步：模型决定调用工具', detail: 'step: 1' },
  { type: 'tool-call', kind: 'tool', desc: '模型发起 weather 工具调用', detail: "toolName: 'weather'\ntoolCallId: 'call_1'" },
  { type: 'data-tool-progress', kind: 'custom', transient: true, desc: '工具内 writer.custom 写入实时进度', detail: "status: 'pending'\ntransient: true" },
  { type: 'weather-log', kind: 'custom', desc: '工具内 writer.write 写入事件', detail: "status: 'running'\n默认持久化到消息历史" },
  { type: 'tool-result', kind: 'tool', desc: 'weather 返回，结果回传模型', detail: "toolName: 'weather'\nresult: '22°C / 晴'" },
  { type: 'step-finish', kind: 'lifecycle', desc: '第 1 步结束', detail: 'step: 1' },
  { type: 'step-start', kind: 'lifecycle', desc: '第 2 步：模型生成回答', detail: 'step: 2' },
  { type: 'text-start', kind: 'text', desc: '文本块开始', detail: "id: 'txt_1'" },
  { type: 'text-delta', kind: 'text', desc: '文本增量上屏', text: '北京今天 22°C，晴。', detail: 'payload.text: 北京今天 22°C，晴。' },
  { type: 'text-delta', kind: 'text', desc: '文本增量上屏', text: '建议穿薄外套。', detail: 'payload.text: 建议穿薄外套。' },
  { type: 'text-end', kind: 'text', desc: '文本块结束', detail: "id: 'txt_1'" },
  { type: 'step-finish', kind: 'lifecycle', desc: '第 2 步结束', detail: 'step: 2' },
  { type: 'finish', kind: 'lifecycle', desc: '运行完成，收尾数据就绪', detail: 'finishReason / usage' },
];

const MAX_TEXT_CHARS = CHUNKS.reduce((sum, chunk) => sum + (chunk.text?.length ?? 0), 0);

const UI_FONT = '"PingFang SC", system-ui, sans-serif';
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';

interface KindStyle {
  fill: string;
  border: string;
  main: string;
  sub: string;
}

const KIND_STYLE: Record<ChunkKind, KindStyle> = {
  lifecycle: { fill: '#eef1f5', border: '#9aa7b5', main: '#42526b', sub: '#7c8aa0' },
  tool: { fill: '#fdeee0', border: '#c97a2b', main: '#8a5417', sub: '#b08a45' },
  custom: { fill: '#efe9fb', border: '#7c5cd6', main: '#5a3fb0', sub: '#8f77cf' },
  text: { fill: '#e7f0fd', border: '#2f6bd8', main: '#1d4fa8', sub: '#6d92c9' },
};

const KIND_LABEL: Record<ChunkKind, string> = {
  lifecycle: '生命周期',
  tool: '工具',
  custom: '自定义',
  text: '文本',
};

const DESIGN_W = 880;
const DESIGN_H = 430;
const COLS = 7;
const BOX_W = 106;
const BOX_H = 54;
const BOX_GAP_X = 14;
const AREA_X = 24;
const ROW_Y = [58, 128];

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function drawHeader(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#42526b';
  ctx.font = `600 13.5px ${UI_FONT}`;
  ctx.fillText('fullStream 事件序列 —— weather 工具 + 两步生成', AREA_X, 30);

  const kinds: ChunkKind[] = ['lifecycle', 'tool', 'custom', 'text'];
  ctx.font = `10px ${UI_FONT}`;
  let total = 0;
  for (const kind of kinds) {
    total += 12 + ctx.measureText(KIND_LABEL[kind]).width + 16;
  }
  let cx = DESIGN_W - 24 - total;
  for (const kind of kinds) {
    const style = KIND_STYLE[kind];
    ctx.beginPath();
    ctx.arc(cx + 4, 30, 4, 0, Math.PI * 2);
    ctx.fillStyle = style.border;
    ctx.fill();
    ctx.fillStyle = '#5a6b82';
    ctx.fillText(KIND_LABEL[kind], cx + 12, 30);
    cx += 12 + ctx.measureText(KIND_LABEL[kind]).width + 16;
  }
  ctx.restore();
}

function drawChunkBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  chunk: SimChunk,
  index: number,
  isCurrent: boolean,
): void {
  const style = KIND_STYLE[chunk.kind];
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, BOX_W, BOX_H, 9);
  ctx.fillStyle = chunk.transient ? '#f6f2fd' : style.fill;
  ctx.fill();
  ctx.lineWidth = isCurrent ? 3 : 1.5;
  ctx.strokeStyle = style.border;
  if (chunk.transient) ctx.setLineDash([5, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.main;
  ctx.font = `700 10.5px ${MONO_FONT}`;
  ctx.fillText(fit(ctx, chunk.type, BOX_W - 10), x + BOX_W / 2, y + 20);
  ctx.fillStyle = style.sub;
  ctx.font = `9px ${UI_FONT}`;
  ctx.fillText(`${KIND_LABEL[chunk.kind]} · #${index}`, x + BOX_W / 2, y + 37);
  if (chunk.transient) {
    ctx.fillText('transient', x + BOX_W / 2, y + 49);
  }
  ctx.restore();
}

function drawFilterNote(ctx: CanvasRenderingContext2D, hidden: number): void {
  if (hidden <= 0) {
    return;
  }
  ctx.save();
  ctx.fillStyle = '#b0632a';
  ctx.font = `600 11px ${UI_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `过滤器已隐藏 ${hidden} 个事件 —— 时间轴上 # 编号出现跳号即被过滤`,
    AREA_X,
    200,
  );
  ctx.restore();
}

function drawDetailCard(ctx: CanvasRenderingContext2D, visible: SimChunk[]): void {
  const x = AREA_X;
  const y = 212;
  const w = DESIGN_W - 48;
  const h = 92;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#d7dee8';
  ctx.stroke();

  const current = visible[visible.length - 1];
  ctx.textBaseline = 'middle';
  if (!current) {
    ctx.fillStyle = '#8494a8';
    ctx.font = `12px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('把「步进进度」滑块向右拖，chunk 事件会依次出现在时间轴上', x + w / 2, y + h / 2);
    ctx.restore();
    return;
  }

  const style = KIND_STYLE[current.kind];
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8494a8';
  ctx.font = `10px ${UI_FONT}`;
  ctx.fillText('当前 chunk.type', x + 24, y + 22);
  ctx.fillStyle = style.main;
  ctx.font = `700 17px ${MONO_FONT}`;
  ctx.fillText(fit(ctx, current.type, 180), x + 24, y + 46);
  ctx.fillStyle = '#8494a8';
  ctx.font = `10.5px ${MONO_FONT}`;
  ctx.fillText("from: 'AGENT'", x + 24, y + 70);

  ctx.beginPath();
  ctx.moveTo(x + 224, y + 14);
  ctx.lineTo(x + 224, y + h - 14);
  ctx.strokeStyle = '#e3e9f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  const detailX = x + 248;
  ctx.fillStyle = '#42526b';
  ctx.font = `600 12.5px ${UI_FONT}`;
  ctx.fillText(fit(ctx, current.desc, 380), detailX, y + 24);
  ctx.font = `10.5px ${MONO_FONT}`;
  ctx.fillStyle = '#5f718a';
  (current.detail ?? '').split('\n').slice(0, 3).forEach((line, i) => {
    ctx.fillText(fit(ctx, line, 400), detailX, y + 46 + i * 16);
  });

  if (current.transient) {
    const bw = 136;
    ctx.beginPath();
    ctx.roundRect(x + w - bw - 18, y + 16, bw, 24, 12);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#7c5cd6';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#5a3fb0';
    ctx.font = `600 10px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('transient · 只发不存', x + w - bw / 2 - 18, y + 28);
  }
  ctx.restore();
}

function drawStats(ctx: CanvasRenderingContext2D, visible: SimChunk[]): void {
  const y = 322;
  const h = 88;
  const w = 261;
  const gap = 24;
  const panels = [AREA_X, AREA_X + w + gap, AREA_X + 2 * (w + gap)];

  for (const px of panels) {
    ctx.beginPath();
    ctx.roundRect(px, y, w, h, 12);
    ctx.fillStyle = '#f2f5f9';
    ctx.fill();
  }

  const chars = visible.reduce((sum, chunk) => sum + (chunk.text?.length ?? 0), 0);
  const toolCount = visible.filter((chunk) => chunk.kind === 'tool').length;
  const customCount = visible.filter((chunk) => chunk.kind === 'custom').length;

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `600 11px ${UI_FONT}`;
  ctx.fillStyle = '#7c8aa0';
  ctx.fillText('累计文本增量', panels[0] + 20, y + 24);
  ctx.fillStyle = '#1d4fa8';
  ctx.font = `700 17px ${UI_FONT}`;
  ctx.fillText(`${chars} / ${MAX_TEXT_CHARS} 字`, panels[0] + 20, y + 46);
  ctx.fillStyle = '#dbe5f2';
  ctx.beginPath();
  ctx.roundRect(panels[0] + 20, y + 64, w - 40, 6, 3);
  ctx.fill();
  if (chars > 0) {
    ctx.fillStyle = '#2f6bd8';
    ctx.beginPath();
    ctx.roundRect(panels[0] + 20, y + 64, Math.max(6, (w - 40) * (chars / MAX_TEXT_CHARS)), 6, 3);
    ctx.fill();
  }

  ctx.font = `600 11px ${UI_FONT}`;
  ctx.fillStyle = '#7c8aa0';
  ctx.fillText('工具事件', panels[1] + 20, y + 24);
  ctx.fillStyle = KIND_STYLE.tool.main;
  ctx.font = `700 17px ${UI_FONT}`;
  ctx.fillText(`${toolCount} / 2`, panels[1] + 20, y + 46);
  ctx.fillStyle = '#7c8aa0';
  ctx.font = `9.5px ${MONO_FONT}`;
  ctx.fillText('tool-call → tool-result', panels[1] + 20, y + 68);

  ctx.fillStyle = '#7c8aa0';
  ctx.font = `600 11px ${UI_FONT}`;
  ctx.fillText('自定义事件', panels[2] + 20, y + 24);
  ctx.fillStyle = KIND_STYLE.custom.main;
  ctx.font = `700 17px ${UI_FONT}`;
  ctx.fillText(`${customCount} / 2`, panels[2] + 20, y + 46);
  ctx.fillStyle = '#7c8aa0';
  ctx.font = `9.5px ${UI_FONT}`;
  ctx.fillText('其中 1 个 transient（虚线框）', panels[2] + 20, y + 68);
  ctx.restore();
}

export function createStreamExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StreamSnapshot) => void,
): StreamInstance {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let args: StreamArgs = { showTools: true, showCustom: true, step: 10 };
  let progress = 0;
  let lastKey = '';

  const passesFilter = (chunk: SimChunk) =>
    (chunk.kind !== 'tool' || args.showTools) &&
    (chunk.kind !== 'custom' || args.showCustom);

  function revealed(): number {
    return Math.max(0, Math.min(CHUNKS.length, Math.round(progress)));
  }

  function snapshot(): StreamSnapshot {
    const visible = CHUNKS.slice(0, revealed()).filter(passesFilter);
    const current = visible[visible.length - 1];
    return {
      currentType: current ? current.type : '—',
      textChars: visible.reduce((sum, chunk) => sum + (chunk.text?.length ?? 0), 0),
      progressLabel: `${revealed()}/${CHUNKS.length}`,
    };
  }

  function maybeEmit(): void {
    const key = `${args.showTools}|${args.showCustom}|${args.step}|${revealed()}`;
    if (key !== lastKey) {
      lastKey = key;
      emit(snapshot());
    }
  }

  function draw(): void {
    const { width, height } = readCanvasSize(canvas);
    canvas.width = width;
    canvas.height = height;
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    const offsetX = (width - DESIGN_W * scale) / 2;
    const offsetY = (height - DESIGN_H * scale) / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f7f9fc';
    ctx.fillRect(0, 0, width, height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    const visible = CHUNKS.slice(0, revealed()).filter(passesFilter);
    const hidden = revealed() - visible.length;

    drawHeader(ctx);
    visible.forEach((chunk, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      drawChunkBox(
        ctx,
        AREA_X + col * (BOX_W + BOX_GAP_X),
        ROW_Y[row],
        chunk,
        CHUNKS.indexOf(chunk),
        i === visible.length - 1,
      );
    });
    drawFilterNote(ctx, hidden);
    drawDetailCard(ctx, visible);
    drawStats(ctx, visible);
  }

  const loop = createRenderLoop(canvas, (delta: number) => {
    const target = Math.max(0, Math.min(CHUNKS.length, args.step));
    progress += (target - progress) * Math.min(1, delta * 7);
    if (Math.abs(target - progress) < 0.02) {
      progress = target;
    }
    draw();
    maybeEmit();
  });
  const observer = createResizeObserver(canvas, draw);
  draw();
  maybeEmit();

  return {
    update(next: StreamArgs): void {
      args = next;
      maybeEmit();
    },
    dispose(): void {
      loop.dispose();
      observer.disconnect();
    },
  };
}
