/**
 * 范例介绍：离线示意 Mastra 多轮评估的逐轮断言与整体 verdict（不调用真实 LLM）。
 * 输入：对话轮数（1~4）、目标轮（第 2 轮）答案质量、判定阈值 threshold。
 * 操作：拖动控件改变轮数与质量，观察每轮的 gates / scorers 断言标记。
 * 预期：质量过低时目标轮先「gate 失败」（整体 failed），再「阈值未达」（整体 scored），
 *       各轮都达标时整体 verdict 为 passed。
 * 阅读主线：每轮一行断言 → 底部 verdict 汇总，对应正文 turns 数组与 result.turnResults。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface MultiTurnExampleOptions {
  turns: number;
  quality: number;
  threshold: number;
}

export interface MultiTurnExampleSnapshot {
  turns: number;
  quality: number;
  verdict: 'passed' | 'scored' | 'failed';
}

export interface MultiTurnExampleInstance {
  update(options: MultiTurnExampleOptions): void;
  dispose(): void;
}

type TurnState = '通过' | '阈值未达' | 'gate 失败';

const COLORS = { text: '#172033', muted: '#475569', track: '#e2e8f0', accent: '#4f7cff', pass: '#16a34a', warn: '#d97706', fail: '#dc2626' };

// 其余轮次使用固定基线质量，仅第 2 轮（索引 1）由「目标轮答案质量」控件驱动
const BASE_SCORES = [0.92, 0, 0.85, 0.78];

export function createMultiTurnExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: MultiTurnExampleSnapshot) => void,
): MultiTurnExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: MultiTurnExampleOptions = { turns: 3, quality: 0.8, threshold: 0.6 };

  // 示意映射：quality < 0.3 视为目标轮 gate 失败，否则按 score 与 threshold 比较
  function evaluateTurns(): { score: number; state: TurnState }[] {
    const rows: { score: number; state: TurnState }[] = [];
    rows.push({ score: 1, state: '通过' }); // 第 1 轮 gates: calledTool，示意恒过
    for (let i = 1; i < current.turns; i++) {
      const score = i === 1 ? current.quality : BASE_SCORES[i];
      if (i === 1 && current.quality < 0.3) {
        rows.push({ score, state: 'gate 失败' });
      } else {
        rows.push({ score, state: score >= current.threshold ? '通过' : '阈值未达' });
      }
    }
    return rows;
  }

  function verdictOf(rows: { state: TurnState }[]): MultiTurnExampleSnapshot['verdict'] {
    if (rows.some((row) => row.state === 'gate 失败')) return 'failed';
    if (rows.some((row) => row.state === '阈值未达')) return 'scored';
    return 'passed';
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

    const rows = evaluateTurns();
    const verdict = verdictOf(rows);

    ctx.fillStyle = COLORS.text;
    ctx.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('同一 thread 顺序发轮次，逐轮断言后汇总 verdict（离线示意）', 40, 44);

    rows.forEach((row, i) => {
      const y = 76 + i * 58;
      const trackW = Math.min(280, width - 320);
      ctx.fillStyle = COLORS.text;
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(i === 1 ? '第 2 轮（目标轮）' : `第 ${i + 1} 轮`, 40, y + 20);
      ctx.fillStyle = COLORS.track;
      ctx.fillRect(40, y + 30, trackW, 12);
      ctx.fillStyle = row.state === 'gate 失败' ? COLORS.fail : COLORS.accent;
      ctx.fillRect(40, y + 30, Math.max(2, trackW * row.score), 12);
      ctx.fillStyle = COLORS.muted;
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      const detail = i === 0
        ? 'gates: calledTool'
        : `scorers: similarity ${row.score.toFixed(2)} / threshold ${current.threshold.toFixed(2)}`;
      ctx.fillText(detail, 40 + trackW + 16, y + 20);
      ctx.fillStyle = row.state === '通过' ? COLORS.pass : row.state === '阈值未达' ? COLORS.warn : COLORS.fail;
      ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(row.state, 40 + trackW + 16, y + 38);
    });

    ctx.fillStyle = COLORS.muted;
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('run.input = 第 1 轮输入；run.output = 全部轮次累积输出', 40, height - 64);

    const verdictColor = verdict === 'passed' ? COLORS.pass : verdict === 'scored' ? COLORS.warn : COLORS.fail;
    ctx.fillStyle = verdictColor;
    ctx.font = '700 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`整体 verdict: ${verdict}`, 40, height - 32);

    emit({ turns: current.turns, quality: current.quality, verdict });
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
