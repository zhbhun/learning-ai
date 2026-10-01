/**
 * 范例介绍：离线示意 Mastra 的 MCP 双向桥。
 * 演示：客户端方向 MCPClient 把外部服务器工具挂给 Agent；服务端方向 MCPServer
 *      把 agents / tools / workflows 暴露给外部客户端。
 * 输入：mode 方向；connection 连接方式与 approval 审批策略（仅客户端方向生效）。
 * 操作：在 Controls 切换输入，观察流向、审批门控与左下角读数；命中策略的工具停在门控处。
 * 阅读主线：draw 按 mode 分支画两种桥 → isBlocked 决定门控 → snapshot 汇总读数。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type BridgeMode = 'client' | 'server';
export type Connection = 'stdio' | 'url';
export type Approval = 'off' | 'sensitive' | 'all';
export interface McpOptions { mode: BridgeMode; connection: Connection; approval: Approval; }
export interface McpSnapshot { mode: BridgeMode; flow: string; blocked: string[]; passed: number; }
export interface McpInstance { update(options: McpOptions): void; dispose(): void; }

const TOOLS = ['wiki_search', 'get_weather', 'delete_file'];
const INK = '#172033';
const MUTED = '#475569';
const ACCENT = '#4f7cff';

// 审批策略示意：all 拦全部；sensitive 只拦 delete_ 前缀；off 全放行
const isBlocked = (approval: Approval, tool: string): boolean =>
  approval === 'all' || (approval === 'sensitive' && tool.startsWith('delete_'));

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  title: string, sub: string, color: string) {
  ctx.fillStyle = '#f1f5f9'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = INK; ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(title, x + w / 2, y + h / 2 - 2);
  ctx.fillStyle = MUTED; ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(sub, x + w / 2, y + h / 2 + 18);
}

function arrow(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number,
  label: string, color: string) {
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2 - 10, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y); ctx.lineTo(x2 - 11, y - 5); ctx.lineTo(x2 - 11, y + 5);
  ctx.closePath(); ctx.fill();
  ctx.textAlign = 'center'; ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(label, (x1 + x2) / 2, y - 10);
}

export function createMcpExample(canvas: HTMLCanvasElement,
  emit: (snapshot: McpSnapshot) => void): McpInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D。');
  let current: McpOptions = { mode: 'client', connection: 'stdio', approval: 'sensitive' };

  function chip(x: number, y: number, name: string, blocked: boolean) {
    ctx.fillStyle = blocked ? '#fee2e2' : '#dcfce7'; ctx.fillRect(x, y, 200, 40);
    ctx.strokeStyle = blocked ? '#dc2626' : '#16a34a'; ctx.strokeRect(x, y, 200, 40);
    ctx.textAlign = 'left'; ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = INK; ctx.fillText(name, x + 12, y + 17);
    ctx.fillStyle = blocked ? '#dc2626' : '#15803d';
    ctx.fillText(blocked ? '待审批（拦截）' : '放行', x + 12, y + 33);
  }

  function drawClient() {
    panel(ctx, 32, 88, 150, 64, 'Mastra Agent', 'generate / stream', ACCENT);
    panel(ctx, 264, 88, 168, 64, 'MCPClient', '@mastra/mcp', ACCENT);
    const stdio = current.connection === 'stdio';
    panel(ctx, 512, 88, 168, 64, stdio ? 'stdio 服务器' : '远程服务器',
      stdio ? 'command + args' : 'url + requestInit', ACCENT);
    arrow(ctx, 182, 264, 112, 'tools / toolsets', MUTED);
    arrow(ctx, 432, 512, 112, stdio ? 'stdio 传输' : 'Streamable HTTP', MUTED);
    arrow(ctx, 432, 264, 176, '工具结果 = 不可信输入', '#b45309');
    // 调用先过审批门控：命中策略的工具停在这里，人工确认前不执行
    const gating = current.approval !== 'off';
    ctx.strokeStyle = gating ? '#dc2626' : '#cbd5e1'; ctx.lineWidth = gating ? 4 : 2;
    ctx.beginPath(); ctx.moveTo(232, 152); ctx.lineTo(232, 200); ctx.stroke();
    ctx.fillStyle = gating ? '#dc2626' : MUTED; ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(gating ? '审批门控' : '直接放行', 232, 218);
    arrow(ctx, 182, 264, 176, gating ? '工具调用（需审批）' : '工具调用', MUTED);
    TOOLS.forEach((tool, i) => chip(32 + i * 224, 296, tool, isBlocked(current.approval, tool)));
  }

  function drawServer() {
    panel(ctx, 32, 88, 150, 64, '外部 MCP 客户端', 'Claude / IDE / …', '#7c3aed');
    panel(ctx, 264, 88, 168, 64, 'MCPServer', '@mastra/mcp', ACCENT);
    panel(ctx, 512, 88, 168, 64, 'Mastra 原语', 'agents·tools·workflows', ACCENT);
    arrow(ctx, 182, 264, 112, 'Streamable HTTP', MUTED);
    arrow(ctx, 432, 512, 112, '注册暴露', MUTED);
    ctx.fillStyle = MUTED; ctx.textAlign = 'left';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('HTTP 端点：/api/mcp/:serverId/mcp（每请求自包含，兼容 serverless）', 32, 200);
    ctx.fillText('stdio 发布：入口调用 mcpServer.startStdio()，bin 指向构建产物', 32, 222);
    ctx.fillText('input_required：context.suspend() 暂停，客户端经 inputRequests 作答', 32, 244);
    ctx.fillStyle = '#b45309';
    ctx.fillText('审批门控属 MCPClient 能力，服务端方向不拦截调用', 32, 266);
  }

  function snapshot(): McpSnapshot {
    if (current.mode === 'server') {
      return { mode: 'server', flow: '外部客户端 → MCPServer → Mastra 原语', blocked: [], passed: 0 };
    }
    const blocked = TOOLS.filter((tool) => isBlocked(current.approval, tool));
    const flow = current.connection === 'stdio' ? 'Agent → MCPClient → stdio 子进程' : 'Agent → MCPClient → 远程 URL';
    return { mode: 'client', flow, blocked, passed: TOOLS.length - blocked.length };
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(700, size.width);
    const height = 356;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = INK; ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(current.mode === 'client' ? '客户端方向：外部工具挂给 Agent' : '服务端方向：Mastra 能力暴露为 MCP 服务', 32, 48);
    if (current.mode === 'client') drawClient(); else drawServer();
    emit(snapshot());
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  return {
    update(options) { current = options; draw(); },
    dispose() { resizeObserver.disconnect(); },
  };
}
