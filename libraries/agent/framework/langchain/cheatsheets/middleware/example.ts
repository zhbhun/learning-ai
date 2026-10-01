/**
 * 范例介绍：确定性模拟 `middleware: [outer, inner]` 一次 invoke 的完整时序——
 * beforeAgent/beforeModel 按数组正序在洋葱之外执行，wrapModelCall 逐层进入
 * （第一个中间件包住其余全部）、抵达模型后原路穿出，afterModel/afterAgent
 * 按数组反序执行。切换「改写位置」可观察：inner 在进入段改写 request 只影响
 * 更内层与模型，在返回段改写 AIMessage 只影响更外层。
 * 输入：rewrite（改写位置：不改写 / inner 改写请求 / inner 改写响应）与
 * step（回放进度，控制时序走到第几步）。
 * 预期结果：切换改写位置对比「模型收到」「外层收到」的差异；拖动回放进度
 * 可见调用链逐层进入再逐层穿出，after 钩子反序收尾。
 * 不依赖 @langchain/*：钩子名、执行顺序与改写可见性对齐 langchain 1.x 官方
 * 文档（custom middleware 页），并已在本地 node_modules 类型定义中核对。
 * 阅读主线：先看 STEPS 时序常量与 REWRITE_LABELS，再看 draw 如何分区绘制
 * 洋葱与日志。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type RewriteKey = 'none' | 'request' | 'response';

export interface ExampleOptions {
  rewrite: RewriteKey;
  step: number;
}

export interface ExampleSnapshot {
  stepLabel: string;
  phaseLabel: string;
  directionLabel: string;
  modelSees: string;
  outerSees: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

type Actor = 'outer' | 'inner' | 'model';

/** 洋葱层级：0 = 洋葱之外（节点式钩子），1 = outer 环，2 = inner 环，3 = 核心 */
type OnionLayer = 0 | 1 | 2 | 3;

interface ReplayStep {
  /** 钩子名；第 7 步是模型调用本身 */
  hook: string;
  /** 执行者 */
  actor: Actor;
  /** 当前步骤处在洋葱的哪一层 */
  layer: OnionLayer;
  /** 传播方向：in = 向内进入，out = 向外穿出，none = 不在洋葱内 */
  direction: 'in' | 'out' | 'none';
}

const ACTOR_COLORS: Record<Actor, string> = {
  outer: '#2563eb',
  inner: '#0d9488',
  model: '#b45309',
};

const REWRITE_LABELS: Record<RewriteKey, string> = {
  none: '不改写',
  request: 'inner 改写请求',
  response: 'inner 改写响应',
};

// middleware: [outer, inner]（无工具回合）一次调用的 13 步时序：
// 1-2 beforeAgent 正序 → 3-4 beforeModel 正序 → 5-6 wrap 逐层进入 →
// 7 模型 → 8-9 wrap 原路穿出 → 10-11 afterModel 反序 → 12-13 afterAgent 反序
const STEPS: ReplayStep[] = [
  { hook: 'beforeAgent', actor: 'outer', layer: 0, direction: 'none' },
  { hook: 'beforeAgent', actor: 'inner', layer: 0, direction: 'none' },
  { hook: 'beforeModel', actor: 'outer', layer: 0, direction: 'none' },
  { hook: 'beforeModel', actor: 'inner', layer: 0, direction: 'none' },
  { hook: 'wrapModelCall', actor: 'outer', layer: 1, direction: 'in' },
  { hook: 'wrapModelCall', actor: 'inner', layer: 2, direction: 'in' },
  { hook: '模型调用', actor: 'model', layer: 3, direction: 'none' },
  { hook: 'wrapModelCall', actor: 'inner', layer: 2, direction: 'out' },
  { hook: 'wrapModelCall', actor: 'outer', layer: 1, direction: 'out' },
  { hook: 'afterModel', actor: 'inner', layer: 0, direction: 'none' },
  { hook: 'afterModel', actor: 'outer', layer: 0, direction: 'none' },
  { hook: 'afterAgent', actor: 'inner', layer: 0, direction: 'none' },
  { hook: 'afterAgent', actor: 'outer', layer: 0, direction: 'none' },
];

/** wrapToolCall 改写请求发生在第 6 步（inner 进入段），改写响应在第 8 步（inner 返回段） */
const REQUEST_REWRITE_STEP = 6;
const RESPONSE_REWRITE_STEP = 8;
const MODEL_STEP = 7;
const OUTER_RETURN_STEP = 9;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 超出可用宽度时截断加省略号，保证文字不溢出面板
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

function insetRect(rect: Rect, dx: number, dy: number): Rect {
  return {
    x: rect.x + dx,
    y: rect.y + dy,
    width: rect.width - dx * 2,
    height: rect.height - dy * 2,
  };
}

// 把 #rrggbb 转成半透明填充，用于高亮当前层
function tint(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawArrow(
  context: CanvasRenderingContext2D,
  x: number,
  centerY: number,
  length: number,
  outward: boolean,
): void {
  const startX = outward ? x + length : x;
  const endX = outward ? x : x + length;
  context.strokeStyle = '#475569';
  context.lineWidth = 1.6;
  context.beginPath();
  context.moveTo(startX, centerY);
  context.lineTo(endX, centerY);
  context.stroke();

  // 三角箭头：向外指向左侧，向内指向右侧
  const tipX = outward ? x : x + length;
  const sign = outward ? -1 : 1;
  context.fillStyle = '#475569';
  context.beginPath();
  context.moveTo(tipX, centerY);
  context.lineTo(tipX - sign * 6, centerY - 4);
  context.lineTo(tipX - sign * 6, centerY + 4);
  context.closePath();
  context.fill();
}

function drawOnion(
  context: CanvasRenderingContext2D,
  panel: Rect,
  current: ReplayStep,
  visibleStep: number,
  rewrite: RewriteKey,
  compact: boolean,
): void {
  // 面板标题与右侧当前阶段
  context.fillStyle = '#64748b';
  context.font = `600 ${compact ? 10.5 : 11.5}px ui-sans-serif, system-ui, sans-serif`;
  context.fillText('洋葱模型：wrap 嵌套', panel.x, panel.y + 13);

  const phaseText = `${current.hook} · ${current.actor}`;
  context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillStyle = ACTOR_COLORS[current.actor];
  context.fillText(
    clipText(context, phaseText, panel.width * 0.55),
    panel.x + panel.width - context.measureText(clipText(context, phaseText, panel.width * 0.55)).width,
    panel.y + 13,
  );

  const headerBottom = panel.y + 22;
  const showPayload = panel.height >= 170;
  const payloadHeight = showPayload ? 58 : 0;
  const ringsArea: Rect = {
    x: panel.x,
    y: headerBottom,
    width: panel.width,
    height: panel.y + panel.height - payloadHeight - headerBottom,
  };

  // 三层嵌套：outer 环 → inner 环 → model 核心
  const insetX = Math.max(36, Math.min(70, ringsArea.width * 0.14));
  const insetY = Math.max(20, Math.min(34, ringsArea.height * 0.18));
  const outerRing = ringsArea;
  const innerRing = insetRect(outerRing, insetX, insetY);
  const core = insetRect(innerRing, insetX, insetY);

  const rings: Array<{ rect: Rect; layer: OnionLayer; label: string; actor: Actor }> = [
    { rect: outerRing, layer: 1, label: 'middleware[0] · outer（日志）', actor: 'outer' },
    { rect: innerRing, layer: 2, label: 'middleware[1] · inner（提示词）', actor: 'inner' },
    { rect: core, layer: 3, label: 'model', actor: 'model' },
  ];

  rings.forEach(({ rect, layer, label, actor }) => {
    const active = current.layer === layer;
    context.fillStyle = active ? tint(ACTOR_COLORS[actor], 0.1) : '#ffffff';
    context.strokeStyle = active ? ACTOR_COLORS[actor] : '#cbd5e1';
    context.lineWidth = active ? 2.5 : 1;
    roundedRectPath(context, rect.x, rect.y, rect.width, rect.height, 8);
    context.fill();
    context.stroke();

    context.fillStyle = active ? ACTOR_COLORS[actor] : '#64748b';
    if (layer === 3) {
      // 核心居中标注：模型与它返回的 AIMessage
      context.font = `600 ${compact ? 10.5 : 12}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      const labelWidth = context.measureText(label).width;
      context.fillText(label, rect.x + (rect.width - labelWidth) / 2, rect.y + rect.height / 2 - 2);
      context.font = `${compact ? 9 : 10}px ui-sans-serif, system-ui, sans-serif`;
      const sub = '→ AIMessage';
      const subWidth = context.measureText(sub).width;
      context.fillStyle = active ? '#b45309' : '#94a3b8';
      context.fillText(sub, rect.x + (rect.width - subWidth) / 2, rect.y + rect.height / 2 + 12);
    } else {
      context.font = `600 ${compact ? 9.5 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.fillText(
        clipText(context, label, rect.width - 16),
        rect.x + 10,
        rect.y + (compact ? 13 : 15),
      );
    }
  });

  // 进入/穿出箭头画在当前层的左边缘
  if (current.direction !== 'none') {
    const activeRing = rings.find(({ layer }) => layer === current.layer);
    if (activeRing) {
      const centerY = activeRing.rect.y + activeRing.rect.height / 2 + 4;
      drawArrow(context, activeRing.rect.x + 10, centerY, 26, current.direction === 'out');
      context.fillStyle = ACTOR_COLORS[current.actor];
      context.font = `${compact ? 9 : 9.5}px ui-sans-serif, system-ui, sans-serif`;
      context.fillText(
        current.direction === 'in' ? '进入' : '穿出',
        activeRing.rect.x + 10,
        centerY - 8,
      );
    }
  }

  // 节点式钩子不在洋葱内：补一行说明
  if (current.layer === 0) {
    context.fillStyle = '#94a3b8';
    context.font = `${compact ? 9.5 : 10.5}px ui-sans-serif, system-ui, sans-serif`;
    const hint = current.hook.startsWith('before')
      ? '节点式钩子：洋葱之外，按数组正序执行'
      : '节点式钩子：洋葱之外，按数组反序执行';
    context.fillText(
      clipText(context, hint, ringsArea.width - 8),
      ringsArea.x + 4,
      ringsArea.y + ringsArea.height - 6,
    );
  }

  // 底部核心负载：直观展示「改写在哪一层生效」
  if (showPayload) {
    const stripY = panel.y + panel.height - payloadHeight + 6;
    context.fillStyle = '#64748b';
    context.font = `600 ${compact ? 9.5 : 10.5}px ui-sans-serif, system-ui, sans-serif`;
    context.fillText('核心负载（改写生效点在 inner 层）', panel.x, stripY + 10);

    context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    // 第一行：模型收到的 systemMessage（request 改写自第 6 步起生效）
    const requestBase = 'request.systemMessage → 模型: "You are a helpful assistant."';
    context.fillStyle = '#334155';
    context.fillText(clipText(context, requestBase, panel.width - 8), panel.x, stripY + 27);
    if (rewrite === 'request' && visibleStep >= REQUEST_REWRITE_STEP) {
      const baseWidth = Math.min(
        context.measureText(requestBase).width,
        panel.width - 8,
      );
      const suffix = ' + "Additional context."';
      context.fillStyle = '#7c3aed';
      context.fillText(
        clipText(context, suffix, panel.width - 8 - baseWidth - 4),
        panel.x + baseWidth + 4,
        stripY + 27,
      );
    }

    // 第二行：外层收到的 AIMessage（response 改写自第 8 步起生效）
    const responseBase = 'AIMessage → outer: "原始回答。"';
    context.fillStyle = '#334155';
    context.fillText(clipText(context, responseBase, panel.width - 8), panel.x, stripY + 44);
    if (rewrite === 'response' && visibleStep >= RESPONSE_REWRITE_STEP) {
      const baseWidth = Math.min(
        context.measureText(responseBase).width,
        panel.width - 8,
      );
      const suffix = ' → "改写后的回答。"';
      context.fillStyle = '#7c3aed';
      context.fillText(
        clipText(context, suffix, panel.width - 8 - baseWidth - 4),
        panel.x + baseWidth + 4,
        stripY + 44,
      );
    }
  }
}

function drawLog(
  context: CanvasRenderingContext2D,
  panel: Rect,
  visibleStep: number,
  rewrite: RewriteKey,
  compact: boolean,
): void {
  context.fillStyle = '#64748b';
  context.font = `600 ${compact ? 10.5 : 11.5}px ui-sans-serif, system-ui, sans-serif`;
  context.fillText('事件时序（回放）', panel.x, panel.y + 13);

  context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const counter = `${visibleStep}/${STEPS.length}`;
  context.fillStyle = '#94a3b8';
  context.fillText(
    counter,
    panel.x + panel.width - context.measureText(counter).width,
    panel.y + 13,
  );

  const listTop = panel.y + 24;
  const listHeight = panel.height - 24;

  // 可见行数 = 已回放的步骤数 + 其中的改写注释行
  const annotations: Array<{ stepIndex: number; text: string }> = [];
  if (rewrite === 'request') {
    annotations.push({
      stepIndex: REQUEST_REWRITE_STEP - 1,
      text: 'inner 进入时：request.systemMessage.concat("Additional context.")',
    });
  }
  if (rewrite === 'response') {
    annotations.push({
      stepIndex: RESPONSE_REWRITE_STEP - 1,
      text: 'inner 返回时：new AIMessage("改写后的回答。")',
    });
  }
  const visibleAnnotations = annotations.filter(
    (annotation) => annotation.stepIndex < visibleStep,
  ).length;
  const totalLines = visibleStep + visibleAnnotations;
  const lineheight = Math.max(
    compact ? 12 : 13,
    Math.min(19, Math.floor(listHeight / Math.max(1, totalLines))),
  );

  let cursorY = listTop;
  for (let index = 0; index < visibleStep; index += 1) {
    const step = STEPS[index];
    const isCurrent = index === visibleStep - 1;

    // 当前行整行高亮
    if (isCurrent) {
      context.fillStyle = tint(ACTOR_COLORS[step.actor], 0.08);
      roundedRectPath(context, panel.x - 4, cursorY - lineheight + 5, panel.width + 8, lineheight, 4);
      context.fill();
    }

    const textY = cursorY + 2;
    context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillStyle = '#94a3b8';
    context.fillText(String(index + 1).padStart(2, '0'), panel.x, textY);

    context.font = `600 ${compact ? 10 : 11}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillStyle = isCurrent ? ACTOR_COLORS[step.actor] : '#475569';
    const header = `${step.hook} · ${step.actor}`;
    context.fillText(
      clipText(context, header, panel.width - 26),
      panel.x + 24,
      textY,
    );
    cursorY += lineheight;

    // 对应步骤的改写注释：紫色缩进一行
    const annotation = annotations.find(
      (item) => item.stepIndex === index && index < visibleStep,
    );
    if (annotation) {
      context.font = `${compact ? 9 : 9.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.fillStyle = '#7c3aed';
      context.fillText(
        clipText(context, annotation.text, panel.width - 40),
        panel.x + 30,
        cursorY + 2,
      );
      cursorY += lineheight;
    }
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
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleOptions = { rewrite: 'none', step: STEPS.length };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const visibleStep = Math.max(1, Math.min(current.step, STEPS.length));
    const currentStep = STEPS[visibleStep - 1];
    const compact = width < 640 || height < 420;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        '中间件叠加：wrap 嵌套的进入与穿出',
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
        `确定性模拟 · middleware: [outer, inner] 的一次调用 · ${REWRITE_LABELS[current.rewrite]}`,
        width - 96,
      ),
      48,
      62,
    );

    // 底部留白给共享 readout 读数
    const top = 84;
    const bottom = height - 70;
    const twoColumn = width >= 640;
    let onionPanel: Rect;
    let logPanel: Rect;
    if (twoColumn) {
      const gap = 24;
      const onionWidth = Math.round((width - 80 - gap) * 0.46);
      onionPanel = { x: 40, y: top, width: onionWidth, height: bottom - top };
      logPanel = {
        x: 40 + onionWidth + gap,
        y: top,
        width: width - 80 - onionWidth - gap,
        height: bottom - top,
      };
    } else {
      const onionHeight = Math.min(200, Math.round((bottom - top) * 0.42));
      onionPanel = { x: 40, y: top, width: width - 80, height: onionHeight };
      logPanel = {
        x: 40,
        y: top + onionHeight + 14,
        width: width - 80,
        height: bottom - (top + onionHeight + 14),
      };
    }

    drawOnion(
      drawingContext,
      onionPanel,
      currentStep,
      visibleStep,
      current.rewrite,
      compact,
    );
    drawLog(drawingContext, logPanel, visibleStep, current.rewrite, compact);

    const modelSees =
      visibleStep < MODEL_STEP
        ? '尚未到达模型'
        : current.rewrite === 'request'
          ? '原始提示词 + "Additional context."'
          : '原始提示词（未改写）';
    const outerSees =
      visibleStep < OUTER_RETURN_STEP
        ? '尚未返回到 outer'
        : current.rewrite === 'response'
          ? 'inner 改写后的 AIMessage'
          : '模型原始 AIMessage';

    emit({
      stepLabel: `${visibleStep}/${STEPS.length}`,
      phaseLabel:
        currentStep.hook === '模型调用'
          ? '模型调用（洋葱核心）'
          : `${currentStep.hook}（${currentStep.actor}）`,
      directionLabel:
        currentStep.direction === 'in'
          ? '向内进入'
          : currentStep.direction === 'out'
            ? '向外穿出'
            : currentStep.layer === 3
              ? '抵达核心'
              : '洋葱外 · 顺序执行',
      modelSees,
      outerSees,
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
