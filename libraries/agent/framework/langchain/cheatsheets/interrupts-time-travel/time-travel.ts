/**
 * 范例介绍：时间旅行模拟器（官方算例）。图 START → generateTopic → writeJoke → END
 * 挂 checkpointer 跑完一次，留下 4 份 checkpoint 链；读者把「时间坐标」选到链上
 * 某份快照，再选「重放（replay）」或「分叉（fork）」两种玩法：
 * 重放 = invoke(null, snapshot.config)，目标点之后的节点重新执行、新快照追加到同链；
 * 分叉 = updateState(config, { topic: 'chickens' }) 从该点长出 source: 'update' 的
 * 新快照再继续，原历史不动。含两个边界：重放最终快照是 no-op；在没有节点执行
 * 历史的快照上 updateState 推断不出 as_node，抛 InvalidUpdateError。
 * 输入或前置状态：Controls 提供时间坐标（step 0 / 1 / 2 三份可跳快照）与玩法；
 * 纯本地 TS 确定性模拟，不依赖 @langchain/*，不发起模型调用。
 * 主要操作：切换时间坐标；在重放 / 分叉两种模式间对照。
 * 预期结果：目标点之前的节点（generateTopic）始终 0 次重跑；分叉改 topic 后
 * writeJoke 按新值算出不同 joke；分叉到最终点时 writeJoke 不重跑、joke 保持旧值。
 * 阅读主线：resolveOutcome() 里 replay / fork / 边界三分支。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type TravelMode = 'replay' | 'fork';

export interface ExampleOptions {
  mode: TravelMode;
  forkIndex: number;
}

export interface ExampleSnapshot {
  selectedStep: string;
  topicReruns: string;
  jokeReruns: string;
  outcome: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#5d6b7e';
const BLUE = '#4f7cff';
const GREEN = '#1f9d63';
const RED = '#c2402f';
const AMBER = '#b45309';
const LINE = '#dbe3f0';
const FONT = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// 主链 4 份 checkpoint，与官方 time travel 算例一致：
// input(-1) → 输入就绪(0) → generateTopic 完成(1) → writeJoke 完成(2)。
interface ChainCard {
  step: number;
  source: string;
  next: string;
  detail: string;
}

const CHAIN: ChainCard[] = [
  { step: -1, source: 'input', next: '__start__', detail: 'values: {}' },
  { step: 0, source: 'loop', next: 'generateTopic', detail: '输入就绪' },
  {
    step: 1,
    source: 'loop',
    next: 'writeJoke',
    detail: 'topic: socks…',
  },
  { step: 2, source: 'loop', next: '[]（完成）', detail: 'joke: socks 版' },
];

const MAIN_JOKE = 'Why do socks… They elope!';
const FORK_JOKE = 'Why do chickens… They elope!';

interface Outcome {
  // 分叉 / 重放产生的新快照卡片（0-2 张）；为空时显示单行说明
  cards: Array<{ title: string; lines: string[]; accent: string }>;
  headline: string;
  headlineColor: string;
  compare: string;
  error: boolean;
}

// 语义分支：forkIndex 1-3 对应链上 step 0 / 1 / 2 的快照。
// replay：目标点之后的节点重新执行，新快照追加到同一条 thread 链。
// fork：updateState 追加 source: 'update' 快照，再 invoke(null) 从 as_node 后继继续。
function resolveOutcome(mode: TravelMode, forkIndex: number): Outcome {
  if (mode === 'replay') {
    if (forkIndex === 1) {
      return {
        cards: [
          {
            title: "step 1（追加）",
            lines: ['writes: generateTopic', 'topic: socks…'],
            accent: BLUE,
          },
          {
            title: 'step 2（追加）',
            lines: ['writes: writeJoke', `joke: ${MAIN_JOKE}`],
            accent: BLUE,
          },
        ],
        headline: '重放：generateTopic 与 writeJoke 都重新执行',
        headlineColor: INK,
        compare:
          '目标点之后的节点重跑、新快照追加到同一条链；目标点之前的结果已在 checkpoint 里。',
        error: false,
      };
    }
    if (forkIndex === 2) {
      return {
        cards: [
          {
            title: 'step 2（追加）',
            lines: ['writes: writeJoke', `joke: ${MAIN_JOKE}`],
            accent: BLUE,
          },
        ],
        headline: '重放：只有 writeJoke 重新执行，generateTopic 0 次',
        headlineColor: INK,
        compare:
          '不是缓存回放：writeJoke 的代码重新运行（LLM / 外部调用可能给出不同结果）。',
        error: false,
      };
    }
    return {
      cards: [],
      headline: 'no-op：最终快照的 next 为空，没有节点需要执行',
      headlineColor: AMBER,
      compare: '重放已完成图的最后一份 checkpoint，什么都不发生。',
      error: false,
    };
  }

  // fork 模式
  if (forkIndex === 1) {
    return {
      cards: [],
      headline: 'InvalidUpdateError: Ambiguous update, specify "asNode"',
      headlineColor: RED,
      compare:
        '该快照上还没有任何节点执行历史，推断不出 as_node——显式传入（如 asNode: \'generateTopic\'）即可。',
      error: true,
    };
  }
  if (forkIndex === 2) {
    return {
      cards: [
        {
          title: "source: 'update'",
          lines: ['as_node: generateTopic', 'topic: chickens'],
          accent: GREEN,
        },
        {
          title: 'step 3（分叉）',
          lines: ['writes: writeJoke', `joke: ${FORK_JOKE}`],
          accent: GREEN,
        },
      ],
      headline: "分叉：updateState 改 topic='chickens'，writeJoke 用新值重跑",
      headlineColor: INK,
      compare:
        `主线 topic 'socks…' → ${MAIN_JOKE}　分叉 topic 'chickens' → ${FORK_JOKE}（原历史完整保留）`,
      error: false,
    };
  }
  return {
    cards: [
      {
        title: "source: 'update'",
        lines: ['as_node: writeJoke', 'topic: chickens'],
        accent: GREEN,
      },
    ],
    headline: '分叉到最终点：writeJoke 的后继是 END，没有任何节点重跑',
    headlineColor: INK,
    compare: `改了 topic 但 joke 不变（仍是 ${MAIN_JOKE}）——执行从 as_node 节点的后继开始。`,
    error: false,
  };
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

  let current: ExampleOptions = { mode: 'fork', forkIndex: 2 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(340, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const { mode, forkIndex: rawForkIndex } = current;
    const forkIndex = Math.max(1, Math.min(3, Math.round(rawForkIndex)));
    const outcome = resolveOutcome(mode, forkIndex);

    ctx.fillStyle = INK;
    ctx.font = `600 16px ${FONT}`;
    ctx.fillText('时间旅行：沿 checkpoint 链选历史点，重放或分叉', 24, 30);

    ctx.font = `12px ${MONO}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(
      "图：START → generateTopic → writeJoke → END（thread_id: 'demo-2'，已完整跑过一次）",
      24,
      50,
    );

    // 顶部图条 + 节点级「将重跑 / 已保存」徽标
    const stripY = 82;
    const stripX = 24;
    const stripW = width - 48;
    const nodeSlot = stripW / 4;
    ctx.font = `12px ${MONO}`;
    ['START', 'generateTopic', 'writeJoke', 'END'].forEach((name, index) => {
      const cx = stripX + nodeSlot * index + nodeSlot / 2;
      ctx.textAlign = 'center';
      ctx.beginPath();
      ctx.arc(cx, stripY, 5, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 || index === 3 ? MUTED : BLUE;
      ctx.fill();
      ctx.fillStyle = MUTED;
      ctx.fillText(name, cx, stripY - 12);

      if (index < 3) {
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx + 8, stripY);
        ctx.lineTo(stripX + nodeSlot * (index + 1) + nodeSlot / 2 - 8, stripY);
        ctx.stroke();
      }

      // 中间两个节点挂重跑 / 已保存徽标
      if (index === 1 || index === 2) {
        const rerun =
          outcome.error
            ? false
            : mode === 'replay'
              ? forkIndex <= index
              : forkIndex === 2 && index === 2;
        const label = rerun ? '将重跑' : '已保存';
        ctx.font = `700 10px ${FONT}`;
        ctx.fillStyle = rerun ? RED : GREEN;
        ctx.fillText(label, cx, stripY + 22);
        ctx.font = `12px ${MONO}`;
      }
    });
    ctx.textAlign = 'left';

    // 主 checkpoint 链（4 份），选中份高亮并挂「时间坐标」标记
    const chainY = 122;
    const chainH = 64;
    const cardGap = 12;
    const cardW = Math.floor((stripW - cardGap * 3) / 4);

    CHAIN.forEach((card, index) => {
      const cx = stripX + index * (cardW + cardGap);
      const selected = index === forkIndex;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = selected ? BLUE : LINE;
      ctx.lineWidth = selected ? 2 : 1.4;
      roundedRect(ctx, cx, chainY, cardW, chainH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = `700 12px ${MONO}`;
      ctx.fillStyle = selected ? BLUE : MUTED;
      ctx.fillText(`step ${card.step}`, cx + 10, chainY + 18);
      if (selected) {
        ctx.font = `700 10px ${FONT}`;
        ctx.fillStyle = BLUE;
        ctx.fillText('时间坐标', cx + 10, chainY - 6);
      }

      ctx.font = `11px ${MONO}`;
      ctx.fillStyle = INK;
      ctx.fillText(fitText(ctx, `next: ${card.next}`, cardW - 20), cx + 10, chainY + 34);
      ctx.fillStyle = MUTED;
      ctx.fillText(
        fitText(ctx, `${card.source}｜${card.detail}`, cardW - 20),
        cx + 10,
        chainY + 49,
      );

      if (index < 3) {
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx + cardW + 2, chainY + chainH / 2);
        ctx.lineTo(cx + cardW + cardGap - 3, chainY + chainH / 2);
        ctx.stroke();
      }
    });

    // 从选中快照向下的分叉引线 + 操作命令
    const selX = stripX + forkIndex * (cardW + cardGap) + cardW / 2;
    const panelY = 214;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = mode === 'fork' ? GREEN : BLUE;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(selX, chainY + chainH + 2);
    ctx.lineTo(selX, panelY - 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `700 11px ${MONO}`;
    ctx.fillStyle = mode === 'fork' ? GREEN : BLUE;
    const command =
      mode === 'fork'
        ? "updateState(config, { topic: 'chickens' }) → invoke(null, forkConfig)"
        : 'invoke(null, snapshot.config)  // config 带 checkpoint_id';
    const room = Math.max(120, width - 24 - (selX + 10));
    ctx.fillText(fitText(ctx, command, room), selX + 10, chainY + chainH + 20);

    // 结果面板：新快照卡片 + 结论
    const panelH = 96;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = outcome.error ? RED : LINE;
    ctx.lineWidth = 1.4;
    roundedRect(ctx, stripX, panelY, stripW, panelH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = outcome.headlineColor;
    ctx.fillText(
      fitText(ctx, outcome.headline, stripW - 24),
      stripX + 14,
      panelY + 22,
    );

    if (outcome.cards.length > 0) {
      const oGap = 12;
      const oW = Math.floor((stripW * 0.5 - 28 - oGap) / Math.max(1, outcome.cards.length));
      outcome.cards.forEach((card, index) => {
        const cx = stripX + 14 + index * (oW + oGap);
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = card.accent;
        ctx.lineWidth = 1.4;
        roundedRect(ctx, cx, panelY + 34, oW, 38, 6);
        ctx.fill();
        ctx.stroke();
        ctx.font = `700 11px ${MONO}`;
        ctx.fillStyle = card.accent;
        ctx.fillText(fitText(ctx, card.title, oW - 16), cx + 8, panelY + 49);
        ctx.font = `10px ${MONO}`;
        ctx.fillStyle = INK;
        ctx.fillText(fitText(ctx, card.lines.join('  '), oW - 16), cx + 8, panelY + 63);
      });
    }

    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(fitText(ctx, outcome.compare, stripW - 24), stripX + 14, panelY + panelH - 10);

    // 底部固定结论
    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = INK;
    ctx.fillText(
      fitText(
        ctx,
        '共同前提：目标点之前的节点不重跑（结果已在 checkpoint 里）；之后的节点重新执行，不是缓存回放。',
        width - 48,
      ),
      24,
      panelY + panelH + 24,
    );

    const topicReruns =
      outcome.error || !(mode === 'replay' && forkIndex === 1) ? '0 次' : '1 次';
    const jokeReruns = outcome.error
      ? '—（未执行）'
      : mode === 'replay'
        ? forkIndex === 3
          ? '0 次'
          : '1 次'
        : forkIndex === 2
          ? '1 次'
          : '0 次';
    const outcomeText = outcome.error
      ? 'InvalidUpdateError'
      : mode === 'replay'
        ? forkIndex === 3
          ? 'no-op'
          : `joke: ${MAIN_JOKE}`
        : forkIndex === 2
          ? `joke: ${FORK_JOKE}`
          : `joke 不变（${MAIN_JOKE}）`;

    emit({
      selectedStep: `step ${CHAIN[forkIndex].step}`,
      topicReruns,
      jokeReruns,
      outcome: outcomeText,
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
