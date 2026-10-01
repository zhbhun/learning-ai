// 演示：Mastra 服务的三种托管形态——内置服务器、框架适配器与自定义适配器。
// 输入：托管模式 mode（'built-in' | 'adapter' | 'custom'）。
// 操作：update(mode) 重绘托管架构图：左列固定 mastra 实例，右列按模式切换装配步骤。
// 预期：内置 → dev/build 自动生成 Hono 服务器，port/cors 读 server config；框架适配器 →
//       new MastraServer({ app, mastra }) 后 init() 四步装配；自定义 → 6 个抽象方法 + 测试套件。
// 阅读主线：MODES 提供每个模式的读数与步骤清单，draw() 只按快照渲染画布。

import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type HostingMode = 'built-in' | 'adapter' | 'custom';

export interface HostingArgs { mode: HostingMode; }

export interface HostingSnapshot {
  mode: HostingMode;
  label: string;
  processModel: string;
  init: string;
  scene: string;
  steps: string[];
}

// 三种托管形态的读数与装配步骤（与官方 server-adapters / custom-adapters 文档对应）
const MODES: Record<HostingMode, Omit<HostingSnapshot, 'mode'>> = {
  'built-in': {
    label: '内置服务器',
    processModel: '单进程 · 自动生成的 Hono 服务器',
    init: '0 行装配代码 · 路由与 OpenAPI 自动注册',
    scene: '本地开发与默认部署 · 支持文件式 agent',
    steps: [
      'mastra dev / build 自动生成 Hono 服务器并注册全部路由',
      'port / host / cors / timeout 直接读 server config',
      'registerApiRoute 自定义路由与 OpenAPI 一并挂载',
    ],
  },
  adapter: {
    label: '框架适配器',
    processModel: '你的框架进程 · 适配器托管',
    init: 'init() 四步 · context→auth→用户中间件→routes',
    scene: '复用既有 Express / Fastify / Hono / Koa / NestJS 服务',
    steps: [
      'new MastraServer({ app, mastra })',
      '① registerContextMiddleware 注入请求上下文',
      '② registerAuthMiddleware 认证 + 授权',
      '③ registerUserMiddleware（Hono 系生效）',
      '④ registerRoutes（含 MCP 路由）',
    ],
  },
  custom: {
    label: '自定义适配器',
    processModel: '任意框架进程 · 自实现翻译层',
    init: '继承 MastraServer · 实现 6 个抽象方法',
    scene: '官方 8 个之外的小众框架 / 内部框架',
    steps: [
      'class MyServer extends MastraServer<App, Req, Res>',
      'registerContextMiddleware / registerAuthMiddleware',
      'registerRoute · getParams · sendResponse · stream',
      'SSE 或 NDJSON 分块，逐块应用 redact',
      '@mastra/server-adapters-test-suite 一致性测试',
    ],
  },
};

const ACCENTS: Record<HostingMode, string> = {
  'built-in': '#0f766e',
  adapter: '#1d4ed8',
  custom: '#7c3aed',
};

export interface HostingInstance { update: (args: HostingArgs) => void; dispose: () => void; }

export function createHostingExample(canvas: HTMLCanvasElement, emit: (s: HostingSnapshot) => void): HostingInstance {
  const g = canvas.getContext('2d')!;
  let snapshot: HostingSnapshot | null = null;

  function draw() {
    const { width: w } = readCanvasSize(canvas);
    g.clearRect(0, 0, w, canvas.height);
    if (!snapshot) return;
    const accent = ACCENTS[snapshot.mode];
    g.fillStyle = '#334155'; g.font = 'bold 14px sans-serif';
    g.fillText(`托管形态：${snapshot.label}`, 16, 26);
    // 左列：所有形态共用的 mastra 实例
    g.fillStyle = '#0f766e';
    g.fillRect(16, 44, 176, 104);
    g.fillStyle = '#ffffff'; g.font = 'bold 13px sans-serif';
    g.fillText('mastra 实例', 30, 68);
    g.font = '12px sans-serif'; g.fillText('agents / workflows · 代码注册', 30, 90);
    g.fillText('（适配器不做文件式发现）', 30, 108);
    g.strokeStyle = '#94a3b8'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(194, 96); g.lineTo(230, 96);
    g.moveTo(223, 91); g.lineTo(230, 96); g.lineTo(223, 101);
    g.stroke();
    // 右列：宿主框，标题为进程模型，正文为装配步骤
    const bx = 238, bh = 26 + snapshot.steps.length * 20;
    g.fillStyle = '#f8fafc'; g.strokeStyle = accent;
    g.fillRect(bx, 44, w - bx - 16, bh);
    g.strokeRect(bx, 44, w - bx - 16, bh);
    g.fillStyle = accent; g.font = 'bold 12px sans-serif';
    g.fillText(snapshot.processModel, bx + 14, 66);
    g.fillStyle = '#475569'; g.font = '12px sans-serif';
    snapshot.steps.forEach((s, i) => g.fillText(s, bx + 14, 88 + i * 20));
    const by = 44 + bh + 28;
    g.fillStyle = '#334155'; g.font = 'bold 12px sans-serif';
    g.fillText('初始化', 16, by); g.fillText('适用', 16, by + 20);
    g.fillStyle = '#475569'; g.font = '12px sans-serif';
    g.fillText(snapshot.init, 60, by); g.fillText(snapshot.scene, 60, by + 20);
  }

  function update(args: HostingArgs) {
    snapshot = { mode: args.mode, ...MODES[args.mode] };
    emit(snapshot);
    draw();
  }

  const observer = createResizeObserver(canvas, draw);
  return { update, dispose: () => observer.disconnect() };
}
