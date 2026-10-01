/** 范例介绍：离线演示 browser provider 选型对照（不启动真实浏览器）。
 *  输入：provider 控件（AgentBrowser / Stagehand / FirecrawlBrowser / BrowserViewer）。
 *  操作：切换 provider，观察流程条中的 provider 高亮与四行对照中的选中行。
 *  预期结果：读数显示运行位置、定位方式与部署要求。
 *  阅读主线：接入方式统一为 new Agent({ browser })，差别只在运行位置与定位方式。 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type ProviderId = 'agent-browser' | 'stagehand' | 'firecrawl' | 'browser-viewer';

export interface ProviderInfo { label: string; scene: string; location: string; targeting: string; requirement: string; }

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  'agent-browser': {
    label: 'AgentBrowser', scene: '通用自动化 / 抓取', location: '本机（Playwright 驱动）',
    targeting: '无障碍树定位元素', requirement: '本地安装 Playwright 浏览器',
  },
  stagehand: {
    label: 'Stagehand', scene: '自然语言操作复杂页面', location: 'Browserbase 云端或本机',
    targeting: 'AI 检测元素，自然语言选择器', requirement: 'Browserbase apiKey + projectId',
  },
  firecrawl: {
    label: 'FirecrawlBrowser', scene: '免部署抓取', location: 'Firecrawl 托管沙箱',
    targeting: '复用 AgentBrowser 工具集', requirement: '仅 Firecrawl API key，无本地浏览器',
  },
  'browser-viewer': {
    label: 'BrowserViewer', scene: 'CLI 调试（workspace agent）', location: '本机 Chrome',
    targeting: 'CDP 注入命令行工具', requirement: '本机 Chrome，经 shell 驱动',
  },
};

export interface BrowserSnapshot { provider: ProviderId; location: string; targeting: string; requirement: string; }

export interface BrowserInstance { update(args: { provider: ProviderId }): void; dispose(): void; }

export function createBrowserExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: BrowserSnapshot) => void,
): BrowserInstance {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持 Canvas 2D。');
  const ctx: CanvasRenderingContext2D = context;
  let current: ProviderId = 'agent-browser';

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(640, size.width);
    const height = Math.max(420, size.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const info = PROVIDERS[current];

    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('接入方式一致：new Agent({ browser })，差别在位置与定位', 32, 34);

    // 流程条：Agent → 选中 provider → 浏览器 → 网页
    const boxes: Array<[string, number]> = [['Agent', 78], [info.label, 158], ['浏览器', 90], ['网页', 90]];
    let x = 32;
    boxes.forEach(([text, w], i) => {
      const active = i === 1;
      ctx.fillStyle = active ? '#4f7cff' : '#e2e8f0';
      ctx.fillRect(x, 56, w, 32);
      ctx.fillStyle = active ? '#ffffff' : '#334155';
      ctx.font = (active ? '600 ' : '') + '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(text, x + 12, 77);
      x += w;
      if (i < boxes.length - 1) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('→', x + 10, 77);
        x += 36;
      }
    });

    // 四行 provider 对照，选中行高亮
    const ids = Object.keys(PROVIDERS) as ProviderId[];
    ids.forEach((id, i) => {
      const row = PROVIDERS[id];
      const y = 116 + i * 66;
      const active = id === current;
      ctx.fillStyle = active ? '#eaf0ff' : '#f1f5f9';
      ctx.fillRect(32, y, width - 64, 58);
      if (active) {
        ctx.fillStyle = '#4f7cff';
        ctx.fillRect(32, y, 4, 58);
      }
      ctx.fillStyle = active ? '#1d4ed8' : '#172033';
      ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(`${row.label} · ${row.scene}`, 52, y + 22);
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`位置：${row.location}    定位：${row.targeting}`, 52, y + 42);
    });

    emit({ provider: current, location: info.location, targeting: info.targeting, requirement: info.requirement });
  }

  const observer = createResizeObserver(canvas, draw);
  return {
    update(args) {
      current = args.provider;
      draw();
    },
    dispose() {
      observer.disconnect();
    },
  };
}
