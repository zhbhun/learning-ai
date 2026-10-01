/**
 * 范例介绍：Mastra Client SDK 的「调用拓扑」（离线示意，不发起真实请求）。
 * 输入：调用来源（浏览器 / Node 服务）+ 资源面（Agent 流式 / Workflow / Memory）。
 * 操作：切换控件，观察每条调用链的请求方法、路径、凭据方式与返回形态。
 * 预期结果：同一资源面对所有调用方走同一条 HTTP 路由；差异在凭据与消费方式。
 * 阅读主线：README.mdx「资源面：从客户端到 Mastra Server」小节。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type CallSource = 'browser' | 'node';
export type ResourceKind = 'agent-stream' | 'workflow' | 'memory';
export interface TopologyArgs { source: CallSource; resource: ResourceKind; }
export interface TopologySnapshot { path: string; auth: string; shape: string; }

const RESOURCES: Record<ResourceKind, { label: string; method: string; path: string; shape: string; consume: string }> = {
  'agent-stream': {
    label: 'Agent 流式对话', method: 'POST', path: '/api/agents/:agentId/stream',
    shape: 'data stream（流式分片）', consume: "agent.stream('...') → stream.processDataStream({ onTextPart })",
  },
  workflow: {
    label: 'Workflow 运行', method: 'POST', path: '/api/workflows/:workflowId/runs',
    shape: 'JSON（runId + 运行状态）', consume: 'workflow.createRun() → run.startAsync({ inputData })',
  },
  memory: {
    label: 'Memory 线程', method: 'GET', path: '/api/memory/threads',
    shape: 'JSON（StorageThreadType[]）', consume: 'client.listMemoryThreads({ resourceId, agentId })',
  },
};

const SOURCES: Record<CallSource, { label: string; auth: string }> = {
  browser: { label: '浏览器页面', auth: "credentials: 'include'（跨域带 cookie）" },
  node: { label: 'Node 服务', auth: 'headers 注入 Authorization / API key' },
};

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TopologySnapshot) => void,
): { update(args: TopologyArgs): void; dispose(): void } {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D。');
  let args: TopologyArgs = { source: 'browser', resource: 'agent-stream' };

  function fitText(text: string, maxWidth: number): string {
    let out = text;
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
    return out.length < text.length ? `${out}…` : out;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(320, size.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const res = RESOURCES[args.resource];
    const boxY = 52; const boxH = 58;
    // 左侧调用方 → 右侧 Mastra Server 的调用链
    ctx.textAlign = 'center';
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#1f2937';
    ctx.fillText(SOURCES[args.source].label, 100, boxY + 26);
    ctx.fillText('Mastra Server', width - 110, boxY + 26);
    ctx.font = '11px sans-serif'; ctx.fillStyle = '#6b7280';
    ctx.fillText('调用方', 100, boxY + 44);
    ctx.fillText(':4111', width - 110, boxY + 44);
    ctx.fillStyle = '#eef2ff'; ctx.strokeStyle = '#6366f1';
    ctx.fillRect(24, boxY, 152, boxH); ctx.strokeRect(24, boxY, 152, boxH);
    ctx.fillStyle = '#fffbeb'; ctx.strokeStyle = '#d97706';
    ctx.fillRect(width - 196, boxY, 172, boxH); ctx.strokeRect(width - 196, boxY, 172, boxH);

    // 请求方法与路径标注在箭头上方
    ctx.font = '12px ui-monospace, monospace'; ctx.fillStyle = '#111827';
    ctx.fillText(fitText(`${res.method} ${res.path}`, width - 424), width / 2, boxY - 14);
    ctx.strokeStyle = '#6366f1';
    ctx.beginPath(); ctx.moveTo(180, boxY + boxH / 2); ctx.lineTo(width - 206, boxY + boxH / 2); ctx.stroke();
    ctx.fillStyle = '#6366f1'; ctx.fillText('▶', width - 202, boxY + boxH / 2 + 4);

    // 资源面清单：高亮当前选择的资源
    (Object.keys(RESOURCES) as ResourceKind[]).forEach((kind, i) => {
      const y = 130 + i * 32; const active = kind === args.resource;
      ctx.fillStyle = active ? '#6366f1' : '#f3f4f6';
      ctx.fillRect(width - 196, y, 172, 26);
      ctx.fillStyle = active ? '#ffffff' : '#374151';
      ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(RESOURCES[kind].label, width - 186, y + 17);
    });
    ctx.textAlign = 'center';

    // 底部读数区：凭据 / 返回形态 / 消费方式
    const rows: Array<[string, string]> = [
      ['凭据', SOURCES[args.source].auth],
      ['返回形态', res.shape],
      ['消费方式', res.consume],
    ];
    rows.forEach(([key, value], i) => {
      const y = height - 76 + i * 24;
      ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#6b7280'; ctx.textAlign = 'left';
      ctx.fillText(key, 24, y);
      ctx.font = '12px ui-monospace, monospace'; ctx.fillStyle = '#111827';
      ctx.fillText(fitText(value, width - 130), 104, y);
    });
  }

  const observer = createResizeObserver(canvas, draw);
  draw();

  return {
    update(next: TopologyArgs) {
      args = next;
      draw();
      const res = RESOURCES[next.resource];
      emit({ path: `${res.method} ${res.path}`, auth: SOURCES[next.source].auth, shape: res.shape });
    },
    dispose() {
      observer.disconnect();
    },
  };
}
