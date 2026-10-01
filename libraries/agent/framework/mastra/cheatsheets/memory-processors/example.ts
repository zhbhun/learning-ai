// 演示：记忆处理器在 Agent 消息管道中的顺序与「进入记忆」的结果（离线示意，不调用真实 LLM / 存储）。
// 输入：workingMemory / semanticRecall / pii-guard 三个开关；在 Controls 中切换，观察各站顺序与读数。
// 预期：输入方向内置记忆处理器先于用户处理器；输出方向用户处理器先于记忆处理器；
//       pii-guard 命中手机号即 tripwire 中止——模型不调用、本轮不写任何记忆。
// 阅读主线：MemoryInputFilter → WorkingMemory → MessageHistory → SemanticRecall → 用户处理器 → 模型。

import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export interface MemoryArgs {
  workingMemory: boolean;
  semanticRecall: boolean;
  piiGuard: boolean;
}

export interface MemorySnapshot {
  inputOrder: string;
  modelSees: string;
  outputOrder: string;
  memoryResult: string;
}

export interface MemoryInstance { update(args: MemoryArgs): void; dispose?(): void; }

const TEAL = '#0f9d8f'; const BLUE = '#3b82f6'; const GRAY = '#b3bcc7'; // 记忆 / 用户 / 关闭

function stations(a: MemoryArgs) {
  const mem = (name: string, on: boolean) => ({ name, on, color: TEAL });
  const usr = (name: string, on: boolean) => ({ name, on, color: BLUE });
  const input = [
    mem('MemoryInputFilter', true),
    mem('WorkingMemory', a.workingMemory),
    mem('MessageHistory', true),
    mem('SemanticRecall', a.semanticRecall),
    usr('pii-guard', a.piiGuard),
    { name: '模型', on: true, color: '#334155' },
  ];
  const aborted = a.piiGuard; // 本轮用户消息含手机号，自定义处理器命中即中止
  if (aborted) input[input.length - 1] = { name: '模型（未调用）', on: false, color: GRAY };
  const output = [
    usr('pii-guard', a.piiGuard),
    mem('SemanticRecall 嵌入', a.semanticRecall),
    mem('MessageHistory 持久化', true),
  ];
  return { input, output, aborted };
}

function snapshot(a: MemoryArgs): MemorySnapshot {
  const { input, output, aborted } = stations(a);
  const seq = (l: { name: string; on: boolean }[]) => l.filter((s) => s.on).map((s) => s.name).join(' → ');
  const sees = [a.workingMemory ? '工作记忆' : null, '最近 10 条历史', a.semanticRecall ? '召回消息' : null, '本轮输入'].filter((v) => v) as string[];
  return {
    inputOrder: seq(input),
    modelSees: aborted ? '无（模型未被调用）' : sees.join(' + '),
    outputOrder: aborted ? '已跳过' : seq(output),
    memoryResult: aborted ? '0 条（存储与向量库均不写入）' : '新消息已持久化',
  };
}

function lane(ctx: CanvasRenderingContext2D, w: number, y: number, label: string, list: { name: string; on: boolean; color: string }[]) {
  ctx.fillStyle = '#5b6470';
  ctx.fillText(label, 16, y - 10);
  if (!list.length) { ctx.fillText('已跳过', 16, y + 20); return; }
  const gap = 8;
  const bw = Math.min(150, (w - 32 - gap * (list.length - 1)) / list.length);
  list.forEach((s, i) => {
    const x = 16 + i * (bw + gap);
    ctx.beginPath();
    ctx.roundRect(x, y, bw, 32, 8);
    ctx.fillStyle = s.on ? s.color : '#eef1f4';
    ctx.fill();
    ctx.strokeStyle = s.on ? s.color : GRAY;
    ctx.setLineDash(s.on ? [] : [4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = s.on ? '#fff' : '#8a94a0';
    ctx.textAlign = 'center';
    ctx.fillText(`${i + 1}. ${s.name}`, x + bw / 2, y + 20);
    ctx.textAlign = 'left';
  });
}

export function createExample(canvas: HTMLCanvasElement, emit: (s: MemorySnapshot) => void): MemoryInstance {
  const ctx = canvas.getContext('2d')!;
  let args: MemoryArgs = { workingMemory: true, semanticRecall: true, piiGuard: false };
  const draw = () => {
    const { width: w, height: h } = readCanvasSize(canvas);
    const { input, output, aborted } = stations(args);
    ctx.clearRect(0, 0, w, h);
    ctx.font = '12px system-ui, sans-serif';
    lane(ctx, w, h * 0.26, '输入方向：内置记忆处理器 → 用户 inputProcessors → 模型', input);
    lane(ctx, w, h * 0.62, '输出方向：用户 outputProcessors → 记忆写入', aborted ? [] : output);
    ctx.fillStyle = aborted ? '#e5484d' : '#5b6470';
    ctx.fillText(aborted ? 'tripwire 中止：消息不进模型，也不写记忆' : '新消息先嵌入向量库，再持久化到存储', 16, h - 14);
  };
  const observer = createResizeObserver(canvas, draw);
  draw();
  emit(snapshot(args));
  return {
    update(next: MemoryArgs) {
      args = next;
      draw();
      emit(snapshot(args));
    },
    dispose() { observer?.disconnect?.(); },
  };
}
