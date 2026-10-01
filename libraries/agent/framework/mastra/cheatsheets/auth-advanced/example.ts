/**
 * 范例介绍：离线示意 CompositeAuth 认证链与 FGA 细粒度授权判定。输入 tokenType / chainOrder /
 * fgaAction 三个控件；操作：切换后重画两栏画布。预期：token 由链上首个能识别它的 provider 认出
 * （不匹配者静默继续）；member 用户对 memory:read / agents:execute 判允许，对 memory:write 判拒绝。
 * 阅读主线：simulateAuth() 顺序尝试 → simulateFga() 判定 → draw() 左链右判两栏。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type ProviderId = 'jwt' | 'clerk' | 'simple';
export type TokenType = 'legacy-jwt' | 'clerk-session' | 'api-key-token';
export type ChainOrder = 'jwt-first' | 'simple-first';
export type FgaAction = 'memory:read' | 'memory:write' | 'agents:execute';
export const PROVIDER_LABEL: Record<ProviderId, string> = {
  jwt: 'MastraJwtAuth', clerk: 'MastraAuthClerk', simple: 'SimpleAuth（API key）',
};
// 每个 provider 只认一种 token 形态：authenticateToken 返回 null 或抛错都算失败，链继续往下走
const PROVIDER_ACCEPTS: Record<ProviderId, TokenType> = {
  jwt: 'legacy-jwt', clerk: 'clerk-session', simple: 'api-key-token',
};
export interface AuthResult { attempts: Array<{ id: ProviderId; ok: boolean }>; winner: ProviderId | null }
export interface AuthAdvancedOptions { tokenType: TokenType; chainOrder: ChainOrder; fgaAction: FgaAction }
export interface AuthAdvancedSnapshot { winner: ProviderId | null; allowed: boolean }
export interface AuthAdvancedInstance { update(options: AuthAdvancedOptions): void; dispose(): void }

// 对应 CompositeAuth 语义：按声明顺序逐个尝试，首个成功者胜出，单个失败静默继续
export function simulateAuth(token: TokenType, order: ProviderId[]): AuthResult {
  const attempts = order.map((id) => ({ id, ok: PROVIDER_ACCEPTS[id] === token }));
  return { attempts, winner: attempts.find((a) => a.ok)?.id ?? null };
}
// member 在 FGA 侧的授予集合（permissionMapping 映射后的权限 slug）
export const MEMBER_GRANTS: FgaAction[] = ['memory:read', 'agents:execute'];
export function simulateFga(action: FgaAction): boolean {
  return MEMBER_GRANTS.includes(action);
}

const TOKEN_LABEL: Record<TokenType, string> = {
  'legacy-jwt': 'Bearer <legacy-jwt>', 'clerk-session': 'Bearer <clerk-session>',
  'api-key-token': 'Bearer <sk-integration-key>',
};

export function createProviderChain(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AuthAdvancedSnapshot) => void,
): AuthAdvancedInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D。');
  let current: AuthAdvancedOptions = { tokenType: 'legacy-jwt', chainOrder: 'jwt-first', fgaAction: 'memory:write' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(620, size.width);
    const height = Math.max(290, size.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const order: ProviderId[] = current.chainOrder === 'jwt-first' ? ['jwt', 'clerk', 'simple'] : ['simple', 'clerk', 'jwt'];
    const auth = simulateAuth(current.tokenType, order);
    const allowed = simulateFga(current.fgaAction);
    const sans = 'ui-sans-serif, system-ui, sans-serif';

    // 左栏：provider 链，命中者高亮，未命中标记「静默继续」
    ctx.fillStyle = '#172033';
    ctx.font = `600 16px ${sans}`;
    ctx.fillText('认证链：按声明顺序尝试，首个成功者胜出', 32, 36);
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#334155';
    ctx.fillText(`Authorization: ${TOKEN_LABEL[current.tokenType]}`, 32, 60);
    let y = 96;
    for (const step of auth.attempts) {
      ctx.fillStyle = step.ok ? '#dcfce7' : '#f1f5f9';
      ctx.strokeStyle = step.ok ? '#16a34a' : '#cbd5e1';
      ctx.lineWidth = step.ok ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(32, y, 280, 40, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = `13px ${sans}`;
      ctx.fillText(`${order.indexOf(step.id) + 1}. ${PROVIDER_LABEL[step.id]}`, 46, y + 25);
      ctx.font = `12px ${sans}`;
      ctx.fillStyle = step.ok ? '#15803d' : '#94a3b8';
      ctx.fillText(step.ok ? '✓ 认出用户' : '✗ 静默继续', 192, y + 25);
      y += 52;
    }
    ctx.fillStyle = '#15803d';
    ctx.font = `600 13px ${sans}`;
    ctx.fillText(`→ 200：由 ${PROVIDER_LABEL[auth.winner ?? 'jwt']} 返回用户对象`, 32, y + 6);

    // 右栏：FGA 判定（用户 × 资源 × 操作）
    const fx = 364;
    ctx.fillStyle = '#172033';
    ctx.font = `600 16px ${sans}`;
    ctx.fillText('FGA 判定（企业版）', fx, 96);
    ctx.font = `13px ${sans}`;
    ctx.fillStyle = '#334155';
    ctx.fillText('用户：member（team A）', fx, 126);
    ctx.fillText('资源：thread t-1（归属 team A）', fx, 148);
    ctx.fillText(`操作：${current.fgaAction}`, fx, 170);
    ctx.font = `600 15px ${sans}`;
    ctx.fillStyle = allowed ? '#15803d' : '#b91c1c';
    ctx.fillText(allowed ? '判定：允许（授予集合包含该权限）' : '判定：拒绝（抛 FGADeniedError）', fx, 202);
    ctx.font = `12px ${sans}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(`member 授予集合：${MEMBER_GRANTS.join('、')}`, fx, 226);
    ctx.fillText('离线示意：不发起真实认证 / FGA 请求。', 32, height - 16);
    emit({ winner: auth.winner, allowed });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  return {
    update(options) { current = options; draw(); },
    dispose() { resizeObserver.disconnect(); },
  };
}
