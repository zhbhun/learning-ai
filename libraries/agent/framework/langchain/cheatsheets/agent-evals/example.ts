/**
 * 范例介绍：确定性模拟「评估器选择与分数解读」。预置一个 5 条 example 的
 * 迷你评估数据集（question + 参考答案 + v1/v2 两版候选答案）：exact 与
 * contains 两列是真实执行的规则判定；LLM-judge 列的分数与理由为预置模拟值
 * （图中标注「模拟」），Storybook 内不调用任何模型。
 * 输入：evaluator（exact=精确匹配 / contains=关键词包含 / judge=LLM-judge
 * 模拟）、version（v1=baseline / v2=candidate，改提示词后的新版本）。
 * 预期结果：E2（语义等价）与 E5（拼写小错）在 exact 列被判 ✗、judge 列拿到
 * 0.9/1.0——精确匹配漏判语义等价；切到 v2 后 E2/E4 修好、E3 温度幻觉跌到
 * 0.3——judge 均分 0.86 过门禁（≥0.80）但单条回归被暴露；而 exact 两版都被
 * 拦截（0.2/0.4）：门禁评估器的选择决定你看到的结论。
 * 阅读主线：先看 EXAMPLES / KEYWORDS / THRESHOLD（判定真源），再看
 * exactMatch / containsAll / scoreOf 的规则判定，最后看 draw 的判定表与
 * 底部的 v1/v2 分数对比条。
 */
import {
  createResizeObserver,
  readCanvasSize,
} from '../../assets/canvas-runtime.js';

export type EvaluatorKind = 'exact' | 'contains' | 'judge';
export type Version = 'v1' | 'v2';

/** 门禁阈值：模拟 CI 回归门禁（正文「回归门禁」小节的 0.80 线）。 */
export const THRESHOLD = 0.8;

/** 评估器的展示名：readout 与图例共用。 */
export const EVALUATOR_LABEL: Record<EvaluatorKind, string> = {
  exact: '精确匹配',
  contains: '关键词包含',
  judge: 'LLM-judge（模拟）',
};

interface JudgeVerdict {
  /** 预置模拟分（真实运行时由 judge 模型产生，非确定）。 */
  score: number;
  /** 分数理由：judge 的维度解读（正确性 / 完整性），模拟值。 */
  note: string;
}

interface EvalExample {
  id: string;
  question: string;
  /** dataset 的 referenceOutputs：所有评估器共同对照的期望答案。 */
  reference: string;
  /** v1（baseline）与 v2（改提示词后）两版候选答案。 */
  answers: Record<Version, string>;
  /** LLM-judge 的预置模拟判定。 */
  judge: Record<Version, JudgeVerdict>;
}

/**
 * 迷你评估集：v2 的故事是「提示词改成照抄工具输出」——E2 因此逐字一致、
 * E4 修正，副作用是 E3 出现温度幻觉（82°F，工具返回 75°F）。E1/E5 不变，
 * 行首圆点标出 v1→v2 有变更的行。
 */
const EXAMPLES: EvalExample[] = [
  {
    id: 'E1',
    question: "What's the weather in San Francisco?",
    reference: "It's 75 degrees and sunny in San Francisco.",
    answers: {
      v1: "It's 75 degrees and sunny in San Francisco.",
      v2: "It's 75 degrees and sunny in San Francisco.",
    },
    judge: {
      v1: { score: 1.0, note: '逐字一致' },
      v2: { score: 1.0, note: '逐字一致' },
    },
  },
  {
    id: 'E2',
    question: "What's the weather in San Francisco?",
    reference: "It's 75 degrees and sunny in San Francisco.",
    answers: {
      v1: "It's sunny and 75°F in San Francisco.",
      v2: "It's 75 degrees and sunny in San Francisco.",
    },
    judge: {
      v1: { score: 0.9, note: '语义等价 · 单位不同' },
      v2: { score: 1.0, note: '逐字一致' },
    },
  },
  {
    id: 'E3',
    question: "What's the weather in San Francisco?",
    reference: "It's 75 degrees and sunny in San Francisco.",
    answers: {
      v1: "It's 75 degrees and sunny.",
      v2: "It's 82 degrees and sunny in San Francisco.",
    },
    judge: {
      v1: { score: 0.7, note: '正确但缺城市' },
      v2: { score: 0.3, note: '温度幻觉 82≠75' },
    },
  },
  {
    id: 'E4',
    question: "What's the weather in San Francisco?",
    reference: "It's 75 degrees and sunny in San Francisco.",
    answers: {
      v1: "It's raining in San Francisco.",
      v2: 'The weather in San Francisco is 75 degrees and sunny.',
    },
    judge: {
      v1: { score: 0.0, note: '与工具结果矛盾' },
      v2: { score: 1.0, note: '语义正确' },
    },
  },
  {
    id: 'E5',
    question: "What's the weather in San Francisco?",
    reference: "It's 75 degrees and sunny in San Francisco.",
    answers: {
      v1: "It's 75 degree's and sunny in San Francisco.",
      v2: "It's 75 degree's and sunny in San Francisco.",
    },
    judge: {
      v1: { score: 1.0, note: '拼写小错 · 语义完好' },
      v2: { score: 1.0, note: '拼写小错 · 语义完好' },
    },
  },
];

/** contains 判定的关键词集：全部命中才算过。 */
const KEYWORDS = ['75', 'sunny', 'San Francisco'];

/** 精确匹配：逐字相等——措辞、单位、标点的任何差异都判 ✗。 */
export function exactMatch(answer: string, reference: string): boolean {
  return answer === reference;
}

/** 关键词包含：答案里出现全部关键词才算过。 */
export function containsAll(answer: string): boolean {
  return KEYWORDS.every((keyword) => answer.includes(keyword));
}

/** 汇总分数：exact/contains 用通过率，judge 用均分（都归一到 0-1）。 */
export function scoreOf(evaluator: EvaluatorKind, version: Version): number {
  if (evaluator === 'judge') {
    const total = EXAMPLES.reduce(
      (sum, example) => sum + example.judge[version].score,
      0,
    );
    return total / EXAMPLES.length;
  }
  const passed = EXAMPLES.filter((example) =>
    evaluator === 'exact'
      ? exactMatch(example.answers[version], example.reference)
      : containsAll(example.answers[version]),
  ).length;
  return passed / EXAMPLES.length;
}

/** 门禁判定：不低于阈值算通过。 */
export function gatePass(score: number): boolean {
  return score >= THRESHOLD;
}

/** v2 相对 v1 的分数变化。 */
export function deltaOf(evaluator: EvaluatorKind): number {
  return scoreOf(evaluator, 'v2') - scoreOf(evaluator, 'v1');
}

/** 当前（评估器 × 版本）的结论：与正文断言一一对应。 */
function footnoteFor(evaluator: EvaluatorKind, version: Version): string {
  const score = scoreOf(evaluator, version);
  if (evaluator === 'exact') {
    return version === 'v1'
      ? `精确匹配只认逐字相等：E2 语义等价、E5 拼写小错全被判 ✗——通过率 ${score.toFixed(1)}，被门禁拦截`
      : `v2 让 E2 逐字一致进入命中，但 0.4 仍远低于 0.80——exact 当门禁会永远红，逼迫逐字对齐`;
  }
  if (evaluator === 'contains') {
    return version === 'v1'
      ? `关键词全命中才算过：E3 缺城市、E4 全错判 ✗——通过率 ${score.toFixed(1)}`
      : `E4 修正后命中；E3 温度 82≠75 仍 ✗——${score.toFixed(1)} 踩线过门禁，但看不出 E3 错在哪`;
  }
  return version === 'v1'
    ? `judge 认可 E2/E5 的语义等价（0.9/1.0），E3 缺城市只拿 0.7——均分 ${score.toFixed(2)}，被门禁拦截`
    : `均分 ${score.toFixed(2)} 过门禁，但 E3 温度幻觉跌到 0.3——单条回归被暴露，这是 exact/contains 给不了的信号`;
}

export interface ExampleArgs {
  evaluator: EvaluatorKind;
  version: Version;
}

export interface ExampleSnapshot {
  evaluator: EvaluatorKind;
  version: Version;
  score: number;
  gate: string;
  delta: number;
}

export interface ExampleInstance {
  update(options: ExampleArgs): void;
  dispose(): void;
}

const SANS = 'ui-sans-serif, system-ui, sans-serif';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const COLOR = {
  title: '#172033',
  sub: '#64748b',
  text: '#334155',
  ghost: '#b6c2d1',
  grid: '#e6ecf5',
  pass: '#16803c',
  fail: '#b91c1c',
  judge: '#7c6bb0',
  highlight: '#0f172a',
  column: 'rgba(79, 124, 255, 0.08)',
} as const;

const EVALUATOR_COLOR: Record<EvaluatorKind, string> = {
  exact: '#4f7cff',
  contains: '#b45309',
  judge: COLOR.judge,
};

function verdictOf(
  example: EvalExample,
  evaluator: EvaluatorKind,
  version: Version,
): boolean {
  return evaluator === 'exact'
    ? exactMatch(example.answers[version], example.reference)
    : containsAll(example.answers[version]);
}

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
    ctx.arcTo(x + width, y, x + width, y + height, radius);
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

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  args: ExampleArgs,
): void {
  ctx.clearRect(0, 0, width, height);
  const pad = 36;
  const reference = EXAMPLES[0].reference;

  ctx.fillStyle = COLOR.title;
  ctx.font = `600 15.5px ${SANS}`;
  ctx.fillText('同一批答案，不同评估器，不同结论', pad, 34);

  ctx.fillStyle = COLOR.sub;
  ctx.font = `11px ${MONO}`;
  ctx.fillText(
    `dataset: weather-qa · 5 examples · 门禁线 ${THRESHOLD.toFixed(2)} · LLM-judge 分数为预置模拟值`,
    pad,
    56,
  );

  // 参考答案与变更标记图例：referenceOutputs 是三个评估器共同的对照。
  ctx.fillStyle = COLOR.ghost;
  ctx.font = `10.5px ${MONO}`;
  ctx.fillText(
    `参考答案（referenceOutputs）: ${fitText(ctx, `"${reference}"`, width - pad * 2 - 150)}`,
    pad,
    76,
  );
  ctx.textAlign = 'right';
  ctx.fillStyle = COLOR.sub;
  ctx.font = `10.5px ${SANS}`;
  ctx.fillText('● v1→v2 有变更', width - pad, 76);
  ctx.textAlign = 'left';

  // 判定表：列 = 编号 / 候选答案（当前版本）/ exact / contains / judge。
  // 底部汇总区贴底定位，表格行高按剩余空间自适应；高度不足时放弃汇总区。
  const headY = 96;
  const tableTop = headY + 12;
  const footnoteY = height - 40;
  const summaryTop = height - 118;
  const summaryFits =
    summaryTop - 10 >= tableTop + 26 * EXAMPLES.length;
  const availableForTable = (summaryFits ? summaryTop - 10 : footnoteY - 14) - tableTop;
  const rowH = Math.max(
    26,
    Math.min(48, availableForTable / EXAMPLES.length),
  );
  const judgeW = 118;
  const containsW = 74;
  const exactW = 58;
  const idW = 30;
  const answerW = Math.max(
    120,
    width - pad * 2 - idW - exactW - containsW - judgeW,
  );
  const colId = pad;
  const colAnswer = colId + idW;
  const colExact = colAnswer + answerW;
  const colContains = colExact + exactW;
  const colJudge = colContains + containsW;
  const tableBottom = tableTop + EXAMPLES.length * rowH;

  // 选中评估器列的整列底色：表格其余部分保持安静。
  ctx.fillStyle = COLOR.column;
  const columnX =
    args.evaluator === 'exact'
      ? colExact
      : args.evaluator === 'contains'
        ? colContains
        : colJudge;
  const columnW =
    args.evaluator === 'exact' ? exactW : args.evaluator === 'contains' ? containsW : judgeW;
  ctx.fillRect(columnX, headY - 8, columnW, tableBottom - headY + 10);

  ctx.font = `600 10.5px ${MONO}`;
  ctx.fillStyle = COLOR.sub;
  ctx.fillText('#', colId, headY);
  ctx.fillText(
    `候选答案（${args.version === 'v1' ? 'v1 · baseline' : 'v2 · candidate'}）`,
    colAnswer,
    headY,
  );
  ctx.textAlign = 'center';
  ctx.fillStyle = args.evaluator === 'exact' ? COLOR.highlight : COLOR.sub;
  ctx.fillText('exact', colExact + exactW / 2, headY);
  ctx.fillStyle = args.evaluator === 'contains' ? COLOR.highlight : COLOR.sub;
  ctx.fillText('contains', colContains + containsW / 2, headY);
  ctx.fillStyle = args.evaluator === 'judge' ? COLOR.highlight : COLOR.sub;
  ctx.fillText('LLM-judge 模拟', colJudge + judgeW / 2, headY);
  ctx.textAlign = 'left';

  EXAMPLES.forEach((example, index) => {
    const rowTop = tableTop + index * rowH;
    const changed = example.answers.v1 !== example.answers.v2;
    const baseY = rowTop + Math.min(20, rowH / 2 + 2);

    // 分隔线
    ctx.strokeStyle = COLOR.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, rowTop + rowH - 6);
    ctx.lineTo(width - pad, rowTop + rowH - 6);
    ctx.stroke();

    ctx.fillStyle = changed ? COLOR.sub : COLOR.ghost;
    ctx.font = `600 11px ${MONO}`;
    ctx.fillText(example.id, colId, baseY);
    if (changed) {
      ctx.fillStyle = EVALUATOR_COLOR[args.evaluator];
      ctx.beginPath();
      ctx.arc(colId + 22, baseY - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = COLOR.text;
    ctx.font = `11px ${MONO}`;
    ctx.fillText(
      fitText(ctx, example.answers[args.version], answerW - 12),
      colAnswer,
      baseY,
    );

    // 三个判定格：✓/✗ 与 judge 模拟分。
    ctx.textAlign = 'center';
    ctx.font = `600 12px ${MONO}`;
    for (const kind of ['exact', 'contains'] as const) {
      const passed = verdictOf(example, kind, args.version);
      const cellX = kind === 'exact' ? colExact + exactW / 2 : colContains + containsW / 2;
      ctx.fillStyle = passed ? COLOR.pass : COLOR.fail;
      ctx.fillText(passed ? '✓' : '✗', cellX, baseY);
    }
    const verdict = example.judge[args.version];
    ctx.fillStyle = EVALUATOR_COLOR.judge;
    ctx.font = `600 11px ${MONO}`;
    ctx.fillText(verdict.score.toFixed(1), colJudge + judgeW / 2, baseY - 4);
    if (width > 560 && rowH >= 44) {
      ctx.fillStyle = COLOR.sub;
      ctx.font = `9px ${SANS}`;
      ctx.fillText(
        fitText(ctx, verdict.note, judgeW - 8),
        colJudge + judgeW / 2,
        baseY + 10,
      );
    }
    ctx.textAlign = 'left';
  });

  // 底部：三个评估器的 v1/v2 分数对比条 + 门禁线（summaryTop 为贴底定位）。
  if (!summaryFits) {
    drawFootnotes();
    return;
  }
  const barAreaTop = summaryTop + 18;
  const barH = 9;
  const gap = 16;
  const blockW = (width - pad * 2 - gap * 2) / 3;

  (['exact', 'contains', 'judge'] as const).forEach((kind, block) => {
    const blockX = pad + block * (blockW + gap);
    const selected = kind === args.evaluator;
    const v1 = scoreOf(kind, 'v1');
    const v2 = scoreOf(kind, 'v2');

    if (selected) {
      ctx.strokeStyle = COLOR.grid;
      ctx.lineWidth = 1;
      roundedRect(ctx, blockX - 6, summaryTop - 6, blockW + 10, 52, 6);
      ctx.stroke();
    }

    ctx.fillStyle = selected ? COLOR.highlight : COLOR.sub;
    ctx.font = `600 10.5px ${MONO}`;
    ctx.fillText(
      `${EVALUATOR_LABEL[kind]} ${v1.toFixed(1)} → ${v2.toFixed(1)}`,
      blockX,
      summaryTop + 8,
    );

    const barX = blockX;
    const barMaxW = blockW - 64; // 右侧留出 v1/v2 数值标签的空间
    const rows: Array<[Version, number]> = [
      ['v1', v1],
      ['v2', v2],
    ];
    rows.forEach(([version, score], row) => {
      const y = barAreaTop + row * (barH + 4);
      const active = version === args.version;
      const barW = Math.max(2, score * barMaxW);
      ctx.globalAlpha = active ? 1 : 0.35;
      ctx.fillStyle = version === 'v1' ? COLOR.ghost : EVALUATOR_COLOR[kind];
      roundedRect(ctx, barX, y, barW, barH, 3);
      ctx.fill();
      ctx.globalAlpha = active ? 1 : 0.55;
      ctx.fillStyle = COLOR.sub;
      ctx.font = `9.5px ${MONO}`;
      ctx.fillText(
        `${version} ${score.toFixed(2)}${gatePass(score) ? '' : ' ✗'}`,
        barX + barMaxW + 6,
        y + 8,
      );
      ctx.globalAlpha = 1;
    });

    // 门禁线：贯穿两条 bar 的 0.80 刻度。
    ctx.strokeStyle = COLOR.fail;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    const gateX = barX + THRESHOLD * barMaxW;
    ctx.moveTo(gateX, barAreaTop - 4);
    ctx.lineTo(gateX, barAreaTop + barH * 2 + 12);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  drawFootnotes();

  function drawFootnotes(): void {
    // 结论与读法：与正文断言对应的可观察证据。
    ctx.fillStyle = COLOR.sub;
    ctx.font = `11.5px ${SANS}`;
    ctx.fillText(
      fitText(ctx, footnoteFor(args.evaluator, args.version), width - pad * 2),
      pad,
      footnoteY,
    );
    ctx.fillStyle = COLOR.ghost;
    ctx.font = `10.5px ${SANS}`;
    ctx.fillText(
      fitText(
        ctx,
        '读法：上表看单条判定差异（E2/E5 被 exact 漏判），下条看 v1→v2 分数与门禁——换一个评估器，对同一个版本的结论就变了',
        width - pad * 2,
      ),
      pad,
      height - 20,
    );
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

  let current: ExampleArgs = { evaluator: 'judge', version: 'v1' };

  function drawCurrent(): void {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    draw(drawingContext, width, height, current);
    const score = scoreOf(current.evaluator, current.version);
    emit({
      evaluator: current.evaluator,
      version: current.version,
      score,
      gate: gatePass(score) ? '通过' : '拦截',
      delta: deltaOf(current.evaluator),
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
