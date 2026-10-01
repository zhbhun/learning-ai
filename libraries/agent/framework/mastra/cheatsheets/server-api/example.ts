/**
 * 范例介绍：Mastra Server 的「API 路由表」（离线示意，不发起真实请求）。
 * 输入：路由类别（内置 agent 路由 / 自定义注册 / OpenAPI 与文档）+ 是否配置 server.auth。
 * 操作：切换类别与认证开关，观察每条路由的方法、路径、认证要求与流式标记。
 * 预期结果：配置 auth 后内置与自定义路由默认「需登录」，仅 requiresAuth: false 放行；OpenAPI/Swagger 生产默认关闭；清单回查 /api/openapi.json。
 * 阅读主线：README.mdx「API 路由总览」小节。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type RouteCategory = 'builtin' | 'custom' | 'docs';

export interface RouteTableArgs { category: RouteCategory; authConfigured: boolean; }

export interface RouteSnapshot { categoryLabel: string; routeCount: number; authSummary: string; }

interface RouteRow { method: string; path: string; stream: string; auth: (a: boolean) => string; }

const guarded = (a: boolean) => (a ? '需登录' : '公开');

const ROWS: Record<RouteCategory, RouteRow[]> = {
  builtin: [
    { method: 'GET/POST', path: '/api/agents/...（agent 对话与流式）', stream: '是', auth: guarded },
    { method: 'POST', path: '/api/workflows/...（触发与运行）', stream: '—', auth: guarded },
    { method: 'POST', path: 'OpenAI 兼容路由（实验性）', stream: '是', auth: guarded },
  ],
  custom: [
    { method: 'GET', path: '/my-custom-route（registerApiRoute）', stream: '否', auth: guarded },
    { method: 'POST', path: '/items（createRoute + Zod 校验）', stream: '否', auth: guarded },
    { method: 'POST', path: '/webhook/github（requiresAuth: false）', stream: '否', auth: () => '公开' },
    { method: 'POST', path: '/chat/persist/:agentId（consumeStream）', stream: '后台', auth: guarded },
  ],
  docs: [
    { method: 'GET', path: '/api/openapi.json', stream: '否', auth: () => '生产默认关闭' },
    { method: 'GET', path: '/swagger-ui', stream: '否', auth: () => '生产默认关闭' },
  ],
};

const TABS: Array<[RouteCategory, string]> = [
  ['builtin', '内置 agent 路由'],
  ['custom', '自定义注册'],
  ['docs', 'OpenAPI 与文档'],
];

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RouteSnapshot) => void,
): { update(args: RouteTableArgs): void; dispose(): void } {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D。');
  let current: RouteTableArgs = { category: 'builtin', authConfigured: false };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(300, size.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = 48;
    const tabW = (width - pad * 2 - 16) / TABS.length;
    TABS.forEach(([id, label], i) => {
      const x = pad + i * (tabW + 8);
      const active = current.category === id;
      ctx.fillStyle = active ? '#4f7cff' : '#e2e8f0';
      ctx.beginPath();
      ctx.roundRect(x, 24, tabW, 30, 6);
      ctx.fill();
      ctx.fillStyle = active ? '#ffffff' : '#334155';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + tabW / 2, 44);
    });
    ctx.textAlign = 'left';
    const rows = ROWS[current.category];
    const cols = { method: pad + 8, path: pad + 128, stream: width - pad - 172, auth: width - pad - 96 };
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('方法', cols.method, 92);
    ctx.fillText('路径', cols.path, 92);
    ctx.fillText('流式', cols.stream, 92);
    ctx.fillText('认证', cols.auth, 92);
    rows.forEach((row, i) => {
      const y = 116 + i * 44;
      if (i % 2 === 0) {
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(pad, y - 26, width - pad * 2, 40);
      }
      const auth = row.auth(current.authConfigured);
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(row.method, cols.method, y);
      ctx.fillText(row.path, cols.path, y);
      ctx.fillText(row.stream, cols.stream, y);
      ctx.fillStyle = auth === '公开' ? '#15803d' : '#b45309';
      ctx.fillText(auth, cols.auth, y);
    });
    ctx.fillStyle = '#475569';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('完整清单回查 GET /api/openapi.json（含内置与自定义路由）', pad, 120 + rows.length * 44);

    emit({
      categoryLabel: TABS.find(([id]) => id === current.category)?.[1] ?? '',
      routeCount: rows.length,
      authSummary: current.authConfigured ? 'server.auth 已配置：默认需登录' : '未配置 auth：全部公开',
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(args) {
      current = args;
      draw();
    },
    dispose: () => resizeObserver.disconnect(),
  };
}
