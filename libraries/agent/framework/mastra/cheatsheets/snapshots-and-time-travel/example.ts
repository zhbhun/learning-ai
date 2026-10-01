// 演示：工作流快照与时间旅行（run.timeTravel）。
// 输入：timeTravel 目标步骤、是否修正该步 inputData、前序结果的 context 来源（快照 / 自定义）。
// 操作：调整控件后，画布重放一次「加载快照 → 重建前序结果 → 从目标步骤重跑」的动画。
// 预期结果：原轨迹在 step-api 因外部 API 临时故障而 failed；修正输入并复用快照时，
//           新轨迹从目标步骤重跑后 success；沿用原输入则 step-api 再次失败；
//           选择自定义 context 时，前序结果改由 context 对象重建，不读存储。
// 阅读主线：底部 workflow_snapshots 表 → 原轨迹（上排）→ timeTravel 参数徽标 → 新轨迹（下排）分叉重跑。

import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TimeTravelArgs {
  travelStep: 'step-fetch' | 'step-approve' | 'step-api';
  inputDataMode: 'original' | 'corrected';
  contextSource: 'snapshot' | 'custom';
}

export interface TimeTravelSnapshot {
  targetStep: string;
  inputData: string;
  contextSource: string;
  replayStatus: string;
  note: string;
}

export interface TimeTravelInstance {
  update(args: TimeTravelArgs): void;
  dispose(): void;
}

interface Step {
  id: string;
  sub: string;
}

const STEPS: Step[] = [
  { id: 'step-fetch', sub: '拉取数据' },
  { id: 'step-approve', sub: '审批' },
  { id: 'step-api', sub: '调用外部 API' },
  { id: 'step-notify', sub: '通知' },
];

const DESIGN_W = 780;
const DESIGN_H = 336;
const NODE_W = 132;
const NODE_H = 46;
const LANE_A_Y = 66;
const LANE_B_Y = 188;
const NODE_X0 = 152;
const NODE_STRIDE = 158;
const UI_FONT = 'system-ui, "PingFang SC", sans-serif';
const MONO_FONT = 'ui-monospace, "SF Mono", monospace';

const PHASE_LOAD = 1; // 阶段 1：从 workflow_snapshots 加载快照
const PHASE_REBUILD = 2; // 阶段 2：重建目标步骤之前的结果
const REPLAY_SLOT = 0.45; // 阶段 3：从目标步骤起每步占用的相位
const PHASE_TOTAL = PHASE_REBUILD + REPLAY_SLOT * STEPS.length + 0.4;

type LaneBState = 'pending' | 'rebuilt' | 'active' | 'done' | 'failed';

function buildNote(args: TimeTravelArgs, targetIdx: number): string {
  if (args.inputDataMode === 'corrected') {
    return args.contextSource === 'snapshot'
      ? '快照重建前序结果，修正输入后重跑成功'
      : '自定义 context 重建前序结果，修正输入后重跑成功';
  }
  return targetIdx <= STEPS.findIndex((s) => s.id === 'step-api')
    ? '沿用原输入重跑，step-api 再次失败'
    : '沿用原输入重跑';
}

export function createTimeTravelScene(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TimeTravelSnapshot) => void,
): TimeTravelInstance {
  const ctx = canvas.getContext('2d')!;
  let args: TimeTravelArgs = {
    travelStep: 'step-api',
    inputDataMode: 'corrected',
    contextSource: 'snapshot',
  };
  let lastKey = '';
  let progress = 0;

  const targetIdx = () => STEPS.findIndex((s) => s.id === args.travelStep);
  const corrected = () => args.inputDataMode === 'corrected';

  function snapshot(): TimeTravelSnapshot {
    const idx = targetIdx();
    return {
      targetStep: args.travelStep,
      inputData: corrected() ? '{ value: 5 }（修正）' : '{ value: 1 }（原输入）',
      contextSource: args.contextSource === 'snapshot' ? 'workflow_snapshots 快照' : '自定义 context 对象',
      replayStatus: corrected() ? 'success' : 'failed',
      note: buildNote(args, idx),
    };
  }

  function rebuiltCount(p: number): number {
    const idx = targetIdx();
    if (p < PHASE_LOAD || idx === 0) return 0;
    return Math.min(idx, Math.floor((p - PHASE_LOAD) * (idx + 0.4)));
  }

  function laneBState(i: number, p: number): LaneBState {
    const idx = targetIdx();
    if (i < idx) {
      return i < rebuiltCount(p) ? 'rebuilt' : 'pending';
    }
    const local = (p - PHASE_REBUILD) / REPLAY_SLOT - (i - idx);
    if (local < 0) return 'pending';
    if (local < 1) return 'active';
    if (!corrected() && STEPS[i]!.id === 'step-api') return 'failed';
    return 'done';
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function drawNode(
    x: number,
    y: number,
    step: Step,
    style: { fill: string; stroke: string; text?: string; dash?: number[]; tag?: string },
  ): void {
    ctx.save();
    ctx.setLineDash(style.dash ?? []);
    roundRect(x, y, NODE_W, NODE_H, 10);
    ctx.fillStyle = style.fill;
    ctx.fill();
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#1f2d3d';
    ctx.font = `600 12.5px ${MONO_FONT}`;
    ctx.fillText(step.id, x + 12, y + 19);
    ctx.fillStyle = '#5b6b7f';
    ctx.font = `11.5px ${UI_FONT}`;
    ctx.fillText(step.sub, x + 12, y + 35);
    if (style.tag) {
      ctx.fillStyle = style.stroke;
      ctx.font = `600 10px ${UI_FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(style.tag, x + NODE_W - 8, y + 15);
    }
    ctx.restore();
  }

  function drawLaneA(): void {
    ctx.save();
    ctx.fillStyle = '#7a8798';
    ctx.font = `600 12px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('原轨迹', 20, LANE_A_Y + NODE_H / 2 - 4);
    ctx.font = `10.5px ${UI_FONT}`;
    ctx.fillText('run.start() 后外部 API 临时故障', 20, LANE_A_Y + NODE_H / 2 + 12);
    ctx.restore();
    STEPS.forEach((step, i) => {
      const x = NODE_X0 + i * NODE_STRIDE;
      const failed = step.id === 'step-api';
      drawNode(x, LANE_A_Y, step, {
        fill: failed ? '#fbeceb' : '#eef1f5',
        stroke: failed ? '#d64545' : '#b8c2ce',
        text: failed ? '#d64545' : '#5b6b7f',
        tag: failed ? 'failed' : 'done',
      });
    });
  }

  function drawBadge(p: number): void {
    const lines = [
      'run.timeTravel({',
      `  step: '${args.travelStep}', inputData: ${corrected() ? '{ value: 5 }' : '{ value: 1 }'},`,
      `  context: '${args.contextSource === 'snapshot' ? '来自存储快照' : '自定义对象'}',`,
      '  resumeData / initialState 可选,',
      '})',
    ];
    ctx.save();
    ctx.font = `11px ${MONO_FONT}`;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
    const x = DESIGN_W - 20 - w;
    const loadGlow = p < PHASE_LOAD;
    roundRect(x, 14, w, 16 + lines.length * 14, 8);
    ctx.fillStyle = loadGlow ? '#fdf6e3' : '#f3f6fa';
    ctx.fill();
    ctx.strokeStyle = '#c9d4e0';
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    lines.forEach((line, i) => {
      ctx.fillStyle = i === 0 || i === lines.length - 1 ? '#2f6bd8' : '#42526b';
      ctx.fillText(line, x + 10, 30 + i * 14);
    });
    ctx.restore();
  }

  function drawForkArrow(p: number): void {
    if (p < PHASE_REBUILD) return;
    const idx = targetIdx();
    const x = NODE_X0 + idx * NODE_STRIDE + NODE_W / 2;
    ctx.save();
    ctx.strokeStyle = '#2f9e5f';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, LANE_A_Y + NODE_H + 4);
    ctx.bezierCurveTo(x + 26, LANE_B_Y - 34, x - 26, LANE_B_Y - 26, x, LANE_B_Y - 6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#2f9e5f';
    ctx.beginPath();
    ctx.moveTo(x, LANE_B_Y - 2);
    ctx.lineTo(x - 4, LANE_B_Y - 10);
    ctx.lineTo(x + 4, LANE_B_Y - 10);
    ctx.closePath();
    ctx.fill();
    ctx.font = `10.5px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('timeTravel 从该步骤重跑', x + 10, LANE_A_Y + (LANE_B_Y - LANE_A_Y) / 2 + NODE_H / 2);
    ctx.restore();
  }

  function drawStorageCard(p: number): void {
    const used = args.contextSource === 'snapshot';
    const glow = used && p < PHASE_LOAD;
    ctx.save();
    roundRect(20, 262, 336, 60, 8);
    ctx.fillStyle = glow ? '#fdf6e3' : used ? '#f3f6fa' : '#f1f2f4';
    ctx.fill();
    ctx.strokeStyle = glow ? '#d9a514' : '#c9d4e0';
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#1f2d3d';
    ctx.font = `600 12px ${MONO_FONT}`;
    ctx.fillText('workflow_snapshots 表（默认 libSQL）', 32, 280);
    ctx.font = `10.5px ${MONO_FONT}`;
    ctx.fillStyle = '#5b6b7f';
    ctx.fillText('runId: 34904c14… · status: failed', 32, 296);
    ctx.fillText('context / activePaths / suspendedPaths / …', 32, 311);
    if (!used) {
      ctx.fillStyle = '#98a2b0';
      ctx.font = `10.5px ${UI_FONT}`;
      ctx.fillText('本次未读取：改用自定义 context', 200, 280);
    }
    ctx.restore();
  }

  function drawContextCard(p: number): void {
    const custom = args.contextSource === 'custom';
    const glow = custom && p >= PHASE_LOAD && p < PHASE_REBUILD;
    ctx.save();
    roundRect(372, 262, 388, 60, 8);
    ctx.fillStyle = glow ? '#fdf6e3' : custom ? '#f3f6fa' : '#f1f2f4';
    ctx.fill();
    ctx.strokeStyle = glow ? '#d9a514' : '#c9d4e0';
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#1f2d3d';
    ctx.font = `600 12px ${MONO_FONT}`;
    ctx.fillText(custom ? "context: { 'step-fetch': {…}, 'step-approve': {…} }" : '自定义 context（本次未提供）', 384, 280);
    ctx.font = `10.5px ${MONO_FONT}`;
    ctx.fillStyle = '#5b6b7f';
    if (custom) {
      ctx.fillText('每步含 status / payload / output /', 384, 296);
      ctx.fillText('startedAt / endedAt / suspendPayload …', 384, 311);
    } else {
      ctx.fillText('前序结果按步骤 ID 从快照重建，', 384, 296);
      ctx.fillText('快照不可用时才需要自定义 context。', 384, 311);
    }
    ctx.restore();
  }

  function draw(): void {
    const { width, height } = readCanvasSize(canvas);
    canvas.width = width;
    canvas.height = height;
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f7f9fc';
    ctx.fillRect(0, 0, width, height);
    ctx.setTransform(scale, 0, 0, scale, ((width - DESIGN_W * scale) / 2), (height - DESIGN_H * scale) / 2);

    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#42526b';
    ctx.font = `600 13.5px ${UI_FONT}`;
    ctx.fillText('时间旅行重放 —— 选择目标步骤与输入，观察新轨迹如何分叉重跑', 20, 24);
    ctx.restore();

    drawBadge(progress);
    drawLaneA();

    // 下排新轨迹：重建（虚线绿框）→ 重跑（目标步骤起逐个点亮）
    ctx.save();
    ctx.fillStyle = '#7a8798';
    ctx.font = `600 12px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('新轨迹', 20, LANE_B_Y + NODE_H / 2 - 4);
    ctx.font = `10.5px ${UI_FONT}`;
    ctx.fillText('timeTravel 重跑', 20, LANE_B_Y + NODE_H / 2 + 12);
    ctx.restore();
    STEPS.forEach((step, i) => {
      const x = NODE_X0 + i * NODE_STRIDE;
      const state = laneBState(i, progress);
      const activeAlpha = state === 'active' ? 0.45 : 0;
      const styles: Record<LaneBState, { fill: string; stroke: string; dash?: number[]; tag?: string }> = {
        pending: { fill: '#eef1f5', stroke: '#b8c2ce' },
        rebuilt: { fill: '#e9f5ee', stroke: '#2f9e5f', dash: [5, 3], tag: '重建' },
        active: { fill: '#e7f0fd', stroke: '#2f6bd8' },
        done: { fill: '#e7f6ec', stroke: '#2f9e5f', tag: 'done' },
        failed: { fill: '#fbeceb', stroke: '#d64545', tag: 'failed' },
      };
      const s = styles[state]!;
      drawNode(x, LANE_B_Y, step, { ...s, fill: activeAlpha ? '#dbe9fb' : s.fill });
      if (state === 'active') {
        ctx.save();
        ctx.globalAlpha = activeAlpha;
        roundRect(x, LANE_B_Y, NODE_W, NODE_H, 10);
        ctx.fillStyle = '#9cc0f2';
        ctx.fill();
        ctx.restore();
      }
    });

    drawForkArrow(progress);
    drawStorageCard(progress);
    drawContextCard(progress);

    // 结果角标
    const status = corrected() ? 'success' : 'failed';
    ctx.save();
    ctx.font = `700 11px ${MONO_FONT}`;
    const label = `timeTravel 结果: ${status}`;
    const w = ctx.measureText(label).width + 22;
    roundRect(DESIGN_W - 20 - w, DESIGN_H - 26, w, 22, 11);
    ctx.fillStyle = corrected() ? '#e7f6ec' : '#fbeceb';
    ctx.fill();
    ctx.strokeStyle = corrected() ? '#2f9e5f' : '#d64545';
    ctx.stroke();
    ctx.fillStyle = corrected() ? '#2f9e5f' : '#d64545';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, DESIGN_W - 20 - w / 2, DESIGN_H - 15);
    ctx.restore();
  }

  const loop = createRenderLoop(canvas, (delta: number) => {
    progress += (PHASE_TOTAL - progress) * Math.min(1, delta * 4.5);
    if (PHASE_TOTAL - progress < 0.02) progress = PHASE_TOTAL;
    draw();
  });
  const observer = createResizeObserver(canvas, draw);
  emit(snapshot());
  draw();

  return {
    update(next: TimeTravelArgs): void {
      const key = `${next.travelStep}|${next.inputDataMode}|${next.contextSource}`;
      if (key === lastKey) return;
      lastKey = key;
      args = next;
      progress = 0; // 每次调整输入都重放一次时间旅行
      emit(snapshot());
      draw();
    },
    dispose(): void {
      loop.dispose();
      observer.disconnect();
    },
  };
}
