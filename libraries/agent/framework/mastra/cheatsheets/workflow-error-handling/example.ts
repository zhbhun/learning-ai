/*
演示：Mastra 工作流的失败重试轨迹（离线示意，不调用真实 LLM / 网络）。
输入：失败注入（无失败 / 瞬时失败 / 持久失败）、重试次数 retries、降级分支开关。
操作：动画播放 step1 → step2 → step3 轨迹；step2 失败后按重试次数逐次尝试，
      耗尽额度后转入 fallbackStep 降级分支，或以 failed 终止。
预期：瞬时失败 + 重试 ≥ 1 → 第 2 次尝试成功（重试只救瞬时故障）；
      持久失败 → 每次尝试都失败 → 降级分支得到 success（降级），
      未启用降级则整体 failed（对应触发 onError 回调）。
阅读主线：看轨迹与「尝试」徽标 → 对照左下角「最终状态 / step2 尝试 / 触发回调 / 走向」读数。
*/

import {
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type FailureMode = 'none' | 'transient' | 'permanent';

export interface ExampleArgs {
  failureMode: FailureMode;
  retries: number;
  fallbackOn: boolean;
}

export interface ExampleSnapshot {
  status: string;
  attempts: number;
  callbacks: string;
  route: string;
}

export interface ExampleInstance {
  update(args: ExampleArgs): void;
  dispose(): void;
}

// 时间轴动作时长（毫秒）。WAIT_MS 是 retryConfig.delay 的示意缩短版。
const MOVE_MS = 480;
const OK_MS = 720;
const FAIL_MS = 820;
const WAIT_MS = 620;
const END_MS = 1000;

const COLORS = {
  box: '#ffffff',
  border: '#94a3b8',
  text: '#0f172a',
  sub: '#64748b',
  accent: '#2563eb',
  fail: '#dc2626',
  chipOkBg: '#dcfce7',
  chipOkText: '#15803d',
  chipFailBg: '#fee2e2',
  chipFailText: '#b91c1c',
};

const FONT = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

type NodeKey = 'start' | 'step1' | 'step2' | 'step3' | 'fallback';

interface PlanEvent {
  kind: 'move' | 'branch' | 'attempt' | 'wait' | 'end';
  from?: NodeKey;
  to?: NodeKey;
  ok?: boolean;
  label: string;
  t0: number;
  t1: number;
}

interface Plan {
  events: PlanEvent[];
  total: number;
  banner: { tone: 'ok' | 'fail'; line1: string; line2?: string };
  snapshot: ExampleSnapshot;
}

// 按控件取值推演整条轨迹：重试救瞬时故障，降级兜底持久失败
function buildPlan(args: ExampleArgs): Plan {
  const events: PlanEvent[] = [];
  let t = 0;
  const push = (event: Omit<PlanEvent, 't0' | 't1'> & { duration: number }) => {
    events.push({ ...event, t0: t, t1: t + event.duration });
    t += event.duration;
  };

  const failing = args.failureMode !== 'none';
  const transient = args.failureMode === 'transient';

  push({ kind: 'move', from: 'start', to: 'step1', label: '', duration: MOVE_MS });
  push({ kind: 'attempt', to: 'step1', ok: true, label: '执行', duration: OK_MS });

  let recovered = true;
  let attempts = 1;
  if (failing) {
    push({ kind: 'move', from: 'step1', to: 'step2', label: '', duration: MOVE_MS });
    const okOnRetry = transient && args.retries >= 1;
    attempts = okOnRetry ? 2 : args.retries + 1;
    for (let i = 0; i < attempts; i += 1) {
      const ok = okOnRetry && i === attempts - 1;
      push({
        kind: 'attempt',
        to: 'step2',
        ok,
        label: `尝试 ${i + 1}`,
        duration: ok ? OK_MS : FAIL_MS,
      });
      if (!ok && i < attempts - 1) {
        push({ kind: 'wait', to: 'step2', label: '', duration: WAIT_MS });
      }
    }
    recovered = okOnRetry;
  }

  let status: string;
  let callbacks: string;
  let route: string;
  let banner: Plan['banner'];

  if (recovered) {
    push({ kind: 'move', from: 'step2', to: 'step3', label: '', duration: MOVE_MS });
    push({ kind: 'attempt', to: 'step3', ok: true, label: '执行', duration: OK_MS });
    status = 'success';
    callbacks = 'onFinish';
    route = failing ? 'step2 重试成功 → step3' : 'step1 → step2 → step3';
    banner = { tone: 'ok', line1: "result.status = 'success'" };
  } else if (args.fallbackOn) {
    push({ kind: 'branch', from: 'step2', to: 'fallback', label: '', duration: MOVE_MS });
    push({ kind: 'attempt', to: 'fallback', ok: true, label: '执行', duration: OK_MS });
    status = 'success（降级）';
    callbacks = 'onFinish';
    route = 'step2 重试耗尽 → fallbackStep（branch）';
    banner = {
      tone: 'ok',
      line1: "result.status = 'success'",
      line2: '经 fallbackStep 降级完成，未触发 onError',
    };
  } else {
    status = 'failed';
    callbacks = 'onFinish + onError';
    route = 'step2 重试耗尽，工作流终止';
    banner = {
      tone: 'fail',
      line1: "result.status = 'failed'",
      line2: `result.error: step2 失败（${transient ? '瞬时失败且未配置重试' : '重试已耗尽'}）`,
    };
  }

  push({ kind: 'end', label: '', duration: END_MS });

  return {
    events,
    total: t,
    banner,
    snapshot: { status, attempts, callbacks, route },
  };
}

function nodePos(key: NodeKey, w: number, h: number) {
  const rowY = h * 0.42;
  switch (key) {
    case 'start':
      return { x: w * 0.05, y: rowY };
    case 'step1':
      return { x: w * 0.21, y: rowY };
    case 'step2':
      return { x: w * 0.5, y: rowY };
    case 'step3':
      return { x: w * 0.79, y: rowY };
    case 'fallback':
      return { x: w * 0.5, y: h * 0.78 };
  }
}

function roundRectPath(
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

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  let size = { width: 0, height: 0 };
  let plan = buildPlan({ failureMode: 'none', retries: 2, fallbackOn: true });
  let elapsed = 0;

  function draw() {
    if (size.width === 0) {
      return;
    }
    const { width: w, height: h } = size;
    const boxW = Math.min(140, w * 0.2);
    const boxH = 52;
    const pos = (key: NodeKey) => nodePos(key, w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.textBaseline = 'alphabetic';

    const p1 = pos('step1');
    const p2 = pos('step2');
    const p3 = pos('step3');
    const pf = pos('fallback');

    const edgePoints = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      if (Math.abs(a.y - b.y) < 1) {
        return {
          from: { x: a.x + boxW / 2 + 6, y: a.y },
          to: { x: b.x - boxW / 2 - 6, y: b.y },
        };
      }
      const down = b.y > a.y;
      return {
        from: { x: a.x, y: a.y + (down ? boxH / 2 + 6 : -boxH / 2 - 6) },
        to: { x: b.x, y: b.y + (down ? -boxH / 2 - 6 : boxH / 2 + 6) },
      };
    };

    const drawArrow = (
      a: { x: number; y: number },
      b: { x: number; y: number },
      dashed: boolean,
    ) => {
      const pts = edgePoints(a, b);
      ctx.save();
      ctx.strokeStyle = COLORS.border;
      ctx.fillStyle = COLORS.border;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(dashed ? [6, 4] : []);
      ctx.beginPath();
      ctx.moveTo(pts.from.x, pts.from.y);
      ctx.lineTo(pts.to.x, pts.to.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const angle = Math.atan2(pts.to.y - pts.from.y, pts.to.x - pts.from.x);
      ctx.beginPath();
      ctx.moveTo(pts.to.x, pts.to.y);
      ctx.lineTo(pts.to.x - 8 * Math.cos(angle - 0.4), pts.to.y - 8 * Math.sin(angle - 0.4));
      ctx.lineTo(pts.to.x - 8 * Math.cos(angle + 0.4), pts.to.y - 8 * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return pts;
    };

    const drawBox = (
      key: NodeKey,
      title: string,
      sub?: string,
      opts: { dashed?: boolean; ring?: string } = {},
    ) => {
      const p = pos(key);
      ctx.save();
      roundRectPath(ctx, p.x - boxW / 2, p.y - boxH / 2, boxW, boxH, 10);
      ctx.fillStyle = COLORS.box;
      ctx.fill();
      ctx.setLineDash(opts.dashed ? [6, 4] : []);
      ctx.lineWidth = opts.ring ? 2.5 : 1.5;
      ctx.strokeStyle = opts.ring ?? COLORS.border;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLORS.text;
      ctx.font = `600 13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(title, p.x, sub ? p.y - 2 : p.y + 4);
      if (sub) {
        ctx.fillStyle = COLORS.sub;
        ctx.font = `11px ${FONT}`;
        ctx.fillText(sub, p.x, p.y + 14);
      }
      ctx.restore();
    };

    // 连线与分支标记
    drawArrow(p1, p2, false);
    drawArrow(p2, p3, false);
    drawArrow(p2, pf, true);
    ctx.fillStyle = COLORS.sub;
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('branch 降级分支', p2.x + 10, (p2.y + pf.y) / 2 + 4);

    const active = plan.events.find((e) => elapsed >= e.t0 && elapsed < e.t1);
    const ringFor = (key: NodeKey): string | undefined => {
      if (!active) {
        return undefined;
      }
      if (active.kind === 'attempt' && active.to === key) {
        return active.ok ? COLORS.chipOkText : COLORS.fail;
      }
      if (active.kind === 'wait' && active.to === key) {
        return COLORS.accent;
      }
      return undefined;
    };

    // 步骤框
    drawBox('step1', 'step1');
    drawBox('step2', 'step2', '易失败步骤', { ring: ringFor('step2') });
    drawBox('step3', 'step3');
    drawBox('fallback', 'fallbackStep', '降级路径', { dashed: true, ring: ringFor('fallback') });

    // 已完成的尝试徽标，在 step2 上方逐个累积
    const chips = plan.events.filter(
      (e) =>
        e.kind === 'attempt' && e.to === 'step2' && elapsed >= e.t1,
    );
    if (chips.length > 0) {
      ctx.font = `11px ${FONT}`;
      const gap = 8;
      const widths = chips.map(
        (c) => ctx.measureText(`${c.label} ${c.ok ? '✓' : '✗'}`).width + 16,
      );
      const totalW =
        widths.reduce((sum, width) => sum + width, 0) + gap * (chips.length - 1);
      let cx = p2.x - totalW / 2;
      const cy = p2.y - boxH / 2 - 30;
      chips.forEach((chip, index) => {
        const text = `${chip.label} ${chip.ok ? '✓' : '✗'}`;
        roundRectPath(ctx, cx, cy, widths[index], 22, 11);
        ctx.fillStyle = chip.ok ? COLORS.chipOkBg : COLORS.chipFailBg;
        ctx.fill();
        ctx.fillStyle = chip.ok ? COLORS.chipOkText : COLORS.chipFailText;
        ctx.textAlign = 'center';
        ctx.fillText(text, cx + widths[index] / 2, cy + 15);
        cx += widths[index] + gap;
      });
    }

    // 重试等待提示（对应 retryConfig.delay）
    if (active?.kind === 'wait') {
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(elapsed / 120);
      ctx.fillStyle = COLORS.accent;
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('等待 delay，即将重试…', p2.x, p2.y - boxH / 2 - 52);
      ctx.restore();
    }

    // 执行中的小圆点
    if (active && (active.kind === 'move' || active.kind === 'branch')) {
      const pts = edgePoints(pos(active.from!), pos(active.to!));
      const k = (elapsed - active.t0) / (active.t1 - active.t0);
      ctx.beginPath();
      ctx.arc(
        pts.from.x + (pts.to.x - pts.from.x) * k,
        pts.from.y + (pts.to.y - pts.from.y) * k,
        6,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = COLORS.accent;
      ctx.fill();
    }

    // 结束横幅：对应 result.status 与 result.error
    const endEvent = plan.events[plan.events.length - 1];
    if (elapsed >= endEvent.t0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = plan.banner.tone === 'ok' ? COLORS.chipOkText : COLORS.fail;
      ctx.font = `600 14px ${FONT}`;
      ctx.fillText(plan.banner.line1, w / 2, 26);
      if (plan.banner.line2) {
        ctx.fillStyle = plan.banner.tone === 'ok' ? COLORS.sub : COLORS.fail;
        ctx.font = `12px ${FONT}`;
        ctx.fillText(plan.banner.line2, w / 2, 46);
      }
    }
  }

  function resize() {
    const next = readCanvasSize(canvas);
    if (next.width === size.width && next.height === size.height) {
      return;
    }
    const dpr = globalThis.devicePixelRatio || 1;
    size = next;
    canvas.width = Math.floor(next.width * dpr);
    canvas.height = Math.floor(next.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  const resizeObserver = createResizeObserver(canvas, resize);
  const renderLoop = createRenderLoop(canvas, (delta: number) => {
    if (elapsed < plan.total) {
      elapsed = Math.min(elapsed + delta * 1000, plan.total);
      draw();
    }
  });

  return {
    update(args: ExampleArgs) {
      plan = buildPlan(args);
      elapsed = 0;
      emit(plan.snapshot);
      renderLoop.renderOnce();
    },
    dispose() {
      resizeObserver.disconnect();
      renderLoop.dispose();
    },
  };
}
