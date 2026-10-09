/*
 * 演示:三种获取会话的方式(直接 query() / startup() / prewarm())各自把冷启动成本放在哪里。
 * 输入:预热方式 + 时间进度(0-100%)。
 * 操作:切换方式并拖动进度,观察每个阶段落在「应用启动时」还是「请求关键路径」,以及用户等待累计。
 * 预期:直接 query() 的三段全在关键路径;startup() 把 spawn 与 initialize 握手挪到启动时,请求零等待;
 *       prewarm() 同样提前进程级两段,但会话级初始化(cwd、SessionStart hooks、stdio MCP、CLAUDE.md 与 git)留到 claim()。
 * 阅读主线:上半部分是三种方式的阶段数据(纯演示数据,阶段时长为示意值,非官方测量;
 *           不真实调用 LLM API 与 CLI 子进程);下半部分是 Canvas 渲染外壳。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:三种方式的阶段数据                                         */
/* ------------------------------------------------------------------ */

export type WarmModeId = "cold" | "startup" | "prewarm";

/** 时段归属:boot = 应用启动时(离线预热);request = 请求到达后(用户等待) */
export type PhaseWhen = "boot" | "request";

export interface WarmPhase {
  id: string;
  /** 画布时间条内标注的阶段名 */
  label: string;
  when: PhaseWhen;
  /** 示意时长(毫秒)。演示数据,非官方测量值 */
  ms: number;
  /** 游标停在本段时的说明 */
  note: string;
}

export interface WarmMode {
  id: WarmModeId;
  /** 控件与画布标题里展示的方式名 */
  label: string;
  /** 方式要点:解释这条时间线回答什么问题 */
  note: string;
  phases: WarmPhase[];
}

/** 三段成本:前两段是进程级(预热挪走),第三段是会话级(prewarm 留到 claim) */
const SPAWN: Omit<WarmPhase, "when"> = {
  id: "spawn",
  label: "spawn 子进程",
  ms: 300,
  note: "拉起 SDK 捆绑的 claude CLI 原生二进制",
};
const HANDSHAKE: Omit<WarmPhase, "when"> = {
  id: "handshake",
  label: "initialize 握手",
  ms: 500,
  note: "SDK 与子进程完成 initialize 握手,进程就绪",
};
const SESSION: Omit<WarmPhase, "when"> = {
  id: "session",
  label: "会话级初始化",
  ms: 400,
  note: "cwd、SessionStart hooks、stdio MCP server、CLAUDE.md 与 git 上下文",
};

function withWhen(base: Omit<WarmPhase, "when">, when: PhaseWhen): WarmPhase {
  return { ...base, when };
}

export const WARM_MODES: Record<WarmModeId, WarmMode> = {
  cold: {
    id: "cold",
    label: "直接 query()",
    note: "请求到达才开始拉进程:三段成本全部落在用户等待里",
    phases: [
      withWhen(SPAWN, "request"),
      withWhen(HANDSHAKE, "request"),
      withWhen(SESSION, "request"),
    ],
  },
  startup: {
    id: "startup",
    label: "startup()",
    note: "工作目录已知:启动时完成 spawn 与握手,请求到达直接 warm.query()",
    phases: [withWhen(SPAWN, "boot"), withWhen(HANDSHAKE, "boot")],
  },
  prewarm: {
    id: "prewarm",
    label: "prewarm()",
    note: "工作目录未知:进程级两段提前,会话级初始化留到 claim() 时",
    phases: [
      withWhen(SPAWN, "boot"),
      withWhen(HANDSHAKE, "boot"),
      withWhen(SESSION, "request"),
    ],
  },
};

export interface WarmSnapshot {
  modeLabel: string;
  phaseLabel: string;
  userWaitReadout: string;
  bootReadout: string;
}

export function buildSnapshot(mode: WarmMode, position: number): WarmSnapshot {
  const totalMs = mode.phases.reduce((sum, item) => sum + item.ms, 0);
  const bootMs = mode.phases
    .filter((item) => item.when === "boot")
    .reduce((sum, item) => sum + item.ms, 0);
  const requestMs = totalMs - bootMs;
  const cursorMs = (Math.max(0, Math.min(100, position)) / 100) * totalMs;

  // 游标当前所在段:逐段累加,找到第一个未走完的
  let elapsed = 0;
  let currentPhase = mode.phases[mode.phases.length - 1];
  for (const item of mode.phases) {
    if (cursorMs < elapsed + item.ms) {
      currentPhase = item;
      break;
    }
    elapsed += item.ms;
  }
  const atEnd = cursorMs >= totalMs;

  const whenText = currentPhase.when === "boot" ? "应用启动时" : "请求中";
  const phaseLabel = atEnd
    ? "已就绪,可发 prompt"
    : `${whenText} · ${currentPhase.label}`;

  // 关键路径上已流逝的时间 = 游标越过启动段之后的部分
  const userWaitMs = Math.max(0, Math.min(requestMs, cursorMs - bootMs));
  const userWaitReadout = requestMs
    ? `${Math.round(userWaitMs)} ms / 共 ${requestMs} ms`
    : "0 ms · 请求零等待";

  const bootReadout = bootMs
    ? `${bootMs} ms(启动时完成)`
    : "无,全部在请求时支付";

  return { modeLabel: mode.label, phaseLabel, userWaitReadout, bootReadout };
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:预热时间线面板(Canvas 演示载体)                           */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const WHEN_COLORS: Record<PhaseWhen, string> = {
  boot: "#2563eb",
  request: "#d97706",
};

export interface WarmTimelineOptions {
  mode: WarmModeId;
  /** 时间进度,0-100 */
  position: number;
}

export interface WarmTimelineInstance {
  update(options: WarmTimelineOptions): void;
  dispose(): void;
}

export function createProcessModelDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WarmSnapshot) => void,
): WarmTimelineInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: WarmTimelineOptions = { mode: "prewarm", position: 78 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const mode = WARM_MODES[current.mode];
    const snapshot = buildSnapshot(mode, current.position);
    const margin = 16;
    const totalMs = mode.phases.reduce((sum, item) => sum + item.ms, 0);

    // 标题与方式要点
    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`预热时间线:${mode.label}(演示数据)`, margin, 24);
    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(truncate(mode.note, 70), margin, 41);

    // 图例:两种时段归属
    const legendY = 62;
    const legendItems: Array<[PhaseWhen, string]> = [
      ["boot", "应用启动时(离线)"],
      ["request", "请求关键路径(用户等待)"],
    ];
    let legendX = margin;
    for (const [when, text] of legendItems) {
      ctx.fillStyle = WHEN_COLORS[when];
      ctx.fillRect(legendX, legendY - 8, 10, 10);
      ctx.fillStyle = "#334155";
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(text, legendX + 14, legendY);
      legendX += 14 + ctx.measureText(text).width + 18;
    }

    // 时间条:按示意时长比例分段,启动段在前、请求段在后
    const barY = 84;
    const barHeight = 52;
    const barWidth = width - margin * 2;
    let nextX = margin;
    const segments = mode.phases.map((item) => {
      const segment = { phase: item, x: nextX, width: (item.ms / totalMs) * barWidth };
      nextX += segment.width;
      return segment;
    });

    for (const segment of segments) {
      ctx.fillStyle = WHEN_COLORS[segment.phase.when];
      ctx.fillRect(segment.x, barY, segment.width, barHeight);
      // 段间分隔线
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(segment.x, barY, 2, barHeight);
      // 段内文字:阶段名 + 示意时长
      const centerX = segment.x + segment.width / 2;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(segment.phase.label, centerX, barY + 22);
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(`${segment.phase.ms} ms`, centerX, barY + 40);
      ctx.textAlign = "left";
    }

    // 游标:随「时间进度」移动
    const cursorX = margin + (current.position / 100) * barWidth;
    ctx.fillStyle = "#172033";
    ctx.fillRect(cursorX - 1, barY - 8, 2, barHeight + 16);
    ctx.beginPath();
    ctx.moveTo(cursorX - 5, barY - 12);
    ctx.lineTo(cursorX + 5, barY - 12);
    ctx.lineTo(cursorX, barY - 6);
    ctx.closePath();
    ctx.fill();

    // 时间条下方:两段归属标签,对齐各自区段
    const bootWidth = segments
      .filter((segment) => segment.phase.when === "boot")
      .reduce((sum, segment) => sum + segment.width, 0);
    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    if (bootWidth > 0) {
      ctx.fillText("应用启动时", margin, barY + barHeight + 18);
    }
    if (bootWidth < barWidth) {
      ctx.fillText("请求到达后", margin + bootWidth, barY + barHeight + 18);
    }

    // 当前阶段的说明
    const activeSegment = segments.find(
      (segment) => cursorX >= segment.x && cursorX < segment.x + segment.width,
    );
    const noteText =
      current.position >= 100
        ? "进程与会话就绪,prompt 可以开始处理"
        : (activeSegment?.phase.note ?? mode.phases[0].note);
    ctx.fillStyle = "#334155";
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(truncate(noteText, 84), margin, barY + barHeight + 42);

    emit(snapshot);
  }

  function truncate(text: string, maxChars: number): string {
    return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options: WarmTimelineOptions) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
