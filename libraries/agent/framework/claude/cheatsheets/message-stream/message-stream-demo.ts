/*
 * 演示:一条 prompt 进来后,query() 的消息流按什么顺序流动、每种类型长什么样。
 * 输入:工具轮数(0-2,agent 走几轮工具调用再给出最终回答)与流位置(回放到第几条消息)。
 * 操作:拖动「流位置」逐条步进消息,时间线高亮当前消息,卡片展示该消息的关键载荷。
 * 预期:序列总是 system(init)开场、result 收尾;每个工具轮是 assistant(tool_use) →
 *       user(tool_result) 一对;最终 assistant 只剩文本,不再有工具调用。
 * 阅读主线:文件上半部分是消息序列的数据与构造,是本演示的教学核心;下半部分是
 *           Canvas 渲染外壳(演示载体,可略读)。全部消息为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:演示消息序列(对照正文的 agent loop 五步与消息序列表)      */
/* ------------------------------------------------------------------ */

export type DemoMessageType = "system" | "assistant" | "user" | "result";

export interface DemoMessage {
  type: DemoMessageType;
  /** 卡片标题,如 "assistant · turn 1" */
  title: string;
  /** 所属工具轮;开场与结束段为 null */
  turn: number | null;
  /** 卡片中的关键载荷行(演示值) */
  lines: string[];
  /** 读数用的单行摘要 */
  summary: string;
}

/** 场景:prompt 为"跑一下测试,修好失败的那个,再确认通过"。 */
export function buildDemoMessages(toolTurns: number): DemoMessage[] {
  const messages: DemoMessage[] = [
    {
      type: "system",
      title: "system · init",
      turn: null,
      lines: [
        'subtype: "init"  →  会话启动,流的第一条',
        'session_id: "9f2c8a…"(从这里最先拿到)',
        'model: "claude-sonnet-4-5"   tools: 14 个',
        'mcp_servers: [{ name: "github", status: "connected" }]',
      ],
      summary: "会话元数据:session_id、model、tools",
    },
  ];

  if (toolTurns >= 1) {
    messages.push(
      {
        type: "assistant",
        title: "assistant · turn 1",
        turn: 1,
        lines: [
          "message.content[0] → tool_use 块",
          'name: "Bash"',
          'input: { command: "npm test" }',
          "(一次响应可有多个块,每块一条 assistant 消息)",
        ],
        summary: "请求工具:Bash(npm test)",
      },
      {
        type: "user",
        title: "user · turn 1",
        turn: 1,
        lines: [
          "message.content[0] → tool_result 块",
          'tool_use_id: "toolu_01…" ← 对应上面的调用',
          'content: "…3 failing"',
          "tool_use_result: { exitCode: 1, … }(结构化输出)",
        ],
        summary: "回传工具结果:3 个测试失败",
      },
    );
  }

  if (toolTurns >= 2) {
    messages.push(
      {
        type: "assistant",
        title: "assistant · turn 2",
        turn: 2,
        lines: [
          "message.content[0] → tool_use 块",
          'name: "Edit"',
          'input: { file_path: "src/auth.ts", … }',
        ],
        summary: "请求工具:Edit(src/auth.ts)",
      },
      {
        type: "user",
        title: "user · turn 2",
        turn: 2,
        lines: [
          "message.content[0] → tool_result 块",
          'content: "ok"(编辑已应用)',
          'tool_use_result: { filePath: "src/auth.ts", … }',
        ],
        summary: "回传工具结果:编辑已应用",
      },
    );
  }

  messages.push(
    {
      type: "assistant",
      title: "assistant · 最终回答",
      turn: null,
      lines: [
        "message.content[0] → text 块",
        'text: "已修复 auth.ts,3 个测试全部通过。"',
        "(不再有 tool_use 块 → agent loop 结束)",
      ],
      summary: "最终文本回答,无工具调用",
    },
    {
      type: "result",
      title: "result · success",
      turn: null,
      lines: [
        'subtype: "success"   is_error: false',
        'result: "已修复 auth.ts,3 个测试全部通过。"',
        "num_turns: 2   total_cost_usd: 0.0142(演示值)",
        "usage / modelUsage:token 用量   session_id: 同 init",
      ],
      summary: "循环结束:success,num_turns: 2",
    },
  );

  return messages;
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:时间线 + 当前消息卡片(Canvas 演示载体)                   */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const TYPE_COLORS: Record<DemoMessageType, string> = {
  system: "#64748b",
  assistant: "#4f7cff",
  user: "#159570",
  result: "#8b5cf6",
};

export interface DemoOptions {
  toolTurns: number;
  position: number;
}

export interface DemoSnapshot {
  /** clamp 后的当前序号(从 0 开始) */
  position: number;
  total: number;
  type: string;
  summary: string;
}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createMessageStreamDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = { toolTurns: 2, position: 0 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const toolTurns = Math.max(0, Math.min(2, Math.round(current.toolTurns)));
    const messages = buildDemoMessages(toolTurns);
    const position = Math.max(
      0,
      Math.min(messages.length - 1, Math.round(current.position)),
    );

    const margin = 28;
    const gap = 6;
    const trackWidth = width - margin * 2;
    const blockWidth = (trackWidth - gap * (messages.length - 1)) / messages.length;
    const blockTop = 64;
    const blockHeight = 34;

    ctx.fillStyle = "#172033";
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("消息流回放:一条 prompt 的完整流动(演示数据)", margin, 34);

    // 时间线:每条消息一个色块,按 type 着色
    messages.forEach((message, index) => {
      const x = margin + index * (blockWidth + gap);
      const isCurrent = index === position;

      ctx.fillStyle = TYPE_COLORS[message.type];
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
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(message.type, x + blockWidth / 2, top + blockHeight / 2 + 3.5);
      ctx.textAlign = "left";
    });

    // 工具轮括线:把同一 turn 的块连起来并标注
    let index = 0;
    while (index < messages.length) {
      const turn = messages[index].turn;
      if (turn === null) {
        index += 1;
        continue;
      }
      let end = index;
      while (end + 1 < messages.length && messages[end + 1].turn === turn) {
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

    // 当前消息卡片
    const currentMessage = messages[position];
    const cardTop = 148;
    const cardLeft = margin;
    const cardWidth = width - margin * 2;
    const cardHeight = height - cardTop - 24;

    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    roundRect(cardLeft, cardTop, cardWidth, cardHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = TYPE_COLORS[currentMessage.type];
    roundRect(cardLeft + 16, cardTop + 18, 10, 10, 3);
    ctx.fill();

    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      `#${position + 1}  ${currentMessage.title}`,
      cardLeft + 34,
      cardTop + 28,
    );

    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#334155";
    currentMessage.lines.forEach((line, lineIndex) => {
      ctx.fillText(line, cardLeft + 18, cardTop + 58 + lineIndex * 21);
    });

    emit({
      position,
      total: messages.length,
      type: currentMessage.type,
      summary: currentMessage.summary,
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
