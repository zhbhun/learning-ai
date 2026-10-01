// 演示内容：Mastra「项目源码 → mastra build → .mastra/output/ → 运行」流水线在三种部署方式下的形态
// 输入：部署方式 mode（自托管 / 沙箱 / 云平台）与自托管关闭窗口 drainTimeout（秒）
// 操作：切换「部署方式」与「drainTimeout」控件
// 预期结果：右列运行形态、启动命令、健康检查随方式变化；自托管底部显示优雅关闭时间线，drain 段随秒数伸缩
// 阅读主线：左列源码 → 中列构建产物 → 右列运行形态 → 底部随方式切换的补充说明

import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type DeployMode = 'self-host' | 'sandbox' | 'platform';

export interface DeployArgs {
  mode: DeployMode;
  drainTimeout: number; // 优雅关闭窗口，单位秒
}

export interface DeploySnapshot {
  modeLabel: string;
  artifacts: string;
  command: string;
  health: string;
  drainTimeoutMs: number;
}

export interface DeployInstance {
  update: (args: DeployArgs) => void;
  dispose: () => void;
}

const MODE_INFO: Record<DeployMode, {
  label: string; artifacts: string; command: string; health: string; note: string;
}> = {
  'self-host': {
    label: '自托管 Mastra server',
    artifacts: '.mastra/output/ · index.mjs',
    command: 'mastra start 或 node .mastra/output/index.mjs',
    health: 'GET /health → 200 OK',
    note: '产物目录自包含：整目录拷贝到 VM / 容器 / PaaS 即可运行',
  },
  sandbox: {
    label: '沙箱（Vercel Sandbox / E2B）',
    artifacts: '源码进临时工作区，秒级启动',
    command: '平台托管运行，无需自建进程',
    health: '临时公网 URL 即入口，用后即弃',
    note: '适用：即时预览 / CI 部署 / 验证 agent 生成的应用 / 不可信用户实例',
  },
  platform: {
    label: '云平台（14+ 平台可选）',
    artifacts: '构建产物交由平台接管运行',
    command: '内置 deployer：Vercel / Netlify / Cloudflare',
    health: '平台探活机制接管',
    note: '另有 AWS / Azure / Kubernetes / Render / Digital Ocean 等平台路径',
  },
};

function snapshotOf(args: DeployArgs): DeploySnapshot {
  const info = MODE_INFO[args.mode];
  return {
    modeLabel: info.label,
    artifacts: info.artifacts,
    command: info.command,
    health: info.health,
    drainTimeoutMs: Math.round(args.drainTimeout * 1000),
  };
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  title: string, lines: string[], accent: string) {
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(title, x + 14, y + 24);
  ctx.fillStyle = '#334155';
  ctx.font = '12px system-ui, sans-serif';
  lines.filter(Boolean).forEach((line, i) => ctx.fillText(line, x + 14, y + 46 + i * 18));
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number, label: string) {
  ctx.strokeStyle = '#94a3b8';
  ctx.fillStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2 - 8, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y);
  ctx.lineTo(x2 - 9, y - 4);
  ctx.lineTo(x2 - 9, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.font = '12px system-ui, sans-serif';
  const tw = ctx.measureText(label).width;
  ctx.fillText(label, (x1 + x2 - tw) / 2, y - 10);
}

export function createDeployPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DeploySnapshot) => void,
): DeployInstance {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let args: DeployArgs = { mode: 'self-host', drainTimeout: 5 };

  const draw = () => {
    const { width: w } = readCanvasSize(canvas);
    ctx.clearRect(0, 0, w, canvas.height);
    const info = MODE_INFO[args.mode];

    box(ctx, 16, 20, 180, 110, '项目源码', ['src/mastra/index.ts', 'tools/*.ts', 'public/'], '#0f766e');
    arrow(ctx, 196, 75, 288, 'mastra build');
    box(ctx, 288, 20, 226, 110, '.mastra/output/',
      ['index.mjs（Hono 服务入口）', 'mastra.mjs · tools.mjs', 'package.json · node_modules/'], '#4338ca');
    arrow(ctx, 514, 75, 606, '部署');
    box(ctx, 606, 20, Math.max(160, w - 622), 110, info.label,
      [info.command, info.health, args.mode === 'self-host' ? 'PORT 默认 4111' : ''], '#b45309');

    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(info.note, 16, 160);

    if (args.mode === 'self-host') {
      // 优雅关闭时间线：SIGINT/SIGTERM → 停止接收连接 → drain 等待（宽度随秒数伸缩）→ mastra.shutdown()
      const y = 190;
      const seg = (x: number, bw: number, color: string, text: string) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x, y, bw, 26, 6);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(text, x + 6, y + 17);
      };
      const drainPx = Math.max(52, (Math.min(args.drainTimeout, 30) / 30) * 200);
      seg(16, 104, '#0f766e', 'SIGINT/SIGTERM');
      seg(126, drainPx, '#4338ca', `drain ${Math.round(args.drainTimeout * 1000)} ms`);
      seg(132 + drainPx, 122, '#b45309', 'mastra.shutdown()');
      ctx.fillStyle = '#64748b';
      ctx.fillText('HTTP 与 workflow drain 顺序执行；期间再次收到信号 → 立即终止进程', 16, y + 48);
    }
  };

  const observer = createResizeObserver(canvas, draw);
  draw();
  emit(snapshotOf(args));

  return {
    update(next: DeployArgs) {
      args = next;
      draw();
      emit(snapshotOf(args));
    },
    dispose() {
      observer.disconnect();
    },
  };
}
