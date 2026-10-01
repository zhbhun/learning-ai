/**
 * 范例介绍：演示前端接入 Mastra 的三条路径——client-js 直连 / AI SDK 转换 / 现成组件库。
 * 输入：path 控件（client-js | ai-sdk | components）。操作：切换「接入路径」单选项。
 * 预期结果：对应列高亮，读数同步给出该路径的依赖、可控性与出界面速度（离线示意，非真实基准）。
 * 阅读主线：三列自下而上都是同一条链路——服务端 Agent → 转换/适配层 → 聊天 UI，差异集中在中间层与 UI 层。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface ChatUiOptions { path: string; }
export interface ChatUiSnapshot { path: string; deps: string; control: string; speed: string; }
export interface ChatUiInstance { update(options: ChatUiOptions): void; dispose(): void; }

interface PathSpec { id: string; label: string; middle: string; ui: string; deps: string; control: string; speed: string; }

const PATHS: PathSpec[] = [
  {
    id: 'client-js', label: 'client-js 直连', ui: '消息列表全自绘',
    middle: '@mastra/client-js\ngetAgent().stream()',
    deps: '@mastra/client-js', control: '高（流处理全在自己）', speed: '慢（UI 全自绘）',
  },
  {
    id: 'ai-sdk', label: 'AI SDK 转换', ui: 'useChat 消息列表',
    middle: '@mastra/ai-sdk\ntoAISdkStream()',
    deps: '@mastra/ai-sdk + @ai-sdk/react + ai', control: '中（转换后自己渲染）', speed: '中（复用 useChat 管线）',
  },
  {
    id: 'components', label: '组件库', ui: '现成 Thread 组件',
    middle: 'assistant-ui / CopilotKit\n自带 Mastra 适配',
    deps: '@assistant-ui/react 或 CopilotKit', control: '低（组件封装流细节）', speed: '快（装上即用）',
  },
];

const SERVER = 'Mastra Agent（服务端）\nchatRoute / handleChatStream / agent.stream';

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ChatUiSnapshot) => void,
): ChatUiInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  let current: ChatUiOptions = { path: 'ai-sdk' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const spec = PATHS.find((p) => p.id === current.path) ?? PATHS[1];
    const colW = width / 3;
    const pad = 12;
    const boxH = 52;

    PATHS.forEach((p, c) => {
      const x = c * colW;
      const active = p.id === spec.id;
      ctx.fillStyle = active ? 'rgba(79,124,255,0.08)' : 'rgba(148,163,184,0.05)';
      ctx.fillRect(x + pad / 2, pad / 2, colW - pad, height - pad);
      ctx.fillStyle = active ? '#1d4ed8' : '#64748b';
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, x + colW / 2, pad + 14);

      [p.ui, p.middle, SERVER].forEach((text, i) => {
        const by = pad + 30 + i * (boxH + 10);
        ctx.beginPath();
        ctx.roundRect(x + pad, by, colW - pad * 2, boxH, 8);
        ctx.fillStyle = active || i === 2 ? 'rgba(79,124,255,0.12)' : 'rgba(148,163,184,0.10)';
        ctx.fill();
        ctx.strokeStyle = active ? '#4f7cff' : '#cbd5e1';
        ctx.lineWidth = active ? 2 : 1;
        ctx.stroke();
        ctx.fillStyle = active || i === 2 ? '#172033' : '#94a3b8';
        ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
        text.split('\n').forEach((line, li) => {
          const dy = boxH / 2 + (li - 0.5) * 16 + 4;
          ctx.fillText(line, x + colW / 2, by + dy, colW - pad * 2 - 8);
        });
      });
    });

    emit({ path: spec.id, deps: spec.deps, control: spec.control, speed: spec.speed });
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
