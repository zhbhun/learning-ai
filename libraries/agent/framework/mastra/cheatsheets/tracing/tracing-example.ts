/*
演示内容：一次 agent.generate() 调用的离线 trace——span 树层级与耗时占比时间轴。
输入：sampling（always / never / ratio）、probability（ratio 概率）、view（span 树 / 时间轴）。
操作：用 Controls 切换采样策略与视图，观察 trace 是否生成、各 span 耗时与占比。
预期结果：never 或 ratio 未命中时画布显示“trace 未生成”、traceId 读数为 undefined；
命中时展开 agent → LLM → tool 层级，时间轴给出 waterfall 耗时占比（root 820 ms）。
阅读主线：SPANS（示意数据）→ decideSampled（采样判定）→ drawTree / drawTimeline / drawDropped。
数据为离线示意，不发起真实 LLM 请求；真实 trace 由 @mastra/observability 自动记录。
*/
import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export interface TracingArgs {
  sampling: 'always' | 'never' | 'ratio';
  probability: number;
  view: 'tree' | 'timeline';
}

export interface TracingSnapshot {
  sampled: boolean;
  traceId: string | undefined;
  rootMs: number;
  llmShare: number;
}

type SpanNode = { name: string; kind: string; start: number; ms: number; depth: number };

// 一次 agent 调用的示意 span 集合：root(agent) → llm → tool，外加第二个 tool。
const ROOT_MS = 820;
const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const SPANS: SpanNode[] = [
  { name: 'agent: weather-agent.run', kind: 'AGENT_RUN', start: 0, ms: 820, depth: 0 },
  { name: 'llm: openai/gpt-4o-mini', kind: 'MODEL_STEP', start: 60, ms: 600, depth: 1 },
  { name: 'tool: getWeather', kind: 'TOOL_CALL', start: 120, ms: 130, depth: 2 },
  { name: 'tool: getAlerts', kind: 'TOOL_CALL', start: 690, ms: 110, depth: 1 },
];
const KIND_COLOR: Record<string, string> = { AGENT_RUN: '#2563eb', MODEL_STEP: '#7c3aed', TOOL_CALL: '#059669' };

// 采样判定：never 恒丢、always 恒采、ratio 按 probability 掷骰（确定性伪随机，便于复现）。
function decideSampled(args: TracingArgs, seed: number): boolean {
  if (args.sampling === 'never') return false;
  if (args.sampling === 'always') return true;
  const roll = Math.abs(Math.sin(seed * 99991) * 43758.5453) % 1;
  return roll < args.probability;
}

export function createTracingExample(canvas: HTMLCanvasElement, emit: (s: TracingSnapshot) => void) {
  const ctx = canvas.getContext('2d')!;
  let seed = 1;
  let args: TracingArgs = { sampling: 'always', probability: 0.5, view: 'tree' };
  const observer = createResizeObserver(canvas, draw);
  const share = (span: SpanNode) => Math.round((span.ms / ROOT_MS) * 100);
  function draw() {
    const { width, height } = readCanvasSize(canvas);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const sampled = decideSampled(args, seed);
    emit({ sampled, traceId: sampled ? TRACE_ID : undefined, rootMs: ROOT_MS, llmShare: share(SPANS[1]) });
    if (!sampled) drawDropped(width);
    else if (args.view === 'tree') drawTree(width);
    else drawTimeline(width);
  }
  function drawDropped(w: number) {
    ctx.fillStyle = '#fef2f2';
    ctx.fillRect(16, 20, w - 32, 84);
    ctx.fillStyle = '#b91c1c';
    ctx.font = '600 13px system-ui';
    ctx.fillText('采样未命中 → trace 未生成（请求正常执行，仅不导出追踪）', 28, 46);
    ctx.font = '12px system-ui';
    ctx.fillText(`traceId = undefined · sampling: ${args.sampling} · probability: ${args.probability}`, 28, 72);
  }
  function drawTree(w: number) {
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px system-ui';
    ctx.fillText(`trace 4bf92f35…（root ${ROOT_MS} ms）`, 16, 24);
    SPANS.forEach((s, i) => {
      const y = 46 + i * 42;
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px system-ui';
      ctx.fillText(`${'· '.repeat(s.depth)}${s.name}`, 16, y + 13);
      const barW = Math.max(20, (s.ms / ROOT_MS) * (w - 360));
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(300, y, barW, 18);
      ctx.fillStyle = KIND_COLOR[s.kind];
      ctx.fillRect(300, y, 4, 18);
      ctx.fillText(`${s.ms} ms · ${share(s)}%`, 304 + barW, y + 13);
    });
  }
  function drawTimeline(w: number) {
    const x0 = 70;
    const plotW = w - x0 - 40;
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px system-ui';
    ctx.fillText('时间轴 waterfall（root 820 ms）', 16, 24);
    SPANS.forEach((s, i) => {
      const y = 46 + i * 42;
      ctx.fillStyle = '#0f172a';
      ctx.font = '12px system-ui';
      ctx.fillText(`${s.ms} ms`, 12, y + 13);
      const bx = x0 + (s.start / ROOT_MS) * plotW;
      const bw = Math.max(3, (s.ms / ROOT_MS) * plotW);
      ctx.fillStyle = KIND_COLOR[s.kind];
      ctx.fillRect(bx, y, bw, 18);
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${share(s)}%`, bx + bw + 6, y + 13);
    });
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`0 → ${ROOT_MS} ms（示意时间轴）`, 70, 46 + SPANS.length * 42 + 8);
  }
  return {
    update(next: TracingArgs) {
      args = next;
      seed += 1; // 每次调整输入重新掷骰，观察 ratio 采样的概率性
      draw();
    },
    dispose() {
      observer.disconnect();
    },
  };
}
