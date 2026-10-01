/**
 * 演示：Mastra 生产部署的进程拆分拓扑——三类 worker（orchestration / scheduler / backgroundTasks）
 * 与 PubSub 后端（EventEmitter / Redis Streams）的配对判断（离线示意，不启动真实进程）。
 * 输入：部署形态（单进程 / 拆分）、PubSub 后端、聚焦的 worker 类型。
 * 操作：切换控件，舞台重画 API / PubSub / worker 的进程拓扑与事件流动画，读数给出判定与环境变量。
 * 预期：单进程用进程内 EventEmitter 即可；拆分部署必须配 pull 模式分布式 PubSub，否则读数报「配置冲突」；
 *       拆出的 orchestration 经 MASTRA_STEP_EXECUTION_URL 回传 API 执行步骤。阅读主线：describe → draw → createTopology。
 */
import { createRenderLoop, createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type Topology = 'single' | 'split'; export type PubSubBackend = 'event-emitter' | 'redis-streams';
export type WorkerKind = 'orchestration' | 'scheduler' | 'backgroundTasks';
export interface RunnerArgs { topology: Topology; pubsub: PubSubBackend; focus: WorkerKind }
export interface TopologySnapshot { ok: boolean; processes: number; backend: string; infra: string; callback: string; notes: string }
export interface TopologyInstance { update(args: RunnerArgs): void; dispose(): void }

const WORKERS: Array<{ id: WorkerKind; duty: string }> = [
  { id: 'orchestration', duty: '执行工作流步骤' },
  { id: 'scheduler', duty: 'cron → workflow.start' },
  { id: 'backgroundTasks', duty: '运行后台工具调用' },
];

// 关键判断：拆分部署时 orchestration 要从分布式 PubSub 拉事件，EventEmitter 只在单进程内有效。
export function describe(args: RunnerArgs): TopologySnapshot {
  const split = args.topology === 'split', ok = !split || args.pubsub === 'redis-streams';
  return {
    ok,
    processes: split ? 4 : 1, // 示意：拆分时 API 与三类 worker 各占一进程
    backend: args.pubsub === 'redis-streams' ? 'RedisStreamsPubSub（pull · Redis 流）' : 'EventEmitterPubSub（push · 进程内）',
    infra: split ? '共享存储 + Redis' : '仅存储适配器',
    callback: split ? 'orchestration 经 MASTRA_STEP_EXECUTION_URL 回传 API 执行步骤' : '同进程直接执行',
    notes: !ok ? '配置冲突：拆分部署需 pull 模式分布式 PubSub（RedisStreamsPubSub / ValkeyStreamsPubSub / GoogleCloudPubSub）'
      : args.focus === 'scheduler' ? 'scheduler 只允许单实例，多副本会重复触发 cron'
      : split ? '无死信队列：失败事件重试后丢弃，pull 模式会重投递，步骤执行需幂等'
      : '默认形态：无独立扩容与崩溃隔离，随 API 进程存亡',
  };
}

interface Rect { x: number; y: number; w: number; h: number }

export function createTopology(canvas: HTMLCanvasElement, emit: (s: TopologySnapshot) => void): TopologyInstance {
  const ctx = canvas.getContext('2d')!;
  let args: RunnerArgs = { topology: 'split', pubsub: 'redis-streams', focus: 'orchestration' };
  let startedAt = performance.now();

  function label(text: string, x: number, y: number, color: string, bold = false) {
    ctx.fillStyle = color; ctx.font = bold ? '600 13px sans-serif' : '12px sans-serif';
    ctx.textAlign = 'center'; ctx.fillText(text, x, y);
  }

  function box(r: Rect, fill: string, stroke: string, dash = false) {
    ctx.save(); ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
    if (dash) ctx.setLineDash([6, 4]);
    ctx.stroke(); ctx.restore();
  }

  // 连线 + 沿线巡游的事件点：按时间取模，模拟事件在进程间持续流动
  function flow(x1: number, y1: number, x2: number, y2: number, color: string, dash = false) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    if (dash) ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
    const p = ((performance.now() - startedAt) % 1400) / 1400;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p, 5, 0, Math.PI * 2); ctx.fill();
  }

  function draw() {
    const { width: w, height: h } = readCanvasSize(canvas);
    const split = args.topology === 'split';
    const conflict = split && args.pubsub === 'event-emitter';
    const api: Rect = split ? { x: w / 2 - 190, y: 16, w: 380, h: 60 } : { x: w / 2 - 230, y: 16, w: 460, h: 124 };
    const busTop = api.y + api.h + 40, busBot = busTop + 44, rowW = (w - 48) / 3;
    const node = (i: number): Rect => ({ x: 24 + i * rowW + 8, y: busBot + 52, w: rowW - 16, h: 78 });
    ctx.clearRect(0, 0, w, h);
    if (split) {
      // 先画连线再画盒子：被盒体压住的线段自然遮挡，只留进程间隙里的流向
      flow(w / 2 - 120, api.y + api.h, w / 2 - 120, busTop, conflict ? '#dc2626' : '#64748b');
      for (const [i, wk] of WORKERS.entries()) {
        const cx = 24 + i * rowW + rowW / 2, ny = node(i).y;
        if (wk.id === 'scheduler') flow(cx, ny, cx, busBot, '#b45309'); // scheduler 只发布事件（向上）
        else flow(cx, busBot, cx, ny, args.focus === wk.id ? '#16a34a' : '#94a3b8'); // 其余从总线 pull 消费
        if (wk.id === 'orchestration') flow(cx, ny, api.x + 40, api.y + api.h, '#7c3aed', true); // 步骤执行回传 API
      }
    }
    box(api, '#eef2ff', '#4f46e5');
    label('API 进程（唯一公开入口）', w / 2, api.y + 24, '#312e81', true);
    label(split ? 'MASTRA_WORKERS=false：只留 agent 端点与 /health' : 'MASTRA_WORKERS 默认：三类 worker 都在本进程内', w / 2, api.y + 44, '#4b5563');
    if (!split) {
      for (const [i, wk] of WORKERS.entries()) {
        const hot = args.focus === wk.id, chip: Rect = { x: api.x + 16 + i * 146, y: api.y + 58, w: 134, h: 52 };
        box(chip, hot ? '#dcfce7' : '#f8fafc', hot ? '#16a34a' : '#cbd5e1');
        label(wk.id, chip.x + chip.w / 2, chip.y + 21, hot ? '#166534' : '#0f172a', true);
        label(wk.duty, chip.x + chip.w / 2, chip.y + 39, '#64748b');
      }
      label('事件经进程内总线直达，无需分布式设施', w / 2, busBot + 28, '#64748b');
    }
    box({ x: w / 2 - 210, y: busTop, w: 420, h: 44 }, conflict ? '#fef2f2' : args.pubsub === 'redis-streams' ? '#f0fdf4' : '#f8fafc', conflict ? '#dc2626' : args.pubsub === 'redis-streams' ? '#16a34a' : '#94a3b8', conflict);
    label(describe(args).backend, w / 2, busTop + 27, conflict ? '#b91c1c' : '#0f172a', true);
    if (split) {
      for (const [i, wk] of WORKERS.entries()) {
        const hot = args.focus === wk.id, r = node(i), cx = r.x + r.w / 2;
        box(r, hot ? '#dcfce7' : '#f8fafc', hot ? '#16a34a' : '#cbd5e1');
        label(wk.id, cx, r.y + 22, hot ? '#166534' : '#0f172a', true);
        label(wk.duty, cx, r.y + 42, '#64748b');
        label(`MASTRA_WORKERS=${wk.id}`, cx, r.y + 62, '#7c3aed');
      }
    }
  }

  const loop = createRenderLoop(canvas, () => draw()), observer = createResizeObserver(canvas, () => draw());
  return {
    update(next: RunnerArgs) {
      args = next; startedAt = performance.now(); emit(describe(args)); draw();
    },
    dispose() {
      observer.disconnect(); loop.dispose();
    },
  };
}
