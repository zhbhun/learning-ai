/*
 * 演示:ENABLE_TOOL_SEARCH 各取值下,工具定义首回合以什么方式进上下文。
 * 输入:模式(开启 / auto / auto:5 / false)、工具定义总规模、alwaysLoad 豁免规模。
 * 操作:切换模式、拖动两条规模滑杆,观察激活判断与首回合上下文读数。
 * 预期:开启 = 始终延迟(演示环境不含回退条件);auto 系列在可延迟定义达到
 *       窗口百分比阈值时才延迟,否则整载;false = 始终整载;
 *       alwaysLoad 豁免项不进可延迟池,豁免越多 auto 越难达到阈值。
 * 阅读主线:文件上半部分是模式与阈值推导,是本演示的教学核心;下半部分是
 *           Canvas 渲染外壳(演示载体,可略读)。全部为演示数据,不调用 LLM API。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

/* ------------------------------------------------------------------ */
/* 教学核心:模式、可延迟池与阈值判断(对照正文「auto 模式的阈值」)      */
/* ------------------------------------------------------------------ */

/** 演示用上下文窗口大小(真实窗口随模型而定) */
const WINDOW_TOKENS = 200_000;

/** 演示用单个工具定义的平均 token,给"规模"一个工具数的直觉 */
export const TOKENS_PER_TOOL = 250;

/** 滑杆量程与画布标尺共用(千 token) */
export const SLIDER_MAX_K = 60;

export type ModeId = "on" | "auto" | "auto5" | "off";

export interface DemoArgs {
  mode: ModeId;
  /** 全部工具定义的 token 总量(千) */
  definitionTokens: number;
  /** alwaysLoad 豁免、不进可延迟池的 token(千) */
  exemptTokens: number;
}

interface ModeSpec {
  /** 控件与读数显示名 */
  label: string;
  /** 激活阈值占窗口的比例;null 表示不设阈值(on 恒延迟,off 恒整载) */
  thresholdRatio: number | null;
}

export const MODES: Record<ModeId, ModeSpec> = {
  on: { label: "开启(未设置 / true)", thresholdRatio: null },
  auto: { label: "auto(10%)", thresholdRatio: 0.1 },
  auto5: { label: "auto:5(5%)", thresholdRatio: 0.05 },
  off: { label: "false(关闭)", thresholdRatio: null },
};

export interface DemoSnapshot {
  modeLabel: string;
  /** 可延迟定义规模(千 token)= 总量 − alwaysLoad 豁免 */
  deferrableK: number;
  /** 激活阈值(千 token);on / off 为 null */
  thresholdK: number | null;
  /** 是否处于延迟状态(工具搜索激活) */
  active: boolean;
  /** 激活判断读数 */
  stateReadout: string;
  /** 首回合上下文读数 */
  contextReadout: string;
  /** 搜索成本读数 */
  costReadout: string;
}

export function computeSnapshot(args: DemoArgs): DemoSnapshot {
  const spec = MODES[args.mode];
  const total = Math.max(0, args.definitionTokens);
  const exempt = Math.min(total, Math.max(0, args.exemptTokens));
  const deferrableK = total - exempt;
  const thresholdK =
    spec.thresholdRatio === null
      ? null
      : (WINDOW_TOKENS * spec.thresholdRatio) / 1000;

  // auto 系列按"可延迟 token 是否达到窗口百分比"判定;on 恒延迟,off 恒整载
  const active =
    args.mode === "on"
      ? true
      : args.mode === "off"
        ? false
        : thresholdK !== null && deferrableK >= thresholdK;

  let stateReadout: string;
  if (args.mode === "on") {
    stateReadout = "不设阈值,始终延迟";
  } else if (args.mode === "off") {
    stateReadout = "始终整载";
  } else if (active) {
    stateReadout = `可延迟 ${deferrableK}K ≥ 阈值 ${thresholdK}K → 延迟`;
  } else {
    stateReadout = `可延迟 ${deferrableK}K < 阈值 ${thresholdK}K → 整载`;
  }

  return {
    modeLabel: spec.label,
    deferrableK,
    thresholdK,
    active,
    stateReadout,
    contextReadout: active
      ? "工具摘要清单;搜索后取回 ≤5 个完整定义"
      : `全部工具定义,约 ${total}K token`,
    costReadout: active ? "每次搜索 +1 次模型往返" : "无额外往返",
  };
}

/* ------------------------------------------------------------------ */
/* Canvas 渲染外壳(演示载体,可略读)                                   */
/* ------------------------------------------------------------------ */

export interface DemoInstance {
  update(options: DemoArgs): void;
  dispose(): void;
}

export function createToolSearchDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: DemoArgs = { mode: "auto", definitionTokens: 24, exemptTokens: 0 };

  function draw() {
    const snapshot = computeSnapshot(current);
    const exemptK = current.definitionTokens - snapshot.deferrableK;
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const left = 48;
    const trackWidth = width - left * 2;
    const trackY = 96;
    const trackH = 36;

    drawingContext.fillStyle = "#172033";
    drawingContext.font = "600 17px ui-sans-serif, system-ui, sans-serif";
    drawingContext.fillText(
      "可延迟定义 vs 激活阈值(演示:窗口 200K,约 250 token/工具)",
      left,
      44,
    );

    // 标尺轨:可延迟定义规模,量程 0 - 60K
    drawingContext.fillStyle = "#e2e8f0";
    drawingContext.fillRect(left, trackY, trackWidth, trackH);

    const fillWidth = Math.min(
      trackWidth,
      (snapshot.deferrableK / SLIDER_MAX_K) * trackWidth,
    );
    drawingContext.fillStyle = snapshot.active ? "#4f7cff" : "#94a3b8";
    drawingContext.fillRect(left, trackY, fillWidth, trackH);

    // 阈值标记(auto 系列才有)
    if (snapshot.thresholdK !== null) {
      const markerX =
        left +
        Math.min(trackWidth, (snapshot.thresholdK / SLIDER_MAX_K) * trackWidth);
      drawingContext.fillStyle = "#e11d48";
      drawingContext.fillRect(markerX - 1, trackY - 10, 2, trackH + 20);
      drawingContext.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
      drawingContext.fillText(`阈值 ${snapshot.thresholdK}K`, markerX + 6, trackY - 12);
    }

    drawingContext.fillStyle = "#94a3b8";
    drawingContext.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    drawingContext.fillText("0", left, trackY + trackH + 24);
    drawingContext.fillText(
      `${SLIDER_MAX_K}K`,
      left + trackWidth - 26,
      trackY + trackH + 24,
    );

    // 状态行与读数
    drawingContext.font = "600 16px ui-sans-serif, system-ui, sans-serif";
    drawingContext.fillStyle = snapshot.active ? "#1d4ed8" : "#b45309";
    drawingContext.fillText(
      snapshot.active ? "延迟:工具搜索激活" : "整载:工具搜索未激活",
      left,
      trackY + trackH + 54,
    );

    drawingContext.font = "14px ui-monospace, SFMono-Regular, Menlo, monospace";
    drawingContext.fillStyle = "#475569";
    drawingContext.fillText(snapshot.stateReadout, left, trackY + trackH + 80);
    drawingContext.fillText(
      `首回合上下文:${snapshot.contextReadout}`,
      left,
      trackY + trackH + 104,
    );
    drawingContext.fillText(
      `成本:${snapshot.costReadout}`,
      left,
      trackY + trackH + 128,
    );
    if (exemptK > 0) {
      drawingContext.fillText(
        `alwaysLoad 豁免 ${exemptK}K,不进可延迟池`,
        left,
        trackY + trackH + 152,
      );
    }

    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
