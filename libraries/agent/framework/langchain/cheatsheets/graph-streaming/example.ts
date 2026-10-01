/**
 * 范例介绍：确定性回放一次图执行（a → b[子图 b1→b2] → c）在不同 streamMode
 * 通道下的输出形态。控件是 streamMode（updates / values / messages / custom /
 * 组合）与 subgraphs 开关；两者只改变“订阅哪条通道、要不要子图条目”，
 * 不改变回放的执行轨迹本身——这正是图级流式的核心：通道即投影。
 * 输入：mode（通道选择）、subgraphs（是否带子图条目与 namespace 前缀）。
 * 预期结果：updates 只给节点改过的 key（b 的更新在子图之后）；values 首条是
 * 输入态、每条全量；messages 是 (chunk, metadata) 元组（开 subgraphs 变三层）；
 * custom 只有 writer 载荷；组合模式按执行时序交错成 [mode, chunk]。
 * 输出形态对齐官方 LangGraph.js 文档与 @langchain/langgraph@1.1.5 实测；
 * namespace 中的任务 ID 为示意短码，不依赖 @langchain/*。
 * 阅读主线：先看 TIMELINE / SNAPSHOTS 常量（一次执行的单一真源），再看
 * projectStream() 如何按通道截取与包装，最后看 draw() 如何呈现列表与结论。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type StreamModeChoice =
  | 'updates'
  | 'values'
  | 'messages'
  | 'custom'
  | 'updates+custom';

export interface ExampleArgs {
  mode: StreamModeChoice;
  subgraphs: boolean;
}

/** 执行轨迹中的一项：custom（writer）/ update（节点更新）/ token（模型增量）。 */
interface TimelineItem {
  kind: 'custom' | 'update' | 'token';
  /** namespace 路径：[] = 根图；['b:d4f1'] = b 节点内的子图；messages 的 token 带到具体节点。 */
  ns: string[];
  node: string;
  /** chunk 的展示形态，不含通道包装。 */
  text: string;
  /** 是否来自子图内部——subgraphs 关闭时被过滤。 */
  isSubgraph: boolean;
}

/**
 * 一次执行按到达顺序排布：a 的 writer 事件先于 a 的 updates（writer 在节点
 * 执行中触发，updates 在超步提交时产出）；b 内子图先跑（b1 token → b1/b2
 * 更新），b 自身的更新最后才到——与 @langchain/langgraph 实测输出一致。
 */
const TIMELINE: TimelineItem[] = [
  {
    kind: 'custom',
    ns: [],
    node: 'a',
    text: '{ data: "解析输入完成", type: "progress" }',
    isSubgraph: false,
  },
  {
    kind: 'update',
    ns: [],
    node: 'a',
    text: '{ a: { notes: ["a：输入已解析"] } }',
    isSubgraph: false,
  },
  {
    kind: 'token',
    ns: ['b:d4f1', 'b1:9a07'],
    node: 'b1',
    text: '[ chunk("整理"), { langgraph_node: "b1" } ]',
    isSubgraph: true,
  },
  {
    kind: 'token',
    ns: ['b:d4f1', 'b1:9a07'],
    node: 'b1',
    text: '[ chunk("图级"), { langgraph_node: "b1" } ]',
    isSubgraph: true,
  },
  {
    kind: 'token',
    ns: ['b:d4f1', 'b1:9a07'],
    node: 'b1',
    text: '[ chunk("流式"), { langgraph_node: "b1" } ]',
    isSubgraph: true,
  },
  {
    kind: 'token',
    ns: ['b:d4f1', 'b1:9a07'],
    node: 'b1',
    text: '[ chunk("笔记"), { langgraph_node: "b1" } ]',
    isSubgraph: true,
  },
  {
    kind: 'update',
    ns: ['b:d4f1'],
    node: 'b1',
    text: '{ b1: { draft: "草稿：图级流式" } }',
    isSubgraph: true,
  },
  {
    kind: 'update',
    ns: ['b:d4f1'],
    node: 'b2',
    text: '{ b2: { draft: "定稿：图级流式" } }',
    isSubgraph: true,
  },
  {
    kind: 'update',
    ns: [],
    node: 'b',
    text: '{ b: { draft: "定稿：图级流式" } }',
    isSubgraph: false,
  },
  {
    kind: 'token',
    ns: ['c:33be'],
    node: 'c',
    text: '[ chunk("汇总"), { langgraph_node: "c" } ]',
    isSubgraph: false,
  },
  {
    kind: 'token',
    ns: ['c:33be'],
    node: 'c',
    text: '[ chunk("完成"), { langgraph_node: "c" } ]',
    isSubgraph: false,
  },
  {
    kind: 'token',
    ns: ['c:33be'],
    node: 'c',
    text: '[ chunk("。"), { langgraph_node: "c" } ]',
    isSubgraph: false,
  },
  {
    kind: 'update',
    ns: [],
    node: 'c',
    text: '{ c: { notes: ["c：已汇总"] } }',
    isSubgraph: false,
  },
];

/** values 通道的全量快照：首条是输入态；子图自己的输入态与每步快照仅在 subgraphs 打开时出现。 */
interface SnapshotItem {
  ns: string[];
  text: string;
  isSubgraph: boolean;
}

const SNAPSHOTS: SnapshotItem[] = [
  { ns: [], text: '{ notes: [], draft: "" }', isSubgraph: false },
  { ns: [], text: '{ notes: ["a：输入已解析"], draft: "" }', isSubgraph: false },
  { ns: ['b:d4f1'], text: '{ draft: "" }', isSubgraph: true },
  { ns: ['b:d4f1'], text: '{ draft: "草稿：图级流式" }', isSubgraph: true },
  { ns: ['b:d4f1'], text: '{ draft: "定稿：图级流式" }', isSubgraph: true },
  {
    ns: [],
    text: '{ notes: ["a：输入已解析"], draft: "定稿：图级流式" }',
    isSubgraph: false,
  },
  {
    ns: [],
    text: '{ notes: ["a：输入已解析", "c：已汇总"], draft: "定稿：图级流式" }',
    isSubgraph: false,
  },
];

/** 投影后的 chunk：正文断言的单一真源由 projectStream 产出。 */
export interface ProjectedChunk {
  order: number;
  channel: 'updates' | 'values' | 'messages' | 'custom';
  display: string;
  isSubgraph: boolean;
  node: string;
}

function wrap(namespace: string[], inner: string): string {
  const path = namespace.map((segment) => `"${segment}"`).join(', ');
  return `[ [${path}], ${inner} ]`;
}

/**
 * 按通道截取同一次执行：mode 决定取哪些事件、要不要组合元组；
 * subgraphs 决定子图条目是否出现、以及外层 namespace 包装。
 */
export function projectStream(
  mode: StreamModeChoice,
  subgraphs: boolean,
): ProjectedChunk[] {
  const chunks: ProjectedChunk[] = [];
  const push = (
    channel: ProjectedChunk['channel'],
    display: string,
    isSubgraph: boolean,
    node: string,
  ): void => {
    chunks.push({
      order: chunks.length + 1,
      channel,
      display,
      isSubgraph,
      node,
    });
  };

  if (mode === 'values') {
    for (const snapshot of SNAPSHOTS) {
      if (snapshot.isSubgraph && !subgraphs) {
        continue;
      }
      push(
        'values',
        subgraphs ? wrap(snapshot.ns, snapshot.text) : snapshot.text,
        snapshot.isSubgraph,
        snapshot.ns.length > 0 ? 'b 内子图' : '根图',
      );
    }
    return chunks;
  }

  for (const item of TIMELINE) {
    if (mode === 'updates' && item.kind !== 'update') {
      continue;
    }
    if (mode === 'messages' && item.kind !== 'token') {
      continue;
    }
    if (mode === 'custom' && item.kind !== 'custom') {
      continue;
    }
    // 组合模式同时收 updates 与 custom（token 仍只属于 messages 通道）。
    if (mode === 'updates+custom' && item.kind === 'token') {
      continue;
    }
    if (item.isSubgraph && !subgraphs) {
      continue;
    }

    let display = item.text;
    if (mode === 'updates+custom') {
      const channelName = item.kind === 'custom' ? 'custom' : 'updates';
      display = subgraphs
        ? wrap(item.ns, `"${channelName}", ${display}`)
        : `[ "${channelName}", ${display} ]`;
    } else if (subgraphs) {
      display = wrap(item.ns, display);
    }

    const channel: ProjectedChunk['channel'] =
      item.kind === 'token'
        ? 'messages'
        : item.kind === 'custom'
          ? 'custom'
          : 'updates';
    push(channel, display, item.isSubgraph, item.node);
  }
  return chunks;
}

/** 当前投影里“出过力”的节点：a/b/c 恒在，子图节点只在 subgraphs 打开时点亮。 */
function contributedNodes(
  mode: StreamModeChoice,
  subgraphs: boolean,
): Set<string> {
  const nodes = new Set<string>();
  for (const chunk of projectStream(mode, subgraphs)) {
    nodes.add(chunk.node);
  }
  if (mode === 'values') {
    // values 的快照按超步归属根图节点；子图条目点亮 b1/b2。
    nodes.add('a');
    nodes.add('b');
    nodes.add('c');
    if (subgraphs) {
      nodes.add('b1');
      nodes.add('b2');
    }
  }
  return nodes;
}

/** 每种（通道 × subgraphs）组合的结论句：与正文断言一一对应。 */
function footnoteFor(mode: StreamModeChoice, subgraphs: boolean): string {
  if (mode === 'updates') {
    return subgraphs
      ? 'updates + subgraphs：5 条——子图 b1/b2 插在中间并带 namespace 前缀；b 自身的更新仍在子图之后'
      : 'updates：3 条——每个父图节点一条，只含该节点返回的 key；b 的更新要等子图跑完';
  }
  if (mode === 'values') {
    return subgraphs
      ? 'values + subgraphs：7 条——子图自己的输入态与每步快照也插入，前缀指向子图'
      : 'values：4 条——首条是输入态，每条都是全量快照（未改的 key 也在），末条等于 invoke 返回值';
  }
  if (mode === 'messages') {
    return subgraphs
      ? 'messages + subgraphs：7 条——子图内 b1 的 token 也进入，变成 [namespace, (chunk, metadata)] 三层'
      : 'messages：3 条——按官方文档口径默认只呈现父图的模型 token，形态是 (chunk, metadata) 元组';
  }
  if (mode === 'custom') {
    return subgraphs
      ? 'custom + subgraphs：1 条——a 在根图执行，namespace 是空数组 []'
      : 'custom：1 条——只有节点 a 里 config.writer 发出的载荷；streamMode 不含 custom 时它会被丢弃';
  }
  return subgraphs
    ? '三层元组 [namespace, mode, chunk]：custom、updates、子图与父图全部到齐'
    : '["updates","custom"]：4 条——按执行时序交错：writer 在节点执行中触发，先于同节点的 updates';
}

export interface ExampleSnapshot {
  mode: StreamModeChoice;
  subgraphs: boolean;
  chunkCount: number;
  subgraphChunks: number;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const COLOR = {
  title: '#172033',
  sub: '#64748b',
  text: '#334155',
  ghost: '#b6c2d1',
  cardStroke: '#dbe3f0',
  updates: '#4f7cff',
  values: '#0f8a5f',
  messages: '#7c6bb0',
  custom: '#b45309',
  subgraph: '#0e7490',
};

function channelColor(channel: ProjectedChunk['channel']): string {
  if (channel === 'updates') {
    return COLOR.updates;
  }
  if (channel === 'values') {
    return COLOR.values;
  }
  if (channel === 'messages') {
    return COLOR.messages;
  }
  return COLOR.custom;
}

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
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
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

/** 顶部图结构示意：a → b（虚线盒，内含 b1 → b2）→ c；有贡献的节点点亮。 */
function drawGraphStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  contributed: Set<string>,
): void {
  const chipH = 24;
  const subChipW = 30;
  const y = top + 14;

  const drawChip = (
    label: string,
    cx: number,
    active: boolean,
  ): void => {
    const w = 30;
    ctx.fillStyle = active ? '#e8efff' : '#f1f5f9';
    roundedRect(ctx, cx, y, w, chipH, 6);
    ctx.fill();
    ctx.strokeStyle = active ? COLOR.updates : COLOR.cardStroke;
    ctx.lineWidth = active ? 1.5 : 1;
    ctx.stroke();
    ctx.fillStyle = active ? COLOR.title : COLOR.sub;
    ctx.font = `600 12px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, cx + w / 2, y + 16);
    ctx.textAlign = 'left';
  };

  const drawArrow = (from: number, to: number): void => {
    ctx.strokeStyle = COLOR.ghost;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(from, y + chipH / 2);
    ctx.lineTo(to, y + chipH / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to - 4, y + chipH / 2 - 3);
    ctx.lineTo(to, y + chipH / 2);
    ctx.lineTo(to - 4, y + chipH / 2 + 3);
    ctx.stroke();
  };

  // a
  drawChip('a', x, contributed.has('a'));
  const aRight = x + 30;
  // b 虚线容器（内含 b1 → b2）
  const bLeft = aRight + 26;
  const bWidth = subChipW * 2 + 30;
  drawArrow(aRight, bLeft);
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = COLOR.subgraph;
  ctx.lineWidth = 1.2;
  roundedRect(ctx, bLeft, y - 6, bWidth, chipH + 12, 7);
  ctx.stroke();
  ctx.setLineDash([]);
  drawChip('b1', bLeft + 10, contributed.has('b1'));
  drawArrow(bLeft + 10 + subChipW, bLeft + 10 + subChipW + 12);
  drawChip('b2', bLeft + 10 + subChipW + 12, contributed.has('b2'));
  ctx.fillStyle = COLOR.subgraph;
  ctx.font = `10px ${SANS}`;
  ctx.fillText('b（子图）', bLeft, y - 10);
  // c
  const cLeft = bLeft + bWidth + 26;
  drawArrow(bLeft + bWidth, cLeft);
  drawChip('c', cLeft, contributed.has('c'));
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  args: ExampleArgs,
): void {
  ctx.clearRect(0, 0, width, height);
  const chunks = projectStream(args.mode, args.subgraphs);

  const pad = 36;
  ctx.fillStyle = COLOR.title;
  ctx.font = `600 15.5px ${SANS}`;
  ctx.fillText('同一次图执行，不同 streamMode 各自收到什么', pad, 38);

  const modeExpr =
    args.mode === 'updates+custom'
      ? '["updates", "custom"]'
      : `"${args.mode}"`;
  ctx.fillStyle = COLOR.sub;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(
    fitText(
      ctx,
      `for await (const chunk of await graph.stream(input, { streamMode: ${modeExpr}${args.subgraphs ? ', subgraphs: true' : ''} }))`,
      width - pad * 2,
    ),
    pad,
    60,
  );

  drawGraphStrip(
    ctx,
    pad,
    70,
    contributedNodes(args.mode, args.subgraphs),
  );

  // chunk 列表：每行 = 序号 + 通道名（着色）+ 展示形态；子图条目加底色。
  const listTop = 128;
  const listBottom = height - 40;
  const rows = Math.max(chunks.length, 1);
  const rowH = Math.max(16, Math.min(30, (listBottom - listTop) / rows));
  const showChannelLabel = rowH >= 21;

  ctx.font = `11px ${MONO}`;
  if (chunks.length === 0) {
    ctx.fillStyle = COLOR.ghost;
    ctx.fillText('（该通道下没有任何 chunk）', pad, listTop + 14);
  }

  chunks.forEach((chunk, index) => {
    const y = listTop + index * rowH;
    if (chunk.isSubgraph) {
      ctx.fillStyle = 'rgba(14, 116, 144, 0.08)';
      roundedRect(ctx, pad - 8, y - 1, width - pad * 2 + 16, rowH - 3, 4);
      ctx.fill();
    }

    let cursor = pad;
    ctx.fillStyle = COLOR.ghost;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(`#${chunk.order}`, cursor, y + 13);
    cursor += ctx.measureText(`#${chunk.order}`).width + 10;

    const label = showChannelLabel ? chunk.channel : chunk.channel.slice(0, 1);
    ctx.fillStyle = channelColor(chunk.channel);
    ctx.fillText(label, cursor, y + 13);
    cursor += ctx.measureText(label).width + 10;

    ctx.fillStyle = chunk.isSubgraph ? COLOR.subgraph : COLOR.text;
    ctx.fillText(
      fitText(ctx, chunk.display, width - pad - 12 - cursor),
      cursor,
      y + 13,
    );
  });

  // 底部结论句：与正文断言对应的可观察证据。
  ctx.fillStyle = COLOR.sub;
  ctx.font = `11.5px ${SANS}`;
  ctx.fillText(
    fitText(ctx, footnoteFor(args.mode, args.subgraphs), width - pad * 2),
    pad,
    height - 16,
  );
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

  let current: ExampleArgs = { mode: 'updates', subgraphs: false };

  function drawCurrent(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    draw(drawingContext, width, height, current);
    const chunks = projectStream(current.mode, current.subgraphs);
    emit({
      mode: current.mode,
      subgraphs: current.subgraphs,
      chunkCount: chunks.length,
      subgraphChunks: chunks.filter((chunk) => chunk.isSubgraph).length,
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
