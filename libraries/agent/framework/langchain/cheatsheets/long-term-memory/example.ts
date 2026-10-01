/**
 * 范例介绍：命名空间隔离与记忆注入模拟器。同一个 store、两个 user_id
 * 命名空间（("alice","memories") 与 ("bob","memories")）、两个 thread_id：
 * 左侧展示 store 里的命名空间与记忆条目，右侧展示「检索 → 拼进系统提示」
 * 之后模型实际看到的内容。
 * 输入或前置状态：Controls 提供本次调用的 user_id（进 context）与
 * thread_id（进 configurable）、两个命名空间已积累的记忆条数、注入上限
 * limit、是否在热路径写入一条新记忆；纯本地 TS 确定性模拟，
 * 不依赖 @langchain/*，不发起模型调用、不连接数据库。
 * 主要操作：切换 user_id / thread_id；调整记忆条数与 limit；
 * 打开「热路径写入」。
 * 预期结果：注入的记忆只随 user_id 切换，与 thread_id 无关；
 * 另一用户的命名空间不可见；超过 limit 的记忆被截断不注入；
 * 热路径写入的新记忆落在当前 user 的命名空间。阅读主线：
 * namespaceOf() 与 buildSystemPrompt() 两个纯函数。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type UserId = 'alice' | 'bob';
export type ThreadId = 'thread-1' | 'thread-2';

export interface ExampleOptions {
  userId: UserId;
  threadId: ThreadId;
  aliceMemories: number;
  bobMemories: number;
  limit: number;
  writeThisCall: boolean;
}

export interface ExampleSnapshot {
  namespace: string;
  injectedCount: number;
  storeTotal: number;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const GREEN = '#1f9d63';
const AMBER = '#b45309';
const LINE = '#dbe3f0';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

interface MemoryItem {
  key: string;
  text: string;
}

// 两个用户命名空间里预先积累的记忆（key 在命名空间内唯一）
const ALICE_MEMORIES: MemoryItem[] = [
  { key: 'm1', text: '偏好简短、直接的回复' },
  { key: 'm2', text: '只用英语和 TypeScript' },
  { key: 'm3', text: '养了一只猫叫 Mochi' },
];

const BOB_MEMORIES: MemoryItem[] = [
  { key: 'm1', text: '喜欢意大利菜' },
  { key: 'm2', text: '团队在杭州' },
];

// 热路径写回的新记忆：模型在本次调用中通过 save_memory 工具保存
const NEW_MEMORY: MemoryItem = { key: 'new-1', text: '下周三要开产品评审会' };

// 命名空间元组：第一维是隔离键（user_id），第二维是分类
function namespaceOf(userId: UserId): [string, string] {
  return [userId, 'memories'];
}

// 注入系统提示的记忆：来自当前 user 的命名空间，受 limit 截断
function injectedMemories(options: ExampleOptions): MemoryItem[] {
  const base =
    options.userId === 'alice'
      ? ALICE_MEMORIES.slice(0, options.aliceMemories)
      : BOB_MEMORIES.slice(0, options.bobMemories);
  const all = options.writeThisCall ? [...base, NEW_MEMORY] : base;
  return all.slice(0, options.limit);
}

function namespaceItems(options: ExampleOptions, userId: UserId): MemoryItem[] {
  const base =
    userId === 'alice'
      ? ALICE_MEMORIES.slice(0, options.aliceMemories)
      : BOB_MEMORIES.slice(0, options.bobMemories);
  return options.writeThisCall && userId === options.userId
    ? [...base, NEW_MEMORY]
    : base;
}

// 模拟「检索 → 拼接」：系统提示 = 基础提示 + 记忆列表
function buildSystemPrompt(injected: MemoryItem[]): string[] {
  const lines = ['你是一个乐于助人的助手。', '', '用户长期记忆：'];
  if (injected.length === 0) {
    lines.push('-（暂无）');
  } else {
    injected.forEach((item) => lines.push(`- ${item.text}`));
  }
  return lines;
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

function drawNamespaceFolder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  label: string,
  items: MemoryItem[],
  active: boolean,
  newCount: number,
): number {
  const headerHeight = 26;
  const rowHeight = 20;
  const height = headerHeight + Math.max(1, items.length) * rowHeight + 12;

  ctx.fillStyle = active ? '#f0f4ff' : '#ffffff';
  ctx.strokeStyle = active ? BLUE : LINE;
  ctx.lineWidth = active ? 1.6 : 1.2;
  roundedRect(ctx, x, y, w, height, 8);
  ctx.fill();
  ctx.stroke();

  ctx.font = `700 12px ${MONO}`;
  ctx.fillStyle = active ? BLUE : MUTED;
  ctx.fillText(`(${label}, "memories")`, x + 12, y + 17);

  ctx.font = `12px ${MONO}`;
  if (items.length === 0) {
    ctx.fillStyle = MUTED;
    ctx.fillText('（空命名空间）', x + 22, y + headerHeight + 14);
  }

  items.forEach((item, index) => {
    const rowY = y + headerHeight + 14 + index * rowHeight;
    const isNew = newCount > 0 && index >= items.length - newCount;
    ctx.fillStyle = isNew ? GREEN : active ? INK : MUTED;
    const bullet = isNew ? '+ ' : '- ';
    const badge = isNew ? '　← 本次新增' : '';
    ctx.fillText(
      fitText(
        ctx,
        `${bullet}${item.key}  ${item.text}${badge}`,
        w - 34,
      ),
      x + 22,
      rowY,
    );
  });

  return height;
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

  let current: ExampleOptions = {
    userId: 'alice',
    threadId: 'thread-1',
    aliceMemories: 3,
    bobMemories: 2,
    limit: 2,
    writeThisCall: false,
  };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(480, size.width);
    const height = Math.max(380, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const pad = 36;
    const inner = width - pad * 2;

    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText(
      '同一个 store × 两个命名空间 × 任意 thread_id',
      pad,
      pad + 4,
    );

    // 本次调用的两个维度：thread_id 进 configurable，user_id 进 context
    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      fitText(
        ctx,
        `invoke(input, { configurable: { thread_id: '${current.threadId}' }, context: { user_id: '${current.userId}' } })`,
        inner,
      ),
      pad,
      pad + 28,
    );

    // 左右两栏
    const panelTop = pad + 56;
    const leftWidth = Math.floor(inner * 0.46);
    const rightX = pad + leftWidth + 24;
    const rightWidth = inner - leftWidth - 24;

    // 左栏：store 结构
    ctx.fillStyle = MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText('store（跨 thread 的命名空间存储）', pad, panelTop + 4);

    const folderTop = panelTop + 18;
    const aliceItems = namespaceItems(current, 'alice');
    const bobItems = namespaceItems(current, 'bob');
    const activeIsAlice = current.userId === 'alice';

    const aliceHeight = drawNamespaceFolder(
      ctx,
      pad,
      folderTop,
      leftWidth,
      '"alice"',
      aliceItems,
      activeIsAlice,
      current.writeThisCall && activeIsAlice ? 1 : 0,
    );
    const bobHeight = drawNamespaceFolder(
      ctx,
      pad,
      folderTop + aliceHeight + 16,
      leftWidth,
      '"bob"',
      bobItems,
      !activeIsAlice,
      current.writeThisCall && !activeIsAlice ? 1 : 0,
    );

    // 检索注入箭头：从当前命名空间指向系统提示
    const arrowY = folderTop + 24;
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(pad + leftWidth + 4, arrowY);
    ctx.lineTo(rightX - 6, arrowY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rightX - 6, arrowY);
    ctx.lineTo(rightX - 12, arrowY - 4);
    ctx.lineTo(rightX - 12, arrowY + 4);
    ctx.closePath();
    ctx.fillStyle = BLUE;
    ctx.fill();
    ctx.font = `11px ${MONO}`;
    ctx.fillStyle = BLUE;
    ctx.fillText('search(ns, { limit })', pad + leftWidth + 10, arrowY - 8);

    // 右栏：拼接后的系统提示
    ctx.fillStyle = MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText('模型看到的系统提示（每次调用模型前拼接）', rightX, panelTop + 4);

    const injected = injectedMemories(current);
    const promptLines = buildSystemPrompt(injected);
    const allInNs = namespaceItems(current, current.userId);
    const truncated = Math.max(0, allInNs.length - injected.length);

    const promptTop = panelTop + 18;
    const lineHeight = 21;
    const promptHeight =
      14 + promptLines.length * lineHeight + (truncated > 0 ? lineHeight : 0) + 12;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.4;
    roundedRect(ctx, rightX, promptTop, rightWidth, promptHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `12px ${MONO}`;
    promptLines.forEach((line, index) => {
      ctx.fillStyle = line.startsWith('- ') ? INK : MUTED;
      ctx.fillText(line, rightX + 14, promptTop + 26 + index * lineHeight);
    });

    if (truncated > 0) {
      ctx.fillStyle = AMBER;
      ctx.fillText(
        `……其余 ${truncated} 条未注入（超 limit 截断）`,
        rightX + 14,
        promptTop + 26 + promptLines.length * lineHeight,
      );
    }

    // 底部结论：记忆跟 user_id 走，不跟 thread_id 走
    const summaryY = promptTop + promptHeight + 26;
    ctx.fillStyle = GREEN;
    ctx.font = `12px ${FONT}`;
    const summary = `记忆取自 ("${current.userId}", "memories")：换 thread_id 注入不变，换 user_id 才会切换命名空间${
      current.writeThisCall
        ? `；本次写入的新记忆，任意 thread 的下次调用即可检索到`
        : ''
    }`;
    ctx.fillText(fitText(ctx, summary, inner), pad, summaryY);

    const total = aliceItems.length + bobItems.length;

    emit({
      namespace: `("${current.userId}", "memories")`,
      injectedCount: injected.length,
      storeTotal: total,
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
