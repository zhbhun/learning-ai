/**
 * 演示内容：一条多块消息经过 TokenLimiter 与 ToolCallFilter 两站后的形态变化。
 * 输入：令牌预算（useLimiter + tokenBudget）与是否过滤工具块（filterToolCalls）。
 * 操作：拖动预算滑杆、开关两个处理器，观察右列方块的保留与裁剪。
 * 预期结果：读数显示进入模型的 token 数与各站处理数量，可据此核对正文结论。
 * 阅读主线：原始消息 → 处理站 → 进入模型（被丢弃的块以半透明加删除线显示）。
 */

import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface PipelineOptions {
  useLimiter: boolean;
  tokenBudget: number;
  filterToolCalls: boolean;
}

export interface PipelineSnapshot {
  rawTokens: number;
  finalTokens: number;
  limiterDropped: number;
  toolFiltered: number;
}

export interface PipelineInstance {
  update(options: PipelineOptions): void;
  dispose(): void;
}

interface Block {
  id: string;
  label: string;
  tokens: number;
  kind: 'system' | 'text' | 'tool';
}

const BLOCKS: Block[] = [
  { id: 'system', label: 'system 提示 120t', tokens: 120, kind: 'system' },
  { id: 'history', label: '历史消息 40t', tokens: 40, kind: 'text' },
  { id: 'tool-call', label: 'tool-call 90t', tokens: 90, kind: 'tool' },
  { id: 'tool-result', label: 'tool-result 110t', tokens: 110, kind: 'tool' },
  { id: 'assistant', label: 'assistant 60t', tokens: 60, kind: 'text' },
];

const BLOCK_HEIGHT = 34;
const BLOCK_GAP = 12;
const BLOCK_WIDTH = 176;

export function createPipeline(
  canvas: HTMLCanvasElement,
  emit: (snapshot: PipelineSnapshot) => void,
): PipelineInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: PipelineOptions = { useLimiter: true, tokenBudget: 250, filterToolCalls: false };
  const resizeObserver = createResizeObserver(canvas, draw);

  function runPipeline(): { kept: Set<string>; limiterDropped: number; toolFiltered: number } {
    let working = BLOCKS;
    let toolFiltered = 0;
    if (current.filterToolCalls) {
      toolFiltered = working.filter((b) => b.kind === 'tool').length;
      working = working.filter((b) => b.kind !== 'tool');
    }
    let limiterDropped = 0;
    if (current.useLimiter) {
      for (;;) {
        const total = working.reduce((sum, b) => sum + b.tokens, 0);
        if (total <= current.tokenBudget) {
          break;
        }
        const oldest = working.find((b) => b.kind !== 'system');
        if (!oldest) {
          break;
        }
        working = working.filter((b) => b.id !== oldest.id);
        limiterDropped += 1;
      }
    }
    return { kept: new Set(working.map((b) => b.id)), limiterDropped, toolFiltered };
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBlock(x: number, y: number, block: Block, dropped: boolean) {
    roundRect(x, y, BLOCK_WIDTH, BLOCK_HEIGHT, 6);
    ctx.fillStyle = dropped ? '#eef1f6' : block.kind === 'tool' ? '#dbe7ff' : '#e2e8f0';
    ctx.fill();
    ctx.strokeStyle = dropped ? '#cbd5e1' : '#94a3b8';
    ctx.stroke();
    ctx.fillStyle = dropped ? '#94a3b8' : '#172033';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(block.label, x + 10, y + 21);
    if (dropped) {
      ctx.strokeStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(x + 8, y + BLOCK_HEIGHT / 2);
      ctx.lineTo(x + BLOCK_WIDTH - 8, y + BLOCK_HEIGHT / 2);
      ctx.stroke();
    }
  }

  function drawStation(x: number, y: number, title: string, active: boolean, note: string) {
    roundRect(x, y, 132, 44, 8);
    if (active) {
      ctx.fillStyle = '#4f7cff';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#f6f7fa';
      ctx.fill();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#94a3b8';
    }
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(title, x + 12, y + 18);
    ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(note, x + 12, y + 33);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(560, size.width);
    const height = Math.max(300, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const result = runPipeline();
    const rawTokens = BLOCKS.reduce((sum, b) => sum + b.tokens, 0);
    const finalTokens = BLOCKS.filter((b) => result.kept.has(b.id)).reduce(
      (sum, b) => sum + b.tokens,
      0,
    );

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('处理器管道：原始消息 → 处理站 → 进入模型', 48, 44);

    const leftX = 48;
    const rightX = width - BLOCK_WIDTH - 48;
    const topY = 110;

    ctx.fillStyle = '#475569';
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('原始消息', leftX, topY - 14);
    ctx.fillText('进入模型（虚线红 = 被丢弃）', rightX, topY - 14);

    BLOCKS.forEach((block, index) => {
      const y = topY + index * (BLOCK_HEIGHT + BLOCK_GAP);
      drawBlock(leftX, y, block, false);
      drawBlock(rightX, y, block, !result.kept.has(block.id));
      ctx.strokeStyle = '#dbe2ec';
      ctx.beginPath();
      ctx.moveTo(leftX + BLOCK_WIDTH, y + BLOCK_HEIGHT / 2);
      ctx.lineTo(rightX, y + BLOCK_HEIGHT / 2);
      ctx.stroke();
    });

    const stationX = (leftX + BLOCK_WIDTH + rightX) / 2 - 66;
    drawStation(
      stationX,
      topY + 26,
      'TokenLimiter',
      current.useLimiter,
      current.useLimiter ? `预算 ${current.tokenBudget}t` : '未启用',
    );
    drawStation(
      stationX,
      topY + 118,
      'ToolCallFilter',
      current.filterToolCalls,
      current.filterToolCalls ? '移除工具块' : '未启用',
    );

    ctx.fillStyle = '#475569';
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText(
      `ToolCallFilter 只影响发给模型的输入；被过滤的块仍会写入 memory 历史`,
      48,
      height - 20,
    );

    emit({
      rawTokens,
      finalTokens,
      limiterDropped: result.limiterDropped,
      toolFiltered: result.toolFiltered,
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
