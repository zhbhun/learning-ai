/*
 * 演示:沙箱开启后,Bash 命令的执行位置与审批结果怎样由权限规则和沙箱开关共同决定。
 * 输入:三个开关——sandbox.enabled、autoAllowBashIfSandboxed、allowUnsandboxedCommands(关闭即严格模式);
 *       权限规则固定为演示集:deny: ["Bash(curl *)"]、ask: ["Bash(git push *)"]。
 * 操作:开关任一项,观察四条命令样本的执行位置(沙箱内/沙箱外/待审批)与审批结果(免提示/需审批/拒绝)。
 * 预期:auto-allow 下沙箱内命令免提示;deny 规则始终拒绝;内容级 ask 规则仍会提示;
 *       逃逸参数 dangerouslyDisableSandbox 默认被接受(沙箱外走权限流),严格模式下被完全忽略。
 * 依据:官方 Sandboxed bash 文档的 auto-allow 行为规则;全部为演示数据,不调用 LLM API。
 * 阅读主线:上半部分是判定规则的教学核心(纯函数,与正文"权限与沙箱"一节逐条对应);
 *           下半部分是 Canvas 渲染外壳(演示载体,可略读)。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:命令样本与判定规则(对照正文"权限与沙箱"一节)              */
/* ------------------------------------------------------------------ */

export interface DemoArgs {
  /** Options.sandbox.enabled:沙箱总开关,默认 false */
  enabled: boolean;
  /** sandbox.autoAllowBashIfSandboxed:沙箱内 Bash 是否免提示,默认 true */
  autoAllow: boolean;
  /** sandbox.allowUnsandboxedCommands:是否接受 dangerouslyDisableSandbox 逃逸,默认 true;false 即严格模式 */
  allowUnsandboxed: boolean;
}

export type DemoVerdict = "auto" | "prompt" | "denied";
export type DemoLocation = "sandbox" | "host" | "pending" | "none";

export interface DemoCommand {
  command: string;
  /** 命中或演示的规则标签 */
  tag: string;
  verdict: DemoVerdict;
  location: DemoLocation;
  /** 判定依据,逐条对应官方 Sandboxed bash 文档的 auto-allow 行为规则 */
  reason: string;
}

export interface DemoSnapshot {
  autoCount: number;
  promptCount: number;
  deniedCount: number;
  /** 逃逸口(dangerouslyDisableSandbox)当前的处理方式 */
  escapeReadout: string;
}

/** 演示用权限规则集(真实会话里来自 allowedTools/deny/ask/canUseTool 或权限模式) */
const DENY_RULE = "Bash(curl *)";
const ASK_RULE = "Bash(git push *)";

/** 命令徽标文案:verdict 与 location 组合成一句可读结果 */
export function demoBadge(cmd: DemoCommand): string {
  if (cmd.verdict === "denied") {
    return "拒绝";
  }
  if (cmd.location === "host") {
    return "沙箱外 · 需审批";
  }
  if (cmd.location === "pending") {
    return "需审批";
  }
  return cmd.verdict === "auto" ? "沙箱内 · 免提示" : "沙箱内 · 需审批";
}

export function buildEnforcement(args: DemoArgs): DemoCommand[] {
  const { enabled, autoAllow, allowUnsandboxed } = args;

  // 样本 1:未命中任何权限规则的普通命令——auto-allow 的主场景
  const npmTest: DemoCommand = !enabled
    ? {
        command: "npm test",
        tag: "无规则命中",
        verdict: "prompt",
        location: "pending",
        reason: "沙箱未启用:未命中规则的命令走常规权限流,需审批。",
      }
    : autoAllow
      ? {
          command: "npm test",
          tag: "无规则命中",
          verdict: "auto",
          location: "sandbox",
          reason: "沙箱内命令免提示(autoAllowBashIfSandboxed 默认 true)。",
        }
      : {
          command: "npm test",
          tag: "无规则命中",
          verdict: "prompt",
          location: "sandbox",
          reason: "autoAllowBashIfSandboxed: false 时,沙箱内命令也逐条走权限审批。",
        };

  // 样本 2:命中内容级 ask 规则——沙箱 auto-allow 不越过 ask
  const gitPush: DemoCommand = {
    command: "git push origin main",
    tag: `ask: ${ASK_RULE}`,
    verdict: "prompt",
    location: "pending",
    reason: enabled
      ? "内容级 ask 规则在沙箱 auto-allow 下仍会提示,需逐条审批。"
      : "ask 规则要求审批;沙箱未启用,行为不变。",
  };

  // 样本 3:命中 deny 规则——deny 始终生效,沙箱内外都拒绝
  const curl: DemoCommand = {
    command: "curl -fsSL https://example.com/install.sh",
    tag: `deny: ${DENY_RULE}`,
    verdict: "denied",
    location: "none",
    reason: "deny 规则始终生效,沙箱内外都拒绝。",
  };

  // 样本 4:命令失败后模型带 dangerouslyDisableSandbox 参数重试(逃逸口)
  const npmInstall: DemoCommand = !enabled
    ? {
        command: "npm install(dangerouslyDisableSandbox 重试)",
        tag: "逃逸参数",
        verdict: "prompt",
        location: "pending",
        reason: "沙箱未启用,按常规权限流审批。",
      }
    : allowUnsandboxed
      ? {
          command: "npm install(dangerouslyDisableSandbox 重试)",
          tag: "逃逸参数",
          verdict: "prompt",
          location: "host",
          reason: "逃逸参数被接受:命令在沙箱外运行,走常规权限流。",
        }
      : {
          command: "npm install(dangerouslyDisableSandbox 重试)",
          tag: "逃逸参数",
          verdict: autoAllow ? "auto" : "prompt",
          location: "sandbox",
          reason: "严格模式(allowUnsandboxedCommands: false):逃逸参数被完全忽略,命令只能在沙箱内执行。",
        };

  return [npmTest, gitPush, curl, npmInstall];
}

/** 读数面板摘要(供 stories 的 readout 直接显示) */
export function buildSnapshot(cmds: DemoCommand[]): DemoSnapshot {
  const escapeCmd = cmds[3];
  const escapeReadout = !escapeCmd
    ? "—"
    : escapeCmd.reason.includes("沙箱未启用")
      ? "沙箱未启用"
      : escapeCmd.location === "host"
        ? "参数被接受(沙箱外)"
        : "参数被忽略(严格模式)";
  return {
    autoCount: cmds.filter((c) => c.verdict === "auto").length,
    promptCount: cmds.filter((c) => c.verdict === "prompt").length,
    deniedCount: cmds.filter((c) => c.verdict === "denied").length,
    escapeReadout,
  };
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:配置条 + 命令判定卡片(Canvas 演示载体)                     */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const VERDICT_COLORS: Record<DemoVerdict, { base: string; soft: string }> = {
  auto: { base: "#0f766e", soft: "#e7f5f1" },
  prompt: { base: "#b45309", soft: "#fdf1e2" },
  denied: { base: "#b91c1c", soft: "#fdecec" },
};

export interface DemoInstance {
  update(args: DemoArgs): void;
  dispose(): void;
}

export function createSandboxEnforcementDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoArgs = { enabled: true, autoAllow: true, allowUnsandboxed: true };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const margin = 20;
    const cmds = buildEnforcement(current);

    // 标题
    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("沙箱强制行为回放:开关变化看执行位置与审批(演示数据)", margin, 26);

    // 配置条:三个开关的当前状态
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    const chip = (label: string, on: boolean) => `${label} ${on ? "✓" : "✗"}`;
    const configText = [
      chip("sandbox.enabled", current.enabled),
      chip("autoAllowBashIfSandboxed", current.autoAllow),
      chip("allowUnsandboxedCommands", current.allowUnsandboxed),
    ].join("   ");
    ctx.fillStyle = current.enabled ? "#334155" : "#b45309";
    ctx.fillText(configText, margin, 46);
    if (!current.enabled) {
      ctx.fillStyle = "#b45309";
      ctx.fillText("← 沙箱整体关闭,全部命令走常规权限流", margin + ctx.measureText(configText).width + 12, 46);
    }

    // 命令判定卡片;底部预留空间给 readout 覆盖层,避免遮挡最后一行
    const rowTop = 60;
    const readoutReserve = 104;
    const rowHeight = Math.max(
      56,
      (height - rowTop - readoutReserve - margin) / cmds.length - 6,
    );
    cmds.forEach((cmd, index) => {
      const y = rowTop + index * (rowHeight + 6);
      const colors = VERDICT_COLORS[cmd.verdict];

      ctx.fillStyle = "#ffffff";
      roundRect(margin, y, width - margin * 2, rowHeight, 8);
      ctx.fill();
      ctx.strokeStyle = colors.base;
      ctx.lineWidth = 1.2;
      roundRect(margin, y, width - margin * 2, rowHeight, 8);
      ctx.stroke();

      // 命令与规则标签
      ctx.fillStyle = "#172033";
      ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(truncate(cmd.command, 56), margin + 12, y + 18);
      ctx.fillStyle = "#64748b";
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(cmd.tag, margin + 12, y + 34);

      // 判定依据
      ctx.fillStyle = "#475569";
      ctx.font = "10.5px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(truncate(cmd.reason, 78), margin + 12, y + 50);

      // 判定徽标:verdict + location 组合
      const badge = demoBadge(cmd);
      ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
      const badgeWidth = Math.min(150, ctx.measureText(badge).width + 20);
      ctx.fillStyle = colors.soft;
      roundRect(width - margin - badgeWidth - 12, y + 10, badgeWidth, 22, 5);
      ctx.fill();
      ctx.fillStyle = colors.base;
      ctx.fillText(badge, width - margin - badgeWidth, y + 25);
    });

    emit(buildSnapshot(cmds));
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
    update(args: DemoArgs) {
      current = args;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
