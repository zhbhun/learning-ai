/**
 * 任务分流器：把一个任务按「路径可预测性 / 失败恢复需求 / 审计需求」三个维度打分，
 * 推荐交给 Agent、Workflow 还是混合编排。
 * 输入：Stories 面板中三个 0~10 的滑杆。
 * 操作：拖动滑杆改变三个维度的取值。
 * 预期结果：左下角读数给出推荐结论、工作流需求分与维护方；
 *   画布右侧同步重绘对应结构——固定步骤链 / 模型自主循环 / 步骤加 Agent 加步骤。
 * 阅读主线：scoreTask 打分 → recommend 判定 → draw 内三个 draw*Diagram 渲染。
 * 边界：权重与阈值为离线示意，不调用真实模型，实际业务应自行标定。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface TaskTriageOptions {
  predictability: number;
  recovery: number;
  audit: number;
}

export type Recommendation = 'workflow' | 'agent' | 'hybrid';

export interface TaskTriageSnapshot {
  recommendation: string;
  workflowNeed: number;
  maintainBy: string;
}

export interface TaskTriageInstance {
  update(options: TaskTriageOptions): void;
  dispose(): void;
}

const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  workflow: '工作流编排',
  agent: 'Agent 自主推理',
  hybrid: '混合：主干 Workflow + Agent 步骤',
};

const MAINTAINER_LABEL: Record<Recommendation, string> = {
  workflow: '代码（步骤与 schema）',
  agent: '提示词（instructions 与工具）',
  hybrid: '两者',
};

const DIMENSIONS: Array<{ key: keyof TaskTriageOptions; label: string }> = [
  { key: 'predictability', label: '路径可预测性' },
  { key: 'recovery', label: '失败恢复需求' },
  { key: 'audit', label: '审计需求' },
];

// 工作流需求分：路径可预测性权重最高，它是「步骤能否事先枚举」的直接度量
export function scoreTask(options: TaskTriageOptions): number {
  return options.predictability * 0.4 + options.recovery * 0.3 + options.audit * 0.3;
}

export function recommend(score: number): Recommendation {
  if (score >= 7) return 'workflow';
  if (score < 4) return 'agent';
  return 'hybrid';
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: TaskTriageSnapshot) => void,
): TaskTriageInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: TaskTriageOptions = { predictability: 9, recovery: 8, audit: 6 };

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function arrowHead(x: number, y: number, angle: number) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 9 * Math.cos(angle - Math.PI / 6), y - 9 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x - 9 * Math.cos(angle + Math.PI / 6), y - 9 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  function arrow(x1: number, y1: number, x2: number, y2: number) {
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    arrowHead(x2, y2, Math.atan2(y2 - y1, x2 - x1));
  }

  function curvedArrow(x1: number, y1: number, x2: number, y2: number, bend: number) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const cx = (x1 + x2) / 2 + (-dy / len) * bend;
    const cy = (y1 + y2) / 2 + (dx / len) * bend;
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
    arrowHead(x2, y2, Math.atan2(y2 - cy, x2 - cx));
  }

  function box(x: number, y: number, w: number, h: number, text: string, accent: boolean) {
    ctx.fillStyle = accent ? '#eef2ff' : '#ffffff';
    ctx.strokeStyle = accent ? '#4f7cff' : '#cbd5e1';
    ctx.lineWidth = 1.5;
    roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#172033';
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + w / 2, y + h / 2 + 4);
    ctx.textAlign = 'left';
  }

  function circle(x: number, y: number, r: number, text: string, accent: boolean) {
    ctx.fillStyle = accent ? '#eef2ff' : '#ffffff';
    ctx.strokeStyle = accent ? '#4f7cff' : '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y + 4);
    ctx.textAlign = 'left';
  }

  function tag(x: number, y: number, text: string) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(text, x, y);
  }

  function drawBars(x: number, y: number, w: number) {
    let cy = y;
    for (const dim of DIMENSIONS) {
      const value = current[dim.key];
      ctx.fillStyle = '#334155';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(dim.label, x, cy + 12);
      ctx.fillStyle = '#e2e8f0';
      roundRect(x, cy + 20, w, 10, 5);
      ctx.fill();
      ctx.fillStyle = '#4f7cff';
      roundRect(x, cy + 20, Math.max(8, (value / 10) * w), 10, 5);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(String(value), x + w + 12, cy + 30);
      cy += 56;
    }
  }

  function drawWorkflowDiagram(x: number, y: number, w: number, h: number) {
    const boxH = 44;
    const gap = 30;
    const boxW = Math.min(110, Math.max(56, (w - gap * 2) / 3));
    const cy = y + (h - 30 - boxH) / 2;
    const labels = ['步骤 1', '步骤 2', '步骤 3'];
    let cx = x + (w - (boxW * 3 + gap * 2)) / 2;
    for (let i = 0; i < labels.length; i++) {
      box(cx, cy, boxW, boxH, labels[i], false);
      cx += boxW;
      if (i < labels.length - 1) {
        arrow(cx + 4, cy + boxH / 2, cx + gap - 4, cy + boxH / 2);
        cx += gap;
      }
    }
    tag(x, y + h - 18, '顺序写死 · 每步留痕 · 可挂起恢复');
  }

  function drawAgentDiagram(x: number, y: number, w: number, h: number) {
    const cx = x + w / 2 - 40;
    const cy = y + (h - 40) / 2;
    circle(cx, cy, 34, 'LLM', true);
    box(cx + 64, cy - 22, 104, 44, '工具调用', false);
    arrow(cx + 36, cy, cx + 60, cy);
    curvedArrow(cx + 110, cy + 26, cx + 16, cy + 44, 18);
    tag(x, y + h - 18, '模型自选路径 · 直到自行结束');
  }

  function drawHybridDiagram(x: number, y: number, w: number, h: number) {
    const boxH = 44;
    const boxW = Math.min(96, Math.max(56, (w - 150) / 2));
    const cy = y + (h - 30 - boxH) / 2;
    const cx = x + (w - (boxW * 2 + 130)) / 2;
    box(cx, cy, boxW, boxH, '步骤', false);
    arrow(cx + boxW + 4, cy + boxH / 2, cx + boxW + 31, cy + boxH / 2);
    circle(cx + boxW + 65, cy + boxH / 2, 30, 'Agent', true);
    arrow(cx + boxW + 99, cy + boxH / 2, cx + boxW + 126, cy + boxH / 2);
    box(cx + boxW + 130, cy, boxW, boxH, '步骤', false);
    tag(x, y + h - 18, '主干持久化留痕 · 开放判断交给模型');
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const score = scoreTask(current);
    const rec = recommend(score);

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('任务分流器', 24, 34);

    const leftW = Math.min(168, Math.max(96, width * 0.24));
    drawBars(24, 56, leftW);

    const panelX = 24 + leftW + 36;
    const panelY = 48;
    const panelW = width - panelX - 24;
    const panelH = height - panelY - 20;
    if (panelW > 80) {
      ctx.fillStyle = '#f8fafc';
      roundRect(panelX, panelY, panelW, panelH, 12);
      ctx.fill();
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#172033';
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(RECOMMENDATION_LABEL[rec], panelX + panelW / 2, panelY + 26);
      ctx.textAlign = 'left';

      const dx = panelX + 20;
      const dy = panelY + 40;
      const dw = panelW - 40;
      const dh = panelH - 52;
      if (rec === 'workflow') drawWorkflowDiagram(dx, dy, dw, dh);
      else if (rec === 'agent') drawAgentDiagram(dx, dy, dw, dh);
      else drawHybridDiagram(dx, dy, dw, dh);
    }

    emit({
      recommendation: RECOMMENDATION_LABEL[rec],
      workflowNeed: Math.round(score * 10) / 10,
      maintainBy: MAINTAINER_LABEL[rec],
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  draw();

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
