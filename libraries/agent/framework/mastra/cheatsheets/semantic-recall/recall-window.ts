/**
 * 演示内容：语义召回如何按含义从历史线程中拉回相关消息，并展开上下文窗口。
 * 输入：topK（取几条匹配）、messageRange（每条匹配前后附带几条）、scope（搜索范围）。
 * 操作：拖动滑杆、切换范围，观察列表中匹配条与窗口条的高亮变化。
 * 预期结果：读数显示匹配条数、窗口内消息数与估算注入 token，可核对正文结论。
 * 阅读主线：完整历史 → 相似度匹配 → 按 messageRange 扩窗 → 注入本轮上下文。
 */

import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface RecallOptions {
  topK: number;
  messageRange: number;
  scope: 'thread' | 'resource';
}

export interface RecallSnapshot {
  matchCount: number;
  windowCount: number;
  windowTokens: number;
}

export interface RecallInstance {
  update(options: RecallOptions): void;
  dispose(): void;
}

interface Msg {
  id: string;
  text: string;
  tokens: number;
  sim?: number; // 与当前查询的相似度（示意）
}

// resource 级更早的 8 条（仅 scope='resource' 时参与检索）
const OLDER: Msg[] = [
  { id: 'R1', text: '用户：我们主要做跨境电商', tokens: 14 },
  { id: 'R2', text: '助手：了解，主要市场是？', tokens: 12 },
  { id: 'R3', text: '用户：欧美和东南亚', tokens: 10 },
  { id: 'R4', text: '助手：物流上有什么偏好？', tokens: 12 },
  { id: 'R5', text: '用户：东南亚走专线小包', tokens: 14 },
  { id: 'R6', text: '用户：之前洽谈过极兔的折扣价', tokens: 18, sim: 0.88 },
  { id: 'R7', text: '助手：已记录物流偏好', tokens: 10 },
  { id: 'R8', text: '用户：接下来聊营销预算', tokens: 12 },
];

// 当前 thread 的 10 条
const THREAD: Msg[] = [
  { id: 'M1', text: '用户：新店铺想上 20 个 SKU', tokens: 14 },
  { id: 'M2', text: '助手：选品方向定了吗？', tokens: 12 },
  { id: 'M3', text: '用户：要求 6 月 30 日前全部上架', tokens: 16, sim: 0.91 },
  { id: 'M4', text: '助手：需要我先排优先级吗？', tokens: 12 },
  { id: 'M5', text: '用户：先上利润最高的五款', tokens: 14 },
  { id: 'M6', text: '助手：好的，我会按毛利排序', tokens: 12 },
  { id: 'M7', text: '用户：上架时间别晚于截止日', tokens: 16, sim: 0.84 },
  { id: 'M8', text: '助手：明白，6 月 30 日是硬约束', tokens: 14 },
  { id: 'M9', text: '用户：帮我把截止日写进周报', tokens: 16, sim: 0.62 },
  { id: 'M10', text: '用户：这周的复购率怎么样？', tokens: 14 },
];

const ROW_HEIGHT = 22;
const TOP = 64;

export function createRecall(
  canvas: HTMLCanvasElement,
  emit: (snapshot: RecallSnapshot) => void,
): RecallInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: RecallOptions = { topK: 2, messageRange: 1, scope: 'thread' };
  const resizeObserver = createResizeObserver(canvas, draw);

  function compute() {
    const pool = current.scope === 'resource' ? [...OLDER, ...THREAD] : THREAD;
    const ranked = pool
      .filter((m) => m.sim !== undefined)
      .sort((a, b) => (b.sim ?? 0) - (a.sim ?? 0));
    const matches = ranked.slice(0, current.topK);
    const all = [...OLDER, ...THREAD];
    const windowIds = new Set<string>();
    for (const match of matches) {
      const idx = all.findIndex((m) => m.id === match.id);
      for (
        let i = Math.max(0, idx - current.messageRange);
        i <= Math.min(all.length - 1, idx + current.messageRange);
        i++
      ) {
        windowIds.add(all[i].id);
      }
    }
    const windowMsgs = all.filter((m) => windowIds.has(m.id));
    return {
      all,
      matchIds: new Set(matches.map((m) => m.id)),
      windowIds,
      matchCount: matches.length,
      windowCount: windowMsgs.length,
      windowTokens: windowMsgs.reduce((sum, m) => sum + m.tokens, 0),
    };
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(320, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const result = compute();

    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('查询：上架截止日是哪天？——按语义检索历史消息', 48, 34);

    const searchable = current.scope === 'resource';
    result.all.forEach((msg, index) => {
      const y = TOP + index * ROW_HEIGHT;
      const isMatch = result.matchIds.has(msg.id);
      const inWindow = result.windowIds.has(msg.id);
      const outOfScope = !searchable && OLDER.some((o) => o.id === msg.id);

      if (inWindow && !outOfScope) {
        ctx.fillStyle = '#e5edff';
        ctx.fillRect(44, y - 15, width - 96, ROW_HEIGHT - 2);
      }
      ctx.fillStyle = outOfScope ? '#cbd5e1' : isMatch ? '#1d4ed8' : '#334155';
      ctx.font = isMatch
        ? '600 12px ui-sans-serif, system-ui, sans-serif'
        : '12px ui-sans-serif, system-ui, sans-serif';
      const label = outOfScope ? `${msg.id}（未参与检索）${msg.text}` : `${msg.id}  ${msg.text}`;
      ctx.fillText(label, 52, y);
      if (isMatch) {
        ctx.fillStyle = '#1d4ed8';
        ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(`相似度 ${msg.sim?.toFixed(2)}`, width - 150, y);
      }
    });

    ctx.fillStyle = '#475569';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(
      `scope=${current.scope} · topK=${current.topK} · messageRange=±${current.messageRange} · 蓝底=注入窗口 加粗=匹配条`,
      44,
      height - 12,
    );

    emit({
      matchCount: result.matchCount,
      windowCount: result.windowCount,
      windowTokens: result.windowTokens,
    });
  }

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
