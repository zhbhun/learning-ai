/*
 * 演示:rewindFiles 的核心模型——检查点挂在用户消息上,回退把每个文件退回
 * 那条消息发出时的状态,对话历史不受影响。
 * 输入:回退目标检查点(m1 / m2 / m3,对应三条用户消息的 uuid)。
 * 操作:拖动「回退到」切换检查点;时间线在所选检查点后画出回退分界,
 *       左下卡片给出每个文件的处置动作,右下卡片显示不变的部分。
 * 预期:回退到 m1 = 文件回到运行前(utils.ts 恢复 v0、helpers.ts 删除);
 *       回退到 m2 / m3 则保留更早轮次的改动;「对话历史」始终完整保留。
 * 阅读主线:文件上半部分是演示时间线与回退预览(教学核心,与正文 rewindFiles
 *           语义同构);下半部分是 Canvas 渲染外壳(演示载体,可略读)。
 *           全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:演示时间线与 rewindFiles 处置预览                           */
/* ------------------------------------------------------------------ */

/** 检查点锚点:每条用户消息都是一个检查点(真实场景用消息的 uuid) */
export type CheckpointId = "m1" | "m2" | "m3";

export interface DemoUserMessage {
  kind: "user";
  id: CheckpointId;
  text: string;
}

export interface DemoFileEvent {
  kind: "file";
  tool: "Write" | "Edit";
  file: string;
  /** 该改动由哪条用户消息触发 */
  after: CheckpointId;
  /** 改动后的内容版本标记 */
  version: string;
}

export type DemoEvent = DemoUserMessage | DemoFileEvent;

/** 初始磁盘状态:只有 utils.ts,helpers.ts 尚不存在 */
export const INITIAL_FILES: Record<string, string> = {
  "utils.ts": "v0",
};

/** 场景:三轮对话各带来一些文件改动,之后反悔,选一个检查点回退。 */
export function buildDemoTimeline(): DemoEvent[] {
  return [
    { kind: "user", id: "m1", text: "给 utils.ts 的 getData 加上缓存" },
    { kind: "file", tool: "Edit", file: "utils.ts", after: "m1", version: "v1" },
    { kind: "user", id: "m2", text: "把公共函数拆到 helpers.ts" },
    { kind: "file", tool: "Write", file: "helpers.ts", after: "m2", version: "v1" },
    { kind: "file", tool: "Edit", file: "utils.ts", after: "m2", version: "v2" },
    { kind: "user", id: "m3", text: "缓存配置挪进 helpers.ts" },
    { kind: "file", tool: "Edit", file: "helpers.ts", after: "m3", version: "v2" },
    { kind: "file", tool: "Edit", file: "utils.ts", after: "m3", version: "v3" },
  ];
}

export const CHECKPOINTS: CheckpointId[] = ["m1", "m2", "m3"];

export interface FileRow {
  file: string;
  /** 当前磁盘版本 */
  current: string | null;
  /** 检查点发出时的版本,null 表示当时还不存在 */
  atCheckpoint: string | null;
  /** rewindFiles 对该文件的处置动作 */
  action: string;
}

/**
 * 与正文 rewindFiles 语义同构:回退到某条用户消息 = 把每个文件恢复到
 * 该消息发出时的状态——其后创建的文件删除,其后修改的文件恢复;
 * 时间线(对话)不参与。
 */
export function previewRewind(target: CheckpointId): FileRow[] {
  const timeline = buildDemoTimeline();

  // 重放到目标检查点(不含)为止,得到"该消息发出时"的文件状态
  const atCheckpoint: Record<string, string> = { ...INITIAL_FILES };
  for (const event of timeline) {
    if (event.kind === "user" && event.id === target) {
      break;
    }
    if (event.kind === "file") {
      atCheckpoint[event.file] = event.version;
    }
  }

  // 重放全部文件事件,得到当前磁盘状态
  const current: Record<string, string> = { ...INITIAL_FILES };
  for (const event of timeline) {
    if (event.kind === "file") {
      current[event.file] = event.version;
    }
  }

  const rows: FileRow[] = [];
  for (const file of Object.keys(current)) {
    const now = current[file] ?? null;
    const then = atCheckpoint[file] ?? null;
    let action: string;
    if (now !== null && then === null) {
      action = "删除(检查点后才创建)";
    } else if (now !== then) {
      action = `恢复到 ${then}`;
    } else {
      action = "无变化";
    }
    rows.push({ file, current: now, atCheckpoint: then, action });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:时间线 + 回退分界 + 文件处置卡片(演示载体)                 */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const CHECKPOINT_COLOR = "#4f7cff";
const FILE_COLOR = "#159570";
const ROLLBACK_COLOR = "#dc2626";
const ACTION_COLORS: Record<string, string> = {
  删除: "#dc2626",
  恢复: "#b45309",
  无: "#64748b",
};

export interface DemoOptions {
  /** 回退到第几个检查点:0=m1(初始)、1=m2、2=m3 */
  checkpoint: number;
}

export interface DemoSnapshot {
  /** 回退目标,如 m2:「把公共函数拆到 helpers.ts」 */
  target: string;
  /** utils.ts 的处置,如 "v3 → 恢复到 v1" */
  utilsFile: string;
  /** helpers.ts 的处置,如 "v1 → 删除" */
  helpersFile: string;
  /** 对话历史读数 */
  conversation: string;
}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

const TARGET_LABELS: Record<CheckpointId, string> = {
  m1: "m1(初始状态)",
  m2: "m2",
  m3: "m3",
};

export function createFileCheckpointingDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = { checkpoint: 0 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(420, size.width);
    const height = Math.max(348, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 28;
    const innerWidth = width - margin * 2;
    const timeline = buildDemoTimeline();
    const checkpointIndex = Math.max(
      0,
      Math.min(CHECKPOINTS.length - 1, Math.round(current.checkpoint)),
    );
    const target = CHECKPOINTS[checkpointIndex];
    const rows = previewRewind(target);
    const targetPos = timeline.findIndex(
      (event) => event.kind === "user" && event.id === target,
    );

    // 标题与场景
    ctx.fillStyle = "#172033";
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("文件检查点回放:回退到不同检查点,文件各变成什么(演示数据)", margin, 32);
    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      "场景:三轮对话各带来文件改动,之后反悔——rewindFiles 只把文件退回检查点,对话原样保留",
      margin,
      52,
    );

    // 时间线:检查点(用户消息)蓝色 / 文件改动绿色
    const blockTop = 72;
    const blockHeight = 30;
    const gap = 6;
    const blockWidth = (innerWidth - gap * (timeline.length - 1)) / timeline.length;

    timeline.forEach((event, index) => {
      const x = margin + index * (blockWidth + gap);
      const isCheckpoint = event.kind === "user";
      const isTarget = isCheckpoint && index === targetPos;
      const isRolledBack = !isCheckpoint && index > targetPos;

      ctx.fillStyle = isCheckpoint ? CHECKPOINT_COLOR : FILE_COLOR;
      roundRect(x, blockTop, blockWidth, blockHeight, 6);
      ctx.fill();

      if (isTarget) {
        ctx.strokeStyle = "#172033";
        ctx.lineWidth = 2;
        roundRect(x, blockTop - 3, blockWidth, blockHeight + 6, 6);
        ctx.stroke();
      }
      if (isRolledBack) {
        ctx.strokeStyle = ROLLBACK_COLOR;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        roundRect(x, blockTop, blockWidth, blockHeight, 6);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "9.5px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      const label = isCheckpoint
        ? (event as DemoUserMessage).id
        : (event as DemoFileEvent).tool;
      ctx.fillText(label, x + blockWidth / 2, blockTop + blockHeight / 2 + 3);
      ctx.textAlign = "left";
    });

    // 回退分界:所选检查点与其后文件改动之间
    const dividerX =
      margin + (targetPos + 1) * (blockWidth + gap) - gap / 2;
    ctx.strokeStyle = "#172033";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(dividerX, blockTop - 8);
    ctx.lineTo(dividerX, blockTop + blockHeight + 8);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#172033";
    ctx.font = "10.5px ui-sans-serif, system-ui, sans-serif";
    const captionX = Math.max(
      margin,
      Math.min(dividerX - 62, width - margin - 126),
    );
    ctx.fillText("┆ 其后文件改动被回退", captionX, blockTop + blockHeight + 22);

    // 双卡片:左 = 文件处置(回退预览),右 = 不变的部分
    const cardTop = 136;
    const cardHeight = height - cardTop - 18;
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

    // 左卡片:文件处置
    ctx.fillStyle = "#172033";
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("文件处置(回退预览)", margin + 16, cardTop + 24);

    rows.forEach((row, rowIndex) => {
      const rowTop = cardTop + 50 + rowIndex * 46;
      ctx.fillStyle = "#172033";
      ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(row.file, margin + 18, rowTop);
      ctx.fillStyle = "#64748b";
      ctx.font = "10.5px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(`现在 ${row.current ?? "不存在"}`, margin + 110, rowTop);

      const actionKind = row.action.startsWith("删除")
        ? "删除"
        : row.action.startsWith("恢复")
          ? "恢复"
          : "无";
      ctx.fillStyle = ACTION_COLORS[actionKind];
      ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(
        actionKind === "无" ? "无变化" : row.action,
        margin + 18,
        rowTop + 18,
      );
    });

    // 右卡片:不变的部分
    const rightLeft = margin + leftWidth + cardGap;
    ctx.fillStyle = "#172033";
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("不变的部分", rightLeft + 16, cardTop + 24);
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("对话历史 m1 · m2 · m3 全部保留", rightLeft + 16, cardTop + 52);
    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("rewindFiles 只回文件、不回对话", rightLeft + 16, cardTop + 76);
    ctx.fillText("agent 仍可在此基础上继续追问", rightLeft + 16, cardTop + 94);

    // 读数
    const userEvent = timeline[targetPos] as DemoUserMessage;
    const utilsRow = rows.find((row) => row.file === "utils.ts");
    const helpersRow = rows.find((row) => row.file === "helpers.ts");
    emit({
      target: `${TARGET_LABELS[target]}:「${userEvent.text}」`,
      utilsFile: `${utilsRow?.current ?? "不存在"} → ${utilsRow?.action ?? ""}`,
      helpersFile: `${helpersRow?.current ?? "不存在"} → ${helpersRow?.action ?? ""}`,
      conversation: "m1 · m2 · m3 全部保留",
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
