/*
 * 演示:一次进程内工具调用从模型发起到回到模型的完整旅程(五站链路)。
 * 输入:入参场景(合法 / 缺必填字段 / 类型错误 / 业务错误)与调用进度(0-4)。
 * 操作:切换场景观察校验与 handler 的分流;拖动「调用进度」逐站查看载荷。
 * 预期:合法入参走完 校验 → handler → tool_result → 回答;
 *       校验失败的调用进不了 handler,以错误结果回传,模型修正后重试;
 *       handler 内的业务错误返回 isError: true,agent loop 不中断。
 * 阅读主线:文件上半部分是场景数据与旅程推导,是本演示的教学核心;下半部分是
 *           Canvas 渲染外壳(演示载体,可略读)。全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:四个入参场景与五站旅程(对照正文「一次调用的旅程」)        */
/* ------------------------------------------------------------------ */

export type ScenarioId = "valid" | "missing" | "wrongType" | "unknownCity";

export interface Scenario {
  id: ScenarioId;
  /** 控件显示名 */
  label: string;
  /** 模型发来的入参(演示 JSON) */
  toolUseInput: string;
  /** inputSchema 校验是否放行 */
  schemaPass: boolean;
  /** 校验站的说明行 */
  schemaDetail: string[];
  /** handler 是否执行 */
  handlerRan: boolean;
  /** handler 站的说明行(仅执行时使用) */
  handlerDetail: string[];
  /** tool_result 是否为错误结果 */
  resultIsError: boolean;
  /** tool_result 回传给模型的文本 */
  resultText: string;
  /** 模型下一步的说明行 */
  outcomeDetail: string[];
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  valid: {
    id: "valid",
    label: "合法入参",
    toolUseInput: '{ "city": "北京", "unit": "celsius" }',
    schemaPass: true,
    schemaDetail: [
      'city: string ✓   unit: "celsius" ✓',
      "入参满足 inputSchema,放行进入 handler",
    ],
    handlerRan: true,
    handlerDetail: [
      "async ({ city, unit }) => { … }",
      "查询天气服务,组装 CallToolResult 返回",
    ],
    resultIsError: false,
    resultText: "北京当前 18°C,多云",
    outcomeDetail: ["模型拿到文本结果,组织最终回答"],
  },
  missing: {
    id: "missing",
    label: "缺必填字段",
    toolUseInput: '{ "unit": "celsius" }',
    schemaPass: false,
    schemaDetail: [
      "city: Invalid input: expected string, received undefined",
      "入参不满足 inputSchema",
    ],
    handlerRan: false,
    handlerDetail: [],
    resultIsError: true,
    resultText:
      "Error: Input validation error: Invalid arguments for tool get_weather: city…",
    outcomeDetail: ["模型读错误信息,补上 city 重新调用"],
  },
  wrongType: {
    id: "wrongType",
    label: "类型错误",
    toolUseInput: '{ "city": 42 }',
    schemaPass: false,
    schemaDetail: [
      "city: Invalid input: expected string, received number",
      "入参不满足 inputSchema",
    ],
    handlerRan: false,
    handlerDetail: [],
    resultIsError: true,
    resultText:
      "Error: Input validation error: Invalid arguments for tool get_weather: city…",
    outcomeDetail: ["模型改用字符串形式重新调用"],
  },
  unknownCity: {
    id: "unknownCity",
    label: "业务错误",
    toolUseInput: '{ "city": "亚特兰蒂斯", "unit": "celsius" }',
    schemaPass: true,
    schemaDetail: [
      'city: string ✓   unit: "celsius" ✓',
      "入参满足 inputSchema,放行进入 handler",
    ],
    handlerRan: true,
    handlerDetail: [
      "async ({ city, unit }) => { … }",
      "天气服务查无此城,返回 isError: true + 提示文本",
    ],
    resultIsError: true,
    resultText: "未收录该城市,请确认城市名后重试",
    outcomeDetail: ["模型收到错误结果,向用户说明而不是崩溃"],
  },
};

export type StepStatus = "ok" | "fail" | "skip";

export interface JourneyStep {
  title: string;
  /** 卡片中的载荷行 */
  lines: string[];
  status: StepStatus;
  /** 管道节点的短标签 */
  node: string;
}

/** 由场景推导五站旅程:tool_use → 校验 → handler → tool_result → 模型继续。 */
export function buildJourney(s: Scenario): JourneyStep[] {
  return [
    {
      title: "① 模型发起调用(tool_use)",
      lines: ['name: "mcp__weather__get_weather"', `input: ${s.toolUseInput}`],
      status: "ok",
      node: "模型",
    },
    {
      title: "② inputSchema 校验(server 层)",
      lines: s.schemaDetail,
      status: s.schemaPass ? "ok" : "fail",
      node: "校验",
    },
    {
      title: s.handlerRan ? "③ handler 执行(你的函数)" : "③ handler 未执行",
      lines: s.handlerRan ? s.handlerDetail : ["校验把调用挡在 handler 之前"],
      status: s.handlerRan ? "ok" : "skip",
      node: "handler",
    },
    {
      title: "④ tool_result 回传",
      lines: [`is_error: ${s.resultIsError}`, `content: "${s.resultText}"`],
      status: s.resultIsError ? "fail" : "ok",
      node: "tool_result",
    },
    {
      title: "⑤ 模型继续(agent loop 不中断)",
      lines: s.outcomeDetail,
      status: "ok",
      node: "模型",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:五站管道 + 当前站卡片(Canvas 演示载体)                    */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const STATUS_COLORS: Record<StepStatus, string> = {
  ok: "#159570",
  fail: "#dc2626",
  skip: "#94a3b8",
};

const MODEL_NODE_COLOR = "#4f7cff";

export interface DemoOptions {
  scenario: ScenarioId;
  position: number;
}

export interface DemoSnapshot {
  scenarioLabel: string;
  /** clamp 后的当前站序号(0-4) */
  position: number;
  total: number;
  /** 当前站标题 */
  stage: string;
  /** 从第 ④ 站起显示回传文本,之前为 — */
  modelReceives: string;
}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createCustomToolsDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = { scenario: "valid", position: 4 };

  function nodeColor(step: JourneyStep, index: number): string {
    if (index === 0 || index === 4) {
      return MODEL_NODE_COLOR;
    }
    return STATUS_COLORS[step.status];
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(330, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 24;
    const trackWidth = width - margin * 2;

    const scenario = SCENARIOS[current.scenario];
    const journey = buildJourney(scenario);
    const position = Math.max(
      0,
      Math.min(journey.length - 1, Math.round(current.position)),
    );
    const step = journey[position];

    ctx.fillStyle = "#172033";
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      `进程内工具调用回放:${scenario.label}(演示数据)`,
      margin,
      30,
    );

    // 五站管道:每站一个色块,按状态着色,箭头连接
    const gap = 14;
    const nodeTop = 52;
    const nodeHeight = 34;
    const nodeWidth = (trackWidth - gap * (journey.length - 1)) / journey.length;
    journey.forEach((item, index) => {
      const x = margin + index * (nodeWidth + gap);
      const isCurrent = index === position;
      const top = isCurrent ? nodeTop - 4 : nodeTop;

      ctx.fillStyle = nodeColor(item, index);
      roundRect(x, top, nodeWidth, nodeHeight, 7);
      ctx.fill();

      if (isCurrent) {
        ctx.strokeStyle = "#172033";
        ctx.lineWidth = 2;
        roundRect(x, top, nodeWidth, nodeHeight, 7);
        ctx.stroke();
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(item.node, x + nodeWidth / 2, top + nodeHeight / 2 + 4);
      ctx.textAlign = "left";

      // 指向下一站的箭头
      if (index < journey.length - 1) {
        const arrowX = x + nodeWidth + 2;
        const arrowY = nodeTop + nodeHeight / 2;
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX + gap - 5, arrowY);
        ctx.moveTo(arrowX + gap - 9, arrowY - 3.5);
        ctx.lineTo(arrowX + gap - 5, arrowY);
        ctx.lineTo(arrowX + gap - 9, arrowY + 3.5);
        ctx.stroke();
      }
    });

    // 当前站标题
    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(step.title, margin, 122);

    // 当前站卡片
    const cardTop = 136;
    const cardLeft = margin;
    const cardWidth = width - margin * 2;
    const cardHeight = height - cardTop - 18;

    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    roundRect(cardLeft, cardTop, cardWidth, cardHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = nodeColor(step, position);
    roundRect(cardLeft + 16, cardTop + 18, 10, 10, 3);
    ctx.fill();

    ctx.fillStyle = "#172033";
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      `第 ${position + 1} / ${journey.length} 站 · ${scenario.label}`,
      cardLeft + 34,
      cardTop + 28,
    );

    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#334155";
    step.lines.forEach((line, lineIndex) => {
      ctx.fillText(line, cardLeft + 18, cardTop + 58 + lineIndex * 21);
    });

    emit({
      scenarioLabel: scenario.label,
      position,
      total: journey.length,
      stage: step.title,
      modelReceives: position >= 3 ? scenario.resultText : "—",
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
