/**
 * 分层架构示意：把 Mastra 的五个核心层画成可点选的堆叠图，
 * 读者点选（或用 Controls 切换）某层时，读数显示该层的职责与核心 API。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type LayerId = 'agent' | 'workflow' | 'memory' | 'storage' | 'studio';

export interface LayerInfo {
  id: LayerId;
  /** 层的展示名 */
  name: string;
  /** 画布行内的一句话说明 */
  blurb: string;
  /** 画布行右侧标注的包名或入口 */
  tag: string;
  /** 读数：该层职责 */
  duty: string;
  /** 读数：该层核心 API */
  api: string;
}

/** 自顶向下的显示顺序：调试 UI 在上，运行时层居中，持久层在底。 */
export const LAYERS: readonly LayerInfo[] = [
  {
    id: 'studio',
    name: 'Studio',
    blurb: '本地调试 UI',
    tag: 'localhost:4111',
    duty: '调试 UI：测试 Agent、工具与工作流',
    api: 'mastra dev · localhost:4111',
  },
  {
    id: 'agent',
    name: 'Agent',
    blurb: 'instructions + model + tools',
    tag: '@mastra/core/agent',
    duty: '推理层：指令、模型与工具组成智能体',
    api: 'Agent · generate / stream',
  },
  {
    id: 'workflow',
    name: '工作流',
    blurb: '带 schema 的确定性步骤链',
    tag: '@mastra/core/workflows',
    duty: '编排层：多步任务按固定顺序执行',
    api: 'createWorkflow / createStep',
  },
  {
    id: 'memory',
    name: '记忆',
    blurb: 'resource / thread 双标识',
    tag: '@mastra/memory',
    duty: '上下文层：按用户与会话保存历史',
    api: 'Memory · resource / thread',
  },
  {
    id: 'storage',
    name: '存储',
    blurb: '9 个数据域，后端可替换',
    tag: 'LibSQL / Postgres / …',
    duty: '持久层：记忆、快照、追踪等 9 类数据',
    api: 'LibSQLStore · 复合存储按域路由',
  },
];

export interface ExampleOptions {
  layer: LayerId;
}

export interface ExampleSnapshot {
  layer: LayerId;
  name: string;
  duty: string;
  api: string;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
}

function layerInfo(id: LayerId): LayerInfo {
  return LAYERS.find((layer) => layer.id === id) ?? LAYERS[0];
}

function roundRectPath(
  drawingContext: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const r = Math.min(radius, w / 2, h / 2);
  drawingContext.moveTo(x + r, y);
  drawingContext.arcTo(x + w, y, x + w, y + h, r);
  drawingContext.arcTo(x + w, y + h, x, y + h, r);
  drawingContext.arcTo(x, y + h, x, y, r);
  drawingContext.arcTo(x, y, x + w, y, r);
  drawingContext.closePath();
}

function truncate(
  drawingContext: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (drawingContext.measureText(text).width <= maxWidth) {
    return text;
  }
  let end = text.length;
  while (end > 1) {
    const candidate = `${text.slice(0, end - 1)}…`;
    if (drawingContext.measureText(candidate).width <= maxWidth) {
      return candidate;
    }
    end -= 1;
  }
  return '…';
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

  let current: LayerId = 'agent';
  let rowRanges: Array<{ id: LayerId; top: number; bottom: number }> = [];

  function pick(clientX: number, clientY: number): LayerId | null {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    const size = readCanvasSize(canvas);
    const x = (clientX - rect.left) * (size.width / rect.width);
    const y = (clientY - rect.top) * (size.height / rect.height);
    const hit = rowRanges.find((row) => y >= row.top && y < row.bottom);
    return hit ? hit.id : null;
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const left = 48;
    const right = width - left;

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('Mastra 分层架构', left, 44);

    if (height >= 330) {
      drawingContext.fillStyle = '#475569';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(
        'TypeScript 原生的 AI agent 框架，覆盖从原型到生产',
        left,
        64,
      );
    }

    if (width >= 560) {
      drawingContext.fillStyle = '#64748b';
      drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
      drawingContext.textAlign = 'right';
      drawingContext.fillText('点击任意层切换', right, 44);
      drawingContext.textAlign = 'left';
    }

    const top = 92;
    const bottom = Math.max(top + 5 * 26, height - 96);
    const gap = 8;
    const rowHeight = Math.max(24, (bottom - top - gap * 4) / 5);
    rowRanges = [];

    LAYERS.forEach((info, index) => {
      const rowTop = top + index * (rowHeight + gap);
      const rowBottom = rowTop + rowHeight;
      rowRanges.push({ id: info.id, top: rowTop, bottom: rowBottom });

      const selected = info.id === current;
      const rowWidth = right - left;

      drawingContext.beginPath();
      roundRectPath(drawingContext, left, rowTop, rowWidth, rowHeight, 8);
      drawingContext.fillStyle = selected ? '#e9efff' : '#ffffff';
      drawingContext.fill();
      drawingContext.lineWidth = selected ? 1.5 : 1;
      drawingContext.strokeStyle = selected ? '#4f7cff' : '#dbe3f0';
      drawingContext.stroke();

      if (selected) {
        drawingContext.beginPath();
        roundRectPath(
          drawingContext,
          left + 1.5,
          rowTop + 4,
          3,
          rowHeight - 8,
          1.5,
        );
        drawingContext.fillStyle = '#4f7cff';
        drawingContext.fill();
      }

      const centerY = rowTop + rowHeight / 2;

      drawingContext.fillStyle = selected ? '#1d4ed8' : '#172033';
      drawingContext.font = '600 15px ui-sans-serif, system-ui, sans-serif';
      drawingContext.fillText(info.name, left + 20, centerY + 5);

      const tagWidth = drawingContext.measureText(info.tag).width;
      drawingContext.fillStyle = '#7c8aa0';
      drawingContext.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      drawingContext.textAlign = 'right';
      drawingContext.fillText(info.tag, right - 16, centerY + 4);
      drawingContext.textAlign = 'left';

      const blurbLeft = left + 150;
      const blurbMax = right - 16 - tagWidth - blurbLeft - 12;
      if (rowWidth >= 420 && blurbMax >= 40) {
        drawingContext.fillStyle = '#475569';
        drawingContext.font = '12px ui-sans-serif, system-ui, sans-serif';
        drawingContext.fillText(
          truncate(drawingContext, info.blurb, blurbMax),
          blurbLeft,
          centerY + 4,
        );
      }
    });

    const info = layerInfo(current);
    emit({ layer: current, name: info.name, duty: info.duty, api: info.api });
  }

  const onClick = (event: MouseEvent) => {
    const hit = pick(event.clientX, event.clientY);
    if (hit && hit !== current) {
      current = hit;
      draw();
    }
  };

  const onMove = (event: MouseEvent) => {
    canvas.style.cursor = pick(event.clientX, event.clientY) ? 'pointer' : 'default';
  };

  canvas.addEventListener('click', onClick);
  canvas.addEventListener('mousemove', onMove);
  draw();

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options.layer;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mousemove', onMove);
    },
  };
}
