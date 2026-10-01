/**
 * 演示内容：云平台选型矩阵（离线示意，不发起真实部署）
 * 输入：负载特征（突发流量 / 长任务 / 常驻连接）与峰值并发规模
 * 操作：用 Controls 切换负载，矩阵按列高亮匹配的部署形态
 * 预期结果：读数给出推荐形态、代表平台、存储注意与规模提示
 * 阅读主线：矩阵列高亮 → 底部「代表平台 / 存储注意」两栏 → 左下读数
 */

import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface DecisionArgs { workload: 'burst' | 'long' | 'persistent'; scale: number; } // scale: 峰值并发 req/min（示意值）

export interface DecisionSnapshot {
  workload: string; shape: string; platforms: string; storage: string; scaleNote: string;
}

export interface DecisionInstance { update(args: DecisionArgs): void; dispose(): void; }

type Mark = 'best' | 'ok' | 'no';

const WORKLOADS: { key: DecisionArgs['workload']; label: string }[] = [
  { key: 'burst', label: '突发流量' },
  { key: 'long', label: '长任务' },
  { key: 'persistent', label: '常驻连接' },
];

const ROWS = [
  { shape: 'Serverless 自动部署（Vercel / Netlify / Cloudflare 内置部署器）' },
  { shape: '常驻容器 / 主机（EC2 / Render / DigitalOcean / K8s）' },
  { shape: '专用运行器（Inngest / Temporal 承接工作流）' },
];

// 匹配矩阵：best 推荐 / ok 可行 / no 不适合
const MATRIX: Record<DecisionArgs['workload'], Mark[]> = {
  burst: ['best', 'ok', 'no'],
  long: ['ok', 'best', 'ok'],
  persistent: ['no', 'best', 'ok'],
};

const MARK_COLOR: Record<Mark, string> = { best: '#1b7f4d', ok: '#a07016', no: '#a4443c' };
const MARK_TEXT: Record<Mark, string> = { best: '◎ 推荐', ok: '○ 可行', no: '— 不适合' };

const DECISION: Record<DecisionArgs['workload'], Omit<DecisionSnapshot, 'scaleNote'>> = {
  burst: { workload: '突发流量', shape: 'Serverless（内置部署器）', platforms: 'Vercel / Netlify / Cloudflare', storage: '移除 LibSQLStore，改用远程存储' },
  long: { workload: '长任务', shape: '常驻容器', platforms: 'EC2 / Render / DigitalOcean / K8s', storage: '本地文件可用，扩缩容建议托管存储' },
  persistent: { workload: '常驻连接', shape: '常驻容器（自托管服务器）', platforms: 'EC2 / Render / K8s（Helm）', storage: 'LibSQLStore 可用，扩缩容建议托管存储' },
};

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DecisionSnapshot) => void,
): DecisionInstance {
  const ctx = canvas.getContext('2d')!;
  let args: DecisionArgs = { workload: 'burst', scale: 500 };

  function draw() {
    const { width: w, height: h } = readCanvasSize(canvas);
    ctx.clearRect(0, 0, w, h);
    const pad = 20;
    const colW = (w - pad * 2) / 4;
    const gridH = h * 0.56;
    const rowH = gridH / (ROWS.length + 1);
    const selected = WORKLOADS.findIndex((item) => item.key === args.workload);
    // 高亮当前负载列
    ctx.fillStyle = 'rgba(59,130,246,0.12)';
    ctx.fillRect(pad + colW * (selected + 1), pad, colW, gridH);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = '#111827';
    WORKLOADS.forEach((item, i) => ctx.fillText(item.label, pad + colW * (i + 1.5), pad + rowH / 2));
    // 行头与匹配标记
    ROWS.forEach((row, r) => {
      const y = pad + rowH * (r + 1) + rowH / 2;
      ctx.textAlign = 'left';
      ctx.fillText(row.shape, pad + 4, y);
      MATRIX[args.workload].forEach((mark, c) => {
        ctx.textAlign = 'center'; ctx.fillStyle = MARK_COLOR[mark];
        ctx.font = mark === 'best' ? 'bold 14px sans-serif' : '14px sans-serif';
        ctx.fillText(MARK_TEXT[mark], pad + colW * (c + 1.5), y);
      });
    });
    const d = DECISION[args.workload];
    const panelTop = pad + gridH + 16;
    const panelH = h - panelTop - pad;
    const boxes: [string, string][] = [
      ['代表平台', d.platforms],
      ['存储注意', d.storage],
    ];
    boxes.forEach(([title, value], i) => {
      const bw = (w - pad * 2) / 2 - 12;
      const x = pad + i * (bw + 20);
      ctx.strokeStyle = '#d1d5db';
      ctx.strokeRect(x, panelTop, bw, panelH);
      ctx.textAlign = 'left'; ctx.fillStyle = '#6b7280'; ctx.font = '12px sans-serif';
      ctx.fillText(title, x + 10, panelTop + 14);
      ctx.fillStyle = '#111827'; ctx.font = 'bold 14px sans-serif';
      ctx.fillText(value, x + 10, panelTop + panelH / 2 + 6);
    });
  }

  function update(next: DecisionArgs) {
    args = next;
    const d = DECISION[args.workload];
    const hot = args.scale > 2000;
    const scaleNote = !hot ? '当前规模常规配置即可'
      : args.workload === 'long' ? 'Serverless 时长上限突出，优先常驻容器'
        : '高并发下评估 Serverless 成本与冷启动';
    draw();
    emit({ ...d, scaleNote });
  }

  const observer = createResizeObserver(canvas, draw);
  update(args);
  return {
    update,
    dispose() {
      observer.disconnect();
    },
  };
}
