/**
 * 范例介绍：演示 zod schema 的构造如何决定结构化输出的判定结果。切换 schema 形态
 * （必填与可选 / 枚举 / 嵌套与数组）与样本缺陷（合法 / 取值非法 / 缺必填字段），
 * 左侧显示发给模型的 schema 片段，右侧显示模型返回样本，并给出确定性校验判定：
 * 合法样本通过解析得到类型化对象，缺陷样本在校验环节被拦下并定位到字段路径。
 * 输入：schemaForm、sampleFlaw。不依赖 @langchain/*，用原生 TS 复现 zod 校验的
 * 确定性部分（min/max 越界、枚举外取值、嵌套缺失等行为对齐官方文档示例）。
 * 预期结果：readout 的「校验结果」在 通过 / 失败 间切换，「错误位置」显示失败
 * 字段路径（嵌套时形如 cast[0].role）。阅读主线：SCENARIOS 看形态与样本从哪来，
 * validateFields()/validateField() 看判定规则，draw() 看呈现。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type SchemaForm = 'required-optional' | 'enum' | 'nested-array';
export type SampleFlaw = 'valid' | 'invalid-value' | 'missing-field';

export interface ExampleArgs {
  schemaForm: SchemaForm;
  sampleFlaw: SampleFlaw;
}

/**
 * 字段规格：只建模本课关心的校验行为——必填/可选、类型、数值范围、枚举、
 * 字符串数组、嵌套对象数组、可空数值。zod 默认剥离未知键，多余字段不报错。
 */
type FieldSpec =
  | { name: string; kind: 'string'; optional?: boolean }
  | {
      name: string;
      kind: 'number';
      min?: number;
      max?: number;
      optional?: boolean;
    }
  | { name: string; kind: 'enum'; values: string[]; optional?: boolean }
  | { name: string; kind: 'string-array'; optional?: boolean }
  | { name: string; kind: 'object-array'; fields: FieldSpec[]; optional?: boolean }
  | { name: string; kind: 'nullable-number'; optional?: boolean };

export interface ValidationResult {
  ok: boolean;
  path: string; // 失败字段的路径；通过时为 '—'
  message: string; // 失败时的校验消息；通过时为解析结果说明
}

export interface ExampleSnapshot {
  verdict: string;
  errorPath: string;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

/** 一套 schema 形态：zod 片段、字段规格、三种缺陷下的预设返回样本。 */
interface Scenario {
  schemaLines: string[];
  fields: FieldSpec[];
  samples: Record<SampleFlaw, Record<string, unknown>>;
}

/**
 * 三种形态与官方文档示例同源：ProductReview（optional + min/max）、枚举分类、
 * MovieDetails（嵌套对象数组 + nullable）。rating: 10 越界样本复现官方
 * "Schema validation error" 示例——max(5) 拦下越界值并带错误消息重试。
 */
const SCENARIOS: Record<SchemaForm, Scenario> = {
  'required-optional': {
    schemaLines: [
      'const ProductReview = z.object({',
      "  rating: z.number().min(1).max(5).optional(),",
      "  sentiment: z.string().describe('Overall sentiment'),",
      '  keyPoints: z.array(z.string()),',
      '});',
    ],
    fields: [
      { name: 'rating', kind: 'number', min: 1, max: 5, optional: true },
      { name: 'sentiment', kind: 'string' },
      { name: 'keyPoints', kind: 'string-array' },
    ],
    samples: {
      valid: {
        rating: 5,
        sentiment: 'positive',
        keyPoints: ['fast shipping'],
      },
      'invalid-value': {
        rating: 10, // 对齐官方示例：模型仍可能生成越界值，校验环节拦下
        sentiment: 'positive',
        keyPoints: ['expensive'],
      },
      'missing-field': {
        rating: 4,
        sentiment: 'positive',
        // 缺必填的 keyPoints
      },
    },
  },
  enum: {
    schemaLines: [
      'const ReviewTag = z.object({',
      "  sentiment: z.enum(['positive', 'negative']),",
      "  issueType: z.enum(['product', 'service',",
      "      'shipping', 'billing']).optional(),",
      "  summary: z.string().describe('One-sentence summary'),",
      '});',
    ],
    fields: [
      { name: 'sentiment', kind: 'enum', values: ['positive', 'negative'] },
      {
        name: 'issueType',
        kind: 'enum',
        values: ['product', 'service', 'shipping', 'billing'],
        optional: true,
      },
      { name: 'summary', kind: 'string' },
    ],
    samples: {
      valid: {
        sentiment: 'positive',
        issueType: 'shipping',
        summary: 'Fast shipping but pricey.',
      },
      'invalid-value': {
        sentiment: 'neutral', // 枚举外取值
        summary: 'Fast shipping but pricey.',
      },
      'missing-field': {
        sentiment: 'positive',
        issueType: 'billing',
        // 缺必填的 summary
      },
    },
  },
  'nested-array': {
    schemaLines: [
      'const Actor = z.object({',
      '  name: z.string(), role: z.string(),',
      '});',
      '',
      'const MovieDetails = z.object({',
      '  title: z.string(),',
      '  cast: z.array(Actor),',
      '  genres: z.array(z.string()),',
      "  budget: z.number().nullable().describe('In millions USD'),",
      '});',
    ],
    fields: [
      { name: 'title', kind: 'string' },
      {
        name: 'cast',
        kind: 'object-array',
        fields: [
          { name: 'name', kind: 'string' },
          { name: 'role', kind: 'string' },
        ],
      },
      { name: 'genres', kind: 'string-array' },
      { name: 'budget', kind: 'nullable-number' },
    ],
    samples: {
      valid: {
        title: 'Inception',
        cast: [
          { name: 'Leonardo DiCaprio', role: 'Cobb' },
          { name: 'Elliot Page', role: 'Ariadne' },
        ],
        genres: ['Sci-Fi', 'Thriller'],
        budget: null, // nullable：值存在但为 null，合法
      },
      'invalid-value': {
        title: 'Inception',
        cast: [{ name: 'Leonardo DiCaprio', role: 'Cobb' }],
        genres: 'Sci-Fi', // 不是数组
        budget: 160,
      },
      'missing-field': {
        title: 'Inception',
        cast: [{ name: 'Leonardo DiCaprio' }], // 嵌套对象缺 role
        genres: ['Sci-Fi'],
        budget: 160,
      },
    },
  },
};

function typeName(value: unknown): string {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value === null) {
    return 'null';
  }
  return typeof value;
}

/** 判定结果的最小单元：失败字段路径 + zod 风格的原因。 */
interface Issue {
  path: string;
  reason: string;
}

/** 单字段判定：返回 null 表示通过；嵌套时路径带层级位置（如 cast[0].role）。 */
function validateField(spec: FieldSpec, value: unknown, path: string): Issue | null {
  if (value === undefined) {
    return spec.optional ? null : { path, reason: 'Required' };
  }

  switch (spec.kind) {
    case 'string':
      return typeof value === 'string'
        ? null
        : { path, reason: `Expected string, received ${typeName(value)}` };
    case 'number': {
      if (typeof value !== 'number') {
        return { path, reason: `Expected number, received ${typeName(value)}` };
      }
      if (spec.min !== undefined && value < spec.min) {
        return {
          path,
          reason: `Input should be greater than or equal to ${spec.min}`,
        };
      }
      if (spec.max !== undefined && value > spec.max) {
        // 对齐官方示例消息：rating 10 被 max(5) 拦下
        return {
          path,
          reason: `Input should be less than or equal to ${spec.max}`,
        };
      }
      return null;
    }
    case 'enum':
      return typeof value === 'string' && spec.values.includes(value)
        ? null
        : {
            path,
            reason: `Invalid enum value. Expected ${spec.values
              .map((item) => `'${item}'`)
              .join(' | ')}, received '${String(value)}'`,
          };
    case 'string-array': {
      if (!Array.isArray(value)) {
        return { path, reason: `Expected array, received ${typeName(value)}` };
      }
      for (let index = 0; index < value.length; index += 1) {
        if (typeof value[index] !== 'string') {
          return {
            path: `${path}[${index}]`,
            reason: `Expected string, received ${typeName(value[index])}`,
          };
        }
      }
      return null;
    }
    case 'object-array': {
      if (!Array.isArray(value)) {
        return { path, reason: `Expected array, received ${typeName(value)}` };
      }
      for (let index = 0; index < value.length; index += 1) {
        const item = value[index];
        if (typeof item !== 'object' || item === null || Array.isArray(item)) {
          return {
            path: `${path}[${index}]`,
            reason: `Expected object, received ${typeName(item)}`,
          };
        }
        // 嵌套递归：子字段的失败路径继续下钻，例如 cast[0].role
        const nested = validateFields(
          spec.fields,
          item as Record<string, unknown>,
          `${path}[${index}]`,
        );
        if (nested) {
          return nested;
        }
      }
      return null;
    }
    case 'nullable-number':
      return value === null || typeof value === 'number'
        ? null
        : {
            path,
            reason: `Expected number or null, received ${typeName(value)}`,
          };
  }
}

/** 对象判定：按字段规格逐项校验，返回第一个失败或 null。 */
function validateFields(
  fields: FieldSpec[],
  data: Record<string, unknown>,
  base = '',
): Issue | null {
  for (const spec of fields) {
    const path = base ? `${base}.${spec.name}` : spec.name;
    const issue = validateField(spec, data[spec.name], path);
    if (issue) {
      return issue;
    }
  }
  return null;
}

/** 正文断言的单一真源：给定形态与缺陷，返回校验判定。 */
export function evaluateScenario(args: ExampleArgs): ValidationResult {
  const scenario = SCENARIOS[args.schemaForm];
  const sample = scenario.samples[args.sampleFlaw];
  const issue = validateFields(scenario.fields, sample);

  if (issue) {
    return {
      ok: false,
      path: issue.path,
      message: `${issue.path}: ${issue.reason}`,
    };
  }
  return {
    ok: true,
    path: '—',
    message: 'parsed：对象通过校验，字段类型确定，直接进业务代码',
  };
}

/** 样本 JSON 的紧凑展示：顶层字段每行一个，数组每元素一行。 */
function renderSampleLines(sample: Record<string, unknown>): string[] {
  const lines: string[] = ['{'];
  for (const [key, value] of Object.entries(sample)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`  "${key}": [],`);
        continue;
      }
      lines.push(`  "${key}": [`);
      for (const item of value) {
        lines.push(`    ${JSON.stringify(item)},`);
      }
      lines.push('  ],');
    } else {
      lines.push(`  "${key}": ${JSON.stringify(value)},`);
    }
  }
  lines.push('}');
  return lines;
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

function drawCodeCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  lines: string[],
): number {
  const height = 16 + lines.length * 17 + 12;

  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = '#dbe3f0';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = `11.5px ${MONO}`;
  ctx.fillStyle = '#334155';
  lines.forEach((line, index) => {
    ctx.fillText(fitText(ctx, line, width - 28), x + 14, y + 28 + index * 17);
  });

  return height;
}

function drawVerdict(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  result: ValidationResult,
): number {
  const pass = result.ok;
  const badge = pass ? '校验通过' : '校验失败';
  const color = pass ? '#0f8a5f' : '#b42318';
  const lines = [fitText(ctx, result.message, width - 24)];
  if (!pass) {
    lines.push(
      fitText(ctx, '错误定位到具体字段路径，可回传模型重试。', width - 24),
    );
  }
  const height = 50 + lines.length * 17 + 6;

  ctx.fillStyle = pass ? '#f0faf4' : '#fff5f4';
  roundedRect(ctx, x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = pass ? '#b5e0c8' : '#f2c1bb';
  ctx.stroke();

  ctx.font = `700 12px ${SANS}`;
  const badgeWidth = ctx.measureText(badge).width + 20;
  ctx.fillStyle = `${color}1f`;
  roundedRect(ctx, x + 12, y + 10, badgeWidth, 22, 5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(badge, x + 22, y + 25);

  ctx.font = `11.5px ${pass ? SANS : MONO}`;
  lines.forEach((line, index) => {
    ctx.fillStyle = pass ? '#315c4a' : color;
    ctx.fillText(line, x + 14, y + 48 + index * 17);
  });

  return height;
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  args: ExampleArgs,
): void {
  const scenario = SCENARIOS[args.schemaForm];
  const sample = scenario.samples[args.sampleFlaw];
  const result = evaluateScenario(args);

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#172033';
  ctx.font = `600 16px ${SANS}`;
  ctx.fillText('同一份 schema：合法样本通过，缺陷样本被校验拦下', 36, 40);

  const pad = 36;
  const colGap = 24;
  const leftWidth = Math.max(260, (width - pad * 2 - colGap) * 0.52);
  const rightX = pad + leftWidth + colGap;
  const rightWidth = Math.max(220, width - pad - rightX);

  // 左栏：zod schema 片段（它既发给模型，也在返回后校验）。
  let y = 76;
  ctx.fillStyle = '#5d6f67';
  ctx.font = `600 12px ${SANS}`;
  ctx.fillText('zod schema（发给模型 + 返回后校验）', pad, y);
  y += 14;
  y += drawCodeCard(ctx, pad, y, leftWidth, scenario.schemaLines) + 12;

  ctx.font = `11.5px ${SANS}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(fitText(ctx, '.describe() 写给模型看；类型与必填约束生成与校验。', leftWidth), pad, y);
  ctx.fillText(fitText(ctx, 'min/max 这类范围只在返回后校验，不拦生成。', leftWidth), pad, y + 17);

  // 右栏：模型返回样本 + 校验判定。
  let ry = 76;
  ctx.fillStyle = '#5d6f67';
  ctx.font = `600 12px ${SANS}`;
  ctx.fillText('模型返回样本', rightX, ry);
  ry += 14;
  ry += drawCodeCard(ctx, rightX, ry, rightWidth, renderSampleLines(sample)) + 12;

  drawVerdict(ctx, rightX, ry, rightWidth, result);
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
    schemaForm: 'required-optional',
    sampleFlaw: 'valid',
  };

  function drawCurrent(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const result = evaluateScenario(current);
    draw(drawingContext, width, height, current);
    emit({
      verdict: result.ok ? '通过' : '失败',
      errorPath: result.path,
    });
  }

  const resizeObserver = createResizeObserver(canvas, drawCurrent);

  return {
    update(options) {
      current = options;
      drawCurrent();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
