/**
 * 范例介绍：离线示意 Mastra 代码模式与传统工具循环的两种执行路径（不调用真实模型，token 为示意计算）。
 * 输入：执行路径（传统循环 / 代码模式）与编排需要调用的工具次数（1~10）。
 * 操作：调整 Storybook 控件，执行时间轴与每轮输入 token 柱状图重画。
 * 预期结果：传统循环出现 N+1 轮模型交互、累计 token 随工具数二次增长；代码模式固定 2 轮、线性增长。
 * 阅读主线：simulatePath（路径与 token 模型）→ draw（时间轴 + token 柱）→ CodeModeSnapshot 读数。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type PathMode = 'loop' | 'code';

export interface CodeModeOptions {
  mode: PathMode;
  toolCalls: number;
}

export type NodeKind = 'model' | 'sandbox';

export interface PathNode {
  kind: NodeKind;
  label: string;
  sub: string;
  inputTokens: number; // 模型轮次的输入 token；沙箱节点为 0
  outputTokens: number;
}

export interface CodeModeSnapshot {
  mode: PathMode;
  modelRounds: number;
  totalTokens: number;
  toolExec: string;
  nodes: PathNode[];
}

export interface CodeModeInstance {
  update(options: CodeModeOptions): void;
  dispose(): void;
}

// 示意 token 预算：数字只为呈现增长趋势，不代表真实计费
const BASE_PROMPT = 600; // 系统提示词 + 用户问题的固定输入
const TOOL_RESULT = 350; // 单个工具结果原文进入上下文的开销
const TOOL_SCHEMA = 40; // 每个工具描述放进 instructions 的开销
const LOOP_OUT = 80; // 传统循环每轮模型输出
const CODE_WRITE_OUT = 250; // 代码模式第 1 轮输出编排程序
const CODE_FINAL_OUT = 60; // 代码模式最终汇总轮输出
const AGGREGATE = 120; // 沙箱返回的聚合结果

/**
 * 按两条路径的语义模拟一次多工具聚合任务：
 * - loop：第 k 轮输入重发前 k-1 份工具结果原文，累计输入随 N 二次增长；
 * - code：模型写一次编排代码，工具经 external_* 在宿主执行，上下文只见聚合结果。
 */
export function simulatePath(options: CodeModeOptions): CodeModeSnapshot {
  const n = Math.max(1, Math.round(options.toolCalls));

  if (options.mode === 'loop') {
    const nodes: PathNode[] = [];
    for (let i = 1; i <= n; i++) {
      nodes.push({
        kind: 'model',
        label: `模型 ${i}`,
        sub: '发起工具调用',
        inputTokens: BASE_PROMPT + (i - 1) * TOOL_RESULT,
        outputTokens: LOOP_OUT,
      });
    }
    nodes.push({
      kind: 'model',
      label: `模型 ${n + 1}`,
      sub: '汇总回答',
      inputTokens: BASE_PROMPT + n * TOOL_RESULT,
      outputTokens: LOOP_OUT,
    });
    const totalTokens = nodes.reduce(
      (sum, node) => sum + node.inputTokens + node.outputTokens,
      0,
    );
    return {
      mode: 'loop',
      modelRounds: n + 1,
      totalTokens,
      toolExec: '宿主 · 结果原文逐轮回传模型',
      nodes,
    };
  }

  const planInput = BASE_PROMPT + n * TOOL_SCHEMA;
  const finalInput = planInput + CODE_WRITE_OUT + AGGREGATE;
  const nodes: PathNode[] = [
    {
      kind: 'model',
      label: '模型 1',
      sub: '写编排代码',
      inputTokens: planInput,
      outputTokens: CODE_WRITE_OUT,
    },
    {
      kind: 'sandbox',
      label: '沙箱执行',
      sub: `external_* × ${n}`,
      inputTokens: 0,
      outputTokens: 0,
    },
    {
      kind: 'model',
      label: '模型 2',
      sub: '读聚合结果',
      inputTokens: finalInput,
      outputTokens: CODE_FINAL_OUT,
    },
  ];
  const totalTokens = nodes.reduce(
    (sum, node) => sum + node.inputTokens + node.outputTokens,
    0,
  );
  return {
    mode: 'code',
    modelRounds: 2,
    totalTokens,
    toolExec: '宿主 · 经 external_* 桥接',
    nodes,
  };
}

export function createCodeModeDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: CodeModeSnapshot) => void,
): CodeModeInstance {
  const context = canvas.getContext('2d')!;
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;
  let current: CodeModeOptions = { mode: 'loop', toolCalls: 5 };

  function roundRect(
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

  function draw() {
    const snapshot = simulatePath(current);
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(320, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // 顶部：当前路径结论
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    const headline =
      snapshot.mode === 'loop'
        ? `传统循环：${snapshot.nodes.length} 个模型轮次（工具间逐轮回传）`
        : '代码模式：2 轮模型交互 + 1 次沙箱执行';
    ctx.fillText(headline, 24, 26);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('蓝框 = 模型轮次（下方柱为该轮输入 token） · 紫框 = 沙箱执行 · 箭头上方 = 宿主侧动作', 24, 45);

    // 时间轴：模型轮次与沙箱节点
    const count = snapshot.nodes.length;
    const margin = 24;
    const gap = count > 6 ? 30 : 48;
    const boxW = Math.min(104, Math.max(52, (width - margin * 2 - gap * (count - 1)) / count));
    const totalW = count * boxW + (count - 1) * gap;
    const startX = Math.max(margin, (width - totalW) / 2);
    const boxY = 72;
    const boxH = 54;
    const centers: number[] = [];

    snapshot.nodes.forEach((node, index) => {
      const x = startX + index * (boxW + gap);
      centers.push(x + boxW / 2);
      const isSandbox = node.kind === 'sandbox';
      roundRect(x, boxY, boxW, boxH, 10);
      ctx.fillStyle = isSandbox ? '#f5f3ff' : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = isSandbox ? '#7c3aed' : '#2563eb';
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, x + boxW / 2, boxY + 22);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
      const sub =
        node.sub.length > 12 ? node.sub.slice(0, 11) + '…' : node.sub;
      ctx.fillText(sub, x + boxW / 2, boxY + 40);
      ctx.textAlign = 'left';

      // 箭头与宿主侧动作标注
      if (index < count - 1) {
        const from = x + boxW + 4;
        const to = x + boxW + gap - 6;
        const midY = boxY + boxH / 2;
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(from, midY);
        ctx.lineTo(to, midY);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(to + 6, midY);
        ctx.lineTo(to - 2, midY - 4);
        ctx.lineTo(to - 2, midY + 4);
        ctx.closePath();
        ctx.fill();
        const action =
          snapshot.mode === 'loop'
            ? index === count - 2
              ? '输出答案'
              : `工具 ${index + 1} · 宿主`
            : index === 0
              ? 'execute_typescript'
              : '宿主执行工具';
        ctx.fillStyle = '#475569';
        ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'center';
        const label =
          action.length > 14 ? action.slice(0, 13) + '…' : action;
        ctx.fillText(label, (from + to) / 2 + 2, midY - 10);
        ctx.textAlign = 'left';
      }
    });

    // 中部：每轮输入 token 柱（只看模型轮次，体现上下文堆积速度）
    const barTop = boxY + boxH + 46;
    const barMaxH = 66;
    const maxInput = Math.max(
      ...snapshot.nodes.map((node) => node.inputTokens),
      1,
    );
    const barColor = snapshot.mode === 'loop' ? '#38bdf8' : '#34d399';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, barTop + barMaxH);
    ctx.lineTo(startX + totalW, barTop + barMaxH);
    ctx.stroke();
    ctx.fillStyle = '#64748b';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('每轮输入 token（示意）', startX, barTop - 10);

    snapshot.nodes.forEach((node, index) => {
      if (node.inputTokens <= 0) return;
      const h = Math.max(6, (node.inputTokens / maxInput) * barMaxH);
      const barW = Math.min(44, boxW * 0.62);
      const cx = centers[index];
      ctx.fillStyle = barColor;
      ctx.fillRect(cx - barW / 2, barTop + barMaxH - h, barW, h);
      ctx.fillStyle = '#334155';
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(node.inputTokens), cx, barTop + barMaxH - h - 5);
      ctx.textAlign = 'left';
    });

    // 底部：累计开销与工具执行位置
    const stripY = barTop + barMaxH + 22;
    roundRect(20, stripY, width - 40, height - stripY - 18, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      `模型往返 ${snapshot.modelRounds} 轮 · 累计 token（示意）${snapshot.totalTokens.toLocaleString('zh-Hans-CN')}`,
      34,
      stripY + 24,
    );
    ctx.fillStyle = '#64748b';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    const growthNote =
      snapshot.mode === 'loop'
        ? '每轮重发全部历史工具结果，累计输入随工具数二次增长'
        : '上下文只含工具目录与聚合结果，随工具数线性增长';
    ctx.fillText(growthNote, 34, stripY + 44);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#475569';
    ctx.fillText(`工具执行位置：${snapshot.toolExec}`, width - 34, stripY + 24);
    ctx.textAlign = 'left';

    emit(snapshot);
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
