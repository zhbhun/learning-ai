/**
 * 范例介绍：API 选型判断器。输入四个判断问题——下一步由谁决定、结构是否
 * 复杂（并行 / 汇合 / 显式共享状态）、是否优先嵌入既有过程式代码、是否需要
 * 人审中断——按确定性规则落到 createAgent / Graph API / Functional API
 * 之一的推荐，并画出判断输入、推荐理由与该线的形态示意（循环 / 分支图 / 直线）。
 * 输入或前置状态：Controls 提供的四个判断开关；纯本地 TS 决策演示，
 * 不依赖 @langchain/*，不发起模型调用。
 * 主要操作：切换任一开关。
 * 预期结果：推荐卡片、理由与形态示意同步变化；「需要人审中断」不改变
 * 推荐，只追加落地提示。阅读主线：recommend() 的判断顺序。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleOptions {
  modelDecides: boolean;
  complexStructure: boolean;
  embedExisting: boolean;
  needReview: boolean;
}

export type ExamplePick = 'createAgent' | 'Graph API' | 'Functional API';

export interface ExampleRecommendation {
  pick: ExamplePick;
  shape: 'loop' | 'graph' | 'linear';
  reasons: string[];
}

export interface ExampleSnapshot {
  pick: ExamplePick;
  shapeLabel: string;
  reviewNote: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const LINE = '#dbe3f0';
const FONT = 'ui-sans-serif, system-ui, sans-serif';

// 选型规则：判断顺序与正文「三条 API 线」一致——先分 agent / workflow，
// 再按结构复杂度分流；人审中断不参与分流，三条线都支持。
function recommend(options: ExampleOptions): ExampleRecommendation {
  if (options.modelDecides && options.complexStructure) {
    return {
      pick: 'Graph API',
      shape: 'graph',
      reasons: [
        '模型要决策，结构又超出标准循环：把 createAgent 当作图中节点',
        '并行 / 汇合与显式共享状态需要显式的节点和边',
        '复杂分支由此可可视化、可讨论',
      ],
    };
  }
  if (options.modelDecides) {
    return {
      pick: 'createAgent',
      shape: 'loop',
      reasons: [
        '模型决策 + 标准「调工具 → 回答」循环：harness 全托管',
        '工具执行、结果回填、循环终止都不用自己写',
        '三条线里最短的起点，不够用时再下沉',
      ],
    };
  }
  if (options.complexStructure) {
    return {
      pick: 'Graph API',
      shape: 'graph',
      reasons: [
        '路径可预先定义（workflow），但有并行 / 汇合或多决策点',
        '条件路由用 addConditionalEdges 显式声明',
        '显式图结构便于调试与团队协作',
      ],
    };
  }
  return {
    pick: 'Functional API',
    shape: 'linear',
    reasons: [
      '路径可预先定义，结构线性或只有少量分支',
      'entrypoint + task：if / else 就是控制流',
      options.embedExisting
        ? '嵌入既有过程式代码，对现有结构改动最小'
        : '简单分支不值得为显式图付出样板代码',
    ],
  };
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
  ctx.lineTo(
    x - size * Math.cos(angle - 0.45),
    y - size * Math.sin(angle - 0.45),
  );
  ctx.lineTo(
    x - size * Math.cos(angle + 0.45),
    y - size * Math.sin(angle + 0.45),
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  fillTriangle(ctx, x2, y2, Math.atan2(y2 - y1, x2 - x1), BLUE);
}

function drawCurveArrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  dashed = false,
) {
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 1.6;
  if (dashed) {
    ctx.setLineDash([4, 3]);
  }
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(cx, cy, x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
  fillTriangle(ctx, x2, y2, Math.atan2(y2 - cy, x2 - cx), BLUE);
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fillStyle = BLUE;
  ctx.fill();
}

// 形态示意：三种线各自的结构直觉——循环 / 分支图 / 直线。
function drawShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  shape: 'loop' | 'graph' | 'linear',
) {
  const midY = y + h / 2;
  const left = x + 12;
  const right = x + w - 12;

  if (shape === 'linear') {
    drawDot(ctx, left, midY);
    drawDot(ctx, right, midY);
    drawArrow(ctx, left + 7, midY, right - 9, midY);
    return;
  }
  if (shape === 'graph') {
    const midX = (left + right) / 2;
    const spread = Math.min(24, h / 2 - 10);
    drawDot(ctx, left, midY);
    drawDot(ctx, midX, midY - spread);
    drawDot(ctx, midX, midY + spread);
    drawDot(ctx, right, midY);
    drawArrow(ctx, left + 7, midY, midX - 8, midY - spread);
    drawArrow(ctx, left + 7, midY, midX - 8, midY + spread);
    drawArrow(ctx, midX + 7, midY - spread, right - 9, midY - 2);
    drawArrow(ctx, midX + 7, midY + spread, right - 9, midY + 2);
    return;
  }
  // loop：两个节点之间的循环——实线去、虚线回
  const lift = Math.max(10, Math.min(18, h / 2 - 8));
  drawDot(ctx, left, midY);
  drawDot(ctx, right, midY);
  drawCurveArrow(
    ctx,
    left + 6,
    midY - 4,
    (left + right) / 2,
    midY - lift * 2,
    right - 6,
    midY - 4,
  );
  drawCurveArrow(
    ctx,
    right - 6,
    midY + 4,
    (left + right) / 2,
    midY + lift * 2,
    left + 6,
    midY + 4,
    true,
  );
}

function drawQuestionCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: boolean,
) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = value ? BLUE : LINE;
  ctx.lineWidth = value ? 1.6 : 1;
  roundedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = INK;
  ctx.fillText(fitText(ctx, label, w - 58), x + 14, y + h / 2 + 4.5);

  ctx.font = `700 13px ${FONT}`;
  ctx.fillStyle = value ? BLUE : MUTED;
  ctx.fillText(value ? '是' : '否', x + w - 30, y + h / 2 + 4.5);
}

function drawRecommendation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rec: ExampleRecommendation,
  needReview: boolean,
) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 1.6;
  roundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  const padIn = 16;
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = MUTED;
  ctx.fillText('推荐入口', x + padIn, y + 24);

  ctx.font = `700 21px ${FONT}`;
  ctx.fillStyle = BLUE;
  ctx.fillText(rec.pick, x + padIn, y + 52);

  // 空间足够时画形态示意，空间不足时跳过、优先保住理由行
  const showShape = h >= 200;
  const shapeHeight = showShape ? Math.max(36, Math.min(56, h * 0.18)) : 0;
  if (showShape) {
    drawShape(ctx, x + padIn, y + 62, w - padIn * 2, shapeHeight, rec.shape);
  }

  const bottomLimit = y + h - (needReview ? 32 : 12);
  let cursor = y + (showShape ? 62 + shapeHeight + 20 : 74);
  ctx.font = `12px ${FONT}`;
  for (const reason of rec.reasons) {
    if (cursor > bottomLimit) {
      break;
    }
    ctx.beginPath();
    ctx.arc(x + padIn + 3.5, cursor - 4, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = BLUE;
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.fillText(
      fitText(ctx, reason, w - padIn * 2 - 18),
      x + padIn + 14,
      cursor,
    );
    cursor += 19;
  }

  if (needReview) {
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(
        ctx,
        '人审中断：三条线都支持 interrupt，落地需 checkpointer',
        w - padIn * 2,
      ),
      x + padIn,
      y + h - 12,
    );
  }
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

  let current: ExampleOptions = {
    modelDecides: true,
    complexStructure: false,
    embedExisting: false,
    needReview: false,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = 36;
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('四个判断 → 一条推荐', pad, pad + 6);

    const questions: Array<[string, boolean]> = [
      ['下一步由模型决定', current.modelDecides],
      ['并行 / 汇合 / 显式状态', current.complexStructure],
      ['优先嵌入既有代码', current.embedExisting],
      ['需要人审中断', current.needReview],
    ];

    const top = pad + 32;
    const cardsBottom = height - 52;
    const leftWidth = Math.round((width - pad * 2 - 32) * 0.42);
    const gap = 10;
    const cardHeight = Math.max(30, Math.floor((cardsBottom - top - gap * 3) / 4));

    questions.forEach(([label, value], index) => {
      drawQuestionCard(
        ctx,
        pad,
        top + index * (cardHeight + gap),
        leftWidth,
        cardHeight,
        label,
        value,
      );
    });

    const rec = recommend(current);
    drawRecommendation(
      ctx,
      pad + leftWidth + 32,
      top,
      width - pad * 2 - leftWidth - 32,
      cardsBottom - top,
      rec,
      current.needReview,
    );

    ctx.fillStyle = MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(
      fitText(
        ctx,
        '判断顺序与正文一致：先分 agent / workflow，再按结构复杂度分流',
        width - pad * 2,
      ),
      pad,
      height - 24,
    );

    emit({
      pick: rec.pick,
      shapeLabel:
        rec.shape === 'loop' ? '循环' : rec.shape === 'graph' ? '分支图' : '直线',
      reviewNote: current.needReview ? '支持（需 checkpointer）' : '未要求',
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
