/*
演示内容：「检查分层」离线示意——快检层（零 LLM quick checks）与 LLM 评分层在同一评估管道先后把关。
输入：用例场景（正常回答/漏写关键信息/调错工具/语义偏差）、快检层与 LLM 评分层两个开关。
操作：切换控件即时重算；快检层真实执行并计时（微秒级），LLM 层为离线示意（固定分数与秒级耗时，不调用真实模型）。
预期结果：确定性错误（漏关键词、调错工具）被快检层 1/0 拦截、LLM 层跳过；语义偏差骗过快检层只有 LLM 层拦得住；两层全关则不评估。
阅读主线：runLayers()（快检短路 → LLM 补位 → verdict）→ draw() 的管道 / 判定 / 耗时对照三段。
*/
import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export interface LayerArgs { scenario: 'normal' | 'missing' | 'wrongTool' | 'semantic'; quickChecks: boolean; llmScorer: boolean; }
export interface LayerSnapshot { quickLabel: string; quickUs: number | null; llmLabel: string; llmMs: number | null; verdict: string; }
// 各场景的离线 agent 运行结果：output 是回答文本，tools 是实际调用的工具。
const RUNS = {
  normal: { label: '正常回答', output: '伦敦今天小雨，气温 18°C，建议带伞。', tools: ['weather'] },
  missing: { label: '漏写关键信息', output: '今天天气不错，适合出行。', tools: ['weather'] },
  wrongTool: { label: '调错工具', output: '伦敦今天小雨，气温 18°C。', tools: ['calendar'] },
  semantic: { label: '语义偏差', output: '伦敦今天晴，气温 24°C，适合出行。', tools: ['weather'] },
};
// 快检层固定一组确定性断言（文本 includes + 工具 calledTool/noToolErrors），与官方 checks 同形：只输出 1 或 0。
const QUICK_CHECKS = [
  { name: "includes('伦敦')", run: (o: string) => (o.includes('伦敦') ? 1 : 0) },
  { name: "includes('气温')", run: (o: string) => (o.includes('气温') ? 1 : 0) },
  { name: "calledTool('weather')", run: (_o: string, t: string[]) => (t.includes('weather') ? 1 : 0) },
  { name: 'noToolErrors()', run: () => 1 },
];
// LLM 评分层离线示意：固定分数与秒级耗时。文本评分器看不到工具调用，确定性缺漏会从这里逃逸。
const LLM: Record<keyof typeof RUNS, { score: number; ms: number; why: string }> = {
  normal: { score: 0.92, ms: 1800, why: '回答与问题语义匹配（示意）' },
  missing: { score: 0.85, ms: 1750, why: '文本通顺——确定性缺漏从这里逃逸' },
  wrongTool: { score: 0.82, ms: 1700, why: '文本评分看不到工具调用' },
  semantic: { score: 0.55, ms: 1900, why: '编造与数据不符的天气（示意）' },
};
const THRESHOLD = 0.7; // LLM 层示意阈值

// 判定主线：快检层短路在前（拦截即跳过 LLM 调用），LLM 层只对快检放行的用例补位语义判断。
export function runLayers(args: LayerArgs) {
  const run = RUNS[args.scenario];
  const quick = !args.quickChecks ? null : (() => {
    const t0 = performance.now();
    const results = QUICK_CHECKS.map((c) => ({ name: c.name, pass: c.run(run.output, run.tools) === 1 }));
    return { results, us: Math.max((performance.now() - t0) * 1000, 0.1), failed: results.find((r) => !r.pass)?.name ?? null };
  })();
  const llm = args.llmScorer && !quick?.failed ? LLM[args.scenario] : null;
  const verdict = !args.quickChecks && !args.llmScorer ? '未评估' : quick?.failed ? '快检拦截' : llm ? (llm.score >= THRESHOLD ? '通过' : '评分拦截') : '通过（仅快检）';
  return { run, quick, llm, verdict };
}

export function createLayeredChecks(canvas: HTMLCanvasElement, emit: (s: LayerSnapshot) => void) {
  const ctx = canvas.getContext('2d')!;
  let args: LayerArgs = { scenario: 'normal', quickChecks: true, llmScorer: true };
  const observer = createResizeObserver(canvas, draw);
  function card(x: number, y: number, w: number, h: number, color: string, dashed: boolean, title: string, right: string) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; if (dashed) ctx.setLineDash([5, 4]); ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
    ctx.fillStyle = color; ctx.font = '600 12px system-ui'; ctx.fillText(title, x + 10, y + 20, w - 130);
    ctx.fillStyle = '#64748b'; ctx.font = '11px system-ui'; ctx.textAlign = 'right'; ctx.fillText(right, x + w - 10, y + 20); ctx.textAlign = 'left';
  }
  function draw() {
    const { width: w, height: h } = readCanvasSize(canvas);
    canvas.width = w; canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    const out = runLayers(args);
    emit({
      quickLabel: out.quick ? (out.quick.failed ? `拦截 · ${out.quick.failed}` : '通过 4/4') : '关闭', quickUs: out.quick?.us ?? null,
      llmLabel: !args.llmScorer ? '关闭' : out.llm ? `均分 ${out.llm.score.toFixed(2)} · ${out.llm.score >= THRESHOLD ? '达标' : '未达标'}` : '跳过（快检已拦截）', llmMs: out.llm?.ms ?? null,
      verdict: out.verdict,
    });
    // —— 管道：快检层 → LLM 评分层 ——
    const m = 16, top = 34, ch = 150, gap = 40, cw = (w - m * 2 - gap) / 2;
    ctx.fillStyle = '#0f172a'; ctx.font = '600 13px system-ui'; ctx.fillText(`检查分层 · 场景「${out.run.label}」`, m, 22);
    card(m, top, cw, ch, out.quick ? (out.quick.failed ? '#dc2626' : '#059669') : '#94a3b8', !out.quick, '① 快检层 · quick checks（零 LLM）', out.quick ? `${out.quick.us.toFixed(1)} μs（实测）` : '已关闭');
    out.quick?.results.forEach((r, i) => { ctx.fillStyle = r.pass ? '#059669' : '#dc2626'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText(`${r.name} → ${r.pass ? 1 : 0}`, m + 14, top + 42 + i * 22); });
    const ay = top + ch / 2, ax2 = m + cw + gap - 5;
    ctx.strokeStyle = ctx.fillStyle = out.quick?.failed ? '#dc2626' : '#94a3b8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(m + cw + 5, ay); ctx.lineTo(ax2 - 8, ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax2, ay); ctx.lineTo(ax2 - 9, ay - 4); ctx.lineTo(ax2 - 9, ay + 4); ctx.fill();
    if (out.quick?.failed) { ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('拦截', (m + cw + 5 + ax2) / 2, ay - 8); ctx.textAlign = 'left'; }
    const x2 = m + cw + gap;
    card(x2, top, cw, ch, out.llm ? (out.llm.score >= THRESHOLD ? '#059669' : '#d97706') : args.llmScorer ? '#dc2626' : '#94a3b8', !out.llm, '② LLM 评分层（语义 · 示意）', out.llm ? `≈${(out.llm.ms / 1000).toFixed(1)} s` : args.llmScorer ? '已跳过' : '已关闭');
    if (out.llm) {
      const bx = x2 + 12, bw = cw - 24, by = top + 48;
      ctx.fillStyle = '#334155'; ctx.font = '600 12px system-ui'; ctx.fillText(`语义均分 ${out.llm.score.toFixed(2)} / 阈值 ${THRESHOLD}`, bx, by - 10);
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(bx, by, bw, 14); ctx.fillStyle = out.llm.score >= THRESHOLD ? '#059669' : '#d97706'; ctx.fillRect(bx, by, bw * out.llm.score, 14);
      ctx.fillStyle = '#334155'; ctx.fillRect(bx + bw * THRESHOLD, by - 4, 2, 22);
      ctx.fillStyle = '#475569'; ctx.font = '11px system-ui'; ctx.fillText(out.llm.why, bx, by + 34, bw);
      ctx.fillText(out.llm.score >= THRESHOLD ? '语义达标 → 放行' : '语义未达阈值 → 评分拦截', bx, by + 54, bw);
    } else { ctx.fillStyle = args.llmScorer ? '#b91c1c' : '#64748b'; ctx.font = '12px system-ui'; ctx.fillText(args.llmScorer ? '已跳过：快检已拦截，省一次 LLM 调用' : '语义质量未参与本次评估', x2 + 14, top + 64); }
    // —— 判定与规则 ——
    const y0 = top + ch + 24;
    ctx.fillStyle = { 未评估: '#64748b', 快检拦截: '#dc2626', 评分拦截: '#d97706', 通过: '#059669', '通过（仅快检）': '#059669' }[out.verdict] ?? '#64748b';
    ctx.fillRect(m, y0, 118, 30);
    ctx.fillStyle = '#ffffff'; ctx.font = '700 14px system-ui'; ctx.fillText(out.verdict, m + 12, y0 + 20);
    ctx.fillStyle = '#475569'; ctx.font = '12px system-ui';
    ctx.fillText(out.verdict === '快检拦截' ? '确定性错误在第一层被拦下，LLM 层直接跳过——分层的省钱逻辑'
      : out.verdict === '评分拦截' ? '快检全过但语义不达标：1/0 断言管不住「说得对不对」' : out.verdict === '通过' ? '快检 1/0 全过 + 语义达标 → verdict 通过'
      : out.verdict === '通过（仅快检）' ? 'LLM 层已关闭：确定性门通过即放行' : '两层全关：本次运行没有任何质量判断', m + 132, y0 + 19, w - m - 140);
    // —— 耗时对照（对数轴）：同为把关，相差约 6 个数量级 ——
    const y1 = y0 + 54, ax = m + 8, aw = w - ax - m - 8, ty = y1 + 24;
    const pos = (us: number) => ax + aw * ((Math.log10(us) + 1) / 8); // 0.1 μs ~ 10 s 对数刻度
    ctx.fillStyle = '#0f172a'; ctx.font = '600 12px system-ui'; ctx.fillText('耗时对照（对数轴）', m, y1);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax, ty); ctx.lineTo(ax + aw, ty); ctx.stroke();
    const mark = (us: number, color: string, text: string) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(pos(us), ty, 5, 0, 7); ctx.fill(); ctx.font = '600 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(text, pos(us), ty - 10); ctx.textAlign = 'left'; };
    if (out.quick) mark(out.quick.us, '#059669', `快检层 ${out.quick.us.toFixed(1)} μs（实测）`);
    if (out.llm) mark(out.llm.ms * 1000, '#d97706', `LLM 层 ≈${(out.llm.ms / 1000).toFixed(1)} s（示意）`);
  }
  draw();
  return {
    update(next: LayerArgs) { args = next; draw(); },
    dispose() { observer.disconnect(); },
  };
}
