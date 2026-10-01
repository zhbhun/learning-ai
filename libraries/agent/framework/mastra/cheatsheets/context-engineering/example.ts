/**
 * 范例介绍：上下文窗口构成的离线示意。
 * 演示内容：勾选注入窗口的上下文来源后，堆叠条按「每轮 / 偶尔」属性显示各来源占用，底部给出建议动作。
 * 输入：sources（启用的来源 id 列表）、lastMessages（Memory 保留的最近消息条数，默认 10）。
 * 操作：在 Controls 中增删来源、拖动 lastMessages。
 * 预期结果：读数给出总 token、每轮注入与偶尔注入；来源组合或记忆膨胀变化时，建议动作随之改变。
 * 阅读主线：SOURCES（来源与示意 token 模型）→ activeSegments()（汇总统计）→ draw()（堆叠条与建议）。
 * 注意：token 数字为教学示意，不是真实 tokenizer 计量。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface WindowOptions {
  sources: string[];
  lastMessages: number;
}

export interface WindowSnapshot {
  total: number;
  perTurn: number;
  occasional: number;
}

export interface WindowInstance {
  update(options: WindowOptions): void;
  dispose(): void;
}

/** 每轮都进窗口的来源（常驻上下文）用蓝色系，偶尔进窗口的（按需上下文）用琥珀色系。 */
interface SourceSpec {
  id: string;
  label: string;
  perTurn: boolean;
  color: string;
  tokens: (lastMessages: number) => number;
}

const SOURCES: SourceSpec[] = [
  {
    id: 'instructions-static',
    label: '静态 instructions',
    perTurn: true,
    color: '#4f7cff',
    tokens: () => 600,
  },
  {
    id: 'instructions-dynamic',
    label: '动态 instructions / 内联注入',
    perTurn: true,
    color: '#7b9bff',
    tokens: () => 350,
  },
  {
    id: 'tools',
    label: '工具描述',
    perTurn: true,
    color: '#38bdf8',
    tokens: () => 900,
  },
  {
    // 滑动窗口随对话轮数增长：每条历史消息约 130 token（示意）
    id: 'memory',
    label: '记忆 lastMessages',
    perTurn: true,
    color: '#0ea5e9',
    tokens: (lastMessages) => 120 + lastMessages * 130,
  },
  {
    id: 'rag',
    label: 'RAG 检索结果',
    perTurn: false,
    color: '#f59e0b',
    tokens: () => 1400,
  },
  {
    id: 'signals',
    label: '信号',
    perTurn: false,
    color: '#fbbf24',
    tokens: () => 500,
  },
];

const BUDGET = 8000; // 演示用窗口预算（示意）
const SCALE_MAX = 10000; // 堆叠条满刻度

export function createWindowChart(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WindowSnapshot) => void,
): WindowInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: WindowOptions = {
    sources: ['instructions-static', 'tools', 'memory'],
    lastMessages: 10,
  };

  function activeSegments(): Array<SourceSpec & { value: number }> {
    return SOURCES.filter((source) => current.sources.includes(source.id)).map(
      (source) => ({ ...source, value: source.tokens(current.lastMessages) }),
    );
  }

  function advice(
    segments: Array<SourceSpec & { value: number }>,
    total: number,
  ): string {
    const memory = segments.find((s) => s.id === 'memory');
    const rag = segments.find((s) => s.id === 'rag');
    if (total > BUDGET) {
      return '超出预算：先 toModelOutput 瘦身单条结果，再用 ToolCallFilter / TokenLimiter 兜底';
    }
    if (memory && memory.value > 2600) {
      return '记忆随对话膨胀：用观察式记忆替代 lastMessages 滑窗';
    }
    if (rag) {
      return 'RAG 偶尔需要：收紧 topK、加 metadata 过滤或 rerank';
    }
    if (segments.length === 0) {
      return '窗口为空：模型缺少信息，先注入每轮需要的 instructions';
    }
    return '相关且精简：稳定前缀在前，易变内容靠后，利于 prompt cache';
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(380, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const segments = activeSegments();
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const perTurn = segments
      .filter((s) => s.perTurn)
      .reduce((sum, s) => sum + s.value, 0);
    const occasional = total - perTurn;

    ctx.fillStyle = '#172033';
    ctx.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('上下文窗口构成（示意）', 48, 44);

    // 图例：每轮注入 = 蓝，偶尔注入 = 琥珀
    let legendX = width - 212;
    const legend = [
      { label: '每轮注入', color: '#4f7cff' },
      { label: '偶尔注入', color: '#f59e0b' },
    ];
    for (const item of legend) {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, 34, 10, 10);
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(item.label, legendX + 15, 43);
      legendX += 98;
    }

    // 堆叠条
    const barX = 48;
    const barY = 92;
    const barH = 40;
    const trackW = width - 96;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(barX, barY, trackW, barH);
    let x = barX;
    for (const segment of segments) {
      const w = (segment.value / SCALE_MAX) * trackW;
      ctx.fillStyle = segment.color;
      ctx.fillRect(x, barY, Math.max(0, w - 2), barH);
      x += w;
    }

    // 预算线与超预算部分
    const budgetX = barX + (BUDGET / SCALE_MAX) * trackW;
    ctx.strokeStyle = total > BUDGET ? '#ef4444' : '#94a3b8';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(budgetX, barY - 10);
    ctx.lineTo(budgetX, barY + barH + 10);
    ctx.stroke();
    ctx.setLineDash([]);
    if (total > BUDGET) {
      const overW =
        barX + (Math.min(total, SCALE_MAX) / SCALE_MAX) * trackW - budgetX;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.fillRect(budgetX, barY, overW, barH);
    }
    ctx.fillStyle = total > BUDGET ? '#ef4444' : '#64748b';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`预算 ${BUDGET}`, budgetX - 26, barY + barH + 24);

    // 来源明细
    let rowY = 186;
    for (const segment of segments) {
      ctx.fillStyle = segment.color;
      ctx.fillRect(48, rowY - 10, 10, 10);
      ctx.fillStyle = '#334155';
      ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      const tag = segment.perTurn ? '每轮' : '偶尔';
      ctx.fillText(
        `${segment.label} · ${segment.value} token · ${tag}`,
        66,
        rowY,
      );
      rowY += 22;
    }
    if (segments.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText('未注入任何来源', 48, rowY);
    }

    // 建议动作
    ctx.fillStyle = total > BUDGET ? '#ef4444' : '#172033';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`建议：${advice(segments, total)}`, 48, height - 22);

    emit({ total, perTurn, occasional });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

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
