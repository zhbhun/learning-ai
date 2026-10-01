// 演示：Durable Agents 断线重连时间线（离线示意，不调用真实 LLM / 网络 / 存储）。
// 输入：断线时刻、离线时长（秒）、慢工具执行方式（后台任务 / 前台阻塞）。
// 操作：拖动控件改变断线窗口或执行方式；时间轴按 1 实秒 = 2.2 run 秒循环重播一轮 run。
// 预期：离线只影响客户端观看，服务端 run 照常推进；重连时缓冲事件整段回放；
//       后台任务模式下 agent 持续输出，run 等到任务完成写回记忆后才结束（untilIdle）。
// 阅读主线：上方服务端事件轴 → 中部客户端连接条 → 下方事件缓冲区与后台任务条。
import { createRenderLoop, createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface ExampleArgs { disconnectAt: number; reconnectAfter: number; slowTool: 'background' | 'foreground'; }
export interface ExampleSnapshot { time: number; total: number; status: string; buffered: number; bg: string; }
export interface ExampleInstance { update(args: ExampleArgs): void; dispose(): void; }

interface Ev { t: number; kind: 'llm' | 'tool' | 'bg' | 'done'; label: string; }
const COLORS: Record<Ev['kind'], string> = { llm: '#2563eb', tool: '#ea580c', bg: '#7c3aed', done: '#059669' };

function buildEvents(slowTool: ExampleArgs['slowTool']) {
  const events: Ev[] = [];
  const push = (t: number, kind: Ev['kind'], label = '') => events.push({ t, kind, label });
  [0.4, 1.4, 2.4].forEach((t) => push(t, 'llm'));
  if (slowTool === 'foreground') {
    // 前台阻塞：工具执行期间循环卡住，3s→6s 无任何 chunk 产出
    push(3, 'tool', '慢工具开始'); push(6, 'tool', '慢工具结束');
    [6.6, 7.4].forEach((t) => push(t, 'llm')); push(7.8, 'done', 'run 结束');
    return { events, total: 8, bgSpan: null as [number, number] | null };
  }
  // 后台任务：派发后 agent 继续输出；任务完成写回记忆，untilIdle 再拉起一轮收尾
  push(3, 'bg', 'task started');
  [3.6, 4.6, 5.4].forEach((t) => push(t, 'llm'));
  push(8, 'bg', 'task completed'); push(8.6, 'llm'); push(9, 'done', 'run 结束');
  return { events, total: 9.4, bgSpan: [3, 8] as [number, number] };
}

export function createExample(canvas: HTMLCanvasElement, emit: (s: ExampleSnapshot) => void): ExampleInstance {
  const ctx = canvas.getContext('2d')!;
  let args: ExampleArgs = { disconnectAt: 3.5, reconnectAfter: 2.5, slowTool: 'background' };
  let { events, total, bgSpan } = buildEvents(args.slowTool);
  let t = 0;

  const draw = () => {
    const { width: w, height: h } = readCanvasSize(canvas);
    ctx.clearRect(0, 0, w, h);
    const left = 100, right = w - 56;
    const x = (time: number) => left + (Math.min(time, total) / total) * (right - left);
    const d = args.disconnectAt, offline = args.reconnectAfter > 0, r = d + args.reconnectAfter;
    const axisY = 118, clientY = 202, bufY = 292, bgY = 352;
    const text = (s: string, px: number, py: number, color = '#374151', size = 12, align: CanvasTextAlign = 'left') => {
      ctx.fillStyle = color; ctx.font = `${size}px system-ui, sans-serif`; ctx.textAlign = align; ctx.fillText(s, px, py);
    };
    // 服务端事件轴：无论客户端是否在线，run 都按计划推进
    text('服务端 run', 16, axisY + 4, '#111827', 13);
    ctx.strokeStyle = '#d1d5db'; ctx.beginPath(); ctx.moveTo(left, axisY); ctx.lineTo(right, axisY); ctx.stroke();
    for (let s = 0; s <= Math.floor(total); s++) {
      ctx.strokeStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(x(s), axisY - 4); ctx.lineTo(x(s), axisY + 4); ctx.stroke();
      if (s % 2 === 0) text(`${s}s`, x(s), axisY + 20, '#9ca3af', 10, 'center');
    }
    // chunk / 工具 / 后台任务事件：颜色区分，未播到的降透明
    for (const e of events) {
      ctx.globalAlpha = e.t <= t ? 1 : 0.22; ctx.fillStyle = COLORS[e.kind];
      ctx.beginPath(); ctx.arc(x(e.t), axisY, 5, 0, Math.PI * 2); ctx.fill();
      if (e.label && e.t <= t) text(e.label, e.kind === 'done' ? x(e.t) - 4 : x(e.t), axisY - 12, COLORS[e.kind], 11, e.kind === 'done' ? 'right' : 'center');
      ctx.globalAlpha = 1;
    }
    // 客户端连接条：绿 = 在线，灰纹 = 离线；未播到的区段降透明
    text('客户端连接', 16, clientY + 17, '#111827', 13);
    const bar = (a: number, b: number, color: string) => {
      ctx.globalAlpha = t >= b ? 1 : 0.3; ctx.fillStyle = color;
      ctx.fillRect(x(a), clientY, x(b) - x(a), 26); ctx.globalAlpha = 1;
    };
    bar(0, d, '#10b981');
    if (offline) {
      bar(d, r, '#e5e7eb');
      ctx.strokeStyle = '#9ca3af';
      for (let gx = x(d); gx < x(r); gx += 8) { ctx.beginPath(); ctx.moveTo(gx, clientY + 26); ctx.lineTo(gx + 8, clientY); ctx.stroke(); }
      text('离线', x(d) + 8, clientY + 17, '#6b7280');
      bar(r, total, '#10b981');
    } else bar(d, total, '#10b981');
    // 事件缓冲区：离线期间的 chunk 被缓存层暂存，重连后整段回放给客户端
    text('事件缓冲区', 16, bufY + 14, '#111827', 13);
    const inWindow = (e: Ev) => offline && e.t > d && e.t <= r;
    const buffered = events.filter((e) => inWindow(e) && e.t <= t);
    events.filter(inWindow).forEach((e, i) => {
      if (t >= r || e.t <= t) { ctx.fillStyle = t >= r ? '#10b981' : COLORS[e.kind]; ctx.fillRect(left + i * 16, bufY, 11, 11); }
    });
    text(t >= r && offline ? `重连回放 ${buffered.length} 条事件 → 客户端` : offline ? '离线缓冲中…' : '全程在线，无缓冲', left + 170, bufY + 10, '#059669');
    // 后台任务条：与 agent 输出并行执行，完成后经 untilIdle 触发收尾轮
    if (bgSpan) {
      const [bs, be] = bgSpan;
      text('后台任务', 16, bgY + 16, '#111827', 13);
      ctx.strokeStyle = '#7c3aed'; ctx.fillStyle = t >= be ? '#c4b5fd' : '#ddd6fe';
      ctx.fillRect(x(bs), bgY, ((Math.min(t, be) - bs) / (be - bs)) * (x(be) - x(bs)), 24);
      ctx.strokeRect(x(bs), bgY, x(be) - x(bs), 24);
      text(t < bs ? '待派发' : t < be ? 'running' : 'completed', x(bs) + 8, bgY + 16, '#5b21b6');
    }
    // 播放头与 run 结束线
    ctx.setLineDash([4, 3]); ctx.strokeStyle = '#111827';
    ctx.beginPath(); ctx.moveTo(x(t), 96); ctx.lineTo(x(t), h - 24); ctx.stroke();
    ctx.setLineDash([]); ctx.strokeStyle = '#059669';
    ctx.beginPath(); ctx.moveTo(x(total), 96); ctx.lineTo(x(total), h - 24); ctx.stroke();
    text(`${Math.min(t, total).toFixed(1)}s`, x(t) + 6, 108, '#111827', 11);
    emit({
      time: Math.min(t, total), total,
      status: t >= total ? '已完成' : '运行中',
      buffered: buffered.length,
      bg: bgSpan ? (t < bgSpan[0] ? '待派发' : t < bgSpan[1] ? '运行中' : '已完成') : '前台阻塞',
    });
  };

  const loop = createRenderLoop(canvas, (dt: number) => {
    t += dt * 2.2; if (t > total + 2.6) t = 0; // 1 实秒 = 2.2 run 秒；播完后循环重播
    draw();
  });
  const ro = createResizeObserver(canvas, draw);

  return {
    update(next: ExampleArgs) {
      // 切换执行方式会重建整条事件轴；调断线窗口则即时生效，不打断当前播放
      if (next.slowTool !== args.slowTool) ({ events, total, bgSpan } = buildEvents(next.slowTool));
      args = next;
    },
    dispose() { loop.dispose(); ro.disconnect(); },
  };
}
