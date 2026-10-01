// 演示：RAG 五步管道离线示意（加载 → 切块 → 嵌入 → 入库 → 检索）。
// 输入：「文档段数」生成样例文档；「站点」单选步进五站；「topK」控制检索命中数。
// 操作：切换站点，观察每站数据形态变化：文本 → 块 → 向量 → 库中行 → 命中。
// 预期：走过的站点点亮；读数给出块数、示意维度与命中数（真实嵌入为 1536 维）。
// 阅读主线：buildDoc / chunkDoc / 向量与相似度 / 五站数据车道，全部离线模拟。

import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export interface RagArgs { stage: string; paragraphs: number; topK: number; }
export interface RagSnapshot { site: string; chunks: number; dim: number; hits: number; }
export interface RagInstance { update(args: RagArgs): void; dispose(): void; }

const SITES = ['加载', '切块', '嵌入', '入库', '检索'];
const SUBS = ['MDocument.fromText', 'doc.chunk()', 'embedMany', 'upsert()', 'query()'];
const DIM = 8; // 示意维度：真实 text-embedding-3-small 为 1536 维
const TOPICS = ['安装与环境', '切块策略', '嵌入模型', '入库索引', '检索重排', '生产部署'];
function rng(seed: number) { // 固定种子伪随机：同一块每次渲染结果一致
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const qg = rng(42), QUERY = Array.from({ length: DIM }, () => qg() * 2 - 1); // 模拟查询向量
// 模拟 MDocument.fromText：段落文档（len 决定切块数）
function buildDoc(paras: number) {
  return Array.from({ length: paras }, (_, i) => {
    const r = rng(100 + i * 13);
    return { len: 70 + Math.floor(r() * 90), topic: TOPICS[i % TOPICS.length] };
  });
}
// 模拟 doc.chunk()：每段按固定块长 48 切块，块向量由种子生成
function chunkDoc(paras: number) {
  return buildDoc(paras).flatMap((d, i) =>
    Array.from({ length: Math.ceil(d.len / 48) }, (_, j) => {
      const v = rng(1000 + i * 100 + j);
      return { label: `${d.topic}·${j + 1}`, vec: Array.from({ length: DIM }, () => v() * 2 - 1) };
    }),
  );
}
export function createRag(canvas: HTMLCanvasElement, emit: (s: RagSnapshot) => void): RagInstance {
  const ctx = canvas.getContext('2d')!;
  let args: RagArgs = { stage: '切块', paragraphs: 4, topK: 3 };
  const rr = (x: number, y: number, w: number, h: number, r: number) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
  const vecRow = (x: number, y: number, vec: number[]) => vec.forEach((v, k) => { ctx.fillStyle = v > 0 ? '#3b82f6' : '#f59e0b'; ctx.fillRect(x + k * 14, y, 12, 12); });

  function draw() {
    const { width: W, height: H } = readCanvasSize(canvas);
    const chunks = chunkDoc(args.paragraphs);
    const site = Math.max(1, SITES.indexOf(args.stage) + 1);
    const scored = chunks.map((c) => ({ c, s: dot(c.vec, QUERY) })).sort((a, b) => b.s - a.s);
    const hits = site === 5 ? scored.slice(0, Math.min(args.topK, chunks.length)) : [];
    emit({ site: SITES[site - 1], chunks: chunks.length, dim: DIM, hits: hits.length });
    ctx.clearRect(0, 0, W, H);
    // 五站流程条：走过的站点点亮，当前站高亮
    const bw = (W - 120) / 5, by = 24, bh = 52;
    ctx.textAlign = 'center';
    SITES.forEach((name, i) => {
      const x = 20 + i * (bw + 20), cur = i + 1 === site;
      ctx.fillStyle = cur ? '#bfdbfe' : i + 1 < site ? '#dbeafe' : '#f1f5f9';
      rr(x, by, bw, bh, 8); ctx.fill();
      ctx.strokeStyle = cur ? '#2563eb' : '#94a3b8'; ctx.lineWidth = cur ? 2 : 1;
      rr(x, by, bw, bh, 8); ctx.stroke();
      ctx.fillStyle = i + 1 <= site ? '#1e3a8a' : '#64748b';
      ctx.font = '13px sans-serif'; ctx.fillText(name, x + bw / 2, by + 21);
      ctx.font = '10px monospace'; ctx.fillStyle = '#64748b'; ctx.fillText(SUBS[i], x + bw / 2, by + 39);
      if (i < 4) { ctx.beginPath(); ctx.moveTo(x + bw + 4, by + bh / 2); ctx.lineTo(x + bw + 16, by + bh / 2); ctx.strokeStyle = '#94a3b8'; ctx.stroke(); }
    });
    // 数据车道：当前站点的产物形态
    const y0 = 108, lh = H - y0 - 16;
    ctx.textAlign = 'left';
    if (site === 1) { // 段落条：长度与字数成正比
      buildDoc(args.paragraphs).forEach((d, i) => {
        const y = y0 + 6 + i * 26;
        ctx.fillStyle = '#93c5fd'; rr(24, y, (W - 48) * (d.len / 160), 18, 4); ctx.fill();
        ctx.fillStyle = '#1e3a8a'; ctx.font = '11px sans-serif'; ctx.fillText(`段${i + 1} ${d.topic} · ${d.len} 字`, 32, y + 13);
      });
    } else if (site === 2) { // 块卡片网格：块数由段长与块长共同决定
      const cols = Math.floor((W - 48) / 112);
      chunks.forEach((c, i) => {
        const x = 24 + (i % cols) * 112, y = y0 + 6 + Math.floor(i / cols) * 28;
        ctx.fillStyle = '#dbeafe'; rr(x, y, 104, 20, 4); ctx.fill();
        ctx.fillStyle = '#1e40af'; ctx.font = '11px sans-serif'; ctx.fillText(`块${i + 1} ${c.label}`, x + 8, y + 14);
      });
    } else { // 嵌入/入库/检索：向量行（蓝为正、橙为负）
      let y = y0 + 6;
      if (site >= 4) { // 入库起外套向量库框
        ctx.fillStyle = '#f8fafc'; rr(16, y0, W - 32, lh, 8); ctx.fill();
        ctx.strokeStyle = '#cbd5e1'; rr(16, y0, W - 32, lh, 8); ctx.stroke();
        ctx.fillStyle = '#334155'; ctx.font = '11px monospace'; ctx.fillText('PgVector · indexName: "embeddings"', 28, y0 + 16);
        y += 26;
      }
      if (site === 5) { // 检索：查询向量在前，块按相似度排序
        vecRow(24, y, QUERY); ctx.fillStyle = '#92400e'; ctx.font = '11px sans-serif'; ctx.fillText('查询向量', 24 + DIM * 14 + 8, y + 11);
        y += 24;
      }
      const show = site === 5 ? scored.map((s) => s.c) : chunks;
      const rh = Math.min(20, (H - y - 20) / Math.max(1, show.length));
      show.forEach((c, i) => {
        const hit = site < 5 || i < hits.length;
        ctx.globalAlpha = hit ? 1 : 0.3;
        vecRow(24, y + i * rh, c.vec);
        const sfx = site === 5 ? (hit ? ` · 相似度 ${scored[i].s.toFixed(2)}` : ' · 未命中') : '';
        ctx.fillStyle = site === 5 ? '#1d4ed8' : '#475569'; ctx.font = '10px sans-serif';
        ctx.fillText(c.label + sfx, 24 + DIM * 14 + 8, y + i * rh + 11);
        ctx.globalAlpha = 1;
      });
    }
  }

  draw();
  const observer = createResizeObserver(canvas, draw);
  return {
    update(next: RagArgs) { args = next; draw(); },
    dispose() { observer.disconnect(); },
  };
}
