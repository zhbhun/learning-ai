/**
 * 范例（ResponsibilityMatrix）：自托管 Deep Agents 与 Managed Deep Agents
 * 职责边界的确定性对照器。输入一个「关注点」（服务器与 API、系统提示、
 * 草稿文件、跨会话记忆、代码执行沙箱、消息渠道、定时运行），两侧面板分别
 * 展示该职责在两种模式下由谁承担、你要写什么：自托管侧是自己的代码与配置
 * （backend / store / server / 自写集成），托管侧是一个声明文件加平台供给
 * 的运行时组件。
 * 输入或前置状态：Controls 提供的关注点；纯本地 TS 查表演示，两侧文案为
 * 官方文档规则的归纳（真实行为以 deepagents / managed-deepagents 运行时
 * 为准），不依赖 @langchain/*。
 * 主要操作：切换「关注点」。
 * 预期结果：两侧承担者、你写的东西与底部判断句随关注点切换；托管侧读数
 * 始终是声明文件。
 * 阅读主线：FOCUS_ITEMS 查表（每项 selfHosted / managed / conclusion 三段）
 * 与 draw() 的面板绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

// ---------- 共享绘制 ----------

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const GREEN = '#1a7f54';
const LINE = '#dbe3f0';
const PANEL = '#eef3ff';
const PANEL_GREEN = '#e8f5ee';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

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

// 逐字符累积断行（中文文案没有天然的空格分界）；超出 maxLines 时，
// 把剩余行合并到最后一行并整体截断
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const all: string[] = [];
  let line = '';
  for (const ch of text) {
    if (line && ctx.measureText(line + ch).width > maxWidth) {
      all.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) {
    all.push(line);
  }
  if (all.length <= maxLines) {
    return all;
  }
  const kept = all.slice(0, maxLines - 1);
  kept.push(fitText(ctx, all.slice(maxLines - 1).join(''), maxWidth));
  return kept;
}

// ---------- 职责对照数据 ----------

export type FocusKey =
  | 'runtime'
  | 'prompt'
  | 'drafts'
  | 'memory'
  | 'execute'
  | 'channel'
  | 'schedule';

export interface ResponsibilityOptions {
  focusItem: FocusKey;
}

export interface ResponsibilitySnapshot {
  focusLabel: string;
  selfHostedActor: string;
  managedActor: string;
  youMaintain: string;
}

export interface ResponsibilityInstance {
  update(options: ResponsibilityOptions): void;
  dispose(): void;
}

interface SideSpec {
  actor: string;
  detail: string;
  code: string;
}

interface FocusItem {
  key: FocusKey;
  label: string;
  question: string;
  selfHosted: SideSpec;
  managed: SideSpec;
  conclusion: string;
}

// 每个关注点两侧的承担方式：左列是自己写/配的东西，右列是声明文件 + 平台组件。
// 文案依据 overview 与 Move from Deep Agents 的职责划分归纳。
const FOCUS_ITEMS: FocusItem[] = [
  {
    key: 'runtime',
    label: '服务器与 API',
    question: 'threads、runs、流式与 MCP 端点由谁供给',
    selfHosted: {
      actor: '你自己的代码与运维',
      detail:
        '自己运行进程或容器；上 LangSmith Deployment 要写 langgraph.json 并自己管理部署配置。',
      code: 'createDeepAgent({...}) + 自己的 server',
    },
    managed: {
      actor: 'LangSmith 托管运行时',
      detail:
        'Agent Server 自动供给：threads、runs、streaming 与 MCP endpoint，mda deploy 即得。',
      code: 'agent.ts + npx mda deploy',
    },
    conclusion:
      '托管模式下没有服务器代码可写：name 就是 graph ID，部署产物是一个 Agent Server deployment。',
  },
  {
    key: 'prompt',
    label: '系统提示',
    question: 'instructions 由谁存放、改动后怎么生效',
    selfHosted: {
      actor: '你自己的代码',
      detail: 'systemPrompt 字符串写进 agent 代码，改动提示要改代码并重新部署。',
      code: "systemPrompt: '...'",
    },
    managed: {
      actor: 'LangSmith 托管运行时',
      detail:
        'instructions.md 是托管上下文，deploy 时同步到 Context Hub，部署后可在 Hub 直接更新而无需重新部署。',
      code: 'instructions.md',
    },
    conclusion:
      '同一份提示词，自托管是代码常量，托管是可在线更新的托管文档——改本地文件不会自动同步到已部署 agent。',
  },
  {
    key: 'drafts',
    label: '草稿与任务文件',
    question: 'agent 写的文件落在哪、活多久',
    selfHosted: {
      actor: '你自己的代码',
      detail:
        'backend 自己选自己接：默认 StateBackend 是 thread 内草稿，要路由与持久就组 CompositeBackend。',
      code: 'backend: new CompositeBackend(...)',
    },
    managed: {
      actor: 'LangSmith 托管运行时',
      detail:
        'harness 文件系统由运行时供给：草稿落在 thread 状态，定义里没有（也不能有）backend 参数。',
      code: '无 backend 参数',
    },
    conclusion:
      '托管模式下文件归属交给平台：thread 内草稿由 harness 管，跨会话持久交给 memory.ts。',
  },
  {
    key: 'memory',
    label: '跨会话记忆',
    question: '跨 thread 的记忆存在哪、由谁接线',
    selfHosted: {
      actor: '你自己的代码与运维',
      detail:
        'StoreBackend 加自己运行的 store，namespace 工厂决定隔离边界（上一课）。',
      code: 'StoreBackend({ namespace: (rt) => ... })',
    },
    managed: {
      actor: 'LangSmith 托管运行时',
      detail:
        '加一个 memory.ts 导出 defineMemory 即启用，存储与同步由 Context Hub 支撑。',
      code: 'export const memory = defineMemory({ scope: "agent" })',
    },
    conclusion:
      '注意迁移只挂载空的记忆树：旧记忆文件内容不会自动迁移，要手动搬进 instructions.md 或 skill。',
  },
  {
    key: 'execute',
    label: '代码执行沙箱',
    question: 'execute 在哪跑、生命周期谁管',
    selfHosted: {
      actor: '你自己的代码与运维',
      detail:
        'sandbox backend 自己创建、复用、销毁：TTL 与 thread / assistant 作用域全自己管（上一课）。',
      code: 'new LangSmithSandbox({ sandbox })',
    },
    managed: {
      actor: 'LangSmith 托管运行时',
      detail:
        'sandbox/index.ts 声明即得托管沙箱：平台创建、快照、闲置时停止。',
      code: 'export const sandbox = defineSandbox({ idleTtlSeconds: 600 })',
    },
    conclusion:
      '声明沙箱会清空 permissions——文件系统权限规则会禁用沙箱的 execute 工具，两者不能同时要。',
  },
  {
    key: 'channel',
    label: '消息渠道',
    question: 'Slack 等消息服务怎么启动 runs 并收到回复',
    selfHosted: {
      actor: '你自己的代码',
      detail: '自己写 Slack 集成：事件监听、身份映射、回帖全部自己做。',
      code: '自写 webhook 服务',
    },
    managed: {
      actor: 'LangSmith 托管运行时',
      detail:
        'channels/slack.ts 一行声明，平台创建并配置 Slack 资源，首次部署经 CLI 授权链接接入工作区。',
      code: 'export const channel = channels.slack()',
    },
    conclusion:
      '渠道把会话映射到 thread，并以解析出的调用者身份运行 agent；HTTP 渠道同理。',
  },
  {
    key: 'schedule',
    label: '定时运行',
    question: 'cron 定时任务由谁调度',
    selfHosted: {
      actor: '你自己的代码与运维',
      detail: '自己跑 cron 或调度器，按时调用 agent API。',
      code: '自建调度器',
    },
    managed: {
      actor: 'LangSmith 托管运行时',
      detail:
        'schedules/<name>.ts 声明，部署 live 后由平台配置为托管的 LangSmith cron 任务。',
      code: 'schedules/digest.ts',
    },
    conclusion:
      '本地 mda dev 只列出 schedules 而不运行：定时行为必须以部署形态验证。',
  },
];

export function createResponsibilityExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ResponsibilitySnapshot) => void,
): ResponsibilityInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: ResponsibilityOptions = { focusItem: 'memory' };

  function drawSide(
    x: number,
    w: number,
    top: number,
    modeName: string,
    side: SideSpec,
    accent: string,
    accentBg: string,
    badge: string,
  ) {
    // 面板外框
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    roundedRect(ctx, x, top, w, 208, 10);
    ctx.fill();
    ctx.stroke();

    // 模式名 + 承担者徽标
    ctx.textAlign = 'left';
    ctx.fillStyle = accent;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(modeName, x + 16, top + 28);

    ctx.font = `600 10px ${FONT}`;
    const badgeW = ctx.measureText(badge).width + 16;
    ctx.fillStyle = accentBg;
    roundedRect(ctx, x + w - badgeW - 14, top + 14, badgeW, 22, 11);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillText(badge, x + w - badgeW - 6, top + 29);

    // 承担方式说明
    ctx.fillStyle = INK;
    ctx.font = `12px ${FONT}`;
    const detailLines = wrapText(ctx, side.detail, w - 32, 3);
    detailLines.forEach((line, index) => {
      ctx.fillText(line, x + 16, top + 56 + index * 18);
    });

    // 你写的东西：浅色代码块
    const codeTop = top + 122;
    const codeLines = wrapText(ctx, side.code, w - 44, 2);
    const codeH = codeLines.length * 16 + 20;
    ctx.fillStyle = accent === BLUE ? PANEL : PANEL_GREEN;
    roundedRect(ctx, x + 16, codeTop, w - 32, codeH, 6);
    ctx.fill();
    ctx.fillStyle = MUTED;
    ctx.font = `10px ${MONO}`;
    ctx.fillText('你写的', x + 26, codeTop + 14);
    ctx.fillStyle = accent;
    ctx.font = `11px ${MONO}`;
    codeLines.forEach((line, index) => {
      ctx.fillText(line, x + 26, codeTop + 30 + index * 16);
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const height = Math.max(430, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const item =
      FOCUS_ITEMS.find((entry) => entry.key === current.focusItem) ??
      FOCUS_ITEMS[0];
    const pad = 36;

    // 头部：标题 + 当前关注点
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('职责边界：同一关注点，两种承担方式', pad, pad + 6);

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `关注点：${item.label} — ${fitText(ctx, item.question, width - pad * 2 - 90)}`,
      pad,
      pad + 30,
    );

    // 左右两块面板
    const gap = 24;
    const panelW = (width - pad * 2 - gap) / 2;
    const panelTop = 104;
    drawSide(
      pad,
      panelW,
      panelTop,
      '自托管 Deep Agents',
      item.selfHosted,
      BLUE,
      PANEL,
      '你自己',
    );
    drawSide(
      pad + panelW + gap,
      panelW,
      panelTop,
      'Managed Deep Agents',
      item.managed,
      GREEN,
      PANEL_GREEN,
      '平台托管',
    );

    // 底部判断句
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(ctx, item.conclusion, width - pad * 2),
      pad,
      height - 18,
    );

    emit({
      focusLabel: item.label,
      selfHostedActor: item.selfHosted.actor,
      managedActor: item.managed.actor,
      youMaintain: item.managed.code,
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
