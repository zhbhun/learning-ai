/**
 * 范例介绍：离线示意 Mastra Platform 三个运维视角——trace 聚类、告警规则、数据库绑定。
 * 输入：view（运维视角）、traceCount（completed traces 数）、alertTriggers（告警触发器勾选）；
 * 操作：用 Controls 切换视角或调整输入。预期结果：trace 视角显示约 100 条 traces 阈值与四类
 * 信号流图，alerts 视角显示触发器到通知渠道的连线，database 视角显示 env 绑定链路与迁移注意。
 * 阅读主线：先看顶部定位路径，再对照面板注释与左下角读数核对配置要点。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type OpsView = 'trace' | 'alerts' | 'database';
export interface OpsOptions { view: OpsView; traceCount: number; alertTriggers: string[]; }
export interface OpsSnapshot { view: OpsView; traceCount: number; themesReady: boolean; triggerCount: number; }
export interface OpsInstance { update(options: OpsOptions): void; dispose(): void; }

const TRIGGERS: Array<[string, string]> = [
  ['deploy-failed', 'Deploy failed：构建或部署未达到 running 状态'],
  ['service-crashed', 'Service crashed：重启策略耗尽后服务停止'],
  ['service-oom', 'Service out of memory：内存耗尽被停止'],
];

export function createOpsPanel(canvas: HTMLCanvasElement, emit: (s: OpsSnapshot) => void): OpsInstance {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持 Canvas 2D。');
  const ctx: CanvasRenderingContext2D = context;
  let current: OpsOptions = { view: 'trace', traceCount: 120, alertTriggers: ['deploy-failed', 'service-crashed'] };
  const caption = (text: string, x: number, y: number) => {
    ctx.fillStyle = '#64748b'; ctx.font = '12px ui-sans-serif, system-ui, sans-serif'; ctx.fillText(text, x, y);
  };

  function draw() {
    const size = readCanvasSize(canvas); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(560, size.width); const height = Math.max(320, size.height);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height);
    const path = current.view === 'trace' ? 'Studio 侧边栏 → Intelligence' : current.view === 'alerts' ? 'projects.mastra.ai → organization settings → Alerts' : 'dashboard → service → Database';
    ctx.fillStyle = '#172033'; ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`定位路径：${path}`, 32, 40);
    if (current.view === 'trace') {
      const trackW = width - 64;
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(32, 70, trackW, 20);
      ctx.fillStyle = current.traceCount >= 100 ? '#2f9e6e' : '#4f7cff';
      ctx.fillRect(32, 70, trackW * Math.min(current.traceCount / 200, 1), 20);
      ctx.fillStyle = '#d9480f'; ctx.fillRect(32 + trackW / 2, 62, 3, 36); // 100/200：约 100 条阈值标记
      const need = Math.max(0, 100 - current.traceCount);
      const ready = need === 0 ? '主题就绪（异步处理，可能仍需几分钟）' : `还差约 ${need} 条`;
      ctx.fillStyle = '#334155'; ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`completed traces：${current.traceCount}（阈值约 100）→ ${ready}`, 32, 108);
      // 四类内置信号：每条可分析 trace 各产生一条 signal，themes 按信号类型独立聚类
      const cols = ['Goal', 'Outcome', 'Behavior', 'Sentiment'];
      const colW = (width - 64) / 4; const top = 140;
      ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      cols.forEach((col, i) => {
        const x = 32 + i * colW;
        ctx.fillStyle = '#dbe4f0'; ctx.fillRect(x, top, colW - 18, 32);
        ctx.fillStyle = '#172033'; ctx.fillText(col, x + 10, top + 21);
      });
      ctx.strokeStyle = '#4f7cff';
      for (let i = 1; i < cols.length; i++) {
        const x = 32 + i * colW - 18;
        ctx.beginPath(); ctx.moveTo(x, top + 16); ctx.lineTo(x + 18, top + 16); ctx.stroke();
      }
      caption('node=theme，ribbon 宽度=共享 traces 数；流图表示关联，不是因果或执行顺序', 32, height - 52);
      caption('至少两个信号类型出现 themes 才显示流图；小主题并入 Other，未稳定匹配的归入 Noise', 32, height - 32);
    } else if (current.view === 'alerts') {
      const destX = Math.max(470, width * 0.6);
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      TRIGGERS.forEach(([id, text], i) => {
        const y = 78 + i * 44;
        const on = current.alertTriggers.includes(id);
        ctx.fillStyle = on ? '#4f7cff' : '#e2e8f0'; ctx.fillRect(32, y, 18, 18);
        if (on) {
          ctx.strokeStyle = '#4f7cff';
          ctx.beginPath(); ctx.moveTo(50, y + 9); ctx.lineTo(destX, y + 9); ctx.stroke();
        }
        ctx.fillStyle = '#334155'; ctx.fillText(text, 60, y + 14);
      });
      ctx.fillStyle = '#dbe4f0'; ctx.fillRect(destX, 64, width - destX - 32, 124);
      ctx.fillStyle = '#172033'; ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('Destinations', destX + 10, 86);
      caption('Slack：选频道，私有频道先邀请 @Mastra Alerts', destX + 10, 112);
      caption('Email：组织成员/角色/单个成员，外部地址最多 10 个', destX + 10, 134);
      caption('Webhook：须 https:// 开头，签名 secret 仅创建时显示一次', destX + 10, 156);
      caption('Repeat：every event / 5 / 15 分钟 / 每小时；首条、恢复与升级通知始终立即发送', 32, height - 32);
    } else {
      const boxes: Array<[string, string]> = [
        ['Mastra service', '部署在平台上的服务'],
        ['env 绑定', 'DATABASE_URL 等凭据经环境变量注入'],
        ['托管 database', '平台提供的受管数据层'],
      ];
      const boxW = Math.min(240, (width - 128) / 3); const gap = (width - 64 - boxW * 3) / 2;
      ctx.strokeStyle = '#4f7cff';
      boxes.forEach(([title, sub], i) => {
        const x = 32 + i * (boxW + gap);
        ctx.fillStyle = '#dbe4f0'; ctx.fillRect(x, 92, boxW, 64);
        ctx.fillStyle = '#172033'; ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(title, x + 12, 116);
        ctx.fillStyle = '#475569'; ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText(sub, x + 12, 138);
        if (i < 2) { ctx.beginPath(); ctx.moveTo(x + boxW, 124); ctx.lineTo(x + boxW + gap, 124); ctx.stroke(); }
      });
      caption('迁移注意：先创建托管库并绑定凭据，再发布新版本切换连接，避免硬编码连接串', 32, height - 52);
      caption('配置分层：平台 → 项目 → 环境；Regions 与 Platform API 见 configuration / regions / api 页', 32, height - 32);
    }
    emit({ view: current.view, traceCount: current.traceCount, themesReady: current.traceCount >= 100, triggerCount: current.alertTriggers.length });
  }

  const resizeObserver = createResizeObserver(canvas, draw);
  return {
    update(options) { current = options; draw(); },
    dispose() { resizeObserver.disconnect(); },
  };
}
