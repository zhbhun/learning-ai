// 演示：MDocument.chunk() 的离线切块示意（不调用真实 LLM / 网络）。
// 输入：一篇带三个小节的示例 Markdown；操作：切换策略、调整 maxCharacters / overlap 滑杆。
// 预期：每块一根长度条，颜色 = 所属小节，红框 = 跨小节的块；读数 = 块数 / 平均块长 / 跨节块数。
// 主线：character 硬切 → recursive 按分隔符合并 → markdown 优先按标题切 → token 按预算换算。

const SAMPLE_MD = [
  '# 手册',
  '## 概念',
  '切块把长文档拆成可嵌入的小段，段太小会丢上下文，段太大稀释检索相关性。',
  '嵌入模型把文本映射为定长向量，语义相近的文本向量彼此接近。',
  '',
  '## 操作',
  '先用 fromMarkdown 构造 MDocument，再调用 chunk 得到块数组。',
  '随后对每个块调用 embedMany 生成向量并写入向量库。',
  '查询时必须使用与入库相同的嵌入模型，否则两批向量不在同一空间。',
  '',
  '## 边界',
  '递归策略按分隔符从大到小回退，尽量在自然边界断开。',
  'Markdown 策略把标题当作边界，块不会跨小节混合主题。',
].join('\n');

const TOKEN_RATIO = 4; // 示意换算：1 token ≈ 4 字符
const SECTION_COLORS = ['#4c78a8', '#59a14f', '#e4572e'];

type Strategy = 'character' | 'recursive' | 'markdown' | 'token';

interface Chunk { start: number; text: string; }

interface Snapshot { count: number; avg: number; mixed: number; }

function sectionIdsAt(doc: string): number[] {
  const ids: number[] = new Array(doc.length).fill(0);
  let id = -1;
  doc.split('\n').reduce((offset, line) => {
    if (/^#{1,2} /.test(line)) id += 1;
    for (let i = 0; i <= line.length; i += 1) ids[offset + i] = Math.max(id, 0);
    return offset + line.length + 1;
  }, 0);
  return ids;
}

// recursive / token：按段落贪心合并，预算 = maxCharacters（token 策略按 4 字符换算）
function packParagraphs(doc: string, budget: number, overlap: number): Chunk[] {
  const chunks: Chunk[] = [];
  let start = 0;
  while (start < doc.length) {
    let end = Math.min(start + budget, doc.length);
    if (end < doc.length) {
      const cut = doc.slice(start, end).lastIndexOf('\n\n');
      if (cut > 0) end = start + cut;
    }
    chunks.push({ start, text: doc.slice(start, end) });
    start = end - overlap > start ? end - overlap : end; // overlap 不把窗口推回，避免死循环
  }
  return chunks;
}

// character：每 budget 个字符硬切一刀；overlap 超预算时退到最小步长，避免块数爆炸
function hardCut(doc: string, budget: number, overlap: number): Chunk[] {
  const step = Math.max(10, budget - overlap);
  const chunks: Chunk[] = [];
  for (let start = 0; start < doc.length; start += step) {
    chunks.push({ start, text: doc.slice(start, start + budget) });
    if (start + budget >= doc.length) break;
  }
  return chunks;
}

function chunkDoc(strategy: Strategy, maxCharacters: number, overlap: number): Chunk[] {
  const budget = strategy === 'token' ? maxCharacters * TOKEN_RATIO : maxCharacters;
  if (strategy === 'character') return hardCut(SAMPLE_MD, budget, overlap);
  if (strategy === 'markdown') {
    // markdown：标题即边界，小节内超预算再按段切
    const out: Chunk[] = [];
    SAMPLE_MD.split(/(?=^#{1,2} )/m).forEach((section) => {
      const at = SAMPLE_MD.indexOf(section);
      if (section.length <= budget) out.push({ start: at, text: section });
      else packParagraphs(section, budget, overlap).forEach((c) => out.push({ start: at + c.start, text: c.text }));
    });
    return out;
  }
  return packParagraphs(SAMPLE_MD, budget, overlap);
}

function draw(canvas: HTMLCanvasElement, chunks: Chunk[], ids: number[]): Snapshot {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { count: 0, avg: 0, mixed: 0 };
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  const maxLen = Math.max(...chunks.map((c) => c.text.length), 1);
  const barH = Math.min(26, (height - 40) / Math.max(chunks.length, 1) - 6);
  let mixed = 0;
  chunks.forEach((chunk, i) => {
    const span = new Set(ids.slice(chunk.start, chunk.start + chunk.text.length));
    const isMixed = span.size > 1;
    if (isMixed) mixed += 1;
    const y = 12 + i * (barH + 6);
    const w = Math.max(((width - 110) * chunk.text.length) / maxLen, 2);
    ctx.fillStyle = SECTION_COLORS[Math.max(...span) % SECTION_COLORS.length];
    ctx.globalAlpha = 0.85;
    ctx.fillRect(90, y, w, barH);
    ctx.globalAlpha = 1;
    if (isMixed) { ctx.strokeStyle = '#d33'; ctx.lineWidth = 2; ctx.strokeRect(90, y, w, barH); }
    ctx.fillStyle = '#555';
    ctx.font = '12px sans-serif';
    ctx.fillText(`#${i + 1}`, 10, y + barH - 4);
    ctx.fillText(`${chunk.text.length}`, 96 + w + 6, y + barH - 4);
  });
  const total = chunks.reduce((s, c) => s + c.text.length, 0);
  return { count: chunks.length, avg: chunks.length ? Math.round(total / chunks.length) : 0, mixed };
}

export function createChunkingCanvas(canvas: HTMLCanvasElement, emit: (s: Snapshot) => void) {
  let args = { strategy: 'recursive' as Strategy, maxCharacters: 120, overlap: 20 };
  const render = () => emit(draw(canvas, chunkDoc(args.strategy, args.maxCharacters, args.overlap), sectionIdsAt(SAMPLE_MD)));
  render();
  return {
    update(next: Partial<typeof args>) { args = { ...args, ...next }; render(); },
  };
}

export type { Snapshot, Strategy };
