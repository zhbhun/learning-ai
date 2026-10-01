/**
 * 范例介绍：混合流水线——演示同一段核心处理分别实现为代码步骤 / 工具步骤 / agent 步骤时的执行特征差异。
 * 输入：核心步骤实现（coreStep: code | tool | agent）与 agent 步骤是否开启 structuredOutput。
 * 操作：Canvas 绘制「解析输入 → 核心处理 → 汇总输出」三段流水线，核心步骤按所选实现着色并标注特征。
 * 预期结果：代码 / 工具步骤为确定性、毫秒级；切到 agent 步骤变为开放推理、秒级；开启 structuredOutput 后输出形态变为 schema 约束字段。
 * 阅读主线：先看中间步骤的颜色与标签，再对照左下角读数与正文「确定性步骤还是 agent 步骤」对照表。
 * 说明：实例为离线示意，耗时为示意值，不调用真实 LLM / 工具。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type CoreStepKind = 'code' | 'tool' | 'agent';

export interface HybridPipelineArgs {
  coreStep: CoreStepKind;
  structuredOutput: boolean;
}

export interface HybridPipelineSnapshot {
  coreStepLabel: string;
  deterministic: string;
  latency: string;
  outputShape: string;
  graphEntry: string;
}

export interface HybridPipelineInstance {
  update(args: HybridPipelineArgs): void;
  dispose(): void;
}

const KIND_LABEL: Record<CoreStepKind, string> = {
  code: '代码步骤',
  tool: '工具步骤',
  agent: 'agent 步骤',
};

interface KindFeature {
  color: string;
  deterministic: string;
  latencyMs: number;
  output: string;
  graph: string;
}

// 三种实现的可观察特征（耗时为离线示意值）
const FEATURES: Record<CoreStepKind, KindFeature> = {
  code: {
    color: '#4f7cff',
    deterministic: '确定性（可复算）',
    latencyMs: 5,
    output: '固定字段，直接返回',
    graph: '普通步骤（不透明）',
  },
  tool: {
    color: '#0e9f8a',
    deterministic: '确定性（可复算）',
    latencyMs: 20,
    output: 'tool 返回的固定字段',
    graph: '.tool() 声明式条目',
  },
  agent: {
    color: '#d97706',
    deterministic: '开放推理（受模型影响）',
    latencyMs: 1500,
    output: 'text: string',
    graph: '.agent() 声明式条目',
  },
};

function formatLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
}

export function createHybridPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: HybridPipelineSnapshot) => void,
): HybridPipelineInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: HybridPipelineArgs = { coreStep: 'agent', structuredOutput: false };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const feature = FEATURES[current.coreStep];
    const structured = current.coreStep === 'agent' && current.structuredOutput;
    const latencyMs = feature.latencyMs + (structured ? 200 : 0);
    const latencyText = structured
      ? `${formatLatency(latencyMs)}（示意，含 schema 约束）`
      : `${formatLatency(feature.latencyMs)}（示意）`;
    const outputShape = structured
      ? 'title / summary / tags（schema 约束）'
      : feature.output;

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('混合流水线：确定性骨架 + 可切换的核心步骤', 48, 40);

    const margin = 48;
    const gap = 48;
    const boxW = (width - margin * 2 - gap * 2) / 3;
    const boxY = 84;
    const boxH = 92;

    const stages: Array<{ name: string; tag: string; color: string; active: boolean }> = [
      { name: '解析输入', tag: '代码步骤', color: '#4f7cff', active: false },
      {
        name: '核心处理',
        tag: KIND_LABEL[current.coreStep],
        color: feature.color,
        active: true,
      },
      { name: '汇总输出', tag: '代码步骤', color: '#4f7cff', active: false },
    ];

    stages.forEach((stage, index) => {
      const x = margin + index * (boxW + gap);
      ctx.lineWidth = stage.active ? 2.5 : 1.2;
      ctx.strokeStyle = stage.active ? stage.color : '#cbd5e1';
      ctx.fillStyle = stage.active ? `${stage.color}14` : '#f8fafc';
      ctx.fillRect(x, boxY, boxW, boxH);
      ctx.strokeRect(x, boxY, boxW, boxH);

      ctx.fillStyle = '#172033';
      ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(stage.name, x + 16, boxY + 32);
      ctx.fillStyle = stage.active ? stage.color : '#64748b';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(stage.tag, x + 16, boxY + 58);
      if (stage.active) {
        ctx.fillStyle = stage.color;
        ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('当前步骤', x + 16, boxY + 78);
      }

      if (index < stages.length - 1) {
        const ax1 = x + boxW + 8;
        const ax2 = x + boxW + gap - 8;
        const ay = boxY + boxH / 2;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax1, ay);
        ctx.lineTo(ax2, ay);
        ctx.moveTo(ax2 - 7, ay - 4);
        ctx.lineTo(ax2, ay);
        ctx.lineTo(ax2 - 7, ay + 4);
        ctx.stroke();
      }
    });

    // 耗时条：对数刻度示意，突出量级差异而非精确值
    const barY = boxY + boxH + 46;
    const barMax = width - margin * 2;
    const ratio = Math.min(1, Math.log10(latencyMs + 1) / Math.log10(2000));
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(margin, barY, barMax, 10);
    ctx.fillStyle = feature.color;
    ctx.fillRect(margin, barY, Math.max(6, barMax * ratio), 10);
    ctx.fillStyle = '#475569';
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(`核心步骤耗时示意：${latencyText}`, margin, barY - 12);

    const noteY = barY + 36;
    ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
    if (current.coreStep === 'agent') {
      ctx.fillStyle = structured ? '#0e9f8a' : '#64748b';
      ctx.fillText(
        structured
          ? 'structuredOutput 已开启：outputSchema 自动映射为 schema，下游拿到 title / summary / tags'
          : '未开启 structuredOutput：agent 步骤输出默认为 text: string',
        margin,
        noteY,
      );
    } else {
      ctx.fillStyle = '#64748b';
      ctx.fillText(
        '确定性步骤：同输入同输出，适合 .parallel / .foreach 扇出复用',
        margin,
        noteY,
      );
    }
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      `图谱记录：${feature.graph}——声明式条目可持久化为 dynamic workflow`,
      margin,
      noteY + 26,
    );

    emit({
      coreStepLabel: KIND_LABEL[current.coreStep],
      deterministic: feature.deterministic,
      latency: latencyText,
      outputShape,
      graphEntry: feature.graph,
    });
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
