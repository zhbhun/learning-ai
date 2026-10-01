/**
 * 范例介绍：离线示意 Mastra「互联边界选择器」。
 * 演示：四类互联边界——A2A 跨服务远程代理、ACP 外部编码代理进程、SDK agents 厂商进程内封装、MCP 仅工具互通。
 * 输入：scenario 互联场景；durable 是否要求 A2A 任务跨重启可恢复。操作：Controls 切换场景观察读数变化。
 * 阅读主线：SPECS 查表定文案 → draw 按场景画进程与边界 → snapshot 汇总读数。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type Scenario = 'a2a' | 'acp' | 'sdk' | 'mcp';
export interface BoundaryOptions { scenario: Scenario; durable: boolean; }
export interface BoundarySnapshot { scenario: Scenario; proto: string; owner: string; exchange: string; recovery: string; }
export interface BoundaryInstance { update(options: BoundaryOptions): void; dispose(): void; }
interface Spec { proto: string; pkg: string; boundary: string; left: [string, string]; right: [string, string]; link: string; owner: string; exchange: string; note: string; }

const SPECS: Record<Scenario, Spec> = {
  a2a: { proto: 'A2A', pkg: '@mastra/core/a2a', boundary: '网络（HTTP 开放协议）',
    left: ['Mastra 进程', 'A2AAgent / getA2A()'], right: ['远端 Agent 服务（黑盒）', 'agent card + JSON-RPC 端点'],
    link: 'HTTP JSON-RPC · agent card 发现', owner: '远端服务', exchange: '消息 · 任务 · 工件', note: '任务记录仅存内存' },
  acp: { proto: 'ACP', pkg: '@mastra/acp', boundary: '进程（stdio 子进程）',
    left: ['Mastra 进程', 'AcpAgent / createACPTool()'], right: ['CLI 子进程', 'claude --acp / Cline / OpenCode'],
    link: 'stdio + 换行分隔 JSON', owner: '子进程', exchange: '会话消息 · 权限请求', note: 'persistSession: true 保持子进程与会话' },
  sdk: { proto: 'SDK agents', pkg: '@mastra/openai 等', boundary: '同进程（无网络、无子进程）',
    left: ['Mastra 进程', '统一 generate / stream 门面'], right: ['厂商 SDK 运行时', '工具 / 权限 / agent loop 归 SDK'],
    link: '进程内注册 + 门面调用', owner: '厂商 SDK', exchange: 'generate / stream 统一入口', note: 'Mastra 工具与记忆不进入厂商 loop' },
  mcp: { proto: 'MCP', pkg: '@mastra/mcp', boundary: '进程或网络（工具协议）',
    left: ['Mastra 进程', 'MCPClient'], right: ['MCP 工具服务器', '交换工具，不是 agent'],
    link: 'stdio / Streamable HTTP', owner: '工具服务器', exchange: '工具 · 资源', note: '工具互通不等于 agent 委托' },
};

const INK = '#172033', MUTED = '#475569', ACCENT = '#4f7cff';

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  title: string, sub: string, dashed = false) {
  ctx.fillStyle = '#f1f5f9'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.setLineDash(dashed ? [5, 4] : []);
  ctx.strokeRect(x, y, w, h); ctx.setLineDash([]); ctx.textAlign = 'center';
  ctx.fillStyle = INK; ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(title, x + w / 2, y + h / 2 - 4);
  ctx.fillStyle = MUTED; ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(sub, x + w / 2, y + h / 2 + 16);
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  ctx.strokeStyle = MUTED; ctx.fillStyle = MUTED; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2 - 9, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 - 10, y - 5); ctx.lineTo(x2 - 10, y + 5);
  ctx.closePath(); ctx.fill();
}

export function createBoundaryExample(canvas: HTMLCanvasElement,
  emit: (snapshot: BoundarySnapshot) => void): BoundaryInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D。');
  let current: BoundaryOptions = { scenario: 'a2a', durable: false };

  // 两框一线：Mastra 进程 → 边界 → 对端（a2a / acp / mcp 共用）
  function drawSplit(spec: Spec) {
    ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(341, 108); ctx.lineTo(341, 214); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = MUTED; ctx.font = '11px ui-sans-serif, system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('边界', 341, 100);
    panel(ctx, 32, 124, 220, 68, spec.left[0], spec.left[1]);
    panel(ctx, 430, 124, 250, 68, spec.right[0], spec.right[1]);
    arrow(ctx, 252, 430, 158);
    ctx.fillStyle = MUTED; ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(spec.link, 341, 148);
  }

  // 同进程：厂商 SDK 画在 Mastra 进程容器内部，调用不跨界
  function drawSdk(spec: Spec) {
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(24, 96, 540, 120);
    ctx.strokeStyle = '#94a3b8'; ctx.setLineDash([5, 4]); ctx.strokeRect(24, 96, 540, 120); ctx.setLineDash([]);
    ctx.fillStyle = MUTED; ctx.font = '11px ui-sans-serif, system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('同一进程', 36, 114);
    panel(ctx, 40, 130, 200, 64, spec.left[0], spec.left[1]);
    panel(ctx, 320, 130, 228, 64, spec.right[0], spec.right[1], true);
    arrow(ctx, 240, 320, 162);
    ctx.fillStyle = MUTED; ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'; ctx.textAlign = 'center';
    ctx.fillText('generate / stream', 280, 152);
  }

  function draw() {
    const spec = SPECS[current.scenario];
    const width = Math.max(720, readCanvasSize(canvas).width);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(340 * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, 340);
    ctx.fillStyle = INK; ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`互联边界：${spec.proto}`, 32, 44);
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'; ctx.fillStyle = MUTED;
    ctx.fillText(`包：${spec.pkg}`, 32, 66);
    ctx.fillText(`边界：${spec.boundary}`, 32, 84);
    if (current.scenario === 'sdk') drawSdk(spec); else drawSplit(spec);

    let y = 244;
    const row = (label: string, value: string, color = INK) => {
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = MUTED; ctx.fillText(label, 32, y);
      ctx.fillStyle = color; ctx.fillText(value, 150, y);
      y += 22;
    };
    row('运行时归属', spec.owner); row('交换内容', spec.exchange);
    if (current.scenario === 'a2a') {
      row('A2A 任务', current.durable ? '存储 + 粘性路由 → 可恢复' : '内存记录 → 重启即丢',
        current.durable ? '#15803d' : '#dc2626');
    } else {
      row('注意', spec.note, '#b45309');
    }
    emit({ scenario: current.scenario, proto: spec.proto, owner: spec.owner, exchange: spec.exchange, recovery: current.scenario === 'a2a' ? (current.durable ? '可恢复（需存储 + 粘性路由）' : '丢失（内存任务记录）') : '—' });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  return {
    update(options) { current = options; draw(); }, dispose() { resizeObserver.disconnect(); },
  };
}
