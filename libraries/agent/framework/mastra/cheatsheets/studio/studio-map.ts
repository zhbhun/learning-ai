/**
 * 范例介绍：离线绘制 Studio 面板地图。
 * 输入：功能分区（agents / workflows / traces / scorers / mcp / workspaces）。
 * 操作：切换左侧导航高亮分区，右栏同步显示该区能力清单、典型调试场景与代码侧来源。
 * 预期结果：读数显示当前分区、调试场景与定义在代码里的部分；底部固定呈现调试回路。
 * 阅读主线：PANELS 数据表 → draw() 的左导航 + 右信息栏布局 → 底部回路条。
 * 本图为离线示意：不启动真实服务、不发起任何网络请求。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type StudioArea =
  | 'agents'
  | 'workflows'
  | 'traces'
  | 'scorers'
  | 'mcp'
  | 'workspaces';

export const AREAS: StudioArea[] = [
  'agents',
  'workflows',
  'traces',
  'scorers',
  'mcp',
  'workspaces',
];

/** Controls 与读数使用的中文标签。 */
export const AREA_LABELS: Record<StudioArea, string> = {
  agents: 'Agents（对话测试）',
  workflows: 'Workflows（图形化运行）',
  traces: 'Traces / Logs（调用追踪）',
  scorers: 'Scorers / 评估',
  mcp: 'MCP servers',
  workspaces: 'Workspaces（文件）',
};

/** 画布左侧导航使用的短名。 */
const NAV_NAMES: Record<StudioArea, string> = {
  agents: 'Agents',
  workflows: 'Workflows',
  traces: 'Traces / Logs',
  scorers: 'Scorers',
  mcp: 'MCP',
  workspaces: 'Workspaces',
};

interface PanelInfo {
  title: string;
  abilities: string[];
  scenario: string;
  codeSide: string;
}

export const PANELS: Record<StudioArea, PanelInfo> = {
  agents: {
    title: 'Agents：对话测试与调参',
    abilities: ['直接对话，看推理与工具调用', '临时切换模型与温度参数', '表格结果一键复制为 CSV'],
    scenario: '改 instructions 后复测回答',
    codeSide: "agent 的 name / model / tools",
  },
  workflows: {
    title: 'Workflows：图形化运行',
    abilities: ['图形视图查看步骤与连线', '自定义输入后逐步运行', '实时高亮正在执行的步骤'],
    scenario: '定位失败或挂起的步骤',
    codeSide: 'workflow 的步骤定义与连线',
  },
  traces: {
    title: 'Traces / Logs：调用追踪',
    abilities: ['按 Agent / 时间过滤调用', '查看 span 原始 JSON 与错误', '导出 JSON、过滤框架细节'],
    scenario: '追一次请求每层的耗时与异常',
    codeSide: 'observability 采样配置',
  },
  scorers: {
    title: 'Scorers / Datasets / Experiments',
    abilities: ['查看 scorer 异步评分结果', '导入 CSV / JSON 建数据集', '实验批量运行并对比结果'],
    scenario: '把主观感觉变成可对比分数',
    codeSide: 'scorer 定义与挂载配置',
  },
  mcp: {
    title: 'MCP：已接入的服务器',
    abilities: ['列出已配置的 MCP server', '浏览 server 发现的 tools', '确认连接与工具发现正常'],
    scenario: '排查工具没被 agent 找到',
    codeSide: 'mcp 配置注册的 server',
  },
  workspaces: {
    title: 'Workspaces：文件浏览',
    abilities: ['浏览挂载目录里的文件', '只读查看或直接编辑', 'Skills 标签可装社区 skills'],
    scenario: '检查长时运行的文件产物',
    codeSide: 'workspace 挂载路径配置',
  },
};

export interface StudioMapArgs {
  area: StudioArea;
}

export interface StudioMapSnapshot {
  area: StudioArea;
  label: string;
  scenario: string;
  codeSide: string;
}

export interface StudioMapInstance {
  update(options: StudioMapArgs): void;
  dispose(): void;
}

const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    const next = line + ch;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function createStudioMap(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StudioMapSnapshot) => void,
): StudioMapInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: StudioMapArgs = { area: 'agents' };

  function drawLoopStrip(width: number, height: number) {
    // 底部固定呈现本课的调试回路：改代码 → 自动重启 → 回 Studio 验证
    const steps = ['改 src/mastra', 'dev server 自动重启', 'Studio 验证'];
    let x = 28;
    const cy = height - 38;
    ctx.textBaseline = 'middle';
    for (let i = 0; i < steps.length; i += 1) {
      const label = steps[i];
      ctx.font = `600 13px ${SANS}`;
      const w = ctx.measureText(label).width + 24;
      roundRect(ctx, x, cy - 14, w, 28, 8);
      ctx.fillStyle = '#eef2ff';
      ctx.fill();
      ctx.fillStyle = '#3730a3';
      ctx.fillText(label, x + 12, cy);
      x += w;
      if (i < steps.length - 1) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = `600 15px ${SANS}`;
        ctx.fillText('→', x + 6, cy);
        x += 24;
      }
    }
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `12px ${SANS}`;
    ctx.textAlign = 'right';
    ctx.fillText('调试回路', width - 28, cy + 1);
    ctx.textAlign = 'left';
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(420, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#172033';
    ctx.font = `600 20px ${SANS}`;
    ctx.fillText('Studio 面板地图', 28, 40);
    ctx.fillStyle = '#64748b';
    ctx.font = `13px ${SANS}`;
    ctx.fillText('左侧为导航分区，右栏显示该区能做什么、典型调试场景与代码侧来源', 28, 62);

    const top = 82;
    const bottom = height - 76;
    const panelH = bottom - top;
    const sideW = 176;

    // 左侧导航
    roundRect(ctx, 28, top, sideW, panelH, 12);
    ctx.fillStyle = '#f1f5f9';
    ctx.fill();
    const itemH = (panelH - 16) / AREAS.length;
    ctx.textBaseline = 'middle';
    AREAS.forEach((area, i) => {
      const iy = top + 8 + i * itemH;
      const selected = area === current.area;
      if (selected) {
        roundRect(ctx, 36, iy + 3, sideW - 16, itemH - 6, 8);
        ctx.fillStyle = '#4f7cff';
        ctx.fill();
      }
      ctx.fillStyle = selected ? '#ffffff' : '#334155';
      ctx.font = `${selected ? '600 ' : ''}14px ${SANS}`;
      ctx.fillText(NAV_NAMES[area], 48, iy + itemH / 2);
    });

    // 右侧信息栏
    const mx = 224;
    const mw = width - 28 - mx;
    roundRect(ctx, mx, top, mw, panelH, 12);
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    const info = PANELS[current.area];
    const px = mx + 20;
    const pw = mw - 40;
    let y = top + 32;

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#172033';
    ctx.font = `600 17px ${SANS}`;
    ctx.fillText(info.title, px, y);
    y += 24;
    ctx.fillStyle = '#64748b';
    ctx.font = `600 12px ${SANS}`;
    ctx.fillText('能做什么', px, y);
    y += 17;
    ctx.font = `14px ${SANS}`;
    for (const ability of info.abilities) {
      const lines = wrapText(ctx, ability, pw - 18);
      lines.forEach((line, j) => {
        if (j === 0) {
          ctx.fillStyle = '#4f7cff';
          ctx.beginPath();
          ctx.arc(px + 4, y - 5, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#334155';
        ctx.fillText(line, px + 16, y);
        y += 19;
      });
    }
    y += 8;
    ctx.fillStyle = '#64748b';
    ctx.font = `600 12px ${SANS}`;
    ctx.fillText('典型调试场景', px, y);
    y += 19;
    ctx.fillStyle = '#1d4ed8';
    ctx.font = `600 14px ${SANS}`;
    for (const line of wrapText(ctx, info.scenario, pw)) {
      ctx.fillText(line, px, y);
      y += 19;
    }

    // 底部固定：定义在代码里的部分
    const codeY = bottom - 34;
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(px, codeY - 16);
    ctx.lineTo(mx + mw - 20, codeY - 16);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = `600 12px ${SANS}`;
    ctx.fillText('定义在代码里（Studio 只测试与调试）', px, codeY);
    ctx.fillStyle = '#475569';
    ctx.font = `13px ${MONO}`;
    ctx.fillText(info.codeSide, px, codeY + 19);

    drawLoopStrip(width, height);

    emit({
      area: current.area,
      label: AREA_LABELS[current.area],
      scenario: info.scenario,
      codeSide: info.codeSide,
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
