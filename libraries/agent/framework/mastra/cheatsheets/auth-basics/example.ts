/**
 * 范例介绍：离线示意 Mastra Server 的认证判定流。输入 authMode（无认证 / SimpleAuth / MastraJwtAuth）
 * 与 token（无 / 有效 / 无效）；操作：Controls 切换输入重画判定链路；预期：无认证全部放行，配置后
 * 内置 API 与 Studio 受保护、公开路径始终放行。阅读主线：decide() 判定表 → draw() 三行结果读数。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type AuthMode = 'none' | 'simple' | 'jwt';
export type TokenState = 'none' | 'valid' | 'invalid';

export interface AuthOptions { authMode: AuthMode; token: TokenState }
export interface AuthSnapshot { apiRoute: string; studio: string; publicPath: string; modeLabel: string; tokenLabel: string }
export interface AuthInstance { update(options: AuthOptions): void; dispose(): void }

// 判定表：不配置 server.auth 即全部公开；配置后默认保护 /api/*，/api 与 /api/auth/* 视为公开；
// 自定义路由可用 requiresAuth: false 单独公开。
export function decide(options: AuthOptions): AuthSnapshot {
  const modeLabels: Record<AuthMode, string> = {
    none: 'server.auth 未配置：所有路由与 Studio 公开',
    simple: 'SimpleAuth：tokens 内存映射，默认查 Authorization 头',
    jwt: 'MastraJwtAuth：MASTRA_JWT_SECRET 验签',
  };
  const tokenLabels: Record<TokenState, string> = {
    none: '请求未带凭据',
    valid: 'Authorization: Bearer 有效 token',
    invalid: 'Authorization: Bearer 无效 token',
  };
  const open = options.authMode === 'none';
  const passed = options.token === 'valid';
  return {
    apiRoute: open ? '放行（未配置认证）' : passed ? '放行（200）' : '401 拒绝',
    studio: open ? '直接进入' : passed ? '进入工作台' : '显示登录页',
    publicPath: '放行',
    modeLabel: modeLabels[options.authMode],
    tokenLabel: tokenLabels[options.token],
  };
}

export function createAuthFlow(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AuthSnapshot) => void,
): AuthInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  let current: AuthOptions = { authMode: 'simple', token: 'none' };

  const tones = {
    pass: { bg: '#dcfce7', fg: '#15803d' },
    deny: { bg: '#fee2e2', fg: '#b91c1c' },
    warn: { bg: '#fef3c7', fg: '#b45309' },
  } as const;
  type Tone = keyof typeof tones;

  function pill(text: string, x: number, y: number, tone: Tone) {
    const width = ctx.measureText(text).width + 28;
    ctx.fillStyle = tones[tone].bg;
    ctx.beginPath();
    ctx.roundRect(x, y - 20, width, 30, 8);
    ctx.fill();
    ctx.fillStyle = tones[tone].fg;
    ctx.fillText(text, x + 14, y);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const s = decide(current);

    ctx.fillStyle = '#172033';
    ctx.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('认证判定流：请求 → 凭据校验 → 路径结果', 40, 40);
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(s.modeLabel, 40, 66);
    ctx.fillText(s.tokenLabel, 40, 88);

    const rows: Array<[string, string, Tone]> = [
      ['内置 API 路由 /api/agents/*', s.apiRoute, s.apiRoute.startsWith('放行') ? 'pass' : 'deny'],
      ['Studio UI', s.studio, s.studio === '显示登录页' ? 'warn' : 'pass'],
      ['公开路径（/api/auth/*、requiresAuth: false）', s.publicPath, 'pass'],
    ];
    let y = 140;
    for (const [label, result, tone] of rows) {
      ctx.fillStyle = '#334155';
      ctx.font = '14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(label, 40, y);
      const labelWidth = ctx.measureText(label).width;
      ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      pill(result, 40 + labelWidth + 24, y, tone);
      y += 46;
    }
    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('离线示意：只呈现判定规则，不发起真实网络请求。', 40, y + 4);
    emit(s);
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
