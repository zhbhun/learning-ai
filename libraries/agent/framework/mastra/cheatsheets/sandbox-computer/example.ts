// 演示：桌面沙箱的「观察-行动循环」（离线示意，不调用真实沙箱或 LLM）。
// 输入：循环步进 step（0~4）、screenshotAfterAction、requireApproval 三个控件。
// 操作：拖动「循环步进」，agent 依次执行 截图→点击→定位→键入→回看 五步。
// 预期：左侧桌面示意随动作变化（菜单展开、文本出现、待审批提示）；右侧循环管线
//       高亮当前阶段；左下读数显示当前动作、动作后是否回传截图、是否需要审批。
// 阅读主线：computer 工具用 screenshot（感知）+ click/type/press_key（行动）形成闭环。

import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export interface ExampleArgs {
  step: number;
  screenshotAfterAction: boolean;
  requireApproval: boolean;
}

export interface ExampleSnapshot {
  action: string;
  stage: string;
  shot: string;
  approval: string;
}

interface StepDef {
  tool: string;
  stage: string;
  cursor: [number, number] | null; // 相对桌面窗口的坐标
  note: string;
  isAction: boolean; // 动作类工具默认动作后自动截图
  needApproval: boolean; // 是否受 requireApproval 约束
}

const STEPS: StepDef[] = [
  { tool: 'computer_screenshot', stage: '观察', cursor: null, note: '截取整桌 PNG', isAction: false, needApproval: false },
  { tool: 'computer_click', stage: '行动', cursor: [0.2, 0.3], note: '点击菜单按钮', isAction: true, needApproval: false },
  { tool: 'computer_get_screen_info', stage: '定位', cursor: [0.5, 0.62], note: '读屏幕尺寸与光标', isAction: false, needApproval: false },
  { tool: 'computer_type', stage: '行动', cursor: [0.5, 0.62], note: '向输入框键入文本', isAction: true, needApproval: true },
  { tool: 'computer_screenshot', stage: '回看', cursor: null, note: '再截图确认结果', isAction: false, needApproval: false },
];

const STAGES = ['观察', '定位', '行动', '回看'] as const;

export function snapshotFor(args: ExampleArgs): ExampleSnapshot {
  const s = STEPS[Math.min(args.step, STEPS.length - 1)]!;
  return {
    action: `${s.tool}（${s.note}）`,
    stage: s.stage,
    shot: s.isAction ? (args.screenshotAfterAction ? '是（默认）' : '否') : '—',
    approval: s.needApproval && args.requireApproval ? '需要' : '否',
  };
}

export type ExampleInstance = ReturnType<typeof createExample>;

export function createExample(canvas: HTMLCanvasElement, emit: (s: ExampleSnapshot) => void) {
  let args: ExampleArgs = { step: 0, screenshotAfterAction: true, requireApproval: true };
  const ctx = canvas.getContext('2d')!;

  function draw() {
    const { width: W, height: H } = readCanvasSize(canvas);
    const step = STEPS[Math.min(args.step, STEPS.length - 1)]!;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, H);

    // 左侧：桌面示意窗口
    const dx = W * 0.04, dy = H * 0.14, dw = W * 0.52, dh = H * 0.7;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    roundRect(ctx, dx, dy, dw, dh, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#334155';
    ctx.fillRect(dx, dy, dw, dh * 0.12);
    // 菜单按钮：computer_click 执行后（step>=1）高亮并展开下拉菜单
    const mb = { x: dx + dw * 0.08, y: dy + dh * 0.2, w: dw * 0.24, h: dh * 0.12 };
    ctx.fillStyle = args.step >= 1 ? '#0c4a6e' : '#0f172a';
    ctx.strokeStyle = args.step >= 1 ? '#38bdf8' : '#334155';
    roundRect(ctx, mb.x, mb.y, mb.w, mb.h, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    ctx.fillText('菜单', mb.x + 8, mb.y + mb.h / 2 + 4);
    if (args.step >= 1) {
      ctx.fillStyle = '#0f172a';
      roundRect(ctx, mb.x, mb.y + mb.h + 2, mb.w, mb.h * 1.7, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillText('新建', mb.x + 8, mb.y + mb.h + 20);
      ctx.fillText('保存', mb.x + 8, mb.y + mb.h + 38);
    }
    // 输入框：computer_type 执行后出现文本；requireApproval 时先挂起
    const ib = { x: dx + dw * 0.12, y: dy + dh * 0.62, w: dw * 0.76, h: dh * 0.14 };
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    roundRect(ctx, ib.x, ib.y, ib.w, ib.h, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    const typed = args.step >= 4 || (args.step === 3 && !args.requireApproval);
    ctx.fillText(typed ? 'hello desktop' : '输入框', ib.x + 8, ib.y + ib.h / 2 + 4);
    if (args.step === 3 && args.requireApproval) {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('待审批：computer_type 已暂停执行', ib.x, ib.y - 8);
    }
    // 光标（像素坐标定位）
    if (step.cursor) {
      const cx = dx + dw * step.cursor[0], cy = dy + dh * step.cursor[1];
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 11, cy + 4);
      ctx.lineTo(cx + 5, cy + 10);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`第 ${args.step} 步 · ${step.tool}：${step.note}`, dx, dy + dh + 18);

    // 右侧：观察-行动循环管线
    const px = W * 0.62, pw = W * 0.34, ph = dh * 0.13, gap = dh * 0.07;
    STAGES.forEach((st, i) => {
      const py = dy + i * (ph + gap);
      const on = st === step.stage;
      ctx.fillStyle = on ? '#0c4a6e' : '#1e293b';
      ctx.strokeStyle = on ? '#38bdf8' : '#334155';
      roundRect(ctx, px, py, pw, ph, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = on ? '#e0f2fe' : '#94a3b8';
      ctx.fillText(st, px + 10, py + ph / 2 + 4);
      if (i < STAGES.length - 1) {
        ctx.strokeStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(px + pw / 2, py + ph);
        ctx.lineTo(px + pw / 2, py + ph + gap);
        ctx.stroke();
      }
    });
    ctx.strokeStyle = '#38bdf8';
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    const lastY = dy + 3 * (ph + gap) + ph / 2;
    ctx.moveTo(px, lastY);
    ctx.lineTo(px - 14, lastY);
    ctx.lineTo(px - 14, dy + ph / 2);
    ctx.lineTo(px, dy + ph / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  draw();
  emit(snapshotFor(args));
  const ro = createResizeObserver(canvas, draw);

  return {
    update(next: ExampleArgs) {
      args = next;
      draw();
      emit(snapshotFor(args));
    },
    dispose() {
      ro.disconnect();
    },
  };
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
