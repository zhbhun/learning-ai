/**
 * 范例介绍：部署形态选择器——把「持久化需求 / 运维能力 / 数据驻留」三个
 * 输入确定性映射到推荐部署形态，并给出该形态的得到与付出。控件只有三个
 * 单选；切换输入只改变高亮的决策路径与结果卡片，映射规则固定不变——这
 * 正是选型的语义：输入是约束，形态是结论。
 * 输入：persistence（none=无状态 / stateful=有状态：thread 记忆与后台任务）、
 * ops（managed=全托管 / self=自管容器）、residency（cloud=可上云 /
 * own=数据必须留在自有基础设施）。
 * 预期结果：无状态 → 自托管 Node 服务（JS 框架，不需要 Agent Server）；
 * 有状态 + 全托管 + 可上云 → LangSmith Cloud；有状态 + 全托管 + 自有 →
 * Hybrid（控制面托管、数据面在自有 VPC）；有状态 + 自管容器 → Standalone
 * （Docker/Compose/K8s，自备 Postgres 与 Redis）。映射依据官方部署形态
 * 文档（Cloud 需 Plus 及以上；Standalone 自带 license；JS 框架自托管走
 * Agent Streaming Protocol），不依赖 @langchain/*。
 * 阅读主线：先看 FORMS 常量（四种形态的单一真源），再看 recommendForm()
 * 的三层判断，最后看 draw() 如何呈现决策树与结果卡片。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PersistenceNeed = 'none' | 'stateful';
export type OpsCapability = 'managed' | 'self';
export type DataResidency = 'cloud' | 'own';

export interface ExampleArgs {
  persistence: PersistenceNeed;
  ops: OpsCapability;
  residency: DataResidency;
}

export type DeploymentFormId =
  | 'js-framework'
  | 'langsmith-cloud'
  | 'hybrid'
  | 'standalone';

/** 四种推荐形态：字段对齐官方部署形态文档的职责划分与前提。 */
interface DeploymentForm {
  id: DeploymentFormId;
  name: string;
  tagline: string;
  /** 选择它得到什么。 */
  gains: string;
  /** 选择它付出什么。 */
  costs: string;
}

const FORMS: Record<DeploymentFormId, DeploymentForm> = {
  'js-framework': {
    id: 'js-framework',
    name: '自托管 Node 服务',
    tagline: 'JS 框架 + Agent Streaming Protocol',
    gains:
      '前后端一个部署单元（Next.js / SvelteKit / Nuxt / Workers / Deno）；无平台依赖与 license，单实例内存起步',
    costs:
      '没有 Agent Server 能力：thread 持久化要自己接 checkpointer，后台任务、crons、Studio、revisions 都要自建',
  },
  'langsmith-cloud': {
    id: 'langsmith-cloud',
    name: 'LangSmith Cloud',
    tagline: 'GitHub 一键部署，控制面 + 数据面 + 数据库全托管',
    gains:
      '持久化、任务队列、流式 API、crons、Studio、revisions 开箱即用，自动扩缩与升级',
    costs:
      '需要 Plus 及以上套餐；代码与数据运行在 LangChain 托管云（AWS / GCP）',
  },
  hybrid: {
    id: 'hybrid',
    name: 'LangSmith Hybrid',
    tagline: '控制面托管，Agent Server 在你的 VPC',
    gains: '数据不出自有基础设施；部署管理（控制面 UI）仍由 LangChain 托管',
    costs: '数据面（Agent Server、Postgres、Redis）自己运维，需要相应商业计划',
  },
  standalone: {
    id: 'standalone',
    name: 'Agent Server 自托管（Standalone）',
    tagline: 'Docker / Compose / K8s，无控制面',
    gains:
      '只有 agent 运行时，自托管里最轻；traces 上报 LangSmith 可选；对外仍是同一套 Agent Server API',
    costs:
      '自备 PostgreSQL + Redis 与 license key；K8s + Helm 是官方定期测试的生产路径，扩缩容自己扛',
  },
};

/** 三层判断：要不要 Agent Server 的能力 → 数据放哪 → 谁来运维。 */
export function recommendForm(args: ExampleArgs): DeploymentFormId {
  if (args.persistence === 'none') {
    return 'js-framework';
  }
  if (args.ops === 'managed') {
    return args.residency === 'cloud' ? 'langsmith-cloud' : 'hybrid';
  }
  return 'standalone';
}

export function formFor(args: ExampleArgs): DeploymentForm {
  return FORMS[recommendForm(args)];
}

const INPUT_LABELS: Record<PersistenceNeed | OpsCapability | DataResidency, string> = {
  none: '无状态',
  stateful: '有状态',
  managed: '全托管',
  self: '自管容器',
  cloud: '可上云',
  own: '自有基础设施',
};

interface TreeNode {
  id: string;
  label: string;
  row: number;
  indent: number;
  kind: 'question' | 'leaf';
}

const NODES: TreeNode[] = [
  { id: 'q1', label: '① 持久化 / 后台任务？', row: 0, indent: 0, kind: 'question' },
  { id: 'leaf-js', label: '自托管 Node 服务', row: 1, indent: 1, kind: 'leaf' },
  { id: 'q2', label: '② 运维能力？', row: 2, indent: 1, kind: 'question' },
  { id: 'q3', label: '③ 数据驻留？', row: 3, indent: 2, kind: 'question' },
  { id: 'leaf-cloud', label: 'LangSmith Cloud', row: 4, indent: 3, kind: 'leaf' },
  { id: 'leaf-hybrid', label: 'Hybrid', row: 5, indent: 3, kind: 'leaf' },
  { id: 'leaf-standalone', label: 'Standalone（Docker）', row: 6, indent: 2, kind: 'leaf' },
];

interface TreeEdge {
  from: string;
  to: string;
  label: string;
}

const EDGES: TreeEdge[] = [
  { from: 'q1', to: 'leaf-js', label: '不需要' },
  { from: 'q1', to: 'q2', label: '需要' },
  { from: 'q2', to: 'q3', label: '全托管' },
  { from: 'q3', to: 'leaf-cloud', label: '可上云' },
  { from: 'q3', to: 'leaf-hybrid', label: '自有' },
  { from: 'q2', to: 'leaf-standalone', label: '自管容器' },
];

/** 当前输入在决策树上点亮的路径：三个问题按序作答后到达的叶子。 */
function activeNodeIds(formId: DeploymentFormId): Set<string> {
  const active = new Set<string>(['q1']);
  if (formId === 'js-framework') {
    active.add('leaf-js');
    return active;
  }
  active.add('q2');
  if (formId === 'standalone') {
    active.add('leaf-standalone');
    return active;
  }
  active.add('q3');
  active.add(formId === 'langsmith-cloud' ? 'leaf-cloud' : 'leaf-hybrid');
  return active;
}

function activeEdgeIds(active: Set<string>): Set<string> {
  return new Set(
    EDGES.filter(
      (edge) => active.has(edge.from) && active.has(edge.to),
    ).map((edge) => `${edge.from}->${edge.to}`),
  );
}

export interface ExampleSnapshot {
  persistence: PersistenceNeed;
  ops: OpsCapability;
  residency: DataResidency;
  formId: DeploymentFormId;
  formName: string;
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
  border: '#dbe3f0',
  question: '#4f7cff',
  questionBg: '#eef3ff',
  leafActive: '#172033',
  leafIdle: '#8494a8',
  gain: '#166534',
  cost: '#b45309',
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
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    if (ctx.measureText(line + char).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line += char;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  args: ExampleArgs,
): void {
  ctx.clearRect(0, 0, width, height);
  const pad = 30;
  const form = formFor(args);
  const active = activeNodeIds(form.id);
  const activeEdges = activeEdgeIds(active);

  ctx.fillStyle = COLOR.title;
  ctx.font = `600 15.5px ${SANS}`;
  ctx.fillText('部署形态选择器：三个输入约束，一个推荐形态', pad, 34);

  ctx.fillStyle = COLOR.sub;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText(
    `输入：${INPUT_LABELS[args.persistence]} · ${INPUT_LABELS[args.ops]} · ${INPUT_LABELS[args.residency]}`,
    pad,
    56,
  );

  // 决策树（左侧）：当前输入点亮的路径，其余分支淡化。
  const treeTop = 92;
  const treeBottom = height - 86;
  const rowHeight = (treeBottom - treeTop) / NODES.length;
  const nodeHeight = Math.min(26, rowHeight - 8);
  const indentStep = 52;
  const nodeX = (indent: number): number => pad + 10 + indent * indentStep;
  const nodeY = (row: number): number => treeTop + row * rowHeight;
  const nodeById = new Map<string, TreeNode>(
    NODES.map((node) => [node.id, node] as [string, TreeNode]),
  );
  const leafWidth = 150;
  const questionWidth = 156;

  // 先画边（在节点下层）：父节点底部中心 → 子节点左缘的折线 + 分支条件。
  for (const edge of EDGES) {
    const parent = nodeById.get(edge.from);
    const child = nodeById.get(edge.to);
    if (!parent || !child) {
      continue;
    }
    const isActive = activeEdges.has(`${edge.from}->${edge.to}`);
    ctx.globalAlpha = isActive ? 1 : 0.22;
    ctx.strokeStyle = isActive ? COLOR.question : COLOR.ghost;
    ctx.lineWidth = isActive ? 1.8 : 1;
    const fromX = nodeX(parent.indent) + 12;
    const fromY = nodeY(parent.row) + nodeHeight;
    const toX = nodeX(child.indent) - 6;
    const toY = nodeY(child.row) + nodeHeight / 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(fromX, toY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.fillStyle = isActive ? COLOR.text : COLOR.ghost;
    ctx.font = `10px ${SANS}`;
    ctx.fillText(edge.label, fromX + 6, toY - 4);
    ctx.globalAlpha = 1;
  }

  for (const node of NODES) {
    const isActive = active.has(node.id);
    ctx.globalAlpha = isActive ? 1 : 0.25;
    const x = nodeX(node.indent);
    const y = nodeY(node.row);
    const w = node.kind === 'leaf' ? leafWidth : questionWidth;

    if (node.kind === 'question') {
      ctx.fillStyle = COLOR.questionBg;
      roundedRect(ctx, x, y, w, nodeHeight, 5);
      ctx.fill();
      ctx.strokeStyle = COLOR.question;
      ctx.lineWidth = isActive ? 1.8 : 1;
      ctx.stroke();
      ctx.fillStyle = COLOR.text;
      ctx.font = `600 10.5px ${SANS}`;
      ctx.fillText(node.label, x + 9, y + nodeHeight / 2 + 3.5);
    } else {
      ctx.fillStyle = isActive ? COLOR.leafActive : COLOR.leafIdle;
      roundedRect(ctx, x, y, w, nodeHeight, 5);
      ctx.fill();
      if (isActive) {
        ctx.strokeStyle = COLOR.question;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 10.5px ${SANS}`;
      ctx.fillText(node.label, x + 9, y + nodeHeight / 2 + 3.5);
    }
    ctx.globalAlpha = 1;
  }

  // 结果卡片（右侧）：推荐形态的名称、定位、得到与付出。
  const cardX = Math.max(width * 0.46, pad + 10 + 3 * indentStep + leafWidth + 24);
  const cardW = width - pad - cardX;
  const cardY = 92;
  const cardH = height - 86 - cardY;
  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, cardX, cardY, cardW, cardH, 8);
  ctx.fill();
  ctx.strokeStyle = COLOR.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  let cursorY = cardY + 30;
  ctx.fillStyle = COLOR.title;
  ctx.font = `600 14.5px ${SANS}`;
  ctx.fillText(form.name, cardX + 16, cursorY);
  cursorY += 19;
  ctx.fillStyle = COLOR.sub;
  ctx.font = `10px ${MONO}`;
  for (const line of wrapText(ctx, form.tagline, cardW - 32)) {
    ctx.fillText(line, cardX + 16, cursorY);
    cursorY += 14;
  }

  const section = (title: string, body: string, color: string): void => {
    cursorY += 12;
    ctx.fillStyle = color;
    ctx.font = `600 10.5px ${SANS}`;
    ctx.fillText(title, cardX + 16, cursorY);
    cursorY += 15;
    ctx.fillStyle = COLOR.text;
    ctx.font = `10.5px ${SANS}`;
    for (const line of wrapText(ctx, body, cardW - 32)) {
      ctx.fillText(line, cardX + 16, cursorY);
      cursorY += 14;
    }
  };
  // 窄舞台上行数增多，用裁剪保证文字只出现在卡片内。
  ctx.save();
  ctx.beginPath();
  ctx.rect(cardX + 1, cardY + 1, cardW - 2, cardH - 2);
  ctx.clip();
  section('得到', form.gains, COLOR.gain);
  section('付出', form.costs, COLOR.cost);
  ctx.restore();

  // 底部结论：与正文断言对应的可观察证据。
  ctx.fillStyle = COLOR.sub;
  ctx.font = `11px ${SANS}`;
  ctx.fillText(
    `当前输入 → ${form.name}：${INPUT_LABELS[args.persistence]} + ${INPUT_LABELS[args.ops]} + ${INPUT_LABELS[args.residency]}`,
    pad,
    height - 42,
  );
  ctx.fillStyle = COLOR.ghost;
  ctx.font = `10px ${SANS}`;
  ctx.fillText(
    '官方还有第五种形态：self-hosted with control plane（控制面也自管，需 Enterprise）——需要控制面 UI 时从 Standalone 升级',
    pad,
    height - 22,
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

  let current: ExampleArgs = {
    persistence: 'stateful',
    ops: 'managed',
    residency: 'cloud',
  };

  function drawCurrent(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    draw(drawingContext, width, height, current);
    const form = formFor(current);
    emit({
      persistence: current.persistence,
      ops: current.ops,
      residency: current.residency,
      formId: form.id,
      formName: form.name,
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
