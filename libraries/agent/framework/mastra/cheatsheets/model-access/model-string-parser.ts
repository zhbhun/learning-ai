/**
 * 演示内容：模型字符串解析器——把读者选择的「网关 / provider / 模型名」拼装成
 * Mastra model router 能识别的 model 字符串，并给出路由路径与所需环境变量。
 * 输入：网关前缀（none = 直连）、provider 段、模型名末段。
 * 操作：调整 Controls 中的任一输入，画布立即重绘。
 * 预期结果：直连得到两段式 provider/model；选择网关得到三段式 gateway/provider/model；
 *   分支行的高亮随路由切换，左下读数同步显示最终字符串、路由与环境变量。
 * 阅读主线：分段着色的字符串 → model router 的两路分支 → 右下角环境变量。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

/** 直连 provider 时按字符串前缀命中的环境变量（节选自官方环境变量对照表）。 */
export const PROVIDER_ENV: Record<string, string[]> = {
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  google: ['GOOGLE_API_KEY'],
  xai: ['XAI_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
};

/** 走内置网关时的网关级环境变量（网关 key 或站点凭据）。 */
export const GATEWAY_ENV: Record<string, string[]> = {
  openrouter: ['OPENROUTER_API_KEY'],
  mastra: ['MASTRA_GATEWAY_API_KEY'],
  vercel: ['AI_GATEWAY_API_KEY'],
  'merge-gateway': ['MERGE_GATEWAY_API_KEY'],
  neon: ['NEON_AI_GATEWAY_BASE_URL', 'NEON_AI_GATEWAY_TOKEN'],
  netlify: ['NETLIFY_TOKEN', 'NETLIFY_SITE_ID'],
  'azure-openai': [
    'AZURE_API_KEY',
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_SUBSCRIPTION_ID',
  ],
};

export interface ModelAccessOptions {
  /** 网关前缀；'none' 表示不走网关、直连 provider。 */
  gateway: string;
  /** provider 段：直连时是第一段，走网关时是第二段。 */
  provider: string;
  /** 模型名末段，如 gpt-5.6-sol、claude-sonnet-4-6。 */
  modelId: string;
}

export interface ModelStringSegment {
  text: string;
  kind: 'gateway' | 'provider' | 'model';
}

export interface ModelAccessSnapshot {
  modelString: string;
  route: string;
  envVars: string;
}

export interface ModelAccessInstance {
  update(options: ModelAccessOptions): void;
  dispose(): void;
}

interface ResolvedModel {
  segments: ModelStringSegment[];
  modelString: string;
  envVars: string[];
  envDisplay: string;
  route: string;
}

const SEGMENT_COLORS: Record<ModelStringSegment['kind'], string> = {
  gateway: '#4f7cff',
  provider: '#0f9d76',
  model: '#e8842c',
};

const SEGMENT_LABELS: Record<ModelStringSegment['kind'], string> = {
  gateway: '网关段',
  provider: 'provider 段',
  model: '模型段',
};

/** 纯解析逻辑：输入三段选择，输出分段、最终字符串、环境变量与路由描述。 */
export function resolveModelString(
  options: ModelAccessOptions,
): ResolvedModel {
  const modelId = options.modelId.trim() || '(模型名)';
  const viaGateway = options.gateway !== 'none';
  const segments: ModelStringSegment[] = viaGateway
    ? [
        { text: options.gateway, kind: 'gateway' },
        { text: options.provider, kind: 'provider' },
        { text: modelId, kind: 'model' },
      ]
    : [
        { text: options.provider, kind: 'provider' },
        { text: modelId, kind: 'model' },
      ];

  const envVars = viaGateway
    ? (GATEWAY_ENV[options.gateway] ?? [])
    : (PROVIDER_ENV[options.provider] ?? []);
  const joined =
    envVars.length > 0 ? envVars.join(' · ') : '按官方对照表查';
  const envDisplay =
    joined.length <= 52 ? joined : `${envVars[0] ?? ''} 等 ${envVars.length} 项`;

  return {
    segments,
    modelString: segments.map((segment) => segment.text).join('/'),
    envVars,
    envDisplay,
    route: viaGateway
      ? `经网关 ${options.gateway}（三段式）`
      : '直连 provider（两段式）',
  };
}

const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 450;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

function roundRectPath(
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

export function createModelParser(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ModelAccessSnapshot) => void,
): ModelAccessInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: ModelAccessOptions = {
    gateway: 'none',
    provider: 'openai',
    modelId: 'gpt-5.6-sol',
  };

  function drawTitle() {
    ctx.fillStyle = '#5b6b85';
    ctx.font = `600 13px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('模型字符串解析器', VIRTUAL_WIDTH / 2, 36);
  }

  function drawPills(segments: ModelStringSegment[]) {
    const font = `600 15px ${MONO}`;
    ctx.font = font;
    const pad = 12;
    const gap = 14;
    const pillHeight = 30;
    const widths = segments.map(
      (segment) => ctx.measureText(segment.text).width + pad * 2,
    );
    const total =
      widths.reduce((sum, w) => sum + w, 0) + gap * (segments.length - 1);
    let x = VIRTUAL_WIDTH / 2 - total / 2;
    const y = 64;

    segments.forEach((segment, index) => {
      roundRectPath(ctx, x, y, widths[index] ?? 0, pillHeight, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = SEGMENT_COLORS[segment.kind];
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.fillStyle = SEGMENT_COLORS[segment.kind];
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(segment.text, x + pad, y + pillHeight / 2 + 1);
      x += widths[index] ?? 0;

      if (index < segments.length - 1) {
        ctx.fillStyle = '#7c8aa5';
        ctx.font = `600 16px ${MONO}`;
        ctx.textAlign = 'center';
        ctx.fillText('/', x + gap / 2, y + pillHeight / 2 + 1);
        x += gap;
        ctx.font = font;
      }
    });
  }

  function drawLegend(segments: ModelStringSegment[]) {
    const kinds = [...new Set(segments.map((segment) => segment.kind))];
    ctx.font = `12px ${SANS}`;
    const groupWidths = kinds.map((kind) => 10 + ctx.measureText(SEGMENT_LABELS[kind]).width);
    const total =
      groupWidths.reduce((sum, w) => sum + w, 0) + 18 * (kinds.length - 1);
    let x = VIRTUAL_WIDTH / 2 - total / 2;
    const y = 122;

    kinds.forEach((kind, index) => {
      ctx.beginPath();
      ctx.arc(x + 4, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = SEGMENT_COLORS[kind];
      ctx.fill();

      ctx.fillStyle = '#5b6b85';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(SEGMENT_LABELS[kind], x + 12, y + 1);
      x += (groupWidths[index] ?? 0) + 18;
    });
  }

  function drawRouter() {
    roundRectPath(ctx, 250, 152, 300, 46, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#4f7cff';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#2b3d68';
    ctx.font = `600 15px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('model router', 400, 169);
    ctx.fillStyle = '#71809a';
    ctx.font = `11px ${SANS}`;
    ctx.fillText('解析字符串 · 选择路由', 400, 188);
  }

  function drawFork() {
    ctx.strokeStyle = '#a9b6c9';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(400, 198);
    ctx.lineTo(400, 296);
    ctx.moveTo(122, 232);
    ctx.lineTo(400, 232);
    ctx.moveTo(122, 296);
    ctx.lineTo(400, 296);
    ctx.stroke();

    [232, 296].forEach((cy) => {
      ctx.beginPath();
      ctx.moveTo(110, cy);
      ctx.lineTo(122, cy - 5);
      ctx.lineTo(122, cy + 5);
      ctx.closePath();
      ctx.fillStyle = '#a9b6c9';
      ctx.fill();
    });
  }

  function drawBranch(
    y: number,
    label: string,
    example: string,
    active: boolean,
  ) {
    roundRectPath(ctx, 110, y, 580, 44, 8);
    ctx.fillStyle = active ? '#eef3ff' : '#f4f6fa';
    ctx.fill();
    ctx.setLineDash(active ? [] : [5, 4]);
    ctx.strokeStyle = active ? '#4f7cff' : '#c4cede';
    ctx.lineWidth = active ? 1.8 : 1;
    ctx.stroke();
    ctx.setLineDash([]);

    if (active) {
      ctx.fillStyle = '#4f7cff';
      roundRectPath(ctx, 110, y + 6, 4, 32, 2);
      ctx.fill();
    }

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = active ? '#1f2c47' : '#8792a6';
    ctx.font = `600 13px ${SANS}`;
    ctx.fillText(label, active ? 128 : 126, y + 22);

    ctx.textAlign = 'right';
    ctx.fillStyle = active ? '#2b3d68' : '#9aa6ba';
    ctx.font = `12px ${MONO}`;
    ctx.fillText(example, 672, y + 22);
  }

  function drawBranches() {
    const modelId = current.modelId.trim() || '(模型名)';
    const viaGateway = current.gateway !== 'none';
    const directExample = `${current.provider}/${modelId}`;
    const gatewayExample = `${viaGateway ? current.gateway : 'openrouter'}/${current.provider}/${modelId}`;

    drawBranch(210, '两段式 · 直连 provider API', directExample, !viaGateway);
    drawBranch(274, '三段式 · 经网关转发', gatewayExample, viaGateway);
  }

  function drawEnv(envDisplay: string) {
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#71809a';
    ctx.font = `11px ${SANS}`;
    ctx.fillText('所需环境变量', 760, 392);
    ctx.fillStyle = '#2b3d68';
    ctx.font = `600 12px ${MONO}`;
    ctx.fillText(envDisplay, 760, 412);
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(1, size.width);
    const height = Math.max(1, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(width / VIRTUAL_WIDTH, height / VIRTUAL_HEIGHT);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.save();
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.restore();
    ctx.setTransform(
      pixelRatio * scale,
      0,
      0,
      pixelRatio * scale,
      ((width - VIRTUAL_WIDTH * scale) / 2) * pixelRatio,
      ((height - VIRTUAL_HEIGHT * scale) / 2) * pixelRatio,
    );

    const resolved = resolveModelString(current);

    drawTitle();
    drawPills(resolved.segments);
    drawLegend(resolved.segments);
    drawRouter();
    drawFork();
    drawBranches();
    drawEnv(resolved.envDisplay);

    emit({
      modelString: resolved.modelString,
      route: resolved.route,
      envVars: resolved.envDisplay,
    });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = { ...options };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
