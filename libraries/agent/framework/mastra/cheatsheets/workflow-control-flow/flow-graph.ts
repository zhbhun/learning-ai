import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/**
 * 流程图执行器（离线示意，Canvas 2D 绘制，不调用真实模型、不真正运行 Mastra）
 *
 * 演示内容：五种控制流原语对应的执行图 —— .then 顺序、.parallel 并行、.branch 条件分支、
 *   .dountil 循环、.foreach 批处理；执行按「波次」推进，同一波次内的节点同时执行。
 * 输入：primitive（切换原语）、branchValue（.branch 的判断值 value）、concurrency（.foreach 并发度）。
 * 操作：切换原语或拖动数值控件，画布重放一次执行；分支未命中的节点灰显「未执行」。
 * 预期结果：读数给出执行序列、已执行步骤数与并发峰值；.branch 只点亮第一个为真条件命中的节点；
 *   .foreach 按 concurrency 把 6 个数组项分波次并行，执行序列保持输入顺序。
 * 阅读主线：原语切换 → 执行图波次推进 → 时间线芯片 → 底部规则与图例。
 */

export type Primitive = 'then' | 'parallel' | 'branch' | 'dountil' | 'foreach';

export interface FlowGraphArgs {
  primitive: Primitive;
  branchValue: number;
  concurrency: number;
}

export interface FlowGraphSnapshot {
  primitive: Primitive;
  sequence: string;
  executedSteps: number;
  concurrencyPeak: number;
  note: string;
}

export interface FlowGraphInstance {
  update(args: FlowGraphArgs): void;
  dispose(): void;
}

const MAX_ITERATIONS = 6; // .dountil 示例的 iterationCount 安全上限（抛错防死循环）
const FOREACH_ITEMS = 6; // .foreach 示例的数组长度

interface FlowNode {
  id: string;
  sub: string;
  col: number;
  row: number;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  selfLoop?: boolean;
  faint?: boolean;
}

interface FlowWave {
  ids: string[];
}

interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
  waves: FlowWave[];
  skipped: string[];
  badge: string;
  rule: string;
  note: string;
}

// —— 执行图构建：每种原语一张图；waves 描述波次顺序，波次内节点同时执行 ——

export function buildGraph(args: FlowGraphArgs): FlowGraph {
  const { primitive } = args;

  if (primitive === 'then') {
    return {
      nodes: [
        { id: 'step-a', sub: '顺序 1/3', col: 0, row: 0 },
        { id: 'step-b', sub: '顺序 2/3', col: 1, row: 0 },
        { id: 'step-c', sub: '顺序 3/3', col: 2, row: 0 },
      ],
      edges: [
        { from: 'step-a', to: 'step-b' },
        { from: 'step-b', to: 'step-c' },
      ],
      waves: [{ ids: ['step-a'] }, { ids: ['step-b'] }, { ids: ['step-c'] }],
      skipped: [],
      badge: '并发峰值 1',
      rule: '.then() 顺序执行：每个步骤的 inputData 是上一步输出；首步输入须匹配工作流 inputSchema。',
      note: 'step-a → step-b → step-c 依次执行，任何时刻只有一个步骤在跑',
    };
  }

  if (primitive === 'parallel') {
    return {
      nodes: [
        { id: 'step-a', sub: '共同输入', col: 0, row: 0 },
        { id: 'step-b', sub: '同时执行', col: 1, row: -1 },
        { id: 'step-c', sub: '同时执行', col: 1, row: 0 },
        { id: 'step-d', sub: '同时执行', col: 1, row: 1 },
        { id: 'after', sub: '全部完成后继续', col: 2, row: 0 },
      ],
      edges: [
        { from: 'step-a', to: 'step-b' },
        { from: 'step-a', to: 'step-c' },
        { from: 'step-a', to: 'step-d' },
        { from: 'step-b', to: 'after' },
        { from: 'step-c', to: 'after' },
        { from: 'step-d', to: 'after' },
      ],
      waves: [
        { ids: ['step-a'] },
        { ids: ['step-b', 'step-c', 'step-d'] },
        { ids: ['after'] },
      ],
      skipped: [],
      badge: '并发峰值 3',
      rule: '.parallel([b, c, d]) 用同一输入同时执行；输出按 step id 键控，全部完成后才进入下一步（同步点）。',
      note: 'step-b、step-c、step-d 位于同一波次，全部完成后才进入 after',
    };
  }

  if (primitive === 'branch') {
    const value = Math.round(args.branchValue);
    const branchDefs = [
      { id: 'step-approve', sub: '条件1 value ≥ 80', hit: value >= 80 },
      { id: 'step-review', sub: '条件2 value ≥ 40', hit: value < 80 && value >= 40 },
      { id: 'step-reject', sub: '兜底 其余取值', hit: value < 40 },
    ];
    const chosen = branchDefs.find((b) => b.hit)?.id ?? 'step-reject';
    return {
      nodes: [
        { id: 'check', sub: '按定义顺序评估', col: 0, row: 0 },
        { id: 'step-approve', sub: branchDefs[0].sub, col: 1, row: -1 },
        { id: 'step-review', sub: branchDefs[1].sub, col: 1, row: 0 },
        { id: 'step-reject', sub: branchDefs[2].sub, col: 1, row: 1 },
        { id: 'notify', sub: '下游声明可选字段', col: 2, row: 0 },
      ],
      edges: [
        { from: 'check', to: 'step-approve' },
        { from: 'check', to: 'step-review' },
        { from: 'check', to: 'step-reject' },
        { from: chosen, to: 'notify' },
      ],
      waves: [{ ids: ['check'] }, { ids: [chosen] }, { ids: ['notify'] }],
      skipped: branchDefs.filter((b) => b.id !== chosen).map((b) => b.id),
      badge: `命中 ${chosen}`,
      rule: '.branch() 按定义顺序评估条件，只执行第一个为真的分支；输出按被执行步骤 id 键控。',
      note: `value=${value} → 命中 ${chosen}（第一个为真的条件），其余分支未执行`,
    };
  }

  if (primitive === 'dountil') {
    return {
      nodes: [
        { id: 'loop', sub: '先执行，再判断条件', col: 0, row: 0 },
        { id: 'finish', sub: '条件为真后继续', col: 1, row: 0 },
      ],
      edges: [
        { from: 'loop', to: 'loop', selfLoop: true, label: '条件为假：再来一轮' },
        { from: 'loop', to: 'finish', label: '条件为真' },
      ],
      waves: [{ ids: ['loop'] }, { ids: ['loop'] }, { ids: ['loop'] }, { ids: ['finish'] }],
      skipped: [],
      badge: `执行 3 轮 · 上限 ${MAX_ITERATIONS}`,
      rule: '.dountil() 先执行再判断；条件里可读 inputData.iterationCount，达到上限抛错即可终止工作流。',
      note: `loop 执行 3 轮后条件为真退出；iterationCount ≥ ${MAX_ITERATIONS} 时抛错`,
    };
  }

  // foreach
  const c = Math.max(1, Math.min(FOREACH_ITEMS, Math.round(args.concurrency)));
  const itemWaves: string[][] = [];
  for (let i = 0; i < FOREACH_ITEMS; i += 1) {
    const k = Math.floor(i / c);
    if (!itemWaves[k]) {
      itemWaves[k] = [];
    }
    itemWaves[k].push(`item-${i + 1}`);
  }
  const nodes: FlowNode[] = [
    { id: 'items-in', sub: `T[] ${FOREACH_ITEMS} 项`, col: 0, row: 0 },
    { id: 'items-out', sub: 'U[] 按输入顺序', col: 3, row: 0 },
  ];
  const edges: FlowEdge[] = [];
  itemWaves.forEach((ids, k) => {
    ids.forEach((id, j) => {
      const index = k * c + j;
      nodes.splice(1 + index, 0, {
        id,
        sub: '每项同一操作',
        col: 1 + Math.floor(index / 3),
        row: (index % 3) - 1,
      });
      edges.push({ from: 'items-in', to: id, faint: true });
      edges.push({ from: id, to: 'items-out', faint: true });
    });
  });
  return {
    nodes,
    edges,
    waves: [{ ids: ['items-in'] }, ...itemWaves.map((ids) => ({ ids })), { ids: ['items-out'] }],
    skipped: [],
    badge: `并发 ${c} · ${itemWaves.length} 个波次`,
    rule: `.foreach(step, { concurrency: ${c} }) 对数组每项执行同一操作；同波次内最多 ${c} 项并行，输出保持输入顺序。`,
    note: `${FOREACH_ITEMS} 项 × concurrency=${c} → ${itemWaves.length} 个波次，结果仍按 item-1…item-${FOREACH_ITEMS} 顺序`,
  };
}

function snapshotOf(graph: FlowGraph, primitive: Primitive): FlowGraphSnapshot {
  return {
    primitive,
    sequence: graph.waves.map((w) => w.ids.join(' + ')).join(' → '),
    executedSteps: graph.waves.reduce((sum, w) => sum + w.ids.length, 0),
    concurrencyPeak: graph.waves.reduce((max, w) => Math.max(max, w.ids.length), 0),
    note: graph.note,
  };
}

// —— 绘制 ——

const DESIGN_W = 880;
const DESIGN_H = 430;
const AREA_X = 30;
const NODE_W = 136;
const NODE_H = 54;
const COL_STEP = 200;
const ROW_STEP = 66;
const BASE_Y = 158;

const UI_FONT = '"PingFang SC", system-ui, sans-serif';
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';

type NodeState = 'pending' | 'active' | 'done' | 'skipped';

function nodePos(node: FlowNode): { x: number; y: number } {
  return { x: 40 + node.col * COL_STEP, y: BASE_Y + node.row * ROW_STEP - NODE_H / 2 };
}

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

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: FlowNode,
  state: NodeState,
): void {
  const { x, y } = nodePos(node);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, NODE_W, NODE_H, 10);
  if (state === 'active') {
    ctx.fillStyle = '#e7f6ec';
    ctx.strokeStyle = '#2f9e5f';
  } else if (state === 'done') {
    ctx.fillStyle = '#e9f0fa';
    ctx.strokeStyle = '#2f6bd8';
  } else {
    ctx.fillStyle = '#f3f5f8';
    ctx.strokeStyle = '#aeb9c6';
  }
  ctx.lineWidth = state === 'active' ? 2 : 1.5;
  if (state === 'pending' || state === 'skipped') {
    ctx.setLineDash([5, 4]);
  }
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = state === 'pending' || state === 'skipped' ? '#93a1b3' : '#1d4fa8';
  ctx.font = `700 11px ${MONO_FONT}`;
  ctx.fillText(fit(ctx, node.id, NODE_W - 12), x + NODE_W / 2, y + 20);
  ctx.fillStyle = state === 'pending' || state === 'skipped' ? '#9aa8ba' : '#5f718a';
  ctx.font = `9.5px ${UI_FONT}`;
  ctx.fillText(fit(ctx, node.sub, NODE_W - 10), x + NODE_W / 2, y + 39);
  if (state === 'skipped') {
    ctx.fillStyle = '#b03030';
    ctx.font = `600 9.5px ${UI_FONT}`;
    ctx.fillText('未执行', x + NODE_W / 2, y + NODE_H + 11);
  }
  ctx.restore();
}

function arrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 7, y - 4);
  ctx.lineTo(x - 7, y + 4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  a: FlowNode,
  b: FlowNode,
  fromState: NodeState,
  toState: NodeState,
  edge: FlowEdge,
): void {
  if (edge.selfLoop) {
    drawSelfLoop(ctx, a, fromState, edge.label);
    return;
  }
  const pa = nodePos(a);
  const pb = nodePos(b);
  const traversed = fromState !== 'pending' && toState !== 'pending' && fromState !== 'skipped' && toState !== 'skipped';
  const color = !traversed
    ? '#aeb9c6'
    : toState === 'active'
      ? '#2f9e5f'
      : '#2f6bd8';
  let alpha = traversed ? 0.9 : 0.35;
  if (edge.faint) {
    alpha *= 0.6;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  if (!traversed) {
    ctx.setLineDash([4, 3]);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  const x1 = pa.x + NODE_W;
  const y1 = pa.y + NODE_H / 2;
  const x2 = pb.x - 2;
  const y2 = pb.y + NODE_H / 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  arrowHead(ctx, x2, y2, color);
  if (edge.label) {
    ctx.fillStyle = '#5f718a';
    ctx.font = `600 9.5px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(edge.label, (x1 + x2) / 2, y1 - 12);
  }
  ctx.restore();
}

function drawSelfLoop(
  ctx: CanvasRenderingContext2D,
  node: FlowNode,
  state: NodeState,
  label: string | undefined,
): void {
  const p = nodePos(node);
  const cx = p.x + NODE_W / 2;
  const top = p.y;
  const active = state === 'active';
  const color = active ? '#2f9e5f' : '#aeb9c6';
  ctx.save();
  ctx.globalAlpha = active ? 0.95 : 0.45;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx + 30, top);
  ctx.bezierCurveTo(cx + 46, top - 54, cx - 46, top - 54, cx - 24, top - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 24, top - 2);
  ctx.lineTo(cx - 29, top - 12);
  ctx.lineTo(cx - 17, top - 11);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (label) {
    ctx.fillStyle = '#5f718a';
    ctx.font = `600 9.5px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, top - 60);
  }
  ctx.restore();
}

function drawTimeline(
  ctx: CanvasRenderingContext2D,
  graph: FlowGraph,
  progress: number,
): void {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5f718a';
  ctx.font = `600 10.5px ${UI_FONT}`;
  ctx.fillText('执行时间线（从左到右为波次顺序，同一芯片内同时执行）', AREA_X, 296);
  let x = AREA_X;
  const y = 306;
  const h = 28;
  graph.waves.forEach((wave, k) => {
    const state = progress >= k + 1 ? 'done' : progress > k ? 'active' : 'pending';
    const text = wave.ids.join(' + ');
    ctx.font = `600 10px ${MONO_FONT}`;
    const w = Math.min(170, Math.max(50, ctx.measureText(text).width + 22));
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    if (state === 'active') {
      ctx.fillStyle = '#e7f6ec';
      ctx.fill();
      ctx.strokeStyle = '#2f9e5f';
      ctx.lineWidth = 1.8;
    } else if (state === 'done') {
      ctx.fillStyle = '#e9f0fa';
      ctx.fill();
      ctx.strokeStyle = '#2f6bd8';
      ctx.lineWidth = 1.4;
    } else {
      ctx.strokeStyle = '#c9d3de';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.2;
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = state === 'pending' ? '#93a1b3' : state === 'active' ? '#1d7a46' : '#1d4fa8';
    ctx.textAlign = 'center';
    ctx.fillText(fit(ctx, text, w - 10), x + w / 2, y + h / 2);
    x += w;
    if (k < graph.waves.length - 1) {
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#8494a8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + h / 2);
      ctx.lineTo(x + 11, y + h / 2);
      ctx.stroke();
      arrowHead(ctx, x + 12, y + h / 2, '#8494a8');
      ctx.globalAlpha = 1;
      x += 15;
    }
    ctx.textAlign = 'left';
  });
  ctx.restore();
}

function drawRules(ctx: CanvasRenderingContext2D, graph: FlowGraph): void {
  ctx.save();
  const y = 348;
  const h = 60;
  ctx.beginPath();
  ctx.roundRect(AREA_X, y, DESIGN_W - AREA_X * 2, h, 12);
  ctx.fillStyle = '#f2f5f9';
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `11.5px ${UI_FONT}`;
  ctx.fillStyle = '#42526b';
  ctx.fillText(fit(ctx, graph.rule, DESIGN_W - AREA_X * 2 - 32), AREA_X + 16, y + 20);
  ctx.font = `10.5px ${UI_FONT}`;
  ctx.fillStyle = '#5f718a';
  ctx.fillText(
    fit(ctx, '绿色 = 正在执行 · 蓝色 = 已完成 · 灰色虚线 = 未执行 / 未到达；读数「并发峰值」= 最大波次内的节点数。', DESIGN_W - AREA_X * 2 - 32),
    AREA_X + 16,
    y + 42,
  );
  ctx.restore();
}

export function createFlowGraph(
  canvas: HTMLCanvasElement,
  emit: (snapshot: FlowGraphSnapshot) => void,
): FlowGraphInstance {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let args: FlowGraphArgs = { primitive: 'then', branchValue: 50, concurrency: 2 };
  let graph = buildGraph(args);
  let progress = 0;
  let lastKey = '';

  const waveIndex = new Map<string, number>();
  graph.waves.forEach((w, k) => w.ids.forEach((id) => waveIndex.set(id, k)));

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

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#42526b';
    ctx.font = `600 13.5px ${UI_FONT}`;
    ctx.fillText('流程图执行器 —— 切换原语，观察执行顺序与并发度', AREA_X, 30);
    ctx.restore();

    // 原语角标（右上角）
    ctx.save();
    ctx.font = `700 11px ${MONO_FONT}`;
    const badgeW = ctx.measureText(graph.badge).width + 24;
    ctx.beginPath();
    ctx.roundRect(DESIGN_W - AREA_X - badgeW, 18, badgeW, 24, 12);
    ctx.fillStyle = '#eef2f9';
    ctx.fill();
    ctx.strokeStyle = '#c9d3de';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#42526b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(graph.badge, DESIGN_W - AREA_X - badgeW / 2, 30);
    ctx.restore();

    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
    const stateOf = (id: string): NodeState => {
      if (graph.skipped.includes(id)) {
        return 'skipped';
      }
      const k = waveIndex.get(id) ?? 99;
      if (progress >= k + 1) {
        return 'done';
      }
      return progress > k ? 'active' : 'pending';
    };

    for (const edge of graph.edges) {
      const a = nodeById.get(edge.from);
      const b = nodeById.get(edge.to);
      if (a && b) {
        drawEdge(ctx, a, b, stateOf(edge.from), stateOf(edge.to), edge);
      }
    }
    for (const node of graph.nodes) {
      drawNode(ctx, node, stateOf(node.id));
    }
    drawTimeline(ctx, graph, progress);
    drawRules(ctx, graph);
  }

  const loop = createRenderLoop(canvas, (delta: number) => {
    const total = graph.waves.length + 0.8;
    progress += (total - progress) * Math.min(1, delta * 5);
    if (total - progress < 0.02) {
      progress = total;
    }
    draw();
  });
  const observer = createResizeObserver(canvas, draw);
  draw();

  return {
    update(next: FlowGraphArgs): void {
      const key = `${next.primitive}|${next.branchValue}|${next.concurrency}`;
      if (key !== lastKey) {
        lastKey = key;
        args = next;
        graph = buildGraph(args);
        waveIndex.clear();
        graph.waves.forEach((w, k) => w.ids.forEach((id) => waveIndex.set(id, k)));
        progress = 0; // 每次调整输入都重放一次执行
        emit(snapshotOf(graph, next.primitive));
      }
      draw();
    },
    dispose(): void {
      loop.dispose();
      observer.disconnect();
    },
  };
}
