// GraphRAG「图谱随机游走」离线示意：文档块为节点、语义相似度为边，查询先命中一个节点，
// 再从命中节点出发做带重启的随机游走，访问次数进入前 topK 的节点成为检索结果。
// 输入：randomWalkSteps（游走步数）/ restartProb（重启概率）/ topK（返回数量）。
// 操作：拖动 Controls 三个滑杆，图上即时重跑一次游走。
// 预期：橙色双圈为命中节点且热度最高；步数越大远端簇越热；重启概率越大越收敛在命中邻域；
//       青色外环为最终选中集合，左下角读数同步显示。
// 边界：纯离线示意，节点与边手工构造，不代表真实嵌入；固定随机种子保证同输入结果稳定。
// 阅读主线：NODES / EDGES 图结构 → runWalk 带重启随机游走 → draw 渲染热度与选中环。
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface WalkArgs { randomWalkSteps: number; restartProb: number; topK: number; }
export interface WalkSnapshot { entry: string; steps: number; selected: string; }
export interface WalkInstance { update(args: WalkArgs): void; dispose(): void; }

// 三个语义簇（N0-N2 / N3-N5 / N6-N8）经桥接节点 N9 相连，N10、N11 挂在图边缘
const NODES = [
  { id: 'N0', x: 130, y: 110 }, { id: 'N1', x: 215, y: 70 }, { id: 'N2', x: 220, y: 175 },
  { id: 'N3', x: 565, y: 90 }, { id: 'N4', x: 645, y: 145 }, { id: 'N5', x: 550, y: 210 },
  { id: 'N6', x: 745, y: 80 }, { id: 'N7', x: 825, y: 150 }, { id: 'N8', x: 740, y: 230 },
  { id: 'N9', x: 415, y: 165 }, { id: 'N10', x: 90, y: 275 }, { id: 'N11', x: 665, y: 50 },
];
const EDGES: Array<[number, number]> = [
  [0, 1], [0, 2], [1, 2], [2, 9], [9, 5], [9, 6], [3, 4], [3, 5], [4, 5],
  [6, 7], [6, 8], [7, 8], [0, 10], [8, 10], [3, 11],
];
const ENTRY = 0; // 向量相似度命中的节点（示意固定为 N0）

// 固定种子的简易随机数：同输入重跑结果稳定
function rng(seed: number) {
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

function neighborsOf(i: number): number[] {
  const out: number[] = [];
  for (const [a, b] of EDGES) if (a === i) out.push(b); else if (b === i) out.push(a);
  return out;
}

const edgeKey = (a: number, b: number) => Math.min(a, b) + '-' + Math.max(a, b);

// 每步以 restartProb 概率跳回命中节点，否则沿边随机走一步
function runWalk(args: WalkArgs) {
  const random = rng(20260927);
  const visits = NODES.map(() => 0);
  const edgeHits = new Map<string, number>();
  let cur = ENTRY;
  visits[cur] = 1;
  for (let step = 0; step < args.randomWalkSteps; step++) {
    let next = ENTRY;
    if (random() >= args.restartProb) {
      const ns = neighborsOf(cur);
      next = ns.length ? ns[Math.floor(random() * ns.length)] : cur;
    }
    visits[next] += 1;
    const key = edgeKey(cur, next);
    edgeHits.set(key, (edgeHits.get(key) ?? 0) + 1);
    cur = next;
  }
  const order = NODES.map((_, i) => i).sort((a, b) => visits[b] - visits[a] || a - b);
  return { visits, edgeHits, selected: order.slice(0, args.topK) };
}

export function createGraphRagDemo(canvas: HTMLCanvasElement, emit: (s: WalkSnapshot) => void): WalkInstance {
  const ctx = canvas.getContext('2d')!;
  let args: WalkArgs = { randomWalkSteps: 100, restartProb: 0.15, topK: 4 };

  function draw(visits: number[], edgeHits: Map<string, number>, selected: number[]) {
    const { width, height } = readCanvasSize(canvas);
    const sx = width / 900, sy = height / 300;
    ctx.clearRect(0, 0, width, height);
    for (const [a, b] of EDGES) {
      const hits = edgeHits.get(edgeKey(a, b)) ?? 0;
      ctx.strokeStyle = hits ? `rgba(37,99,235,${Math.min(0.2 + hits / args.randomWalkSteps, 0.9)})` : 'rgba(100,116,139,0.25)';
      ctx.lineWidth = hits ? 1 + Math.min(hits / 20, 4) : 1;
      ctx.beginPath();
      ctx.moveTo(NODES[a].x * sx, NODES[a].y * sy);
      ctx.lineTo(NODES[b].x * sx, NODES[b].y * sy);
      ctx.stroke();
    }
    const max = Math.max(...visits);
    NODES.forEach((n, i) => {
      const heat = visits[i] / max;
      const r = 10 + heat * 8;
      ctx.beginPath();
      ctx.arc(n.x * sx, n.y * sy, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(37,99,235,${0.15 + heat * 0.75})`;
      ctx.fill();
      if (i === ENTRY || selected.includes(i)) {
        ctx.strokeStyle = i === ENTRY ? '#b45309' : '#0f766e';
        ctx.lineWidth = i === ENTRY ? 2.5 : 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(n.x * sx, n.y * sy, r + (i === ENTRY ? 5 : 4), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${n.id}(${visits[i]})`, n.x * sx, n.y * sy - r - 8);
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.fillText('橙双圈=命中节点  青外环=topK 选中  蓝=访问热度  线宽=游走次数', 12, height - 10);
  }

  function run() {
    const { visits, edgeHits, selected } = runWalk(args);
    draw(visits, edgeHits, selected);
    emit({ entry: NODES[ENTRY].id, steps: args.randomWalkSteps, selected: selected.map((i) => NODES[i].id).join(' ') });
  }

  const observer = createResizeObserver(canvas, run);
  run();
  return { update(next: WalkArgs) { args = next; run(); }, dispose() { observer.disconnect(); } };
}
