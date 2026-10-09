/*
 * 演示:一轮 agent 任务的事件时间线回放。
 * 输入:三个预设任务场景(改一个文件、命令失败再重试、派子代理探查)。
 * 操作:切换场景,观察事件按触发顺序排列、按触发节奏着色、子代理内事件带 agent_id。
 * 预期:每轮必经 UserPromptSubmit → … → Stop(或 StopFailure);每次工具调用夹着
 *       PreToolUse 与 PostToolUse / PostToolUseFailure;子代理被 SubagentStart /
 *       SubagentStop 包住,其内部事件输入带 agent_id。
 * 阅读主线:上半部分是事件时序数据(纯演示数据;事件名与字段对应官方 HookEvent /
 *           HookInput 类型,只覆盖正文讲到的分支);下半部分是 Canvas 渲染外壳。
 *           全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:三个场景的事件时序数据                                     */
/* ------------------------------------------------------------------ */

export type TimelineScenarioId = "edit-file" | "bash-failure" | "subagent";

/** 触发节奏:每会话 / 每轮 / 每次工具调用 / 子代理生命周期 */
export type TimelineCadence = "session" | "turn" | "tool" | "subagent";

export interface TimelineEntry {
  /** 事件名,对应官方 HookEvent 联合类型的成员 */
  event: string;
  cadence: TimelineCadence;
  /** 关键输入要点(演示值,字段名与官方输入类型一致) */
  detail: string;
  /** 是否发生在子代理内部(输入带 agent_id / agent_type) */
  inSubagent?: boolean;
}

export interface TimelineScenario {
  id: TimelineScenarioId;
  /** 画布标题与选项文案里展示的场景名 */
  label: string;
  /** 场景要点:解释这条时间线回答什么问题 */
  note: string;
  entries: TimelineEntry[];
}

export const TIMELINE_SCENARIOS: Record<TimelineScenarioId, TimelineScenario> = {
  "edit-file": {
    id: "edit-file",
    label: "改一个文件",
    note: "放行面已配好(Read 免批,Edit 由 acceptEdits 自动接受),全程无权限提示;",
    entries: [
      {
        event: "SessionStart",
        cadence: "session",
        detail: 'source: "startup"',
      },
      {
        event: "UserPromptSubmit",
        cadence: "turn",
        detail: 'prompt: "修复 utils.py 的除零错误"',
      },
      {
        event: "PreToolUse",
        cadence: "tool",
        detail: 'Read · tool_input: { file_path: "utils.py" }',
      },
      {
        event: "PostToolUse",
        cadence: "tool",
        detail: "Read · tool_response: 文件内容",
      },
      {
        event: "PreToolUse",
        cadence: "tool",
        detail: 'Edit · tool_input: { file_path: "utils.py" }',
      },
      {
        event: "PostToolUse",
        cadence: "tool",
        detail: "Edit · tool_response: 已应用修改",
      },
      {
        event: "Stop",
        cadence: "turn",
        detail: 'stop_hook_active: false · last_assistant_message: "已修复…"',
      },
    ],
  },
  "bash-failure": {
    id: "bash-failure",
    label: "命令失败再重试",
    note: "同一工具的失败与成功走不同事件:失败是 PostToolUseFailure,成功才是 PostToolUse;",
    entries: [
      {
        event: "SessionStart",
        cadence: "session",
        detail: 'source: "startup"',
      },
      {
        event: "UserPromptSubmit",
        cadence: "turn",
        detail: 'prompt: "跑测试,失败就修"',
      },
      {
        event: "PreToolUse",
        cadence: "tool",
        detail: 'Bash · tool_input: { command: "npm test" }',
      },
      {
        event: "PostToolUseFailure",
        cadence: "tool",
        detail: 'Bash · error: "Command failed with exit code 1"',
      },
      {
        event: "PreToolUse",
        cadence: "tool",
        detail: 'Edit · tool_input: { file_path: "src/sum.js" }',
      },
      {
        event: "PostToolUse",
        cadence: "tool",
        detail: "Edit · tool_response: 已应用修改",
      },
      {
        event: "PreToolUse",
        cadence: "tool",
        detail: 'Bash · tool_input: { command: "npm test" }',
      },
      {
        event: "PostToolUse",
        cadence: "tool",
        detail: "Bash · tool_response: 测试全部通过",
      },
      {
        event: "Stop",
        cadence: "turn",
        detail: "stop_hook_active: false",
      },
    ],
  },
  subagent: {
    id: "subagent",
    label: "派子代理探查",
    note: "SubagentStart / SubagentStop 包住子代理自己的工具事件,后者输入带 agent_id;",
    entries: [
      {
        event: "SessionStart",
        cadence: "session",
        detail: 'source: "startup"',
      },
      {
        event: "UserPromptSubmit",
        cadence: "turn",
        detail: 'prompt: "探查 src 目录结构并总结"',
      },
      {
        event: "PreToolUse",
        cadence: "tool",
        detail: 'Agent · tool_input: { subagent_type: "Explore" }',
      },
      {
        event: "SubagentStart",
        cadence: "subagent",
        detail: 'agent_id: "agent_01" · agent_type: "Explore"',
      },
      {
        event: "PreToolUse",
        cadence: "tool",
        detail: 'Glob · tool_input: { pattern: "src/**/*.ts" }',
        inSubagent: true,
      },
      {
        event: "PostToolUse",
        cadence: "tool",
        detail: "Glob · tool_response: 匹配文件列表",
        inSubagent: true,
      },
      {
        event: "SubagentStop",
        cadence: "subagent",
        detail: 'agent_id: "agent_01" · agent_transcript_path: …',
      },
      {
        event: "PostToolUse",
        cadence: "tool",
        detail: "Agent · tool_response: 子代理的总结",
      },
      {
        event: "Stop",
        cadence: "turn",
        detail: "stop_hook_active: false",
      },
    ],
  },
};

export const CADENCE_LABELS: Record<TimelineCadence, string> = {
  session: "会话",
  turn: "轮次",
  tool: "每次工具调用",
  subagent: "子代理",
};

/** 读数面板用的一行摘要(供 stories 的 readout 直接显示) */
export interface TimelineSnapshot {
  countReadout: string;
  endReadout: string;
  subagentReadout: string;
}

export function buildSnapshot(scenario: TimelineScenario): TimelineSnapshot {
  const last = scenario.entries[scenario.entries.length - 1];
  const subagentCount = scenario.entries.filter((entry) => entry.inSubagent).length;

  return {
    countReadout: `${scenario.entries.length} 个`,
    endReadout: `${last.event} · ${CADENCE_LABELS[last.cadence]}`,
    subagentReadout: subagentCount
      ? `${subagentCount} 个 · 输入带 agent_id`
      : "无",
  };
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:事件时间线面板(Canvas 演示载体)                          */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

/** 四种触发节奏的着色(与画布下方图例一一对应) */
const CADENCE_COLORS: Record<TimelineCadence, string> = {
  session: "#2563eb",
  turn: "#7c3aed",
  tool: "#0d9488",
  subagent: "#d97706",
};

export interface TimelineOptions {
  scenario: TimelineScenarioId;
}

export interface TimelineInstance {
  update(options: TimelineOptions): void;
  dispose(): void;
}

export function createHooksTimelineDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TimelineSnapshot) => void,
): TimelineInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: TimelineOptions = { scenario: "edit-file" };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const scenario = TIMELINE_SCENARIOS[current.scenario];
    const margin = 16;
    const titleTop = 24;

    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`事件时间线:${scenario.label}(演示数据)`, margin, titleTop);

    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      truncate(`${scenario.note}事件名与字段对应官方 HookEvent / HookInput 类型`, 72),
      margin,
      titleTop + 17,
    );

    // 图例:四种触发节奏
    const legendTop = titleTop + 34;
    let legendX = margin;
    (Object.keys(CADENCE_LABELS) as TimelineCadence[]).forEach((cadence) => {
      ctx.fillStyle = CADENCE_COLORS[cadence];
      ctx.fillRect(legendX, legendTop - 8, 10, 10);
      ctx.fillStyle = "#334155";
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(CADENCE_LABELS[cadence], legendX + 14, legendTop);
      legendX += 14 + ctx.measureText(CADENCE_LABELS[cadence]).width + 18;
    });

    // 事件行:按触发顺序排列;结束行(最后一条)加底色强调
    const listTop = legendTop + 12;
    const rowHeight = (height - listTop - 8) / scenario.entries.length;

    scenario.entries.forEach((entry, index) => {
      const rowTop = listTop + index * rowHeight;
      const isEnd = index === scenario.entries.length - 1;
      const color = CADENCE_COLORS[entry.cadence];

      if (isEnd) {
        ctx.fillStyle = "#eef2ff";
        roundRect(margin, rowTop + 1, width - margin * 2, rowHeight - 2, 6);
        ctx.fill();
      }

      ctx.fillStyle = color;
      ctx.fillRect(margin + 4, rowTop + 3, 4, rowHeight - 6);

      const baseX = margin + (entry.inSubagent ? 40 : 18);
      ctx.fillStyle = "#334155";
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      const nameText = entry.inSubagent
        ? `${entry.event}(子代理内)`
        : entry.event;
      ctx.fillText(nameText, baseX, rowTop + rowHeight * 0.42);

      ctx.fillStyle = "#64748b";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(
        truncate(entry.detail, Math.floor((width - baseX - 16) / 6.2)),
        baseX,
        rowTop + rowHeight * 0.82,
      );
    });

    emit(buildSnapshot(scenario));
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
    update(options: TimelineOptions) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
