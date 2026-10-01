/*
演示内容：Scorer 四步流水线（preprocess → analyze → generateScore → generateReason）离线示意，
对比内置 answer-relevancy 与自定义 quote-sources 两条流水线。
输入：kind（内置 / 自定义）与 preprocess / analyze / generateReason 三个开关（generateScore 必选，不可关）。
操作：切换流水线类型、开关步骤，观察步骤运行/跳过、judge 调用次数、得分与理由来源。
预期结果：关闭步骤灰色"跳过"；prompt 对象步骤各计一次 judge 调用，纯函数步骤不计；
内置流水线关 preprocess 后得分 0.86 → 0.72；自定义流水线关 analyze 后 generateScore 退回函数启发式。
阅读主线：PIPELINES → evaluate → drawPipeline / drawScoreCard。数据为离线示意，不调用真实 judge 模型；
真实评估由 scorer.run(...) 或 Agent 挂载自动触发。
*/
import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export interface EvalsArgs {
  kind: 'builtin' | 'custom';
  preprocess: boolean;
  analyze: boolean;
  reason: boolean;
}

export interface EvalsSnapshot { kind: string; score: number; judgeCalls: number; reasonSource: string; }

type StepDef = { key: string; name: string; desc: string; judge: boolean; required?: boolean };
type Step = StepDef & { on: boolean };

// 两条示意流水线：内置 answer-relevancy 与自定义 quote-sources（对照官方文档示例）。
const PIPELINES: Record<EvalsArgs['kind'], { label: string; steps: StepDef[] }> = {
  builtin: {
    label: 'answer-relevancy（内置）',
    steps: [
      { key: 'preprocess', name: 'preprocess', desc: '抽取问题与答案', judge: false },
      { key: 'analyze', name: 'analyze', desc: 'LLM 把回答拆成陈述', judge: true },
      { key: 'score', name: 'generateScore', desc: '陈述与问题相似度', judge: false, required: true },
      { key: 'reason', name: 'generateReason', desc: 'LLM 生成评分理由', judge: true },
    ],
  },
  custom: {
    label: 'quote-sources（自定义）',
    steps: [
      { key: 'preprocess', name: 'preprocess', desc: '裁剪保留最后一条输出', judge: false },
      { key: 'analyze', name: 'analyze', desc: 'zod 提取 sources', judge: true },
      { key: 'score', name: 'generateScore', desc: 'hasSources ? 1 : 0', judge: false, required: true },
      { key: 'reason', name: 'generateReason', desc: '模板函数拼装理由', judge: false },
    ],
  },
};

// 按开关求值：generateScore 始终运行；得分与理由均为离线示意值。
function evaluate(args: EvalsArgs) {
  const pipe = PIPELINES[args.kind];
  const flags: Record<string, boolean> = { preprocess: args.preprocess, analyze: args.analyze, reason: args.reason };
  const steps: Step[] = pipe.steps.map((s) => ({ ...s, on: s.required ? true : flags[s.key] }));
  let score: number, reasonSource: string;
  if (args.kind === 'builtin') {
    score = args.preprocess ? 0.86 : 0.72; // preprocess 关闭后输入带噪声，相关性下降（示意）
    reasonSource = args.reason ? (args.preprocess ? 'LLM：回答覆盖问题要点' : 'LLM：回答含噪声、部分偏题') : '未生成（步骤关闭）';
  } else {
    score = 1;
    reasonSource = args.reason ? (args.analyze ? 'LLM：提取到 sources: [Wikipedia]' : '模板：输出含 Source: 关键字') : '未生成（步骤关闭）';
  }
  const snapshot: EvalsSnapshot = { kind: pipe.label, score, judgeCalls: steps.filter((s) => s.on && s.judge).length, reasonSource };
  return { pipe, steps, snapshot };
}

export function createEvalsExample(canvas: HTMLCanvasElement, emit: (s: EvalsSnapshot) => void) {
  const ctx = canvas.getContext('2d')!;
  let args: EvalsArgs = { kind: 'builtin', preprocess: true, analyze: true, reason: true };
  const observer = createResizeObserver(canvas, draw);

  function draw() {
    const { width, height } = readCanvasSize(canvas);
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    const { pipe, steps, snapshot } = evaluate(args);
    emit(snapshot);
    drawPipeline(pipe.label, steps, width);
    drawScoreCard(snapshot, steps, width);
  }

  function drawPipeline(label: string, steps: Step[], w: number) {
    const m = 16, gap = 12, by = 42, bh = 104;
    const bw = (w - m * 2 - gap * 3) / 4;
    ctx.fillStyle = '#0f172a'; ctx.font = '600 13px system-ui';
    ctx.fillText(`${label} · 四步流水线`, m, 24);
    steps.forEach((s, i) => {
      const x = m + i * (bw + gap);
      ctx.setLineDash(s.on ? [] : [4, 3]);
      ctx.fillStyle = s.on ? '#eff6ff' : '#f1f5f9'; ctx.strokeStyle = s.on ? '#2563eb' : '#cbd5e1'; ctx.lineWidth = 1.5;
      ctx.fillRect(x, by, bw, bh); ctx.strokeRect(x, by, bw, bh);
      ctx.setLineDash([]);
      ctx.fillStyle = '#0f172a'; ctx.font = '600 12px system-ui';
      ctx.fillText(s.name, x + 10, by + 22);
      ctx.fillStyle = s.judge && s.on ? '#7c3aed' : '#94a3b8'; ctx.font = '10px system-ui';
      ctx.fillText(s.judge ? 'judge' : '函数', x + bw - 38, by + 21);
      ctx.fillStyle = '#475569'; ctx.font = '11px system-ui';
      ctx.fillText(s.desc, x + 10, by + 48);
      ctx.fillStyle = s.on ? '#059669' : '#94a3b8'; ctx.font = '600 11px system-ui';
      ctx.fillText(s.required ? '必选 · 运行' : s.on ? '运行' : '跳过', x + 10, by + bh - 14);
      if (i < steps.length - 1) {
        const ax = x + bw + 2;
        ctx.fillStyle = '#94a3b8'; ctx.beginPath();
        ctx.moveTo(ax, by + bh / 2 - 4); ctx.lineTo(ax + gap - 4, by + bh / 2); ctx.lineTo(ax, by + bh / 2 + 4); ctx.fill();
      }
    });
  }

  function drawScoreCard(snap: EvalsSnapshot, steps: Step[], w: number) {
    const m = 16, y0 = 172, bx = 88, bw = w - bx - 60;
    ctx.fillStyle = '#0f172a'; ctx.font = '600 13px system-ui';
    ctx.fillText('评分卡', m, y0);
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(bx, y0 - 12, bw, 14);
    ctx.fillStyle = snap.score >= 0.8 ? '#059669' : snap.score >= 0.5 ? '#d97706' : '#dc2626';
    ctx.fillRect(bx, y0 - 12, bw * snap.score, 14);
    ctx.fillStyle = '#0f172a'; ctx.font = '12px system-ui';
    ctx.fillText(snap.score.toFixed(2), bx + bw + 8, y0);
    const judgeSteps = steps.filter((s) => s.on && s.judge).map((s) => s.name);
    ctx.fillStyle = '#475569';
    ctx.fillText(judgeSteps.length ? `judge 调用：${judgeSteps.length} 次（${judgeSteps.join('、')}）` : '全函数步骤：judge 从未被调用', m, y0 + 28);
    ctx.fillText(`理由：${snap.reasonSource}`, m, y0 + 50);
  }

  return {
    update(next: EvalsArgs) {
      args = next;
      draw();
    },
    dispose() {
      observer.disconnect();
    },
  };
}
