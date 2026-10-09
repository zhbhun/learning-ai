/*
 * 演示:AskUserQuestion 应答回放——回调收到 questions 后,answers 怎么构造。
 * 输入:答案场景(0 单选回 label / 1 多选回数组 / 2 多选回逗号串 / 3 自由文本)。
 * 操作:拖动「答案场景」切换用户的选择,看高亮的 answers 条目随之变化。
 * 预期:key 是 question 的完整文本,value 是选中 option 的 label;
 *       多选传 label 数组或 ", " 连接的字符串(等价);自由文本把用户输入直接作为 value。
 * 阅读主线:上半部分是问题数据与四个答案场景(教学核心);下半部分是
 *           Canvas 渲染外壳(演示载体,可略读)。全部为演示数据,不调用 LLM API。
 */

/* ------------------------------------------------------------------ */
/* 教学核心:问题数据与答案场景                                          */
/* ------------------------------------------------------------------ */

/** 问题对象与回调收到的 AskUserQuestionInput.questions[] 同构 */
export interface DemoQuestion {
  question: string;
  header: string;
  options: Array<{ label: string; description: string }>;
  multiSelect: boolean;
}

export const DEMO_QUESTIONS: DemoQuestion[] = [
  {
    question: "How should I format the output?",
    header: "Format",
    options: [
      { label: "Summary", description: "Brief overview" },
      { label: "Detailed", description: "Full explanation" },
    ],
    multiSelect: false,
  },
  {
    question: "Which sections should I include?",
    header: "Sections",
    options: [
      { label: "Introduction", description: "Opening context" },
      { label: "Conclusion", description: "Final summary" },
    ],
    multiSelect: true,
  },
];

export interface DemoScenario {
  name: string;
  /** 回答 DEMO_QUESTIONS 的第几个问题 */
  questionIndex: number;
  /** 场景选中的选项下标;自由文本场景为 -1 */
  selected: number[];
  /** 读数用:回填的答案值 */
  answer: string;
  /** 读数用:值形态说明 */
  form: string;
  /** 回放代码(逐行) */
  jsonLines: string[];
  /** 高亮行号(answers 条目) */
  highlight: number;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    name: "单选 · 回 label",
    questionIndex: 0,
    selected: [0],
    answer: '"Summary"',
    form: "label 字符串",
    jsonLines: [
      "return {",
      '  behavior: "allow",',
      "  updatedInput: {",
      "    questions: input.questions, // 原样传回",
      "    answers: {",
      '      "How should I format the output?": "Summary",',
      "    },",
      "  },",
      "};",
    ],
    highlight: 5,
  },
  {
    name: "多选 · 回数组",
    questionIndex: 1,
    selected: [0, 1],
    answer: '["Introduction", "Conclusion"]',
    form: "label 数组(multiSelect)",
    jsonLines: [
      "return {",
      '  behavior: "allow",',
      "  updatedInput: {",
      "    questions: input.questions,",
      "    answers: {",
      '      "Which sections should I include?":',
      '        ["Introduction", "Conclusion"],',
      "    },",
      "  },",
      "};",
    ],
    highlight: 6,
  },
  {
    name: "多选 · 逗号串等价",
    questionIndex: 1,
    selected: [0, 1],
    answer: '"Introduction, Conclusion"',
    form: '", " 连接的字符串(与数组等价)',
    jsonLines: [
      "return {",
      '  behavior: "allow",',
      "  updatedInput: {",
      "    questions: input.questions,",
      "    answers: {",
      '      "Which sections should I include?": "Introduction, Conclusion",',
      "    },",
      "  },",
      "};",
    ],
    highlight: 5,
  },
  {
    name: "自由文本 · Other 通道",
    questionIndex: 0,
    selected: [-1],
    answer: '"越短越好"',
    form: "用户输入的文本(界面自加 Other 选项)",
    jsonLines: [
      "return {",
      '  behavior: "allow",',
      "  updatedInput: {",
      "    questions: input.questions,",
      "    answers: {",
      '      "How should I format the output?": "越短越好",',
      "    },",
      "  },",
      "};",
    ],
    highlight: 5,
  },
];

/* ------------------------------------------------------------------ */
/* 渲染外壳:问题卡片 + answers 回放代码(演示载体)                      */
/* ------------------------------------------------------------------ */

import {
  createResizeObserver,
  readCanvasSize,
} from "../../assets/canvas-runtime.js";

export interface DemoOptions {
  scenario: number;
}

export interface DemoSnapshot {
  scenario: string;
  answer: string;
  form: string;
}

export interface DemoInstance {
  update(options: DemoOptions): void;
  dispose(): void;
}

export function createUserInputDemo(
  canvas: HTMLCanvasElement,
  emit: (snapshot: DemoSnapshot) => void,
): DemoInstance {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("当前浏览器不支持 Canvas 2D。");
  }
  const ctx: CanvasRenderingContext2D = context;

  let current: DemoOptions = { scenario: 0 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(430, size.height);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const scenarioIndex = Math.max(
      0,
      Math.min(DEMO_SCENARIOS.length - 1, Math.round(current.scenario)),
    );
    const scenario = DEMO_SCENARIOS[scenarioIndex];
    const margin = 28;

    // 标题
    ctx.fillStyle = "#172033";
    ctx.font = "600 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("AskUserQuestion 应答回放:answers 怎么构造(演示数据)", margin, 32);

    // 两张问题卡片
    const cardTop = 48;
    const cardHeight = 118;
    const gap = 12;
    const cardWidth = (width - margin * 2 - gap) / 2;

    DEMO_QUESTIONS.forEach((q, qIndex) => {
      const left = margin + qIndex * (cardWidth + gap);
      const isTarget = qIndex === scenario.questionIndex;

      ctx.fillStyle = isTarget ? "#eef2ff" : "#f8fafc";
      ctx.strokeStyle = isTarget ? "#4f7cff" : "#e2e8f0";
      ctx.lineWidth = isTarget ? 2 : 1;
      roundRect(left, cardTop, cardWidth, cardHeight, 8);
      ctx.fill();
      ctx.stroke();

      // header 与 multiSelect 标记
      ctx.fillStyle = isTarget ? "#1d4ed8" : "#64748b";
      ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
      const headerLabel = q.multiSelect
        ? `${q.header} · multiSelect`
        : q.header;
      ctx.fillText(headerLabel, left + 12, cardTop + 20);

      // question 全文:它是 answers 的 key
      ctx.fillStyle = "#172033";
      ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(q.question, left + 12, cardTop + 40);

      // 选项列表;当前场景选中的加绿点
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      q.options.forEach((opt, oIndex) => {
        const y = cardTop + 62 + oIndex * 19;
        const isSelected = isTarget && scenario.selected.includes(oIndex);
        if (isSelected) {
          ctx.fillStyle = "#159570";
          ctx.beginPath();
          ctx.arc(left + 16, y - 4, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = isSelected ? "#159570" : "#475569";
        ctx.fillText(`${opt.label} · ${opt.description}`, left + 26, y);
      });

      // Other 通道:你的界面自加,自由文本场景选中它
      const otherY = cardTop + 62 + q.options.length * 19;
      const otherSelected = isTarget && scenario.selected[0] === -1;
      ctx.fillStyle = otherSelected ? "#159570" : "#94a3b8";
      ctx.fillText(
        otherSelected
          ? "+ Other ← 值填用户输入"
          : "+ Other(你的界面自加)",
        left + 26,
        otherY,
      );
    });

    // 场景说明
    ctx.fillStyle = "#172033";
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`场景 ${scenarioIndex + 1}/4 · ${scenario.name}`, margin, 194);

    // answers 回放代码,高亮 answers 条目行
    const jsonTop = 208;
    const lineHeight = 19;
    scenario.jsonLines.forEach((line, index) => {
      const y = jsonTop + index * lineHeight;
      if (index === scenario.highlight) {
        ctx.fillStyle = "#e8eefc";
        roundRect(margin - 6, y - 13, width - margin * 2 + 12, 17, 4);
        ctx.fill();
      }
      ctx.fillStyle =
        index === scenario.highlight ? "#1d4ed8" : "#334155";
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(line, margin, y);
    });

    // 高亮行注解
    const noteY = jsonTop + scenario.jsonLines.length * lineHeight + 8;
    ctx.fillStyle = "#475569";
    ctx.font = "12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      "高亮行:key 是 question 全文,value 是选中 option 的 label(或用户输入)",
      margin,
      noteY,
    );

    emit({
      scenario: scenario.name,
      answer: scenario.answer,
      form: scenario.form,
    });
  }

  function roundRect(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options: DemoOptions) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
