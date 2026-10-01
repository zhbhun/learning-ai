// 演示：Goals 目标驱动的多轮评估循环（离线示意，不调用真实 LLM / judge）。
// 输入：maxRuns 预算（1~5 轮）、每轮通过率（judge 打 1 分的基础概率，%）。
// 操作：拖动控件改变预算与通过率；动画逐轮推进：agent 输出 → judge 打分 → 反馈注入。
// 预期：打 1 分 → done；打 0 分且有剩余预算 → 反馈写回线程继续下一轮（反馈注入
//       会让后续轮次通过率上升）；预算耗尽仍未达标 → paused，可恢复继续。
// 阅读主线：左侧线程消息时间线 → 右侧状态面板（轮次 / 状态 / 剩余预算）。
import { createRenderLoop, createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface ExampleArgs { maxRuns: number; passRate: number; }
export interface ExampleSnapshot { round: number; maxRuns: number; status: string; budgetLeft: number; }
export interface ExampleInstance { update(args: ExampleArgs): void; dispose(): void; }

interface Round { n: number; score: 0 | 1; status: 'next' | 'done' | 'paused'; }
const ROUND_SEC = 1.7, HOLD_SEC = 1.4;

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 按控件组合生成确定性逐轮结果：每注入一次反馈，下一轮通过率 +18%
function buildRounds(maxRuns: number, passRate: number): Round[] {
  const rng = mulberry32(maxRuns * 97 + passRate * 13 + 7);
  const rounds: Round[] = [];
  for (let n = 1; n <= maxRuns; n++) {
    const pEff = Math.min(1, passRate / 100 + 0.18 * (n - 1));
    const score: 0 | 1 = rng() < pEff ? 1 : 0;
    rounds.push({ n, score, status: score === 1 ? 'done' : n === maxRuns ? 'paused' : 'next' });
    if (score === 1 || n === maxRuns) break;
  }
  return rounds;
}

export function createExample(canvas: HTMLCanvasElement, emit: (s: ExampleSnapshot) => void): ExampleInstance {
  const ctx = canvas.getContext('2d')!;
  let args: ExampleArgs = { maxRuns: 3, passRate: 55 };
  let rounds = buildRounds(args.maxRuns, args.passRate);
  let t = 0;

  const pill = (x: number, y: number, w: number, h: number, bg: string, label: string, fg = '#ffffff') => {
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = fg; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + h / 2 + 4);
  };

  const draw = () => {
    const { width: w } = readCanvasSize(canvas);
    ctx.clearRect(0, 0, w, 420);
    const total = rounds.length * ROUND_SEC;
    const playing = t < total;
    const idx = Math.min(Math.floor(t / ROUND_SEC), rounds.length - 1);
    const p = playing ? (t - idx * ROUND_SEC) / ROUND_SEC : 1;
    // judge 在每轮 45% 处打分；反馈注入 / 出口判定在 75% 处出现
    const scored = (i: number) => i < idx || (i === idx && p >= 0.45);
    const resolved = (i: number) => i < idx || (i === idx && p >= 0.75);

    pill(24, 28, 360, 30, '#2563eb', '目标：修复所有失败测试（持久挂在线程状态上）');

    rounds.forEach((r, i) => {
      const y = 84 + i * 54;
      if (i > idx) return;
      pill(24, y, 70, 30, '#e5e7eb', `第 ${r.n} 轮`, '#374151');
      pill(106, y, 130, 30, i < idx || p >= 0.12 ? '#64748b' : '#cbd5e1', 'agent 输出');
      if (scored(i)) pill(248, y, 118, 30, r.score === 1 ? '#059669' : '#dc2626', `judge ${r.score} 分`);
      if (resolved(i)) {
        if (r.status === 'next') pill(378, y, 152, 30, '#ea580c', '反馈注入 → 继续');
        else if (r.status === 'done') pill(378, y, 152, 30, '#059669', 'done：达标结束');
        else pill(378, y, 152, 30, '#d97706', 'paused：预算耗尽');
      }
    });

    // 右侧状态面板：轮次 / 状态 / 剩余预算 / 本轮阶段（对应真实 goal chunk 可读内容）
    const px = Math.max(556, w - 264), py = 28;
    ctx.fillStyle = '#f8fafc'; ctx.beginPath(); ctx.roundRect(px, py, w - px - 24, 190, 10); ctx.fill();
    ctx.strokeStyle = '#e2e8f0'; ctx.stroke();
    const scoredCount = rounds.filter((_, i) => scored(i)).length;
    const endAt = rounds.findIndex((r) => r.status !== 'next');
    let status = '评估中';
    if (endAt >= 0 && scoredCount > endAt) {
      status = rounds[endAt].status === 'done' ? 'done：已达标' : 'paused：预算耗尽';
    }
    const budgetLeft = Math.max(0, args.maxRuns - scoredCount);
    const phase = !playing ? '—（回放结束，稍后重播）'
      : p < 0.35 ? 'agent 输出中'
      : p < 0.6 ? 'judge 评估'
      : p < 0.85 ? (rounds[idx].status === 'next' && rounds[idx].score === 0 ? '反馈注入' : '状态判定')
      : '本轮结束';
    ctx.textAlign = 'left'; ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = '#334155';
    ctx.fillText('状态面板', px + 18, py + 28);
    ctx.fillText(`轮次（runsUsed / maxRuns）：${scoredCount} / ${args.maxRuns}`, px + 18, py + 62);
    ctx.fillText(`剩余预算：${budgetLeft} 轮`, px + 18, py + 90);
    ctx.fillText(`本轮阶段：${phase}`, px + 18, py + 118);
    ctx.fillStyle = status.startsWith('done') ? '#059669' : status.startsWith('paused') ? '#d97706' : '#2563eb';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`状态：${status}`, px + 18, py + 156);

    emit({ round: scoredCount, maxRuns: args.maxRuns, status, budgetLeft });
  };

  const loop = createRenderLoop(canvas, (dt: number) => {
    t += dt;
    if (t > rounds.length * ROUND_SEC + HOLD_SEC) t = 0; // 播完后循环重播
    draw();
  });
  const ro = createResizeObserver(canvas, draw);

  return {
    update(next: ExampleArgs) {
      // 改预算或通过率都会重建整条逐轮时间线并重新播放
      if (next.maxRuns !== args.maxRuns || next.passRate !== args.passRate) {
        rounds = buildRounds(next.maxRuns, next.passRate);
        t = 0;
      }
      args = next;
    },
    dispose() { loop.dispose(); ro.disconnect(); },
  };
}
