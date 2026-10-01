// 演示内容：Web 框架集成路径选择——按项目形态推荐「随框架部署」或「server-adapters 挂载」。
// 输入：shape（'next-new' 全新 Next.js / 'express-existing' 已有 Express / 'hono-min' 最小 Hono）。
// 操作：用 Controls 切换项目形态，画布重绘推荐路径、挂载点与最小接线步骤。
// 预期结果：读数给出推荐路径、适配器包与默认前缀，画布列出接线清单和最终可访问路由。
// 阅读主线：SHAPES 提供每个形态的读数与步骤，draw() 按快照渲染「项目形态 → 集成路径 → 路由」三段。

import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type ProjectShape = 'next-new' | 'express-existing' | 'hono-min';

export interface IntegrationArgs { shape: ProjectShape; }

export interface IntegrationSnapshot {
  shape: ProjectShape;
  label: string;
  path: string;
  pkg: string;
  mount: string;
  prefix: string;
  routes: string;
  steps: string[];
}

// 三种项目形态的推荐路径与接线步骤（与官方 next-js / hono / express 集成页对应）
const SHAPES: Record<ProjectShape, Omit<IntegrationSnapshot, 'shape'>> = {
  'next-new': {
    label: '全新 Next.js',
    path: '随框架部署 · catch-all API route',
    pkg: '@mastra/next',
    mount: 'src/app/api/mastra/[...mastra]/route.ts',
    prefix: '/api/mastra',
    routes: 'POST /api/mastra/agents/weather-agent/generate',
    steps: [
      '① mastra init 生成 src/mastra（agent / tool / index.ts）',
      '② npm i @mastra/next',
      '③ catch-all 里 createNextRouteHandler 传入 mastra',
      '④ prefix 必须与挂载路径一致（默认 /api）',
      '⑤ 自定义聊天流：@mastra/ai-sdk handleChatStream',
    ],
  },
  'express-existing': {
    label: '已有 Express',
    path: '挂载进既有应用 · server-adapters',
    pkg: '@mastra/express',
    mount: 'app.use 注册 · MastraServer.init() 装配',
    prefix: '/api',
    routes: 'POST /api/agents/:id/generate · 原有路由共存',
    steps: [
      '① npm i @mastra/express',
      '② app.use(express.json())（JSON body 必需）',
      '③ 把 app 与 mastra 交给 MastraServer 构造',
      '④ await server.init()：context→auth→中间件→路由',
    ],
  },
  'hono-min': {
    label: '最小 Hono',
    path: '适配器最小起步 · server-adapters',
    pkg: '@mastra/hono',
    mount: 'new Hono 携带 Bindings / Variables 类型',
    prefix: '/api',
    routes: 'GET /api/agents/weather-agent · app.get 照常工作',
    steps: [
      '① npm i @mastra/hono',
      '② 把 app 与 mastra 交给 MastraServer 构造',
      '③ await server.init() 注册中间件与全部端点',
      '④ @hono/node-server 以 app.fetch 启动进程',
    ],
  },
};

const ACCENTS: Record<ProjectShape, string> = { 'next-new': '#0f766e', 'express-existing': '#1d4ed8', 'hono-min': '#7c3aed' };

export interface IntegrationInstance { update: (args: IntegrationArgs) => void; dispose: () => void; }

export function createIntegrationExample(canvas: HTMLCanvasElement, emit: (s: IntegrationSnapshot) => void): IntegrationInstance {
  const g = canvas.getContext('2d')!; let snapshot: IntegrationSnapshot | null = null;

  function draw() {
    const { width: w } = readCanvasSize(canvas);
    g.clearRect(0, 0, w, canvas.height);
    if (!snapshot) return;
    const accent = ACCENTS[snapshot.shape];
    g.fillStyle = '#334155'; g.font = 'bold 14px sans-serif';
    g.fillText(`项目形态：${snapshot.label}`, 16, 26);
    // 左列：两条路径共用的 mastra 实例
    g.fillStyle = '#0f766e'; g.fillRect(16, 44, 168, 96);
    g.fillStyle = '#ffffff'; g.font = 'bold 13px sans-serif'; g.fillText('mastra 实例', 30, 68);
    g.font = '12px sans-serif';
    g.fillText('agents / workflows', 30, 90); g.fillText('两条路暴露一致 API', 30, 108);
    g.strokeStyle = '#94a3b8'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(186, 92); g.lineTo(224, 92);
    g.moveTo(217, 87); g.lineTo(224, 92); g.lineTo(217, 97); g.stroke();
    // 右列：推荐路径框（路径与包名、挂载点、默认前缀）
    const bx = 232;
    g.fillStyle = '#f8fafc'; g.strokeStyle = accent;
    g.fillRect(bx, 44, w - bx - 16, 96); g.strokeRect(bx, 44, w - bx - 16, 96);
    g.fillStyle = accent; g.font = 'bold 12px sans-serif'; g.fillText(snapshot.path, bx + 14, 66);
    g.fillStyle = '#475569'; g.font = '12px sans-serif';
    g.fillText(`包：${snapshot.pkg}`, bx + 14, 88); g.fillText(`挂载：${snapshot.mount}`, bx + 14, 106);
    g.fillText(`默认前缀：${snapshot.prefix}`, bx + 14, 124);
    // 底部：接线步骤清单与最终可访问路由
    const sy = 168, ry = sy + 22 + snapshot.steps.length * 20 + 8;
    g.fillStyle = '#334155'; g.font = 'bold 12px sans-serif'; g.fillText('最小接线步骤', 16, sy);
    g.fillStyle = '#475569'; g.font = '12px sans-serif';
    snapshot.steps.forEach((s, i) => g.fillText(s, 16, sy + 22 + i * 20));
    g.fillStyle = accent; g.font = 'bold 12px sans-serif'; g.fillText(`验证：${snapshot.routes}`, 16, ry);
  }

  function update(args: IntegrationArgs) {
    snapshot = { shape: args.shape, ...SHAPES[args.shape] };
    emit(snapshot); draw();
  }

  const observer = createResizeObserver(canvas, draw);
  return { update, dispose: () => observer.disconnect() };
}
