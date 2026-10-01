/**
 * 范例介绍：handoff 转交与 subagent 委派的确定性对照模拟器。输入协作模式
 * （handoff 转交 / subagent 委派）与对话场景（购买咨询 / 登录故障 / 价格加故障），
 * 按确定性脚本回放完整对话时间线：handoff 模式下控制权条随 transfer_to_x
 * 转交换色分段、共享历史跨转交延续；subagent 模式下控制权条全程停留在主 agent，
 * 子 agent 只在隔离气泡内工作，主上下文只增加一条工具结果。
 * 输入或前置状态：Controls 提供的协作模式与场景；纯本地 TS 模拟，不依赖
 * @langchain/*，转交与委派脚本为查表——真实实现见正文示例（工具返回 Command）。
 * 主要操作：切换协作模式或对话场景。
 * 预期结果：控制权条分段、消息时间线、隔离气泡与三项读数同步变化。
 * 阅读主线：HANDOFF_SCRIPTS 与 SUBAGENT_SCRIPTS 两组脚本，以及 controlSegments()。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleOptions {
  pattern: 'handoff' | 'subagent';
  scenario: 'purchase' | 'login' | 'mixed';
}

type Actor = 'user' | 'sales' | 'support';
type Scenario = ExampleOptions['scenario'];
type StepKind = 'user' | 'ai' | 'transfer' | 'task' | 'toolResult' | 'end';

interface ScriptStep {
  kind: StepKind;
  actor: Actor;
  /** 槽内主文字（消息摘要或动作名） */
  label: string;
  /** 槽下方注记，可含换行 */
  note?: string;
  /** transfer / task 的目标 agent */
  target?: 'sales' | 'support';
  /** task 槽上方隔离气泡内的消息概要（不进入主上下文） */
  bubbleLines?: string[];
}

interface ControlSegment {
  actor: Actor;
  from: number;
  to: number;
}

interface Simulation {
  steps: ScriptStep[];
  segments: ControlSegment[];
  moves: number;
  endActor: Actor;
  contextCount: number;
}

export interface ExampleSnapshot {
  activeLabel: string;
  movesText: string;
  contextName: string;
  contextCount: number;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const SALES = '#4f7cff';
const SALES_FILL = '#eef3ff';
const SUPPORT = '#16a34a';
const SUPPORT_FILL = '#ecfdf3';
const END_FILL = '#f1f5f9';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const PATTERN_LABELS: Record<ExampleOptions['pattern'], string> = {
  handoff: 'handoff 转交',
  subagent: 'subagent 委派',
};

const SCENARIO_LABELS: Record<Scenario, string> = {
  purchase: '购买咨询',
  login: '登录故障',
  mixed: '价格加故障',
};

const ACTOR_LABELS: Record<Actor, string> = {
  user: '用户',
  sales: 'sales',
  support: 'support',
};

// handoff 脚本：转交槽代表「AIMessage(tool_call) + ToolMessage」一对消息，
// 控制权在转交槽处整体移交给目标 agent，此后原 agent 不再发言。
const HANDOFF_SCRIPTS: Record<Scenario, ScriptStep[]> = {
  purchase: [
    { kind: 'user', actor: 'user', label: '想买手机', note: '首轮进入默认 agent' },
    { kind: 'ai', actor: 'sales', label: '报价推荐', note: '无 tool_calls\n直接答复终局' },
    { kind: 'end', actor: 'sales', label: 'END' },
  ],
  login: [
    { kind: 'user', actor: 'user', label: '登录有故障' },
    {
      kind: 'transfer',
      actor: 'sales',
      label: '转交',
      target: 'support',
      note: 'transfer_to_support\n转交对随共享历史延续',
    },
    { kind: 'ai', actor: 'support', label: '追问症状', note: 'support 直接面对用户' },
    { kind: 'user', actor: 'user', label: '屏幕裂了' },
    { kind: 'ai', actor: 'support', label: '维修方案', note: '无 tool_calls\n归还控制权给用户' },
    { kind: 'end', actor: 'support', label: 'END' },
  ],
  mixed: [
    { kind: 'user', actor: 'user', label: '问价+报故障' },
    { kind: 'ai', actor: 'sales', label: '报价' },
    { kind: 'user', actor: 'user', label: '登录故障?' },
    {
      kind: 'transfer',
      actor: 'sales',
      label: '转交',
      target: 'support',
      note: 'transfer_to_support',
    },
    { kind: 'ai', actor: 'support', label: '处理故障' },
    { kind: 'user', actor: 'user', label: '想买,有折扣?' },
    {
      kind: 'transfer',
      actor: 'support',
      label: '转交',
      target: 'sales',
      note: 'transfer_to_sales\nA→B→A 乒乓回环',
    },
    { kind: 'ai', actor: 'sales', label: '折扣方案', note: '无 tool_calls\n终局回到 sales' },
    { kind: 'end', actor: 'sales', label: 'END' },
  ],
};

// subagent 脚本：主 agent 全程持有控制权，委派槽的气泡是子 agent 的隔离上下文，
// 气泡内的消息不进入主历史，只有一条工具结果回流。
const SUBAGENT_SCRIPTS: Record<Scenario, ScriptStep[]> = {
  purchase: [
    { kind: 'user', actor: 'user', label: '想买手机', note: '无需委派' },
    { kind: 'ai', actor: 'sales', label: '报价推荐', note: '无 tool_calls\n直接答复终局' },
    { kind: 'end', actor: 'sales', label: 'END' },
  ],
  login: [
    { kind: 'user', actor: 'user', label: '登录有故障' },
    {
      kind: 'task',
      actor: 'sales',
      label: '委派',
      target: 'support',
      note: 'task(support_agent)',
      bubbleLines: ['读取故障描述', '定位登录模块', '生成解决方案'],
    },
    { kind: 'toolResult', actor: 'sales', label: '工具结果', note: '仅一条结果\n进入主历史' },
    { kind: 'ai', actor: 'sales', label: '综合答复', note: '主 agent 面对用户' },
    { kind: 'end', actor: 'sales', label: 'END' },
  ],
  mixed: [
    { kind: 'user', actor: 'user', label: '问价+报故障' },
    { kind: 'ai', actor: 'sales', label: '报价' },
    { kind: 'user', actor: 'user', label: '登录故障?' },
    {
      kind: 'task',
      actor: 'sales',
      label: '委派',
      target: 'support',
      note: 'task(support_agent)',
      bubbleLines: ['读取故障描述', '定位登录模块', '生成解决方案'],
    },
    { kind: 'toolResult', actor: 'sales', label: '工具结果', note: '气泡内容\n不进主上下文' },
    { kind: 'ai', actor: 'sales', label: '故障答复' },
    { kind: 'user', actor: 'user', label: '有折扣吗?' },
    { kind: 'ai', actor: 'sales', label: '折扣', note: '主 agent 终局' },
    { kind: 'end', actor: 'sales', label: 'END' },
  ],
};

// 控制权分段：handoff 模式下 transfer 槽切换持有者；subagent 模式恒为 sales
function controlSegments(steps: ScriptStep[]): ControlSegment[] {
  const segments: ControlSegment[] = [];
  let current: Actor = 'sales';
  let start = 0;

  steps.forEach((step, index) => {
    if (step.kind === 'transfer' && step.target && step.target !== current) {
      segments.push({ actor: current, from: start, to: index });
      current = step.target;
      start = index;
    }
  });
  segments.push({ actor: current, from: start, to: steps.length });
  return segments;
}

function simulate(options: ExampleOptions): Simulation {
  const steps =
    options.pattern === 'handoff'
      ? HANDOFF_SCRIPTS[options.scenario]
      : SUBAGENT_SCRIPTS[options.scenario];

  let moves = 0;
  let contextCount = 0;
  for (const step of steps) {
    if (step.kind === 'transfer') {
      moves += 1;
      // 转交对 = 触发转交的 AIMessage + 配对的 ToolMessage
      contextCount += 2;
    } else if (step.kind === 'task') {
      moves += 1;
      // 委派的 AIMessage(tool_call) 计入主上下文，气泡内部不计
      contextCount += 1;
    } else if (step.kind === 'toolResult' || step.kind === 'user' || step.kind === 'ai') {
      contextCount += 1;
    }
  }

  return {
    steps,
    segments: controlSegments(steps),
    moves,
    endActor: steps.at(-1)?.actor ?? 'sales',
    contextCount,
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

function actorColor(actor: Actor): { fill: string; stroke: string; text: string } {
  if (actor === 'sales') {
    return { fill: SALES_FILL, stroke: SALES, text: SALES };
  }
  if (actor === 'support') {
    return { fill: SUPPORT_FILL, stroke: SUPPORT, text: '#15803d' };
  }
  return { fill: '#ffffff', stroke: '#cbd5e1', text: INK };
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

// 时间线上的一个槽：user / ai 为实线圆角框，transfer / task 为发起者色虚线框，
// toolResult 为灰色虚线小框，end 为药丸
function drawSlot(
  ctx: CanvasRenderingContext2D,
  step: ScriptStep,
  cx: number,
  cy: number,
  w: number,
) {
  const h = 36;
  const x = cx - w / 2;
  const y = cy - h / 2;

  if (step.kind === 'end') {
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

  const colors = actorColor(step.actor);
  const isVirtual = step.kind === 'transfer' || step.kind === 'toolResult';
  ctx.fillStyle = isVirtual ? '#ffffff' : colors.fill;
  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 1.4;
  ctx.setLineDash(isVirtual || step.kind === 'task' ? [4, 3] : []);
  roundedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  const isMono = step.kind === 'transfer' || step.kind === 'toolResult';
  ctx.font = `${step.kind === 'task' || isMono ? 600 : 400} 12px ${
    isMono ? MONO : FONT
  }`;
  ctx.fillStyle = colors.text;
  ctx.textAlign = 'center';
  ctx.fillText(fitText(ctx, step.label, w - 10), cx, cy + 4);
  ctx.textAlign = 'left';
}

// subagent 委派槽上方的隔离气泡：子 agent 的消息只在气泡内，最后一条结果回流
function drawBubble(
  ctx: CanvasRenderingContext2D,
  step: ScriptStep,
  cx: number,
  topY: number,
  width: number,
  slotCx: number,
  slotTopY: number,
) {
  const w = Math.min(200, width - 24);
  const h = 26 + (step.bubbleLines?.length ?? 0) * 15 + 16;
  const x = Math.max(12, Math.min(cx - w / 2, width - w - 12));
  const y = topY;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = SUPPORT;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([]);
  roundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();

  ctx.font = `600 11px ${FONT}`;
  ctx.fillStyle = '#15803d';
  ctx.fillText(
    fitText(ctx, `support（隔离上下文）`, w - 16),
    x + 8,
    y + 15,
  );

  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = MUTED;
  step.bubbleLines?.forEach((line, index) => {
    ctx.fillText(fitText(ctx, line, w - 16), x + 8, y + 30 + index * 15);
  });

  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = SUPPORT;
  ctx.fillText(
    fitText(ctx, '↳ 结果文本回传主上下文', w - 16),
    x + 8,
    y + h - 6,
  );

  // 气泡底部到委派槽的回流箭头
  ctx.strokeStyle = SUPPORT;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(slotCx, y + h);
  ctx.lineTo(slotCx, slotTopY - 6);
  ctx.stroke();
  fillTriangle(ctx, slotCx, slotTopY - 2, Math.PI / 2, SUPPORT);
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

  let current: ExampleOptions = { pattern: 'handoff', scenario: 'login' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { steps, segments, moves, endActor, contextCount } = simulate(current);
    const pad = 32;

    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(
      '控制权与消息历史：转交（handoff）vs 委派（subagent）',
      pad,
      pad + 6,
    );

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `协作模式：${PATTERN_LABELS[current.pattern]} · 场景：${SCENARIO_LABELS[current.scenario]} · 终局由 ${ACTOR_LABELS[endActor]} 持有控制权`,
      pad,
      pad + 30,
    );

    // 控制权条：按段填色，段边界即转交点；subagent 模式整条只有 sales 一段
    const barY = 94;
    const barH = 18;
    const barW = width - pad * 2;
    ctx.fillStyle = '#eef2f7';
    roundedRect(ctx, pad, barY, barW, barH, 4);
    ctx.fill();
    for (const segment of segments) {
      const segX = pad + (barW * segment.from) / steps.length;
      const segW = (barW * (segment.to - segment.from)) / steps.length;
      ctx.fillStyle =
        segment.actor === 'sales'
          ? 'rgba(79, 124, 255, 0.88)'
          : 'rgba(22, 163, 74, 0.88)';
      roundedRect(ctx, segX, barY, Math.max(segW, 4), barH, 4);
      ctx.fill();
      if (segW > 44) {
        ctx.font = `600 10px ${MONO}`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(ACTOR_LABELS[segment.actor], segX + segW / 2, barY + 13);
        ctx.textAlign = 'left';
      }
    }
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText('控制权', pad, barY - 6);

    // 主时间线：槽位均分，按脚本顺序排开
    const usable = width - pad * 2;
    const slot = usable / steps.length;
    const nodeW = Math.max(52, Math.min(92, slot - 8));
    const baseline = 236;
    const slotTop = baseline - 18;

    let bubbleCenter = 0;
    steps.forEach((step, index) => {
      const cx = pad + slot * (index + 0.5);

      // 槽上方标注发言者
      if (step.kind !== 'end') {
        ctx.font = `600 10px ${MONO}`;
        ctx.fillStyle = actorColor(step.actor).text;
        ctx.textAlign = 'center';
        ctx.fillText(ACTOR_LABELS[step.actor], cx, baseline - 30);
        ctx.textAlign = 'left';
      }

      drawSlot(ctx, step, cx, baseline, nodeW);

      if (index > 0) {
        const prevCx = pad + slot * index;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(prevCx + nodeW / 2 + 4, baseline);
        ctx.lineTo(cx - nodeW / 2 - 6, baseline);
        ctx.stroke();
        fillTriangle(ctx, cx - nodeW / 2 - 4, baseline, 0, '#94a3b8');
      }

      if (step.note) {
        const noteWidth = Math.max(64, slot);
        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = MUTED;
        ctx.textAlign = 'center';
        step.note.split('\n').forEach((line, lineIndex) => {
          ctx.fillText(
            fitText(ctx, line, noteWidth),
            cx,
            baseline + 34 + lineIndex * 15,
          );
        });
        ctx.textAlign = 'left';
      }

      if (step.kind === 'task' && step.bubbleLines) {
        bubbleCenter = cx;
      }
    });

    // 隔离气泡只出现在 subagent 模式，挂在委派槽上方
    const taskStep = steps.find(
      (step): step is ScriptStep & { kind: 'task' } => step.kind === 'task',
    );
    if (taskStep?.bubbleLines && bubbleCenter > 0) {
      drawBubble(ctx, taskStep, bubbleCenter, 124, width, bubbleCenter, slotTop);
    }

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(
        ctx,
        current.pattern === 'handoff'
          ? '转交后控制权整体移交给目标 agent：共享历史延续，原 agent 退出本轮回路'
          : '委派后控制权仍在主 agent：子 agent 在隔离气泡内工作，主上下文只增加一条结果',
        width - pad * 2,
      ),
      pad,
      height - 16,
    );

    emit({
      activeLabel: ACTOR_LABELS[endActor],
      movesText: `${current.pattern === 'handoff' ? '转交' : '委派'} ${moves} 次`,
      contextName:
        current.pattern === 'handoff' ? '共享历史消息' : '主上下文消息',
      contextCount,
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
