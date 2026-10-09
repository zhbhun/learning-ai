/*
 * 演示:任务清单不在任何一条消息里,而是从消息流中成对出现的任务工具调用拼出来的。
 * 输入:流位置(回放到第几条消息)。
 * 操作:拖动「流位置」逐条步进;时间线高亮当前消息,虚线连接同一 tool_use_id 的
 *       调用与结果,右侧任务清单随回放逐步重建。
 * 预期:assistant 的 TaskCreate 输入里没有任务 ID,清单在配对 tool_result 携带的
 *       tool_use_result(TaskCreateOutput)到达时才多一条;TaskUpdate 输入自带
 *       taskId,调用即可推进状态,其结果只做确认、不改变清单。
 * 阅读主线:文件上半部分是演示消息流与回放跟踪器(教学核心,与正文 tracker 同构);
 *           下半部分是 Canvas 渲染外壳(演示载体,可略读)。全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:演示消息流与回放跟踪器(载荷形态对照官方 TaskCreateInput /   */
/* TaskCreateOutput / TaskUpdateInput / TaskUpdateOutput)              */
/* ------------------------------------------------------------------ */

export type DemoTaskStatus = "pending" | "in_progress" | "completed";

export interface DemoTask {
  id: string;
  subject: string;
  status: DemoTaskStatus;
}

/** TaskCreate 的工具输入:注意里面没有任务 ID,ID 由执行方分配 */
export interface DemoTaskCreateInput {
  kind: "TaskCreateInput";
  subject: string;
  activeForm?: string;
}

/** TaskCreate 的 tool_use_result:任务 ID 在这里才拿到 */
export interface DemoTaskCreateOutput {
  kind: "TaskCreateOutput";
  task: { id: string; subject: string };
}

/** TaskUpdate 的工具输入:自带 taskId,调用即可推进状态 */
export interface DemoTaskUpdateInput {
  kind: "TaskUpdateInput";
  taskId: string;
  status: DemoTaskStatus;
}

/** TaskUpdate 的 tool_use_result:确认信息,不携带清单状态 */
export interface DemoTaskUpdateOutput {
  kind: "TaskUpdateOutput";
  success: boolean;
  updatedFields?: string[];
  statusChange?: { from: DemoTaskStatus; to: DemoTaskStatus };
}

export type DemoPayload =
  | DemoTaskCreateInput
  | DemoTaskCreateOutput
  | DemoTaskUpdateInput
  | DemoTaskUpdateOutput;

export interface DemoStreamEvent {
  /** assistant 消息携带 tool_use 块;user 消息携带配对的 tool_result */
  type: "assistant" | "user";
  /** 卡片标题,如 "assistant · TaskCreate" */
  title: string;
  /** tool_use_id:配对键,assistant 发出、user 回传 */
  toolUseId: string;
  /** 工具名,仅 assistant 事件 */
  tool?: "TaskCreate" | "TaskUpdate";
  /** 结构化载荷:assistant 为工具输入,user 为 tool_use_result */
  payload?: DemoPayload;
  /** 卡片载荷行(演示值) */
  lines: string[];
  /** 读数用的单行摘要 */
  summary: string;
}

/** 场景:prompt 为"重构配置加载",agent 先建两个任务,再逐条推进。 */
export function buildDemoStream(): DemoStreamEvent[] {
  return [
    {
      type: "assistant",
      title: "assistant · TaskCreate",
      toolUseId: "toolu_01",
      tool: "TaskCreate",
      payload: {
        kind: "TaskCreateInput",
        subject: "梳理现有配置项",
        activeForm: "梳理现有配置项中",
      },
      lines: [
        'subject: "梳理现有配置项"',
        'activeForm: "梳理现有配置项中"',
        "(注意:输入里没有任务 ID)",
      ],
      summary: "创建任务:梳理现有配置项",
    },
    {
      type: "user",
      title: "user · tool_result",
      toolUseId: "toolu_01",
      payload: {
        kind: "TaskCreateOutput",
        task: { id: "1", subject: "梳理现有配置项" },
      },
      lines: [
        "tool_use_result → TaskCreateOutput",
        'task: { id: "1", subject: "梳理现有配置项" }',
        "(ID 由执行方分配,在这里才拿到)",
      ],
      summary: "结果:任务 ID = 1,清单 +1",
    },
    {
      type: "assistant",
      title: "assistant · TaskCreate",
      toolUseId: "toolu_02",
      tool: "TaskCreate",
      payload: {
        kind: "TaskCreateInput",
        subject: "改造 loader.ts",
        activeForm: "改造 loader.ts 中",
      },
      lines: [
        'subject: "改造 loader.ts"',
        'activeForm: "改造 loader.ts 中"',
        "(注意:输入里没有任务 ID)",
      ],
      summary: "创建任务:改造 loader.ts",
    },
    {
      type: "user",
      title: "user · tool_result",
      toolUseId: "toolu_02",
      payload: {
        kind: "TaskCreateOutput",
        task: { id: "2", subject: "改造 loader.ts" },
      },
      lines: [
        "tool_use_result → TaskCreateOutput",
        'task: { id: "2", subject: "改造 loader.ts" }',
      ],
      summary: "结果:任务 ID = 2,清单 +1",
    },
    {
      type: "assistant",
      title: "assistant · TaskUpdate",
      toolUseId: "toolu_03",
      tool: "TaskUpdate",
      payload: { kind: "TaskUpdateInput", taskId: "1", status: "in_progress" },
      lines: [
        'taskId: "1"',
        'status: "in_progress"',
        "(输入自带 taskId,直接可推进)",
      ],
      summary: "推进:任务 1 → in_progress",
    },
    {
      type: "user",
      title: "user · tool_result",
      toolUseId: "toolu_03",
      payload: { kind: "TaskUpdateOutput", success: true, updatedFields: ["status"] },
      lines: [
        "tool_use_result → TaskUpdateOutput",
        'success: true   updatedFields: ["status"]',
        "(确认信息,清单不变)",
      ],
      summary: "结果:更新成功,清单不变",
    },
    {
      type: "assistant",
      title: "assistant · TaskUpdate",
      toolUseId: "toolu_04",
      tool: "TaskUpdate",
      payload: { kind: "TaskUpdateInput", taskId: "1", status: "completed" },
      lines: ['taskId: "1"', 'status: "completed"'],
      summary: "收尾:任务 1 → completed",
    },
    {
      type: "user",
      title: "user · tool_result",
      toolUseId: "toolu_04",
      payload: {
        kind: "TaskUpdateOutput",
        success: true,
        statusChange: { from: "in_progress", to: "completed" },
      },
      lines: [
        "tool_use_result → TaskUpdateOutput",
        'statusChange: { from: "in_progress", to: "completed" }',
        "(确认信息,清单不变)",
      ],
      summary: "结果:任务 1 已完成",
    },
  ];
}

/**
 * 回放跟踪器:与正文 tracker 同构——按 tool_use_id 配对,从 tool_use_result
 * 拿任务 ID,逐步重建清单。清单状态只由 TaskCreateInput(登记待创建)与
 * TaskCreateOutput(入列)、TaskUpdateInput(推进)改变;TaskUpdateOutput 只做确认。
 */
export function replayDemoStream(
  events: DemoStreamEvent[],
  position: number,
): DemoTask[] {
  const tasks: DemoTask[] = [];
  // 与正文 tracker 相同:先按 toolUseId 记下待创建的 subject,等配对结果再入列
  const pendingCreates = new Map<string, string>();

  for (const event of events.slice(0, position + 1)) {
    const payload = event.payload;
    if (!payload) {
      continue;
    }
    if (payload.kind === "TaskCreateInput") {
      // 输入里没有 ID:先记住这次调用,等配对的 tool_use_result
      pendingCreates.set(event.toolUseId, payload.subject);
    } else if (payload.kind === "TaskCreateOutput") {
      tasks.push({
        id: payload.task.id,
        subject: pendingCreates.get(event.toolUseId) ?? payload.task.subject,
        status: "pending",
      });
    } else if (payload.kind === "TaskUpdateInput") {
      const task = tasks.find((item) => item.id === payload.taskId);
      if (task) {
        task.status = payload.status;
      }
    }
    // TaskUpdateOutput 只做确认,不改变清单
  }
  return tasks;
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:时间线 + 配对虚线 + 当前消息卡片 + 任务清单(演示载体)      */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const EVENT_COLORS: Record<DemoStreamEvent["type"], string> = {
  assistant: "#4f7cff",
  user: "#159570",
};

const STATUS_COLORS: Record<DemoTaskStatus, string> = {
  pending: "#64748b",
  in_progress: "#b45309",
  completed: "#159570",
};

export interface DemoOptions {
  position: number;
}

export interface DemoSnapshot {
  position: number;
  total: number;
  /** 当前消息,#序号 + 标题 */
  current: string;
  /** 任务清单的单行摘要,如 "1 in_progress · 2 pending" */
  list: string;
  /** 进度读数 */
  progress: string;
}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createTodoTrackingDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = { position: 4 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(420, size.width);
    const height = Math.max(330, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 28;
    const innerWidth = width - margin * 2;
    const stream = buildDemoStream();
    const position = Math.max(
      0,
      Math.min(stream.length - 1, Math.round(current.position)),
    );
    const tasks = replayDemoStream(stream, position);
    const event = stream[position];

    // 标题与场景
    ctx.fillStyle = "#172033";
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("任务清单回放:从消息流拼出执行进度(演示数据)", margin, 32);
    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      'prompt:"重构配置加载"   清单由 TaskCreate / TaskUpdate 的调用与结果拼出',
      margin,
      52,
    );

    // 时间线:每条消息一个色块,assistant 蓝 / user 绿
    const blockTop = 66;
    const blockHeight = 30;
    const gap = 6;
    const blockWidth = (innerWidth - gap * (stream.length - 1)) / stream.length;

    stream.forEach((item, index) => {
      const x = margin + index * (blockWidth + gap);
      const isCurrent = index === position;

      ctx.fillStyle = EVENT_COLORS[item.type];
      const top = isCurrent ? blockTop - 3 : blockTop;
      roundRect(x, top, blockWidth, blockHeight, 6);
      ctx.fill();

      if (isCurrent) {
        ctx.strokeStyle = "#172033";
        ctx.lineWidth = 2;
        roundRect(x, top, blockWidth, blockHeight, 6);
        ctx.stroke();
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      const label = item.type === "assistant" ? (item.tool ?? "tool_use") : "tool_result";
      ctx.fillText(label, x + blockWidth / 2, top + blockHeight / 2 + 3);
      ctx.textAlign = "left";
    });

    // 配对虚线:把每对 assistant 调用与 user 结果连起来(同一 tool_use_id)
    const baseY = blockTop + blockHeight + 10;
    for (let index = 0; index < stream.length - 1; index += 2) {
      const startX = margin + index * (blockWidth + gap) + blockWidth / 2;
      const endX = margin + (index + 1) * (blockWidth + gap) + blockWidth / 2;

      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(startX, blockTop + blockHeight);
      ctx.lineTo(startX, baseY);
      ctx.lineTo(endX, baseY);
      ctx.lineTo(endX, blockTop + blockHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = "#64748b";
    ctx.font = "10.5px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("┄ 同一 tool_use_id:调用与结果成对到达", margin, baseY + 16);

    // 双卡片:左 = 当前消息载荷,右 = 回放重建的任务清单
    const cardTop = 134;
    const cardHeight = height - cardTop - 20;
    const cardGap = 12;
    const leftWidth = (innerWidth - cardGap) * 0.55;
    const rightWidth = innerWidth - leftWidth - cardGap;

    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    roundRect(margin, cardTop, leftWidth, cardHeight, 8);
    ctx.fill();
    ctx.stroke();
    roundRect(margin + leftWidth + cardGap, cardTop, rightWidth, cardHeight, 8);
    ctx.fill();
    ctx.stroke();

    // 左卡片:当前消息
    ctx.fillStyle = EVENT_COLORS[event.type];
    roundRect(margin + 16, cardTop + 16, 10, 10, 3);
    ctx.fill();
    ctx.fillStyle = "#172033";
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`#${position + 1}  ${event.title}`, margin + 34, cardTop + 26);
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#334155";
    event.lines.forEach((line, lineIndex) => {
      ctx.fillText(line, margin + 18, cardTop + 54 + lineIndex * 20);
    });

    // 右卡片:任务清单(回放重建)
    const rightLeft = margin + leftWidth + cardGap;
    ctx.fillStyle = "#172033";
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("任务清单(回放重建)", rightLeft + 16, cardTop + 24);

    if (tasks.length === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("尚无任务——TaskCreate 的结果还没到达", rightLeft + 16, cardTop + 52);
    } else {
      tasks.forEach((task, taskIndex) => {
        const rowY = cardTop + 56 + taskIndex * 42;
        const cx = rightLeft + 24;
        const cy = rowY;

        // 状态图标:pending 空圈 / in_progress 空圈加芯 / completed 实圈打勾
        if (task.status === "completed") {
          ctx.fillStyle = STATUS_COLORS[task.status];
          ctx.beginPath();
          ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(cx - 3, cy);
          ctx.lineTo(cx - 1, cy + 2.6);
          ctx.lineTo(cx + 3.2, cy - 2.4);
          ctx.stroke();
        } else {
          ctx.strokeStyle = STATUS_COLORS[task.status];
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(cx, cy, 6.5, 0, Math.PI * 2);
          ctx.stroke();
          if (task.status === "in_progress") {
            ctx.fillStyle = STATUS_COLORS[task.status];
            ctx.beginPath();
            ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = "#172033";
        ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
        ctx.fillText(`${task.id}. ${task.subject}`, rightLeft + 40, rowY + 4);

        ctx.fillStyle = STATUS_COLORS[task.status];
        ctx.font = "10.5px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "right";
        ctx.fillText(task.status, rightLeft + rightWidth - 14, rowY + 4);
        ctx.textAlign = "left";
      });
    }

    // 进度读数
    const completed = tasks.filter((task) => task.status === "completed").length;
    const inProgress = tasks.filter((task) => task.status === "in_progress").length;
    emit({
      position,
      total: stream.length,
      current: `#${position + 1} ${event.title}`,
      list:
        tasks.length === 0
          ? "尚无任务"
          : tasks.map((task) => `${task.id} ${task.status}`).join(" · "),
      progress:
        tasks.length === 0
          ? "尚无任务"
          : `已完成 ${completed} / ${tasks.length} · 进行中 ${inProgress}`,
    });
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options: DemoOptions) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
