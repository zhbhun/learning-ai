/**
 * 范例介绍：父子图状态映射与独立 checkpoint 命名空间的确定性模拟。
 * 同一个父图（START → node1 → END）把一张两节点子图挂进 node1，对照两种
 * 通信模式：共享状态键（同名通道 foo 自动透传，私有键 bar 留在子图）与
 * 包装节点（父图 foo 与子图 bar 显式双向转换）。底部展示两条 checkpoint
 * 链：根图命名空间为空串，子图命名空间为 "node1:任务uuid"，随推进增长。
 * 输入或前置状态：Controls 提供通信模式与子图推进步数（0-2）；纯本地 TS
 * 确定性模拟，不依赖 @langchain/*，不发起模型调用。
 * 主要操作：切换通信模式；推进子图执行。
 * 预期结果：共享键模式下子图直接读写父图 foo、bar 不进父图 state；
 * 包装模式下子图只见 bar，值经包装节点进出各转换一次；子图 checkpoint
 * 始终落在独立命名空间。阅读主线：draw() 按「父图条 → state 卡片与
 * 映射区 → checkpoint 链」三段布局推进。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type LinkMode = 'shared' | 'wrapper';

export interface ExampleOptions {
  linkMode: LinkMode;
  subSteps: number;
}

export interface ExampleSnapshot {
  parentFoo: string;
  subState: string;
  subNamespace: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const GREEN = '#1f9d63';
const LINE = '#dbe3f0';
const CARD_BG = '#ffffff';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 模拟值：输入 foo = 'Bob'；subgraphNode1 读输入写 bar；subgraphNode2 写回输出
const INPUT_FOO = 'Bob';
const BAR_VALUE = 'hi! Bob';
const SHARED_OUT = 'hi! Bob, how are you?';
const WRAPPER_OUT = 'hi! Bob';

// 子图挂在 node1 下，命名空间 = 节点名:任务 uuid（此处截断模拟）
const SUB_NAMESPACE = 'node1:1ef6a2c4';

function accentOf(mode: LinkMode): string {
  return mode === 'shared' ? BLUE : GREEN;
}

function parentFoo(options: ExampleOptions): string {
  // 子图跑完并返回后，父图 foo 才被写回；两种模式写回的值不同
  if (options.subSteps < 2) {
    return INPUT_FOO;
  }
  return options.linkMode === 'shared' ? SHARED_OUT : WRAPPER_OUT;
}

interface StateRow {
  key: string;
  value: string;
  private: boolean;
}

function subStateRows(options: ExampleOptions): StateRow[] {
  if (options.subSteps === 0) {
    return [];
  }
  if (options.linkMode === 'shared') {
    return [
      {
        key: 'foo',
        value: options.subSteps === 2 ? SHARED_OUT : INPUT_FOO,
        private: false,
      },
      { key: 'bar', value: BAR_VALUE, private: true },
    ];
  }
  // 包装模式：子图 schema 里只有 bar，foo 在子图内部不存在
  return [{ key: 'bar', value: BAR_VALUE, private: false }];
}

interface ChainCell {
  step: string;
  next: string;
  values: string;
}

function rootChain(options: ExampleOptions): ChainCell[] {
  // 根图 ns ''：输入就绪后 next 指向 node1；node1 返回后图完成
  const cells: ChainCell[] = [
    { step: 'step 0', next: 'node1', values: `foo: ${INPUT_FOO}` },
  ];
  if (options.subSteps === 2) {
    cells.push({
      step: 'step 1',
      next: '[]（完成）',
      values: `foo: ${parentFoo(options)}`,
    });
  }
  return cells;
}

function subChain(options: ExampleOptions): ChainCell[] {
  // 子图 ns 'node1:uuid'：内部 super-step 各落一份快照
  if (options.subSteps === 0) {
    return [];
  }
  const cells: ChainCell[] = [
    {
      step: 'step 0',
      next: 'subgraphNode2',
      values:
        options.linkMode === 'shared'
          ? `foo: ${INPUT_FOO}, bar: ${BAR_VALUE}`
          : `bar: ${BAR_VALUE}`,
    },
  ];
  if (options.subSteps === 2) {
    cells.push({
      step: 'step 1',
      next: '[]（完成）',
      values:
        options.linkMode === 'shared'
          ? `foo: ${SHARED_OUT}, bar: ${BAR_VALUE}`
          : `bar: ${BAR_VALUE}`,
    });
  }
  return cells;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let cut = text.length;
  while (cut > 1 && ctx.measureText(`${text.slice(0, cut)}…`).width > maxWidth) {
    cut -= 1;
  }
  return `${text.slice(0, cut)}…`;
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2 + 6, y);
  ctx.lineTo(x2, y - 3.8);
  ctx.lineTo(x2, y + 3.8);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawParentStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  options: ExampleOptions,
) {
  const accent = accentOf(options.linkMode);
  const isWrapper = options.linkMode === 'wrapper';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.fillText('父图', x, y + 4);

  const boxW = Math.min(210, w * 0.44);
  const startX = x + 46;
  const endX = x + w - 36;
  const boxX = (startX + endX) / 2 - boxW / 2;

  // 两端虚拟端点
  ctx.font = `12px ${MONO}`;
  [startX, endX].forEach((cx, index) => {
    ctx.beginPath();
    ctx.arc(cx, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = MUTED;
    ctx.fill();
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.fillText(index === 0 ? 'START' : 'END', cx, y + 22);
  });
  ctx.textAlign = 'left';

  // 中间的 node1：挂载子图（或包装节点），执行中被高亮
  const running = options.subSteps === 1;
  const done = options.subSteps === 2;
  const boxColor = done ? GREEN : running ? accent : LINE;
  ctx.fillStyle = CARD_BG;
  ctx.strokeStyle = boxColor;
  ctx.lineWidth = 1.6;
  roundedRect(ctx, boxX, y - 15, boxW, 30, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = done ? GREEN : running ? accent : INK;
  ctx.font = `600 12px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    isWrapper ? 'node1（包装节点）' : 'node1（挂载的子图）',
    boxX + boxW / 2,
    y + 4,
  );
  ctx.textAlign = 'left';

  drawEdge(ctx, startX + 8, boxX - 8, y, LINE);
  drawEdge(ctx, boxX + boxW + 2, endX - 8, y, LINE);
}

function drawStateCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  namespace: string,
  rows: StateRow[],
  accent: string,
  emptyLabel: string,
) {
  ctx.fillStyle = CARD_BG;
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1.4;
  roundedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  // 左侧强调条：标识这张 state 属于哪一层
  ctx.fillStyle = accent;
  roundedRect(ctx, x, y, 4, h, 2);
  ctx.fill();

  ctx.fillStyle = INK;
  ctx.font = `700 12px ${FONT}`;
  ctx.fillText(title, x + 14, y + 19);
  ctx.fillStyle = MUTED;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(
    fitText(ctx, `checkpoint_ns: ${namespace}`, w - 26),
    x + 14,
    y + 35,
  );

  if (rows.length === 0) {
    ctx.fillStyle = MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(fitText(ctx, emptyLabel, w - 26), x + 14, y + h / 2 + 10);
    return;
  }

  rows.forEach((row, index) => {
    const ry = y + 56 + index * 22;
    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = row.private ? MUTED : INK;
    const label = fitText(
      ctx,
      `${row.key}: ${row.value}`,
      w - 26 - (row.private ? 92 : 0),
    );
    ctx.fillText(label, x + 14, ry);
    if (row.private) {
      ctx.fillStyle = MUTED;
      ctx.font = `11px ${FONT}`;
      ctx.fillText('私有：父图不可见', x + w - 96, ry);
    }
  });
}

function drawMappingZone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  options: ExampleOptions,
) {
  const accent = accentOf(options.linkMode);
  const centerX = x + w / 2;

  if (options.linkMode === 'shared') {
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText('共享键：同名通道自动映射', centerX, y + 6);
    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = INK;
    ctx.fillText('foo', x + 6, y + 36);
    ctx.fillText('foo', x + w - 26, y + 36);
    ctx.textAlign = 'left';
    drawEdge(ctx, x + 32, x + w - 34, y + 32, accent);

    ctx.textAlign = 'center';
    ctx.fillStyle = MUTED;
    ctx.font = `11px ${FONT}`;
    ctx.fillText('bar 是子图私有键', centerX, y + 62);
    ctx.fillText('不进父图 state', centerX, y + 78);
    ctx.textAlign = 'left';
    return;
  }

  const returned = options.subSteps === 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('包装节点显式转换', centerX, y + 6);
  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = INK;
  ctx.fillText('foo → bar', centerX, y + 32);
  ctx.fillStyle = MUTED;
  ctx.font = `11px ${FONT}`;
  ctx.fillText('进入：invoke({ bar: foo })', centerX, y + 48);
  ctx.fillStyle = INK;
  ctx.font = `12px ${MONO}`;
  ctx.fillText('bar → foo', centerX, y + 70);
  ctx.fillStyle = returned ? MUTED : '#b6c0cf';
  ctx.font = `11px ${FONT}`;
  ctx.fillText('返回：return { foo: bar }', centerX, y + 86);
  ctx.textAlign = 'left';
}

function drawChainRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  labelY: number,
  w: number,
  label: string,
  cells: ChainCell[],
  emptyLabel: string,
  accent: string,
) {
  // 标签独占一行，快照卡片横向铺满剩余宽度
  ctx.font = `700 12px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.fillText(label, x, labelY);

  const top = labelY + 10;
  const h = 46;
  const gap = 12;

  if (cells.length === 0) {
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.4;
    roundedRect(ctx, x, top, w, h, 7);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(emptyLabel, x + 14, top + h / 2 + 4);
    return;
  }

  const cardWidth = Math.floor((w - gap * (cells.length - 1)) / cells.length);
  cells.forEach((cell, index) => {
    const cx = x + index * (cardWidth + gap);
    ctx.fillStyle = CARD_BG;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.4;
    roundedRect(ctx, cx, top, cardWidth, h, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = `700 11px ${MONO}`;
    ctx.fillText(cell.step, cx + 9, top + 15);
    ctx.fillStyle = INK;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(
      fitText(ctx, `next: ${cell.next}`, cardWidth - 18),
      cx + 9,
      top + 29,
    );
    ctx.fillStyle = MUTED;
    ctx.fillText(fitText(ctx, cell.values, cardWidth - 18), cx + 9, top + 42);

    if (index < cells.length - 1) {
      drawEdge(ctx, cx + cardWidth + 1, cx + cardWidth + gap - 5, top + h / 2, accent);
    }
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
  const ctx: CanvasRenderingContext2D = context;

  let current: ExampleOptions = { linkMode: 'shared', subSteps: 2 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(410, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = 30;
    const inner = width - pad * 2;
    const accent = accentOf(current.linkMode);

    // 标题行
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('父图 × 子图：状态映射与独立命名空间', pad, pad + 2);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'right';
    ctx.fillText(
      current.linkMode === 'shared'
        ? '模式：共享状态键（直接挂载）'
        : '模式：包装节点（显式转换）',
      width - pad,
      pad + 2,
    );
    ctx.textAlign = 'left';

    // 第一段：父图结构条
    drawParentStrip(ctx, pad, pad + 44, inner, current);

    // 第二段：父/子 state 卡片与中间映射区
    const cardTop = pad + 88;
    const cardHeight = 106;
    const cardWidth = Math.floor(inner * 0.34);
    const mapX = pad + cardWidth + 12;
    const mapWidth = inner - cardWidth * 2 - 24;

    drawStateCard(
      ctx,
      pad,
      cardTop,
      cardWidth,
      cardHeight,
      '父图 state',
      "''（根图）",
      [{ key: 'foo', value: parentFoo(current), private: false }],
      MUTED,
      '',
    );
    drawMappingZone(ctx, mapX, cardTop + 12, mapWidth, current);
    drawStateCard(
      ctx,
      pad + cardWidth + mapWidth + 24,
      cardTop,
      cardWidth,
      cardHeight,
      '子图 state',
      `'${SUB_NAMESPACE}…'`,
      subStateRows(current),
      accent,
      '（未进入：node1 尚未调用）',
    );

    // 第三段：两条 checkpoint 链（标签行 + 快照卡片行）
    drawChainRow(
      ctx,
      pad,
      cardTop + cardHeight + 20,
      inner,
      "父图 checkpoint 链（ns ''）",
      rootChain(current),
      '（未运行）',
      MUTED,
    );
    drawChainRow(
      ctx,
      pad,
      cardTop + cardHeight + 98,
      inner,
      `子图 checkpoint 链（ns '${SUB_NAMESPACE}…'）`,
      subChain(current),
      '（未进入子图：不产生子图快照）',
      accent,
    );

    // 结论行
    const summaryY = cardTop + cardHeight + 176;
    ctx.fillStyle = INK;
    ctx.font = `12px ${FONT}`;
    const summary =
      current.linkMode === 'shared'
        ? '共享键：子图直接读写父图 foo，bar 留在子图；子图快照在独立命名空间里'
        : current.subSteps === 2
          ? '包装节点：子图只见 bar，输出经 return { foo: bar } 写回父图'
          : '包装节点：子图只见 bar，输入经 invoke({ bar: foo }) 转换进入';
    ctx.fillText(fitText(ctx, summary, inner), pad, summaryY);

    const rows = subStateRows(current);
    emit({
      parentFoo: parentFoo(current),
      subState:
        rows.length === 0
          ? '—'
          : rows.map((row) => `${row.key}=${row.value}`).join(', '),
      subNamespace: current.subSteps === 0 ? '—（未进入）' : `${SUB_NAMESPACE}…`,
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
