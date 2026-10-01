/**
 * 范例介绍：supervisor 路由循环的确定性模拟器。输入路由方式（静态条件路由 /
 * supervisor 循环）与任务类型（技术综述 / 事实核查 / 文案润色），按确定性规则
 * 模拟两种分发策略的完整执行时间线：静态路由在入口一次分类后走固定链，不看
 * 中途产出；supervisor 每轮读全局消息再决定下一个 worker 还是 FINISH，技术
 * 综述任务会因草稿缺引用出现「补调研 → 重写」的回流循环。
 * 输入或前置状态：Controls 提供的路由方式与任务类型；纯本地 TS 模拟，
 * 不依赖 @langchain/*，判断逻辑为查表——真实实现用模型 + 结构化输出
 * （见正文 supervisor-loop 示例）。
 * 主要操作：切换路由方式或任务类型。
 * 预期结果：时间线轨迹、每轮判断注记、判断调用次数与图步数同步变化。
 * 阅读主线：simulate() 的 static / supervisor 两个分支。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleOptions {
  routingMode: 'static' | 'supervisor';
  taskType: 'overview' | 'factCheck' | 'polish';
}

type ItemKind = 'router' | 'worker' | 'end';

interface TimelineItem {
  id: 'classify' | 'supervisor' | 'researcher' | 'writer' | 'END';
  kind: ItemKind;
  note?: string;
}

interface Simulation {
  timeline: TimelineItem[];
  judgeCalls: number;
}

export interface ExampleSnapshot {
  modeLabel: string;
  judgeCalls: number;
  steps: number;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const LINE = '#dbe3f0';
const ROUTER_FILL = '#eef3ff';
const END_FILL = '#f1f5f9';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const MODE_LABELS: Record<ExampleOptions['routingMode'], string> = {
  static: '静态条件路由',
  supervisor: 'supervisor 循环',
};

const TASK_LABELS: Record<ExampleOptions['taskType'], string> = {
  overview: '技术综述',
  factCheck: '事实核查',
  polish: '文案润色',
};

// 静态路由的固定链：入口一次分类按任务类别查表，链上节点不看中途产出
const STATIC_CHAINS: Record<ExampleOptions['taskType'], Array<'researcher' | 'writer'>> = {
  overview: ['researcher', 'writer'],
  factCheck: ['researcher'],
  polish: ['writer'],
};

function simulateStatic(taskType: ExampleOptions['taskType']): Simulation {
  const chain = STATIC_CHAINS[taskType];
  const chainText = [...chain, 'END'].join(' → ');
  return {
    timeline: [
      {
        id: 'classify',
        kind: 'router',
        note: `按类别查表：${chainText}`,
      },
      ...chain.map<TimelineItem>((id) => ({ id, kind: 'worker' })),
      { id: 'END', kind: 'end' },
    ],
    judgeCalls: 1,
  };
}

// supervisor 的判断查表：模拟「读全局消息 → 决定下一个 worker / FINISH」。
// 技术综述任务在草稿缺引用时会多出一轮「补调研 → 重写」，这就是回流循环。
function simulateSupervisor(taskType: ExampleOptions['taskType']): Simulation {
  const timeline: TimelineItem[] = [];
  let judgeCalls = 0;

  const judge = (note: string, target?: 'researcher' | 'writer') => {
    judgeCalls += 1;
    timeline.push({ id: 'supervisor', kind: 'router', note });
    if (target) {
      timeline.push({ id: target, kind: 'worker' });
    }
  };

  if (taskType === 'overview') {
    judge('没有材料，先调研', 'researcher');
    judge('材料齐了，开始成稿', 'writer');
    judge('草稿缺引用，补一次调研', 'researcher');
    judge('引用已补，重写成稿', 'writer');
    judge('草稿完整，输出 FINISH');
  } else if (taskType === 'factCheck') {
    judge('核查需要事实来源', 'researcher');
    judge('来源到手，核查完成，输出 FINISH');
  } else {
    judge('只需改写文案', 'writer');
    judge('改写完成，输出 FINISH');
  }

  timeline.push({ id: 'END', kind: 'end' });
  return { timeline, judgeCalls };
}

function simulate(options: ExampleOptions): Simulation {
  return options.routingMode === 'static'
    ? simulateStatic(options.taskType)
    : simulateSupervisor(options.taskType);
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

// 判断注记最多两行：优先在首个中文逗号或冒号处断行，容纳不下再按宽度截断
function wrapNote(text: string): string[] {
  const breakIndex = Math.min(
    ...['，', '：']
      .map((sep) => text.indexOf(sep))
      .filter((index) => index > 0 && index < text.length - 1),
  );
  if (Number.isFinite(breakIndex)) {
    return [text.slice(0, breakIndex + 1), text.slice(breakIndex + 1)];
  }
  return [text];
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

// 时间线上的一个节点：router 蓝框白字加重描边，worker 白底灰边，END 药丸形
function drawItem(
  ctx: CanvasRenderingContext2D,
  item: TimelineItem,
  cx: number,
  cy: number,
  w: number,
) {
  const h = 34;
  const x = cx - w / 2;
  const y = cy - h / 2;

  if (item.kind === 'end') {
    ctx.fillStyle = END_FILL;
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.2;
    roundedRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'center';
    ctx.fillText('END', cx, cy + 4);
    ctx.textAlign = 'left';
    return;
  }

  const isRouter = item.kind === 'router';
  ctx.fillStyle = isRouter ? ROUTER_FILL : '#ffffff';
  ctx.strokeStyle = isRouter ? BLUE : LINE;
  ctx.lineWidth = isRouter ? 2 : 1.2;
  roundedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();

  ctx.font = `${isRouter ? 600 : 400} 12px ${MONO}`;
  ctx.fillStyle = isRouter ? BLUE : INK;
  ctx.textAlign = 'center';
  ctx.fillText(fitText(ctx, item.id, w - 12), cx, cy + 4);
  ctx.textAlign = 'left';
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
    routingMode: 'static',
    taskType: 'overview',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const simulation = simulate(current);
    const { timeline, judgeCalls } = simulation;

    const pad = 36;
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(
      '分发策略对照：一次分类的固定链 vs 每轮再判断的 supervisor',
      pad,
      pad + 6,
    );

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `路由方式：${MODE_LABELS[current.routingMode]} · 任务：${TASK_LABELS[current.taskType]} · 判断调用 ${judgeCalls} 次 · 图步数 ${timeline.length - 1}`,
      pad,
      pad + 30,
    );

    // 时间线：从左到右按执行顺序排开，槽位均分
    const usable = width - pad * 2;
    const slot = usable / timeline.length;
    const nodeW = Math.max(56, Math.min(92, slot - 8));
    const baseline = Math.round(height * 0.48);

    timeline.forEach((item, index) => {
      const cx = pad + slot * (index + 0.5);
      drawItem(ctx, item, cx, baseline, nodeW);

      if (index > 0) {
        const prevCx = pad + slot * index;
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(prevCx + nodeW / 2 + 4, baseline);
        ctx.lineTo(cx - nodeW / 2 - 6, baseline);
        ctx.stroke();
        fillTriangle(
          ctx,
          cx - nodeW / 2 - 4,
          baseline,
          0,
          BLUE,
        );
      }

      // 判断注记只挂在 router 节点下方，说明这一轮「看什么、派给谁」
      if (item.note) {
        const noteWidth = Math.max(64, slot);
        const lines = wrapNote(item.note);
        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = MUTED;
        ctx.textAlign = 'center';
        lines.forEach((line, lineIndex) => {
          ctx.fillText(
            fitText(ctx, line, noteWidth),
            cx,
            baseline + 36 + lineIndex * 15,
          );
        });
        ctx.textAlign = 'left';
      }
    });

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(
        ctx,
        current.routingMode === 'static'
          ? '入口一次分类后路径固定：不检查中途产出，简单任务开销最小'
          : '每轮读全局消息再分发：能补漏回流，判断调用随轮数增加',
        width - pad * 2,
      ),
      pad,
      height - 24,
    );

    emit({
      modeLabel: MODE_LABELS[current.routingMode],
      judgeCalls,
      steps: timeline.length - 1,
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
