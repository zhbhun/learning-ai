/*
演示内容：Mastra 工作流「人工介入」的审批往返——人工步骤用 suspend 挂起等待决策，
外部用 resume 提交 resumeData；批准则走完后续步骤，拒绝则 bail 以 success 提前结束并跳过后续步骤。
输入：decision（人工决策：pending 未提交 / approved 批准 / rejected 拒绝）、flow（审批链：单级 / 两级）。
操作：用 Controls 切换两个控件，每次切换重演一次完整审批往返。
预期结果：pending 停在 suspended 状态并展示 suspendPayload 里的审批原因；批准走完全部步骤（两级审批时人工轮数为 2）；
拒绝时 bail 触发——最终状态仍是 success，但 bail 之后的步骤标记为跳过。
阅读主线：先看 runOnce 如何按 Mastra 语义推进（suspend 挂起 / resume 提交 / bail 提前收尾三种分支），
再看 drawSnapshot 如何把步骤轨迹画成流程图与恢复箭头。
*/

import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export type Decision = 'pending' | 'approved' | 'rejected';
export type FlowKind = 'single' | 'double';

export interface ExampleArgs {
  decision: Decision;
  flow: FlowKind;
}

export type StepState = 'done' | 'suspended' | 'bailed' | 'skipped' | 'idle';

export interface StepView {
  id: string;
  label: string;
  kind: 'auto' | 'human';
  state: StepState;
  reason?: string;
}

export interface ExampleSnapshot {
  status: 'suspended' | 'success';
  steps: StepView[];
  trace: string;
  suspendReason: string | null;
  bailReason: string | null;
  rounds: number;
}

interface PlanStep {
  id: string;
  label: string;
  kind: 'auto' | 'human';
  reason?: string;
}

// 工作流编排：风控检查 → 人工审批（1~2 级）→ 执行发放。
// 真实代码中用 createWorkflow({...}).then(step).then(step).commit() 组装。
export function planSteps(flow: FlowKind): PlanStep[] {
  const steps: PlanStep[] = [{ id: 'risk-check', label: '风控检查', kind: 'auto' }];
  steps.push({
    id: 'approval-1',
    label: '一级审批',
    kind: 'human',
    reason: '人工确认是否放行该笔发放。',
  });
  if (flow === 'double') {
    steps.push({
      id: 'approval-2',
      label: '二级审批',
      kind: 'human',
      reason: '大额交易需二次人工复核。',
    });
  }
  steps.push({ id: 'payout', label: '执行发放', kind: 'auto' });
  return steps;
}

const STATE_TEXT: Record<StepState, string> = {
  done: '完成',
  suspended: '挂起中',
  bailed: 'bail 收尾',
  skipped: '跳过',
  idle: '未执行',
};

// 按 Mastra 语义推进一次「审批往返」：suspend → resume → bail/走完。
// 真实代码里这一段发生在步骤 execute 内：resumeData 为空则 suspend，
// approved === false 则 return bail({ reason })，approved 为 true 则放行。
export function runOnce(args: ExampleArgs): ExampleSnapshot {
  const steps = planSteps(args.flow);
  const view: StepView[] = [];
  let status: ExampleSnapshot['status'] = 'success';
  let suspendReason: string | null = null;
  let bailReason: string | null = null;
  let rounds = 0;

  for (const step of steps) {
    if (bailReason) {
      // bail 之后的所有逻辑被跳过，但运行状态仍是 success。
      view.push({ ...step, state: 'skipped' });
      continue;
    }
    if (suspendReason) {
      // 运行停在挂起点，后面的步骤还没开始执行。
      view.push({ ...step, state: 'idle' });
      continue;
    }
    if (step.kind === 'auto') {
      view.push({ ...step, state: 'done' });
      continue;
    }
    if (args.decision === 'pending') {
      // 首次执行时 resumeData 为 undefined → await suspend({ reason }) 挂起等待人工。
      suspendReason = step.reason ?? '等待人工输入。';
      status = 'suspended';
      view.push({ ...step, state: 'suspended', reason: suspendReason });
      continue;
    }
    // 人工已提交决策：对应 run.resume({ step, resumeData: { approved } })。
    rounds += 1;
    if (args.decision === 'rejected') {
      // 人工拒绝 → return bail({ reason })：以 success 结束，跳过后续逻辑。
      bailReason = 'User rejected the request.';
      view.push({ ...step, state: 'bailed' });
      continue;
    }
    view.push({ ...step, state: 'done' });
  }

  const trace = view.map((s) => `${s.label}·${STATE_TEXT[s.state]}`).join(' → ');
  return { status, steps: view, trace, suspendReason, bailReason, rounds };
}

const COLORS = {
  bg: '#fbfcfe',
  ink: '#24313f',
  muted: '#6b7280',
  done: { fill: '#e6f6ee', stroke: '#34a46f', text: '#1c6b45' },
  suspended: { fill: '#fff3d1', stroke: '#dd9e0b', text: '#8a5d05' },
  bailed: { fill: '#ffe4de', stroke: '#e2593b', text: '#96331c' },
  skipped: { fill: '#eef0f3', stroke: '#a6adba', text: '#6b7280' },
  idle: { fill: '#fafbfc', stroke: '#c6ccd6', text: '#8a93a1' },
} as const;

function pathBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function arrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: 1 | -1,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 8 * dir, y - 4);
  ctx.lineTo(x - 8 * dir, y + 4);
  ctx.closePath();
  ctx.fill();
}

function drawSnapshot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  snapshot: ExampleSnapshot,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'middle';

  const steps = snapshot.steps;
  const pad = 24;
  const gap = 38;
  const boxW = Math.min(148, (width - pad * 2 - gap * (steps.length - 1)) / steps.length);
  const boxH = 56;
  const laneY = Math.min(96, height * 0.3);
  const humanLaneY = height - 74;
  const cx = (i: number) => pad + boxW / 2 + i * (boxW + gap);

  // 顶部状态徽标：bail 的 success 与走完的 success 同状态，区别在后续步骤。
  const statusColor =
    snapshot.status === 'suspended'
      ? COLORS.suspended
      : snapshot.bailReason
        ? COLORS.bailed
        : COLORS.done;
  const statusText =
    snapshot.status === 'suspended'
      ? 'suspended · 挂起等待人工'
      : snapshot.bailReason
        ? 'success · bail 提前收尾'
        : 'success · 走完全部步骤';
  ctx.font = '12px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
  pathBox(ctx, pad, 18, ctx.measureText(statusText).width + 22, 24, 12);
  ctx.fillStyle = statusColor.fill;
  ctx.fill();
  ctx.strokeStyle = statusColor.stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = statusColor.text;
  ctx.textAlign = 'left';
  ctx.fillText(statusText, pad + 11, 30);

  // 步骤框 + 角标。
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const c = COLORS[step.state];
    const x = pad + i * (boxW + gap);

    ctx.font = '10px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = step.kind === 'human' ? COLORS.suspended.stroke : COLORS.muted;
    ctx.textAlign = 'center';
    ctx.fillText(step.kind === 'human' ? '人工' : '自动', cx(i), laneY - 24);

    pathBox(ctx, x, laneY, boxW, boxH, 10);
    ctx.fillStyle = c.fill;
    ctx.fill();
    ctx.strokeStyle = c.stroke;
    ctx.lineWidth = 1.4;
    if (step.state === 'skipped' || step.state === 'idle') {
      ctx.setLineDash([5, 4]);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = c.text;
    ctx.font = 'bold 13px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    ctx.fillText(step.label, cx(i), laneY + 23);
    ctx.font = '11px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(STATE_TEXT[step.state], cx(i), laneY + 42);
  }

  // 步骤间箭头：bail 处断流标红，未执行的连线画虚线。
  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i];
    const to = steps[i + 1];
    const x1 = pad + i * (boxW + gap) + boxW + 3;
    const x2 = pad + (i + 1) * (boxW + gap) - 4;
    const midY = laneY + boxH / 2;
    const dead = to.state === 'skipped' || to.state === 'idle';
    const color = from.state === 'bailed' ? COLORS.bailed.stroke : dead ? '#b6bec9' : COLORS.done.stroke;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.setLineDash(dead || from.state === 'suspended' ? [5, 4] : []);
    ctx.beginPath();
    ctx.moveTo(x1, midY);
    ctx.lineTo(x2, midY);
    ctx.stroke();
    ctx.restore();
    arrowHead(ctx, x2, midY, 1, color);

    if (from.state === 'bailed') {
      ctx.fillStyle = COLORS.bailed.stroke;
      ctx.font = '11px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('bail({ reason })', (x1 + x2) / 2, midY - 14);
    }
  }

  // 挂起原因：来自 suspend() 载荷，对应 result.steps[id].suspendPayload.reason。
  const suspended = steps.find((s) => s.state === 'suspended');
  if (suspended && suspended.reason) {
    const i = steps.indexOf(suspended);
    ctx.fillStyle = COLORS.suspended.text;
    ctx.font = '11px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`suspendPayload.reason：${suspended.reason}`, cx(i), laneY + boxH + 22);
  }

  // 人工决策泳道：虚线向上指向人工步骤，标出每次 resume 提交的 resumeData。
  pathBox(ctx, pad, humanLaneY, width - pad * 2, 42, 10);
  ctx.fillStyle = '#f1f4f8';
  ctx.fill();
  ctx.strokeStyle = '#c6ccd6';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.muted;
  ctx.font = '11px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('人工 / 外部系统', pad + 14, humanLaneY + 21);

  let round = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step.kind !== 'human') {
      continue;
    }
    const waiting = step.state === 'suspended';
    const resumed = step.state === 'done' || step.state === 'bailed';
    if (!waiting && !resumed) {
      continue;
    }
    if (resumed) {
      round += 1;
    }
    {
      const label = waiting
        ? '等待 run.resume(...) 提交决策'
        : `resume #${round} · approved=${step.state === 'bailed' ? 'false' : 'true'}`;
      const x = cx(i);
      ctx.save();
      ctx.strokeStyle = waiting ? COLORS.suspended.stroke : COLORS.done.stroke;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, humanLaneY);
      ctx.lineTo(x, laneY + boxH + 4);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = waiting ? COLORS.suspended.text : COLORS.done.text;
      ctx.textAlign = 'center';
      ctx.font = '11px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
      ctx.fillText(label, x, humanLaneY - 12);
    }
  }
}

function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = globalThis.devicePixelRatio || 1;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export interface ExampleInstance {
  update(args: ExampleArgs): void;
  dispose(): void;
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  let lastArgs: ExampleArgs = { decision: 'pending', flow: 'single' };
  let snapshot = runOnce(lastArgs);

  const render = () => {
    const { width, height } = readCanvasSize(canvas);
    const ctx = prepareCanvas(canvas, width, height);
    snapshot = runOnce(lastArgs);
    drawSnapshot(ctx, width, height, snapshot);
    emit(snapshot);
  };

  const observer = createResizeObserver(canvas, render);
  render();

  return {
    update(args: ExampleArgs) {
      lastArgs = args;
      render();
    },
    dispose() {
      observer.disconnect();
    },
  };
}
