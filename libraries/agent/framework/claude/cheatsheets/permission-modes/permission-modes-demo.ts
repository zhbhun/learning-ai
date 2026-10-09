/*
 * 演示:五种权限模式对六类工具调用的判定矩阵。
 * 输入:permissionMode(default / acceptEdits / plan / bypassPermissions / dontAsk)
 *       与一个模拟工具调用(读取、编辑、文件系统命令、其他命令、范围外编辑、关键路径删除)。
 * 操作:切换模式与调用场景,观察判定结果、决定环节,以及整行整列的放行/拒绝分布。
 * 前提:无 hooks、无 deny/ask 规则、无 allowedTools、无 canUseTool 回调——
 *       落到"需要确认"的调用因此一律拒绝;auto 依赖模型分类器,不可确定性复现,不纳入。
 * 预期:default 只放读取;acceptEdits 加工作目录内的编辑与文件系统命令;plan 仍只放读取;
 *       bypassPermissions 几乎全放,但关键路径删除任何模式都不自动放行;dontAsk 会提示的一律拒。
 * 阅读主线:上半部分是判定表与判定函数(纯数据 + 纯函数,依据官方评估链路文档整理);
 *           下半部分是 Canvas 渲染外壳(演示载体,可略读)。全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:模式与调用的判定(对照正文各模式的免审批范围)              */
/* ------------------------------------------------------------------ */

export type DemoModeId =
  | "default"
  | "acceptEdits"
  | "plan"
  | "bypassPermissions"
  | "dontAsk";

export type DemoCallId =
  | "read-inside"
  | "edit-inside"
  | "fs-command-inside"
  | "bash-other"
  | "edit-outside"
  | "rm-critical";

export interface DemoCall {
  id: DemoCallId;
  /** 矩阵行标签(短) */
  label: string;
  /** 详情面板里的完整描述 */
  detail: string;
}

export interface DemoDecision {
  /** allow = 自动放行;deny = 拒绝(前提无回调,需要确认即拒绝) */
  verdict: "allow" | "deny";
  /** 评估链路中给出结果的环节 */
  step: string;
  /** 一句话说明 */
  reason: string;
}

export const MODE_LABELS: Record<DemoModeId, string> = {
  default: "default",
  acceptEdits: "acceptEdits",
  plan: "plan",
  bypassPermissions: "bypassPermissions",
  dontAsk: "dontAsk",
};

/** 列头顺序即演示中的模式全集;auto 未纳入,理由见文件头 */
export const MODE_ORDER: DemoModeId[] = [
  "default",
  "acceptEdits",
  "plan",
  "bypassPermissions",
  "dontAsk",
];

/** 六类代表性调用;"范围内"指工作目录与 additionalDirectories */
export const DEMO_CALLS: DemoCall[] = [
  { id: "read-inside", label: "Read README.md", detail: "读取工作目录内文件(读取类)" },
  { id: "edit-inside", label: "Edit src/app.ts", detail: "编辑工作目录内文件" },
  { id: "fs-command-inside", label: "mkdir build", detail: "范围内的文件系统命令(mkdir/touch/mv/cp 等)" },
  { id: "bash-other", label: "npm test", detail: "其余 Bash 命令(非只读、非文件系统)" },
  { id: "edit-outside", label: "Edit ../notes.md", detail: "编辑工作目录之外的路径" },
  { id: "rm-critical", label: "rm -rf /", detail: "关键路径删除(根目录、家目录、工作目录及其父目录等)" },
];

/**
 * 判定一次模拟调用。对照官方评估链路:
 * hooks → deny 规则 → ask 规则 → 权限模式 → allow 规则 → canUseTool。
 * 本演示前提已排除 hooks 与三类规则,模式不放行的调用直接落到 canUseTool。
 */
export function decideCall(mode: DemoModeId, call: DemoCallId): DemoDecision {
  // 读取类是 default 的基线,任何模式都免审批(plan 明确"只读工具照 default 运行")
  if (call === "read-inside") {
    return {
      verdict: "allow",
      step: "无需审批",
      reason: "读取与内置只读命令在任何模式下都直接执行",
    };
  }

  // 关键路径删除:任何模式都不自动放行;dontAsk 直接拒,其余落到确认
  if (call === "rm-critical") {
    if (mode === "dontAsk") {
      return {
        verdict: "deny",
        step: "权限模式",
        reason: "dontAsk 把一切会提示的调用直接拒绝",
      };
    }
    return {
      verdict: "deny",
      step: "关键路径熔断",
      reason: "关键路径的 rm/rmdir 任何模式都不自动放行;无 canUseTool 回调接手,拒绝",
    };
  }

  // bypassPermissions 跳过权限检查(关键路径例外已在上方处理)
  if (mode === "bypassPermissions") {
    return {
      verdict: "allow",
      step: "权限模式",
      reason: "bypassPermissions 跳过权限检查,受保护路径写入也放行",
    };
  }

  // acceptEdits:范围内的文件编辑与常见文件系统命令自动放行
  if (mode === "acceptEdits" && (call === "edit-inside" || call === "fs-command-inside")) {
    return {
      verdict: "allow",
      step: "权限模式",
      reason: "acceptEdits 自动放行范围内的 Edit/Write 与 mkdir、touch、mv、cp、sed 等命令",
    };
  }

  // acceptEdits 的范围边界:工作目录与 additionalDirectories 之外不自动放行
  if (mode === "acceptEdits" && call === "edit-outside") {
    return {
      verdict: "deny",
      step: "canUseTool(缺)",
      reason: "acceptEdits 只覆盖工作目录与 additionalDirectories 内的路径,范围外落到确认",
    };
  }

  // dontAsk 在模式环节直接拒绝,canUseTool 永远不会触发
  if (mode === "dontAsk") {
    return {
      verdict: "deny",
      step: "权限模式",
      reason: "dontAsk 把一切会提示的调用直接拒绝,canUseTool 永远不会触发",
    };
  }

  // 其余组合:模式不放行 → 落到 canUseTool;前提未提供回调,拒绝
  return {
    verdict: "deny",
    step: "canUseTool(缺)",
    reason: `${MODE_LABELS[mode]} 不自动放行该调用,落到 canUseTool;未提供回调,拒绝并记入 permission_denials`,
  };
}

/** 当前模式下免审批的调用类数量(矩阵一眼可见的横向差异) */
export function countAllowed(mode: DemoModeId): number {
  return DEMO_CALLS.filter((item) => decideCall(mode, item.id).verdict === "allow").length;
}

/** 读数面板用的一行摘要(供 stories 的 readout 直接显示) */
export interface DemoSnapshot {
  verdictReadout: string;
  stepReadout: string;
  coverageReadout: string;
  reasonReadout: string;
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:判定矩阵 + 详情面板(Canvas 演示载体)                      */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const ALLOW_BG = "#ecfdf5";
const ALLOW_TEXT = "#0f766e";
const DENY_BG = "#fef2f2";
const DENY_TEXT = "#b91c1c";

export interface DemoOptions {
  mode: DemoModeId;
  call: DemoCallId;
}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createPermissionModesDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = { mode: "default", call: "edit-inside" };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = Math.max(432, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 20;
    const labelWidth = 150;
    const tableTop = 64;
    const headerHeight = 26;
    const rowHeight = 30;
    const columnGap = 4;
    const columnWidth =
      (width - margin * 2 - labelWidth - columnGap * (MODE_ORDER.length - 1)) /
      MODE_ORDER.length;

    ctx.fillStyle = "#172033";
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("权限模式判定矩阵:切模式、选调用,看放行还是拒绝(演示数据)", margin, 26);

    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(
      "前提:无 hooks、无 deny/ask 规则、无 allowedTools、无 canUseTool 回调;auto 不纳入演示",
      margin,
      44,
    );

    // 列头:五个模式,当前列加高亮条
    MODE_ORDER.forEach((mode, index) => {
      const x = margin + labelWidth + index * (columnWidth + columnGap);
      const active = mode === current.mode;
      ctx.textAlign = "center";
      ctx.fillStyle = active ? "#172033" : "#64748b";
      ctx.font = active
        ? "600 10px ui-monospace, SFMono-Regular, Menlo, monospace"
        : "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(MODE_LABELS[mode], x + columnWidth / 2, tableTop + 14);
      ctx.textAlign = "left";
      if (active) {
        ctx.fillStyle = "#4f7cff";
        ctx.fillRect(x, tableTop + 18, columnWidth, 3);
      }
    });

    // 行与单元格:选中行、选中列铺淡底,选中格加描边
    DEMO_CALLS.forEach((item, rowIndex) => {
      const y = tableTop + headerHeight + rowIndex * rowHeight;
      const rowActive = item.id === current.call;

      ctx.fillStyle = rowActive ? "#172033" : "#475569";
      ctx.font = rowActive
        ? "600 11px ui-monospace, SFMono-Regular, Menlo, monospace"
        : "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(item.label, margin, y + rowHeight / 2 + 4);

      MODE_ORDER.forEach((mode, columnIndex) => {
        const x = margin + labelWidth + columnIndex * (columnWidth + columnGap);
        const decision = decideCall(mode, item.id);
        const cellActive = rowActive && mode === current.mode;

        if (rowActive || mode === current.mode) {
          ctx.fillStyle = "rgba(79, 124, 255, 0.06)";
          ctx.fillRect(x, y, columnWidth, rowHeight - 2);
        }

        ctx.fillStyle = decision.verdict === "allow" ? ALLOW_BG : DENY_BG;
        ctx.fillRect(x + 1, y + 1, columnWidth - 2, rowHeight - 4);

        ctx.textAlign = "center";
        ctx.fillStyle = decision.verdict === "allow" ? ALLOW_TEXT : DENY_TEXT;
        ctx.font = cellActive
          ? "600 11px ui-monospace, SFMono-Regular, Menlo, monospace"
          : "11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(
          decision.verdict === "allow" ? "✓ 放行" : "✗ 拒绝",
          x + columnWidth / 2,
          y + rowHeight / 2 + 4,
        );
        ctx.textAlign = "left";

        if (cellActive) {
          ctx.strokeStyle = "#4f7cff";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, columnWidth - 2, rowHeight - 4);
          ctx.lineWidth = 1;
        }
      });
    });

    // 图例
    const legendTop = tableTop + headerHeight + DEMO_CALLS.length * rowHeight + 16;
    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(
      "✓ 自动放行    ✗ 拒绝:需要确认但无 canUseTool 接手 / dontAsk 直接拒 / 关键路径熔断",
      margin,
      legendTop,
    );

    // 详情面板:当前选中组合的判定与依据
    const decision = decideCall(current.mode, current.call);
    const callDetail = DEMO_CALLS.find((item) => item.id === current.call)!;
    const panelTop = legendTop + 12;
    const headline = `${MODE_LABELS[current.mode]} × ${callDetail.label} → ${
      decision.verdict === "allow" ? "自动放行" : "拒绝"
    }(${callDetail.detail})`;
    const detailLines = wrapText(
      `决定环节:${decision.step} —— ${decision.reason}`,
      width - margin * 2 - 28,
    );

    const panelHeight = 46 + 18 * detailLines.length;
    ctx.fillStyle = "#f8fafc";
    roundRect(margin, panelTop, width - margin * 2, panelHeight, 8);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    roundRect(margin, panelTop, width - margin * 2, panelHeight, 8);
    ctx.stroke();

    ctx.fillStyle = "#172033";
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(headline, margin + 14, panelTop + 22);

    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#334155";
    detailLines.forEach((line, index) => {
      ctx.fillText(line, margin + 14, panelTop + 42 + index * 18);
    });

    emit({
      verdictReadout: decision.verdict === "allow" ? "自动放行" : "拒绝",
      stepReadout: decision.step,
      coverageReadout: `免审批 ${countAllowed(current.mode)} / ${DEMO_CALLS.length} 类调用`,
      reasonReadout: decision.reason,
    });
  }

  function wrapText(text: string, maxWidth: number): string[] {
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    const lines: string[] = [];
    let line = "";
    for (const part of text.split(" ")) {
      const candidate = line ? `${line} ${part}` : part;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = part;
      } else {
        line = candidate;
      }
    }
    if (line) {
      lines.push(line);
    }
    return lines;
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
