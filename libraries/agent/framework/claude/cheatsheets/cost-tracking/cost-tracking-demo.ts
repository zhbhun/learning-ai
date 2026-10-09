/*
 * 演示:一次流式输入会话里,result 消息三个记账字段各是什么口径、怎么累计。
 * 输入:读取哪条 result(1/2,对应两轮用户输入)与第 1 轮输入是否派出子代理。
 * 操作:拖动「读取的 result」在两条 result 之间切换;开关「子代理调用」。
 * 预期:usage 各项随 result 切换换成"本轮输入"的值(每条 result 各自统计);
 *       modelUsage 与 total_cost_usd 只增不减(调用内跨轮累计);子代理开关
 *       只改变 modelUsage 与 total_cost_usd,usage 纹丝不动(主循环口径)。
 * 阅读主线:文件上半部分是两轮输入的演示账目,是本演示的教学核心;下半部分是
 *           Canvas 渲染外壳(演示载体,可略读)。全部数字为演示值,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:两轮输入的演示账目(对照正文"三个记账字段"与"累计与重置")  */
/* ------------------------------------------------------------------ */

export interface DemoUsage {
  /** 主循环 · 本轮输入(result.usage 的口径,BetaUsage 字段,snake_case) */
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

export interface DemoModelBucket {
  /** 按模型分桶(result.modelUsage 的口径,ModelUsage 字段,camelCase) */
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

export interface DemoResult {
  label: string;
  /** 主循环 · 本轮输入:不与其他 result 累计 */
  usage: DemoUsage;
  /** 全链路 · 调用内累计:含子代理与内部调用 */
  modelUsage: DemoModelBucket[];
  /** 估算总额 · 与 modelUsage 同生命周期 */
  total_cost_usd: number;
}

/**
 * 场景:流式输入两轮用户输入。
 * 输入 1"读 src/auth.ts,修好 token 刷新的 bug"(可派一个 haiku 子代理扫描关联文件);
 * 输入 2"跑测试确认修复"。
 */
export function buildDemoResults(withSubagent: boolean): DemoResult[] {
  // 主循环每轮输入的 usage:子代理开关不影响这里(usage 不含子代理)
  const usage1: DemoUsage = {
    input_tokens: 2490,
    cache_creation_input_tokens: 2480,
    cache_read_input_tokens: 18200,
    output_tokens: 862,
  };
  const usage2: DemoUsage = {
    input_tokens: 1050,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 21840,
    output_tokens: 511,
  };

  // modelUsage 按模型分桶,调用内跨输入轮累计:result 2 已含 result 1 的量
  const results: DemoResult[] = [
    {
      label: "result 1",
      usage: usage1,
      modelUsage: [
        {
          model: "claude-sonnet-4-5",
          inputTokens: 2490,
          outputTokens: 862,
          costUSD: 0.0352,
        },
      ],
      total_cost_usd: 0.0352,
    },
    {
      label: "result 2",
      usage: usage2,
      modelUsage: [
        {
          model: "claude-sonnet-4-5",
          inputTokens: 3540,
          outputTokens: 1373,
          costUSD: 0.0525,
        },
      ],
      total_cost_usd: 0.0525,
    },
  ];

  if (withSubagent) {
    // 子代理用量进入 modelUsage(与主循环同属累计口径),usage 不受影响
    for (const result of results) {
      result.modelUsage.push({
        model: "claude-haiku-4-5",
        inputTokens: 980,
        outputTokens: 210,
        costUSD: 0.0016,
      });
      result.total_cost_usd = round4(
        result.modelUsage.reduce((sum, bucket) => sum + bucket.costUSD, 0),
      );
    }
  }

  return results;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:输入轮时间线 + 三组账目卡片(Canvas 演示载体)              */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const COLORS = {
  text: "#172033",
  secondary: "#334155",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e2e8f0",
  card: "#f8fafc",
  usage: "#4f7cff",
  modelUsage: "#159570",
  total: "#8b5cf6",
};

export interface DemoOptions {
  /** 读取第几条 result(1 或 2) */
  resultIndex: number;
  /** 第 1 轮输入是否派出子代理(0 或 1) */
  subagent: number;
}

export interface DemoSnapshot {
  resultLabel: string;
  usageOutputTokens: number;
  modelUsageCostTotal: number;
  totalCostUsd: number;
}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createCostTrackingDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = { resultIndex: 1, subagent: 1 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(412, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 24;
    const withSubagent = current.subagent >= 1;
    const results = buildDemoResults(withSubagent);
    const resultIndex = Math.max(
      1,
      Math.min(results.length, Math.round(current.resultIndex)),
    );
    const result = results[resultIndex - 1];

    // 标题
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("同一会话的三个记账字段(演示值)", margin, 32);

    // 时间线:两轮输入与两条 result,高亮当前读取的 result
    const chips = ["输入 1", "result 1", "输入 2", "result 2"];
    const chipWidth = (width - margin * 2 - 8 * (chips.length - 1)) / chips.length;
    const chipTop = 52;
    const chipHeight = 30;
    chips.forEach((chip, index) => {
      const x = margin + index * (chipWidth + 8);
      // result 1 是第 2 个格子,result 2 是第 4 个格子
      const active = chip.startsWith("result") && index === resultIndex * 2 - 1;

      ctx.fillStyle = active ? COLORS.text : COLORS.border;
      roundRect(x, chipTop, chipWidth, chipHeight, 6);
      ctx.fill();

      ctx.fillStyle = active ? "#ffffff" : COLORS.secondary;
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(chip, x + chipWidth / 2, chipTop + chipHeight / 2 + 4);
      ctx.textAlign = "left";
    });

    if (withSubagent) {
      ctx.fillStyle = COLORS.muted;
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(
        "⤷ 输入 1 派出子代理(claude-haiku-4-5)",
        margin + 2,
        chipTop + chipHeight + 16,
      );
    }

    // 账目卡片
    const cardTop = withSubagent ? 106 : 96;
    const cardLeft = margin;
    const cardWidth = width - margin * 2;
    const cardHeight = height - cardTop - 16;

    ctx.fillStyle = COLORS.card;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    roundRect(cardLeft, cardTop, cardWidth, cardHeight, 8);
    ctx.fill();
    ctx.stroke();

    const rowHeight = 20;
    const headerHeight = 26;
    const nameLeft = margin + 16;
    const rowLeft = margin + 24;
    const valueRight = margin + cardWidth - 16;
    let y = cardTop + 20;

    // usage 组:主循环 · 本轮输入,snake_case 字段
    y = drawGroupHeader("usage", "主循环 · 本轮输入", COLORS.usage, y, headerHeight, nameLeft, valueRight);
    y = drawUsageRow("input_tokens", result.usage.input_tokens, y, rowHeight, rowLeft, valueRight);
    y = drawUsageRow(
      "cache_creation_input_tokens",
      result.usage.cache_creation_input_tokens,
      y,
      rowHeight,
      rowLeft,
      valueRight,
    );
    y = drawUsageRow(
      "cache_read_input_tokens",
      result.usage.cache_read_input_tokens,
      y,
      rowHeight,
      rowLeft,
      valueRight,
    );
    y = drawUsageRow("output_tokens", result.usage.output_tokens, y, rowHeight, rowLeft, valueRight);
    if (withSubagent) {
      ctx.fillStyle = COLORS.faint;
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("↳ 子代理调用不计入这张表", rowLeft, y + 4);
      y += rowHeight;
    }
    y += 8;

    // modelUsage 组:全链路 · 调用内累计,按模型分桶
    y = drawGroupHeader("modelUsage", "全链路 · 调用内累计", COLORS.modelUsage, y, headerHeight, nameLeft, valueRight);
    for (const bucket of result.modelUsage) {
      y = drawModelRow(bucket.model, bucket.costUSD, y, rowHeight, rowLeft, valueRight);
    }
    y += 8;

    // total_cost_usd 组:估算总额
    y = drawGroupHeader(
      "total_cost_usd",
      "估算 · 与 modelUsage 同生命周期",
      COLORS.total,
      y,
      headerHeight,
      nameLeft,
      valueRight,
    );
    ctx.fillStyle = COLORS.text;
    ctx.font = "600 16px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(`$${result.total_cost_usd.toFixed(4)}`, rowLeft, y + 6);
    y += rowHeight;

    emit({
      resultLabel: `result ${resultIndex}(输入 ${resultIndex} 结束)`,
      usageOutputTokens: result.usage.output_tokens,
      modelUsageCostTotal: round4(
        result.modelUsage.reduce((sum, bucket) => sum + bucket.costUSD, 0),
      ),
      totalCostUsd: result.total_cost_usd,
    });
  }

  function drawGroupHeader(
    name: string,
    tag: string,
    color: string,
    y: number,
    headerHeight: number,
    nameLeft: number,
    valueRight: number,
  ): number {
    ctx.fillStyle = color;
    ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(name, nameLeft, y);
    ctx.fillStyle = COLORS.muted;
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(tag, valueRight, y);
    ctx.textAlign = "left";
    return y + headerHeight;
  }

  function drawUsageRow(
    name: string,
    value: number,
    y: number,
    rowHeight: number,
    rowLeft: number,
    valueRight: number,
  ): number {
    ctx.fillStyle = COLORS.secondary;
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(name, rowLeft, y);
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "right";
    ctx.fillText(String(value), valueRight, y);
    ctx.textAlign = "left";
    return y + rowHeight;
  }

  function drawModelRow(
    model: string,
    cost: number,
    y: number,
    rowHeight: number,
    rowLeft: number,
    valueRight: number,
  ): number {
    ctx.fillStyle = COLORS.secondary;
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(model, rowLeft, y);
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = "right";
    ctx.fillText(`$${cost.toFixed(4)}`, valueRight, y);
    ctx.textAlign = "left";
    return y + rowHeight;
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
