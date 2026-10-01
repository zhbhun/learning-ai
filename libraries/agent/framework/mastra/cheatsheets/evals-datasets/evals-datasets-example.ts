/*
演示内容：「实验矩阵」离线示意——固定版本的数据集逐项跑过 gates 与 threshold scorer，按官方规则合成 verdict。
输入：数据集版本 v1/v2/v3（SCD-2 修订越新质量越高）、scorer 组合（gates + threshold / 仅 gates / 仅 threshold）、helpfulness 的 threshold。
操作：切换控件，矩阵与读数即时重算；离线示意，不调用真实 LLM / 存储。
预期结果：v1 有 gate 均分 < 1.0 → failed；v2 gate 全过但 helpfulness 未达 threshold → scored；v3 全达标 → passed；
「仅 gates」组合 verdict 只会在 passed/failed 之间；「仅 threshold」永远不会因 gate 失败。
阅读主线：SCORES → runExperiment()（gate 均分必须 1.0 → threshold → verdict）→ drawMatrix / drawVerdict。
*/
import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export interface MatrixArgs {
  datasetVersion: 1 | 2 | 3;
  scorerCombo: 'gates-threshold' | 'gates-only' | 'threshold-only';
  threshold: number;
}

export interface MatrixSnapshot {
  verdict: 'passed' | 'scored' | 'failed';
  gateAvg: number; thrAvg: number; itemsPassingGates: number;
}

const ITEMS = ['天气问询', '翻译短句', '摘要生成', '数值计算', '拒答回答'];
const SCORERS = ['calledTool', 'noToolErrors', 'helpfulness', 'includes'];

// 各版本用例的离线示意得分 [calledTool(gate), noToolErrors(gate), helpfulness, includes(tracked only)]：
// v1 两条用例各挂一个 gate（工具 mock 缺失 / 工具报错）；v2 gate 全过但 helpfulness 参差；v3 修订后全部达标。
const SCORES: Record<number, number[][]> = {
  1: [[1, 1, 0.55, 1], [0, 1, 0.4, 0], [1, 1, 0.62, 1], [1, 0, 0.3, 0], [1, 1, 0.48, 1]],
  2: [[1, 1, 0.72, 1], [1, 1, 0.65, 1], [1, 1, 0.8, 1], [1, 1, 0.58, 0], [1, 1, 0.66, 1]],
  3: [[1, 1, 0.88, 1], [1, 1, 0.91, 1], [1, 1, 0.84, 1], [1, 1, 0.79, 1], [1, 1, 0.86, 1]],
};

// 判定顺序照官方文档：任一 gate 均分 < 1.0 → failed；gate 全过但有 threshold 未达 → scored；否则 passed。
export function runExperiment(args: MatrixArgs) {
  const rows = SCORES[args.datasetVersion];
  const useGates = args.scorerCombo !== 'threshold-only';
  const useThreshold = args.scorerCombo !== 'gates-only';
  const avg = (col: number) => rows.reduce((t, r) => t + r[col], 0) / rows.length;
  const gateAvg = useGates ? Math.min(avg(0), avg(1)) : 1;
  const thrAvg = avg(2);
  const verdict: MatrixSnapshot['verdict'] = useGates && gateAvg < 1 ? 'failed' : useThreshold && thrAvg < args.threshold ? 'scored' : 'passed';
  return { rows, useGates, useThreshold, gateAvg, thrAvg, verdict, itemsPassingGates: rows.filter((r) => r[0] === 1 && r[1] === 1).length };
}

export function createMatrixExample(canvas: HTMLCanvasElement, emit: (s: MatrixSnapshot) => void) {
  const ctx = canvas.getContext('2d')!;
  let args: MatrixArgs = { datasetVersion: 1, scorerCombo: 'gates-threshold', threshold: 0.7 };
  const observer = createResizeObserver(canvas, draw);
  const VERDICT_COLOR = { passed: '#059669', scored: '#d97706', failed: '#dc2626' } as const;
  const scoreColor = (v: number, gate: boolean) => gate ? (v === 1 ? '#dcfce7' : '#fee2e2') : v >= args.threshold ? '#dcfce7' : v >= args.threshold - 0.25 ? '#fef3c7' : '#fee2e2';

  function draw() {
    const { width: w, height: h } = readCanvasSize(canvas);
    canvas.width = w; canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    const run = runExperiment(args);
    emit({ verdict: run.verdict, gateAvg: run.gateAvg, thrAvg: run.thrAvg, itemsPassingGates: run.itemsPassingGates });
    drawMatrix(run, w);
    drawVerdict(run, w);
  }

  function drawMatrix(run: ReturnType<typeof runExperiment>, w: number) {
    const m = 16, labelW = 86, statusW = 118, top = 58, rh = 30;
    const cw = (w - m * 2 - labelW - statusW) / 4;
    ctx.fillStyle = '#0f172a'; ctx.font = '600 13px system-ui';
    ctx.fillText(`实验矩阵 · 数据集 v${args.datasetVersion} · ${run.rows.length} 条用例`, m, 26);
    const heads = ['用例', ...SCORERS, 'gate 达标'];
    heads.forEach((t, i) => {
      const x = i === 0 ? m : m + labelW + (i - 1) * cw;
      ctx.fillStyle = '#475569'; ctx.font = '11px system-ui';
      ctx.fillText(t, x + 4, top - 8, (i === 0 ? labelW : i > 4 ? statusW : cw) - 8);
    });
    run.rows.forEach((row, r) => {
      const y = top + r * rh;
      ctx.fillStyle = r % 2 ? '#f8fafc' : '#ffffff';
      ctx.fillRect(m, y, w - m * 2, rh - 2);
      ctx.fillStyle = '#0f172a'; ctx.font = '12px system-ui';
      ctx.fillText(ITEMS[r], m + 4, y + 19);
      row.forEach((v, c) => {
        const x = m + labelW + c * cw;
        ctx.fillStyle = scoreColor(v, c < 2);
        ctx.fillRect(x + 3, y + 3, cw - 10, rh - 9);
        ctx.fillStyle = c === 3 ? '#64748b' : '#0f172a'; ctx.font = '600 12px ui-monospace, monospace';
        ctx.fillText(v === 1 ? '1' : v.toFixed(2), x + 10, y + 20);
      });
      const ok = row[0] === 1 && row[1] === 1;
      ctx.fillStyle = ok ? '#059669' : '#dc2626'; ctx.font = '600 11px system-ui';
      ctx.fillText(ok ? '通过' : '拖垮 gate 均分', m + labelW + 4 * cw + 6, y + 19, statusW - 10);
    });
  }

  function drawVerdict(run: ReturnType<typeof runExperiment>, w: number) {
    const m = 16, y0 = 236, barX = m + 190, barW = w - barX - m - 34;
    ctx.fillStyle = VERDICT_COLOR[run.verdict]; ctx.fillRect(m, y0, 96, 32);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 15px system-ui';
    ctx.fillText(run.verdict, m + 18, y0 + 22);
    ctx.fillStyle = '#0f172a'; ctx.font = '600 12px system-ui';
    ctx.fillText('gate 均分（必须 = 1.0）', m, y0 + 62);
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(barX, y0 + 51, barW, 14);
    ctx.fillStyle = run.gateAvg === 1 ? '#059669' : '#dc2626';
    ctx.fillRect(barX, y0 + 51, barW * run.gateAvg, 14);
    ctx.fillStyle = '#0f172a'; ctx.fillText(run.gateAvg.toFixed(2), barX + barW + 6, y0 + 63);
    ctx.fillText(`helpfulness 均分 ${run.thrAvg.toFixed(2)}（阈值 ${args.threshold.toFixed(2)}）`, m, y0 + 92);
    ctx.fillStyle = '#e2e8f0'; ctx.fillRect(barX, y0 + 81, barW, 14);
    ctx.fillStyle = run.thrAvg >= args.threshold ? '#059669' : '#d97706';
    ctx.fillRect(barX, y0 + 81, barW * Math.min(run.thrAvg, 1), 14);
    ctx.fillStyle = '#334155'; ctx.fillRect(barX + barW * args.threshold, y0 + 77, 2, 22);
    ctx.fillStyle = '#475569'; ctx.font = '11px system-ui';
    ctx.fillText(run.useGates
      ? `规则：gate 均分 < 1.0 → failed；gate 全过但 threshold 未达 → scored。gate 达标用例 ${run.itemsPassingGates}/${run.rows.length}。`
      : '本组合未传 gates：verdict 只会是 passed / scored，永远不会 failed。', m, y0 + 120, w - m * 2);
    ctx.fillText('includes 无 threshold：仅追踪（result.scores），不参与 verdict 判定。', m, y0 + 140, w - m * 2);
  }

  draw();
  return {
    update(next: MatrixArgs) { args = next; draw(); },
    dispose() { observer.disconnect(); },
  };
}
