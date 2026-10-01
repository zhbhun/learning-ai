// 演示：Mastra 请求管道——中间件顺序、RequestContext 注入与多租户 resourceId 隔离。
// 输入：请求是否携带 Token；「认证」「租户注入」两个中间件的开关。
// 操作：update() 模拟一次 GET /api/agent 请求逐站经过 server.middleware 管道落到路由。
// 预期：带 Token 且认证开启 → 200，requestContext 出现 MASTRA_RESOURCE_ID_KEY，记忆按 org-7:u-42 隔离；
//       无 Token → 401 短路，后面的中间件与路由不执行；认证关闭 → 路由仍通，resourceId 落到客户端自报值。
// 阅读主线：runPipeline() 自上而下对应正文 Mermaid 的管道各站。

import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface PipelineArgs {
  hasToken: boolean;
  authEnabled: boolean;
  injectEnabled: boolean;
}

export interface PipelineSnapshot {
  status: number;
  resourceId: string;
  contextEntries: [string, string][];
  stations: { name: string; hit: boolean }[];
  threads: string[];
  log: string;
}

type Emit = (snapshot: PipelineSnapshot) => void;

const MY_RESOURCE = 'org-7:u-42';
const OTHER_THREADS = ['u-99:trip', 'u-99:notes'];

// 纯逻辑：模拟「认证 → 租户注入 → 日志 → 路由」的注册顺序与短路语义
export function runPipeline(args: PipelineArgs): PipelineSnapshot {
  const ctx = new Map<string, string>();
  const names = ['认证中间件', '租户注入', '日志中间件', '路由 /api/agent'];
  const stations = names.map(name => ({ name, hit: false }));
  let status = 200;
  let resourceId = 'guest（客户端自报）';
  let log = '';

  if (args.authEnabled) {
    stations[0].hit = true;
    if (!args.hasToken) {
      status = 401; // 短路：直接 return Response，后续中间件与路由均不执行
      log = '认证中间件：缺少 Authorization，401 短路';
    } else {
      // 对应 mapUserToResourceId: user => `${user.orgId}:${user.id}`
      resourceId = MY_RESOURCE;
      ctx.set('MASTRA_RESOURCE_ID_KEY', resourceId);
    }
  }
  if (status === 200 && args.injectEnabled) {
    stations[1].hit = true;
    ctx.set('CF-IPCountry', 'CN'); // 中间件从请求头注入
    ctx.set('temperature-unit', 'celsius');
  }
  if (status === 200) {
    stations[2].hit = true;
    stations[3].hit = true;
    log = 'GET /api/agent - 12ms'; // 日志中间件在 next() 之后计时
  }
  return {
    status,
    resourceId,
    contextEntries: [...ctx.entries()],
    stations,
    threads:
      status === 200 ? (resourceId === MY_RESOURCE ? ['u-42:trip', 'u-42:notes'] : ['guest:chat']) : [],
    log,
  };
}

export function createPipelineExample(canvas: HTMLCanvasElement, emit: Emit) {
  const g = canvas.getContext('2d')!;
  let snapshot: PipelineSnapshot | null = null;

  function draw() {
    const { width: w } = readCanvasSize(canvas);
    g.clearRect(0, 0, w, canvas.height);
    if (!snapshot) return;
    const bw = Math.min(140, (w - 40) / 4 - 14);
    snapshot.stations.forEach((st, i) => {
      const x = 20 + i * (bw + 16);
      g.globalAlpha = st.hit ? 1 : 0.4;
      g.fillStyle = st.hit ? '#0f766e' : '#cbd5e1';
      g.fillRect(x, 24, bw, 32);
      g.fillStyle = '#ffffff';
      g.font = '12px sans-serif';
      g.textAlign = 'center';
      g.fillText(st.name, x + bw / 2, 44, bw - 6);
      g.globalAlpha = 1;
    });
    g.textAlign = 'left';
    g.fillStyle = snapshot.status === 200 ? '#0f766e' : '#b91c1c';
    g.font = 'bold 14px sans-serif';
    g.fillText(`HTTP ${snapshot.status}　${snapshot.log}`, 20, 78);
    g.fillStyle = '#334155';
    g.font = 'bold 12px sans-serif';
    g.fillText('requestContext', 20, 104);
    g.font = '12px sans-serif';
    g.fillStyle = '#475569';
    if (snapshot.contextEntries.length === 0) g.fillText('（空）', 20, 122);
    snapshot.contextEntries.forEach(([k, v], i) => g.fillText(`${k} = ${v}`, 20, 122 + i * 16));
    const rx = Math.max(w / 2 + 10, 250);
    g.fillStyle = '#334155';
    g.font = 'bold 12px sans-serif';
    g.fillText('记忆隔离', rx, 104);
    g.font = '12px sans-serif';
    g.fillStyle = '#475569';
    g.fillText(`resourceId = ${snapshot.resourceId}`, rx, 122);
    snapshot.threads.forEach((t, i) => g.fillText(`可见线程 ${t}`, rx, 140 + i * 16));
    if (snapshot.resourceId === MY_RESOURCE) {
      g.fillText(`不可见 ${OTHER_THREADS.join('、')}`, rx, 140 + snapshot.threads.length * 16);
    }
  }

  function update(args: PipelineArgs) {
    snapshot = runPipeline(args);
    emit(snapshot);
    draw();
  }

  const observer = createResizeObserver(canvas, draw);
  return { update, dispose: () => observer.disconnect() };
}
