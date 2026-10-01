/** 工作记忆离线示意：对比 template（replace 整块重写）与 schema（merge 增量合并）两种形态。
 *  输入：mode 形态、scope 作用域、info 对话进度（0 初始 → 1 姓名 → 2 城市 → 3 长期目标）。
 *  操作：切换控件后画布重绘左侧工作记忆块与右侧每轮写入负载。
 *  预期：template 每轮写入都是整块 Markdown；schema 只提交变化字段；读数同步显示语义与负载。 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface WorkingMemoryBlockOptions { mode: 'template' | 'schema'; scope: 'resource' | 'thread'; info: number }

export interface WorkingMemoryBlockSnapshot { mode: string; semantic: string; facts: number; payload: string; scope: string }

export interface WorkingMemoryBlockInstance { update(options: WorkingMemoryBlockOptions): void; dispose(): void }

/** 依次告知的三条事实：field 对应模板字段下标，key / value 为 schema 字段与写入值。 */
const EVENTS = [
  { label: '告知姓名', field: 0, key: 'name', value: 'Sam' },
  { label: '再告知城市', field: 1, key: 'location', value: 'Berlin' },
  { label: '再告知长期目标', field: 4, key: 'goal', value: '完成马拉松' },
];
const TEMPLATE_FIELDS = ['Name', 'Location', 'Interests', 'Preferences', 'Long-term Goals'];

function templateLines(known: number): string[] {
  const filled = new Map<number, string>();
  for (let i = 0; i < known; i++) filled.set(EVENTS[i].field, EVENTS[i].value);
  return ['# User Profile', ...TEMPLATE_FIELDS.map((f, i) => `- **${f}**: ${filled.get(i) ?? ''}`)];
}

function schemaLines(known: number): string[] {
  if (known === 0) return ['{}'];
  return ['{', ...EVENTS.slice(0, known).map((e) => `  "${e.key}": "${e.value}"`), '}'];
}

const C = { bg: '#0f141a', panel: '#171e26', line: '#2a3441', text: '#dbe4ee', dim: '#77828f', blue: '#5aa9ff', green: '#43c78f' };

export function createWorkingMemoryBlock(
  canvas: HTMLCanvasElement,
  emit: (snapshot: WorkingMemoryBlockSnapshot) => void,
): WorkingMemoryBlockInstance {
  const ctx = canvas.getContext('2d')!;
  let options: WorkingMemoryBlockOptions = { mode: 'template', scope: 'resource', info: 0 };

  function snapshot(): WorkingMemoryBlockSnapshot {
    const known = options.info;
    const isTemplate = options.mode === 'template';
    const last = known > 0 ? EVENTS[known - 1] : null;
    return {
      mode: isTemplate ? 'Markdown 模板' : '结构化 schema',
      semantic: isTemplate ? 'replace 整块重写' : 'merge 增量合并',
      facts: known,
      payload: last
        ? isTemplate
          ? `整块 Markdown（${templateLines(known).length} 行）`
          : `patch { ${last.key}: "${last.value}" }`
        : '（尚未写入）',
      scope: options.scope,
    };
  }

  function draw() {
    const { width: w, height: h } = readCanvasSize(canvas);
    const isTemplate = options.mode === 'template';
    const known = options.info;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = C.dim; ctx.font = '12px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(options.scope === 'resource' ? 'scope: resource → 跨线程共享（mastra_resources）' : 'scope: thread → 仅当前线程', w - 16, 24);
    ctx.textAlign = 'left';
    const lw = Math.min(330, w * 0.42);
    panel(16, 40, lw, h - 60);
    title(isTemplate ? '工作记忆块 · Markdown' : '工作记忆块 · JSON', 32, 64);
    ctx.font = '13px ui-monospace, Menlo, monospace';
    ctx.fillStyle = isTemplate ? C.blue : C.green;
    (isTemplate ? templateLines(known) : schemaLines(known)).forEach((l, i) => ctx.fillText(l, 32, 92 + i * 19));
    const rx = 16 + lw + 16;
    panel(rx, 40, w - rx - 16, h - 60);
    title(isTemplate ? '写入负载 · replace' : '写入负载 · merge', rx + 16, 64);
    EVENTS.forEach((e, i) => {
      const y = 96 + i * 52;
      ctx.globalAlpha = i < known ? 1 : 0.35;
      ctx.fillStyle = C.text;
      ctx.font = '13px sans-serif';
      ctx.fillText(`第 ${i + 1} 轮 · ${e.label}`, rx + 16, y);
      const label = isTemplate ? '整块 Markdown（6 行）' : `patch { ${e.key}: "${e.value}" }`;
      ctx.font = '12px ui-monospace, Menlo, monospace';
      const bw = isTemplate ? w - rx - 48 : ctx.measureText(label).width + 16;
      ctx.fillStyle = isTemplate ? C.blue : C.green;
      ctx.fillRect(rx + 16, y + 8, bw, 22);
      ctx.fillStyle = C.bg;
      ctx.fillText(label, rx + 24, y + 23);
      ctx.globalAlpha = 1;
    });
    ctx.fillStyle = C.dim; ctx.font = '12px sans-serif';
    ctx.fillText(isTemplate ? 'replace：agent 每次携带整块，漏带旧字段即丢失' : 'merge：字段深度合并，null 删除字段，数组整体替换', rx + 16, h - 34);
  }

  function panel(x: number, y: number, w2: number, h2: number) {
    ctx.fillStyle = C.panel;
    ctx.fillRect(x, y, w2, h2);
  }

  function title(text: string, x: number, y: number) {
    ctx.fillStyle = C.text;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(text, x, y);
  }

  const observer = createResizeObserver(canvas, draw);
  return {
    update(next: WorkingMemoryBlockOptions) {
      options = { ...options, ...next };
      draw();
      emit(snapshot());
    },
    dispose() {
      observer.disconnect();
    },
  };
}
