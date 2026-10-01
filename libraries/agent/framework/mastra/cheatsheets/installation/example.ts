/**
 * 安装路径对比：把 create-mastra 与手动安装的目录产物画成可点选的项目树。
 * 输入：安装路径（默认 starter / 空脚手架 --empty / 手动安装）与是否安装 skills。
 * 操作：Controls 切换路径与 skills 开关，或点击画布中的任意行。
 * 预期结果：目录树随之切换，读数显示当前路径的生成文件数、选中项及其用途说明。
 * 阅读主线：三条路径殊途同归——src/mastra/index.ts 永远是注册入口（蓝色高亮行）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type ModeId = 'starter' | 'empty' | 'manual';

export interface TreeEntry {
  /** 稳定 id，用于跨模式保持选中项（如 index.ts） */
  id: string;
  /** 缩进层级，根目录为 0 */
  depth: number;
  /** 显示名，目录以 / 结尾 */
  name: string;
  kind: 'dir' | 'file';
  /** 该条目的用途说明，也是读数中的「文件说明」 */
  note: string;
  /** entry：注册入口高亮；skills：随 skills 开关出现的文件 */
  accent?: 'entry' | 'skills';
}

export interface ModeInfo {
  id: ModeId;
  /** 读数与画布副标题中的路径名 */
  label: string;
  /** 画布副标题：这一路径怎么得到 */
  hint: string;
  /** 读数：搭好后的下一步 */
  next: string;
}

export const MODES: readonly ModeInfo[] = [
  {
    id: 'starter',
    label: '默认 starter',
    hint: 'create-mastra 默认产物：Agent Harness 起步项目',
    next: 'cd 项目 && npm run dev → localhost:4111',
  },
  {
    id: 'empty',
    label: '空脚手架 --empty',
    hint: 'create-mastra --empty：最小骨架，无示例与 .env',
    next: '在 index.ts 注册第一个 Agent',
  },
  {
    id: 'manual',
    label: '手动安装',
    hint: '自建 package.json 后逐个创建文件',
    next: 'tsc --noEmit 通过后再 mastra dev',
  },
];

/** skills 开关带来的条目：.agents/skills/mastra 技能包与 skills-lock.json */
const SKILL_ENTRIES: readonly TreeEntry[] = [
  {
    id: 'agents-skills-dir',
    depth: 1,
    name: '.agents/skills/mastra/',
    kind: 'dir',
    note: 'Mastra 技能包目录',
    accent: 'skills',
  },
  {
    id: 'skill-md',
    depth: 2,
    name: 'SKILL.md',
    kind: 'file',
    note: '技能入口：编码助手先读这份指引',
    accent: 'skills',
  },
  {
    id: 'references-dir',
    depth: 2,
    name: 'references/',
    kind: 'dir',
    note: '分主题参考（常见错误、模型选择等）',
    accent: 'skills',
  },
  {
    id: 'skills-lock',
    depth: 1,
    name: 'skills-lock.json',
    kind: 'file',
    note: '锁定技能版本，便于 update',
    accent: 'skills',
  },
];

const STARTER_ENTRIES: readonly TreeEntry[] = [
  { id: 'root', depth: 0, name: 'my-mastra-project/', kind: 'dir', note: '脚手架创建的项目目录' },
  { id: 'env-example', depth: 1, name: '.env.example', kind: 'file', note: '复制为 .env 并填 provider key' },
  { id: 'gitignore', depth: 1, name: '.gitignore', kind: 'file', note: '忽略 node_modules、.env、构建产物' },
  { id: 'agents-md', depth: 1, name: 'AGENTS.md', kind: 'file', note: '给编码助手的项目规则（模板自带）' },
  { id: 'readme', depth: 1, name: 'README.md', kind: 'file', note: '项目说明与启动命令' },
  { id: 'package-json', depth: 1, name: 'package.json', kind: 'file', note: '"type": "module" + dev/build/start 脚本' },
  { id: 'tsconfig', depth: 1, name: 'tsconfig.json', kind: 'file', note: 'ES2022 + bundler 解析' },
  { id: 'src', depth: 1, name: 'src/', kind: 'dir', note: '应用源码' },
  { id: 'mastra-dir', depth: 2, name: 'mastra/', kind: 'dir', note: '框架代码约定目录（CLI 的 --dir 默认值）' },
  { id: 'agents-dir', depth: 3, name: 'agents/', kind: 'dir', note: 'Agent 定义' },
  { id: 'agent-ts', depth: 4, name: 'agent.ts', kind: 'file', note: '通用助手 agent：工作区 + 记忆 + 工具' },
  { id: 'index-ts', depth: 3, name: 'index.ts', kind: 'file', note: '注册入口：new Mastra 挂 agents 与存储', accent: 'entry' },
  { id: 'tools-dir', depth: 3, name: 'tools/', kind: 'dir', note: 'createTool 定义的工具' },
  { id: 'schedule-tools-ts', depth: 4, name: 'schedule-tools.ts', kind: 'file', note: '定时任务启停工具示例' },
];

const EMPTY_ENTRIES: readonly TreeEntry[] = [
  { id: 'root', depth: 0, name: 'my-empty-project/', kind: 'dir', note: '--empty 生成的最小项目' },
  { id: 'gitignore', depth: 1, name: '.gitignore', kind: 'file', note: '忽略 node_modules、.env、构建产物' },
  { id: 'package-json', depth: 1, name: 'package.json', kind: 'file', note: '仅 @mastra/core 一个生产依赖' },
  { id: 'tsconfig', depth: 1, name: 'tsconfig.json', kind: 'file', note: 'ES2022 + bundler 解析' },
  { id: 'src', depth: 1, name: 'src/', kind: 'dir', note: '应用源码' },
  { id: 'mastra-dir', depth: 2, name: 'mastra/', kind: 'dir', note: '框架代码约定目录' },
  { id: 'index-ts', depth: 3, name: 'index.ts', kind: 'file', note: '空壳入口：new Mastra() 待填充', accent: 'entry' },
];

const MANUAL_ENTRIES: readonly TreeEntry[] = [
  { id: 'root', depth: 0, name: 'my-project/', kind: 'dir', note: 'mkdir 自建，逐个添加下列文件' },
  { id: 'env', depth: 1, name: '.env', kind: 'file', note: 'provider key：如 OPENAI_API_KEY' },
  { id: 'package-json', depth: 1, name: 'package.json', kind: 'file', note: '"type": "module" + dev/build 脚本' },
  { id: 'tsconfig', depth: 1, name: 'tsconfig.json', kind: 'file', note: 'ES2022 + bundler + noEmit' },
  { id: 'src', depth: 1, name: 'src/', kind: 'dir', note: '应用源码' },
  { id: 'mastra-dir', depth: 2, name: 'mastra/', kind: 'dir', note: '框架代码约定目录' },
  { id: 'index-ts', depth: 3, name: 'index.ts', kind: 'file', note: '注册入口：new Mastra 挂 agents', accent: 'entry' },
];

export function buildTree(mode: ModeId, skills: boolean): TreeEntry[] {
  const base =
    mode === 'starter'
      ? STARTER_ENTRIES
      : mode === 'empty'
        ? EMPTY_ENTRIES
        : MANUAL_ENTRIES;
  if (!skills) {
    return [...base];
  }
  // 根目录行之后插入 skills 条目，位置对应 .agents/ 与 skills-lock.json 的字母序
  const [root, ...rest] = base;
  return [root, ...SKILL_ENTRIES, ...rest];
}

function modeInfo(id: ModeId): ModeInfo {
  return MODES.find((mode) => mode.id === id) ?? MODES[0];
}

export interface ExampleOptions {
  mode: ModeId;
  skills: boolean;
}

export interface ExampleSnapshot {
  modeLabel: string;
  /** 当前路径生成的文件数（不含目录） */
  fileCount: number;
  selectedName: string;
  selectedNote: string;
  next: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

function roundRectPath(
  drawingContext: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.min(radius, w / 2, h / 2);
  drawingContext.moveTo(x + r, y);
  drawingContext.arcTo(x + w, y, x + w, y + h, r);
  drawingContext.arcTo(x + w, y + h, x, y + h, r);
  drawingContext.arcTo(x, y + h, x, y, r);
  drawingContext.arcTo(x, y, x + w, y, r);
  drawingContext.closePath();
}

function truncate(
  drawingContext: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (drawingContext.measureText(text).width <= maxWidth) {
    return text;
  }
  let end = text.length;
  while (end > 1) {
    const candidate = `${text.slice(0, end - 1)}…`;
    if (drawingContext.measureText(candidate).width <= maxWidth) {
      return candidate;
    }
    end -= 1;
  }
  return '…';
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let currentMode: ModeId = 'starter';
  let currentSkills = true;
  let selectedId = 'index-ts';
  let rowRanges: Array<{ id: string; top: number; bottom: number }> = [];

  function pick(clientX: number, clientY: number): string | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    const size = readCanvasSize(canvas);
    const x = (clientX - rect.left) * (size.width / rect.width);
    const y = (clientY - rect.top) * (size.height / rect.height);
    const hit = rowRanges.find((row) => y >= row.top && y < row.bottom);
    return hit ? hit.id : null;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const info = modeInfo(currentMode);
    const entries = buildTree(currentMode, currentSkills);
    const compact = height < 360;
    const showNotes = width >= 580;
    // 左下角读数面板占约 4 行，树形区域在其上方结束，避免遮挡
    const bottomReserve = compact ? 104 : 116;
    const top = compact ? 18 : 84;
    const available = height - top - bottomReserve;
    const rowHeight = Math.max(12, Math.min(24, available / entries.length));
    const left = 20;
    const indent = 22;
    const right = width - 16;
    rowRanges = [];

    if (!compact) {
      drawingContext.fillStyle = '#172033';
      drawingContext.font = '600 17px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText('两条安装路径的目录产物', left, 40);

      drawingContext.fillStyle = '#475569';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(info.label + ' · ' + info.hint, left, 62);

      if (width >= 520) {
        drawingContext.fillStyle = '#64748b';
        drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
        drawingContext.textAlign = 'right';
        drawingContext.fillText('点击任意行查看用途', right, 40);
        drawingContext.textAlign = 'left';
      }
    } else {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(info.label, left, 12);
    }

    entries.forEach((entry, index) => {
      const rowTop = top + index * rowHeight;
      const rowBottom = rowTop + rowHeight - 2;
      const selected = entry.id === selectedId;
      rowRanges.push({ id: entry.id, top: rowTop, bottom: rowBottom });

      const textLeft = left + entry.depth * indent + 10;
      const boxLeft = left + entry.depth * indent;

      if (selected || entry.accent === 'entry') {
        drawingContext.beginPath();
        roundRectPath(
          drawingContext,
          boxLeft,
          rowTop,
          Math.max(right - boxLeft, 120),
          rowHeight - 2,
          5,
        );
        drawingContext.fillStyle = selected ? '#e9efff' : '#f2f6ff';
        drawingContext.fill();
        if (selected) {
          drawingContext.lineWidth = 1;
          drawingContext.strokeStyle = '#4f7cff';
          drawingContext.stroke();
        }
      }

      // 缩进参考线：标出目录层级
      for (let level = 1; level <= entry.depth; level += 1) {
        const guideX = left + (level - 1) * indent + 14;
        drawingContext.beginPath();
        drawingContext.moveTo(guideX, rowTop);
        drawingContext.lineTo(guideX, rowBottom);
        drawingContext.strokeStyle = '#e2e8f0';
        drawingContext.lineWidth = 1;
        drawingContext.stroke();
      }

      const centerY = rowTop + (rowHeight - 2) / 2;
      const isDir = entry.kind === 'dir';
      if (entry.accent === 'skills') {
        drawingContext.fillStyle = '#0f766e';
      } else if (entry.accent === 'entry' || isDir) {
        drawingContext.fillStyle = selected ? '#1d4ed8' : '#172033';
      } else {
        drawingContext.fillStyle = '#334155';
      }
      drawingContext.font = isDir
        ? '600 12.5px ui-monospace, SFMono-Regular, Menlo, monospace'
        : '12.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.fillText(entry.name, textLeft, centerY + 4);

      if (showNotes) {
        const noteLeft = textLeft + drawingContext.measureText(entry.name).width + 14;
        const maxNote = right - noteLeft;
        if (maxNote >= 40) {
          drawingContext.fillStyle = entry.accent === 'skills' ? '#4d8f88' : '#7c8aa0';
          drawingContext.font = '11.5px ui-sans-serif, system-ui, sans-serif';
          drawingContext.fillText(
            truncate(drawingContext, entry.note, maxNote),
            noteLeft,
            centerY + 3.5,
          );
        }
      }
    });

    const selectedEntry =
      entries.find((entry) => entry.id === selectedId) ??
      entries.find((entry) => entry.id === 'index-ts') ??
      entries[0];
    const fileCount = entries.filter((entry) => entry.kind === 'file').length;
    emit({
      modeLabel: info.label,
      fileCount,
      selectedName: selectedEntry.name,
      selectedNote: selectedEntry.note,
      next: info.next,
    });
  }

  const onClick = (event: MouseEvent) => {
    const hit = pick(event.clientX, event.clientY);
    if (hit && hit !== selectedId) {
      selectedId = hit;
      draw();
    }
  };

  const onMove = (event: MouseEvent) => {
    canvas.style.cursor = pick(event.clientX, event.clientY) ? 'pointer' : 'default';
  };

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onMove);
  draw();

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      currentMode = options.mode;
      currentSkills = options.skills;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMove);
    },
  };
}
