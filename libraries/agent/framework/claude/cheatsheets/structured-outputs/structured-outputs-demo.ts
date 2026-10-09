/*
 * 演示:schema 校验与重试回放——最终输出不合规时 SDK 会做什么,三种结局分别长什么样。
 * 输入:结局场景(0 一次合规 / 1 重试后合规 / 2 重试耗尽)与尝试步进(查看第几次产出)。
 * 操作:拖动「尝试步进」逐次查看模型产出,卡片展示输出 JSON、校验结论与结局走向。
 * 预期:校验只查结构与类型(字段类型、required、嵌套层级),不查 format 注释;
 *       不合规则自动重试,某次合规则 success 并交付 structured_output,
 *       最后一次仍不合规则 error_max_structured_output_retries。
 * 阅读主线:上半部分是 schema 与三个场景的尝试序列(教学核心);下半部分是
 *           Canvas 渲染外壳(演示载体,可略读)。全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:schema 与三个结局场景的尝试序列                             */
/* ------------------------------------------------------------------ */

/** 三个场景共用的 schema:required [name, email],phone 可选 */
export const DEMO_SCHEMA_LINES = [
  "schema · required: [name, email]",
  "name: string · email: string",
  "phone: string(可选)",
];

export interface DemoAttempt {
  /** 卡片中展示的输出 JSON(逐行,演示值) */
  lines: string[];
  /** 校验结论 */
  valid: boolean;
  /** 不合规原因;valid 为 true 时为空字符串 */
  issue: string;
  /** 读数用单行摘要 */
  summary: string;
}

export interface DemoScenario {
  name: string;
  attempts: DemoAttempt[];
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    name: "一次合规",
    attempts: [
      {
        lines: [
          "{",
          '  "name": "王小明",',
          '  "email": "ming@example.com",',
          '  "phone": "13800138000"',
          "}",
        ],
        valid: true,
        issue: "",
        summary: "合规 → success,structured_output 交付",
      },
    ],
  },
  {
    name: "重试后合规",
    attempts: [
      {
        lines: [
          "{",
          '  "contact": {',
          '    "name": "王小明",',
          '    "email": "ming@example.com"',
          "  }",
          "}",
        ],
        valid: false,
        issue: "顶层缺少 required 的 name",
        summary: "嵌套层级不对,缺顶层 name",
      },
      {
        lines: ["{", '  "name": "王小明"', "}"],
        valid: false,
        issue: "缺少 required 的 email",
        summary: "缺 required 的 email",
      },
      {
        lines: ["{", '  "name": "王小明",', '  "email": "ming@example.com"', "}"],
        valid: true,
        issue: "",
        summary: "合规 → success(phone 可选,已省略)",
      },
    ],
  },
  {
    name: "重试耗尽",
    attempts: [
      {
        lines: [
          "{",
          '  "name": "王小明",',
          '  "email": "ming@example.com",',
          '  "phone": 13800138000',
          "}",
        ],
        valid: false,
        issue: "phone 是 number,要求 string",
        summary: "phone 类型不对",
      },
      {
        lines: ["{", '  "name": "王小明",', '  "phone": "13800138000"', "}"],
        valid: false,
        issue: "缺少 required 的 email",
        summary: "缺 required 的 email",
      },
      {
        lines: [
          "{",
          '  "name": ["王", "小", "明"],',
          '  "email": "ming@example.com"',
          "}",
        ],
        valid: false,
        issue: "name 是 array,要求 string",
        summary: "name 类型不对 → 重试耗尽",
      },
    ],
  },
];

/** 停在某次尝试时的结局走向 */
export function outcomeAt(scenario: DemoScenario, attemptIndex: number): string {
  const attempt = scenario.attempts[attemptIndex];
  if (attempt.valid) {
    return "success · structured_output 已交付";
  }
  if (attemptIndex === scenario.attempts.length - 1) {
    return "error_max_structured_output_retries";
  }
  return "自动重试(未到终点)";
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:schema 摘要 + 尝试时间线 + 当前尝试卡片(演示载体)         */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

export interface DemoOptions {
  scenario: number;
  attempt: number;
}

export interface DemoSnapshot {
  scenario: string;
  /** clamp 后的当前尝试序号(从 0 开始) */
  attempt: number;
  total: number;
  verdict: string;
  outcome: string;
}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createStructuredOutputsDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = { scenario: 1, attempt: 0 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(400, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const scenarioIndex = Math.max(
      0,
      Math.min(DEMO_SCENARIOS.length - 1, Math.round(current.scenario)),
    );
    const scenario = DEMO_SCENARIOS[scenarioIndex];
    const attemptIndex = Math.max(
      0,
      Math.min(scenario.attempts.length - 1, Math.round(current.attempt)),
    );
    const attempt = scenario.attempts[attemptIndex];
    const outcome = outcomeAt(scenario, attemptIndex);

    const margin = 28;

    // 标题
    ctx.fillStyle = "#172033";
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("校验与重试回放:校验器查什么,结局走向哪里(演示数据)", margin, 34);

    // schema 摘要
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#475569";
    DEMO_SCHEMA_LINES.forEach((line, index) => {
      ctx.fillText(line, margin, 58 + index * 19);
    });

    // 尝试时间线:每次模型产出一个色块,按校验结论着色
    const total = scenario.attempts.length;
    const gap = 8;
    const trackWidth = width - margin * 2;
    const blockWidth = (trackWidth - gap * (total - 1)) / total;
    const blockTop = 124;
    const blockHeight = 30;

    scenario.attempts.forEach((item, index) => {
      const x = margin + index * (blockWidth + gap);
      const isCurrent = index === attemptIndex;

      ctx.fillStyle = item.valid ? "#159570" : "#dc2626";
      const top = isCurrent ? blockTop - 3 : blockTop;
      const h = isCurrent ? blockHeight + 3 : blockHeight;
      roundRect(x, top, blockWidth, h, 6);
      ctx.fill();

      if (isCurrent) {
        ctx.strokeStyle = "#172033";
        ctx.lineWidth = 2;
        roundRect(x, top, blockWidth, h, 6);
        ctx.stroke();
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`第 ${index + 1} 次`, x + blockWidth / 2, top + h / 2 + 4);
      ctx.textAlign = "left";
    });

    // 当前尝试卡片
    const cardTop = 176;
    const cardLeft = margin;
    const cardWidth = width - margin * 2;
    const cardHeight = height - cardTop - 20;

    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    roundRect(cardLeft, cardTop, cardWidth, cardHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = attempt.valid ? "#159570" : "#dc2626";
    roundRect(cardLeft + 16, cardTop + 18, 10, 10, 3);
    ctx.fill();

    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      `尝试 ${attemptIndex + 1}/${total} · ${scenario.name}`,
      cardLeft + 34,
      cardTop + 28,
    );

    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#334155";
    attempt.lines.forEach((line, index) => {
      ctx.fillText(line, cardLeft + 18, cardTop + 58 + index * 20);
    });

    // 校验结论
    const verdictY = cardTop + 58 + attempt.lines.length * 20 + 10;
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = attempt.valid ? "#159570" : "#dc2626";
    ctx.fillText(
      attempt.valid ? "校验:合规 → 过检数据" : `校验:不合规 — ${attempt.issue}`,
      cardLeft + 18,
      verdictY,
    );

    // 结局走向
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#172033";
    ctx.fillText(`结局走向: ${outcome}`, cardLeft + 18, verdictY + 24);

    emit({
      scenario: scenario.name,
      attempt: attemptIndex,
      total,
      verdict: attempt.valid ? "合规" : "不合规",
      outcome,
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
