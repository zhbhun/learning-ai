/**
 * 范例介绍：演示一个可调输入怎样进入核心计算，并把结果呈现为可核对读数。
 * 创建实际课程时，把输入名、计算和读数替换为本课的公开 API 或概念。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export interface ExampleOptions {
  amount: number;
}

export interface ExampleSnapshot {
  amount: number;
  result: number;
}

export interface ExampleInstance {
  update(options: ExampleOptions): void;
  dispose(): void;
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

  let current: ExampleOptions = { amount: 3 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawingContext.clearRect(0, 0, width, height);

    const result = current.amount * 2;
    const trackWidth = width - 96;
    const barWidth = Math.max(0, Math.min(trackWidth, (result / 20) * trackWidth));

    drawingContext.fillStyle = '#172033';
    drawingContext.font = '600 18px ui-sans-serif, system-ui, sans-serif';
    drawingContext.fillText('输入进入核心计算后得到可核对结果', 48, 64);

    drawingContext.fillStyle = '#e2e8f0';
    drawingContext.fillRect(48, 112, trackWidth, 32);
    drawingContext.fillStyle = '#4f7cff';
    drawingContext.fillRect(48, 112, barWidth, 32);

    drawingContext.fillStyle = '#475569';
    drawingContext.font = '14px ui-monospace, SFMono-Regular, Menlo, monospace';
    drawingContext.fillText(`${current.amount} × 2 = ${result}`, 48, 176);

    emit({ amount: current.amount, result });
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
