/*
 * 演示:一次委派任务在主代理与子代理两个上下文里各留下什么、回传什么。
 * 输入:子代理的三种结束方式(正常完成、轮次上限、API 错误)+ 是否后台运行。
 * 操作:切换"子代理结束方式"与"后台运行",对照左右两列消息条目。
 * 预期:子代理的读文件、检索等过程条目永远只留在右列;左列只出现委派与回传——
 *       正常完成回传最终回复,轮次上限回传 partial 结果(带 agentId,可恢复),
 *       API 错误则没有结果投递;后台运行时主代理不等结果、继续自己的条目。
 * 阅读主线:上半部分是两个上下文的消息条目数据(纯演示数据;字段名对应官方
 *           AgentDefinition 与 Agent 工具输入,只覆盖正文讲到的分支);下半部分
 *           是 Canvas 渲染外壳。全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:两个上下文的消息条目数据                                    */
/* ------------------------------------------------------------------ */

export type ScenarioId = "success" | "max-turns" | "api-error";

export interface ScenarioInfo {
  id: ScenarioId;
  /** 选项与标题里展示的场景名 */
  label: string;
  /** 场景要点:这条分支回答什么问题 */
  note: string;
}

export const SCENARIOS: Record<ScenarioId, ScenarioInfo> = {
  success: {
    id: "success",
    label: "正常完成",
    note: "只有最终回复回传主代理,过程细节全部留在子上下文;",
  },
  "max-turns": {
    id: "max-turns",
    label: "轮次上限",
    note: "达到 AgentDefinition.maxTurns,输出标记 partial,可用 agentId 恢复续跑;",
  },
  "api-error": {
    id: "api-error",
    label: "API 错误",
    note: "以 API 错误(如 rate limit)结束的子代理,结果永远不会投递;",
  },
};

/** 条目类型决定颜色:橙=回传/结束落点,红=异常,其余只留在各自上下文 */
export type EntryKind =
  | "base" // 子代理的固定底座:系统提示词 + CLAUDE.md + 工具
  | "user" // 用户输入或委派 prompt
  | "delegate" // 主代理发起的 Agent 工具调用
  | "tool" // 工具调用或结果
  | "text" // 一段 assistant 文字
  | "wait" // 主代理等待结果
  | "final" // 子代理最终回复 / 主代理收到的回传
  | "partial" // partial 结果
  | "error"; // 异常结束

export interface ContextEntry {
  kind: EntryKind;
  text: string;
}

/** 主代理上下文的条目:委派、(后台时)继续干活、结果落点 */
export function buildParentEntries(
  scenario: ScenarioId,
  runInBackground: boolean,
): ContextEntry[] {
  const entries: ContextEntry[] = [
    { kind: "user", text: 'prompt: "审查 src/auth/ 的安全问题,只汇报高危问题"' },
    {
      kind: "delegate",
      text: runInBackground
        ? 'Tool: Agent { subagent_type: "code-reviewer" } — 省略 run_in_background,默认后台'
        : 'Tool: Agent { subagent_type: "code-reviewer", run_in_background: false }',
    },
  ];
  if (runInBackground) {
    entries.push({
      kind: "text",
      text: "后台审查中,我先整理模块依赖图……(主代理继续自己的活)",
    });
    entries.push({ kind: "tool", text: "Read package.json" });
  } else {
    entries.push({ kind: "wait", text: "等待子代理——需要结果才能继续" });
  }
  if (scenario === "success") {
    entries.push({
      kind: "final",
      text: 'tool_result(Agent): "发现 2 个高危问题:token.ts 硬编码 API key……"',
    });
    entries.push({ kind: "text", text: "审查完成:高危 2 个,建议先轮换泄露的密钥……" });
  } else if (scenario === "max-turns") {
    entries.push({
      kind: "partial",
      text: "tool_result(Agent): partial 结果 · agentId: agent_01 · 可恢复续跑",
    });
  } else {
    entries.push({
      kind: "error",
      text: "tool_result(Agent): 子代理以 API 错误结束 · 结果不会投递",
    });
  }
  return entries;
}

/** 子代理上下文的条目:固定底座 + 委派 prompt + 自己的过程与结束方式 */
export function buildSubagentEntries(scenario: ScenarioId): ContextEntry[] {
  const entries: ContextEntry[] = [
    {
      kind: "base",
      text: "底座:code-reviewer 的 prompt(系统提示词)· CLAUDE.md · 工具 Read / Grep / Glob",
    },
    { kind: "user", text: 'Agent 委派 prompt: "审查 src/auth/ 的安全问题"' },
    { kind: "tool", text: "Read src/auth/token.ts" },
    { kind: "tool", text: 'Grep pattern: "api.?key"' },
  ];
  if (scenario === "success") {
    entries.push({ kind: "final", text: "最终回复:完整审查报告——只有它回传主代理" });
  } else if (scenario === "max-turns") {
    entries.push({
      kind: "partial",
      text: "达到 maxTurns · 输出标记 partial · agentId: agent_01",
    });
  } else {
    entries.push({ kind: "error", text: "API 错误(如 rate limit)· 运行提前结束" });
  }
  return entries;
}

/** 读数面板用的一行摘要(供 stories 的 readout 直接显示) */
export interface SubagentsSnapshot {
  parentReadout: string;
  subagentReadout: string;
  returnedReadout: string;
}

export function buildSnapshot(
  parentEntries: ContextEntry[],
  subagentEntries: ContextEntry[],
  scenario: ScenarioId,
  runInBackground: boolean,
): SubagentsSnapshot {
  const returned =
    scenario === "success"
      ? "最终回复(审查报告)"
      : scenario === "max-turns"
        ? "partial 结果 · 可恢复"
        : "无 · 结果不投递";
  return {
    parentReadout: `${parentEntries.length} 条 · ${
      runInBackground ? "委派后继续其他工作" : "等待结果"
    }`,
    subagentReadout: `${subagentEntries.length} 条 · 过程只留在这里`,
    returnedReadout: returned,
  };
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:双上下文对照面板(Canvas 演示载体)                         */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const ENTRY_COLORS: Record<EntryKind, string> = {
  base: "#64748b",
  user: "#2563eb",
  delegate: "#7c3aed",
  tool: "#0d9488",
  text: "#334155",
  wait: "#d97706",
  final: "#ea580c",
  partial: "#d97706",
  error: "#dc2626",
};

export interface SubagentsDemoOptions {
  scenario: ScenarioId;
  runInBackground: boolean;
}

export interface SubagentsInstance {
  update(options: SubagentsDemoOptions): void;
  dispose(): void;
}

export function createSubagentsContextDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SubagentsSnapshot) => void,
): SubagentsInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: SubagentsDemoOptions = {
    scenario: "success",
    runInBackground: true,
  };

  function drawColumn(
    x: number,
    columnWidth: number,
    header: string,
    entries: ContextEntry[],
    listTop: number,
    rowHeight: number,
  ) {
    // 列标题
    ctx.fillStyle = "#e2e8f0";
    roundRect(x, listTop - 26, columnWidth, 20, 4);
    ctx.fill();
    ctx.fillStyle = "#172033";
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(header, x + 8, listTop - 11);

    entries.forEach((entry, index) => {
      const rowTop = listTop + index * rowHeight;
      const color = ENTRY_COLORS[entry.kind];

      ctx.fillStyle = color;
      ctx.fillRect(x, rowTop + 2, 4, rowHeight - 4);

      ctx.fillStyle = "#334155";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(
        truncate(entry.text, Math.floor((columnWidth - 18) / 6.2)),
        x + 12,
        rowTop + rowHeight * 0.64,
      );
    });
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const scenario = SCENARIOS[current.scenario];
    const parentEntries = buildParentEntries(
      current.scenario,
      current.runInBackground,
    );
    const subagentEntries = buildSubagentEntries(current.scenario);
    const margin = 16;
    const gap = 20;
    const columnWidth = (width - margin * 2 - gap) / 2;

    // 标题与场景要点
    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      `一次委派的双上下文对照:${scenario.label}(演示数据)`,
      margin,
      22,
    );
    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      truncate(`${scenario.note}字段名对应官方 AgentDefinition 与 Agent 工具输入`, 96),
      margin,
      39,
    );

    // 两个上下文按相同行高排列,方便左右对照
    const listTop = 64;
    const legendTop = height - 14;
    const maxRows = Math.max(parentEntries.length, subagentEntries.length);
    const rowHeight = (legendTop - 12 - listTop) / maxRows;

    drawColumn(
      margin,
      columnWidth,
      "主代理上下文",
      parentEntries,
      listTop,
      rowHeight,
    );
    drawColumn(
      margin + columnWidth + gap,
      columnWidth,
      "子代理上下文 · code-reviewer",
      subagentEntries,
      listTop,
      rowHeight,
    );

    // 图例
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "#ea580c";
    ctx.fillRect(margin, legendTop - 8, 8, 8);
    ctx.fillStyle = "#334155";
    ctx.fillText("回传 / 结果落点", margin + 12, legendTop);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(margin + 110, legendTop - 8, 8, 8);
    ctx.fillStyle = "#334155";
    ctx.fillText("异常结束", margin + 122, legendTop);
    ctx.fillStyle = "#64748b";
    ctx.fillText("其余条目只留在各自上下文", margin + 186, legendTop);

    emit(buildSnapshot(parentEntries, subagentEntries, current.scenario, current.runInBackground));
  }

  function truncate(text: string, maxChars: number): string {
    return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
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
    update(options: SubagentsDemoOptions) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
