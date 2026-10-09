/*
 * 演示:includePartialMessages 打开前后,同一段回答在消息流里以什么形态到达。
 * 输入:includePartialMessages 开关(Options 上的布尔配置)与流位置(回放到第几条)。
 * 操作:拨动开关对比时间线长短;开启后拖动「流位置」逐条步进,
 *       经过 text_delta / input_json_delta 时,下方累积面板逐字增长。
 * 预期:关闭时只有 system → assistant → user → assistant → result 五条完整消息;
 *       开启后 stream_event 穿插出现,完整 assistant 消息照常到达,
 *       并且总在对应块的 content_block_stop 之前。
 * 阅读主线:文件上半部分是事件序列的数据与构造,是本演示的教学核心;下半部分是
 *           Canvas 渲染外壳(演示载体,可略读)。全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:演示事件序列与累积器(对照正文「打开增量流」的顺序表)     */
/* ------------------------------------------------------------------ */

export type DemoKind = "system" | "event" | "assistant" | "user" | "result";

export interface DemoItem {
  kind: DemoKind;
  /** stream_event 的原始事件类型;其余消息为 null */
  eventType: string | null;
  /** delta 类型:text_delta / input_json_delta;非增量事件为 null */
  deltaType: string | null;
  /** text_delta 携带的文本片段(演示值) */
  textChunk: string;
  /** input_json_delta 携带的 JSON 字符串片段(演示值) */
  jsonChunk: string;
  /** content_block_start(tool_use) 携带的工具名 */
  toolName: string | null;
  /** 所属轮次;开场与收尾为 null */
  turn: number | null;
  /** 卡片标题 */
  title: string;
  /** 卡片中的关键载荷行(演示值) */
  lines: string[];
  /** 读数用的单行摘要 */
  summary: string;
}

/** 场景:prompt 为“读一下 README.md,再用一句话总结”,最终文本拆成 4 个增量片段。 */
const ANSWER_TEXT = "README 介绍了安装与用法:先 npm install,再用 npx tsx 运行脚本。";
const TEXT_CHUNKS = [
  "README 介绍了安装与用法:",
  "先 npm install,",
  "再用 npx tsx ",
  "运行脚本。",
];
const JSON_CHUNKS = ['{"file_path": ', '"README.md"}'];
const TOOL_NAME = "Read";

function streamEvent(
  eventType: string,
  turn: number,
  summary: string,
  lines: string[],
  extra?: Partial<Pick<DemoItem, "deltaType" | "textChunk" | "jsonChunk" | "toolName">>,
): DemoItem {
  return {
    kind: "event",
    eventType,
    deltaType: extra?.deltaType ?? null,
    textChunk: extra?.textChunk ?? "",
    jsonChunk: extra?.jsonChunk ?? "",
    toolName: extra?.toolName ?? null,
    turn,
    title: `stream_event · ${eventType}`,
    lines,
    summary,
  };
}

export function buildDemoStream(includePartial: boolean): DemoItem[] {
  const stream: DemoItem[] = [
    {
      kind: "system",
      eventType: null,
      deltaType: null,
      textChunk: "",
      jsonChunk: "",
      toolName: null,
      turn: null,
      title: "system · init",
      lines: [
        'subtype: "init"  →  会话启动,流的第一条',
        'session_id: "9f2c8a…"   model: "claude-sonnet-4-5"',
        "(两种形态都以它开场)",
      ],
      summary: "会话元数据:session_id、model",
    },
  ];

  const assistantToolUse: DemoItem = {
    kind: "assistant",
    eventType: null,
    deltaType: null,
    textChunk: "",
    jsonChunk: "",
    toolName: TOOL_NAME,
    turn: 1,
    title: "assistant · 完整 tool_use 块",
    lines: [
      "message.content[0] → tool_use 块",
      'name: "Read"   input: {file_path: "README.md"}',
      includePartial ? "完整消息照常产出,在本块 content_block_stop 之前" : "块生成完才产出",
    ],
    summary: includePartial ? "完整 tool_use 块(stop 之前到达)" : "完整 tool_use 块:Read",
  };

  const userToolResult: DemoItem = {
    kind: "user",
    eventType: null,
    deltaType: null,
    textChunk: "",
    jsonChunk: "",
    toolName: null,
    turn: 1,
    title: "user · 工具结果",
    lines: [
      "message.content[0] → tool_result 块",
      'tool_use_id: "toolu_01…" ← 对应上面的调用',
      'content: "README.md 全文…"(SDK 执行后回传)',
    ],
    summary: "回传工具结果:README.md 全文",
  };

  const assistantText: DemoItem = {
    kind: "assistant",
    eventType: null,
    deltaType: null,
    textChunk: "",
    jsonChunk: "",
    toolName: null,
    turn: 2,
    title: "assistant · 完整 text 块",
    lines: [
      "message.content[0] → text 块",
      `text: "${ANSWER_TEXT}"`,
      includePartial ? "与已累积文本一致,在本块 stop 之前到达" : "整段生成完才到达",
    ],
    summary: includePartial ? "完整 text 块(stop 之前到达)" : "完整 text 块(整段到达)",
  };

  const resultItem: DemoItem = {
    kind: "result",
    eventType: null,
    deltaType: null,
    textChunk: "",
    jsonChunk: "",
    toolName: null,
    turn: null,
    title: "result · success",
    lines: [
      'subtype: "success"   is_error: false',
      `result: "${ANSWER_TEXT}"`,
      "num_turns: 2   total_cost_usd: 0.0142(演示值)",
    ],
    summary: "循环结束:success",
  };

  if (!includePartial) {
    // 关闭(默认):流里只有完整消息,等块生成完才逐条产出
    stream.push(assistantToolUse, userToolResult, assistantText, resultItem);
    return stream;
  }

  // ── turn 1:工具调用块的流式事件 ──
  stream.push(
    streamEvent("message_start", 1, "stream_event · 一轮响应开始", [
      'event.type: "message_start"',
      "一轮响应开始,之后是块级事件",
    ]),
    streamEvent("content_block_start", 1, "stream_event · 工具块开始:Read", [
      'event.type: "content_block_start"',
      'content_block.type: "tool_use"',
      'name: "Read" ← 工具名在这里拿到',
    ], { toolName: TOOL_NAME }),
    streamEvent(
      "content_block_delta",
      1,
      `stream_event · 工具输入片段 '${JSON_CHUNKS[0]}'`,
      [
        'event.type: "content_block_delta"',
        'delta.type: "input_json_delta"',
        `partial_json: '${JSON_CHUNKS[0]}'`,
        "(JSON 字符串片段,自己累积)",
      ],
      { deltaType: "input_json_delta", jsonChunk: JSON_CHUNKS[0] },
    ),
    streamEvent(
      "content_block_delta",
      1,
      `stream_event · 工具输入片段 '${JSON_CHUNKS[1]}'`,
      [
        'event.type: "content_block_delta"',
        'delta.type: "input_json_delta"',
        `partial_json: '${JSON_CHUNKS[1]}'`,
        "拼上后就是完整 JSON",
      ],
      { deltaType: "input_json_delta", jsonChunk: JSON_CHUNKS[1] },
    ),
    assistantToolUse,
    streamEvent("content_block_stop", 1, "stream_event · 工具块结束", [
      'event.type: "content_block_stop"',
      "本块结束;完整 assistant 已在前面到达",
    ]),
    streamEvent("message_delta", 1, "stream_event · 收尾:stop_reason", [
      'event.type: "message_delta"',
      'stop_reason: "end_turn"   usage 收尾信息',
    ]),
    streamEvent("message_stop", 1, "stream_event · 一轮响应结束", [
      'event.type: "message_stop"',
      "一轮响应结束;SDK 开始执行工具",
    ]),
    userToolResult,
  );

  // ── turn 2:最终文本块的流式事件 ──
  stream.push(
    streamEvent("message_start", 2, "stream_event · 一轮响应开始", [
      'event.type: "message_start"',
      "新的一轮:最终回答开始生成",
    ]),
    streamEvent("content_block_start", 2, "stream_event · 文本块开始", [
      'event.type: "content_block_start"',
      'content_block.type: "text"',
      "文本块开始,等待 text_delta",
    ]),
    ...TEXT_CHUNKS.map((chunk) =>
      streamEvent(
        "content_block_delta",
        2,
        `stream_event · 文本片段 "${chunk}"`,
        [
          'event.type: "content_block_delta"',
          'delta.type: "text_delta"',
          `delta.text: "${chunk}"`,
          "(片段,界面拿到就上屏)",
        ],
        { deltaType: "text_delta", textChunk: chunk },
      ),
    ),
    assistantText,
    streamEvent("content_block_stop", 2, "stream_event · 文本块结束", [
      'event.type: "content_block_stop"',
      "文本块结束;完整 assistant 已在前面到达",
    ]),
    streamEvent("message_delta", 2, "stream_event · 收尾:stop_reason", [
      'event.type: "message_delta"',
      'stop_reason: "end_turn"   usage 收尾信息',
    ]),
    streamEvent("message_stop", 2, "stream_event · 一轮响应结束", [
      'event.type: "message_stop"',
      "本轮结束;没有下一个块 → agent loop 收尾",
    ]),
    resultItem,
  );

  return stream;
}

export interface DemoAccumulators {
  /** 到当前位置为止,text_delta 拼出的文本 */
  text: string;
  /** 到当前位置为止,input_json_delta 拼出的工具输入 */
  toolJson: string;
  /** 当前所在工具块的工具名;不在工具块中时为 null */
  currentTool: string | null;
}

/** 回放到 position(含)为止,text_delta 与 input_json_delta 各累积出什么。 */
export function accumulateUpTo(items: DemoItem[], position: number): DemoAccumulators {
  const acc: DemoAccumulators = { text: "", toolJson: "", currentTool: null };
  for (const item of items.slice(0, position + 1)) {
    if (item.deltaType === "text_delta") {
      acc.text += item.textChunk;
    } else if (item.deltaType === "input_json_delta") {
      acc.toolJson += item.jsonChunk;
    }
    if (item.eventType === "content_block_start" && item.toolName) {
      acc.currentTool = item.toolName;
    } else if (item.eventType === "content_block_stop") {
      acc.currentTool = null;
    }
  }
  return acc;
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:时间线 + 累积面板 + 当前消息卡片(Canvas 演示载体)        */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const KIND_COLORS: Record<DemoKind, string> = {
  system: "#64748b",
  event: "#d97706",
  assistant: "#4f7cff",
  user: "#159570",
  result: "#8b5cf6",
};

const LEGEND_LABELS: Record<DemoKind, string> = {
  system: "system",
  event: "stream_event",
  assistant: "assistant",
  user: "user",
  result: "result",
};

const LEGEND_ORDER: DemoKind[] = ["event", "assistant", "user", "result", "system"];

export interface DemoOptions {
  includePartial: boolean;
  position: number;
}

export interface DemoSnapshot {
  /** clamp 后的当前序号(从 0 开始) */
  position: number;
  total: number;
  /** 当前消息/事件的读数描述 */
  current: string;
  /** 已累积文本(演示累积器) */
  text: string;
  /** 已累积工具输入 JSON 字符串(演示累积器) */
  toolJson: string;
}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

function shortLabel(item: DemoItem): string {
  if (item.kind !== "event") {
    return item.kind;
  }
  switch (item.eventType) {
    case "message_start":
      return "msg_start";
    case "content_block_start":
      return "blk_start";
    case "content_block_delta":
      return "delta";
    case "content_block_stop":
      return "blk_stop";
    case "message_delta":
      return "msg_delta";
    case "message_stop":
      return "msg_stop";
    default:
      return "event";
  }
}

function describeCurrent(item: DemoItem): string {
  if (item.kind === "event") {
    const delta = item.deltaType ? `(${item.deltaType})` : "";
    return `stream_event · ${item.eventType}${delta}`;
  }
  return item.title;
}

export function createStreamingOutputDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = { includePartial: true, position: 0 };
  let margin = 28;
  let trackWidth = 0;

  function fitText(text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let out = text;
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out}…`;
  }

  function drawAccumRow(label: string, value: string, withCursor: boolean, y: number) {
    ctx.fillStyle = "#172033";
    ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(label, margin, y);
    const labelWidth = ctx.measureText(label).width;
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#334155";
    const shown = (value || "(还没有片段)") + (withCursor ? "▍" : "");
    ctx.fillText(fitText(shown, trackWidth - labelWidth - 10), margin + labelWidth + 10, y);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    margin = 28;
    trackWidth = width - margin * 2;

    const items = buildDemoStream(current.includePartial);
    const position = Math.max(
      0,
      Math.min(items.length - 1, Math.round(current.position)),
    );
    const currentItem = items[position];
    const acc = accumulateUpTo(items, position);

    ctx.fillStyle = "#172033";
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      `流式输出回放:includePartialMessages = ${current.includePartial ? "on" : "off"}(演示数据)`,
      margin,
      32,
    );

    // 时间线:每条消息/事件一个色块,按 kind 着色
    const gap = 6;
    const blockTop = 56;
    const blockHeight = 30;
    const blockWidth = (trackWidth - gap * (items.length - 1)) / items.length;
    items.forEach((item, index) => {
      const x = margin + index * (blockWidth + gap);
      const isCurrent = index === position;
      const top = isCurrent ? blockTop - 3 : blockTop;

      ctx.fillStyle = KIND_COLORS[item.kind];
      roundRect(x, top, blockWidth, blockHeight, 6);
      ctx.fill();

      if (isCurrent) {
        ctx.strokeStyle = "#172033";
        ctx.lineWidth = 2;
        roundRect(x, top, blockWidth, blockHeight, 6);
        ctx.stroke();
      }

      if (blockWidth >= 46) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.fillText(shortLabel(item), x + blockWidth / 2, top + blockHeight / 2 + 3.5);
        ctx.textAlign = "left";
      }
    });

    // 工具轮括线:把同一 turn 的块连起来并标注
    let index = 0;
    while (index < items.length) {
      const turn = items[index].turn;
      if (turn === null) {
        index += 1;
        continue;
      }
      let end = index;
      while (end + 1 < items.length && items[end + 1].turn === turn) {
        end += 1;
      }
      const startX = margin + index * (blockWidth + gap);
      const endX = margin + end * (blockWidth + gap) + blockWidth;
      const y = blockTop + blockHeight + 12;

      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#64748b";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`turn ${turn}`, (startX + endX) / 2, y + 14);
      ctx.textAlign = "left";

      index = end + 1;
    }

    // 图例
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    let legendX = margin;
    for (const kind of LEGEND_ORDER) {
      ctx.fillStyle = KIND_COLORS[kind];
      ctx.fillRect(legendX, 126, 10, 10);
      ctx.fillStyle = "#475569";
      ctx.fillText(LEGEND_LABELS[kind], legendX + 14, 135);
      legendX += 14 + ctx.measureText(LEGEND_LABELS[kind]).width + 16;
    }

    // 累积面板:演示“自己累积”——经过一个 delta 就追加一段
    drawAccumRow("界面文本(自己累积):", acc.text, currentItem.deltaType === "text_delta", 162);
    drawAccumRow(
      "工具输入(自己累积):",
      acc.toolJson,
      currentItem.deltaType === "input_json_delta",
      186,
    );

    // 当前消息卡片
    const cardTop = 212;
    const cardLeft = margin;
    const cardWidth = width - margin * 2;
    const cardHeight = height - cardTop - 20;

    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    roundRect(cardLeft, cardTop, cardWidth, cardHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = KIND_COLORS[currentItem.kind];
    roundRect(cardLeft + 16, cardTop + 18, 10, 10, 3);
    ctx.fill();

    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`#${position + 1}  ${currentItem.title}`, cardLeft + 34, cardTop + 28);

    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#334155";
    currentItem.lines.forEach((line, lineIndex) => {
      ctx.fillText(line, cardLeft + 18, cardTop + 58 + lineIndex * 21);
    });

    emit({
      position,
      total: items.length,
      current: describeCurrent(currentItem),
      text: acc.text,
      toolJson: acc.toolJson,
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
