import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/**
 * 审批决策流（离线示意，Canvas 2D 静态绘制）
 *
 * 演示内容：同一个「删除记录」工具在两种人工介入机制下的暂停点与恢复路径对比。
 * 输入：mechanism（预执行审批 / 工具内挂起）、decision（批准 / 拒绝）、reason（拒绝理由）。
 * 操作：用 Stories 控件切换机制与决策，画布高亮对应链路。
 * 预期结果：左下读数显示工具 execute 是否执行、模型收到工具结果还是拒绝理由；
 *   工具内挂起且未恢复时，显示 run 保持挂起、模型暂无结果。
 * 阅读主线：模型发起调用 → 拦截 / 挂起点 → 人工决策 → execute 结局 → 模型反馈。
 * 仅示意事件顺序与数据流向，不调用真实模型、网络或存储。
 */

export type Mechanism = 'approval' | 'suspend';
export type Decision = 'approve' | 'decline';

export interface HitlArgs {
  mechanism: Mechanism;
  decision: Decision;
  reason: string;
}

export interface HitlSnapshot {
  mechanismLabel: string;
  chunk: string;
  executeState: string;
  modelFeedback: string;
}

export interface HitlInstance {
  update(args: HitlArgs): void;
  dispose(): void;
}

const DESIGN_W = 880;
const DESIGN_H = 360;
const NODE_W = 192;
const NODE_H = 78;
const ROW_Y = 72;
const OUT_Y = 240;
const COL_X = [20, 236, 452, 668];

interface NodeStyle {
  fill: string;
  border: string;
  main: string;
  sub: string;
  dashed?: boolean;
}

interface NodeText {
  main: string;
  sub?: string;
}

const NEUTRAL: NodeStyle = {
  fill: '#ffffff',
  border: '#c3cdd9',
  main: '#42526b',
  sub: '#8494a8',
};

const GREEN: NodeStyle = {
  fill: '#e9f6ef',
  border: '#1e7f4f',
  main: '#14663f',
  sub: '#4a8a6a',
};

const RED: NodeStyle = {
  fill: '#fdeeea',
  border: '#c0453b',
  main: '#a03a31',
  sub: '#c4776f',
};

const AMBER: NodeStyle = {
  fill: '#fdf5e7',
  border: '#b0761a',
  main: '#8a5d12',
  sub: '#b08a45',
};

const AMBER_DASHED: NodeStyle = { ...AMBER, dashed: true };

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

function drawArrow(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string,
  dashed = false,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const [x1, y1] = points[points.length - 2];
  const [x2, y2] = points[points.length - 1];
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 9 * Math.cos(angle - Math.PI / 6), y2 - 9 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - 9 * Math.cos(angle + Math.PI / 6), y2 - 9 * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  style: NodeStyle,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, NODE_W, NODE_H, 10);
  ctx.fillStyle = style.fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = style.border;
  if (style.dashed) ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  x: number,
  style: NodeStyle,
  text: NodeText,
): void {
  drawBox(ctx, x, ROW_Y, style);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (text.sub) {
    ctx.fillStyle = style.main;
    ctx.font = '600 14px "PingFang SC", system-ui, sans-serif';
    ctx.fillText(fit(ctx, text.main, NODE_W - 16), x + NODE_W / 2, ROW_Y + NODE_H / 2 - 12);
    ctx.fillStyle = style.sub;
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(fit(ctx, text.sub, NODE_W - 12), x + NODE_W / 2, ROW_Y + NODE_H / 2 + 13);
  } else {
    ctx.fillStyle = style.main;
    ctx.font = '600 14px "PingFang SC", system-ui, sans-serif';
    ctx.fillText(fit(ctx, text.main, NODE_W - 16), x + NODE_W / 2, ROW_Y + NODE_H / 2);
  }
  ctx.restore();
}

function drawOutcome(
  ctx: CanvasRenderingContext2D,
  x: number,
  style: NodeStyle,
  label: string,
  value: string,
): void {
  drawBox(ctx, x, OUT_Y, style);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.sub;
  ctx.font = '600 11px "PingFang SC", system-ui, sans-serif';
  ctx.fillText(fit(ctx, label, NODE_W - 16), x + NODE_W / 2, OUT_Y + 20);
  ctx.fillStyle = style.main;
  ctx.font = '600 13.5px "PingFang SC", system-ui, sans-serif';
  ctx.fillText(fit(ctx, value, NODE_W - 14), x + NODE_W / 2, OUT_Y + 48);
  ctx.restore();
}

function snapshotOf(args: HitlArgs): HitlSnapshot {
  const approval = args.mechanism === 'approval';
  const approve = args.decision === 'approve';
  return {
    mechanismLabel: approval ? '预执行审批' : '工具内挂起',
    chunk: approval ? 'tool-call-approval' : 'tool-call-suspended',
    executeState: approval
      ? approve ? '已执行' : '未执行（跳过）'
      : approve ? '恢复后继续，已执行' : '未执行（保持挂起）',
    modelFeedback: approve
      ? '{"deleted": true}（工具结果）'
      : approval
        ? `拒绝理由：${args.reason}`
        : '（暂无结果，等待恢复）',
  };
}

export function createHitlExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HitlSnapshot) => void,
): HitlInstance {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let args: HitlArgs = {
    mechanism: 'approval',
    decision: 'approve',
    reason: '删除操作不在本次授权范围，请改为标记归档',
  };

  function draw(): void {
    const { width, height } = readCanvasSize(canvas);
    canvas.width = width;
    canvas.height = height;
    const scale = Math.min(width / DESIGN_W, height / DESIGN_H);
    const offsetX = (width - DESIGN_W * scale) / 2;
    const offsetY = (height - DESIGN_H * scale) / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f7f9fc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    const approval = args.mechanism === 'approval';
    const approve = args.decision === 'approve';
    const decisionColor = approve ? GREEN : RED;
    const tailColor = approval ? decisionColor : approve ? GREEN : AMBER;
    const dashedTail = !approval && !approve;

    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.font = '600 13px "PingFang SC", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(
      approval
        ? '机制：预执行审批 —— 闸门在 execute 之前'
        : '机制：工具内挂起 —— execute 运行中暂停',
      20,
      36,
    );
    ctx.restore();

    const midY = 196;
    const n4Bottom: Array<[number, number]> = [
      [COL_X[3] + NODE_W / 2, ROW_Y + NODE_H],
      [COL_X[3] + NODE_W / 2, midY],
      [COL_X[1] + NODE_W / 2, midY],
      [COL_X[1] + NODE_W / 2, OUT_Y],
    ];

    drawArrow(ctx, [[COL_X[0] + NODE_W, ROW_Y + NODE_H / 2], [COL_X[1], ROW_Y + NODE_H / 2]], NEUTRAL.border);
    drawArrow(
      ctx,
      [[COL_X[1] + NODE_W, ROW_Y + NODE_H / 2], [COL_X[2], ROW_Y + NODE_H / 2]],
      approval ? decisionColor.border : AMBER.border,
    );
    drawArrow(
      ctx,
      [[COL_X[2] + NODE_W, ROW_Y + NODE_H / 2], [COL_X[3], ROW_Y + NODE_H / 2]],
      tailColor.border,
      dashedTail,
    );
    drawArrow(ctx, n4Bottom, tailColor.border, dashedTail);
    drawArrow(
      ctx,
      [[COL_X[1] + NODE_W, OUT_Y + NODE_H / 2], [COL_X[2], OUT_Y + NODE_H / 2]],
      tailColor.border,
      dashedTail,
    );

    drawNode(ctx, COL_X[0], NEUTRAL, { main: '模型发起调用', sub: 'delete-record(rec_42)' });
    drawNode(
      ctx,
      COL_X[1],
      approval ? decisionColor : GREEN,
      approval
        ? { main: '审批闸门', sub: 'execute 之前拦截' }
        : { main: 'execute 已启动', sub: '缺少确认参数' },
    );
    drawNode(
      ctx,
      COL_X[2],
      approval ? decisionColor : !approve ? AMBER_DASHED : AMBER,
      approval
        ? { main: '等待人工审批', sub: 'tool-call-approval' }
        : { main: 'suspend() 挂起', sub: 'tool-call-suspended' },
    );
    drawNode(
      ctx,
      COL_X[3],
      tailColor,
      approval
        ? approve
          ? { main: 'approveToolCall', sub: 'runId' }
          : { main: 'declineToolCall', sub: `reason: ${args.reason}` }
        : approve
          ? { main: 'resumeStream', sub: '{confirmed: true}' }
          : { main: '未恢复', sub: 'run 保持挂起' },
    );

    drawOutcome(
      ctx,
      COL_X[1],
      tailColor,
      '工具 execute',
      approval
        ? approve ? '已执行' : '未执行（跳过）'
        : approve ? '恢复后继续，已执行' : '未执行（保持挂起）',
    );
    drawOutcome(
      ctx,
      COL_X[2],
      tailColor,
      approval && !approve ? '模型收到 · 拒绝理由' : '模型收到',
      approve ? '{"deleted": true}' : approval ? args.reason : '（暂无结果）',
    );
  }

  const observer = createResizeObserver(canvas, draw);
  draw();
  emit(snapshotOf(args));

  return {
    update(next: HitlArgs): void {
      args = next;
      draw();
      emit(snapshotOf(args));
    },
    dispose(): void {
      observer.disconnect();
    },
  };
}
