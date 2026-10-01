/**
 * 演示内容：Agent 配置卡 → 执行流程——把 new Agent 的关键字段（instructions
 * 明确度、是否挂工具）映射成左侧配置卡，并画出 generate / stream 两种运行
 * 方式的数据流与行为预测。
 * 输入：instructions 明确度（vague 一句话 / role 角色句 / full 角色+规则+输出）、
 *   是否挂载 get-weather 工具、运行方式（generate / stream）。
 * 操作：调整 Controls 中的任一输入，配置卡与右侧执行流程立即重绘。
 * 预期结果：instructions 越完整，「预测行为」读数越可控；挂工具后执行流程出现
 *   get-weather 调用回路；stream 模式响应区显示逐块输出。
 * 阅读主线：左配置卡（model / instructions / tools）→ Agent 循环 → 响应形态 → 读数。
 * 边界：离线示意，不调用真实 LLM；读数是「结构决定行为」的预测，真实效果以
 *   Studio 实测为准。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type InstructionLevel = 'vague' | 'role' | 'full';
export type RunMode = 'generate' | 'stream';

export interface AgentConfigArgs {
  /** instructions 明确度：从抽象一句到三段式。 */
  instructionLevel: InstructionLevel;
  /** 是否给 agent 挂载 get-weather 工具。 */
  withTool: boolean;
  /** 运行方式：generate 一次性返回，stream 逐块输出。 */
  runMode: RunMode;
}

export interface AgentConfigSnapshot {
  /** 预测行为：instructions 明确度决定行为可控性。 */
  behavior: string;
  /** 工具调用：事实数据来自工具还是模型自身。 */
  tool: string;
  /** 输出形态：完整结果还是逐块增量。 */
  output: string;
}

export interface AgentConfigInstance {
  update(args: AgentConfigArgs): void;
  dispose(): void;
}

/** Controls 的 instructions 明确度选项（显示名见 stories 的 control.labels）。 */
export const INSTRUCTION_LEVELS: readonly InstructionLevel[] = [
  'vague',
  'role',
  'full',
];

/** Controls 的运行方式选项。 */
export const RUN_MODES: readonly RunMode[] = ['generate', 'stream'];

const BEHAVIOR_TEXT: Record<InstructionLevel, string> = {
  vague: '可能反问或编造，输出不可预期',
  role: '口吻稳定，但规则与格式不固定',
  full: '行为可控，输出格式可预期',
};

const BEHAVIOR_NOTE: Record<InstructionLevel, string> = {
  vague: 'instructions 只有抽象一句：行为全靠模型默认发挥',
  role: 'instructions 有了角色：口吻稳定，规则与格式仍不固定',
  full: 'instructions 三段式：行为与输出格式都可预期',
};

const INSTRUCTION_COUNT: Record<InstructionLevel, string> = {
  vague: '1 段 · 无规则',
  role: '1 段 · 仅角色',
  full: '3 段 · 角色+规则+输出',
};

/** 纯预测逻辑：输入三项配置，输出左下角三条读数。 */
export function resolveAgentPreview(
  args: AgentConfigArgs,
): AgentConfigSnapshot {
  const level = BEHAVIOR_TEXT[args.instructionLevel]
    ? args.instructionLevel
    : 'vague';

  return {
    behavior: BEHAVIOR_TEXT[level],
    tool: args.withTool
      ? 'get-weather · 事实数据来自工具'
      : '无工具 · 事实只能靠模型知识',
    output:
      args.runMode === 'stream'
        ? 'textStream · 逐块输出'
        : 'response.text · 一次性返回',
  };
}

const VIRTUAL_WIDTH = 800;
const VIRTUAL_HEIGHT = 420;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, -apple-system, sans-serif';

const COLORS = {
  dark: '#2b3d68',
  body: '#55627a',
  gray: '#71809a',
  faint: '#a9b6c9',
  border: '#c4cede',
  divider: '#e3e8f0',
  panel: '#f7f9fc',
  activeBg: '#eef3ff',
  blue: '#4f7cff',
  green: '#0f9d76',
  orange: '#e8842c',
  warn: '#b4552d',
};

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

function arrowHead(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: 'down' | 'right' | 'left',
) {
  const size = 5;
  ctx.beginPath();
  if (direction === 'down') {
    ctx.moveTo(x, y + size);
    ctx.lineTo(x - size, y - size * 0.6);
    ctx.lineTo(x + size, y - size * 0.6);
  } else if (direction === 'right') {
    ctx.moveTo(x + size, y);
    ctx.lineTo(x - size * 0.6, y - size);
    ctx.lineTo(x - size * 0.6, y + size);
  } else {
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size * 0.6, y - size);
    ctx.lineTo(x + size * 0.6, y + size);
  }
  ctx.closePath();
  ctx.fillStyle = COLORS.faint;
  ctx.fill();
}

export function createAgentConfigFlow(
  canvas: HTMLCanvasElement,
  emit: (snapshot: AgentConfigSnapshot) => void,
): AgentConfigInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: AgentConfigArgs = {
    instructionLevel: 'full',
    withTool: true,
    runMode: 'stream',
  };

  function drawTitle() {
    ctx.fillStyle = '#5b6b85';
    ctx.font = `600 13px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Agent 配置卡 → 执行流程', VIRTUAL_WIDTH / 2, 30);
  }

  function drawCardFrame() {
    roundRectPath(ctx, 36, 60, 336, 288, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.dark;
    ctx.font = `600 14px ${MONO}`;
    ctx.fillText('weatherAgent', 56, 88);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.gray;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('Weather Agent', 352, 88);

    ctx.strokeStyle = COLORS.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, 104);
    ctx.lineTo(352, 104);
    ctx.stroke();
  }

  function drawModelRow() {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.gray;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('model', 56, 126);
    ctx.fillStyle = COLORS.orange;
    ctx.font = `600 12px ${MONO}`;
    ctx.fillText("'openai/gpt-5.6-sol'", 110, 126);
  }

  function drawInstructions() {
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.gray;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('instructions', 56, 152);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.faint;
    ctx.font = `10px ${SANS}`;
    ctx.fillText(INSTRUCTION_COUNT[current.instructionLevel], 352, 152);
    ctx.textAlign = 'left';

    const x = 56;
    const y = 162;
    const w = 296;
    const h = 118;
    const vague = current.instructionLevel === 'vague';
    roundRectPath(ctx, x, y, w, h, 8);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.setLineDash(vague ? [5, 4] : []);
    ctx.strokeStyle = vague ? COLORS.border : '#dfe5ee';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);

    if (current.instructionLevel === 'vague') {
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.body;
      ctx.font = `italic 11px ${MONO}`;
      ctx.fillText('You are a helpful assistant.', x + w / 2, y + 44);
      ctx.fillStyle = COLORS.warn;
      ctx.font = `10px ${SANS}`;
      ctx.fillText('无规则 · 无输出要求', x + w / 2, y + 72);
      return;
    }

    if (current.instructionLevel === 'role') {
      ctx.fillStyle = COLORS.dark;
      ctx.font = `11px ${SANS}`;
      ctx.fillText('你是天气助手，负责解读天气。', x + 14, y + 30);
      ctx.fillStyle = COLORS.gray;
      ctx.font = `10px ${SANS}`;
      ctx.fillText('（没有具体规则与输出要求）', x + 14, y + 56);
      return;
    }

    const rows = [
      { label: '角色', text: '你是天气助手', color: COLORS.blue },
      { label: '规则', text: '先查工具再回答 · 不编造', color: COLORS.green },
      { label: '输出要求', text: '结论先行 · 三行内', color: COLORS.orange },
    ];
    rows.forEach((row, index) => {
      const rowY = y + 24 + index * 34;
      ctx.beginPath();
      ctx.arc(x + 16, rowY, 4, 0, Math.PI * 2);
      ctx.fillStyle = row.color;
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = COLORS.dark;
      ctx.font = `600 11px ${SANS}`;
      ctx.fillText(row.label, x + 28, rowY);
      ctx.fillStyle = COLORS.body;
      ctx.font = `10.5px ${SANS}`;
      ctx.fillText(row.text, x + 92, rowY);
    });
  }

  function drawToolsRow() {
    ctx.strokeStyle = COLORS.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, 296);
    ctx.lineTo(352, 296);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.gray;
    ctx.font = `11px ${SANS}`;
    ctx.fillText('tools', 56, 322);
    if (current.withTool) {
      ctx.fillStyle = COLORS.green;
      ctx.font = `600 12px ${MONO}`;
      ctx.fillText('{ getWeather }', 110, 322);
    } else {
      ctx.fillStyle = COLORS.faint;
      ctx.font = `12px ${MONO}`;
      ctx.fillText('—（未挂载）', 110, 322);
    }
  }

  function drawPromptPill() {
    const text =
      current.runMode === 'generate'
        ? "agent.generate('东京现在天气？')"
        : "agent.stream('东京现在天气？')";
    ctx.font = `11.5px ${MONO}`;
    const textWidth = ctx.measureText(text).width;
    const pillWidth = textWidth + 24;
    const pillX = 600 - pillWidth / 2;

    roundRectPath(ctx, pillX, 62, pillWidth, 26, 13);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = COLORS.dark;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 600, 76);

    ctx.strokeStyle = COLORS.faint;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(600, 88);
    ctx.lineTo(600, 112);
    ctx.stroke();
    arrowHead(ctx, 600, 114, 'down');
  }

  function drawFlow() {
    // 配置卡喂给 Agent 循环：定义 → 运行
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = COLORS.faint;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(372, 149);
    ctx.lineTo(454, 149);
    ctx.stroke();
    ctx.setLineDash([]);
    arrowHead(ctx, 458, 149, 'right');

    roundRectPath(ctx, 462, 118, 176, 62, 9);
    ctx.fillStyle = COLORS.activeBg;
    ctx.fill();
    ctx.strokeStyle = COLORS.blue;
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1f2c47';
    ctx.font = `600 13px ${SANS}`;
    ctx.fillText('Agent 循环', 550, 140);
    ctx.fillStyle = '#5b6b85';
    ctx.font = `10px ${MONO}`;
    ctx.fillText('instructions + model', 550, 160);

    if (current.withTool) {
      roundRectPath(ctx, 676, 118, 104, 62, 9);
      ctx.fillStyle = '#f0faf6';
      ctx.fill();
      ctx.strokeStyle = COLORS.green;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = COLORS.green;
      ctx.font = `600 10.5px ${MONO}`;
      ctx.fillText('get-weather', 728, 140);
      ctx.fillStyle = COLORS.gray;
      ctx.font = `10px ${SANS}`;
      ctx.fillText('工具', 728, 160);

      ctx.strokeStyle = COLORS.faint;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(638, 138);
      ctx.lineTo(670, 138);
      ctx.moveTo(676, 158);
      ctx.lineTo(644, 158);
      ctx.stroke();
      arrowHead(ctx, 674, 138, 'right');
      arrowHead(ctx, 642, 158, 'left');

      ctx.fillStyle = COLORS.gray;
      ctx.font = `9px ${SANS}`;
      ctx.fillText('调用', 656, 126);
      ctx.fillText('结果', 656, 172);
    } else {
      roundRectPath(ctx, 676, 118, 104, 62, 9);
      ctx.fillStyle = '#fafbfd';
      ctx.fill();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = COLORS.faint;
      ctx.font = `11px ${SANS}`;
      ctx.fillText('未挂载', 728, 149);
    }

    ctx.strokeStyle = COLORS.faint;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(550, 180);
    ctx.lineTo(550, 200);
    ctx.stroke();
    arrowHead(ctx, 550, 202, 'down');
  }

  function drawResponse() {
    roundRectPath(ctx, 462, 206, 318, 96, 9);
    ctx.fillStyle = COLORS.panel;
    ctx.fill();
    ctx.strokeStyle = '#dfe5ee';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.dark;
    ctx.font = `600 12px ${MONO}`;
    ctx.fillText(
      current.runMode === 'generate' ? 'response.text' : 'textStream',
      474,
      226,
    );
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.gray;
    ctx.font = `10px ${SANS}`;
    ctx.fillText(
      current.runMode === 'generate' ? '一次性完整结果' : '逐块增量输出',
      768,
      226,
    );

    if (current.runMode === 'generate') {
      roundRectPath(ctx, 474, 240, 294, 44, 6);
      ctx.fillStyle = COLORS.activeBg;
      ctx.fill();
      ctx.strokeStyle = COLORS.blue;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.dark;
      ctx.font = `10.5px ${MONO}`;
      ctx.fillText('text · toolCalls · steps · usage', 621, 262);
    } else {
      for (let index = 0; index < 5; index += 1) {
        const chunkX = 474 + index * 60;
        roundRectPath(ctx, chunkX, 240, 54, 44, 6);
        ctx.fillStyle = `rgba(79, 124, 255, ${0.12 + index * 0.16})`;
        ctx.fill();
        ctx.strokeStyle = COLORS.blue;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.gray;
      ctx.font = `9.5px ${SANS}`;
      ctx.fillText('chunk', 741, 296);
    }
  }

  function drawNotes() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.gray;
    ctx.font = `10.5px ${SANS}`;
    ctx.fillText(BEHAVIOR_NOTE[current.instructionLevel], 621, 332);

    ctx.fillStyle = current.withTool ? COLORS.green : COLORS.warn;
    ctx.fillText(
      current.withTool
        ? '挂载 get-weather：实时数据来自工具调用'
        : '未挂工具：涉及实时事实只能靠模型知识，可能编造',
      621,
      354,
    );
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

    drawTitle();
    drawCardFrame();
    drawModelRow();
    drawInstructions();
    drawToolsRow();
    drawPromptPill();
    drawFlow();
    drawResponse();
    drawNotes();

    emit(resolveAgentPreview(current));
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(args) {
      current = { ...args };
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
