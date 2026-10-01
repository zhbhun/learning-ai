/**
 * 范例介绍：确定性模拟固定 RAG 管线的一次数据流——
 * 查询 → ① 检索命中（预置分数排序 + topK 截断）→ ② 拼装后的完整提示预览
 * → ③ 模拟回答与引用编号。所有分数、回答与引用均为预置数据加规则推导，
 * 不调用嵌入模型与 LLM（画布明确标注「确定性模拟」）；
 * 上下文块编号、引用约束、topK 截断与「文档未提及」兜底的语义
 * 与正文三步管线一致。
 * 输入：query（三个预置查询：单块命中 / 跨块命中 / 无命中）、topK（检索条数）。
 * 预期结果：调小 topK 会把回答需要的块截在上下文外，回答退化为「部分引用」；
 * 切到无命中查询时排序照样产生第一名，但引用为空并触发兜底回答。
 * 阅读主线：先看 CORPUS 与 QUERIES 的预置数据（neededIds 是每个回答需要的块），
 * 再看 runPipeline 的排序、截断与兜底规则，最后看三栏绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleOptions {
  query: string;
  topK: number;
}

export interface ExampleSnapshot {
  hits: number;
  topScore: number;
  citations: string;
  status: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

/** 语料块：模拟一份「政策手册」切分后的 8 个小块（source + page 是引用的溯源线索） */
interface CorpusChunk {
  id: string;
  source: string;
  page: number;
  content: string;
}

const CORPUS: CorpusChunk[] = [
  {
    id: 'R1',
    source: 'policy.md',
    page: 2,
    content: '未拆封且不影响二次销售的商品，支持签收后 7 天内无理由退货；拆封后仅质量问题可退。',
  },
  {
    id: 'R2',
    source: 'policy.md',
    page: 3,
    content: '质量问题退货在仓库收到退货后 3 个工作日内全额退款，款项原路返回支付账户。',
  },
  {
    id: 'R3',
    source: 'policy.md',
    page: 5,
    content: '海外购订单退货需先联系客服获取境外退货地址，退货周期比国内订单长约 10 个工作日。',
  },
  {
    id: 'S1',
    source: 'shipping.md',
    page: 1,
    content: '国内订单在下单后 48 小时内发货，普通快递 3 至 5 个工作日送达。',
  },
  {
    id: 'S2',
    source: 'shipping.md',
    page: 4,
    content: '海外购订单由跨境专线承运，清关后 7 至 12 个工作日送达，关税由买家承担。',
  },
  {
    id: 'S3',
    source: 'shipping.md',
    page: 6,
    content: '偏远地区配送时效延长 3 至 5 个工作日，生鲜类商品仅支持次日达城市。',
  },
  {
    id: 'M1',
    source: 'benefits.md',
    page: 1,
    content: '会员每消费 1 元累计 1 积分，积分可在下单时按 100 比 1 抵扣现金。',
  },
  {
    id: 'M2',
    source: 'benefits.md',
    page: 2,
    content: '退货订单对应的积分会在退款完成后自动扣回，部分退货按比例扣回。',
  },
];

/** 预置查询：分数按 CORPUS 顺序给出（确定性模拟，非真实嵌入相似度） */
interface PresetQuery {
  label: string;
  scores: number[];
  /** 完整回答必须引用的块；为空表示语料里没有答案（触发兜底） */
  neededIds: string[];
  completeAnswer: string;
  partialAnswer: string;
  fallbackAnswer: string;
}

const QUERIES: PresetQuery[] = [
  {
    label: '未拆封的商品可以退货吗',
    scores: [0.82, 0.41, 0.28, 0.18, 0.12, 0.1, 0.08, 0.14],
    neededIds: ['R1'],
    completeAnswer:
      '可以。未拆封且不影响二次销售的商品，支持签收后 7 天内无理由退货 [1]。',
    partialAnswer: '',
    fallbackAnswer: '',
  },
  {
    label: '海外购的退款要多久到账',
    scores: [0.35, 0.72, 0.58, 0.22, 0.55, 0.16, 0.09, 0.31],
    neededIds: ['R2', 'R3'],
    completeAnswer:
      '海外购退款在仓库收到退货后 3 个工作日内原路返回 [1]；但海外购退货周期比国内长约 10 个工作日 [2]，整体到账时间以实际寄回为准。',
    partialAnswer:
      '海外购退款在仓库收到退货后 3 个工作日内原路返回 [1]。本次参考文档中没有海外购退货周期的信息。',
    fallbackAnswer: '',
  },
  {
    label: '可以用数字货币支付吗',
    scores: [0.11, 0.09, 0.08, 0.12, 0.1, 0.07, 0.13, 0.09],
    neededIds: [],
    completeAnswer: '',
    partialAnswer: '',
    fallbackAnswer: '参考文档中未提及数字货币支付，无法基于文档回答该问题。',
  },
];

export type AnswerStatus = 'complete' | 'partial' | 'fallback';

/** 检索命中行：分数排序后的块，带排名、是否进入上下文与引用信息 */
export interface HitRow {
  chunk: CorpusChunk;
  score: number;
  rank: number;
  /** 是否进入本次拼装的上下文（rank ≤ topK） */
  inContext: boolean;
  /** 是否被模拟回答引用（needed 且进入上下文） */
  cited: boolean;
  /** 上下文块编号（进入上下文时为 rank，否则为 0） */
  contextIndex: number;
}

/** 一次固定管线的完整数据流（纯函数，可离线核对） */
export function runPipeline(options: ExampleOptions) {
  const query = QUERIES.find((item) => item.label === options.query) ?? QUERIES[0];
  const topK = Math.max(1, Math.min(options.topK, CORPUS.length));

  const ranked: Array<{ chunk: CorpusChunk; score: number }> = CORPUS.map(
    (chunk, index) => ({ chunk, score: query.scores[index] }),
  ).sort((left, right) => right.score - left.score);

  const hits: HitRow[] = ranked.map((entry, index) => {
    const rank = index + 1;
    const inContext = rank <= topK;
    const cited = inContext && query.neededIds.includes(entry.chunk.id);
    return {
      chunk: entry.chunk,
      score: entry.score,
      rank,
      inContext,
      cited,
      contextIndex: inContext ? rank : 0,
    };
  });

  const citedRows = hits.filter((row) => row.cited);
  const missingCount = query.neededIds.length - citedRows.length;

  // 兜底优先级：语料无答案（needed 为空）或需要的块一块都没进上下文
  let status: AnswerStatus;
  let text: string;
  if (query.neededIds.length === 0 || citedRows.length === 0) {
    status = 'fallback';
    text =
      query.fallbackAnswer ||
      '本次参考文档中没有足够信息回答该问题，仅部分相关内容如下。';
  } else if (missingCount > 0) {
    status = 'partial';
    text = query.partialAnswer;
  } else {
    status = 'complete';
    text = query.completeAnswer;
  }

  return {
    query,
    topK,
    hits,
    contextRows: hits.filter((row) => row.inContext),
    citedRows,
    status,
    answerText: text,
  };
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STATUS_LABELS: Record<AnswerStatus, { text: string; color: string }> = {
  complete: { text: '完整回答', color: '#15803d' },
  partial: { text: '部分回答 · 缺块', color: '#b45309' },
  fallback: { text: '兜底：文档未提及', color: '#64748b' },
};

// 超出可用宽度时截断加省略号，保证文字不溢出面板
function clipText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (context.measureText(text).width <= maxWidth) {
    return text;
  }

  let clipped = text;
  while (
    clipped.length > 1 &&
    context.measureText(`${clipped}…`).width > maxWidth
  ) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

// 按最大宽度断行，超过 maxLines 时截断加省略号
function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines: string[] = [];
  let rest = text;

  while (rest.length > 0 && lines.length < maxLines) {
    let cut = rest.length;
    while (cut > 1 && context.measureText(rest.slice(0, cut)).width > maxWidth) {
      cut -= 1;
    }
    lines.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }

  if (rest.length > 0 && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, -1)}…`;
  }
  return lines;
}

// 用 arcTo 手绘圆角矩形，不依赖较新的 roundRect API
function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function panelFrame(
  context: CanvasRenderingContext2D,
  panel: Rect,
): void {
  context.fillStyle = '#ffffff';
  roundedRectPath(context, panel.x, panel.y, panel.width, panel.height, 8);
  context.fill();
  context.strokeStyle = '#dbe3f0';
  context.lineWidth = 1;
  context.stroke();
}

function panelHeader(
  context: CanvasRenderingContext2D,
  panel: Rect,
  title: string,
  note: string,
  compact: boolean,
): void {
  context.fillStyle = '#334155';
  context.font = `600 ${compact ? 10.5 : 11.5}px ui-sans-serif, system-ui, sans-serif`;
  context.fillText(clipText(context, title, panel.width * 0.55), panel.x + 12, panel.y + 18);

  context.fillStyle = '#94a3b8';
  context.font = `${compact ? 9 : 10}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const noteText = clipText(context, note, panel.width * 0.42);
  context.fillText(
    noteText,
    panel.x + panel.width - 12 - context.measureText(noteText).width,
    panel.y + 18,
  );
}

function drawHitsPanel(
  context: CanvasRenderingContext2D,
  panel: Rect,
  result: ReturnType<typeof runPipeline>,
  compact: boolean,
): void {
  panelHeader(
    context,
    panel,
    '① 检索命中（按分数排序）',
    `topK ${result.topK} · 共 ${CORPUS.length} 块`,
    compact,
  );

  const listTop = panel.y + 28;
  const listBottom = panel.y + panel.height - 8;
  const rowHeight = Math.min(26, Math.max(16, (listBottom - listTop) / CORPUS.length));
  const barMax = panel.width - 150;
  let drawnRows = 0;

  result.hits.forEach((row) => {
    const rowY = listTop + (row.rank - 1) * rowHeight;
    if (rowY > listBottom - rowHeight + 14) {
      return;
    }
    drawnRows += 1;

    const dim = !row.inContext;
    const mono = `${compact ? 9 : 9.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const sans = `${compact ? 9 : 9.5}px ui-sans-serif, system-ui, sans-serif`;

    // 上下文编号（rank ≤ topK 的块按顺序编号，进入提示的 [n] 即此编号）
    context.font = mono;
    if (row.inContext) {
      context.fillStyle = row.cited ? '#15803d' : '#2563eb';
      context.fillText(`[${row.contextIndex}]`, panel.x + 12, rowY + 10);
    } else {
      context.fillStyle = '#cbd5e1';
      context.fillText(' ·', panel.x + 12, rowY + 10);
    }

    // 分数条 + 分数：topK 外灰显
    context.fillStyle = dim ? '#e2e8f0' : '#2563eb';
    context.fillRect(panel.x + 42, rowY + 3, Math.max(2, row.score * barMax), 8);
    context.fillStyle = dim ? '#94a3b8' : '#475569';
    context.font = mono;
    context.fillText(row.score.toFixed(2), panel.x + 46 + barMax, rowY + 11);

    // 来源与内容预览
    context.font = sans;
    context.fillStyle = dim ? '#94a3b8' : '#64748b';
    const sourceLabel = `${row.chunk.source} 第${row.chunk.page}页`;
    context.fillText(sourceLabel, panel.x + 12, rowY + 22);
    const previewLeft = panel.x + 14 + context.measureText(sourceLabel).width;
    context.fillStyle = dim ? '#cbd5e1' : '#334155';
    context.fillText(
      clipText(
        context,
        row.chunk.content,
        panel.x + panel.width - 12 - previewLeft - (dim ? 46 : 40),
      ),
      previewLeft,
      rowY + 22,
    );

    // 行尾标记：被引用 / topK 外
    if (row.cited) {
      context.fillStyle = '#15803d';
      context.fillText('→引用', panel.x + panel.width - 34, rowY + 22);
    } else if (dim) {
      context.fillStyle = '#cbd5e1';
      context.fillText('topK 外', panel.x + panel.width - 40, rowY + 22);
    }
  });

  if (drawnRows < CORPUS.length) {
    context.fillStyle = '#94a3b8';
    context.font = `${compact ? 9 : 10}px ui-sans-serif, system-ui, sans-serif`;
    context.fillText(
      `其余 ${CORPUS.length - drawnRows} 块未展示`,
      panel.x + 12,
      listBottom,
    );
  }
}

function drawPromptPanel(
  context: CanvasRenderingContext2D,
  panel: Rect,
  result: ReturnType<typeof runPipeline>,
  compact: boolean,
): void {
  panelHeader(
    context,
    panel,
    '② 拼装后的提示预览',
    '上下文 + 指令进 system，问题进 user',
    compact,
  );

  const lineGap = compact ? 14 : 16;
  let y = panel.y + 36;
  const bottom = panel.y + panel.height - 10;

  // 逐行绘制提示骨架：等宽字体，超出面板高度的行直接丢弃（块数由 maxRows 控制）
  const line = (text: string, color: string, weight = '400') => {
    if (y > bottom) {
      return false;
    }
    context.fillStyle = color;
    context.font = `${weight} ${compact ? 9 : 9.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillText(clipText(context, text, panel.width - 24), panel.x + 12, y);
    y += lineGap;
    return true;
  };

  line('[system]', '#b45309', '600');
  line('你是客服助手。只根据参考文档回答；', '#475569');
  line('文档未提及就明确说明；回答末尾标注引用编号。', '#475569');
  line('参考文档：', '#475569');

  const maxRows = Math.max(
    1,
    Math.floor((bottom - y - 2 * lineGap) / lineGap),
  );
  const rows = result.contextRows.slice(0, maxRows);
  rows.forEach((row) => {
    line(
      `[${row.contextIndex}] (${row.chunk.source} 第${row.chunk.page}页) ${row.chunk.content}`,
      row.cited ? '#15803d' : '#334155',
    );
  });
  if (result.contextRows.length > rows.length) {
    line(`… 其余 ${result.contextRows.length - rows.length} 块未展示`, '#94a3b8');
  } else {
    y += 2;
  }

  line('[user]', '#b45309', '600');
  line(`${result.query.label}`, '#1e293b', '600');
}

function drawAnswerPanel(
  context: CanvasRenderingContext2D,
  panel: Rect,
  result: ReturnType<typeof runPipeline>,
  compact: boolean,
): void {
  panelHeader(context, panel, '③ 生成回答（模拟）', '引用编号可溯源回 [n]', compact);

  const sans = compact ? 10 : 10.5;
  const status = STATUS_LABELS[result.status];

  // 状态标签
  context.fillStyle = status.color;
  context.font = `600 ${sans}px ui-sans-serif, system-ui, sans-serif`;
  context.fillText(
    clipText(context, status.text, panel.width - 24),
    panel.x + 12,
    panel.y + 36,
  );

  // 回答正文
  context.font = `${sans}px ui-sans-serif, system-ui, sans-serif`;
  const lines = wrapText(
    context,
    result.answerText,
    panel.width - 24,
    compact ? 4 : 5,
  );
  lines.forEach((text, index) => {
    context.fillStyle = '#334155';
    context.fillText(text, panel.x + 12, panel.y + 56 + index * 16);
  });

  // 引用行：编号 → 来源映射，兜底时明确「引用：无」
  const citeY = panel.y + panel.height - (compact ? 34 : 38);
  context.fillStyle = '#64748b';
  context.font = `600 ${compact ? 9.5 : 10}px ui-sans-serif, system-ui, sans-serif`;
  context.fillText('引用：', panel.x + 12, citeY);

  if (result.citedRows.length === 0) {
    context.fillStyle = '#94a3b8';
    context.font = `${compact ? 9.5 : 10}px ui-sans-serif, system-ui, sans-serif`;
    context.fillText('无（未提及任何参考块）', panel.x + 44, citeY);
  } else {
    let cursorX = panel.x + 44;
    result.citedRows.forEach((row) => {
      context.fillStyle = '#15803d';
      context.font = `600 ${compact ? 9.5 : 10}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      const badge = `[${row.contextIndex}]`;
      context.fillText(badge, cursorX, citeY);
      cursorX += context.measureText(badge).width + 4;
      context.fillStyle = '#64748b';
      context.font = `${compact ? 9.5 : 10}px ui-sans-serif, system-ui, sans-serif`;
      const sourceLabel = `${row.chunk.source}#p${row.chunk.page}`;
      context.fillText(sourceLabel, cursorX, citeY);
      cursorX += context.measureText(sourceLabel).width + 10;
    });
  }

  const hintY = panel.y + panel.height - (compact ? 18 : 20);
  context.fillStyle = '#94a3b8';
  context.font = `${compact ? 9 : 9.5}px ui-sans-serif, system-ui, sans-serif`;
  context.fillText(
    clipText(
      context,
      '回答与引用为预置数据按规则推导，非真实模型输出',
      panel.width - 24,
    ),
    panel.x + 12,
    hintY,
  );
}

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const drawingContext: CanvasRenderingContext2D = context;

  let current: ExampleOptions = {
    query: QUERIES[1].label,
    topK: 4,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const compact = width < 900 || height < 460;
    const result = runPipeline(current);

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        '固定 RAG 管线数据流：查询 → 检索 → 拼提示 → 回答',
        width - 96,
      ),
      48,
      40,
    );

    drawingContext.fillStyle = '#64748b';
    drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        `确定性模拟 · 预置语料 ${CORPUS.length} 块 · 查询「${current.query}」 · topK ${current.topK}`,
        width - 96,
      ),
      48,
      62,
    );

    const top = 84;
    const bottom = height - 70;
    const left = 40;
    const right = width - 40;
    const gap = 16;

    let panels: Rect[];
    if (width >= 960) {
      const usable = right - left - gap * 2;
      const w1 = Math.round(usable * 0.34);
      const w2 = Math.round(usable * 0.38);
      const w3 = usable - w1 - w2;
      panels = [
        { x: left, y: top, width: w1, height: bottom - top },
        { x: left + w1 + gap, y: top, width: w2, height: bottom - top },
        { x: left + w1 + w2 + gap * 2, y: top, width: w3, height: bottom - top },
      ];
    } else if (width >= 620) {
      const usable = right - left - gap;
      const w1 = Math.round(usable * 0.46);
      const w2 = usable - w1;
      const halfHeight = Math.floor((bottom - top - gap) / 2);
      panels = [
        { x: left, y: top, width: w1, height: bottom - top },
        { x: left + w1 + gap, y: top, width: w2, height: halfHeight },
        { x: left + w1 + gap, y: top + halfHeight + gap, width: w2, height: halfHeight },
      ];
    } else {
      const usable = right - left;
      const panelHeight = Math.floor((bottom - top - gap * 2) / 3);
      panels = [
        { x: left, y: top, width: usable, height: panelHeight },
        { x: left, y: top + panelHeight + gap, width: usable, height: panelHeight },
        {
          x: left,
          y: top + (panelHeight + gap) * 2,
          width: usable,
          height: panelHeight,
        },
      ];
    }

    panels.forEach((panel) => panelFrame(drawingContext, panel));
    drawHitsPanel(drawingContext, panels[0], result, compact);
    drawPromptPanel(drawingContext, panels[1], result, compact);
    drawAnswerPanel(drawingContext, panels[2], result, compact);

    const topHit = result.hits[0];
    emit({
      hits: result.contextRows.length,
      topScore: topHit ? topHit.score : 0,
      citations: result.citedRows.length
        ? result.citedRows.map((row) => `[${row.contextIndex}]`).join(' ')
        : '无',
      status: STATUS_LABELS[result.status].text,
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
