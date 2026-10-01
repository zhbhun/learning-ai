// 演示：Skills 技能包的发现与加载（离线模拟，不调用真实 LLM / 文件系统）。
// 输入与操作：在 Controls 切换「agent 级技能」（无 / 内联普通 / 内联同名）与「workspace 来源」
// （无 / 项目目录 / 全局目录 / 两者并存），模拟 Mastra 对 agent.skills 与 workspace skills 的合并解析。
// 预期：读数显示发现顺序、同名冲突生效者与注入工具；画布高亮生效来源、划掉被覆盖技能。

import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type AgentSkillArg = 'none' | 'inline-notes' | 'inline-conflict';
export type WorkspaceArg = 'none' | 'project' | 'global' | 'both';
export interface SkillsSnapshot { order: string; winner: string; tools: string }
interface Entry { name: string; text: string; source: string }
interface Row { text: string; state: 'win' | 'lost' | 'plain'; idx: number }

const AGENT: Record<Exclude<AgentSkillArg, 'none'>, Entry> = {
  'inline-notes': { name: 'release-notes', text: 'release-notes', source: 'agent 级内联' },
  'inline-conflict': { name: 'code-review', text: 'code-review', source: 'agent 级内联' },
};
const PROJECT: Entry[] = [
  { name: 'code-review', text: 'code-review', source: '项目 ./skills' },
  { name: 'db-migrate', text: 'db-migrate', source: '项目 ./skills' },
];
const GLOBAL: Entry[] = [
  { name: 'code-review', text: 'code-review', source: '全局 .mastra/skills' },
  { name: 'release-notes', text: 'release-notes', source: '全局 .mastra/skills' },
];

function pick(a: AgentSkillArg, w: WorkspaceArg): Entry[] {
  return [
    ...(a === 'none' ? [] : [AGENT[a]]),
    ...(w === 'project' || w === 'both' ? PROJECT : []),
    ...(w === 'global' || w === 'both' ? GLOBAL : []),
  ];
}

// 合并规则：agent 级与 workspace 级同名时 agent 级优先；workspace 同名按「本地项目 > .mastra/skills > node_modules」解析。
export function resolveSkills(a: AgentSkillArg, w: WorkspaceArg): SkillsSnapshot {
  const found = pick(a, w);
  const kept = found.filter((e, i) => found.findIndex((o) => o.name === e.name) === i);
  const dup = kept.find((k) => found.some((e, i) => e.name === k.name && i !== found.indexOf(k)));
  return {
    order: found.map((e, i) => `${i + 1}.${e.text}（${e.source}）`).join(' → ') || '未挂载任何技能',
    winner: dup ? `${dup.name} ← ${dup.source} 生效` : '无同名冲突',
    tools: found.length ? 'skill / skill_read / skill_search' : '不注入技能工具',
  };
}

export interface SkillsInstance {
  update(args: { agentSkill: AgentSkillArg; workspace: WorkspaceArg }): void;
  dispose(): void;
}

export function createExample(canvas: HTMLCanvasElement, emit: (s: SkillsSnapshot) => void): SkillsInstance {
  const ctx = canvas.getContext('2d')!;
  let args: { agentSkill: AgentSkillArg; workspace: WorkspaceArg } = { agentSkill: 'none', workspace: 'none' };
  const observer = createResizeObserver(canvas, draw);
  function rows(list: Entry[], offset: number, found: Entry[]): Row[] {
    if (!list.length) return [{ text: '（无）', state: 'plain', idx: 0 }];
    return list.map((e, i) => {
      const state = found.findIndex((o) => o.name === e.name) !== offset + i
        ? 'lost'
        : found.some((o, j) => j > offset + i && o.name === e.name) ? 'win' : 'plain';
      return { text: e.text, state, idx: offset + i + 1 };
    });
  }
  function box(x: number, y: number, w: number, h: number, title: string, items: Row[]): void {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#d5d5cd';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4c4c56';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(title, x + 12, y + 22);
    items.forEach((r, i) => {
      const ry = y + 46 + i * 26;
      const label = r.idx ? `${['①', '②', '③', '④', '⑤'][r.idx - 1] ?? r.idx} ${r.text}` : r.text;
      ctx.font = '13px system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = r.state === 'lost' ? '#b3b3ac' : r.state === 'win' ? '#1a7f4b' : '#33333c';
      ctx.fillText(label, x + 14, ry);
      if (r.state !== 'plain') {
        const tw = ctx.measureText(label).width;
        if (r.state === 'lost') { ctx.strokeStyle = '#c26060'; ctx.beginPath(); ctx.moveTo(x + 14, ry); ctx.lineTo(x + 14 + tw, ry); ctx.stroke(); }
        ctx.fillStyle = r.state === 'lost' ? '#c26060' : '#1a7f4b';
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText(r.state === 'lost' ? '被覆盖' : '★ 生效', x + 20 + tw, ry);
      }
      ctx.textBaseline = 'alphabetic';
    });
  }
  function draw(): void {
    const { width: W, height: H } = readCanvasSize(canvas);
    const snap = resolveSkills(args.agentSkill, args.workspace);
    const found = pick(args.agentSkill, args.workspace);
    const agentIn = args.agentSkill === 'none' ? [] : [AGENT[args.agentSkill]];
    const projIn = args.workspace === 'project' || args.workspace === 'both' ? PROJECT : [];
    const globIn = args.workspace === 'global' || args.workspace === 'both' ? GLOBAL : [];
    ctx.fillStyle = '#f6f6f3'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'left';
    const lw = Math.min(300, W * 0.44);
    const rx = lw + 60;
    const bh = (H - 56) / 3;
    box(16, 16, lw, bh, 'agent.skills（createSkill 内联）', rows(agentIn, 0, found));
    box(16, 28 + bh, lw, bh, '项目目录 ./skills', rows(projIn, agentIn.length, found));
    box(16, 40 + bh * 2, lw, bh, '全局目录 .mastra/skills', rows(globIn, agentIn.length + projIn.length, found));
    ctx.fillStyle = '#9a9a92';
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('➜', 16 + lw + 14, H / 2 + 8);
    const result: Row[] = found.flatMap((e, i) =>
      found.findIndex((o) => o.name === e.name) === i
        ? [{ text: e.text, idx: i + 1, state: found.some((o, j) => j > i && o.name === e.name) ? 'win' : 'plain' }]
        : []);
    box(rx, 16, W - rx - 16, H - 32, '合并生效（按发现顺序）',
      [...result, { text: `注入工具：${snap.tools}`, state: 'plain', idx: 0 }]);
    emit(snap);
  }
  return {
    update(next) { args = next; draw(); },
    dispose() { observer.disconnect(); },
  };
}
