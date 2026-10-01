// 演示内容：「目录即 Agent」——src/mastra/agents/weather/ 的组成如何决定注册与合并结果。
// 输入：instructions 来源组合与 tools 组成方式（stories 控件）；操作：切换控件观察目录树与注册结果。
// 预期：目录名 weather 即注册 id；instructions 全缺则构建失败；动态 config.instructions 覆盖文件、静态被文件覆盖、
//   instructions.ts 胜 .md；tools/ 与 config.tools 对象合并且同名 config 胜，config 为函数时忽略目录发现。
// 阅读主线：resolveInstructions / resolveTools 实现官方合并规则 → buildAgentDir 汇总 → drawAgentDir 渲染。

import { readCanvasSize } from '../../assets/canvas-runtime.js';

export type InstructionsMode = 'md' | 'ts' | 'static' | 'dynamic' | 'missing';
export type ToolsMode = 'dir' | 'config' | 'both' | 'fn';
export interface AgentArgs { instructions: InstructionsMode; tools: ToolsMode }
export interface AgentSnapshot { id: string; buildOk: boolean; instructionsSource: string; instructionsText: string; tools: string; toolsNote: string; buildNote: string }

const MD_TEXT = '你是天气助手，回答当前天气与预报。（instructions.md）';
const TS_TEXT = '你是天气助手，指令由 TS 计算生成。（instructions.ts）';
const DYN_TEXT = '你是天气助手，指令随运行时上下文变化。（config 动态函数）';

/** instructions 优先级：动态 config > instructions.ts > instructions.md > 静态 config */
function resolveInstructions(mode: InstructionsMode): { source: string; text: string } {
  switch (mode) {
    case 'md': return { source: 'instructions.md', text: MD_TEXT };
    case 'ts': return { source: 'instructions.ts（.ts 胜 .md）', text: TS_TEXT };
    case 'static': return { source: 'instructions.md（静态 config 让位文件）', text: MD_TEXT };
    case 'dynamic': return { source: 'config.instructions 动态（覆盖文件）', text: DYN_TEXT };
    default: return { source: '缺失', text: '' };
  }
}

/** tools 规则：目录与 config 对象合并、同名 config 胜；config 为函数时忽略目录 */
function resolveTools(mode: ToolsMode): { list: string[]; note: string } {
  switch (mode) {
    case 'dir': return { list: ['getWeather', 'getForecast'], note: 'tools/ 目录' };
    case 'config': return { list: ['convertUnit', 'getWeather（config 版）'], note: 'config.tools 对象' };
    case 'both': return { list: ['convertUnit', 'getWeather（config 版）', 'getForecast'], note: '合并，同名 config 胜' };
    default: return { list: ['dynamicTools() 结果'], note: 'config 函数：忽略目录' };
  }
}

export function buildAgentDir(args: AgentArgs): AgentSnapshot {
  const ins = resolveInstructions(args.instructions);
  const tls = resolveTools(args.tools);
  const buildOk = args.instructions !== 'missing';
  return {
    id: 'weather', buildOk, instructionsSource: ins.source, instructionsText: ins.text,
    tools: tls.list.join('、'), toolsNote: tls.note,
    buildNote: buildOk ? '构建通过' : '失败：instructions 三选一全缺',
  };
}

type RowState = 'active' | 'covered' | 'ignored' | 'absent';
const MARK: Record<RowState, string> = { active: '✓', covered: '∼', ignored: '⊘', absent: '–' };
const COLOR: Record<RowState, string> = { active: '#16a34a', covered: '#d97706', ignored: '#94a3b8', absent: '#cbd5e1' };

function treeRows(args: AgentArgs): Array<[string, RowState]> {
  const tool: RowState = args.tools === 'fn' ? 'ignored' : args.tools === 'config' ? 'absent' : 'active';
  const md: RowState = args.instructions === 'missing' ? 'absent' : args.instructions === 'ts' ? 'covered' : 'active';
  return [
    ['config.ts（agentConfig）', 'active'],
    ['instructions.md', md],
    ['instructions.ts', args.instructions === 'ts' ? 'active' : 'absent'],
    ['tools/getWeather.ts', tool],
    ['tools/getForecast.ts', tool],
  ];
}

function drawAgentDir(canvas: HTMLCanvasElement, args: AgentArgs, snap: AgentSnapshot): void {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) return;
  const { width: w, height: h } = readCanvasSize(canvas);
  ctx.clearRect(0, 0, w, h);
  const rx = Math.min(w * 0.46, 400) + 24;
  const rw = w - rx - 28;
  const say = (t: string, x: number, y: number, c: string, f = '13px sans-serif') => {
    ctx.fillStyle = c; ctx.font = f; ctx.fillText(t, x, y);
  };

  // 左栏：目录树（✓ 生效 ∼ 被覆盖 ⊘ 被忽略 – 不存在）
  say('src/mastra/agents/weather/', 32, 42, '#0f172a', 'bold 14px sans-serif');
  treeRows(args).forEach(([label, state], i) => {
    const y = 76 + i * 30;
    say(MARK[state], 36, y, COLOR[state]);
    say(label, 60, y, state === 'absent' ? '#94a3b8' : '#1f2937', '13px ui-monospace, monospace');
  });
  say('✓ 生效   ∼ 被覆盖   ⊘ 被忽略   – 不存在', 32, h - 32, '#64748b', '12px sans-serif');

  // 右栏：bundler 合并后的注册结果卡片
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = snap.buildOk ? '#cbd5e1' : '#dc2626';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(rx, 24, rw, h - 56, 10);
  ctx.fill();
  ctx.stroke();
  say(snap.buildOk ? '注册结果' : '构建失败', rx + 18, 52, '#0f172a', 'bold 14px sans-serif');
  if (!snap.buildOk) {
    say('instructions.md / instructions.ts / config.instructions 至少需要其一，', rx + 18, 80, '#b91c1c');
    say('三者全缺时构建失败，只提供 model 不够。', rx + 18, 100, '#b91c1c');
    return;
  }
  say('id = "' + snap.id + '"（= 目录名，稳定路由键）', rx + 18, 80, '#2563eb', 'bold 13px sans-serif');
  say('instructions：' + snap.instructionsSource, rx + 18, 106, '#334155');
  say(snap.instructionsText, rx + 18, 126, '#64748b', '12px sans-serif');
  say('tools：' + snap.toolsNote, rx + 18, 152, '#334155');
  let cx = rx + 18, cy = 170;
  for (const t of snap.tools.split('、')) {
    const tw = ctx.measureText(t).width + 16;
    if (cx + tw > rx + rw - 14) { cx = rx + 18; cy += 26; }
    ctx.fillStyle = '#e0e7ff';
    ctx.beginPath(); ctx.roundRect(cx, cy - 13, tw, 20, 9); ctx.fill();
    say(t, cx + 8, cy + 1, '#3730a3', '12px sans-serif');
    cx += tw + 8;
  }
}

export interface AgentInstance { update(args: AgentArgs): void }

export function createAgentDemo(canvas: HTMLCanvasElement, emit: (s: AgentSnapshot) => void): AgentInstance {
  let args: AgentArgs = { instructions: 'md', tools: 'dir' };
  let snap = buildAgentDir(args);
  const render = () => drawAgentDir(canvas, args, snap);
  render();
  emit(snap);
  return { update(next) { args = next; snap = buildAgentDir(args); render(); emit(snap); } };
}
