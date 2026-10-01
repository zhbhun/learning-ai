/**
 * 范例介绍：子代理委派轨迹与上下文隔离的确定性模拟器。上泳道是主 Agent
 * （supervisor）的消息历史——只出现 task 调用与回流的最终报告；下方每个
 * 虚线气泡是一个子代理的隔离上下文——任务描述进入，完整工具循环留在气泡
 * 内部，只有最终消息回传。三个任务场景 × 两种上下文模式：单域任务展示
 * 基本回流；跨域任务展示单轮两个 task 调用的并行交错；模糊指代任务在
 * isolated 模式下因子代理丢失指代上下文而委派失败、主 Agent 补上下文重派
 * （信息损失的代价），在 fork 模式下靠透传主对话历史一次解析成功。
 * 输入或前置状态：Controls 提供的任务请求与上下文模式；纯本地 TS 模拟，
 * 不依赖 @langchain/*，消息轨迹为查表数据——真实实现见正文 createAgent +
 * tool 包装示例。
 * 主要操作：切换任务请求或上下文模式。
 * 预期结果：主泳道轨迹、子代理气泡内容、主上下文消息数与委派次数同步变化。
 * 阅读主线：SCENARIOS 查表 → simulate() 组装 → draw() 的两条泳道。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleOptions {
  taskType: 'single' | 'cross' | 'ambiguous';
  contextMode: 'isolated' | 'fork';
}

// 主泳道上的四类条目：对齐真实主上下文里出现的消息形态
type MainKind = 'human' | 'dispatch' | 'report' | 'final';

interface MainEntry {
  kind: MainKind;
  label: string;
  note?: string;
}

// 子代理气泡内的条目：history 只在 fork 模式出现（透传的主对话历史）
type SubKind = 'history' | 'human' | 'ai-tool' | 'tool' | 'ai-final' | 'ai-stuck';

interface SubEntry {
  kind: SubKind;
  text: string;
}

interface SubBubble {
  title: string;
  failed?: boolean;
  entries: SubEntry[];
}

interface Scenario {
  userRequest: string;
  main: MainEntry[];
  bubbles: SubBubble[];
  delegations: number;
  footer: string;
}

export interface ExampleSnapshot {
  taskLabel: string;
  modeLabel: string;
  mainMessages: number;
  subMessages: number;
  delegations: number;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const LINE = '#dbe3f0';
const LANE_FILL = '#eef3ff';
const AMBER = '#b45309';
const AMBER_FILL = '#fff7e8';
const RED = '#b91c1c';
const GREEN = '#047857';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const TASK_LABELS: Record<ExampleOptions['taskType'], string> = {
  single: '单域：安排站会',
  cross: '跨域：订会议 + 发邮件',
  ambiguous: '模糊指代：改到同一时间',
};

const MODE_LABELS: Record<ExampleOptions['contextMode'], string> = {
  isolated: 'isolated（默认隔离）',
  fork: 'fork（透传历史）',
};

const SUB_TAG_LABELS: Record<SubKind, string> = {
  history: '透传历史',
  human: '任务描述',
  'ai-tool': 'AI·工具调用',
  tool: '工具结果',
  'ai-final': 'AI·最终消息',
  'ai-stuck': 'AI·澄清请求',
};

const SUB_TAG_COLORS: Record<SubKind, string> = {
  history: AMBER,
  human: BLUE,
  'ai-tool': '#4338ca',
  tool: GREEN,
  'ai-final': INK,
  'ai-stuck': RED,
};

// 三种任务场景 × 两种上下文模式的确定性轨迹（日期用固定值保证可复现）
const SCENARIOS: Record<ExampleOptions['taskType'], Record<ExampleOptions['contextMode'], Scenario>> = {
  single: {
    isolated: {
      userRequest: '帮我把明天上午 9 点的团队站会安排上',
      main: [
        { kind: 'human', label: '用户请求', note: '安排明天 9:00 站会' },
        { kind: 'dispatch', label: 'task 调用', note: 'schedule_event("安排…")' },
        { kind: 'report', label: '报告回流', note: '已订 10-02 09:00–09:30' },
        { kind: 'final', label: '综合回复', note: '站会已安排好' },
      ],
      bubbles: [
        {
          title: 'calendar 子代理 · 隔离上下文',
          entries: [
            { kind: 'human', text: '任务：安排明天 9:00 的团队站会' },
            { kind: 'ai-tool', text: 'get_available_time_slots(date: 10-02)' },
            { kind: 'tool', text: '["09:00", "14:00", "16:00"]' },
            { kind: 'ai-tool', text: 'create_calendar_event(10-02 09:00–09:30)' },
            { kind: 'tool', text: 'Event created: Team Standup' },
            { kind: 'ai-final', text: '已确认：10-02（周五）09:00–09:30 站会' },
          ],
        },
      ],
      delegations: 1,
      footer:
        '主上下文只追加 task 调用与最终报告；六个工具回合全部留在子代理气泡里——这就是隔离省下的 token',
    },
    fork: {
      userRequest: '帮我把明天上午 9 点的团队站会安排上',
      main: [
        { kind: 'human', label: '用户请求', note: '安排明天 9:00 站会' },
        { kind: 'dispatch', label: 'task 调用', note: 'schedule_event("安排…")' },
        { kind: 'report', label: '报告回流', note: '已订 10-02 09:00–09:30' },
        { kind: 'final', label: '综合回复', note: '站会已安排好' },
      ],
      bubbles: [
        {
          title: 'calendar 子代理 · fork 透传',
          entries: [
            { kind: 'history', text: '透传：主对话历史（本场景没有前文，空历史）' },
            { kind: 'human', text: '任务：安排明天 9:00 的团队站会' },
            { kind: 'ai-tool', text: 'get_available_time_slots(date: 10-02)' },
            { kind: 'tool', text: '["09:00", "14:00", "16:00"]' },
            { kind: 'ai-tool', text: 'create_calendar_event(10-02 09:00–09:30)' },
            { kind: 'ai-final', text: '已确认：10-02（周五）09:00–09:30 站会' },
          ],
        },
      ],
      delegations: 1,
      footer:
        '任务自带完整信息时 fork 不改变结果，只让子代理多背一段主对话历史——能隔离就保持隔离',
    },
  },
  cross: {
    isolated: {
      userRequest: '周四 2 点和设计组开 1 小时会，再给他们发评审提醒邮件',
      main: [
        { kind: 'human', label: '用户请求', note: '订会议 + 发邮件' },
        {
          kind: 'dispatch',
          label: 'task ×2',
          note: 'schedule_event + manage_email',
        },
        { kind: 'report', label: '报告回流', note: '会议已订 10-08 14:00–15:00' },
        { kind: 'report', label: '报告回流', note: '提醒邮件已发送' },
        { kind: 'final', label: '综合回复', note: '会议与邮件都办好了' },
      ],
      bubbles: [
        {
          title: 'calendar 子代理 · 并行 A',
          entries: [
            { kind: 'human', text: '任务：周四 14:00 与设计组开会 1 小时' },
            { kind: 'ai-tool', text: 'get_available_time_slots(date: 10-08)' },
            { kind: 'tool', text: '["09:00", "14:00", "16:00"]' },
            { kind: 'ai-tool', text: 'create_calendar_event(10-08 14:00–15:00)' },
            { kind: 'ai-final', text: '已确认：10-08（周四）14:00–15:00' },
          ],
        },
        {
          title: 'email 子代理 · 并行 B',
          entries: [
            { kind: 'human', text: '任务：给设计组发评审提醒邮件' },
            { kind: 'ai-tool', text: 'send_email(to: design@ex.com)' },
            { kind: 'tool', text: 'Email sent - Subject: 评审提醒' },
            { kind: 'ai-final', text: '已发送：评审提醒邮件' },
          ],
        },
      ],
      delegations: 2,
      footer:
        '主 Agent 在一条 AIMessage 里发出两个 task 调用，运行时并行执行，两条报告先后回流主上下文',
    },
    fork: {
      userRequest: '周四 2 点和设计组开 1 小时会，再给他们发评审提醒邮件',
      main: [
        { kind: 'human', label: '用户请求', note: '订会议 + 发邮件' },
        {
          kind: 'dispatch',
          label: 'task ×2',
          note: 'schedule_event + manage_email',
        },
        { kind: 'report', label: '报告回流', note: '会议已订 10-08 14:00–15:00' },
        { kind: 'report', label: '报告回流', note: '提醒邮件已发送' },
        { kind: 'final', label: '综合回复', note: '会议与邮件都办好了' },
      ],
      bubbles: [
        {
          title: 'calendar 子代理 · fork 透传',
          entries: [
            { kind: 'history', text: '透传：主对话历史（含用户偏好上午开会）' },
            { kind: 'human', text: '任务：周四 14:00 与设计组开会 1 小时' },
            { kind: 'ai-tool', text: 'create_calendar_event(10-08 14:00–15:00)' },
            { kind: 'ai-final', text: '已确认：10-08（周四）14:00–15:00' },
          ],
        },
        {
          title: 'email 子代理 · fork 透传',
          entries: [
            { kind: 'history', text: '透传：主对话历史（含设计组邮箱）' },
            { kind: 'human', text: '任务：给设计组发评审提醒邮件' },
            { kind: 'ai-tool', text: 'send_email(to: design@ex.com)' },
            { kind: 'ai-final', text: '已发送：评审提醒邮件' },
          ],
        },
      ],
      delegations: 2,
      footer:
        'fork 模式下两个子代理各自带一份主对话历史，解析指代更稳，但每个气泡都要多付一份历史 token',
    },
  },
  ambiguous: {
    isolated: {
      userRequest: '把上次那个评审会改到同一时间，再发一封提醒',
      main: [
        { kind: 'human', label: '用户请求', note: '“上次评审会”在历史里' },
        { kind: 'dispatch', label: 'task 调用', note: 'schedule_event（未带日期）' },
        { kind: 'report', label: '报告回流', note: '子代理无法解析“同一时间”' },
        { kind: 'dispatch', label: 'task 调用', note: '补上日期后重派' },
        { kind: 'report', label: '报告回流', note: '已改到 10-09（周五）10:00' },
        { kind: 'final', label: '综合回复', note: '评审会已改期' },
      ],
      bubbles: [
        {
          title: 'calendar 子代理 · 委派 1',
          failed: true,
          entries: [
            { kind: 'human', text: '任务：把评审会改到同一时间' },
            {
              kind: 'ai-stuck',
              text: '缺少日期上下文，无法确定“同一时间”，请提供具体日期',
            },
          ],
        },
        {
          title: 'calendar 子代理 · 委派 2',
          entries: [
            { kind: 'human', text: '任务：把 10-08 评审会改到 10-09 10:00' },
            { kind: 'ai-tool', text: 'create_calendar_event(10-09 10:00)' },
            { kind: 'tool', text: 'Event updated: Design Review' },
            { kind: 'ai-final', text: '已改期：10-09（周五）10:00 并确认' },
          ],
        },
      ],
      delegations: 2,
      footer:
        '隔离的代价：指代上下文留在主对话里，第一次委派失败，主 Agent 补上日期重派——多一跳换取隔离',
    },
    fork: {
      userRequest: '把上次那个评审会改到同一时间，再发一封提醒',
      main: [
        { kind: 'human', label: '用户请求', note: '“上次评审会”在历史里' },
        { kind: 'dispatch', label: 'task 调用', note: 'schedule_event' },
        { kind: 'report', label: '报告回流', note: '已改到 10-09（周五）10:00' },
        { kind: 'final', label: '综合回复', note: '评审会已改期' },
      ],
      bubbles: [
        {
          title: 'calendar 子代理 · fork 透传',
          entries: [
            { kind: 'history', text: '透传：主对话历史（评审会定于 10-08 10:00）' },
            { kind: 'human', text: '任务：把评审会改到同一时间' },
            { kind: 'ai-tool', text: 'create_calendar_event(10-09 10:00)' },
            { kind: 'tool', text: 'Event updated: Design Review' },
            { kind: 'ai-final', text: '已按历史解析：改到 10-09（周五）10:00' },
          ],
        },
      ],
      delegations: 1,
      footer:
        'fork 把主对话历史带进子代理，“同一时间”直接解析成功——一次委派搞定，但气泡更大、隔离更弱',
    },
  },
};

function simulate(options: ExampleOptions): Scenario {
  return SCENARIOS[options.taskType][options.contextMode];
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

// 主泳道胶囊：dispatch 蓝底白字，final 深色描边，其余白底灰边
function drawMainCapsule(
  ctx: CanvasRenderingContext2D,
  entry: MainEntry,
  cx: number,
  cy: number,
  w: number,
) {
  const h = 30;
  const x = cx - w / 2;
  const y = cy - h / 2;

  if (entry.kind === 'dispatch') {
    ctx.fillStyle = BLUE;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.2;
    roundedRect(ctx, x, y, w, h, 15);
    ctx.fill();
    ctx.font = `600 12px ${MONO}`;
    ctx.fillStyle = '#ffffff';
  } else if (entry.kind === 'final') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    roundedRect(ctx, x, y, w, h, 15);
    ctx.fill();
    ctx.stroke();
    ctx.font = `600 12px ${MONO}`;
    ctx.fillStyle = INK;
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.2;
    roundedRect(ctx, x, y, w, h, 15);
    ctx.fill();
    ctx.stroke();
    ctx.font = `400 12px ${MONO}`;
    ctx.fillStyle = INK;
  }

  ctx.textAlign = 'center';
  ctx.fillText(fitText(ctx, entry.label, w - 12), cx, cy + 4);
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
    taskType: 'single',
    contextMode: 'isolated',
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(680, size.width);
    const scenario = simulate(current);
    const maxEntries = Math.max(
      ...scenario.bubbles.map((bubble) => bubble.entries.length),
    );
    const bubbleBlockHeight = 34 + maxEntries * 21 + 12;
    // 布局常量：标题区 86 + 主泳道 92 + 间距 18 + 气泡区 + 底部结论区
    const layoutHeight = 196 + bubbleBlockHeight + 46;
    const height = Math.max(430, layoutHeight, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = 32;

    // 标题与副标题
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('委派轨迹：主上下文 vs 子代理隔离气泡', pad, 40);

    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      `用户请求：${scenario.userRequest} · 上下文模式：${MODE_LABELS[current.contextMode]}`,
      pad,
      64,
    );

    // 上泳道：主 Agent 上下文
    const laneY = 86;
    const laneH = 92;
    ctx.fillStyle = LANE_FILL;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1;
    roundedRect(ctx, pad, laneY, width - pad * 2, laneH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = BLUE;
    ctx.fillText('主 Agent 上下文（supervisor · 持有对话记忆）', pad + 14, laneY + 20);

    const capsuleCy = laneY + 48;
    const usable = width - pad * 2 - 24;
    const slot = usable / scenario.main.length;
    const capsuleW = Math.max(60, Math.min(slot - 14, 132));

    scenario.main.forEach((entry, index) => {
      const cx = pad + 12 + slot * (index + 0.5);
      drawMainCapsule(ctx, entry, cx, capsuleCy, capsuleW);

      if (index > 0) {
        ctx.strokeStyle = BLUE;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        // 起点：上一个胶囊的右边缘；终点：当前胶囊左边缘留 6px 给箭头
        ctx.moveTo(cx - slot + capsuleW / 2 + 3, capsuleCy);
        ctx.lineTo(cx - capsuleW / 2 - 6, capsuleCy);
        ctx.stroke();
        fillTriangle(ctx, cx - capsuleW / 2 - 4, capsuleCy, 0, BLUE);
      }

      if (entry.note) {
        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = MUTED;
        ctx.textAlign = 'center';
        ctx.fillText(
          fitText(ctx, entry.note, Math.max(64, slot - 8)),
          cx,
          capsuleCy + 26,
        );
        ctx.textAlign = 'left';
      }
    });

    // 下泳道：子代理隔离气泡（虚线边框，最多两个并排）
    const bubbleTop = laneY + laneH + 18;
    const bubbleGap = 16;
    const bubbleW =
      (width - pad * 2 - bubbleGap * (scenario.bubbles.length - 1)) /
      scenario.bubbles.length;

    scenario.bubbles.forEach((bubble, index) => {
      const x = pad + index * (bubbleW + bubbleGap);
      const failed = Boolean(bubble.failed);
      // 隔离气泡用虚线边框：先描边再恢复实线，避免影响后续绘制
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = failed ? RED : '#94a3b8';
      ctx.lineWidth = 1.4;
      roundedRect(ctx, x, bubbleTop, bubbleW, bubbleBlockHeight, 10);
      ctx.fillStyle = failed ? '#fff5f5' : '#ffffff';
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = `600 12px ${FONT}`;
      ctx.fillStyle = failed ? RED : MUTED;
      ctx.fillText(
        fitText(ctx, bubble.title, bubbleW - 20),
        x + 12,
        bubbleTop + 21,
      );

      bubble.entries.forEach((subEntry, entryIndex) => {
        const rowY = bubbleTop + 42 + entryIndex * 21;
        // 历史透传行加浅色底纹，与子代理自己的消息行区分
        if (subEntry.kind === 'history') {
          ctx.fillStyle = AMBER_FILL;
          roundedRect(ctx, x + 6, rowY - 13, bubbleW - 12, 18, 4);
          ctx.fill();
        }
        ctx.font = `11px ${MONO}`;
        ctx.fillStyle = SUB_TAG_COLORS[subEntry.kind];
        ctx.fillText(
          fitText(ctx, SUB_TAG_LABELS[subEntry.kind], 78),
          x + 12,
          rowY,
        );
        ctx.font = `12px ${FONT}`;
        ctx.fillStyle = subEntry.kind === 'history' ? AMBER : INK;
        ctx.fillText(
          fitText(ctx, subEntry.text, bubbleW - 108),
          x + 96,
          rowY,
        );
      });
    });

    // 底部结论行
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(ctx, scenario.footer, width - pad * 2),
      pad,
      bubbleTop + bubbleBlockHeight + 26,
    );

    emit({
      taskLabel: TASK_LABELS[current.taskType],
      modeLabel: MODE_LABELS[current.contextMode],
      mainMessages: scenario.main.length,
      subMessages: scenario.bubbles.reduce(
        (total, bubble) => total + bubble.entries.length,
        0,
      ),
      delegations: scenario.delegations,
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
