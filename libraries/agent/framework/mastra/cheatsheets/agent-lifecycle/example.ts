// Agent 执行时间轴（离线 Canvas 2D 示意）
//
// 演示内容：agent.generate()/stream() 一次调用的三阶段管线——准备 → 循环（迭代 × maxSteps）→ 收尾，
//           以及各阶段按顺序触发的输入/输出处理器回调。
// 输入：story 控件 phase（prep / loop / finalize，对应准备 / 循环迭代 / 收尾）与 maxSteps（1~6，generate 默认 5）。
// 操作：切换阶段高亮对应卡片并展开其回调清单；调整 maxSteps 观察循环卡内的迭代徽章数量。
// 预期结果：左下角读数同步显示当前阶段、该阶段触发的回调链与模型步数上限。
// 阅读主线：顶部三段时间轴 → 下方高亮阶段的回调时间轴 → 与 README 的回调时机速查表对照。
// 机制依据：https://mastra.ai/docs/guides/agent-lifecycle 与 https://mastra.ai/reference/agents/generate
//           （Canvas 仅示意时序，不调用真实 LLM / 网络 / 数据库）。

import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export type LifecyclePhase = 'prep' | 'loop' | 'finalize';

export interface LifecycleArgs {
  phase: LifecyclePhase;
  maxSteps: number;
}

export interface LifecycleSnapshot {
  phaseLabel: string;
  callbacks: string;
  maxStepsLabel: string;
}

export interface LifecycleInstance {
  update: (args: LifecycleArgs) => void;
  dispose: () => void;
}

interface CallbackRow {
  name: string;
  note: string;
  /** true = 输入/输出处理器回调；false = 框架内部动作 */
  isProcessor: boolean;
}

interface PhaseInfo {
  key: LifecyclePhase;
  label: string;
  level: string; // 对应三层级：Run / Loop iteration / Model step
  tagline: string;
  rows: CallbackRow[];
}

const PHASES: PhaseInfo[] = [
  {
    key: 'prep',
    label: '① 准备',
    level: 'Run 的开头',
    tagline: '校验 RequestContext → 解析模型 / 指令 / 工具 → 用输入与记忆组装消息列表',
    rows: [
      { name: 'RequestContext 校验', note: '先于 getDefaultOptions()，函数式默认值来不及补缺失值', isProcessor: false },
      { name: '解析与装配', note: '模型、instructions、workspace/skills、本次的工具与处理器', isProcessor: false },
      { name: 'processInput', note: '每次运行一次：修改初始消息列表；从存储恢复的运行会跳过它', isProcessor: true },
    ],
  },
  {
    key: 'loop',
    label: '② 循环',
    level: 'Loop iteration → Model step',
    tagline: '每轮 = 一次模型步 + 工具工作 + 停止判断；工具结果通常触发下一轮',
    rows: [
      { name: 'processInputStep', note: '每轮开始：就地编辑累计消息列表，下一轮模型看到的就是它', isProcessor: true },
      { name: 'processLLMRequest', note: '消息转为提供商请求后：只改这一次调用的提示，不写入历史', isProcessor: true },
      { name: '模型调用', note: '提供商流式返回：processOutputStream 逐块生效，步末触发 processLLMResponse', isProcessor: false },
      { name: 'processOutputStep', note: '模型步之后、本地工具执行前触发', isProcessor: true },
      { name: '工具执行 → processToolResult', note: '每个本地/客户端工具结果进入消息列表前触发（校验 / 脱敏）', isProcessor: true },
      { name: '停止判断', note: '无工具请求 / stopWhen 条件 / maxSteps 上限 / tripwire·abort → 停止', isProcessor: false },
    ],
  },
  {
    key: 'finalize',
    label: '③ 收尾',
    level: 'Run 的结尾',
    tagline: '处理完成的结果与消息列表，然后持久化',
    rows: [
      { name: 'processOutputResult', note: '每次请求一次：正常结束或提供商抛错都会触发', isProcessor: true },
      { name: '输出处理器 → 记忆输出处理器', note: '先跑配置的输出处理器，再跑自动附加的记忆处理器：历史存最终形态', isProcessor: false },
      { name: '返回结果', note: 'response.text / steps / usage 可读；maxSteps 停在工具调用时可能没有最终回复', isProcessor: false },
    ],
  },
];

const CALLBACK_TRACE: Record<LifecyclePhase, string> = {
  prep: 'processInput',
  loop: 'processInputStep → processLLMRequest → processOutputStream → processLLMResponse → processOutputStep → processToolResult',
  finalize: 'processOutputResult',
};

const PHASE_LABEL: Record<LifecyclePhase, string> = {
  prep: '准备',
  loop: '循环迭代',
  finalize: '收尾',
};

export function createLifecycle(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LifecycleSnapshot) => void,
): LifecycleInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) {
    throw new Error('无法创建 Canvas 2D 上下文。');
  }

  let args: LifecycleArgs = { phase: 'loop', maxSteps: 3 };
  let width = 0;
  let height = 0;

  function phaseByKey(key: LifecyclePhase): PhaseInfo {
    return PHASES.find((phase) => phase.key === key) ?? PHASES[1];
  }

  function buildSnapshot(): LifecycleSnapshot {
    const phase = PHASE_LABEL[args.phase];
    return {
      phaseLabel: args.phase === 'loop' ? `${phase} × ${args.maxSteps}` : phase,
      callbacks: CALLBACK_TRACE[args.phase],
      maxStepsLabel: `${args.maxSteps}（generate 默认 5）`,
    };
  }

  function roundedRect(x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fitText(text: string, maxWidth: number): string {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let clipped = text;
    while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    return `${clipped}…`;
  }

  function drawPhaseCard(
    info: PhaseInfo,
    x: number,
    y: number,
    w: number,
    h: number,
    selected: boolean,
  ): void {
    ctx.fillStyle = selected ? '#eef2ff' : '#ffffff';
    ctx.strokeStyle = selected ? '#4f46e5' : '#cbd5e1';
    ctx.lineWidth = selected ? 2 : 1;
    roundedRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = selected ? '#312e81' : '#334155';
    ctx.font = '600 14px system-ui, -apple-system, "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(info.label, x + 12, y + 24);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui, -apple-system, "PingFang SC", sans-serif';
    ctx.fillText(fitText(info.level, w - 24), x + 12, y + 42);

    if (info.key === 'loop') {
      // 循环卡：迭代徽章 1..maxSteps + 上限读数
      const badgeY = y + 62;
      const badgeR = 10;
      let bx = x + 22;
      for (let i = 1; i <= args.maxSteps; i += 1) {
        ctx.beginPath();
        ctx.arc(bx, badgeY, badgeR, 0, Math.PI * 2);
        ctx.fillStyle = '#4f46e5';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(i), bx, badgeY + 3.5);
        bx += badgeR * 2 + 6;
      }
      ctx.fillStyle = '#475569';
      ctx.font = '11px system-ui, -apple-system, "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(
        fitText(`maxSteps = ${args.maxSteps}（默认 5）`, Math.max(40, x + w - 12 - bx)),
        Math.min(bx + 4, x + w - 12),
        badgeY + 4,
      );
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px system-ui, -apple-system, "PingFang SC", sans-serif';
      ctx.fillText(
        fitText(info.key === 'prep' ? 'processInput 触发一次' : 'processOutputResult 触发一次',
          w - 24),
        x + 12,
        y + 66,
      );
    }
  }

  function drawArrow(x1: number, y: number, x2: number): void {
    ctx.strokeStyle = '#94a3b8';
    ctx.fillStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2 - 6, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y);
    ctx.lineTo(x2 - 7, y - 4);
    ctx.lineTo(x2 - 7, y + 4);
    ctx.closePath();
    ctx.fill();
  }

  function drawDetail(x: number, y: number, w: number, h: number, info: PhaseInfo): void {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    roundedRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '600 14px system-ui, -apple-system, "PingFang SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${info.label} 回调时间轴`, x + 16, y + 26);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px system-ui, -apple-system, "PingFang SC", sans-serif';
    ctx.fillText(fitText(info.tagline, w - 32), x + 16, y + 46);

    // 回调行：左侧色块 = 处理器回调（紫）/ 内部动作（灰）
    const rowTop = y + 62;
    const rowH = Math.min(34, (h - 74) / info.rows.length);
    info.rows.forEach((row, index) => {
      const ry = rowTop + index * rowH;
      if (row.isProcessor) {
        ctx.fillStyle = '#eef2ff';
        roundedRect(x + 16, ry + 2, 8, rowH - 10, 4);
        ctx.fill();
      } else {
        ctx.fillStyle = '#e2e8f0';
        roundedRect(x + 16, ry + 2, 8, rowH - 10, 4);
        ctx.fill();
      }
      ctx.fillStyle = row.isProcessor ? '#4338ca' : '#334155';
      ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      const nameWidth = ctx.measureText(row.name).width;
      ctx.fillText(row.name, x + 34, ry + 14);
      ctx.fillStyle = '#475569';
      ctx.font = '12px system-ui, -apple-system, "PingFang SC", sans-serif';
      ctx.fillText(
        fitText(row.note, w - 50 - nameWidth),
        x + 44 + nameWidth,
        ry + 14,
      );
    });

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, -apple-system, "PingFang SC", sans-serif';
    ctx.fillText('左侧紫色 = 输入/输出处理器回调 · 灰色 = 框架内部动作', x + 16, y + h - 10);
  }

  function draw(): void {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, width, height);

    const pad = 16;
    const cardH = 100;
    const gap = 30;
    const usable = Math.max(120, width - pad * 2 - gap * 2);
    const widths = [usable * 0.24, usable * 0.44, usable * 0.32];
    let cx = pad;
    const cardY = pad + 6;

    PHASES.forEach((info, index) => {
      drawPhaseCard(info, cx, cardY, widths[index], cardH, info.key === args.phase);
      cx += widths[index];
      if (index < PHASES.length - 1) {
        drawArrow(cx + 6, cardY + cardH / 2, cx + gap - 4);
        cx += gap;
      }
    });

    const panelTop = cardY + cardH + 14;
    drawDetail(pad, panelTop, width - pad * 2, Math.max(80, height - panelTop - pad), phaseByKey(args.phase));
  }

  function resize(): void {
    const size = readCanvasSize(canvas);
    const dpr = globalThis.devicePixelRatio || 1;
    width = size.width;
    height = size.height;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  const observer = createResizeObserver(canvas, () => resize());

  resize();
  emit(buildSnapshot());

  return {
    update(next: LifecycleArgs): void {
      args = { ...args, ...next };
      draw();
      emit(buildSnapshot());
    },
    dispose(): void {
      observer.disconnect();
    },
  };
}
