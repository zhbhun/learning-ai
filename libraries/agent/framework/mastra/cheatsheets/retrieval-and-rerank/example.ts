/**
 * 范例：离线演示「向量召回 → 加权重排 → topK 截断」的命中顺序变化；▲ 为重排后新进 topK 的候选。
 * 操作：切换「仅向量序 / 重排加权」，拖动语义 / 向量 / 位置权重与 topK 滑杆。
 * 预期：语义相关但向量靠后的「生产发布流程」「回滚步骤」重排后进入 topK；权重和不足 1 时按比例归一化（rerank 要求权重和为 1）。
 * 阅读主线：条形按当前排序得分绘制，虚线为 topK 截断线。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type RerankMode = 'vector' | 'rerank';

export interface RerankExampleArgs {
  mode: RerankMode;
  semanticWeight: number;
  vectorWeight: number;
  positionWeight: number;
  topK: number;
}
export interface RerankExampleSnapshot {
  mode: RerankMode;
  first: string;
  selected: number;
  total: number;
  newEntries: number;
}
export interface RerankExampleInstance {
  update(args: RerankExampleArgs): void;
  dispose(): void;
}

interface Candidate { id: string; label: string; vector: number; semantic: number; }

// 查询「如何部署到生产环境？」的示意候选：vector 按原始召回序递减，semantic 为示意语义相关性
const CANDIDATES: Candidate[] = [
  { id: 'c1', label: '部署指南', vector: 0.93, semantic: 0.42 },
  { id: 'c2', label: '环境变量', vector: 0.89, semantic: 0.35 },
  { id: 'c3', label: '日志排查', vector: 0.85, semantic: 0.51 },
  { id: 'c4', label: '生产发布流程', vector: 0.81, semantic: 0.96 },
  { id: 'c5', label: '监控指标', vector: 0.77, semantic: 0.33 },
  { id: 'c6', label: '回滚步骤', vector: 0.73, semantic: 0.78 },
  { id: 'c7', label: '成本优化', vector: 0.69, semantic: 0.12 },
  { id: 'c8', label: '团队协作', vector: 0.65, semantic: 0.21 },
];

const TOTAL = CANDIDATES.length;
// 位置分只由原始向量序决定，排名越靠前越高（position 权重越大越保序）
const positionScore = (rank: number) => (TOTAL - rank) / TOTAL;

export function createRerankExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RerankExampleSnapshot) => void,
): RerankExampleInstance {
  const g = canvas.getContext('2d')!;
  if (!g) throw new Error('当前浏览器不支持 Canvas 2D。');
  let args: RerankExampleArgs = { mode: 'rerank', semanticWeight: 0.5, vectorWeight: 0.3, positionWeight: 0.2, topK: 4 };

  function compute() {
    // rerank 的 weights 要求总和为 1：滑杆原始值先按比例归一化再参与打分
    const sum = args.semanticWeight + args.vectorWeight + args.positionWeight;
    const w = {
      semantic: sum > 0 ? args.semanticWeight / sum : 0,
      vector: sum > 0 ? args.vectorWeight / sum : 0,
      position: sum > 0 ? args.positionWeight / sum : 1,
    };
    const rows = CANDIDATES.map((c, i) => ({
      ...c,
      score: args.mode === 'vector' ? c.vector : w.semantic * c.semantic + w.vector * c.vector + w.position * positionScore(i),
    })).sort((a, b) => b.score - a.score);
    const topK = Math.max(1, Math.min(TOTAL, Math.round(args.topK)));
    const vectorTop = new Set(CANDIDATES.slice(0, topK).map((c) => c.id));
    const newEntries = args.mode === 'rerank' ? rows.slice(0, topK).filter((r) => !vectorTop.has(r.id)).length : 0;
    return { rows, topK, w, newEntries, first: rows[0].label, vectorTop };
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(420, size.width), height = Math.max(420, size.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, width, height);
    const { rows, topK, w, newEntries, first, vectorTop } = compute();

    g.fillStyle = '#172033';
    g.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    g.fillText('候选按当前排序得分排列（示意数据）', 24, 32);
    g.fillStyle = '#64748b';
    g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText(args.mode === 'vector' ? '仅向量序' : `重排加权 · 归一化权重 语义 ${w.semantic.toFixed(2)} / 向量 ${w.vector.toFixed(2)} / 位置 ${w.position.toFixed(2)}`, 24, 52);

    const startY = 78, rowH = 40, barX = 200, barMax = width - barX - 64;
    rows.forEach((row, i) => {
      const top = startY + i * rowH;
      const inTop = i < topK;
      const isNew = args.mode === 'rerank' && inTop && !vectorTop.has(row.id);
      g.fillStyle = '#172033'; g.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      g.fillText(`#${i + 1} ${isNew ? '▲ ' : ''}${row.label}`, 24, top + 14);
      g.fillStyle = '#64748b'; g.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(`向量 ${row.vector.toFixed(2)} · 语义 ${row.semantic.toFixed(2)}`, 24, top + 30);
      g.fillStyle = inTop ? '#e2e8f0' : '#eef2f7';
      g.fillRect(barX, top, barMax, 12);
      g.fillStyle = inTop ? '#4f7cff' : '#cbd5e1';
      g.fillRect(barX, top, Math.max(2, row.score * barMax), 12);
      g.fillStyle = '#334155'; g.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      g.fillText(row.score.toFixed(2), barX + barMax + 8, top + 11);
    });

    // topK 截断线：重排改变的是截断线以内的名单构成
    const cutY = startY + topK * rowH + 2;
    g.strokeStyle = '#94a3b8';
    g.setLineDash([6, 4]);
    g.beginPath(); g.moveTo(24, cutY); g.lineTo(width - 24, cutY); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#94a3b8'; g.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    g.fillText(`topK = ${topK} 截断`, width - 130, cutY + 14);
    g.fillStyle = '#b45309';
    g.fillText(`▲ 重排新进 topK：${newEntries}`, 24, cutY + 14);
    emit({ mode: args.mode, first, selected: topK, total: TOTAL, newEntries });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  return {
    update(next) {
      args = next;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
