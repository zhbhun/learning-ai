/*
 * 演示:skills 选项如何决定会话的技能放行面,以及"限制"放不放过哪些路径。
 * 输入:skills 四档取值(省略 / 'all' / 名称列表 / [])+ 名称列表模式下三个技能的列入开关。
 * 操作:切换取值与列入开关,观察技能卡片状态与会话技能面四条读数。
 * 预期:省略与 'all' 放行全部;名称列表只放行列出的;[] 全禁。
 *       三条路径待遇不同:未列出的技能模型看不见、Skill 工具拒绝调用,
 *       但按名 dispatch 与磁盘文件读取不受限制;init 的 skills 数组不随列表变化。
 * 阅读主线:上半部分是放行规则的教学核心(纯函数,全部为演示数据,不调用 LLM API);
 *           下半部分是 Canvas 渲染外壳(演示载体,可略读)。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:放行规则(对照正文「skills 选项:放行面」一节的四档取值)     */
/* ------------------------------------------------------------------ */

export type DemoSkillId = "pdf" | "commit-helper" | "security-check";

export interface DemoSkill {
  id: DemoSkillId;
  /** SKILL.md 的 description(演示值,决定模型何时自动调用) */
  description: string;
}

/** 演示场景:项目 .claude/skills/ 下三个带 description 的技能(均 user-invocable) */
export const DEMO_SKILLS: DemoSkill[] = [
  { id: "pdf", description: "处理 PDF 文档" },
  { id: "commit-helper", description: "起草提交信息" },
  { id: "security-check", description: "扫描安全隐患" },
];

export type DemoSkillsMode = "omit" | "all" | "list" | "none";

export const MODE_LABELS: Record<DemoSkillsMode, string> = {
  omit: "省略(默认)",
  all: "'all'",
  list: "名称列表",
  none: "[]",
};

export interface DemoAllowlistOptions {
  mode: DemoSkillsMode;
  /** 名称列表模式下是否列入该技能(仅 list 模式生效) */
  pdf: boolean;
  commitHelper: boolean;
  securityCheck: boolean;
}

export interface DemoSkillSurface {
  id: DemoSkillId;
  description: string;
  /** init 消息的 skills 数组:user-invocable 技能恒在,不随 skills 列表变化 */
  inInitArray: boolean;
  /** 模型可见(名称 + description 常驻系统提示词) */
  visibleToModel: boolean;
  /** Skill 工具是否放行调用 */
  skillToolAllowed: boolean;
  /** /<name> 按名 dispatch:不受 skills 列表限制 */
  dispatchAllowed: boolean;
}

export interface DemoSurfaceResult {
  mode: DemoSkillsMode;
  skills: DemoSkillSurface[];
  /** init 数组技能数(演示场景未计 bundled 技能) */
  initArrayCount: number;
  /** 模型可见技能数 */
  visibleCount: number;
  /** 全部对模型隐藏([] 模式)时为 true */
  allBlocked: boolean;
}

export function buildSkillSurface(
  options: DemoAllowlistOptions,
): DemoSurfaceResult {
  const listMembership: Record<DemoSkillId, boolean> = {
    pdf: options.pdf,
    "commit-helper": options.commitHelper,
    "security-check": options.securityCheck,
  };

  // 四档取值:省略与 'all' 放行全部;名称列表只放行列出的;[] 全禁
  const listed = (id: DemoSkillId) =>
    options.mode === "omit" ||
    options.mode === "all" ||
    (options.mode === "list" && listMembership[id]);

  const skills: DemoSkillSurface[] = DEMO_SKILLS.map((skill) => ({
    ...skill,
    inInitArray: true,
    visibleToModel: listed(skill.id),
    skillToolAllowed: listed(skill.id),
    dispatchAllowed: true,
  }));

  return {
    mode: options.mode,
    skills,
    initArrayCount: skills.length,
    visibleCount: skills.filter((skill) => skill.visibleToModel).length,
    allBlocked: options.mode === "none",
  };
}

/* ------------------------------------------------------------------ */
/* 渲染外壳:技能卡片 + 会话技能面(Canvas 演示载体)                     */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

export interface DemoSnapshot {
  initReadout: string;
  visibleReadout: string;
  toolReadout: string;
  dispatchReadout: string;
}

export interface DemoOptions extends DemoAllowlistOptions {}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createSkillsAllowlistDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = {
    mode: "omit",
    pdf: true,
    commitHelper: false,
    securityCheck: true,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    const margin = 24;
    const gap = 8;
    const cardTop = 46;
    const cardHeight = 104;
    const cardWidth = (width - margin * 2 - gap * 2) / 3;
    const result = buildSkillSurface(current);

    // 面板行数随内容换行变化,画布高度自适应
    const toolText = skillToolText(result);
    const toolLines = wrapText(
      `Skill 工具调 commit-helper: ${toolText}`,
      width - margin * 2 - 28,
    ).length;
    const panelHeight = 120 + 20 * toolLines;
    const height = cardTop + cardHeight + 22 + panelHeight + (result.allBlocked ? 36 : 0);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#172033";
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("skills 选项回放:三条路径(演示数据)", margin, 30);

    // 技能卡片:磁盘上已发现的三个技能;init ✓ 恒定,模型可见随放行面变化
    result.skills.forEach((skill, index) => {
      const x = margin + index * (cardWidth + gap);

      ctx.fillStyle = "#f8fafc";
      roundRect(x, cardTop, cardWidth, cardHeight, 8);
      ctx.fill();
      ctx.strokeStyle = skill.visibleToModel ? "#4f7cff" : "#e2e8f0";
      ctx.lineWidth = 1;
      roundRect(x, cardTop, cardWidth, cardHeight, 8);
      ctx.stroke();

      ctx.fillStyle = skill.visibleToModel ? "#4f7cff" : "#cbd5e1";
      roundRect(x + 10, cardTop + 10, cardWidth - 20, 5, 2.5);
      ctx.fill();

      ctx.fillStyle = "#172033";
      ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(fit(skill.id, cardWidth - 20), x + 10, cardTop + 32);

      ctx.fillStyle = "#64748b";
      ctx.font = "10px ui-sans-serif, system-ui, sans-serif";
      ctx.fillText(fit(skill.description, cardWidth - 20), x + 10, cardTop + 48);

      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = "#0f766e";
      ctx.fillText("init ✓", x + 10, cardTop + 68);
      ctx.fillStyle = skill.visibleToModel ? "#1d4ed8" : "#94a3b8";
      ctx.fillText(
        skill.visibleToModel ? "模型可见 ✓" : "模型可见 ✗",
        x + 10,
        cardTop + 86,
      );
    });

    // 会话技能面:四条读数对应正文的三条路径 + init 数组
    const panelTop = cardTop + cardHeight + 22;
    ctx.fillStyle = "#f8fafc";
    roundRect(margin, panelTop, width - margin * 2, panelHeight, 8);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    roundRect(margin, panelTop, width - margin * 2, panelHeight, 8);
    ctx.stroke();

    ctx.fillStyle = "#172033";
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`会话技能面(skills: ${MODE_LABELS[result.mode]})`, margin + 14, panelTop + 22);

    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = "#334155";
    ctx.fillText(
      `init skills 数组: ${result.initArrayCount} 个(不随列表变化)`,
      margin + 14,
      panelTop + 44,
    );
    const hidden = result.skills
      .filter((skill) => !skill.visibleToModel)
      .map((skill) => skill.id);
    const visibleText =
      result.allBlocked
        ? "模型可见: 0 个(全禁)"
        : hidden.length > 0
          ? `模型可见: ${result.visibleCount} 个(${hidden.join("、")} 未列出)`
          : `模型可见: ${result.visibleCount} 个`;
    ctx.fillText(visibleText, margin + 14, panelTop + 64);

    ctx.fillStyle = toolText.startsWith("拒绝") ? "#b45309" : "#334155";
    wrapText(
      `Skill 工具调 commit-helper: ${toolText}`,
      width - margin * 2 - 28,
    ).forEach((line, lineIndex) => {
      ctx.fillText(line, margin + 14, panelTop + 84 + lineIndex * 20);
    });
    ctx.fillStyle = "#334155";
    ctx.fillText(
      "/commit-helper dispatch: 可触发(不受列表限制)",
      margin + 14,
      panelTop + 104 + toolLines * 20,
    );

    // [] 模式横幅:全禁拦得住模型,拦不住 dispatch 与文件读取
    if (result.allBlocked) {
      const bannerTop = panelTop + panelHeight + 12;
      ctx.fillStyle = "#fdf1e2";
      roundRect(margin, bannerTop, width - margin * 2, 24, 6);
      ctx.fill();
      ctx.fillStyle = "#b45309";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(
        fit("[] 全禁:拦得住模型,拦不住 dispatch 与文件读取", width - margin * 2 - 20),
        margin + 10,
        bannerTop + 16,
      );
    }

    emit({
      initReadout: `${result.initArrayCount} 个(不随列表变化)`,
      visibleReadout: result.allBlocked
        ? "0 个(全禁)"
        : hidden.length > 0
          ? `${result.visibleCount} 个,${hidden.join("、")} 被隐藏`
          : `${result.visibleCount} 个`,
      toolReadout: toolText,
      dispatchReadout: "可触发(不受列表限制)",
    });
  }

  function skillToolText(result: DemoSurfaceResult): string {
    const commitHelper = result.skills.find(
      (skill) => skill.id === "commit-helper",
    )!;
    return commitHelper.skillToolAllowed
      ? "执行(已放行)"
      : "拒绝:not in this session's skills allowlist";
  }

  /** 按当前字体的实测宽度截断,保证最小画布宽度下不溢出卡片 */
  function fit(text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let out = text;
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return `${out}…`;
  }

  function wrapText(text: string, maxWidth: number): string[] {
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
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
