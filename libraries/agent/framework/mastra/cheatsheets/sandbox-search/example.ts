/**
 * 范例介绍：离线对照 Workspace 三种检索模式（bm25 / vector / hybrid）的命中排序差异。
 * 输入：预设查询词、检索模式、hybrid 的 vectorWeight；操作：切换任一控件观察三列 Top 3。
 * 预期：bm25 只认字面关键词，vector 按语义排序，hybrid 按 vectorWeight 加权两者；
 *       bm25 是原始分（不限于 0–1），与 vector / hybrid 分数不可直接比较。
 * 阅读主线：QUERIES 手调打分表 → scoreFor() 三种合成方式 → 三列排名绘制。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type SearchMode = 'bm25' | 'vector' | 'hybrid';

export interface SearchOptions { query: string; mode: SearchMode; vectorWeight: number; }

export interface ModeTop { id: string; score: number; }

export interface SearchSnapshot { tops: Record<SearchMode, ModeTop>; }

export interface SearchInstance { update(options: SearchOptions): void; dispose(): void; }

const DOCS = [
  'src/auth.ts',
  'src/useAuth.ts',
  'docs/auth.md',
  'src/server.ts',
  'test/login.test.ts',
];

// 离线示意打分：每个查询给各文档手调的 bm25（原始分）与 vector（0–1）分量。
const QUERIES: Record<string, { bm25: number[]; vec: number[] }> = {
  auth: { bm25: [4.2, 2.8, 1.9, 0.3, 1.2], vec: [0.82, 0.74, 0.88, 0.31, 0.66] },
  'useState hook': { bm25: [0.2, 3.9, 0.1, 0.2, 0.4], vec: [0.35, 0.71, 0.28, 0.18, 0.22] },
  如何处理用户登录鉴权: { bm25: [0, 0, 0.6, 0, 0.3], vec: [0.86, 0.79, 0.83, 0.12, 0.71] },
};

const MODES: SearchMode[] = ['bm25', 'vector', 'hybrid'];

// hybrid 的合成方式：对 BM25 做 min-max 归一化，再按 vectorWeight 与向量分加权。
function scoreFor(query: string, mode: SearchMode, vectorWeight: number): ModeTop[] {
  const raw = QUERIES[query] ?? QUERIES.auth;
  const min = Math.min(...raw.bm25);
  const span = Math.max(...raw.bm25) - min || 1;
  return DOCS.map((id, i) => ({
    id,
    score:
      mode === 'bm25' ? raw.bm25[i]
      : mode === 'vector' ? raw.vec[i]
      : (1 - vectorWeight) * ((raw.bm25[i] - min) / span) + vectorWeight * raw.vec[i],
  })).sort((a, b) => b.score - a.score);
}

export function createSearchCompare(
  canvas: HTMLCanvasElement,
  emit: (snapshot: SearchSnapshot) => void,
): SearchInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;
  let current: SearchOptions = { query: 'auth', mode: 'hybrid', vectorWeight: 0.5 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const rankings = Object.fromEntries(
      MODES.map((m) => [m, scoreFor(current.query, m, current.vectorWeight).slice(0, 3)]),
    ) as Record<SearchMode, ModeTop[]>;

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`查询「${current.query}」— 三种模式的 Top 3`, 24, 34);

    const margin = 24, gap = 12;
    const colWidth = (width - margin * 2 - gap * 2) / 3;
    MODES.forEach((mode, col) => {
      const x = margin + col * (colWidth + gap);
      const active = mode === current.mode;
      ctx.fillStyle = active ? '#4f7cff' : '#e2e8f0';
      ctx.fillRect(x, 52, colWidth, 26);
      ctx.fillStyle = active ? '#ffffff' : '#334155';
      ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(mode, x + 10, 70);

      const tops = rankings[mode];
      const max = tops[0].score || 1;
      tops.forEach((top, row) => {
        const y = 96 + row * 44;
        const barWidth = Math.max(2, (top.score / max) * (colWidth - 8));
        ctx.fillStyle = active ? '#4f7cff' : '#cbd5e1';
        ctx.fillRect(x, y, barWidth, 12);
        ctx.fillStyle = '#334155';
        ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(top.id, x, y + 26);
        ctx.fillStyle = '#64748b';
        ctx.fillText(top.score.toFixed(2), x + colWidth - 34, y + 26);
      });
    });

    emit({ tops: { bm25: rankings.bm25[0], vector: rankings.vector[0], hybrid: rankings.hybrid[0] } });
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
