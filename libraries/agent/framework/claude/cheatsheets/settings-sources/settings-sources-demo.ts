/*
 * 演示:settingSources 三层文件设置与 settings 标志层怎样合并成生效配置。
 * 输入:四个开关——user 全局层、project 项目层、local 个人层、settings 标志层。
 * 操作:开关任一来源,观察生效配置面板中 model 与 allow 规则的值、出处,以及各层 CLAUDE.md 的加载情况。
 * 预期:标量键(model)取已启用来源中优先级最高的一层;allow 类列表按优先级从低到高合并去重;
 *       CLAUDE.md 家族随各自来源开关加载;全关三个文件层即隔离模式。
 * 阅读主线:上半部分是合并规则的教学核心(纯函数,与 resolveSettings 返回的
 *           effective / provenance 同一套判断);下半部分是 Canvas 渲染外壳(演示载体,可略读)。
 *           全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:各层演示数据与合并规则(对照正文各小节的层职责)            */
/* ------------------------------------------------------------------ */

export type DemoSourceId = "user" | "project" | "local" | "flag";

export interface DemoSource {
  id: DemoSourceId;
  /** 该层的设置文件位置;flag 层来自 Options.settings,不在磁盘固定位置 */
  path: string;
  /** 该层声明的 model(演示值) */
  model?: string;
  /** 该层声明的 permissions.allow(演示值) */
  allow: string[];
  /** 随本层加载的指令文件(CLAUDE.md 家族,用于计数) */
  memoryFiles: string[];
  /** 卡片里展示的指令文件短标签 */
  memoryLabel?: string;
}

export interface DemoCascadeOptions {
  user: boolean;
  project: boolean;
  local: boolean;
  flag: boolean;
}

export interface DemoSourceView {
  id: DemoSourceId;
  label: string;
  path: string;
  enabled: boolean;
  model?: string;
  allowCount: number;
}

export interface DemoCascadeResult {
  sources: DemoSourceView[];
  /** 标量键:已启用来源中,最高优先级层说了算 */
  model: { value: string | null; from: DemoSourceId | null };
  /** 列表键:各已启用层按优先级从低到高合并去重 */
  allow: { rules: string[]; from: DemoSourceId[] };
  memoryFiles: Array<{ file: string; loaded: boolean }>;
  /** 三个文件层全关 = SDK 隔离模式 */
  isolation: boolean;
}

/** 读数面板用的一行摘要(供 stories 的 readout 直接显示) */
export interface DemoSnapshot {
  modelReadout: string;
  allowReadout: string;
  memoryReadout: string;
  isolationReadout: string;
}

/** 合并顺序即优先级:从低到高;排序依据见正文“优先级与合并”。 */
const SOURCE_ORDER: DemoSourceId[] = ["user", "project", "local", "flag"];

export const SOURCE_LABELS: Record<DemoSourceId, string> = {
  user: "user 全局层",
  project: "project 项目层",
  local: "local 个人层",
  flag: "flag 标志层",
};

/** 预设的各层演示数据 */
export const DEMO_SOURCES: Record<DemoSourceId, DemoSource> = {
  user: {
    id: "user",
    path: "~/.claude/settings.json",
    model: "claude-sonnet-4-5",
    allow: ["Bash(npm run lint)"],
    memoryFiles: ["~/.claude/CLAUDE.md"],
    memoryLabel: "~/.claude/CLAUDE.md",
  },
  project: {
    id: "project",
    path: "<cwd>/.claude/settings.json",
    model: "claude-haiku-4-5",
    allow: ["Bash(npm test)", "Edit(src/**)"],
    memoryFiles: ["CLAUDE.md", ".claude/rules/*.md"],
    memoryLabel: "CLAUDE.md + rules",
  },
  local: {
    id: "local",
    path: "<cwd>/.claude/settings.local.json",
    allow: ["Bash(npm run dev)"],
    memoryFiles: ["CLAUDE.local.md"],
    memoryLabel: "CLAUDE.local.md",
  },
  flag: {
    id: "flag",
    path: "options.settings(内存)",
    model: "claude-sonnet-4-6",
    allow: [],
    memoryFiles: [],
  },
};

export function buildSettingsCascade(
  options: DemoCascadeOptions,
): DemoCascadeResult {
  const enabled = SOURCE_ORDER.filter((id) => options[id]);

  // 标量键(model):按优先级从低到高遍历,最后写入者即最高层
  let modelValue: string | null = null;
  let modelFrom: DemoSourceId | null = null;
  for (const id of enabled) {
    const source = DEMO_SOURCES[id];
    if (source.model !== undefined) {
      modelValue = source.model;
      modelFrom = id;
    }
  }

  // 列表键(permissions.allow):并集合并,保持优先级从低到高的去重顺序
  const allowRules: string[] = [];
  const allowFrom: DemoSourceId[] = [];
  for (const id of enabled) {
    const source = DEMO_SOURCES[id];
    if (source.allow.length > 0) {
      allowFrom.push(id);
    }
    for (const rule of source.allow) {
      if (!allowRules.includes(rule)) {
        allowRules.push(rule);
      }
    }
  }

  // CLAUDE.md 家族:随各自来源开关加载(flag 层不带指令文件)
  const memoryFiles = SOURCE_ORDER.filter((id) => id !== "flag").flatMap((id) =>
    DEMO_SOURCES[id].memoryFiles.map((file) => ({
      file,
      loaded: options[id],
    })),
  );

  return {
    sources: SOURCE_ORDER.map((id) => ({
      id,
      label: SOURCE_LABELS[id],
      path: DEMO_SOURCES[id].path,
      enabled: options[id],
      model: DEMO_SOURCES[id].model,
      allowCount: DEMO_SOURCES[id].allow.length,
    })),
    model: { value: modelValue, from: modelFrom },
    allow: { rules: allowRules, from: allowFrom },
    memoryFiles,
    isolation: !options.user && !options.project && !options.local,
  };
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:来源卡片 + 生效配置面板(Canvas 演示载体)                  */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

const SOURCE_COLORS: Record<DemoSourceId, string> = {
  user: "#64748b",
  project: "#4f7cff",
  local: "#159570",
  flag: "#8b5cf6",
};

export interface DemoOptions extends DemoCascadeOptions {}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createSettingsSourcesDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = {
    user: true,
    project: true,
    local: true,
    flag: false,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const result = buildSettingsCascade(current);
    const margin = 24;
    const gap = 8;
    const cardWidth = (width - margin * 2 - gap * 3) / 4;
    const cardTop = 46;
    const cardHeight = 114;

    ctx.fillStyle = "#172033";
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("设置合并回放:开关来源看生效值(演示数据)", margin, 30);

    // 来源卡片:按优先级从低到高排列,关闭的层灰显;✓/✗ 是该层 CLAUDE.md 的加载状态
    for (const source of result.sources) {
      const index = SOURCE_ORDER.indexOf(source.id);
      const x = margin + index * (cardWidth + gap);
      const color = source.enabled ? SOURCE_COLORS[source.id] : "#cbd5e1";
      const textColor = source.enabled ? "#172033" : "#94a3b8";

      ctx.fillStyle = "#f8fafc";
      roundRect(x, cardTop, cardWidth, cardHeight, 8);
      ctx.fill();
      ctx.strokeStyle = source.enabled ? color : "#e2e8f0";
      ctx.lineWidth = 1;
      roundRect(x, cardTop, cardWidth, cardHeight, 8);
      ctx.stroke();

      ctx.fillStyle = color;
      roundRect(x + 12, cardTop + 10, cardWidth - 24, 5, 2.5);
      ctx.fill();

      ctx.fillStyle = textColor;
      ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(source.label, x + 12, cardTop + 30);
      if (!source.enabled) {
        const labelWidth = ctx.measureText(source.label).width;
        ctx.strokeStyle = "#94a3b8";
        ctx.beginPath();
        ctx.moveTo(x + 12, cardTop + 26);
        ctx.lineTo(x + 14 + labelWidth, cardTop + 26);
        ctx.stroke();
      }

      ctx.fillStyle = source.enabled ? "#475569" : "#b6c2d2";
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(truncate(source.path, cardWidth - 22), x + 12, cardTop + 48);

      ctx.fillStyle = source.enabled ? "#334155" : "#b6c2d2";
      ctx.fillText(
        source.model ? `model: ${truncate(source.model, 13)}` : "model: —",
        x + 12,
        cardTop + 66,
      );
      ctx.fillText(`allow: ${source.allowCount} 条`, x + 12, cardTop + 82);

      if (source.memoryLabel) {
        ctx.fillStyle = source.enabled ? "#0f766e" : "#94a3b8";
        ctx.fillText(
          `${source.enabled ? "✓" : "✗"} ${truncate(source.memoryLabel, cardWidth - 30)}`,
          x + 12,
          cardTop + 100,
        );
      } else {
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("不带指令文件", x + 12, cardTop + 100);
      }
    }

    // 合并方向指示
    ctx.fillStyle = "#64748b";
    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(
      "优先级从低到高 ↓ (user < project < local < flag < 托管策略)",
      margin,
      cardTop + cardHeight + 20,
    );

    // 生效配置面板:标量键看出处,列表键看合并结果
    const panelTop = cardTop + cardHeight + 34;
    const modelLine = result.model.value
      ? `model: ${result.model.value}  ← 来自 ${SOURCE_LABELS[result.model.from!]}`
      : "model: 未由设置层决定(回落到 Options.model 或 CLI 默认)";
    const allowText =
      result.allow.rules.length > 0
        ? `permissions.allow(${result.allow.rules.length}): ${result.allow.rules.join(", ")}`
        : "permissions.allow: (无)";
    const allowLines = wrapText(allowText, width - margin * 2 - 28);
    const panelHeight = 50 + 20 * allowLines.length;

    ctx.fillStyle = "#f8fafc";
    roundRect(margin, panelTop, width - margin * 2, panelHeight, 8);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    roundRect(margin, panelTop, width - margin * 2, panelHeight, 8);
    ctx.stroke();

    ctx.fillStyle = "#172033";
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("生效配置(effective)", margin + 14, panelTop + 20);

    ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#334155";
    ctx.fillText(truncate(modelLine, 70), margin + 14, panelTop + 38);
    allowLines.forEach((line, lineIndex) => {
      ctx.fillText(line, margin + 14, panelTop + 58 + lineIndex * 20);
    });
    const panelBottom = panelTop + panelHeight;

    // 隔离模式横幅:三个文件层全关时出现,锚定画布底部
    if (result.isolation) {
      const bannerTop = Math.max(panelBottom + 10, height - 34);
      ctx.fillStyle = "#fdf1e2";
      roundRect(margin, bannerTop, width - margin * 2, 24, 6);
      ctx.fill();
      ctx.fillStyle = "#b45309";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(
        "settingSources: [] → 隔离模式:文件设置与 CLAUDE.md 全部关闭,托管策略层仍会读",
        margin + 10,
        bannerTop + 16,
      );
    }

    emit({
      modelReadout: result.model.value
        ? `${result.model.value} ← ${SOURCE_LABELS[result.model.from!]}`
        : "未由设置层决定",
      allowReadout:
        result.allow.rules.length > 0
          ? `${result.allow.rules.length} 条,合并自 ${result.allow.from.length} 层`
          : "无",
      memoryReadout: `${result.memoryFiles.filter((item) => item.loaded).length} / ${result.memoryFiles.length} 个已加载`,
      isolationReadout: result.isolation ? "开(隔离模式)" : "关",
    });
  }

  function truncate(text: string, maxChars: number): string {
    return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
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
