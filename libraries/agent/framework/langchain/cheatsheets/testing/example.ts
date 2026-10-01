/**
 * 范例介绍：确定性演示「被测对象 × 确定性要求 → 测试金字塔哪一层」的映射。
 * 控件只有一个：被测对象（工具函数 / Agent 编排 / 最终回答）；切换对象只
 * 改变高亮层级与右侧配置卡，不改变金字塔本身——映射规则是问题，金字塔是答案。
 * 输入：subject（tool=工具函数 / loop=Agent 编排 / answer=最终回答）。
 * 预期结果：工具函数 → 底层「确定性单元」（模型= fakeModel()，断言=精确相等）；
 * Agent 编排 → 中层「固定输入集成」（工具真实、模型仍为假，断言=结构/序列/状态）；
 * 最终回答 → 顶层「真实模型冒烟」（真实轻量模型，断言=结构断言而非逐字）。
 * 各层的模型 / 工具 / 断言 / 速度 / 确定性取自正文金字塔一节的对照表，纯静态
 * 演示，不依赖 @langchain/*。
 * 阅读主线：先看 LAYERS 与 SUBJECTS 两个单一真源，再看 layerFor() 的映射，
 * 最后看 draw() 如何呈现金字塔与配置卡。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TestSubject = 'tool' | 'loop' | 'answer';

export interface ExampleArgs {
  subject: TestSubject;
}

/** 金字塔层级：从下（最宽、用例最多）到上（最窄、用例最少）。 */
type LayerId = 'unit' | 'integration' | 'smoke';

interface Layer {
  id: LayerId;
  name: string;
  /** 用例占比，写进金字塔层内。 */
  share: string;
  model: string;
  tools: string;
  assert: string;
  speed: string;
  determinism: string;
  cost: string;
}

const LAYERS: Layer[] = [
  {
    id: 'smoke',
    name: '真实模型冒烟',
    share: '极少用例',
    model: '真实轻量模型 + maxTokens',
    tools: '真实工具',
    assert: '结构断言 / 宽松正则 / 结构化字段',
    speed: '秒级（真实网络）',
    determinism: '非确定 → 只断言结构',
    cost: '需要 key · 按 token 计费',
  },
  {
    id: 'integration',
    name: '固定输入集成',
    share: '少量用例',
    model: 'fakeModel() 排队响应',
    tools: '真实工具，验证完整编排',
    assert: '消息结构 / 调用序列 / 最终状态',
    speed: '10–100 ms',
    determinism: '完全确定',
    cost: '无需 key · 免费',
  },
  {
    id: 'unit',
    name: '确定性单元',
    share: '多数用例',
    model: 'fakeModel() 排队响应',
    tools: '真实纯函数工具，直接调用',
    assert: 'toBe / toEqual 精确相等',
    speed: '毫秒级',
    determinism: '完全确定',
    cost: '无需 key · 免费',
  },
];

interface Subject {
  id: TestSubject;
  label: string;
  what: string;
  layer: LayerId;
  why: string;
}

const SUBJECTS: Subject[] = [
  {
    id: 'tool',
    label: '工具函数',
    what: 'get_weather 的函数体（纯函数）',
    layer: 'unit',
    why: '不经过模型，输出只由输入决定 → 放最底层，精确断言',
  },
  {
    id: 'loop',
    label: 'Agent 编排',
    what: '模型 → 工具 → 模型的循环与状态流转',
    layer: 'integration',
    why: '编排要真跑 agent / 图，但模型输出可固定 → 固定输入的集成层',
  },
  {
    id: 'answer',
    label: '最终回答',
    what: '真实模型生成的用户可见回答',
    layer: 'smoke',
    why: '被测对象就是真实模型行为 → 只能放顶层，断言结构',
  },
];

/** 映射规则本体：被测对象确定层级。 */
export function layerFor(subject: TestSubject): Layer {
  const target = SUBJECTS.find((entry) => entry.id === subject);
  if (!target) {
    throw new Error(`未知被测对象：${subject}`);
  }
  const layer = LAYERS.find((entry) => entry.id === target.layer);
  if (!layer) {
    throw new Error(`未知层级：${target.layer}`);
  }
  return layer;
}

function subjectFor(subject: TestSubject): Subject {
  const target = SUBJECTS.find((entry) => entry.id === subject);
  if (!target) {
    throw new Error(`未知被测对象：${subject}`);
  }
  return target;
}

export interface ExampleSnapshot {
  subject: string;
  layerName: string;
  model: string;
  assert: string;
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
  unit: '#4f7cff',
  integration: '#7c6bb0',
  smoke: '#b45309',
  highlight: '#0f172a',
};

function layerColor(id: LayerId): string {
  if (id === 'unit') {
    return COLOR.unit;
  }
  if (id === 'integration') {
    return COLOR.integration;
  }
  return COLOR.smoke;
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

function trapezoid(
  ctx: CanvasRenderingContext2D,
  topWidth: number,
  bottomWidth: number,
  y: number,
  height: number,
  centerX: number,
): void {
  ctx.beginPath();
  ctx.moveTo(centerX - topWidth / 2, y);
  ctx.lineTo(centerX + topWidth / 2, y);
  ctx.lineTo(centerX + bottomWidth / 2, y + height);
  ctx.lineTo(centerX - bottomWidth / 2, y + height);
  ctx.closePath();
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  args: ExampleArgs,
): void {
  ctx.clearRect(0, 0, width, height);
  const subject = subjectFor(args.subject);
  const layer = layerFor(args.subject);
  const pad = 36;

  ctx.fillStyle = COLOR.title;
  ctx.font = `600 15.5px ${SANS}`;
  ctx.fillText('被测对象确定金字塔层级', pad, 36);

  ctx.fillStyle = COLOR.sub;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(
    `被测对象：${subject.label}——${subject.what}`,
    pad,
    58,
  );

  // 左侧金字塔：三层梯形，从上（smoke，最窄）到下（unit，最宽）。
  const chartTop = 80;
  const chartBottom = height - 64;
  const pyramidCenterX = pad + (width - pad * 2) * 0.3;
  const layerHeight = (chartBottom - chartTop) / LAYERS.length;
  const maxWidth = (width - pad * 2) * 0.52;
  const minWidth = maxWidth * 0.42;

  LAYERS.forEach((entry, index) => {
    const y = chartTop + index * layerHeight;
    const topWidth = minWidth + (maxWidth - minWidth) * (index / LAYERS.length);
    const bottomWidth =
      minWidth + (maxWidth - minWidth) * ((index + 1) / LAYERS.length);
    const isActive = entry.id === layer.id;

    ctx.globalAlpha = isActive ? 1 : 0.22;
    ctx.fillStyle = layerColor(entry.id);
    trapezoid(ctx, topWidth, bottomWidth, y, layerHeight, pyramidCenterX);
    ctx.fill();
    if (isActive) {
      ctx.strokeStyle = COLOR.highlight;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.globalAlpha = isActive ? 1 : 0.5;
    ctx.fillStyle = isActive ? '#ffffff' : COLOR.text;
    ctx.font = `600 12px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(entry.name, pyramidCenterX, y + layerHeight / 2 - 4);
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(entry.share, pyramidCenterX, y + layerHeight / 2 + 13);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  });

  // 右侧配置卡：当前层的六行输入输出对照。
  const cardX = pad + (width - pad * 2) * 0.58;
  const cardW = width - pad - cardX;
  const rows: Array<[string, string]> = [
    ['模型', layer.model],
    ['工具', layer.tools],
    ['断言', layer.assert],
    ['速度', layer.speed],
    ['确定性', layer.determinism],
    ['key 与成本', layer.cost],
  ];

  roundedRect(ctx, cardX, chartTop, cardW, chartBottom - chartTop, 8);
  ctx.fillStyle = 'rgb(255 255 255 / 90%)';
  ctx.fill();
  ctx.strokeStyle = layerColor(layer.id);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = COLOR.title;
  ctx.font = `600 12px ${SANS}`;
  ctx.fillText(`${layer.name} 的输入输出`, cardX + 14, chartTop + 24);

  const rowHeight = (chartBottom - chartTop - 40) / rows.length;
  rows.forEach(([label, value], index) => {
    const rowY = chartTop + 44 + index * rowHeight;
    ctx.fillStyle = COLOR.ghost;
    ctx.font = `10.5px ${MONO}`;
    ctx.fillText(label, cardX + 14, rowY);
    ctx.fillStyle = COLOR.text;
    ctx.font = `11.5px ${SANS}`;
    ctx.fillText(fitText(ctx, value, cardW - 28), cardX + 86, rowY);
  });

  // 底部：映射结论，与正文断言一一对应。
  ctx.fillStyle = COLOR.sub;
  ctx.font = `11.5px ${SANS}`;
  ctx.fillText(
    fitText(ctx, subject.why, width - pad * 2),
    pad,
    height - 38,
  );
  ctx.fillStyle = COLOR.ghost;
  ctx.font = `10.5px ${SANS}`;
  ctx.fillText(
    fitText(
      ctx,
      '读法：被测对象越靠近确定性逻辑越往下放；只有「真实模型的行为」本身是被测对象时才进顶层',
      width - pad * 2,
    ),
    pad,
    height - 18,
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

  let current: ExampleArgs = { subject: 'tool' };

  function drawCurrent(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    draw(drawingContext, width, height, current);
    const layer = layerFor(current.subject);
    const subject = subjectFor(current.subject);
    emit({
      subject: subject.label,
      layerName: layer.name,
      model: layer.model,
      assert: layer.assert,
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
