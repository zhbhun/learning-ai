/**
 * 范例介绍：StateGraph 一步回放。用不依赖 @langchain/* 的迷你图引擎，确定性模拟
 * 「输入 → 节点执行 → reducer 合并 → 条件边选择 → 输出」的超步推进：
 * - notes 通道的 reducer 可在「覆盖（last-value）」与「追加（concat）」之间切换，
 *   同一批节点返回值以不同方式并入状态；
 * - 条件边按 intent 选择 billing / general 分支；
 * - Send 分支数大于 0 时改走 map-reduce：每个 worker 收到自己的私有输入，
 *   results 通道以 concat 汇合后进入 summarize。
 * 输入或前置状态：Controls 提供输入问题、notes 合并方式、Send 分支数；
 * 纯本地 TS 演示，不发起模型调用。
 * 主要操作：切换任一输入（回放自动重置）；等待回放逐步推进。
 * 预期结果：图上的高亮节点与所选边、左侧更新与状态面板、右侧超步日志同步变化；
 * 切换 notes 合并方式时，最终 notes 通道在「只剩最后一条」与「全部累积」之间切换。
 * 阅读主线：runReplay()（引擎语义）→ layoutGraph()（拓扑布局）→ draw()（呈现）。
 */
import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleOptions {
  isRefund: boolean;
  notesConcat: boolean;
  fanout: number;
}

export interface ExampleSnapshot {
  stepLabel: string;
  nodes: string;
  notesLabel: string;
  resultsLabel: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

interface ReplayState {
  question: string;
  intent: string;
  notes: string[];
  results: string[];
  answer: string;
}

interface ReplayEvent {
  tag: string;
  label: string;
  activeNodes: string[];
  edges: Array<[string, string]>;
  updates: string[];
  touched: string[];
  stateAfter: ReplayState;
}

const STEP_SECONDS = 2;

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const BLUE_SOFT = '#93adff';
const LINE = '#dbe3f0';
const PENDING = '#cbd5e1';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 迷你引擎：按当前输入确定性推进整张图，返回逐超步事件序列。
// 语义镜像 StateGraph：节点返回更新片段，notes 通道按所选 reducer 合并，
// 条件边按 intent 选路或返回 Send ×N，results 通道固定 concat 供 Send 汇合。
function runReplay(options: ExampleOptions): ReplayEvent[] {
  const question = options.isRefund ? '我要申请退款' : '如何修改收货地址？';
  const intent = options.isRefund ? 'billing' : 'general';
  const notesReduce = options.notesConcat
    ? (current: string[], update: string[]) => [...current, ...update]
    : (_current: string[], update: string[]) => [...update];

  const state: ReplayState = {
    question,
    intent: '',
    notes: [],
    results: [],
    answer: '',
  };
  const events: ReplayEvent[] = [];
  const snapshot = (): ReplayState => ({
    ...state,
    notes: [...state.notes],
    results: [...state.results],
  });

  // 超步 1：classify 执行——读 question，返回更新片段 { intent, notes }
  state.intent = intent;
  state.notes = notesReduce(state.notes, ['classify·识别意图']);
  events.push({
    tag: '#1',
    label: 'classify 执行：读 question，返回 { intent, notes }',
    activeNodes: ['classify'],
    edges: [['__start__', 'classify']],
    updates: [`intent ← ${intent}`, 'notes ← classify·识别意图'],
    touched: ['intent', 'notes'],
    stateAfter: snapshot(),
  });

  if (options.fanout > 0) {
    const count = options.fanout;

    // 超步 2：条件边返回 Send ×N——分支数运行时才确定
    events.push({
      tag: '#2',
      label: `条件边返回 Send ×${count}：每个 worker 各带一份输入`,
      activeNodes: ['route'],
      edges: [
        ['classify', 'route'],
        ...Array.from({ length: count }, (_, i): [string, string] => [
          'route',
          `worker:${i + 1}`,
        ]),
      ],
      updates: Array.from(
        { length: count },
        (_, i) => `new Send("worker", { topic: "${question}·分支${i + 1}" })`,
      ),
      touched: [],
      stateAfter: snapshot(),
    });

    // 超步 3：workers 在同一超步并行执行，返回值经各自 reducer 合并
    const workerNotes: string[] = [];
    for (let i = 1; i <= count; i += 1) {
      state.results = [...state.results, `分支${i}的检索结果`];
      workerNotes.push(`worker${i}·检索 分支${i}`);
    }
    state.notes = notesReduce(state.notes, workerNotes);
    events.push({
      tag: '#3',
      label: `worker:1${count > 1 ? ` ∥ … ∥ worker:${count}` : ''} 同一超步并行，results 用 concat 汇合`,
      activeNodes: Array.from({ length: count }, (_, i) => `worker:${i + 1}`),
      edges: [],
      updates: Array.from(
        { length: count },
        (_, i) => `worker:${i + 1} 返回 { results: ["分支${i + 1}的检索结果"], notes: [...] }`,
      ),
      touched: ['results', 'notes'],
      stateAfter: snapshot(),
    });

    // 超步 4：summarize 在 fan-in 之后读到合并完成的 results
    state.notes = notesReduce(state.notes, ['summarize·汇总']);
    state.answer = `汇总 ${count} 条结果`;
    events.push({
      tag: '#4',
      label: 'summarize 执行：fan-in 完成，读到合并后的 results',
      activeNodes: ['summarize'],
      edges: Array.from({ length: count }, (_, i): [string, string] => [
        `worker:${i + 1}`,
        'summarize',
      ]),
      updates: [`answer ← 汇总 ${count} 条结果`, 'notes ← summarize·汇总'],
      touched: ['answer', 'notes'],
      stateAfter: snapshot(),
    });

    events.push({
      tag: '#5',
      label: 'END：invoke 返回合并后的全量状态',
      activeNodes: ['__end__'],
      edges: [['summarize', '__end__']],
      updates: ['invoke 输出 = 各通道最终值'],
      touched: [],
      stateAfter: snapshot(),
    });
  } else {
    // 超步 2：条件边按 intent 选择一条边
    events.push({
      tag: '#2',
      label: `条件边：intent === "${intent}" → ${intent}`,
      activeNodes: ['route'],
      edges: [
        ['classify', 'route'],
        ['route', intent],
      ],
      updates: [`路由结果：${intent}`],
      touched: [],
      stateAfter: snapshot(),
    });

    // 超步 3：所选分支执行
    state.notes = notesReduce(state.notes, [`${intent}·处理`]);
    state.answer =
      intent === 'billing' ? '已登记退款申请' : '已给出地址修改步骤';
    events.push({
      tag: '#3',
      label: `${intent} 执行：返回 { answer, notes }`,
      activeNodes: [intent],
      edges: [],
      updates: [`answer ← ${state.answer}`, `notes ← ${intent}·处理`],
      touched: ['answer', 'notes'],
      stateAfter: snapshot(),
    });

    events.push({
      tag: '#4',
      label: 'END：invoke 返回合并后的全量状态',
      activeNodes: ['__end__'],
      edges: [[intent, '__end__']],
      updates: ['invoke 输出 = 各通道最终值'],
      touched: [],
      stateAfter: snapshot(),
    });
  }

  return events;
}

interface NodeBox {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: 'dot' | 'box' | 'diamond';
  label: string;
}

interface GraphLayout {
  nodes: Map<string, NodeBox>;
  edges: Array<[string, string]>;
}

// 拓扑布局：按当前 fanout 决定分支列形态（billing/general 或 worker×N + summarize）。
function layoutGraph(
  width: number,
  height: number,
  options: ExampleOptions,
): GraphLayout {
  const pad = 32;
  const graphTop = 78;
  const graphBottom = Math.max(graphTop + 96, height * 0.5);
  const bandW = Math.max(200, width - pad * 2);
  const cols = options.fanout > 0 ? 6 : 5;
  const colX = (i: number) => pad + (bandW * (i + 0.5)) / cols;
  const midY = (graphTop + graphBottom) / 2;
  const nodeW = Math.max(58, Math.min(104, bandW / cols - 24));
  const nodeH = 30;

  const nodes = new Map<string, NodeBox>();
  const edges: Array<[string, string]> = [];

  nodes.set('__start__', {
    x: colX(0),
    y: midY,
    w: 14,
    h: 14,
    shape: 'dot',
    label: 'START',
  });
  nodes.set('classify', {
    x: colX(1),
    y: midY,
    w: nodeW,
    h: nodeH,
    shape: 'box',
    label: 'classify',
  });
  nodes.set('route', {
    x: colX(2),
    y: midY,
    w: Math.min(72, nodeW),
    h: 40,
    shape: 'diamond',
    label: 'route',
  });
  edges.push(['__start__', 'classify'], ['classify', 'route']);

  if (options.fanout > 0) {
    const count = options.fanout;
    const spread =
      count > 1 ? Math.min(44, (graphBottom - graphTop - 34) / (count - 1)) : 0;
    for (let i = 1; i <= count; i += 1) {
      nodes.set(`worker:${i}`, {
        x: colX(3),
        y: midY + (i - (count + 1) / 2) * spread,
        w: nodeW,
        h: 26,
        shape: 'box',
        label: `worker:${i}`,
      });
      edges.push(['route', `worker:${i}`], [`worker:${i}`, 'summarize']);
    }
    nodes.set('summarize', {
      x: colX(4),
      y: midY,
      w: nodeW,
      h: nodeH,
      shape: 'box',
      label: 'summarize',
    });
    nodes.set('__end__', {
      x: colX(5),
      y: midY,
      w: 14,
      h: 14,
      shape: 'dot',
      label: 'END',
    });
    edges.push(['summarize', '__end__']);
  } else {
    nodes.set('billing', {
      x: colX(3),
      y: midY - 26,
      w: nodeW,
      h: nodeH,
      shape: 'box',
      label: 'billing',
    });
    nodes.set('general', {
      x: colX(3),
      y: midY + 26,
      w: nodeW,
      h: nodeH,
      shape: 'box',
      label: 'general',
    });
    nodes.set('__end__', {
      x: colX(4),
      y: midY,
      w: 14,
      h: 14,
      shape: 'dot',
      label: 'END',
    });
    edges.push(
      ['route', 'billing'],
      ['route', 'general'],
      ['billing', '__end__'],
      ['general', '__end__'],
    );
  }

  return { nodes, edges };
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

function diamondPath(ctx: CanvasRenderingContext2D, box: NodeBox) {
  ctx.beginPath();
  ctx.moveTo(box.x, box.y - box.h / 2);
  ctx.lineTo(box.x + box.w / 2, box.y);
  ctx.lineTo(box.x, box.y + box.h / 2);
  ctx.lineTo(box.x - box.w / 2, box.y);
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

// 从节点中心指向目标时的边界出发点，让箭头不压在节点形状上。
function edgeAnchor(from: NodeBox, tx: number, ty: number): [number, number] {
  const dx = tx - from.x;
  const dy = ty - from.y;
  if (dx === 0 && dy === 0) {
    return [from.x, from.y];
  }
  let scale: number;
  if (from.shape === 'dot') {
    const len = Math.hypot(dx, dy);
    scale = 9 / len;
  } else if (from.shape === 'diamond') {
    scale = 1 / (Math.abs(dx) / (from.w / 2 + 2) + Math.abs(dy) / (from.h / 2 + 2));
  } else {
    scale = Math.min(
      (from.w / 2 + 3) / Math.abs(dx || 1e-6),
      (from.h / 2 + 3) / Math.abs(dy || 1e-6),
    );
  }
  return [from.x + dx * scale, from.y + dy * scale];
}

function fillTriangle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  color: string,
) {
  const size = 6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - size * Math.cos(angle - 0.45), y - size * Math.sin(angle - 0.45));
  ctx.lineTo(x - size * Math.cos(angle + 0.45), y - size * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  layout: GraphLayout,
  fromKey: string,
  toKey: string,
  color: string,
  width: number,
) {
  const from = layout.nodes.get(fromKey);
  const to = layout.nodes.get(toKey);
  if (!from || !to) {
    return;
  }
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const [x1, y1] = edgeAnchor(from, to.x, to.y);
  const [x2, y2] = edgeAnchor(to, from.x, from.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  fillTriangle(ctx, x2, y2, angle, color);
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  box: NodeBox,
  status: 'pending' | 'done' | 'active',
) {
  const stroke = status === 'active' ? BLUE : status === 'done' ? '#8494ab' : LINE;
  const fill = status === 'active' ? '#eef3ff' : '#ffffff';
  const text = status === 'active' ? BLUE : status === 'done' ? INK : MUTED;

  ctx.lineWidth = status === 'active' ? 2 : 1;
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  if (box.shape === 'dot') {
    ctx.beginPath();
    ctx.arc(box.x, box.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `600 11px ${FONT}`;
    ctx.fillStyle = text;
    ctx.textAlign = 'center';
    ctx.fillText(box.label, box.x, box.y - 14);
    ctx.textAlign = 'left';
    return;
  }
  if (box.shape === 'diamond') {
    diamondPath(ctx, box);
    ctx.fill();
    ctx.stroke();
  } else {
    roundedRect(ctx, box.x - box.w / 2, box.y - box.h / 2, box.w, box.h, 7);
    ctx.fill();
    ctx.stroke();
  }
  ctx.font = `${status === 'active' ? '600 ' : ''}12px ${FONT}`;
  ctx.fillStyle = text;
  ctx.textAlign = 'center';
  ctx.fillText(fitText(ctx, box.label, box.w - 10), box.x, box.y + 4);
  ctx.textAlign = 'left';
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  roundedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(title, x + 12, y + 18);
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

  let current: ExampleOptions = { isRefund: true, notesConcat: false, fanout: 0 };
  let events = runReplay(current);
  let stepIndex = 0;
  let elapsed = 0;

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = 32;
    ctx.fillStyle = INK;
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText('一步回放：节点执行 → reducer 合并 → 边选择下一步', pad, pad + 2);
    ctx.font = `11.5px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `notes 通道 reducer：${
        current.notesConcat ? '追加（concat）' : '覆盖（last-value，默认）'
      } · results 通道：追加（Send 汇合）`,
      pad,
      pad + 22,
    );

    const idx = Math.min(stepIndex, events.length - 1);
    const cur = events[idx];
    const state = cur.stateAfter;

    const layout = layoutGraph(width, height, current);
    const doneNodes = new Set(
      events.slice(0, idx).flatMap((event) => event.activeNodes),
    );
    const takenEdges = new Set(
      events
        .slice(0, idx + 1)
        .flatMap((event) => event.edges.map(([a, b]) => `${a}→${b}`)),
    );
    const currentEdges = new Set(cur.edges.map(([a, b]) => `${a}→${b}`));

    for (const [fromKey, toKey] of layout.edges) {
      const key = `${fromKey}→${toKey}`;
      if (currentEdges.has(key)) {
        drawEdge(ctx, layout, fromKey, toKey, BLUE, 2);
      } else if (takenEdges.has(key)) {
        drawEdge(ctx, layout, fromKey, toKey, BLUE_SOFT, 1.4);
      } else {
        drawEdge(ctx, layout, fromKey, toKey, PENDING, 1);
      }
    }
    for (const [key, box] of layout.nodes) {
      const status = cur.activeNodes.includes(key)
        ? 'active'
        : doneNodes.has(key)
          ? 'done'
          : 'pending';
      drawNode(ctx, box, status);
    }

    // 底部左：本步更新 + 合并后状态；底部右：超步日志
    const graphBottom = Math.max(78 + 96, height * 0.5);
    const panelTop = Math.max(graphBottom + 16, height * 0.55);
    const panelBottom = height - 34;
    const panelH = Math.max(48, panelBottom - panelTop);
    const stateW = Math.round((width - pad * 2) * 0.56);
    const logX = pad + stateW + 14;

    drawPanel(ctx, pad, panelTop, stateW, panelH, '状态（合并后）');
    let rowY = panelTop + 36;
    const rows: Array<[string, string, boolean]> = [
      ['question', state.question, cur.touched.includes('question')],
      ['intent', state.intent || '""', cur.touched.includes('intent')],
      [
        'notes',
        state.notes.length ? state.notes.join(' | ') : '[]',
        cur.touched.includes('notes'),
      ],
      [
        'results',
        state.results.length ? state.results.join(' | ') : '[]',
        cur.touched.includes('results'),
      ],
      ['answer', state.answer || '""', cur.touched.includes('answer')],
    ];
    ctx.font = `11px ${MONO}`;
    for (const [key, value, touched] of rows) {
      if (rowY > panelTop + panelH - 8) {
        break;
      }
      ctx.fillStyle = touched ? BLUE : MUTED;
      ctx.fillText(`${touched ? '← ' : '  '}${key}`, pad + 12, rowY);
      ctx.fillStyle = touched ? BLUE : INK;
      ctx.fillText(
        fitText(ctx, value, stateW - 24 - (key.length + 3) * 6),
        pad + 24 + (key.length + 3) * 6,
        rowY,
      );
      rowY += 16;
    }

    const logW = width - pad - logX;
    drawPanel(ctx, logX, panelTop, logW, panelH, '超步日志');
    ctx.font = `11px ${MONO}`;
    const rowH = 16;
    const fit = Math.max(1, Math.floor((panelH - 30) / rowH));
    const start = Math.max(0, Math.min(idx - fit + 1, events.length - fit));
    for (let i = start; i < Math.min(events.length, start + fit); i += 1) {
      const event = events[i];
      const isCurrent = i === idx;
      const isDone = i < idx;
      ctx.fillStyle = isCurrent ? BLUE : isDone ? INK : MUTED;
      ctx.fillText(
        fitText(ctx, `${event.tag} ${event.label}`, logW - 24),
        logX + 12,
        panelTop + 36 + (i - start) * rowH,
      );
    }

    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      '切换任一输入会重置回放；回放自动按超步推进',
      pad,
      height - 14,
    );

    emit({
      stepLabel: cur.tag,
      nodes:
        cur.activeNodes.filter((name) => !name.startsWith('__')).join(' ∥ ') ||
        'END',
      notesLabel: `${state.notes.length} 条`,
      resultsLabel: `${state.results.length} 条`,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  const loop = createRenderLoop(canvas, (delta: number) => {
    elapsed += delta;
    if (elapsed >= STEP_SECONDS) {
      elapsed = 0;
      // 末态多停留一拍再循环
      stepIndex = (stepIndex + 1) % (events.length + 1);
    }
    draw();
  });

  return {
    update(options) {
      current = options;
      events = runReplay(current);
      stepIndex = 0;
      elapsed = 0;
      draw();
    },
    dispose() {
      loop.dispose();
      resizeObserver.disconnect();
    },
  };
}
