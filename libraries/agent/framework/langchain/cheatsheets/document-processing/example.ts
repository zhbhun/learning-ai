/**
 * 范例介绍：确定性演示同一篇文档在不同切分参数下的块形态——
 * RecursiveCharacterTextSplitter 按段落、行、空格、字符四级分隔符逐级降级，
 * CharacterTextSplitter 只认段落分隔符（长段落不降级、整块保留），
 * chunkOverlap 让相邻块共享前一块的尾部内容。
 * 切分逻辑逐行对照 @langchain/textsplitters@1.0.2 的
 * _splitText / mergeSplits / joinDocs 实现（长度按字符计，与本包默认一致）。
 * 输入：chunkSize（块大小，40–400 缩比，对应真实默认 1000）、
 * chunkOverlap（块重叠，对应真实默认 200）、strategy（切分器档位）。
 * 预期结果：调小 chunkSize 块数上升、红色「硬切」标记增多；调大
 * chunkOverlap 相邻块出现橙色重叠标记；切到「单分隔符」档时长段落 P4
 * 变成远超 chunkSize 的超长块；chunkOverlap ≥ chunkSize 时显示真实报错。
 * 不依赖 @langchain/*：分隔符层级、默认 keepSeparator、合并与重叠语义
 * 均与发布包源码一致。
 * 阅读主线：先看 SAMPLE_PARAGRAPHS 与 recursiveSplit / mergeSplits，
 * 再看 runSplitter 的边界分类，最后看 drawChunkList 的绘制。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SplitterStrategy = 'recursive' | 'character';

export interface ExampleOptions {
  chunkSize: number;
  chunkOverlap: number;
  strategy: SplitterStrategy;
}

export interface ExampleSnapshot {
  strategyLabel: string;
  chunkCount: number;
  maxChunkLength: number;
  avgChunkLength: number;
  hardCutChunks: number;
  overlapChunks: number;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

/** 块的起始边界类型：由块首字符与其在原文中前方的分隔符共同判定 */
export type ChunkBoundary = '文首' | '段界' | '行界' | '词界' | '硬切';

export interface ChunkInfo {
  index: number;
  text: string;
  length: number;
  boundary: ChunkBoundary;
  /** 与上一块尾部重复的字符数（chunkOverlap 带来的共享内容） */
  overlap: number;
}

// 样例文档：五段结构——两段短文、一段多行文本、一段超过 400 字的无分隔长段、
// 一段收尾。长段 P4 专门用来触发递归降级（中文没有空格，会直落到字符级硬切）
// 以及「单分隔符」档的超长块现象。
const SAMPLE_PARAGRAPHS = [
  '检索知识库的第一步，是把 PDF、表格和网页统一成 Document 对象：pageContent 存文本，metadata 存来源、页码等元数据。',
  '长文档不能整篇嵌入。一条向量要表达的主题越多，检索时语义越模糊；块切得太碎，一个完整的意思又被拦腰截断，命中了也读不全。',
  '默认切分器按四级分隔符逐级降级：\n先沿空行切段落，段落仍超长才降到行，\n行还超长才降到空格，\n最后才在字符级硬切。',
  '元数据是检索系统的暗线。加载阶段写进 metadata 的每一个字段，都是检索阶段的一次过滤机会：source 能把搜索范围限定在某份文档或某个目录，page 能把命中结果定位到具体页码，章节字段能让回答带上可核对的引用。这些字段在切分时会被浅拷贝继承到每一个小块，切分器还会追加块在原文中的行号范围。等到检索质量出问题再回头补元数据，往往意味着重新加载、重新切分、重新嵌入整个知识库，成本远高于一开始就把来源、页码和章节写进 Document。一个实用的检查方法是：这块内容将来需不需要按来源过滤、需不需要回链到原文、需不需要在回答里标注出处，三个问题里只要有一个答案是肯定的，对应的字段就应该在加载阶段进入 metadata。同样地，页码从零还是从一开始、章节用数组还是字符串，这些约定一旦入库就很难更改，加载阶段多花一分钟统一格式，检索阶段就少一类对不上的数据。所以加载器的价值不只是解析文件，更是替未来的检索准备好可以过滤、可以定位、可以引用的结构化线索。',
  '块之间的重叠让相邻块共享边界内容：句子跨块时，两块都带着断点附近的上文，缓解跨界信息丢失。',
];

const SAMPLE_TEXT = SAMPLE_PARAGRAPHS.join('\n\n');

// 与 RecursiveCharacterTextSplitter 的默认 separators 完全一致
const RECURSIVE_SEPARATORS = ['\n\n', '\n', ' ', ''];

const STRATEGY_LABELS: Record<SplitterStrategy, string> = {
  recursive: 'RecursiveCharacterTextSplitter（逐级降级）',
  character: 'CharacterTextSplitter（单分隔符 \\n\\n）',
};

const BOUNDARY_COLORS: Record<ChunkBoundary, string> = {
  文首: '#64748b',
  段界: '#15803d',
  行界: '#2563eb',
  词界: '#0d9488',
  硬切: '#b91c1c',
};

function escapeRegExp(value: string): string {
  return value.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

// 与真实 splitOnSeparator 一致：keepSeparator 时用前瞻断言切开，
// 分隔符留在下一段开头（块边界处不丢字符）；否则直接按分隔符切开并丢弃它
function splitOnSeparator(
  text: string,
  separator: string,
  keepSeparator: boolean,
): string[] {
  const splits = separator
    ? keepSeparator
      ? text.split(new RegExp(`(?=${escapeRegExp(separator)})`))
      : text.split(separator)
    : text.split('');
  return splits.filter((piece) => piece !== '');
}

// 与真实 joinDocs 一致：合并后做 trim，空块丢弃
function joinDocs(docs: string[], separator: string): string | null {
  const text = docs.join(separator).trim();
  return text === '' ? null : text;
}

// 与真实 mergeSplits 一致：相邻片段贪心合并到不超过 chunkSize；
// 落盘一块后，从前端弹出片段直到剩余总量不超过 chunkOverlap——
// 这些剩余片段就是下一块开头与前一块结尾重叠的部分
function mergeSplits(
  splits: string[],
  separator: string,
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  const docs: string[] = [];
  let currentDoc: string[] = [];
  let total = 0;

  for (const piece of splits) {
    const pieceLength = piece.length;
    if (
      total + pieceLength + currentDoc.length * separator.length > chunkSize &&
      currentDoc.length > 0
    ) {
      const doc = joinDocs(currentDoc, separator);
      if (doc !== null) {
        docs.push(doc);
      }
      while (
        total > chunkOverlap ||
        (total + pieceLength + currentDoc.length * separator.length >
          chunkSize &&
          total > 0)
      ) {
        total -= currentDoc[0]?.length ?? 0;
        currentDoc = currentDoc.slice(1);
        if (currentDoc.length === 0) {
          break;
        }
      }
    }
    currentDoc.push(piece);
    total += pieceLength;
  }

  const doc = joinDocs(currentDoc, separator);
  if (doc !== null) {
    docs.push(doc);
  }
  return docs;
}

// 与真实 _splitText 一致：找第一个在文本中出现的分隔符切开；
// 长度 < chunkSize 的片段进合并池，仍超长的片段用下一级分隔符递归再切，
// 已是最后一级（''）则整段保留。递归切分器 keepSeparator 默认 true。
function recursiveSplit(
  text: string,
  separators: string[],
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  const finalChunks: string[] = [];
  let separator = separators[separators.length - 1];
  let newSeparators: string[] | undefined;

  for (let index = 0; index < separators.length; index += 1) {
    const candidate = separators[index];
    if (candidate === '') {
      separator = candidate;
      break;
    }
    if (text.includes(candidate)) {
      separator = candidate;
      newSeparators = separators.slice(index + 1);
      break;
    }
  }

  const splits = splitOnSeparator(text, separator, true);
  const joinSeparator = ''; // keepSeparator 为 true 时合并不补分隔符
  const goodSplits: string[] = [];

  for (const split of splits) {
    if (split.length < chunkSize) {
      goodSplits.push(split);
      continue;
    }
    if (goodSplits.length > 0) {
      finalChunks.push(
        ...mergeSplits(goodSplits, joinSeparator, chunkSize, chunkOverlap),
      );
      goodSplits.length = 0;
    }
    if (!newSeparators) {
      finalChunks.push(split); // 无更低层级可降：整段保留（超长块）
    } else {
      finalChunks.push(
        ...recursiveSplit(split, newSeparators, chunkSize, chunkOverlap),
      );
    }
  }

  if (goodSplits.length > 0) {
    finalChunks.push(
      ...mergeSplits(goodSplits, joinSeparator, chunkSize, chunkOverlap),
    );
  }
  return finalChunks;
}

// CharacterTextSplitter：单个分隔符（默认 "\n\n"）、keepSeparator 默认 false
// （分隔符直接丢弃）、不降级——超过 chunkSize 的段落整块保留
function characterSplit(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): string[] {
  const separator = '\n\n';
  const splits = splitOnSeparator(text, separator, false);
  return mergeSplits(splits, separator, chunkSize, chunkOverlap);
}

// 块起始边界分类：块自带分隔符（keepSeparator）或原文中块位置前方是分隔符，
// 都算自然边界；两者都不是，说明切点落在了句子或词的内部（硬切）
function classifyBoundary(
  text: string,
  position: number,
  chunk: string,
): ChunkBoundary {
  if (position === 0) {
    return '文首';
  }
  if (chunk.startsWith('\n\n') || text.slice(position - 2, position) === '\n\n') {
    return '段界';
  }
  if (chunk.startsWith('\n') || text.slice(position - 1, position) === '\n') {
    return '行界';
  }
  if (chunk.startsWith(' ') || text.slice(position - 1, position) === ' ') {
    return '词界';
  }
  return '硬切';
}

/** 对样例文档执行一次切分，返回带边界与重叠信息的块列表（纯函数，可离线核对） */
export function runSplitter(
  text: string,
  options: ExampleOptions,
): ChunkInfo[] {
  const { chunkSize, chunkOverlap, strategy } = options;

  if (chunkOverlap >= chunkSize) {
    // 真实包在构造器里就抛错，这里只作展示态
    return [];
  }

  const chunks =
    strategy === 'recursive'
      ? recursiveSplit(text, RECURSIVE_SEPARATORS, chunkSize, chunkOverlap)
      : characterSplit(text, chunkSize, chunkOverlap);

  const result: ChunkInfo[] = [];
  let searchFrom = 0;
  let previousEnd = 0;

  chunks.forEach((chunk, index) => {
    // 与真实 createDocuments 一致：在上一个块的位置之后查找当前块
    const position = text.indexOf(chunk, searchFrom);
    searchFrom = position + 1;
    const overlap = Math.max(
      0,
      Math.min(previousEnd - position, chunk.length),
    );
    result.push({
      index,
      text: chunk,
      length: chunk.length,
      boundary: classifyBoundary(text, position, chunk),
      overlap,
    });
    previousEnd = position + chunk.length;
  });

  return result;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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

function drawSourcePanel(
  context: CanvasRenderingContext2D,
  panel: Rect,
  compact: boolean,
): void {
  context.fillStyle = '#64748b';
  context.font = `600 ${compact ? 10.5 : 11.5}px ui-sans-serif, system-ui, sans-serif`;
  context.fillText('原文（按段落）', panel.x, panel.y + 13);

  context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const totalLabel = `${SAMPLE_TEXT.length} 字 · ${SAMPLE_PARAGRAPHS.length} 段`;
  context.fillStyle = '#94a3b8';
  context.fillText(
    totalLabel,
    panel.x + panel.width - context.measureText(totalLabel).width,
    panel.y + 13,
  );

  const rowHeight = Math.min(
    34,
    Math.max(22, (panel.height - 24) / SAMPLE_PARAGRAPHS.length),
  );
  SAMPLE_PARAGRAPHS.forEach((paragraph, index) => {
    const rowY = panel.y + 24 + index * rowHeight;

    // P4 是超过 400 字的无分隔长段：触发降级与超长块现象的关键样本
    const isLong = paragraph.length > 400;
    context.fillStyle = isLong ? '#b91c1c' : '#2563eb';
    context.font = `600 ${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillText(`P${index + 1}`, panel.x, rowY + 10);

    context.fillStyle = isLong ? '#b91c1c' : '#94a3b8';
    context.fillText(`${paragraph.length}字`, panel.x + 26, rowY + 10);

    context.fillStyle = '#475569';
    context.font = `${compact ? 9.5 : 10.5}px ui-sans-serif, system-ui, sans-serif`;
    const preview = paragraph.split('\n')[0];
    context.fillText(
      clipText(context, preview, panel.width - 76),
      panel.x,
      rowY + 24,
    );
  });

  context.fillStyle = '#94a3b8';
  context.font = `${compact ? 9 : 10}px ui-sans-serif, system-ui, sans-serif`;
  context.fillText(
    clipText(
      context,
      'P4 为无空行超长段：递归档会降级硬切，单分隔符档整块保留',
      panel.width - 8,
    ),
    panel.x,
    panel.y + panel.height - 6,
  );
}

function drawChunkList(
  context: CanvasRenderingContext2D,
  panel: Rect,
  chunks: ChunkInfo[],
  compact: boolean,
): void {
  context.fillStyle = '#64748b';
  context.font = `600 ${compact ? 10.5 : 11.5}px ui-sans-serif, system-ui, sans-serif`;
  context.fillText('切块结果', panel.x, panel.y + 13);

  context.font = `${compact ? 9.5 : 10.5}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const header = `${chunks.length} 块`;
  context.fillStyle = '#94a3b8';
  context.fillText(
    header,
    panel.x + panel.width - context.measureText(header).width,
    panel.y + 13,
  );

  const listTop = panel.y + 22;
  const listHeight = panel.height - 24;
  const rowHeight = Math.max(
    compact ? 13 : 15,
    Math.min(22, Math.floor(listHeight / Math.max(1, chunks.length))),
  );
  const maxRows = Math.max(1, Math.floor(listHeight / rowHeight));

  chunks.slice(0, maxRows).forEach((chunk) => {
    const rowY =
      listTop +
      chunk.index * rowHeight +
      Math.min(rowHeight, 14);

    // 序号
    context.font = `${compact ? 9 : 10}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    context.fillStyle = '#94a3b8';
    context.fillText(`#${chunk.index + 1}`, panel.x, rowY);

    // 长度
    const oversized = chunk.length > 400;
    context.fillStyle = oversized ? '#b91c1c' : '#475569';
    context.fillText(`${chunk.length}字`, panel.x + 30, rowY);

    // 边界标记
    context.fillStyle = BOUNDARY_COLORS[chunk.boundary];
    context.fillText(
      chunk.boundary,
      panel.x + 74,
      rowY,
    );

    // 重叠标记（橙色）：与上一块重复的字符数
    let cursorX = panel.x + 74 + context.measureText(chunk.boundary).width + 10;
    if (chunk.overlap > 0) {
      const overlapLabel = `↩重叠${chunk.overlap}`;
      context.fillStyle = '#b45309';
      context.fillText(overlapLabel, cursorX, rowY);
      cursorX += context.measureText(overlapLabel).width + 10;
    }

    // 内容预览：开头 + 结尾（换行替换为 ⏎）
    const normalized = chunk.text.replaceAll('\n', '⏎');
    const head = normalized.slice(0, 10);
    const tail = normalized.slice(-8);
    const preview =
      normalized.length <= 20 ? normalized : `${head}…${tail}`;
    context.fillStyle = '#94a3b8';
    context.fillText(
      clipText(context, preview, panel.x + panel.width - cursorX),
      cursorX,
      rowY,
    );
  });

  if (chunks.length > maxRows) {
    context.fillStyle = '#94a3b8';
    context.font = `${compact ? 9 : 10}px ui-sans-serif, system-ui, sans-serif`;
    context.fillText(
      `其余 ${chunks.length - maxRows} 块未展示`,
      panel.x,
      panel.y + panel.height - 6,
    );
  }
}

function drawError(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: ExampleOptions,
): void {
  context.fillStyle = '#991b1b';
  context.font = '600 15px ui-sans-serif, system-ui, sans-serif';
  const title = `Cannot have chunkOverlap >= chunkSize`;
  context.fillText(
    title,
    (width - context.measureText(title).width) / 2,
    height / 2 - 14,
  );

  context.fillStyle = '#64748b';
  context.font = '12px ui-sans-serif, system-ui, sans-serif';
  const detail = `chunkSize ${options.chunkSize} ≤ chunkOverlap ${options.chunkOverlap}：真实包在 new TextSplitter(...) 构造时直接抛出同样的错误`;
  context.fillText(
    clipText(context, detail, width - 96),
    (width - Math.min(context.measureText(detail).width, width - 96)) / 2,
    height / 2 + 12,
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
    chunkSize: 120,
    chunkOverlap: 30,
    strategy: 'recursive',
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

    const compact = width < 640 || height < 420;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText(
      clipText(
        drawingContext,
        '切分参数实验：同一篇文档的块形态',
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
        `确定性模拟 · ${STRATEGY_LABELS[current.strategy]} · chunkSize ${current.chunkSize} / chunkOverlap ${current.chunkOverlap}`,
        width - 96,
      ),
      48,
      62,
    );

    // 参数越界：直接呈现真实报错，不切分
    if (current.chunkOverlap >= current.chunkSize) {
      drawError(drawingContext, width, height, current);
      emit({
        strategyLabel: STRATEGY_LABELS[current.strategy],
        chunkCount: 0,
        maxChunkLength: 0,
        avgChunkLength: 0,
        hardCutChunks: 0,
        overlapChunks: 0,
      });
      return;
    }

    const chunks = runSplitter(SAMPLE_TEXT, current);

    // 底部留白给共享 readout 读数
    const top = 84;
    const bottom = height - 70;
    const twoColumn = width >= 640;
    let sourcePanel: Rect;
    let listPanel: Rect;
    if (twoColumn) {
      const gap = 24;
      const sourceWidth = Math.round((width - 80 - gap) * 0.38);
      sourcePanel = { x: 40, y: top, width: sourceWidth, height: bottom - top };
      listPanel = {
        x: 40 + sourceWidth + gap,
        y: top,
        width: width - 80 - sourceWidth - gap,
        height: bottom - top,
      };
    } else {
      sourcePanel = { x: 40, y: top, width: 0, height: 0 };
      listPanel = { x: 40, y: top, width: width - 80, height: bottom - top };
    }

    if (twoColumn) {
      drawSourcePanel(drawingContext, sourcePanel, compact);
    }
    drawChunkList(drawingContext, listPanel, chunks, compact);

    const lengths = chunks.map((chunk) => chunk.length);
    const totalLength = lengths.reduce((sum, value) => sum + value, 0);
    emit({
      strategyLabel: STRATEGY_LABELS[current.strategy],
      chunkCount: chunks.length,
      maxChunkLength: lengths.length ? Math.max(...lengths) : 0,
      avgChunkLength: lengths.length
        ? Math.round(totalLength / lengths.length)
        : 0,
      hardCutChunks: chunks.filter((chunk) => chunk.boundary === '硬切').length,
      overlapChunks: chunks.filter((chunk) => chunk.overlap > 0).length,
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
