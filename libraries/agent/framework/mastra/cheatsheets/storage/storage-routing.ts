/**
 * 范例介绍：离线演示 Mastra 存储层的数据域模型与复合存储的按域路由。
 * 演示内容：9 个数据域怎样落到存储后端——单一 storage 全域共用，或 MastraCompositeStore 按 domains 路由。
 * 输入：数据域（memory / workflows / observability / scores）与「复合存储」开关。
 * 操作：用 Controls 切换数据域与开关，画布即时重绘路由结果。
 * 预期结果：关闭复合存储时，选中的域与其余域写入同一个后端；开启后选中的域拆到专用后端，其余留在 default。
 * 阅读主线：DOMAIN_INFO（每个域存什么、建议后端）→ routeDomain()（路由判断）→ draw()（示意渲染）。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 可在实例中选中的 4 个数据域。 */
export type DomainKey = 'memory' | 'workflows' | 'observability' | 'scores';

/** 数据域回查信息：该域存什么、单一存储 / 复合存储时的建议后端。 */
export interface DomainInfo {
  stores: string;
  singleBackend: string;
  specializedBackend: string;
}

/** 官方文档列出的 9 个数据域；前 4 个可在本实例中选中。 */
export const ALL_DOMAINS: string[] = [
  'memory',
  'workflows',
  'observability',
  'scores',
  'datasets',
  'experiments',
  'backgroundTasks',
  'schedules',
  'threadState',
];

export const DOMAIN_INFO: Record<DomainKey, DomainInfo> = {
  memory: {
    stores: '线程、消息、资源与工作记忆',
    singleBackend: 'LibSQLStore / PostgresStore（事务型）',
    specializedBackend: 'PostgresStore',
  },
  workflows: {
    stores: '工作流运行快照（挂起 / 恢复依赖它）',
    singleBackend: 'LibSQLStore / PostgresStore（持久可靠）',
    specializedBackend: 'WorkflowsPG',
  },
  observability: {
    stores: '追踪 span、日志、指标与反馈',
    singleBackend: 'LibSQLStore（本地起步）',
    specializedBackend: 'ClickHouse / DuckDB（OLAP）',
  },
  scores: {
    stores: 'scorer 对输出的评分记录',
    singleBackend: 'LibSQLStore / PostgresStore',
    specializedBackend: 'PostgresStore',
  },
};

export interface StorageOptions {
  domain: DomainKey;
  composite: boolean;
}

export interface StorageSnapshot {
  domain: DomainKey;
  stores: string;
  composite: boolean;
  backend: string;
  others: string;
}

/**
 * 核心逻辑：单一 storage 时 9 个域共用一个后端；
 * 复合存储（MastraCompositeStore）把选中的域经 domains 映射拆到专用后端，其余留在 default。
 */
export function routeDomain(options: StorageOptions): StorageSnapshot {
  const info = DOMAIN_INFO[options.domain];
  if (!options.composite) {
    return {
      domain: options.domain,
      stores: info.stores,
      composite: false,
      backend: '统一后端：一个 storage 实例覆盖全部 9 个域',
      others: '与选中域共用同一后端',
    };
  }
  return {
    domain: options.domain,
    stores: info.stores,
    composite: true,
    backend: `专用后端：${info.specializedBackend}`,
    others: 'default：LibSQLStore（其余 8 个域）',
  };
}

export interface StorageInstance {
  update(options: StorageOptions): void;
  dispose(): void;
}

const INK = '#172033';
const MUTED = '#64748b';
const CHIP_BG = '#e2e8f0';
const ACTIVE = '#4f7cff';
const BOX_BG = '#f8fafc';
const BORDER = '#94a3b8';
const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function arrow(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 9 * Math.cos(angle - Math.PI / 7), y2 - 9 * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(x2 - 9 * Math.cos(angle + Math.PI / 7), y2 - 9 * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
}

export function createStorageDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: StorageSnapshot) => void,
): StorageInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: StorageOptions = { domain: 'workflows', composite: false };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(320, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const left = 48;
    const contentWidth = width - left * 2;

    ctx.fillStyle = INK;
    ctx.font = `600 16px ${SANS}`;
    ctx.fillText('9 个数据域怎样路由到存储后端', left, 36);

    // 数据域芯片：5 列 × 2 行，选中的域高亮
    const cols = 5;
    const gap = 8;
    const chipW = (contentWidth - gap * (cols - 1)) / cols;
    const chipH = 26;
    ALL_DOMAINS.forEach((name, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = left + col * (chipW + gap);
      const y = 56 + row * (chipH + gap);
      const selected = name === current.domain;
      ctx.fillStyle = selected ? ACTIVE : CHIP_BG;
      roundRect(ctx, x, y, chipW, chipH, 13);
      ctx.fill();
      ctx.fillStyle = selected ? '#ffffff' : MUTED;
      ctx.font = `11px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(name, x + chipW / 2, y + 17);
      ctx.textAlign = 'left';
    });
    const chipsBottom = 56 + 2 * (chipH + gap);

    // 选中域说明面板：该域存什么
    const info = DOMAIN_INFO[current.domain];
    const panelY = chipsBottom + 14;
    ctx.fillStyle = BOX_BG;
    ctx.strokeStyle = ACTIVE;
    ctx.lineWidth = 1.5;
    roundRect(ctx, left, panelY, contentWidth, 58, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = `600 14px ${MONO}`;
    ctx.fillText(current.domain, left + 16, panelY + 23);
    ctx.fillStyle = MUTED;
    ctx.font = `13px ${SANS}`;
    ctx.fillText(`存什么：${info.stores}`, left + 16, panelY + 44);
    const panelBottom = panelY + 58;

    // 路由结果区
    const snapshot = routeDomain(current);
    const boxTop = panelBottom + 52;
    const boxH = 84;
    ctx.lineWidth = 1.5;
    ctx.font = `13px ${SANS}`;

    if (!current.composite) {
      // 单一 storage：所有域共用一个后端
      const boxW = Math.min(380, contentWidth * 0.7);
      const boxX = left + (contentWidth - boxW) / 2;
      ctx.strokeStyle = BORDER;
      ctx.fillStyle = INK;
      arrow(ctx, width / 2, panelBottom, width / 2, boxTop - 2);
      ctx.fillStyle = BOX_BG;
      ctx.strokeStyle = BORDER;
      roundRect(ctx, boxX, boxTop, boxW, boxH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = `600 14px ${SANS}`;
      ctx.fillText('统一后端（storage: 单一实例）', boxX + 16, boxTop + 24);
      ctx.fillStyle = MUTED;
      ctx.font = `12px ${MONO}`;
      ctx.fillText('LibSQLStore（url: file:./mastra.db）', boxX + 16, boxTop + 46);
      ctx.font = `13px ${SANS}`;
      ctx.fillText('9 个域全部写入这里', boxX + 16, boxTop + 68);
    } else {
      // 复合存储：default 承接其余域，domains 把选中域拆到专用后端
      const boxW = (contentWidth - 28) / 2;
      const leftX = left;
      const rightX = left + boxW + 28;
      ctx.fillStyle = MUTED;
      ctx.strokeStyle = BORDER;
      arrow(ctx, width / 2, panelBottom, leftX + boxW / 2, boxTop - 2);
      ctx.fillStyle = BOX_BG;
      roundRect(ctx, leftX, boxTop, boxW, boxH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = `600 14px ${SANS}`;
      ctx.fillText('default 后端', leftX + 16, boxTop + 24);
      ctx.fillStyle = MUTED;
      ctx.font = `12px ${MONO}`;
      ctx.fillText('LibSQLStore', leftX + 16, boxTop + 46);
      ctx.font = `13px ${SANS}`;
      ctx.fillText('其余 8 个域', leftX + 16, boxTop + 68);

      ctx.fillStyle = ACTIVE;
      ctx.strokeStyle = ACTIVE;
      arrow(ctx, width / 2, panelBottom, rightX + boxW / 2, boxTop - 2);
      ctx.fillStyle = BOX_BG;
      roundRect(ctx, rightX, boxTop, boxW, boxH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ACTIVE;
      ctx.font = `600 14px ${SANS}`;
      ctx.fillText('domains 路由', rightX + 16, boxTop + 24);
      ctx.fillStyle = MUTED;
      ctx.font = `12px ${MONO}`;
      ctx.fillText(info.specializedBackend, rightX + 16, boxTop + 46);
      ctx.font = `13px ${SANS}`;
      ctx.fillText('仅选中的域', rightX + 16, boxTop + 68);
    }

    const boxBottom = boxTop + boxH;
    ctx.fillStyle = MUTED;
    ctx.font = `12px ${SANS}`;
    ctx.fillText(
      '未配置 storage 时默认使用内置 in-memory 存储，进程退出数据即丢失',
      left,
      Math.max(height - 16, boxBottom + 22),
    );

    emit(snapshot);
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
