/*
 * 演示:一次工具调用在六步权限评估链上的判定路径回放。
 * 输入:三个预设调用(Read utils.py、Write .env、Bash rm -rf build/)、
 *       hook 决策(不表态 / allow / deny / ask / defer)、
 *       deny 规则 Edit(./.env) 开关、canUseTool 配置开关。
 * 操作:切换调用与 hook 决策,观察六步各自判了什么、评估在哪一步终止、
 *       canUseTool 是否被触发。
 * 预期:hook deny / defer 在第 1 步结束评估;hook allow 免提示执行但会被
 *       deny 规则否决;不表态时走完全链,需权限的调用落到第 6 步 canUseTool。
 * 阅读主线:上半部分是判定路径数据(纯演示数据;步骤与结果对应官方六步
 *           评估顺序,只覆盖正文讲到的分支);下半部分是 Canvas 渲染外壳。
 *           全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:场景、决策与六步评估路径                                   */
/* ------------------------------------------------------------------ */

export type DemoScenarioId = "read-utils" | "write-env" | "bash-rm";

/** hook 决策:PreToolUse 回调返回的 permissionDecision,"none" 表示返回 {} 不表态 */
export type HookDecision = "none" | "allow" | "deny" | "ask" | "defer";

/** hook 决策的展示文案(stories 控件选项与读数共用) */
export const DECISION_LABELS: Record<HookDecision, string> = {
  none: "{}(不表态)",
  allow: "allow · 免提示",
  deny: "deny · 拦截",
  ask: "ask · 转人工",
  defer: "defer · 暂停",
};

export interface DemoScenario {
  id: DemoScenarioId;
  /** 画布标题与选项文案里展示的调用名 */
  label: string;
  /** 工具与输入(演示值,字段名与官方 PreToolUseHookInput 一致) */
  call: string;
  /** 场景要点:解释这条路径回答什么问题 */
  note: string;
}

export const DEMO_SCENARIOS: Record<DemoScenarioId, DemoScenario> = {
  "read-utils": {
    id: "read-utils",
    label: "Read: utils.py",
    call: 'Read · tool_input: { file_path: "utils.py" }',
    note: "工作目录内读文件:default 模式免批,不落到提示。",
  },
  "write-env": {
    id: "write-env",
    label: "Write: .env",
    call: 'Write · tool_input: { file_path: ".env" }',
    note: "写文件在 default 模式需要权限;hook 的决策在这里最有分量。",
  },
  "bash-rm": {
    id: "bash-rm",
    label: "Bash: rm -rf build/",
    call: 'Bash · tool_input: { command: "rm -rf build/" }',
    note: "普通路径删除:需要权限,但不在关键路径例外的范围。",
  },
};

export type DemoOptions = {
  scenario: DemoScenarioId;
  hookDecision: HookDecision;
  /** deny 规则 Edit(./.env):作用域规则管住 Write,命中则任何模式下拒绝 */
  denyEnv: boolean;
  /** 是否配置了 canUseTool 回调 */
  hasCallback: boolean;
};

/** 评估步骤的状态:未到达 / 通过(未命中) / 放行 / 拒绝 / 转提示 / query 结束 */
export type StepStatus = "skip" | "pass" | "allow" | "block" | "prompt" | "end";

export const STATUS_LABELS: Record<StepStatus, string> = {
  skip: "未到达",
  pass: "通过",
  allow: "放行",
  block: "拒绝",
  prompt: "转提示",
  end: "query 结束",
};

export const STATUS_COLORS: Record<StepStatus, string> = {
  skip: "#cbd5e1",
  pass: "#94a3b8",
  allow: "#0d9488",
  block: "#dc2626",
  prompt: "#d97706",
  end: "#7c3aed",
};

export interface EvalStep {
  step: string;
  status: StepStatus;
  note: string;
}

/** 读数面板用的一行摘要(供 stories 的 readout 直接显示) */
export interface DemoSnapshot {
  hookReadout: string;
  stepReadout: string;
  outcomeReadout: string;
  callbackReadout: string;
}

export interface EvalResult {
  steps: EvalStep[];
  snapshot: DemoSnapshot;
}

const STEP_LABELS = [
  "1 Hook",
  "2 deny 规则",
  "3 ask 规则",
  "4 权限模式",
  "5 allow 规则",
  "6 canUseTool",
];

/**
 * 按官方六步评估顺序回放一次调用的判定路径(hooks 是第 1 步,canUseTool
 * 是第 6 步)。hook allow 免提示执行,但 deny/ask 规则仍可否决;hook 不
 * 表态时调用走完全链,需权限的调用落到 canUseTool。
 */
export function evaluate(options: DemoOptions): EvalResult {
  const steps: EvalStep[] = STEP_LABELS.map((step) => ({
    step,
    status: "skip" as StepStatus,
    note: "未到达",
  }));
  const isRead = options.scenario === "read-utils";
  // Edit(./.env) 这类写路径规则管住 Write(规则语法见权限课),Read 不命中
  const denyHits = options.denyEnv && options.scenario === "write-env";

  const hookReadout = DECISION_LABELS[options.hookDecision];

  /** 就地改写某一步的判定结果,保留步骤名 */
  const setStep = (index: number, status: StepStatus, note: string) => {
    steps[index].status = status;
    steps[index].note = note;
  };

  switch (options.hookDecision) {
    case "deny": {
      setStep(0, "block", 'permissionDecision: "deny" · reason 回给模型');
      return {
        steps,
        snapshot: {
          hookReadout,
          stepReadout: "第 1 步 PreToolUse",
          outcomeReadout: "拒绝 · 任何权限模式都拦得住",
          callbackReadout: "未触发",
        },
      };
    }
    case "defer": {
      setStep(0, "end", 'permissionDecision: "defer" · query 立即结束');
      return {
        steps,
        snapshot: {
          hookReadout,
          stepReadout: 'query 结束 · stop_reason: "tool_deferred"',
          outcomeReadout: "暂停 · deferred_tool_use 带回待决调用,等 resume",
          callbackReadout: "未触发 · resume 后同一次 PreToolUse 再触发",
        },
      };
    }
    case "ask": {
      setStep(0, "prompt", 'permissionDecision: "ask" · 转权限提示');
      if (options.hasCallback) {
        setStep(5, "allow", "回调应答 allow · 调用执行");
      } else {
        setStep(5, "block", "无宿主应答 · 直接拒绝");
      }
      return {
        steps,
        snapshot: {
          hookReadout,
          stepReadout: "第 6 步 canUseTool",
          outcomeReadout: options.hasCallback
            ? "执行 · 回调放行"
            : "拒绝 · 无人应答",
          callbackReadout: options.hasCallback
            ? "触发(hook ask 转来)"
            : "未配置 · 直接拒绝",
        },
      };
    }
    case "allow": {
      setStep(0, "allow", "hook allow · 免提示放行,deny/ask 规则仍会判");
      if (denyHits) {
        setStep(1, "block", "Edit(./.env) 命中 · 否决 hook 的 allow");
        return {
          steps,
          snapshot: {
            hookReadout,
            stepReadout: "第 2 步 deny 规则",
            outcomeReadout: "拒绝 · deny 规则压过 hook 的 allow",
            callbackReadout: "未触发",
          },
        };
      }
      // 未被规则否决:调用已由 hook 免批执行,模式 / allow 规则 / 回调不再参与
      setStep(1, "pass", "未命中");
      setStep(2, "pass", "未命中");
      setStep(3, "skip", "调用已由 hook 免批执行");
      setStep(4, "skip", "调用已由 hook 免批执行");
      setStep(5, "skip", "调用已由 hook 免批执行");
      return {
        steps,
        snapshot: {
          hookReadout,
          stepReadout: "第 1 步 PreToolUse",
          outcomeReadout: "执行 · hook allow 免提示",
          callbackReadout: "未触发",
        },
      };
    }
    default: {
      // 返回 {}:不表态,调用继续走正常权限评估
      setStep(0, "pass", "返回 {} · 不表态,继续正常评估");
      if (denyHits) {
        setStep(1, "block", "Edit(./.env) 命中 · 任何模式下都拒绝");
        return {
          steps,
          snapshot: {
            hookReadout,
            stepReadout: "第 2 步 deny 规则",
            outcomeReadout: "拒绝 · 任何模式下都拒绝",
            callbackReadout: "未触发",
          },
        };
      }
      setStep(1, "pass", "未命中");
      setStep(2, "pass", "未命中");
      setStep(3, "pass", "default 模式:不放行、不拦截");
      if (isRead) {
        setStep(4, "allow", "内置免批:工作目录内读文件");
        return {
          steps,
          snapshot: {
            hookReadout,
            stepReadout: "第 5 步 allow 规则(内置免批)",
            outcomeReadout: "执行 · 免批调用",
            callbackReadout: "未触发",
          },
        };
      }
      setStep(4, "pass", "未命中");
      if (options.hasCallback) {
        setStep(5, "allow", "回调应答 allow · 调用执行");
      } else {
        setStep(5, "block", "无宿主应答 · 直接拒绝");
      }
      return {
        steps,
        snapshot: {
          hookReadout,
          stepReadout: "第 6 步 canUseTool",
          outcomeReadout: options.hasCallback
            ? "执行 · 回调放行"
            : "拒绝 · 本应提示但无人应答",
          callbackReadout: options.hasCallback
            ? "触发并放行"
            : "未配置 · 直接拒绝",
        },
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:评估路径面板(Canvas 演示载体)                            */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createHookControlDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = {
    scenario: "write-env",
    hookDecision: "none",
    denyEnv: false,
    hasCallback: true,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const scenario = DEMO_SCENARIOS[current.scenario];
    const margin = 16;

    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`评估路径:${scenario.label}(演示数据)`, margin, 24);

    ctx.fillStyle = "#64748b";
    ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(truncate(scenario.note, 64), margin, 41);

    ctx.fillStyle = "#334155";
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(truncate(scenario.call, 60), margin, 62);

    // 六步评估行:步骤名 + 状态标签 + 判定说明;终止评估的一行加底色强调
    const listTop = 78;
    const rowHeight = (height - listTop - 10) / 6;
    const { steps, snapshot } = evaluate(current);
    const lastIndex = steps.reduce(
      (last, step, index) => (step.status !== "skip" ? index : last),
      0,
    );

    steps.forEach((item, index) => {
      const rowTop = listTop + index * rowHeight;
      const isFinal =
        index === lastIndex && item.status !== "skip" && item.status !== "pass";

      if (isFinal) {
        ctx.fillStyle = "#eef2ff";
        roundRect(margin, rowTop + 1, width - margin * 2, rowHeight - 2, 6);
        ctx.fill();
      }

      ctx.fillStyle = STATUS_COLORS[item.status];
      ctx.fillRect(margin + 4, rowTop + 3, 4, rowHeight - 6);

      ctx.fillStyle = "#334155";
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(item.step, margin + 16, rowTop + rowHeight * 0.4);

      ctx.fillStyle = STATUS_COLORS[item.status];
      ctx.fillRect(margin + 96, rowTop + rowHeight * 0.4 - 8, 8, 8);
      ctx.fillStyle = "#334155";
      ctx.font = "11px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(STATUS_LABELS[item.status], margin + 110, rowTop + rowHeight * 0.4);

      ctx.fillStyle = "#64748b";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      const noteX = margin + 178;
      ctx.fillText(
        truncate(item.note, Math.floor((width - noteX - 12) / 6.2)),
        noteX,
        rowTop + rowHeight * 0.4,
      );
    });

    emit(snapshot);
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
    update(options: DemoOptions) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
