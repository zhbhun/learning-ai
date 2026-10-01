/**
 * 范例介绍：渐进式披露三级加载的确定性模拟器。输入加载策略（渐进式披露 /
 * 全量塞系统提示）与任务（闲聊问候 / 查销售额 / 重订货清单 / 年终盘点），
 * 按确定性规则模拟一个挂载了两个技能（sales-analytics、inventory-management）
 * 的单 agent：渐进式策略的常驻层只放技能元数据（name + description，第一级），
 * 任务命中才加载 SKILL.md 正文（第二级），正文引用的 references 文件再按需
 * 读取（第三级）；全量策略把所有技能正文常驻系统提示，任何任务都全额支付。
 * 输入或前置状态：Controls 提供的加载策略与任务；纯本地 TS 模拟，token 数为
 * 示意值，不依赖 @langchain/*。技能触发判断为查表——真实实现是模型读常驻的
 * description 决定调用 load_skill（见正文「加载与挂载」示例）。
 * 主要操作：切换加载策略或任务。
 * 预期结果：常驻层 / 按需层的块与 token 读数同步变化；年终盘点任务下渐进式
 * 合计反超全量（1995 对 1900），显示披露机制的适用边界。
 * 阅读主线：SKILLS_SIM 与 TASKS 两张查表，以及 simulate() 的两个策略分支。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleOptions {
  strategy: 'progressive' | 'allInPrompt';
  taskType: 'chitchat' | 'sales' | 'reorder' | 'review';
}

interface SkillSim {
  name: string;
  desc: string;
  descTokens: number;
  bodyTokens: number;
  ref: { path: string; tokens: number } | null;
}

interface TaskSim {
  label: string;
  prompt: string;
  // 触发的技能与加载深度：2 = 读到 SKILL.md 正文，3 = 连正文引用的附属文件一起读
  triggers: Array<{ skill: keyof typeof SKILLS_SIM; depth: 2 | 3 }>;
}

interface Simulation {
  residentTokens: number;
  onDemandTokens: number;
  loadedBlocks: Array<{ tag: string; skill: string; detail: string; tokens: number }>;
}

export interface ExampleSnapshot {
  strategyLabel: string;
  residentTokens: number;
  onDemandTokens: number;
  totalTokens: number;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const LINE = '#dbe3f0';
const PANEL_FILL = '#eef3ff';
const EMPTY_FILL = '#f8fafc';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 两个技能的模拟数据：descTokens 是常驻元数据的量级，bodyTokens 是正文量级，
// ref 是正文里引用、需要时才读的附属文件（第三级）
const SKILLS_SIM = {
  sales: {
    name: 'sales-analytics',
    desc: '写 sales 库 SQL：销售额、订单、客户分析',
    descTokens: 45,
    bodyTokens: 900,
    ref: null,
  },
  inventory: {
    name: 'inventory-management',
    desc: '写 inventory 库 SQL：库存、仓储、重订货',
    descTokens: 50,
    bodyTokens: 1000,
    ref: { path: 'references/reorder-policy.md', tokens: 600 },
  },
} satisfies Record<string, SkillSim>;

// 任务查表：不同任务命中不同技能、走到不同深度——这就是触发判断的模拟
const TASKS: Record<ExampleOptions['taskType'], TaskSim> = {
  chitchat: {
    label: '闲聊问候',
    prompt: '你好，你都能做什么？',
    triggers: [],
  },
  sales: {
    label: '查销售额',
    prompt: '上月各地区完成了多少销售额？',
    triggers: [{ skill: 'sales', depth: 2 }],
  },
  reorder: {
    label: '重订货清单',
    prompt: '列出低于重订货点的商品',
    triggers: [{ skill: 'inventory', depth: 3 }],
  },
  review: {
    label: '年终盘点',
    prompt: '年终盘点：各地区销售额与库存积压',
    triggers: [
      { skill: 'sales', depth: 2 },
      { skill: 'inventory', depth: 2 },
    ],
  },
};

const STRATEGY_LABELS: Record<ExampleOptions['strategy'], string> = {
  progressive: '渐进式披露',
  allInPrompt: '全量塞系统提示',
};

function simulate(options: ExampleOptions): Simulation {
  const skills = Object.values(SKILLS_SIM);
  const task = TASKS[options.taskType];

  if (options.strategy === 'allInPrompt') {
    // 全量策略：所有技能正文常驻系统提示，任何任务、任何轮次都全额支付
    return {
      residentTokens: skills.reduce((sum, s) => sum + s.bodyTokens, 0),
      onDemandTokens: 0,
      loadedBlocks: [],
    };
  }

  // 渐进式策略：常驻只有元数据；正文与附属文件按触发深度逐级付费
  const residentTokens = skills.reduce((sum, s) => sum + s.descTokens, 0);
  let onDemandTokens = 0;
  const loadedBlocks: Simulation['loadedBlocks'] = [];

  for (const trigger of task.triggers) {
    const skill = SKILLS_SIM[trigger.skill];
    onDemandTokens += skill.bodyTokens;
    loadedBlocks.push({
      tag: 'L2 · SKILL.md 正文',
      skill: skill.name,
      detail: '表结构 + 业务规则 + 示例查询',
      tokens: skill.bodyTokens,
    });
    if (trigger.depth === 3 && skill.ref) {
      onDemandTokens += skill.ref.tokens;
      loadedBlocks.push({
        tag: 'L3 · 附属文件',
        skill: skill.name,
        detail: skill.ref.path,
        tokens: skill.ref.tokens,
      });
    }
  }

  return { residentTokens, onDemandTokens, loadedBlocks };
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

function drawDashedBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = EMPTY_FILL;
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = '#b6c2d4';
  ctx.lineWidth = 1.2;
  roundedRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);
}

function conclusionText(options: ExampleOptions, simulation: Simulation): string {
  const { residentTokens, onDemandTokens } = simulation;
  const totalTokens = residentTokens + onDemandTokens;
  if (options.strategy === 'allInPrompt') {
    return '所有技能正文常驻系统提示：闲聊、查数、盘点，每个任务都付同样的 1900 tk';
  }
  if (TASKS[options.taskType].triggers.length === 0) {
    return `任务未命中任何技能：只付常驻元数据 ${residentTokens} tk，两份正文一字不进上下文`;
  }
  if (options.taskType === 'review') {
    return `全部知识都用上：合计 ${totalTokens} tk 已反超全量常驻 1900 tk，还多出 load_skill 调用延迟`;
  }
  return `命中才付费：常驻 ${residentTokens} tk + 按需 ${onDemandTokens} tk，未命中技能的正文不进上下文`;
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
    strategy: 'progressive',
    taskType: 'sales',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = Math.max(380, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const simulation = simulate(current);
    const task = TASKS[current.taskType];
    const totalTokens =
      simulation.residentTokens + simulation.onDemandTokens;

    const pad = 36;

    // 头部：标题 + 参数摘要
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(
      '三级加载对照：常驻元数据 → 激活正文 → 引用附属文件',
      pad,
      pad + 6,
    );

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `策略：${STRATEGY_LABELS[current.strategy]} · 任务「${task.label}」：${task.prompt} · 常驻 ${simulation.residentTokens} tk · 按需 ${simulation.onDemandTokens} tk · 合计 ${totalTokens} tk`,
      pad,
      pad + 30,
    );

    // 主体两栏：左 = 常驻层（系统提示），右 = 按需层（本次会话）
    const bodyTop = 96;
    const bodyBottom = height - 118;
    const gap = 40;
    const leftW = Math.round((width - pad * 2 - gap) * 0.44);
    const rightX = pad + leftW + gap;
    const rightW = width - pad - rightX;

    ctx.strokeStyle = '#e3e9f2';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad + leftW + gap / 2, bodyTop - 6);
    ctx.lineTo(pad + leftW + gap / 2, bodyBottom);
    ctx.stroke();

    // 左栏标题与内容
    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.fillText('常驻层 · 系统提示', pad, bodyTop);

    const skills = Object.values(SKILLS_SIM);
    const blockH = 62;
    const blockGap = 10;
    skills.forEach((skill, index) => {
      const y = bodyTop + 20 + index * (blockH + blockGap);
      ctx.fillStyle = current.strategy === 'progressive' ? '#ffffff' : PANEL_FILL;
      ctx.strokeStyle = current.strategy === 'progressive' ? LINE : BLUE;
      ctx.lineWidth = current.strategy === 'progressive' ? 1.2 : 2;
      roundedRect(ctx, pad, y, leftW, blockH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = `600 12px ${MONO}`;
      ctx.fillStyle = BLUE;
      ctx.fillText(skill.name, pad + 12, y + 20);

      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = MUTED;
      ctx.fillText(
        fitText(
          ctx,
          current.strategy === 'progressive'
            ? `description：${skill.desc}`
            : 'SKILL.md 正文：表结构 + 业务规则 + 示例查询',
          leftW - 100,
        ),
        pad + 12,
        y + 38,
      );

      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'right';
      ctx.fillText(
        current.strategy === 'progressive'
          ? `~${skill.descTokens} tk`
          : `~${skill.bodyTokens} tk`,
        pad + leftW - 10,
        y + 20,
      );
      ctx.textAlign = 'left';
    });

    const progressiveNote =
      current.strategy === 'progressive'
        ? '只常驻 name + description（第一级）'
        : '每次请求都全额支付，与任务是否命中无关';
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      progressiveNote,
      pad,
      bodyTop + 20 + skills.length * (blockH + blockGap) + 2,
    );

    // 右栏标题与内容
    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.fillText('按需层 · 本次会话加载', rightX, bodyTop);

    if (simulation.loadedBlocks.length === 0) {
      const hintH = 62;
      drawDashedBox(ctx, rightX, bodyTop + 20, rightW, hintH);
      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = MUTED;
      ctx.textAlign = 'center';
      ctx.fillText(
        current.strategy === 'progressive'
          ? '任务未命中任何技能：不加载正文'
          : '正文已常驻系统提示：无需按需加载',
        rightX + rightW / 2,
        bodyTop + 20 + hintH / 2 + 4,
      );
      ctx.textAlign = 'left';
    } else {
      simulation.loadedBlocks.forEach((block, index) => {
        const y = bodyTop + 20 + index * (blockH + blockGap);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 1.6;
        roundedRect(ctx, rightX, y, rightW, blockH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = `600 11px ${MONO}`;
        ctx.fillStyle = BLUE;
        ctx.fillText(block.tag, rightX + 12, y + 19);

        ctx.font = `12px ${MONO}`;
        ctx.fillStyle = INK;
        ctx.fillText(block.skill, rightX + 12, y + 37);

        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = MUTED;
        ctx.fillText(
          fitText(ctx, block.detail, rightW - 110),
          rightX + 12,
          y + 53,
        );

        ctx.font = `11px ${MONO}`;
        ctx.fillStyle = MUTED;
        ctx.textAlign = 'right';
        ctx.fillText(`+${block.tokens} tk`, rightX + rightW - 10, y + 19);
        ctx.textAlign = 'left';
      });
    }

    // 底部：常驻 / 按需 token 计量条（以全量常驻 1900 tk 为满刻度）
    const footerTop = height - 96;
    const barMax = 1900;
    const barAreaW = width - pad * 2 - 120;

    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.fillText('进入上下文的技能 token（示意值）', pad, footerTop);

    const bars: Array<{ label: string; value: number; color: string }> = [
      { label: '常驻', value: simulation.residentTokens, color: BLUE },
      { label: '按需', value: simulation.onDemandTokens, color: '#9db4f8' },
    ];
    bars.forEach((bar, index) => {
      const y = footerTop + 16 + index * 24;
      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = MUTED;
      ctx.fillText(bar.label, pad, y + 10);

      ctx.fillStyle = '#edf1f7';
      roundedRect(ctx, pad + 36, y, barAreaW, 12, 6);
      ctx.fill();
      if (bar.value > 0) {
        const w = Math.max(
          8,
          (Math.min(bar.value, barMax) / barMax) * barAreaW,
        );
        ctx.fillStyle = bar.color;
        roundedRect(ctx, pad + 36, y, w, 12, 6);
        ctx.fill();
      }

      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = MUTED;
      ctx.fillText(`${bar.value} tk`, pad + 36 + barAreaW + 10, y + 10);
    });

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(ctx, conclusionText(current, simulation), width - pad * 2),
      pad,
      height - 18,
    );

    emit({
      strategyLabel: STRATEGY_LABELS[current.strategy],
      residentTokens: simulation.residentTokens,
      onDemandTokens: simulation.onDemandTokens,
      totalTokens,
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
