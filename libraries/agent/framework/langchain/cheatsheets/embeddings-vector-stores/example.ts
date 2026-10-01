/**
 * 范例介绍：查询与文档的相似度排序——topK 怎么产生、分数怎么读。
 * 一个 6 条文档的预置语料，4 个预置查询；每个查询与每条文档的余弦相似度
 * 来自手写的预置矩阵（确定性模拟，非真实嵌入）。切换查询时文档按分数
 * 降序重排；调整 topK 时高亮行数变化，落在 topK 之外的行变灰。
 * 输入或前置状态：Controls 提供查询词（4 选 1）与 topK（1-6）；
 * 纯本地 TS 确定性模拟，不依赖 @langchain/*，不发起模型调用。
 * 主要操作：切换查询词；调整 topK。
 * 预期结果：相似度高的文档排前、分数条更长；切到「量子纠错」时所有
 * 分数都低——排序永远会产生，分数绝对值才是相关性信号；topK 截断
 * 位置随参数移动。阅读主线：draw() 按「标题与模拟标注 → 查询卡片 →
 * 排序文档列表 → 结论行」四段布局推进。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type QueryKey = 'pet' | 'llm' | 'cooking' | 'offtopic';

export interface ExampleOptions {
  queryKey: QueryKey;
  topK: number;
}

export interface ExampleSnapshot {
  query: string;
  topK: number;
  top1: string;
  hitCount: number;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const LINE = '#dbe3f0';
const CARD_BG = '#ffffff';
const BAR_TRACK = '#e8edf5';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 预置语料：D1-D6，覆盖宠物 / 大模型 / 烹饪三个语义簇
const CORPUS: string[] = [
  '猫是常见的家庭宠物，性格独立安静。',
  '狗需要每天遛弯和社交，精力旺盛。',
  'Transformer 是当前大语言模型的主流架构。',
  '注意力机制让模型关注输入中最相关的部分。',
  '红酒炖牛肉是一道经典的法式家常菜。',
  '低温慢煮能保留食材的原汁原味。',
];

// 预置查询：与语料三个簇对齐，外加一个与语料无关的查询
const QUERIES: Record<QueryKey, string> = {
  pet: '哪种宠物需要每天出门运动',
  llm: '大模型的注意力是怎么工作的',
  cooking: '今晚做什么家常菜好',
  offtopic: '量子计算机的纠错原理',
};

// 预置相似度矩阵：QUERIES 的每个键对 CORPUS 每条的余弦相似度（0-1）。
// 手写值，仅用于演示「排序 + 分数」的机制，不代表任何真实模型的输出。
const SIMILARITY: Record<QueryKey, number[]> = {
  pet: [0.42, 0.86, 0.09, 0.12, 0.07, 0.08],
  llm: [0.08, 0.09, 0.68, 0.88, 0.06, 0.07],
  cooking: [0.11, 0.1, 0.05, 0.07, 0.83, 0.79],
  offtopic: [0.07, 0.08, 0.11, 0.1, 0.06, 0.06],
};

interface RankedDoc {
  index: number;
  content: string;
  score: number;
}

function rank(queryKey: QueryKey): RankedDoc[] {
  return CORPUS.map((content, index) => ({
    index,
    content,
    score: SIMILARITY[queryKey][index],
  })).sort((a, b) => b.score - a.score);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let cut = text.length;
  while (cut > 1 && ctx.measureText(`${text.slice(0, cut)}…`).width > maxWidth) {
    cut -= 1;
  }
  return `${text.slice(0, cut)}…`;
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: ExampleOptions = { queryKey: 'pet', topK: 3 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(470, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = 30;
    const inner = width - pad * 2;
    const ranked = rank(current.queryKey);
    const hitCount = Math.min(current.topK, ranked.length);

    // 标题行 + 右上角模拟标注：排序机制用预置矩阵演示，不是真实嵌入
    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('查询 × 文档：相似度排序与 topK', pad, pad + 2);

    ctx.font = `600 11px ${FONT}`;
    const badge = '确定性模拟 · 非真实嵌入';
    const badgeW = ctx.measureText(badge).width + 18;
    ctx.fillStyle = '#fff7ed';
    ctx.strokeStyle = '#fdba74';
    ctx.lineWidth = 1.2;
    roundedRect(ctx, width - pad - badgeW, pad - 12, badgeW, 22, 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9a3412';
    ctx.fillText(badge, width - pad - badgeW + 9, pad + 3);

    // 查询卡片：当前查询词经 embedQuery 变成查询向量
    const queryTop = pad + 26;
    const queryH = 46;
    ctx.fillStyle = '#f5f8ff';
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.4;
    roundedRect(ctx, pad, queryTop, inner, queryH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = `11px ${MONO}`;
    ctx.fillText('query（embedQuery）', pad + 14, queryTop + 17);
    ctx.fillStyle = INK;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(
      fitText(ctx, `“${QUERIES[current.queryKey]}”`, inner - 28),
      pad + 14,
      queryTop + 36,
    );

    // 排序文档列表：全量按分数降序排，前 topK 条是 similaritySearch 的返回
    const listTop = queryTop + queryH + 18;
    const rowH = 48;
    const rowGap = 8;
    ranked.forEach((doc, row) => {
      const y = listTop + row * (rowH + rowGap);
      const inTopK = row < hitCount;
      const accent = inTopK ? BLUE : MUTED;

      ctx.fillStyle = inTopK ? CARD_BG : '#f4f6fa';
      ctx.strokeStyle = inTopK ? BLUE : LINE;
      ctx.lineWidth = 1.4;
      roundedRect(ctx, pad, y, inner, rowH, 8);
      ctx.fill();
      ctx.stroke();

      // 名次徽标
      ctx.beginPath();
      ctx.arc(pad + 26, y + rowH / 2, 13, 0, Math.PI * 2);
      ctx.fillStyle = inTopK ? BLUE : '#c6cfdd';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 12px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(row + 1), pad + 26, y + rowH / 2 + 4);
      ctx.textAlign = 'left';

      // 文档正文与编号
      ctx.fillStyle = inTopK ? INK : MUTED;
      ctx.font = `${inTopK ? 500 : 400} 13px ${FONT}`;
      ctx.fillText(
        fitText(
          ctx,
          `D${doc.index + 1}　${doc.content}`,
          inner - 210,
        ),
        pad + 48,
        y + rowH / 2 + 4,
      );

      // 分数条与分数值：条长按余弦相似度 0-1 缩放，越长越相似
      const barX = pad + inner - 150;
      const barW = 84;
      const barY = y + rowH / 2 - 5;
      ctx.fillStyle = BAR_TRACK;
      roundedRect(ctx, barX, barY, barW, 10, 5);
      ctx.fill();
      ctx.fillStyle = accent;
      roundedRect(
        ctx,
        barX,
        barY,
        Math.max(3, doc.score * barW),
        10,
        5,
      );
      ctx.fill();
      ctx.fillStyle = inTopK ? INK : MUTED;
      ctx.font = `600 12px ${MONO}`;
      ctx.fillText(doc.score.toFixed(2), barX + barW + 10, y + rowH / 2 + 4);

      // 落在 topK 之外的行：标注被截断
      if (!inTopK) {
        ctx.fillStyle = MUTED;
        ctx.font = `11px ${FONT}`;
        ctx.textAlign = 'right';
        ctx.fillText('topK 外（不返回）', pad + inner - 14, y + 15);
        ctx.textAlign = 'left';
      }
    });

    // 结论行
    const summaryY = listTop + ranked.length * (rowH + rowGap) + 14;
    const top = ranked[0];
    ctx.fillStyle = INK;
    ctx.font = `12px ${FONT}`;
    const summary =
      current.queryKey === 'offtopic'
        ? '查询与语料无关：排序仍然产生，但第一名分数也只有 '
          + `${top.score.toFixed(2)}——分数绝对值本身就是相关性信号`
        : `similaritySearchWithScore 按分数降序返回前 ${current.topK} 条（topK），分数条越长越相似`;
    ctx.fillText(fitText(ctx, summary, inner), pad, summaryY);

    emit({
      query: QUERIES[current.queryKey],
      topK: current.topK,
      top1: `D${top.index + 1}（${top.score.toFixed(2)}）`,
      hitCount,
    });
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
