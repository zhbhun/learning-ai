/*
 * 演示:settingSources 层开关与启动目录如何决定 supportedCommands 列出哪些 slash 命令。
 * 输入:user 层开关、project 层开关、启动目录(仓库根 / packages/web)、agent 是否已读取 packages/web 子树。
 * 操作:切换任一输入,对比左侧演示文件树与右侧命令列表。
 * 预期:user 层管 ~/.claude 下的命令;project 层管仓库命令,且从启动目录向上回溯到仓库根都可见;
 *       启动目录之下的嵌套命令不出现在启动列表,agent 读到该子树文件后才按需加载(对应 commands_changed 通知)。
 * 阅读主线:上半部分是发现规则(commandNameFor / discoverCommands 纯函数,输出与 supportedCommands
 *           同构的演示列表);下半部分是 Canvas 渲染外壳(演示载体,可略读)。
 *           全部为演示数据,不调用 LLM API。
 */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

/* ------------------------------------------------------------------ */
/* 教学核心:演示文件、命名推导与发现规则                                */
/* ------------------------------------------------------------------ */

/** 一个可能成为命令的文件;~ 开头表示用户层,repo/ 开头表示演示仓库 */
export interface DemoFile {
  path: string;
  /** commands/*.md 为旧格式单文件;skills/<名字>/SKILL.md 为新格式 */
  kind: "command" | "skill";
  /** frontmatter argument-hint 的演示值 */
  hint?: string;
}

/** 演示文件系统里的六个文件,覆盖三种位置:user 层、仓库根、嵌套子目录 */
export const DEMO_FILES: DemoFile[] = [
  { path: "~/.claude/commands/commit.md", kind: "command" },
  { path: "~/.claude/skills/deploy-staging/SKILL.md", kind: "skill", hint: "[环境]" },
  { path: "repo/.claude/commands/deploy.md", kind: "command" },
  { path: "repo/.claude/commands/frontend/component.md", kind: "command" },
  { path: "repo/.claude/skills/review/SKILL.md", kind: "skill" },
  { path: "repo/packages/web/.claude/skills/a11y/SKILL.md", kind: "skill" },
];

export interface DemoOptions {
  user: boolean;
  project: boolean;
  /** true = 启动目录在 repo/packages/web,否则为仓库根 */
  cwdWeb: boolean;
  /** agent 已读取 packages/web 子树的文件(触发嵌套命令按需加载) */
  readNested: boolean;
}

export interface DiscoveredCommand {
  name: string;
  hint: string;
  source: "user" | "project";
  file: string;
  /** true = 启动时已在列表;false = 启动目录之下,待按需加载 */
  loaded: boolean;
  /** 嵌套子目录命令:按需加载,加载时伴随 commands_changed 通知 */
  onDemand: boolean;
}

/** 命令名推导:commands/ 下取相对路径去扩展名、/ 换 :;skills/ 下取目录名(或 frontmatter name) */
export function commandNameFor(file: DemoFile): string {
  if (file.kind === "command") {
    const relative = file.path.split(".claude/commands/")[1] ?? "";
    return relative.replace(/\.md$/, "").replace(/\//g, ":");
  }
  const relative = file.path.split(".claude/skills/")[1] ?? "";
  return relative.split("/")[0];
}

/**
 * 发现规则:层开关过滤来源;嵌套命令只在启动目录位于其子树、或 agent
 * 已读取该子树文件时进入列表。同名裁决(enterprise > personal > project、
 * skill 胜 commands 文件)不在本演示数据内,见正文。
 */
export function discoverCommands(options: DemoOptions): DiscoveredCommand[] {
  return DEMO_FILES.flatMap((file) => {
    const source: "user" | "project" = file.path.startsWith("~") ? "user" : "project";
    if (source === "user" && !options.user) return [];
    if (source === "project" && !options.project) return [];
    const onDemand = file.path.includes("packages/web/.claude/");
    const loaded = !onDemand || options.cwdWeb || options.readNested;
    return [
      {
        name: commandNameFor(file),
        hint: file.hint ?? "",
        source,
        file: file.path,
        loaded,
        onDemand,
      },
    ];
  });
}

/** 读数面板用的一行摘要(供 stories 的 readout 直接显示) */
export interface DemoSnapshot {
  countReadout: string;
  repoReadout: string;
  nestedReadout: string;
}

/* ------------------------------------------------------------------ */
/* Canvas 渲染外壳                                                      */
/* ------------------------------------------------------------------ */

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

const COLORS = {
  title: "#172033",
  header: "#0f172a",
  path: "#64748b",
  name: "#1d4ed8",
  hint: "#475569",
  disabled: "#cbd5e1",
  tag: "#b45309",
  note: "#475569",
  divider: "#e2e8f0",
};

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

interface FileRow {
  path: string;
  name: string;
  hint: string;
  onDemand: boolean;
  loaded: boolean;
}

export function createSlashCommandsDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: DemoOptions = { user: true, project: true, cwdWeb: false, readNested: false };

  function drawFileRow(
    row: FileRow,
    x: number,
    y: number,
    maxWidth: number,
  ): void {
    const dimmed = row.loaded ? COLORS.path : COLORS.disabled;
    drawingContext.fillStyle = dimmed;
    drawingContext.font = `11px ${MONO}`;
    drawingContext.fillText(truncate(row.path, maxWidth, 11), x, y);

    drawingContext.fillStyle = row.loaded ? COLORS.name : COLORS.disabled;
    drawingContext.font = `13px ${MONO}`;
    drawingContext.fillText(`→ /${row.name}`, x + 14, y + 16);

    if (row.hint) {
      drawingContext.fillStyle = row.loaded ? COLORS.hint : COLORS.disabled;
      drawingContext.fillText(row.hint, x + 14 + drawingContext.measureText(`→ /${row.name}`).width + 6, y + 16);
    }
  }

  function truncate(text: string, maxWidth: number, fontSize: number): string {
    drawingContext.font = `${fontSize}px ${MONO}`;
    if (drawingContext.measureText(text).width <= maxWidth) return text;
    let cut = text.length;
    while (cut > 1 && drawingContext.measureText(text.slice(0, cut) + "…").width > maxWidth) {
      cut -= 1;
    }
    return text.slice(0, cut) + "…";
  }

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(720, size.width);
    const height = Math.max(500, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const discovered = discoverCommands(current);
    const leftWidth = Math.min(360, width * 0.46);
    const leftX = 36;
    const rightX = leftX + leftWidth + 24;

    drawingContext.fillStyle = COLORS.title;
    drawingContext.font = `600 17px ${SANS}`;
    drawingContext.fillText("命令文件 → 启动时可用命令(演示数据)", leftX, 34);

    drawingContext.fillStyle = COLORS.hint;
    drawingContext.font = `13px ${SANS}`;
    drawingContext.fillText("文件系统", leftX, 62);
    drawingContext.fillText("supportedCommands()(演示输出)", rightX, 62);
    drawingContext.strokeStyle = COLORS.divider;
    drawingContext.beginPath();
    drawingContext.moveTo(leftX, 70);
    drawingContext.lineTo(width - 28, 70);
    drawingContext.stroke();

    const groups: Array<{ label: string; state: string; rows: FileRow[] }> = [
      {
        label: "~/.claude(用户层)",
        state: current.user ? "加载" : "未加载",
        rows: discovered
          .filter((c) => c.source === "user")
          .map((c) => ({ path: c.file, name: c.name, hint: c.hint, onDemand: c.onDemand, loaded: c.loaded })),
      },
      {
        label: "repo/.claude(仓库根)",
        state: !current.project ? "未加载" : current.cwdWeb ? "从子目录回溯加载" : "启动加载",
        rows: discovered
          .filter((c) => c.source === "project" && !c.onDemand)
          .map((c) => ({ path: c.file, name: c.name, hint: c.hint, onDemand: c.onDemand, loaded: c.loaded })),
      },
      {
        label: "repo/packages/web/.claude(嵌套)",
        state: !current.project
          ? "未加载"
          : discovered.some((c) => c.onDemand && c.loaded)
            ? current.cwdWeb ? "启动即加载" : "按需加载完成"
            : "启动目录之下,待按需",
        rows: discovered
          .filter((c) => c.onDemand)
          .map((c) => ({ path: c.file, name: c.name, hint: c.hint, onDemand: c.onDemand, loaded: c.loaded })),
      },
    ];

    let y = 94;
    for (const group of groups) {
      const groupOff = group.state === "未加载";
      drawingContext.fillStyle = groupOff ? COLORS.disabled : COLORS.header;
      drawingContext.font = `600 13px ${SANS}`;
      drawingContext.fillText(group.label, leftX, y);
      const labelWidth = drawingContext.measureText(group.label).width;
      drawingContext.fillStyle = groupOff ? COLORS.disabled : COLORS.tag;
      drawingContext.font = `12px ${SANS}`;
      drawingContext.fillText(`· ${group.state}`, leftX + labelWidth + 8, y);
      y += 20;
      for (const row of group.rows) {
        drawFileRow(row, leftX + 10, y, leftWidth - 20);
        y += 42;
      }
      y += 6;
    }

    // 右栏:启动时真正可用的命令(与 CLI 行为一致——未加载的嵌套命令不出现)
    const listed = discovered.filter((c) => c.loaded);
    let ry = 94;
    for (const command of listed) {
      drawingContext.fillStyle = COLORS.name;
      drawingContext.font = `13px ${MONO}`;
      drawingContext.fillText(`/${command.name}`, rightX, ry);
      const nameWidth = drawingContext.measureText(`/${command.name}`).width;
      drawingContext.fillStyle = COLORS.hint;
      drawingContext.fillText(command.hint, rightX + nameWidth + 8, ry);
      const hintWidth = command.hint ? drawingContext.measureText(command.hint).width + 8 : 0;
      drawingContext.fillStyle = command.onDemand ? COLORS.tag : COLORS.path;
      drawingContext.font = `11px ${SANS}`;
      const suffix = command.onDemand ? "(按需加载)" : command.source === "user" ? "(user)" : "(project)";
      drawingContext.fillText(suffix, rightX + nameWidth + hintWidth + 12, ry);
      ry += 28;
    }
    if (current.readNested && !current.cwdWeb && current.project) {
      drawingContext.fillStyle = COLORS.tag;
      drawingContext.font = `12px ${SANS}`;
      drawingContext.fillText("↑ 新增项伴随一条 commands_changed 通知", rightX, ry + 4);
    }

    // 底部结论:两行,对应正文两条发现规则
    const notes: string[] = [];
    if (current.project && current.cwdWeb) {
      notes.push("启动于 packages/web:仓库根命令向上回溯加载,嵌套命令启动即可用。");
    } else if (current.project) {
      notes.push("启动于仓库根:packages/web 之下的嵌套命令等 agent 读取该子树后才按需加载。");
    } else {
      notes.push("project 层关闭:仓库命令(含嵌套)全部不可用,只剩 user 层命令。");
    }
    notes.push(
      current.user
        ? "user 层开启:~/.claude 下的命令对每个项目生效;同名时 user 层胜过 project 层。"
        : "user 层关闭:~/.claude 下的命令全部退出列表。",
    );
    drawingContext.strokeStyle = COLORS.divider;
    drawingContext.beginPath();
    drawingContext.moveTo(leftX, height - 52);
    drawingContext.lineTo(width - 28, height - 52);
    drawingContext.stroke();
    drawingContext.fillStyle = COLORS.note;
    drawingContext.font = `12px ${SANS}`;
    notes.forEach((note, index) => {
      drawingContext.fillText(note, leftX, height - 32 + index * 18);
    });

    const nested = discovered.find((c) => c.onDemand);
    emit({
      countReadout: `${listed.length} 个`,
      repoReadout: !current.project
        ? "未加载(project 层关闭)"
        : current.cwdWeb
          ? "从子目录回溯可见"
          : "启动加载",
      nestedReadout: !nested
        ? "未发现(project 层关闭)"
        : nested.loaded
          ? current.cwdWeb
            ? "启动即加载"
            : "按需加载完成"
          : "启动目录之下,待按需加载",
    });
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
