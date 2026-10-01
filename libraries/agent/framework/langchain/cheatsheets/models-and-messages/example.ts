/**
 * 范例介绍：模拟 LangChain 消息的组装过程。切换消息角色与内容形态，观察
 * 组装出的标准消息结构（content 字符串或 content blocks 数组），以及发送
 * 给提供方时 role 的映射差异（HumanMessage -> "user"，AIMessage -> "assistant"）。
 * 输入：消息角色（system/human/ai/tool）、内容形态（纯文本 / 文本+图片）、图片来源
 * （url/base64/id）。不依赖 @langchain/*，用原生 TS 复现消息结构的确定性部分。
 * 预期结果：左侧为 LangChain 消息结构卡（类名 + content blocks + 附加字段），
 * 右侧为等价的 OpenAI 字典格式 role 映射；SystemMessage/ToolMessage 配多模态时
 * 出现边界提示。阅读主线：assembleMessage() 看结构与角色映射从哪来，draw() 看呈现。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type MessageRole = 'system' | 'human' | 'ai' | 'tool';
export type ContentForm = 'text' | 'text-image';
export type ImageSource = 'url' | 'base64' | 'id';

export interface ExampleArgs {
  role: MessageRole;
  contentForm: ContentForm;
  imageSource: ImageSource;
}

/** 一个 content block 的展示模型：type 徽标 + 字段行。 */
export interface AssembledBlock {
  type: string;
  fields: Array<[string, string]>;
}

/** 组装结果：左侧结构卡与右侧 role 映射共用的数据。 */
export interface AssembledMessage {
  className: string;
  openaiRole: string;
  contentKind: 'string' | 'blocks';
  blocks: AssembledBlock[];
  extraFields: Array<[string, string]>;
  note: string | null;
}

export interface ExampleSnapshot {
  className: string;
  openaiRole: string;
  blockCount: number;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

const ROLE_TABLE: Record<
  MessageRole,
  { className: string; openaiRole: string; color: string }
> = {
  system: { className: 'SystemMessage', openaiRole: 'system', color: '#7c6bb0' },
  human: { className: 'HumanMessage', openaiRole: 'user', color: '#3b82f6' },
  ai: { className: 'AIMessage', openaiRole: 'assistant', color: '#0f8a5f' },
  tool: { className: 'ToolMessage', openaiRole: 'tool', color: '#c2620f' },
};

const SAMPLE_TEXT = '"帮我读出这张图里的数据"';

/** 图片块的三种来源：直链、base64 内嵌、提供方托管文件 id，字段组合各不相同。 */
function buildImageBlock(source: ImageSource): AssembledBlock {
  if (source === 'url') {
    return {
      type: 'image',
      fields: [
        ['source_type', '"url"'],
        ['url', '"https://example.com/chart.png"'],
      ],
    };
  }
  if (source === 'base64') {
    return {
      type: 'image',
      fields: [
        ['source_type', '"base64"'],
        ['mime_type', '"image/png"'],
        ['data', '"<base64 字符串>"'],
      ],
    };
  }
  return {
    type: 'image',
    fields: [
      ['source_type', '"id"'],
      ['id', '"file-abc123"'],
    ],
  };
}

/** 组装逻辑：正文断言的单一真源。角色决定类名与 role 映射，内容形态决定 content 结构。 */
export function assembleMessage(args: ExampleArgs): AssembledMessage {
  const role = ROLE_TABLE[args.role];
  const withImage = args.contentForm === 'text-image';

  const textBlock: AssembledBlock = {
    type: 'text',
    fields: [['text', SAMPLE_TEXT]],
  };
  const blocks = withImage
    ? [textBlock, buildImageBlock(args.imageSource)]
    : [textBlock];

  const extraFields: Array<[string, string]> = [];
  if (args.role === 'tool') {
    // ToolMessage 必须回填 tool_call_id 才能与 AIMessage 的工具调用配对。
    extraFields.push(['tool_call_id', '"call_123"']);
    extraFields.push(['name', '"get_weather"']);
  }

  let note: string | null = null;
  if (args.role === 'system' && withImage) {
    note = 'SystemMessage 通常只用纯文本设定行为，多模态内容放在 HumanMessage。';
  } else if (args.role === 'tool' && withImage) {
    note = 'ToolMessage 的 content 一般是字符串化的工具结果，不放多模态块。';
  }

  return {
    className: role.className,
    openaiRole: role.openaiRole,
    contentKind: withImage ? 'blocks' : 'string',
    blocks,
    extraFields,
    note,
  };
}

const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

/** 画一张浅色卡：左上角是 type 徽标，下面逐行字段。返回卡片高度供纵向排布。 */
function drawFieldCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  badge: string,
  color: string,
  lines: string[],
): number {
  const height = 34 + lines.length * 17;

  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = '#dbe3f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `600 11px ${MONO}`;
  const badgeWidth = ctx.measureText(badge).width + 16;
  ctx.fillStyle = `${color}1f`;
  roundedRect(ctx, x + 10, y + 8, badgeWidth, 20, 5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(badge, x + 18, y + 22);

  ctx.font = `11.5px ${MONO}`;
  ctx.fillStyle = '#334155';
  lines.forEach((line, index) => {
    ctx.fillText(fitText(ctx, line, width - 28), x + 14, y + 44 + index * 17);
  });

  return height;
}

function drawMessage(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  args: ExampleArgs,
): void {
  const message = assembleMessage(args);
  const role = ROLE_TABLE[args.role];

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#172033';
  ctx.font = `600 16px ${SANS}`;
  ctx.fillText('切换控件后，观察同一条消息的两种视角', 36, 40);

  const pad = 36;
  const colGap = 24;
  const leftWidth = Math.max(240, (width - pad * 2 - colGap) * 0.56);
  const rightX = pad + leftWidth + colGap;
  const rightWidth = Math.max(150, width - pad - rightX);

  // 左栏：LangChain 消息结构。
  let y = 76;
  ctx.fillStyle = '#5d6f67';
  ctx.font = `600 12px ${SANS}`;
  ctx.fillText('LangChain 消息（标准结构）', pad, y);
  y += 14;

  const classCardHeight = 58;
  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, pad, y, leftWidth, classCardHeight, 8);
  ctx.fill();
  ctx.strokeStyle = '#dbe3f0';
  ctx.stroke();
  ctx.fillStyle = role.color;
  roundedRect(ctx, pad, y, 4, classCardHeight, 2);
  ctx.fill();

  ctx.font = `700 15px ${MONO}`;
  ctx.fillStyle = role.color;
  ctx.fillText(`new ${message.className}(...)`, pad + 16, y + 25);
  ctx.font = `11.5px ${MONO}`;
  ctx.fillStyle = '#64748b';
  const kindText =
    message.contentKind === 'string'
      ? 'content: string'
      : `content: ContentBlock[]（${message.blocks.length} 块）`;
  ctx.fillText(kindText, pad + 16, y + 45);
  y += classCardHeight + 12;

  const cardLines =
    message.contentKind === 'string'
      ? message.blocks[0].fields.map(([key, value]) => `${key}: ${value}`)
      : [];
  if (message.contentKind === 'string') {
    y += drawFieldCard(ctx, pad, y, leftWidth, 'content', role.color, cardLines) + 10;
  } else {
    for (const block of message.blocks) {
      const lines = block.fields.map(([key, value]) => `${key}: ${value}`);
      y += drawFieldCard(ctx, pad, y, leftWidth, `type: ${block.type}`, role.color, lines) + 10;
    }
  }

  if (message.extraFields.length > 0) {
    const lines = message.extraFields.map(([key, value]) => `${key}: ${value}`);
    drawFieldCard(ctx, pad, y, leftWidth, '附加字段', role.color, lines);
  }

  // 右栏：发送给提供方时的 role 映射。
  let ry = 76;
  ctx.fillStyle = '#5d6f67';
  ctx.font = `600 12px ${SANS}`;
  ctx.fillText('发送给提供方（OpenAI 字典格式）', rightX, ry);
  ry += 14;

  const dictLines: Array<[string, string]> = [
    ['"role"', `"${message.openaiRole}"`],
    [
      '"content"',
      message.contentKind === 'string'
        ? '"…"'
        : `ContentBlock[] · ${message.blocks.length} 块`,
    ],
  ];
  for (const [key, value] of message.extraFields) {
    dictLines.push([`"${key}"`, value]);
  }

  const dictHeight = 20 + dictLines.length * 20 + 12;
  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, rightX, ry, rightWidth, dictHeight, 8);
  ctx.fill();
  ctx.strokeStyle = '#dbe3f0';
  ctx.stroke();

  ctx.font = `12px ${MONO}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('{', rightX + 14, ry + 26);
  dictLines.forEach(([key, value], index) => {
    const lineY = ry + 46 + index * 20;
    const keyText = `  ${key}: `;
    ctx.fillStyle = '#475569';
    ctx.fillText(fitText(ctx, keyText, rightWidth - 28), rightX + 14, lineY);
    const keyWidth = ctx.measureText(keyText).width;
    ctx.fillStyle = role.color;
    ctx.fillText(
      fitText(ctx, value, rightWidth - 42 - keyWidth),
      rightX + 14 + keyWidth,
      lineY,
    );
  });
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('}', rightX + 14, ry + 26 + dictLines.length * 20 + 8);
  ry += dictHeight + 16;

  ctx.font = `12px ${SANS}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('LangChain 类名用 Human/AI，OpenAI 接口用', rightX, ry);
  ctx.fillText('user/assistant 表达同一角色。', rightX, ry + 18);

  // 边界提示：角色与多模态组合不合常理时给出提示条。
  if (message.note) {
    ry += 34;
    ctx.font = `11.5px ${SANS}`;
    const noteLines = [
      fitText(ctx, '边界提示：', rightWidth - 24),
      fitText(ctx, message.note, rightWidth - 24),
    ];
    const noteHeight = noteLines.length * 18 + 16;
    ctx.fillStyle = '#fff7e0';
    roundedRect(ctx, rightX, ry, rightWidth, noteHeight, 6);
    ctx.fill();
    ctx.strokeStyle = '#f0d68a';
    ctx.stroke();
    ctx.fillStyle = '#8a6100';
    noteLines.forEach((line, index) => {
      ctx.fillText(line, rightX + 12, ry + 22 + index * 18);
    });
  }
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

  let current: ExampleArgs = {
    role: 'human',
    contentForm: 'text-image',
    imageSource: 'url',
  };

  function draw(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const message = assembleMessage(current);
    drawMessage(drawingContext, width, height, current);
    emit({
      className: message.className,
      openaiRole: message.openaiRole,
      blockCount: message.blocks.length,
    });
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
