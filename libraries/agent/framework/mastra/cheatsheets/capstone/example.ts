/**
 * 范例介绍：画出「智能客服 / 知识助手」的六层参考架构（离线示意，无真实 LLM / 网络 / 数据库调用）。
 * 输入：控件选择的高亮层（入口 / 编排 / 记忆 / 知识 / 质量 / 部署）。
 * 操作：切换高亮层，画布突出该层在请求链路中的位置，左右箭头分别标出请求与回复方向。
 * 预期结果：读数显示该层职责、对应手册课程 slug 与官方起步模板建议。
 * 阅读主线：LAYERS 导航数据表 → draw 分层绘制与高亮 → emit 读数。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleSnapshot {
  layer: string;
  duty: string;
  courses: string;
  templates: string;
}

export interface ExampleInstance {
  update(options: { layer: string }): void;
  dispose(): void;
}

interface LayerSpec {
  key: string; label: string; hint: string;
  duty: string; courses: string[]; templates: string;
}

// 导航总图数据：每层职责、深入课程与起步模板，与正文参考表一一对应。
const LAYERS: LayerSpec[] = [
  {
    key: 'ingress', label: '入口', hint: 'Chat UI · Channels · 语音',
    duty: '接入用户：网页聊天、消息渠道与语音，渲染流式回复',
    courses: ['chat-ui', 'web-frameworks', 'client-sdk', 'channels'], templates: 'Slack Agent、Chat with YouTube',
  },
  {
    key: 'orchestration', label: '编排', hint: 'Server · supervisor · 工作流',
    duty: '鉴权与中间件后协调子代理；审批、通知等确定性步骤走工作流',
    courses: ['server-api', 'middleware', 'auth-basics', 'subagents', 'workflow-basics'], templates: 'Customer Support and Refund Agent',
  },
  {
    key: 'memory', label: '记忆', hint: '工作记忆 · 语义召回',
    duty: '按 resource / thread 记历史，工作记忆存关键事实，语义召回捞相关旧对话',
    courses: ['memory-basics', 'working-memory', 'semantic-recall'], templates: 'Agent Harness',
  },
  {
    key: 'knowledge', label: '知识', hint: 'RAG · 检索 · 重排',
    duty: '知识库切块嵌入入库，检索工具按查询召回并重排，回答附引用',
    courses: ['rag-pipeline', 'chunking-and-embedding', 'retrieval-and-rerank'], templates: 'Organization Intelligence、Chat with PDF',
  },
  {
    key: 'quality', label: '质量', hint: 'Evals · Tracing',
    duty: '上线前用数据集与实验批量打分，上线后用 trace 定位回归',
    courses: ['evals-basics', 'evals-datasets', 'evals-ci', 'tracing'], templates: '无专属模板：任选模板后补 Evals 数据集',
  },
  {
    key: 'deployment', label: '部署', hint: 'mastra build · 云平台 · Platform',
    duty: 'mastra build 出自托管产物，或部署到 Vercel / Cloudflare / Mastra Platform',
    courses: ['deployment', 'cloud-deployment', 'workflow-runners', 'mastra-platform'], templates: '各模板仓库自带 dev / build 脚本',
  },
];

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D。');
  let selected = LAYERS[1]; // 默认聚焦编排层

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width); const height = Math.max(260, size.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const gap = 8; const padX = 66; const top = 14;
    const bandH = (height - top * 2 - gap * (LAYERS.length - 1)) / LAYERS.length;

    // 逐层绘制：当前层高亮，其余层压暗，请求链路自上而下保持可见
    LAYERS.forEach((layer, index) => {
      const y = top + index * (bandH + gap);
      const on = layer.key === selected.key;
      ctx.globalAlpha = on ? 1 : 0.32;
      ctx.beginPath();
      ctx.roundRect(padX, y, width - padX * 2, bandH, 8);
      ctx.fillStyle = on ? '#4f7cff' : '#dbe3f4';
      ctx.fill();
      ctx.fillStyle = on ? '#ffffff' : '#334155';
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`${index + 1} ${layer.label}层`, padX + 16, y + bandH / 2 + 5);
      ctx.fillStyle = on ? '#dce6ff' : '#64748b';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(layer.hint, padX + 92, y + bandH / 2 + 5);
      ctx.globalAlpha = 1;
    });

    // 左侧请求下行，右侧回复上行（层序号 1→6 即请求穿越顺序）
    ([[22, true], [width - 22, false]] as const).forEach(([x, down]) => {
      const y1 = down ? top + 2 : height - top - 2;
      const y2 = down ? height - top - 2 : top + 2;
      ctx.strokeStyle = ctx.fillStyle = down ? '#4f7cff' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
      const d = y2 > y1 ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(x, y2); ctx.lineTo(x - 4, y2 - 7 * d); ctx.lineTo(x + 4, y2 - 7 * d); ctx.fill();
    });

    emit({
      layer: selected.label, duty: selected.duty,
      courses: selected.courses.join(' · '), templates: selected.templates,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      selected = LAYERS.find((l) => l.key === options.layer) ?? selected;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
