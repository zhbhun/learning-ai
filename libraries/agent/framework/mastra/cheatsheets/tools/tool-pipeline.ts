/**
 * 范例介绍：离线演示一次 get-customer 工具调用的完整数据流（不调用真实 LLM / 网络）。
 * 演示内容：beforeToolCall 白名单校验 → execute 返回完整 JSON →
 *          toModelOutput 决定模型上下文看到什么 → transform 决定 UI 看到什么。
 * 输入：查询姓名（alice 在白名单 / eve 不在）、toModelOutput 瘦身开关、transform 脱敏开关。
 * 操作：切换三个控件，观察流水线各阶段状态与「到达模型 / 到达 UI」两条输出。
 * 预期结果：查询 eve 时 beforeToolCall 返回 proceed: false，execute 不执行，钩子的 output
 *          成为工具结果；关闭瘦身时完整 JSON 进入模型上下文（字符数骤增）；关闭脱敏时
 *          UI 直接渲染手机号原文。
 * 阅读主线：runToolPipeline() 按真实 createTool 的钩子顺序组织，draw() 只负责呈现。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export const QUERIES = ['alice', 'eve'] as const;
export type QueryName = (typeof QUERIES)[number];

export interface ToolPipelineArgs {
  query: QueryName;
  slimForModel: boolean;
  redactForUi: boolean;
}

export interface ToolPipelineSnapshot {
  blocked: boolean;
  executed: boolean;
  fullChars: number;
  modelChars: number;
  uiPhone: string;
}

export interface ToolPipelineInstance {
  update(args: ToolPipelineArgs): void;
  dispose(): void;
}

// —— 与 createTool 对齐的模拟数据 ——

// beforeToolCall 的白名单策略：不在名单内的查询会被 proceed: false 拦截
const ALLOWED_NAMES = ['alice', 'bob'];

// execute 返回的完整结果：长文本 history 与敏感字段 phone 只存在于应用侧
const FULL_RESULT = {
  name: 'alice',
  tier: '白金会员',
  phone: '13800138000',
  history:
    '近 90 天 23 笔订单；最近一次退货工单 2026-08-12 已关闭；偏好顺丰发货；备注：对乳制品过敏，推荐商品时需过滤乳制品类目。',
};

// 完整数据流：对应 beforeToolCall → execute → toModelOutput / transform 四个环节
export function runToolPipeline(args: ToolPipelineArgs): ToolPipelineSnapshot {
  // ① beforeToolCall：策略校验。返回 { proceed: false, output } 会跳过 execute，
  //    output 直接作为工具结果回给模型（这里是拦截文案）。
  if (!ALLOWED_NAMES.includes(args.query)) {
    const blockedOutput = `已拦截：${args.query} 不在可查询名单内。`;
    return {
      blocked: true,
      executed: false,
      fullChars: 0,
      modelChars: blockedOutput.length,
      uiPhone: '—（未执行）',
    };
  }

  // ② execute：拿到完整结果（含敏感字段与大段历史，JSON 体积大）
  const fullJson = JSON.stringify(FULL_RESULT, null, 2);

  // ③ toModelOutput：瘦身时模型上下文只放一行摘要；关闭时整份 JSON 进入上下文
  const modelView = args.slimForModel
    ? `${FULL_RESULT.name}：${FULL_RESULT.tier}（详情口头转述给用户）`
    : fullJson;

  // ④ transform（display / transcript 目标）：UI 上手机号打码，应用侧仍是原文
  const uiPhone = args.redactForUi
    ? `***-****-${FULL_RESULT.phone.slice(-4)}`
    : FULL_RESULT.phone;

  return {
    blocked: false,
    executed: true,
    fullChars: fullJson.length,
    modelChars: modelView.length,
    uiPhone,
  };
}

export function createToolPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ToolPipelineSnapshot) => void,
): ToolPipelineInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: ToolPipelineArgs = {
    query: 'alice',
    slimForModel: true,
    redactForUi: true,
  };

  function roundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
    stroke: string,
    dashed = false,
  ) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function text(
    value: string,
    x: number,
    y: number,
    color: string,
    font = '13px ui-sans-serif, system-ui, sans-serif',
  ) {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(value, x, y);
  }

  function arrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    dashed = false,
  ) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.setLineDash(dashed ? [5, 4] : []);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - 8 * Math.cos(angle - Math.PI / 6),
      y2 - 8 * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      x2 - 8 * Math.cos(angle + Math.PI / 6),
      y2 - 8 * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
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

    const snapshot = runToolPipeline(current);
    emit(snapshot);

    const P = 32;
    const gap = 12;
    const colW = (width - 2 * P - 3 * gap) / 4;
    const rowY = 118;
    const rowH = 118;

    text(
      '一次工具调用的数据流（离线示意）',
      P,
      42,
      '#172033',
      '600 17px ui-sans-serif, system-ui, sans-serif',
    );
    text(
      'get-customer · createTool({ id, description, inputSchema, outputSchema, execute })',
      P,
      64,
      '#64748b',
      '12px ui-monospace, SFMono-Regular, Menlo, monospace',
    );

    const midY = rowY + rowH / 2;
    const x1 = P;
    const x2 = P + (colW + gap);
    const x3 = P + 2 * (colW + gap);
    const x4 = P + 3 * (colW + gap);

    // 第 1 列：模型发起调用
    roundRect(x1, rowY, colW, rowH, 10, '#f8fafc', '#cbd5e1');
    text('模型', x1 + 14, rowY + 26, '#172033', '600 14px ui-sans-serif, system-ui, sans-serif');
    text('发起工具调用', x1 + 14, rowY + 46, '#64748b');
    text(
      `get-customer`,
      x1 + 14,
      rowY + 74,
      '#4f7cff',
      '12px ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    text(
      `{ name: '${current.query}' }`,
      x1 + 14,
      rowY + 92,
      '#4f7cff',
      '12px ui-monospace, SFMono-Regular, Menlo, monospace',
    );

    // 第 2 列：beforeToolCall
    const pass = !snapshot.blocked;
    roundRect(
      x2,
      rowY,
      colW,
      rowH,
      10,
      pass ? '#f8fafc' : '#fef2f2',
      pass ? '#cbd5e1' : '#dc2626',
    );
    text('beforeToolCall', x2 + 14, rowY + 26, '#172033', '600 14px ui-monospace, SFMono-Regular, Menlo, monospace');
    text('白名单 [alice, bob]', x2 + 14, rowY + 46, '#64748b');
    text(
      pass ? '校验通过，继续执行' : 'proceed: false',
      x2 + 14,
      rowY + 74,
      pass ? '#16a34a' : '#dc2626',
      '600 13px ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    text(
      pass ? '—' : '钩子 output 成为工具结果',
      x2 + 14,
      rowY + 92,
      pass ? '#94a3b8' : '#dc2626',
    );

    // 第 3 列：execute
    const dim = snapshot.blocked;
    roundRect(
      x3,
      rowY,
      colW,
      rowH,
      10,
      dim ? '#f8fafc' : '#eff6ff',
      dim ? '#e2e8f0' : '#4f7cff',
      dim,
    );
    text('execute', x3 + 14, rowY + 26, dim ? '#94a3b8' : '#172033', '600 14px ui-monospace, SFMono-Regular, Menlo, monospace');
    text('返回完整 JSON', x3 + 14, rowY + 46, dim ? '#94a3b8' : '#64748b');
    text(
      dim ? '未执行' : `${snapshot.fullChars} 字符`,
      x3 + 14,
      rowY + 74,
      dim ? '#94a3b8' : '#172033',
      '600 13px ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    text('含 phone / history', x3 + 14, rowY + 92, dim ? '#94a3b8' : '#64748b');

    // 第 4 列：两路输出（上：toModelOutput → 模型上下文；下：transform → UI）
    const branchH = (rowH - gap) / 2;
    const topY = rowY;
    const bottomY = rowY + branchH + gap;

    roundRect(
      x4,
      topY,
      colW,
      branchH,
      10,
      dim ? '#f8fafc' : '#eff6ff',
      dim ? '#e2e8f0' : '#4f7cff',
      dim,
    );
    text('toModelOutput → 模型', x4 + 12, topY + 22, dim ? '#94a3b8' : '#172033', '600 12px ui-sans-serif, system-ui, sans-serif');
    text(
      dim ? '未执行' : `${snapshot.modelChars} 字符`,
      x4 + 12,
      topY + 42,
      dim ? '#94a3b8' : current.slimForModel ? '#16a34a' : '#dc2626',
      '600 12px ui-monospace, SFMono-Regular, Menlo, monospace',
    );

    roundRect(
      x4,
      bottomY,
      colW,
      branchH,
      10,
      dim ? '#f8fafc' : '#f0fdfa',
      dim ? '#e2e8f0' : '#0d9488',
      dim,
    );
    text('transform → UI', x4 + 12, bottomY + 22, dim ? '#94a3b8' : '#172033', '600 12px ui-sans-serif, system-ui, sans-serif');
    text(
      `phone: ${snapshot.uiPhone}`,
      x4 + 12,
      bottomY + 42,
      dim ? '#94a3b8' : current.redactForUi ? '#0d9488' : '#dc2626',
      '12px ui-monospace, SFMono-Regular, Menlo, monospace',
    );

    // 箭头
    arrow(x1 + colW, midY, x2 - 2, midY, '#475569');
    arrow(x2 + colW, midY, x3 - 2, midY, pass ? '#475569' : '#dc2626');
    if (pass) {
      arrow(x3 + colW, midY - 14, x4 - 2, topY + branchH / 2, '#4f7cff');
      arrow(x3 + colW, midY + 14, x4 - 2, bottomY + branchH / 2, '#0d9488');
    } else {
      arrow(x3 + colW, midY, x4 - 2, midY, '#cbd5e1', true);
    }

    // 底部对照：到达模型的内容长度
    const barY = rowY + rowH + 44;
    const barMax = width - 2 * P - 210;
    const scale = Math.max(snapshot.fullChars, snapshot.modelChars, 1);
    text('到达模型的内容', P, barY, '#172033', '600 13px ui-sans-serif, system-ui, sans-serif');
    const drawBar = (y: number, label: string, chars: number, color: string) => {
      text(label, P, y + 12, '#64748b', '12px ui-monospace, SFMono-Regular, Menlo, monospace');
      const w = (chars / scale) * barMax;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(P + 130, y, barMax, 14);
      ctx.fillStyle = color;
      ctx.fillRect(P + 130, y, Math.max(2, w), 14);
      text(`${chars} 字符`, P + 130 + barMax + 10, y + 12, '#475569', '12px ui-monospace, SFMono-Regular, Menlo, monospace');
    };
    drawBar(barY + 12, '完整结果', snapshot.blocked ? 0 : snapshot.fullChars, '#94a3b8');
    drawBar(barY + 34, '模型视图', snapshot.modelChars, current.slimForModel && !snapshot.blocked ? '#16a34a' : '#dc2626');

    const noteY = barY + 66;
    if (snapshot.blocked) {
      text(
        '拦截态：execute 未运行，钩子的 output 作为工具结果直接回给模型。',
        P,
        noteY,
        '#dc2626',
      );
    } else if (!current.slimForModel && !current.redactForUi) {
      text(
        '瘦身与脱敏都已关闭：敏感 phone 与长文本 history 同时进入模型上下文和 UI。',
        P,
        noteY,
        '#dc2626',
      );
    } else {
      text(
        'toModelOutput 管模型上下文的体积，transform 管 UI 的展示，两层互不替代。',
        P,
        noteY,
        '#475569',
      );
    }
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(args) {
      current = args;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
