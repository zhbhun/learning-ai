/*
 * 演示:一次工具调用经过权限评估链的判定路径回放。
 * 输入:一个待判定的调用(五个预设)、起始权限模式、三条规则开关、
 *       allowedTools 裸名条目开关、canUseTool 配置开关。
 * 操作:切换调用与配置,观察六步评估逐行判定、终止步骤与回调是否触发。
 * 预期:deny/ask 规则在权限模式之前——bypassPermissions 也压不过;allow 规则
 *       与模式的自动放行发生在回调之前,提前放行的调用不会触发 canUseTool;
 *       已配置回调且存在 bypassPermissions 或裸名 allowedTools 时出现遮蔽警告。
 * 阅读主线:上半部分是简化评估链的教学核心(纯函数;判定路径对应官方评估顺序,
 *           只覆盖正文讲到的分支,实际行为以 CLI 为准);下半部分是 Canvas 渲染外壳。
 *           全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:评估链的简化回放(对照正文“评估顺序”的步骤表)             */
/* ------------------------------------------------------------------ */

export type DemoScenarioId =
  | "bash-npm-test"
  | "bash-rm"
  | "read-env"
  | "edit-src"
  | "mcp-issue";

export type DemoMode =
  | "default"
  | "acceptEdits"
  | "plan"
  | "bypassPermissions"
  | "dontAsk";

export interface DemoScenario {
  id: DemoScenarioId;
  /** 画布标题与读数里展示的调用 */
  label: string;
  /** 规则 Tool 位匹配的工具名 */
  toolName: string;
  /** 规则 specifier 位匹配的文本;MCP 工具没有 specifier */
  specifier?: string;
  /** 调用类别:决定模式步与“自身免批”的判定 */
  kind: "shell" | "shell-write" | "file-read" | "file-write" | "mcp";
}

export const DEMO_SCENARIOS: Record<DemoScenarioId, DemoScenario> = {
  "bash-npm-test": {
    id: "bash-npm-test",
    label: "Bash: npm test",
    toolName: "Bash",
    specifier: "npm test",
    kind: "shell",
  },
  "bash-rm": {
    id: "bash-rm",
    label: "Bash: rm -rf build/",
    toolName: "Bash",
    specifier: "rm -rf build/",
    kind: "shell-write",
  },
  "read-env": {
    id: "read-env",
    label: "Read: ./.env",
    toolName: "Read",
    specifier: "./.env",
    kind: "file-read",
  },
  "edit-src": {
    id: "edit-src",
    label: "Edit: src/app.ts",
    toolName: "Edit",
    specifier: "src/app.ts",
    kind: "file-write",
  },
  "mcp-issue": {
    id: "mcp-issue",
    label: "mcp__github__get_issue",
    toolName: "mcp__github__get_issue",
    kind: "mcp",
  },
};

export interface DemoConfig {
  scenario: DemoScenarioId;
  mode: DemoMode;
  /** allow 规则 Bash(npm *) */
  allowNpm: boolean;
  /** deny 规则 Bash(rm *) */
  denyRm: boolean;
  /** ask 规则 Read(./.env) */
  askEnv: boolean;
  /** allowedTools 里的裸名 "Bash"(裸名 allow 条目) */
  bareBash: boolean;
  /** 是否配置了 canUseTool */
  hasCallback: boolean;
}

export const STEP_NAMES = [
  "Hooks",
  "Deny 规则",
  "Ask 规则",
  "权限模式",
  "Allow 规则",
  "canUseTool",
] as const;

export type StepStatus = "passed" | "hit" | "unreached";

export interface DemoStep {
  step: number;
  name: string;
  detail: string;
  status: StepStatus;
}

export type DemoOutcome = "execute" | "deny" | "prompt";

export interface DemoVerdict {
  scenario: DemoScenario;
  /** 六步逐行判定,供画布渲染 */
  steps: DemoStep[];
  /** 终止评估的步骤(1-6) */
  hitStep: number;
  outcome: DemoOutcome;
  callbackFired: boolean;
  hasCallback: boolean;
  shadowWarning: boolean;
}

export const OUTCOME_LABELS: Record<DemoOutcome, string> = {
  execute: "执行",
  deny: "拒绝",
  prompt: "询问 canUseTool",
};

/** 模式步未命中时每行显示的说明 */
const MODE_PASS_DETAIL: Record<DemoMode, string> = {
  default: "default 模式不自动放行,继续评估",
  acceptEdits: "acceptEdits 只自动放行文件操作,本调用不属于,继续评估",
  plan: "plan 模式只放行只读探索,本调用继续走规则评估",
  bypassPermissions: "",
  dontAsk: "dontAsk 模式不在这一步放行,拒绝发生在第 6 步",
};

/** 简化评估链:判定路径与官方评估顺序一致,只覆盖正文讲到的分支。 */
export function evaluatePermission(config: DemoConfig): DemoVerdict {
  const scenario = DEMO_SCENARIOS[config.scenario];
  const steps: DemoStep[] = [];
  let hit: { step: number; detail: string; outcome: DemoOutcome } | null = null;

  const pass = (step: number, detail: string) => {
    if (!hit) {
      steps.push({ step, name: STEP_NAMES[step - 1], detail, status: "passed" });
    }
  };

  // 第 1 步 Hooks:演示未配置 hook,直接通过。
  pass(1, "演示未配置 hook(实际上 hook 先于一切,deny 在 bypassPermissions 下也生效)");

  // 第 2 步 Deny 规则:任何模式下都拒绝。
  if (
    config.denyRm &&
    scenario.toolName === "Bash" &&
    (scenario.specifier ?? "").startsWith("rm")
  ) {
    hit = {
      step: 2,
      detail: "deny 规则 Bash(rm *) 命中:任何模式下都拒绝,含 bypassPermissions",
      outcome: "deny",
    };
  } else {
    pass(2, config.denyRm ? "deny 规则 Bash(rm *) 未命中" : "未启用 deny 规则");
  }

  // 第 3 步 Ask 规则:命中即交给回调;dontAsk 模式从不提示,改为拒绝。
  if (!hit) {
    if (config.askEnv && config.scenario === "read-env") {
      hit =
        config.mode === "dontAsk"
          ? {
              step: 3,
              detail: "ask 规则命中,但 dontAsk 模式从不提示:直接拒绝",
              outcome: "deny",
            }
          : {
              step: 3,
              detail: "ask 规则 Read(./.env) 命中:交给 canUseTool,bypassPermissions 也拦得回",
              outcome: "prompt",
            };
    } else {
      pass(
        3,
        config.askEnv
          ? "ask 规则 Read(./.env) 未命中"
          : "未启用 ask 规则(ask 名单只能写在 settings.json)",
      );
    }
  }

  // 第 4 步 权限模式:整体放行策略;deny/ask 已在前面,allow 在后面。
  if (!hit) {
    if (config.mode === "bypassPermissions") {
      hit = {
        step: 4,
        detail: "bypassPermissions 放行(关键路径删除等例外除外)",
        outcome: "execute",
      };
    } else if (
      config.mode === "acceptEdits" &&
      (scenario.kind === "file-write" || scenario.kind === "shell-write")
    ) {
      hit = {
        step: 4,
        detail: "acceptEdits 自动放行工作目录内的文件编辑与文件系统命令(mkdir、rm、mv 等)",
        outcome: "execute",
      };
    } else if (
      config.mode === "plan" &&
      (scenario.kind === "shell" ||
        scenario.kind === "shell-write" ||
        scenario.kind === "file-write")
    ) {
      hit = {
        step: 4,
        detail: "plan 模式不自动放行会改动的操作,推给 canUseTool(allow 规则也救不回编辑)",
        outcome: "prompt",
      };
    } else {
      pass(4, MODE_PASS_DETAIL[config.mode]);
    }
  }

  // 第 5 步 Allow 规则:裸名条目放行整个工具;作用域规则只放行匹配;调用自身免批也在这步解决。
  if (!hit) {
    if (config.bareBash && scenario.toolName === "Bash") {
      hit = {
        step: 5,
        detail: '裸名 allowedTools 条目 "Bash" 放行整个工具(已配回调时会触发遮蔽警告)',
        outcome: "execute",
      };
    } else if (
      config.allowNpm &&
      scenario.toolName === "Bash" &&
      (scenario.specifier ?? "").startsWith("npm")
    ) {
      hit = {
        step: 5,
        detail: "allow 规则 Bash(npm *) 命中:只放行匹配的调用",
        outcome: "execute",
      };
    } else if (scenario.kind === "file-read") {
      hit = {
        step: 5,
        detail: "工作目录内的文件读取自身免批,不需要规则",
        outcome: "execute",
      };
    } else {
      pass(5, "没有 allow 规则命中,继续下落");
    }
  }

  // 第 6 步 canUseTool:兜底应答;无人应答或 dontAsk 时直接拒绝。
  if (!hit) {
    if (config.mode === "dontAsk") {
      hit = {
        step: 6,
        detail: "dontAsk 模式跳过本步:本应提示的调用直接拒绝,回调不触发",
        outcome: "deny",
      };
    } else if (!config.hasCallback) {
      hit = {
        step: 6,
        detail: "未配置 canUseTool:本应提示的调用被直接拒绝",
        outcome: "deny",
      };
    } else {
      hit = {
        step: 6,
        detail: "进入 canUseTool,由回调返回 allow / deny(可改写输入、落规则)",
        outcome: "prompt",
      };
    }
  }

  // 补齐六行:命中行标记 hit,之后的行标记未到达。
  const fullSteps: DemoStep[] = [];
  for (let step = 1; step <= 6; step += 1) {
    const row = steps.find((item) => item.step === step);
    if (hit.step === step) {
      fullSteps.push({ step, name: STEP_NAMES[step - 1], detail: hit.detail, status: "hit" });
    } else if (row) {
      fullSteps.push(row);
    } else {
      fullSteps.push({
        step,
        name: STEP_NAMES[step - 1],
        detail: "评估已在此前结束",
        status: "unreached",
      });
    }
  }

  return {
    scenario,
    steps: fullSteps,
    hitStep: hit.step,
    outcome: hit.outcome,
    callbackFired: hit.outcome === "prompt",
    hasCallback: config.hasCallback,
    shadowWarning:
      config.hasCallback && (config.mode === "bypassPermissions" || config.bareBash),
  };
}

/** 读数面板用的一行摘要(供 stories 的 readout 直接显示) */
export interface DemoSnapshot {
  stepReadout: string;
  outcomeReadout: string;
  callbackReadout: string;
  warningReadout: string;
}

export function buildSnapshot(verdict: DemoVerdict): DemoSnapshot {
  let callbackReadout: string;
  if (!verdict.hasCallback) {
    callbackReadout = "未配置(此类调用被拒绝)";
  } else if (verdict.callbackFired) {
    callbackReadout = "触发";
  } else if (verdict.outcome === "execute") {
    callbackReadout = "未触发(提前放行)";
  } else {
    callbackReadout = "未触发(前面已拒绝)";
  }

  return {
    stepReadout: `${verdict.hitStep} · ${STEP_NAMES[verdict.hitStep - 1]}`,
    outcomeReadout: OUTCOME_LABELS[verdict.outcome],
    callbackReadout,
    warningReadout: verdict.shadowWarning ? "CLAUDE_SDK_CAN_USE_TOOL_SHADOWED" : "无",
  };
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:六步评估链逐行判定面板(Canvas 演示载体)                  */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const HIT_COLORS: Record<DemoOutcome, string> = {
  execute: "#159570",
  deny: "#dc2626",
  prompt: "#b45309",
};

const HIT_BACKGROUND: Record<DemoOutcome, string> = {
  execute: "#e7f6f0",
  deny: "#fdeaea",
  prompt: "#fdf1e2",
};

export interface DemoOptions extends DemoConfig {}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createPermissionsDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = {
    scenario: "bash-npm-test",
    mode: "default",
    allowNpm: true,
    denyRm: false,
    askEnv: false,
    bareBash: false,
    hasCallback: true,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(280, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const verdict = evaluatePermission(current);
    const margin = 18;
    const titleTop = 26;

    ctx.fillStyle = "#172033";
    ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      `评估链回放:${truncate(verdict.scenario.label, 44)}(演示数据)`,
      margin,
      titleTop,
    );

    const listTop = titleTop + 12;
    const rowHeight = (height - listTop - 10) / verdict.steps.length;

    // 六步逐行:命中行按结果着色,通过行普通,未到达行灰显
    verdict.steps.forEach((step, index) => {
      const rowTop = listTop + index * rowHeight;
      const isHit = step.status === "hit";
      const isUnreached = step.status === "unreached";
      const hitColor = isHit ? HIT_COLORS[verdict.outcome] : undefined;

      if (isHit) {
        ctx.fillStyle = HIT_BACKGROUND[verdict.outcome];
        roundRect(margin, rowTop + 2, width - margin * 2, rowHeight - 4, 6);
        ctx.fill();
        ctx.fillStyle = hitColor!;
        ctx.fillRect(margin, rowTop + 4, 4, rowHeight - 8);
      }

      const baseX = margin + 14;
      const nameColor = isHit ? hitColor! : isUnreached ? "#94a3b8" : "#334155";
      ctx.fillStyle = nameColor;
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(`${step.step} · ${step.name}`, baseX, rowTop + rowHeight * 0.42);

      // 行尾状态词:命中 / 通过 / 未到达
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      const statusText = isHit
        ? OUTCOME_LABELS[verdict.outcome]
        : step.status === "passed"
          ? "通过"
          : "未到达";
      const statusWidth = ctx.measureText(statusText).width;
      ctx.fillStyle = nameColor;
      ctx.fillText(statusText, width - margin - 14 - statusWidth, rowTop + rowHeight * 0.42);

      ctx.fillStyle = isHit ? "#7c2d12" : isUnreached ? "#b6c2d2" : "#64748b";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(
        truncate(step.detail, Math.floor((width - baseX - 30) / 6.2)),
        baseX,
        rowTop + rowHeight * 0.82,
      );
    });

    emit(buildSnapshot(verdict));
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
