/**
 * 演示：supervisor（父代理）如何决定「直接回答」还是委派子代理，以及委派钩子与结果引用（离线示意，不调用真实模型）。
 * 输入：任务类型、onDelegationStart 行为（放行 / 改写 / 拒绝）、enableResultReferences 开关。
 * 操作：切换控件，舞台按时间轴重放一次委派时序，节点显示执行状态与 [ref: id] 标记。
 * 预期：简单问答不委派；研究 / 写作各委派对应子代理；流水线串联两次委派并传递引用；拒绝钩子让委派失败并回退通用文案。
 * 阅读主线：resolveRoute（委派决策）→ runDelegation（钩子语义）→ simulate（生成读数）→ draw（委派树渲染）。
 */
import { createRenderLoop, createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type TaskType = 'qa' | 'research' | 'writing' | 'pipeline';
export type StartHook = 'proceed' | 'rewrite' | 'reject';
export interface SubagentsArgs { taskType: TaskType; startHook: StartHook; resultRefs: boolean }
export interface ExampleSnapshot { delegated: boolean; path: string; refs: string[]; answer: string }
export interface ExampleInstance { update(args: SubagentsArgs): void; dispose(): void }
interface Step { agent: string; status: 'ok' | 'rejected'; ref?: string }
interface Rect { x: number; y: number; w: number; h: number }

// 子代理注册表：description 是父代理决定「何时委派给谁」的依据（能力复用 / 上下文隔离 / 权限分离时才拆子代理）。
const SUBAGENTS = [
  { id: 'research-agent', name: 'researchAgent', desc: '检索资料并输出要点清单' },
  { id: 'writing-agent', name: 'writingAgent', desc: '按目标读者改写成文' },
] as const;

// supervisor 决策：结合父代理 instructions 与各子代理 description 选出委派路径（此处规则化示意）。
function resolveRoute(task: TaskType): string[] {
  if (task === 'research') return [SUBAGENTS[0].id];
  if (task === 'writing') return [SUBAGENTS[1].id];
  if (task === 'pipeline') return [SUBAGENTS[0].id, SUBAGENTS[1].id];
  return []; // 简单问答在父代理能力范围内，直接回答，不产生委派调用
}

// onDelegationStart 语义：proceed 放行；modifiedPrompt 改写提示词；proceed:false + rejectionReason 拒绝委派。
function runDelegation(agent: string, index: number, args: SubagentsArgs): Step {
  if (args.startHook === 'reject') return { agent, status: 'rejected' };
  return { agent, status: 'ok', ref: args.resultRefs ? `${agent}-${index + 1}` : undefined };
}

export function simulate(args: SubagentsArgs): ExampleSnapshot {
  const steps = resolveRoute(args.taskType).map((agent, i) => runDelegation(agent, i, args));
  const refs = steps.filter((s) => s.ref).map((s) => `[ref: ${s.ref}]`);
  const path = steps.length ? ['supervisor', ...steps.map((s) => s.agent)].join(' → ') : '直接回答（不委派）';
  const answer = steps.some((s) => s.status === 'rejected')
    ? '委派失败：父代理收到通用失败文案（resultText 兜底），循环不会自动停止'
    : !steps.length
      ? '父代理凭自身 instructions 直接作答，未产生委派调用'
      : refs.length > 1
        ? `writingAgent 携带 ${refs[0]} 作为 contextFromRefs 完成成稿`
        : `${steps[0].agent} 的文本结果回传给父代理汇总`;
  return { delegated: steps.length > 0, path, refs, answer };
}

export function createExample(canvas: HTMLCanvasElement, emit: (s: ExampleSnapshot) => void): ExampleInstance {
  const ctx = canvas.getContext('2d')!;
  let args: SubagentsArgs = { taskType: 'research', startHook: 'proceed', resultRefs: true };
  let startedAt = performance.now();
  const now = () => performance.now() - startedAt;

  function label(text: string, x: number, y: number, color: string, bold = false) {
    ctx.fillStyle = color;
    ctx.font = bold ? '600 13px sans-serif' : '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
  }

  function box(r: Rect, fill: string, stroke: string, dash = false) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    if (dash) ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function draw(elapsed: number) {
    const { width: w, height: h } = readCanvasSize(canvas);
    ctx.clearRect(0, 0, w, h);
    const steps = resolveRoute(args.taskType).map((agent, i) => runDelegation(agent, i, args));
    const sup: Rect = { x: w / 2 - 140, y: 24, w: 280, h: 62 };
    const nodes = SUBAGENTS.map((s, i): Rect & typeof s => ({ ...s, x: i ? w / 2 + 40 : w / 2 - 310, y: h - 100, w: 270, h: 74 }));
    for (const [i, step] of steps.entries()) {
      const t = nodes.find((n) => n.id === step.agent)!;
      const ax = sup.x + sup.w / 2, ay = sup.y + sup.h, bx = t.x + t.w / 2, by = t.y;
      ctx.strokeStyle = 'rgba(100,116,139,0.6)';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      const p = Math.min(1, Math.max(0, (elapsed - i * 1300) / 900));
      if (p > 0) {
        ctx.fillStyle = step.status === 'rejected' && p >= 1 ? '#dc2626' : '#2563eb';
        ctx.beginPath(); ctx.arc(ax + (bx - ax) * p, ay + (by - ay) * p, 5, 0, Math.PI * 2); ctx.fill();
      }
      if (p >= 1 && step.ref) label(`[ref: ${step.ref}]`, (ax + bx) / 2 + 52, (ay + by) / 2, '#1d4ed8');
      if (p >= 1 && args.startHook === 'rewrite') label('modifiedPrompt: 面向初学者', (ax + bx) / 2, (ay + by) / 2 - 12, '#92400e');
    }
    box(sup, '#eef2ff', '#4f46e5');
    label('supervisor（父代理）', sup.x + sup.w / 2, sup.y + 25, '#312e81', true);
    label('agents: researchAgent · writingAgent', sup.x + sup.w / 2, sup.y + 45, '#4b5563');
    if (!steps.length) {
      box({ x: w / 2 - 120, y: sup.y + sup.h + 26, w: 240, h: 40 }, '#f8fafc', '#94a3b8', true);
      label('直接回答（无委派调用）', w / 2, sup.y + sup.h + 51, '#475569');
    }
    for (const n of nodes) {
      const step = steps.find((s) => s.agent === n.id);
      const p = step ? Math.min(1, Math.max(0, (elapsed - steps.indexOf(step) * 1300) / 900)) : 0;
      const done = p >= 1;
      box(n, done ? '#f0fdf4' : '#f8fafc', done ? (step!.status === 'ok' ? '#16a34a' : '#dc2626') : '#cbd5e1');
      label(n.name, n.x + n.w / 2, n.y + 22, '#0f172a', true);
      label(n.desc, n.x + n.w / 2, n.y + 40, '#64748b');
      const status = !step ? '等待委派' : !done ? '执行中…' : step.status === 'rejected' ? '✗ 被拒绝' : step.ref ? `✓ 结果标记 ${step.ref}` : '✓ 文本结果已回传';
      label(status, n.x + n.w / 2, n.y + 60, !step ? '#94a3b8' : !done ? '#2563eb' : step.status === 'ok' ? '#16a34a' : '#dc2626');
    }
  }

  const loop = createRenderLoop(canvas, () => draw(now()));
  const observer = createResizeObserver(canvas, () => draw(now()));
  return {
    update(next: SubagentsArgs) {
      args = next;
      startedAt = performance.now();
      emit(simulate(args));
      draw(0);
    },
    dispose() {
      observer.disconnect();
      loop.dispose();
    },
  };
}
