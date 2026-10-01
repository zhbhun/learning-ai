/**
 * 范例介绍：interrupt 挂起 → resume 恢复的节点重放轨迹模拟器。
 * 一个最简图（START → review → END，compile 挂 MemorySaver，thread_id 'demo-1'），
 * review 节点内在 interrupt() 之前有一行前置代码。逐步回放两种 invoke：
 * 第一次 invoke 执行到 interrupt() 抛 GraphInterrupt 挂起；Command({ resume })
 * 恢复时 review 从头重跑（前置代码执行第 2 次），interrupt() 这次返回 resume 值。
 * 输入或前置状态：Controls 提供 resume 值（approve / reject）与回放阶段（1-4）；
 * 纯本地 TS 确定性模拟，不依赖 @langchain/*，不发起模型调用。
 * 主要操作：拖动「回放阶段」走完挂起与恢复；切换「resume 值」看最终 result 分流。
 * 预期结果：阶段 2 前置代码计数停在 1 次、interrupt() 标记「抛出」；阶段 3 起
 * 计数变 2（节点从头重跑），阶段 4 interrupt() 返回 resume 值、result 写入。
 * 阅读主线：PHASES 的四段语义与 draw() 里行计数 / 行标记的推导。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type DecisionKey = 'approve' | 'reject';

export interface ExampleOptions {
  decision: DecisionKey;
  phase: number;
}

export interface ExampleSnapshot {
  preCodeRuns: string;
  interruptOutcome: string;
  nodeDone: string;
  result: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const GREEN = '#1f9d63';
const RED = '#c2402f';
const AMBER = '#b45309';
const LINE = '#dbe3f0';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// review 节点源代码（与正文代码块同构），每行标注角色，供行级回放。
// pre 行每次进入节点都执行；interrupt 行首次抛出、恢复重跑时返回 resume 值。
interface CodeLine {
  text: string;
  role: 'signature' | 'pre' | 'interrupt' | 'after' | 'brace';
}

const CODE: CodeLine[] = [
  { text: 'function review(state) {', role: 'signature' },
  { text: "console.log('进入节点：整理草稿')", role: 'pre' },
  { text: "const decision = interrupt({ question: '是否发布？' })", role: 'interrupt' },
  { text: "return { result: decision === 'approve' ? '已发布' : '已取消' }", role: 'after' },
  { text: '}', role: 'brace' },
];

const PHASE_TITLES = [
  '① invoke #1：review 首次执行，前置代码运行',
  '② 挂起：interrupt() 抛出 GraphInterrupt，invoke 正常返回',
  '③ resume：Command({ resume }) 到达，review 从头重跑',
  '④ 完成：interrupt() 返回 resume 值，result 写入，图到 END',
];

// 右侧事件轨迹：每段阶段固定追加哪些事件（颜色分四类：调用 / 挂起 / 恢复 / 完成）。
const EVENTS: Array<{ text: string; kind: 'call' | 'pause' | 'resume' | 'done' }> = [
  { text: "invoke({ draft }, thread_id: 'demo-1')", kind: 'call' },
  { text: 'L2 前置代码执行（第 1 次）', kind: 'call' },
  { text: 'L3 interrupt() 抛出 GraphInterrupt', kind: 'pause' },
  { text: '挂起值写入 checkpoint（tasks.interrupts）', kind: 'pause' },
  { text: 'invoke 正常返回 __interrupt__', kind: 'pause' },
  { text: 'invoke(new Command({ resume }), 同 thread_id)', kind: 'resume' },
  { text: 'review 从头重跑：L2 前置代码第 2 次', kind: 'resume' },
  { text: 'L3 interrupt() 返回 resume 值（不再抛出）', kind: 'resume' },
  { text: 'L4 返回 state 更新 → END', kind: 'done' },
];

// 每个阶段展示的事件条数（1-4 阶段累积展示）。
const EVENTS_PER_PHASE = [2, 5, 7, 9];

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

// 某阶段下 pre 行的执行次数：挂起前 1 次，进入重跑后 2 次。
function preRunsAt(phase: number): number {
  return phase >= 3 ? 2 : 1;
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

  let current: ExampleOptions = { decision: 'approve', phase: 1 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(320, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { decision, phase: rawPhase } = current;
    const phase = Math.max(1, Math.min(4, Math.round(rawPhase)));
    const preRuns = preRunsAt(phase);

    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('interrupt 挂起 → resume 恢复：review 节点的重放轨迹', 24, 32);

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.textAlign = 'right';
    ctx.fillText(`阶段 ${phase} / 4`, width - 24, 32);
    ctx.textAlign = 'left';

    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(
        ctx,
        `图：START → review → END（checkpointer + thread_id）  resume 值：'${decision}'`,
        width - 48,
      ),
      24,
      52,
    );

    // 左侧：代码面板 + 行级执行计数
    const codeX = 24;
    const codeY = 72;
    const codeW = Math.floor(width * 0.5) - 32;
    const codeH = 172;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.4;
    roundedRect(ctx, codeX, codeY, codeW, codeH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.fillText('review 节点（源代码 × 执行计数）', codeX + 12, codeY + 20);

    const lineH = 28;
    CODE.forEach((line, index) => {
      const ly = codeY + 38 + index * lineH;
      const isActive =
        (phase === 1 && line.role === 'pre') ||
        (phase === 2 && line.role === 'interrupt') ||
        (phase === 3 && line.role === 'pre') ||
        (phase === 4 && (line.role === 'interrupt' || line.role === 'after'));

      if (isActive) {
        ctx.fillStyle = 'rgba(79, 124, 255, 0.10)';
        ctx.fillRect(codeX + 6, ly - 4, codeW - 12, lineH - 6);
        ctx.fillStyle = BLUE;
        ctx.fillRect(codeX + 6, ly - 4, 3, lineH - 6);
      }

      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = MUTED;
      ctx.fillText(`L${index + 1}`, codeX + 14, ly + 12);

      ctx.font = `12px ${MONO}`;
      ctx.fillStyle = line.role === 'interrupt' ? AMBER : INK;
      ctx.fillText(
        fitText(ctx, line.text, codeW - 92),
        codeX + 40,
        ly + 12,
      );

      // 行尾计数徽标：pre 行显示执行次数，interrupt 行显示抛出 / 返回
      let badge = '';
      let badgeColor: string = MUTED;
      if (line.role === 'pre') {
        badge = `×${preRuns}`;
        badgeColor = preRuns === 2 ? RED : GREEN;
      } else if (line.role === 'interrupt') {
        if (phase === 1) {
          badge = '未执行';
        } else if (phase === 2) {
          badge = '抛出';
          badgeColor = RED;
        } else if (phase === 3) {
          badge = '重跑中';
          badgeColor = AMBER;
        } else {
          badge = `返回 '${decision}'`;
          badgeColor = GREEN;
        }
      } else if (line.role === 'after') {
        badge = phase === 4 ? '×1' : '未执行';
        badgeColor = phase === 4 ? GREEN : MUTED;
      }
      if (badge) {
        ctx.font = `700 11px ${MONO}`;
        ctx.fillStyle = badgeColor;
        ctx.textAlign = 'right';
        ctx.fillText(fitText(ctx, badge, 96), codeX + codeW - 12, ly + 12);
        ctx.textAlign = 'left';
      }
    });

    // 阶段标题（代码面板下方）
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = phase === 2 ? RED : phase >= 3 ? GREEN : INK;
    ctx.fillText(fitText(ctx, PHASE_TITLES[phase - 1], codeW), codeX, codeY + codeH + 22);

    // 右侧：事件轨迹（按阶段累积）
    const evX = Math.floor(width * 0.5) + 8;
    const evW = width - evX - 24;
    const evY = 72;
    const visible = EVENTS_PER_PHASE[phase - 1];
    const evH = visible * 24 + 14;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.4;
    roundedRect(ctx, evX, evY, evW, Math.max(evH, 40), 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.fillText('执行轨迹（按时间向下）', evX + 12, evY + 20);

    EVENTS.slice(0, visible).forEach((event, index) => {
      const ey = evY + 38 + index * 24;
      const color =
        event.kind === 'pause'
          ? RED
          : event.kind === 'resume'
            ? GREEN
            : event.kind === 'done'
              ? BLUE
              : MUTED;
      ctx.fillStyle = color;
      ctx.fillRect(evX + 12, ey - 8, 3, 14);
      ctx.font = `11px ${MONO}`;
      ctx.fillText(
        fitText(ctx, event.text, evW - 40),
        evX + 24,
        ey + 2,
      );
    });

    // 底部结论行：挂起与恢复各一句核心判断
    const noteY = codeY + codeH + 48;
    ctx.font = `12px ${FONT}`;
    if (phase <= 2) {
      ctx.fillStyle = MUTED;
      ctx.fillText(
        fitText(
          ctx,
          '挂起：invoke 正常返回（不是抛异常），挂起信息在 __interrupt__；节点未完成，本轮没有输出落盘。',
          width - 48,
        ),
        24,
        noteY,
      );
    } else {
      ctx.fillStyle = INK;
      ctx.fillText(
        fitText(
          ctx,
          `恢复 ≠ 从断行继续：review 从头重跑（前置代码第 ${preRuns} 次）；interrupt() 这次直接返回 resume 值。`,
          width - 48,
        ),
        24,
        noteY,
      );
      ctx.fillStyle = MUTED;
      ctx.fillText(
        fitText(
          ctx,
          '推论：interrupt() 之前的副作用会重复执行——保持幂等，或挪到 interrupt 之后 / 独立节点。',
          width - 48,
        ),
        24,
        noteY + 20,
      );
    }

    const interruptOutcome =
      phase === 1
        ? '未调用'
        : phase === 2
          ? '抛出 GraphInterrupt'
          : phase === 3
            ? '重跑中（将返回）'
            : `返回 '${decision}'`;
    const result =
      phase === 4
        ? decision === 'approve'
          ? '已发布'
          : '已取消'
        : '—（等待中）';

    emit({
      preCodeRuns: `${preRuns} 次`,
      interruptOutcome,
      nodeDone: phase === 4 ? '是（result 已写入）' : '否',
      result,
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
