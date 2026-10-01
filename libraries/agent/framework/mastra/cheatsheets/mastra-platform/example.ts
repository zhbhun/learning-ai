// Mastra Platform 架构示意（离线 Canvas 2D，不调用真实部署 / 网络 / 数据库）
// 演示：三大产品与 Project / Organization 的关系、mastra deploy 管线、环境变量三层叠加。
// 输入：view（products / deploy / env 三视角）+ env（production / staging，环境分层视角生效）。
// 操作：Controls 切换视角与环境；预期读数随视角给出组件职责与部署要点。
// 依据：https://mastra.ai/docs/mastra-platform/overview 与 https://mastra.ai/docs/mastra-platform/deploy

import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export type PlatformView = 'products' | 'deploy' | 'env';
export type PlatformEnv = 'production' | 'staging';

export interface PlatformArgs { view: PlatformView; env: PlatformEnv; }
export interface PlatformSnapshot { view: string; env: string; key: string; detail: string; }
export interface PlatformInstance { update: (args: PlatformArgs) => void; dispose: () => void; }

const BLUE = '#3b82f6', GREEN = '#16a34a', AMBER = '#d97706', INK = '#334155', SOFT = '#94a3b8';

const VIEWS: Record<PlatformView, { label: string; key: string; detail: string }> = {
  products: { label: '产品构成', key: 'Observability 是基础产品', detail: 'Studio / Server 启用均附带观测' },
  deploy: { label: '部署流程', key: 'mastra deploy 一条命令', detail: '@mastra/core >= 1.44；旧拆分命令已废弃' },
  env: { label: '环境分层', key: '托管 > 平台存储 > 本地 env', detail: '区域在环境创建时固定' },
};

function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  title: string, lines: string[], accent: string, active = false) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8);
  ctx.fillStyle = active ? '#eef4ff' : '#f8fafc'; ctx.fill();
  ctx.strokeStyle = active ? accent : '#dbe3ec'; ctx.lineWidth = active ? 2 : 1; ctx.stroke();
  ctx.fillStyle = accent; ctx.font = '600 13px sans-serif'; ctx.fillText(title, x + 12, y + 21);
  ctx.fillStyle = INK; ctx.font = '12px sans-serif';
  lines.forEach((t, i) => ctx.fillText(t, x + 12, y + 40 + i * 16));
}

function hArrow(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  ctx.strokeStyle = SOFT; ctx.fillStyle = SOFT; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2 - 6, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 - 7, y - 4); ctx.lineTo(x2 - 7, y + 4); ctx.closePath(); ctx.fill();
}

function vArrow(ctx: CanvasRenderingContext2D, x: number, y1: number, y2: number) {
  ctx.strokeStyle = SOFT; ctx.fillStyle = SOFT; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2 - 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y2); ctx.lineTo(x - 4, y2 - 7); ctx.lineTo(x + 4, y2 - 7); ctx.closePath(); ctx.fill();
}

function note(ctx: CanvasRenderingContext2D, w: number, y: number, text: string) {
  ctx.fillStyle = SOFT; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, y); ctx.textAlign = 'left';
}

function drawProducts(ctx: CanvasRenderingContext2D, w: number) {
  card(ctx, w / 2 - 130, 14, 260, 54, 'Organization（组织）', ['Projects 的父级 · Alerts 在此配置'], SOFT);
  vArrow(ctx, w / 2, 68, 92);
  card(ctx, 20, 94, w - 40, 158, 'Project（项目）· 部署与产品的公共父级', [], INK);
  const pw = (w - 100) / 3;
  card(ctx, 30, 134, pw, 86, 'Observability', ['traces / logs / metrics', '可跨项目与部署检索'], BLUE);
  card(ctx, 40 + pw, 134, pw, 86, 'Studio', ['云端测试 agent / workflow', '启用附带 Observability'], GREEN);
  card(ctx, 50 + pw * 2, 134, pw, 86, 'Server', ['生产 API 部署目标', '启用附带 Observability'], AMBER);
  note(ctx, w, 284, '每个环境自动获得托管 Workspace：文件系统 + 沙箱，无需手动配置');
  note(ctx, w, 306, 'Alerts 通知渠道：Slack / email / webhooks，可覆盖全部或指定项目与环境');
}

function drawDeploy(ctx: CanvasRenderingContext2D, w: number) {
  const cw = (w - 100) / 3, gap = (w - 40 - 3 * cw) / 2;
  const row = (items: Array<[string, string[], string]>, y: number, xoff = 0) =>
    items.forEach(([t, ls, c], i) => {
      const x = 20 + xoff + i * (cw + gap);
      card(ctx, x, y, cw, 92, t, ls, c);
      if (i < items.length - 1) hArrow(ctx, x + cw + 2, x + cw + gap - 2, y + 46);
    });
  row([
    ['① mastra deploy', ['构建 + 预检 + 部署', '输出公开 URL'], INK],
    ['② 预检', ['硬拦本地存储路径', '可内联建托管数据库'], AMBER],
    ['③ 首次部署', ['建项目 + production', '写 .mastra-project.json'], GREEN],
  ], 66);
  row([
    ['④ 构建上线', ['新版本承接流量后成功', '约 30 秒到几分钟'], INK],
    ['⑤ 验证', ['URL + /api/agents', '返回 agent 列表 JSON'], INK],
  ], 186, (cw + gap) / 2);
  note(ctx, w, 318, 'CI：MASTRA_PROJECT_ID + MASTRA_API_TOKEN + --yes；只跑预检用 mastra lint --preflight');
}

function drawEnv(ctx: CanvasRenderingContext2D, w: number, env: PlatformEnv) {
  card(ctx, 20, 56, 190, 130, 'Project（项目）', [], INK);
  card(ctx, 32, 96, 166, 36, 'production', [env === 'production' ? '当前 · 区域创建时固定' : '默认环境'], BLUE, env === 'production');
  card(ctx, 32, 140, 166, 36, 'staging', [env === 'staging' ? '当前 · 区域创建时固定' : '按需创建'], AMBER, env === 'staging');
  hArrow(ctx, 220, 262, 122);
  const layers: Array<[string, string[], string]> = [
    ['① 托管变量（平台注入）', ['如托管数据库的 TURSO_DATABASE_URL', '平台定义不可编辑 · 优先于本地 .env'], BLUE],
    ['② 平台存储变量（dashboard）', ['保存在项目 / 环境上', '每次部署原样使用'], GREEN],
    ['③ 本地 env 文件', ['--env-file 或默认 .env / .env.local', '叠加在底层之上 · 本地开发仍用它'], AMBER],
  ];
  layers.forEach(([t, ls, c], i) => card(ctx, 266, 36 + i * 84, w - 286, 74, t, ls, c));
  note(ctx, w, 298, '部署时按层叠加；改运行中变量：dashboard 更新后 mastra env restart，无需重部署');
}

export function createExample(canvas: HTMLCanvasElement, emit: (s: PlatformSnapshot) => void): PlatformInstance {
  const ctx = canvas.getContext('2d')!;
  let args: PlatformArgs = { view: 'products', env: 'production' };

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    const dpr = globalThis.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
    if (args.view === 'products') drawProducts(ctx, width);
    else if (args.view === 'deploy') drawDeploy(ctx, width);
    else drawEnv(ctx, width, args.env);
    emit({ view: VIEWS[args.view].label, env: args.env, key: VIEWS[args.view].key, detail: VIEWS[args.view].detail });
  }

  const observer = createResizeObserver(canvas, draw);
  draw();
  return {
    update(next: PlatformArgs) { args = { ...args, ...next }; draw(); },
    dispose() { observer.disconnect(); },
  };
}
