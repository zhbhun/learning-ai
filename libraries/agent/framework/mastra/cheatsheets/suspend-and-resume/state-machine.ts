import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/**
 * 挂起-恢复状态机（离线示意，Canvas 2D 绘制，不调用真实模型、不真正运行 Mastra）
 *
 * 演示内容：一次 run 的完整生命周期 —— running → suspend() 挂起 → run.resume() 恢复 →
 *   running → success；以及未配置持久化 storage 时快照不落盘、恢复失败的分支。
 * 输入：suspendStep（suspend() 调用所在步骤）、resumeData（恢复提交的审批结果）、storage（快照存储后端）。
 * 操作：切换任一控件，画布重放一次完整执行；挂起时刻展示 suspendPayload，恢复时刻展示 resumeData 注入。
 * 预期结果：approved=true 时 execute 重跑后条件满足，流程走到 success；approved=false 时条件仍不满足、
 *   再次 suspend()，run 停在 suspended；storage=未配置 时恢复尝试直接失败。
 * 阅读主线：右上状态角标 → 步骤链着色 → 挂起 / 恢复载荷 → 时间线芯片 → 底部关键判断。
 */

export type SuspendStepId = 'step-fetch' | 'step-approve' | 'step-notify';
export type ResumeChoice = 'approve' | 'reject';
export type StorageChoice = 'libsql' | 'none';

export interface SuspendResumeArgs {
  suspendStep: SuspendStepId;
  resumeData: ResumeChoice;
  storage: StorageChoice;
}

export interface SuspendResumeSnapshot {
  status: string;
  suspendedPath: string;
  resumeData: string;
  note: string;
}

export interface SuspendResumeInstance {
  update(args: SuspendResumeArgs): void;
  dispose(): void;
}

type WaveKind = 'run' | 'suspend' | 'resume' | 'fail';

interface Wave {
  ids: string[];
  kind: WaveKind;
  chip: string;
  payload?: string;
  payloadLabel?: string;
}

interface Sim {
  waves: Wave[];
  status: string;
  suspendedPath: string;
  resumeData: string;
  note: string;
}

// —— 状态机构建：每次输入变化重排波次；波次按时间顺序回放整条 run ——

const CHAIN: SuspendStepId[] = ['step-fetch', 'step-approve', 'step-notify'];
const SUSPEND_PAYLOAD = "suspend({ reason: '等待人工确认' })";

export function buildSim(args: SuspendResumeArgs): Sim {
  const index = CHAIN.indexOf(args.suspendStep);
  const approved = args.resumeData === 'approve';
  const waves: Wave[] = [{ ids: ['start'], kind: 'run', chip: 'run.start()' }];
  for (const id of CHAIN.slice(0, index)) {
    waves.push({ ids: [id], kind: 'run', chip: id });
  }
  waves.push({
    ids: [args.suspendStep],
    kind: 'suspend',
    chip: 'suspend()',
    payload: SUSPEND_PAYLOAD,
    payloadLabel: '挂起载荷 suspendPayload',
  });

  if (args.storage === 'none') {
    waves.push({
      ids: [],
      kind: 'fail',
      chip: 'run.resume(...)',
      payload: '快照未持久化：跨进程无法恢复这个 run',
      payloadLabel: '恢复失败',
    });
    return {
      waves,
      status: 'suspended',
      suspendedPath: `[ '${args.suspendStep}' ]`,
      resumeData: '未提交（恢复失败）',
      note: '未配置 storage：快照没有持久化，进程重启或换服务后都恢复不了挂起的 run。',
    };
  }

  waves.push({
    ids: [],
    kind: 'resume',
    chip: 'run.resume()',
    payload: `run.resume({ step: '${args.suspendStep}', resumeData: { approved: ${approved} } })`,
    payloadLabel: '恢复提交 resumeData',
  });
  waves.push({ ids: [args.suspendStep], kind: 'run', chip: `${args.suspendStep}（重跑）` });

  if (approved) {
    for (const id of CHAIN.slice(index + 1)) {
      waves.push({ ids: [id], kind: 'run', chip: id });
    }
    waves.push({ ids: ['done'], kind: 'run', chip: 'success' });
    return {
      waves,
      status: 'success',
      suspendedPath: '—（已恢复）',
      resumeData: '{ approved: true }',
      note: 'resumeData 通过 resumeSchema 合并进快照，execute 从头重跑、条件满足，流程继续。',
    };
  }

  waves.push({
    ids: [args.suspendStep],
    kind: 'suspend',
    chip: 'suspend()（再次）',
    payload: SUSPEND_PAYLOAD,
    payloadLabel: '再次挂起',
  });
  return {
    waves,
    status: 'suspended',
    suspendedPath: `[ '${args.suspendStep}' ]`,
    resumeData: '{ approved: false }',
    note: 'execute 重跑后条件仍不满足 → 再次 suspend()；run 停在 suspended，可以再次 resume。',
  };
}

// —— 绘制 ——

const DESIGN_W = 880;
const DESIGN_H = 430;
const AREA_X = 30;
const NODE_W = 148;
const NODE_H = 54;
const COL_STEP = 172;
const BASE_Y = 190;

const UI_FONT = '"PingFang SC", system-ui, sans-serif';
const MONO_FONT = 'ui-monospace, SFMono-Regular, Menlo, monospace';

type NodeState = 'pending' | 'active' | 'done' | 'suspended';

interface SimNode {
  id: string;
  sub: string;
  col: number;
}

function nodePos(node: SimNode): { x: number; y: number } {
  return { x: AREA_X + node.col * COL_STEP, y: BASE_Y - NODE_H / 2 };
}

function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let out = text;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - 7, y - 4);
  ctx.lineTo(x - 7, y + 4);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: SimNode,
  state: NodeState,
): void {
  const { x, y } = nodePos(node);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, NODE_W, NODE_H, 10);
  if (state === 'active') {
    ctx.fillStyle = '#e7f6ec';
    ctx.strokeStyle = '#2f9e5f';
  } else if (state === 'suspended') {
    ctx.fillStyle = '#fdf3e3';
    ctx.strokeStyle = '#d97706';
  } else if (state === 'done') {
    ctx.fillStyle = '#e9f0fa';
    ctx.strokeStyle = '#2f6bd8';
  } else {
    ctx.fillStyle = '#f3f5f8';
    ctx.strokeStyle = '#aeb9c6';
  }
  ctx.lineWidth = state === 'active' ? 2 : 1.5;
  if (state === 'pending') {
    ctx.setLineDash([5, 4]);
  }
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const dim = state === 'pending';
  ctx.fillStyle = dim ? '#93a1b3' : state === 'suspended' ? '#92400e' : '#1d4fa8';
  ctx.font = `700 11px ${MONO_FONT}`;
  ctx.fillText(fit(ctx, node.id, NODE_W - 12), x + NODE_W / 2, y + 20);
  ctx.fillStyle = dim ? '#9aa8ba' : '#5f718a';
  ctx.font = `9.5px ${UI_FONT}`;
  ctx.fillText(fit(ctx, node.sub, NODE_W - 10), x + NODE_W / 2, y + 39);
  if (state === 'suspended') {
    ctx.fillStyle = '#b45309';
    ctx.font = `600 9.5px ${UI_FONT}`;
    ctx.fillText('等待 resume', x + NODE_W / 2, y + NODE_H + 11);
  }
  ctx.restore();
}

function drawPayload(
  ctx: CanvasRenderingContext2D,
  wave: Wave,
  targetX: number,
): void {
  if (!wave.payload) {
    return;
  }
  const color = wave.kind === 'fail' ? '#b03030' : wave.kind === 'suspend' ? '#d97706' : '#2f6bd8';
  const boxW = Math.min(580, Math.max(320, ctx.measureText(wave.payload).width + 140));
  const boxX = (DESIGN_W - boxW) / 2;
  const boxY = 58;
  const boxH = 32;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 9);
  ctx.fillStyle = wave.kind === 'fail' ? '#fbeaea' : wave.kind === 'suspend' ? '#fdf3e3' : '#eef4fd';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5f718a';
  ctx.font = `600 9.5px ${UI_FONT}`;
  ctx.fillText(wave.payloadLabel ?? '', boxX + 12, boxY + boxH / 2);
  ctx.fillStyle = color;
  ctx.font = `600 10.5px ${MONO_FONT}`;
  ctx.fillText(
    fit(ctx, wave.payload, boxW - 130),
    boxX + 118,
    boxY + boxH / 2,
  );

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(DESIGN_W / 2, boxY + boxH);
  ctx.lineTo(DESIGN_W / 2, targetX === DESIGN_W / 2 ? BASE_Y - NODE_H / 2 - 6 : 128);
  ctx.stroke();
  ctx.setLineDash([]);
  arrowHead(ctx, DESIGN_W / 2 + 1, BASE_Y - NODE_H / 2 - 4, color);
  ctx.restore();
}

function drawTimeline(
  ctx: CanvasRenderingContext2D,
  sim: Sim,
  progress: number,
): void {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5f718a';
  ctx.font = `600 10.5px ${UI_FONT}`;
  ctx.fillText('状态时间线（从左到右回放，每个芯片是一个执行波次）', AREA_X, 292);
  let x = AREA_X;
  const y = 302;
  const h = 28;
  sim.waves.forEach((wave, k) => {
    const reached = progress >= k + 1;
    const activeNow = progress > k && !reached;
    ctx.font = `600 10px ${MONO_FONT}`;
    const w = Math.min(160, Math.max(52, ctx.measureText(wave.chip).width + 22));
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    const colorByKind =
      wave.kind === 'suspend'
        ? '#d97706'
        : wave.kind === 'fail'
          ? '#b03030'
          : wave.kind === 'resume'
            ? '#2f6bd8'
            : '#2f6bd8';
    if (activeNow) {
      ctx.fillStyle = '#e7f6ec';
      ctx.fill();
      ctx.strokeStyle = wave.kind === 'run' ? '#2f9e5f' : colorByKind;
      ctx.lineWidth = 1.8;
    } else if (reached) {
      ctx.fillStyle =
        wave.kind === 'suspend' ? '#fdf3e3' : wave.kind === 'fail' ? '#fbeaea' : '#e9f0fa';
      ctx.fill();
      ctx.strokeStyle = colorByKind;
      ctx.lineWidth = 1.4;
    } else {
      ctx.strokeStyle = '#c9d3de';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.2;
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = !reached && !activeNow ? '#93a1b3' : activeNow ? '#1d7a46' : colorByKind;
    ctx.textAlign = 'center';
    ctx.fillText(fit(ctx, wave.chip, w - 10), x + w / 2, y + h / 2);
    x += w;
    if (k < sim.waves.length - 1) {
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#8494a8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + h / 2);
      ctx.lineTo(x + 11, y + h / 2);
      ctx.stroke();
      arrowHead(ctx, x + 12, y + h / 2, '#8494a8');
      ctx.globalAlpha = 1;
      x += 15;
    }
    ctx.textAlign = 'left';
  });
  ctx.restore();
}

function drawRules(ctx: CanvasRenderingContext2D, sim: Sim): void {
  ctx.save();
  const y = 346;
  const h = 60;
  ctx.beginPath();
  ctx.roundRect(AREA_X, y, DESIGN_W - AREA_X * 2, h, 12);
  ctx.fillStyle = '#f2f5f9';
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `11.5px ${UI_FONT}`;
  ctx.fillStyle = '#42526b';
  ctx.fillText(fit(ctx, sim.note, DESIGN_W - AREA_X * 2 - 32), AREA_X + 16, y + 20);
  ctx.font = `10.5px ${UI_FONT}`;
  ctx.fillStyle = '#5f718a';
  ctx.fillText(
    fit(
      ctx,
      '绿色 = 正在执行 · 蓝色 = 已完成 · 琥珀 = 挂起 suspended · 灰虚线 = 未到达；挂起后流程停在原地，直到 resume 提交数据。',
      DESIGN_W - AREA_X * 2 - 32,
    ),
    AREA_X + 16,
    y + 42,
  );
  ctx.restore();
}

export function createSuspendResumeMachine(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SuspendResumeSnapshot) => void,
): SuspendResumeInstance {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const defaults: SuspendResumeArgs = {
    suspendStep: 'step-approve',
    resumeData: 'approve',
    storage: 'libsql',
  };
  let args = defaults;
  let sim = buildSim(args);
  let progress = 0;
  let lastKey = `${args.suspendStep}|${args.resumeData}|${args.storage}`;

  const nodes: SimNode[] = [
    { id: 'start', sub: 'run.start()', col: 0 },
    { id: 'step-fetch', sub: '取数 / 准备', col: 1 },
    { id: 'step-approve', sub: '确认后继续', col: 2 },
    { id: 'step-notify', sub: '通知 / 收尾', col: 3 },
    { id: 'done', sub: '全部步骤完成', col: 4 },
  ];

  function statusAt(): string {
    let status = 'running';
    for (let i = 0; i < sim.waves.length; i += 1) {
      if (progress <= i) {
        break;
      }
      const wave = sim.waves[i]!;
      if (wave.kind === 'suspend' || wave.kind === 'fail') {
        status = 'suspended';
      } else if (wave.kind === 'run') {
        status = wave.ids.includes('done') ? 'success' : 'running';
      }
    }
    return status;
  }

  function nodeState(id: string): NodeState {
    let state: NodeState = 'pending';
    for (let i = 0; i < sim.waves.length; i += 1) {
      if (progress <= i) {
        break;
      }
      const wave = sim.waves[i]!;
      if (wave.ids.includes(id)) {
        state = wave.kind === 'suspend' ? 'suspended' : progress < i + 1 ? 'active' : 'done';
      }
    }
    return state;
  }

  function draw(): void {
    const { width, height } = readCanvasSize(canvas);
    canvas.width = width;
    canvas.height = height;
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    const offsetX = (width - DESIGN_W * scale) / 2;
    const offsetY = (height - DESIGN_H * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f7f9fc';
    ctx.fillRect(0, 0, width, height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#42526b';
    ctx.font = `600 13.5px ${UI_FONT}`;
    ctx.fillText('挂起-恢复状态机 —— 切换挂起点、恢复数据与存储，观察 run 的完整生命周期', AREA_X, 30);
    ctx.restore();

    // 状态角标（右上角）
    const status = statusAt();
    const statusColor = status === 'success' ? '#2f9e5f' : status === 'suspended' ? '#d97706' : '#2f6bd8';
    ctx.save();
    ctx.font = `700 11px ${MONO_FONT}`;
    const badgeText = `status: ${status}`;
    const badgeW = ctx.measureText(badgeText).width + 24;
    ctx.beginPath();
    ctx.roundRect(DESIGN_W - AREA_X - badgeW, 18, badgeW, 24, 12);
    ctx.fillStyle = status === 'suspended' ? '#fdf3e3' : status === 'success' ? '#e7f6ec' : '#eef4fd';
    ctx.fill();
    ctx.strokeStyle = statusColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = statusColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, DESIGN_W - AREA_X - badgeW / 2, 30);
    ctx.restore();

    // 挂起 / 恢复载荷（当前波次携带时展示）
    const cw = Math.min(Math.floor(progress), sim.waves.length - 1);
    const wave = sim.waves[cw]!;
    if (wave.payload && (progress < sim.waves.length || cw === sim.waves.length - 1)) {
      const target = nodes.find((n) => n.id === args.suspendStep)!;
      drawPayload(ctx, wave, nodePos(target).x + NODE_W / 2);
    }

    for (const node of nodes) {
      drawNode(ctx, node, nodeState(node.id));
    }
    drawTimeline(ctx, sim, progress);
    drawRules(ctx, sim);
  }

  const loop = createRenderLoop(canvas, (delta: number) => {
    const total = sim.waves.length + 0.6;
    progress += (total - progress) * Math.min(1, delta * 5);
    if (total - progress < 0.02) {
      progress = total;
    }
    draw();
  });
  const observer = createResizeObserver(canvas, draw);
  emit({
    status: sim.status,
    suspendedPath: sim.suspendedPath,
    resumeData: sim.resumeData,
    note: sim.note,
  });
  draw();

  return {
    update(next: SuspendResumeArgs): void {
      const key = `${next.suspendStep}|${next.resumeData}|${next.storage}`;
      if (key !== lastKey) {
        lastKey = key;
        args = next;
        sim = buildSim(args);
        progress = 0; // 每次调整输入都重放一次完整执行
        emit({
          status: sim.status,
          suspendedPath: sim.suspendedPath,
          resumeData: sim.resumeData,
          note: sim.note,
        });
      }
      draw();
    },
    dispose(): void {
      loop.dispose();
      observer.disconnect();
    },
  };
}
