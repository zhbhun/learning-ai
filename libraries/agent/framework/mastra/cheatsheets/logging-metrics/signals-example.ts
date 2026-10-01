// 演示：Mastra 三类可观测信号——结构化日志 / Span 指标 / 人工反馈——的对照与 trace 关联。
// 输入：signal 单选（log | metric | feedback）与 drill 开关；操作：切换或开关后画布即时重绘。
// 预期：当前信号行高亮并展示来源、查询、存储与定位路径；drill 打开时当前信号与底部
//       trace 条之间画出关联线，读数同步更新。纯离线示意，不调用真实网络、存储或 LLM。

import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export type SignalKey = 'log' | 'metric' | 'feedback';

export interface SignalsSnapshot { signal: SignalKey; name: string; query: string; storage: string; path: string; }

export interface SignalsInstance {
  update(next: { signal: SignalKey; drill: boolean }): void;
  dispose(): void;
}

const SIGNALS: Array<{ key: SignalKey; name: string; source: string; query: string; storage: string; path: string }> = [
  { key: 'log', name: '结构化日志', source: 'mastra.getLogger().info(...) / logger 自动转发', query: 'client.listLogsVNext / npx mastra api log list', storage: 'Observability 存储（logging.enabled 默认 true）', path: '错误文本 → 按 level / 时间过滤 → 带 trace_id 回到 trace' },
  { key: 'metric', name: 'Span 指标', source: 'span 完成时自动聚合，零插桩', query: 'Studio 仪表盘 / 指标查询接口', storage: '分析型存储：DuckDB / ClickHouse（LibSQL、Mongo 不支持）', path: 'KPI 异常 → 时间 / 维度下钻 → 定位关联 span' },
  { key: 'feedback', name: '人工反馈', source: 'mastra.observability.addFeedback()', query: 'getFeedbackAggregate / Breakdown / TimeSeries', storage: 'observability 域存储；开源部署配保留期才物理清除', path: '差评 / 评论 → content.metadata.traceId → 回看该次 trace' },
];

const TRACE_TEXT = 'trace_id 0af7651916cd43dd8448eb211c80319c · 贯穿三类信号';

export function createSignalsCanvas(canvas: HTMLCanvasElement, emit: (snapshot: SignalsSnapshot) => void): SignalsInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) {
    throw new Error('无法创建 2D 上下文');
  }
  let signal: SignalKey = 'log';
  let drill = false;

  function card(x: number, y: number, w: number, h: number, fill: string, stroke: string, lw: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke();
  }

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    canvas.width = width; canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const pad = 16;
    const headH = 30;
    const traceH = 88;
    const rowH = Math.max(64, (height - headH - traceH - pad * 2) / SIGNALS.length);
    const active = SIGNALS.find((item) => item.key === signal)!;

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`三类信号对照（离线示意）· 当前：${active.name}`, pad, pad + 8);

    SIGNALS.forEach((item, index) => {
      const y = headH + index * rowH;
      const isActive = item.key === signal;
      card(pad, y + 4, width - pad * 2, rowH - 10, isActive ? '#eef4ff' : '#f5f6f8', isActive ? '#3b6ef6' : '#e3e6ea', isActive ? 2 : 1);
      ctx.fillStyle = isActive ? '#1d4ed8' : '#94a3b8';
      ctx.font = '700 15px system-ui, sans-serif';
      ctx.fillText(item.name, pad + 14, y + rowH / 2 - 16);
      ctx.font = '12px system-ui, sans-serif';
      const lines = [`来源：${item.source}`, `查询：${item.query}`, `存储：${item.storage}`];
      lines.forEach((text, i) => {
        ctx.fillStyle = isActive ? '#1f2937' : '#a8b0ba';
        ctx.fillText(text, pad + 112, y + rowH / 2 - 20 + i * 16);
      });
    });

    const traceY = height - pad - traceH + 6;
    card(pad, traceY, width - pad * 2, traceH - 14, '#f0fdf4', drill ? '#22c55e' : '#d1e7d8', drill ? 2 : 1);
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillStyle = '#166534';
    ctx.fillText(TRACE_TEXT, pad + 12, traceY + 18);

    const step = (width - pad * 2 - 24) / (SIGNALS.length - 1);
    SIGNALS.forEach((item, index) => {
      const cx = pad + 12 + index * step;
      ctx.beginPath(); ctx.arc(cx, traceY + 44, 6, 0, Math.PI * 2);
      ctx.fillStyle = item.key === signal ? '#22c55e' : '#bbd9c4';
      ctx.fill();
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#3f6212';
      ctx.fillText(item.name, cx - 20, traceY + 60);
    });

    if (drill) {
      const activeIndex = SIGNALS.findIndex((item) => item.key === signal);
      const cx = pad + 12 + activeIndex * step;
      ctx.setLineDash([5, 4]); ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad + 40, headH + activeIndex * rowH + rowH / 2);
      ctx.lineTo(cx, traceY + 38);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#15803d';
      ctx.fillText('沿 trace_id 下钻：从该信号跳回对应 trace / span', pad + 12, traceY + traceH - 26);
    }
  }

  const observer = createResizeObserver(canvas, draw);

  return {
    update(next) {
      signal = next.signal;
      drill = next.drill;
      draw();
      const info = SIGNALS.find((item) => item.key === signal)!;
      emit({ signal, name: info.name, query: info.query, storage: info.storage, path: info.path });
    },
    dispose() {
      observer.disconnect();
    },
  };
}
