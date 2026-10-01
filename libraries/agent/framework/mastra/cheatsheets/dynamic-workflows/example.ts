// 演示：动态工作流 = JSON 定义 → 校验注册 → 按步骤图执行（离线示意，不调用真实 LLM / 存储）
// 输入：radio「JSON 定义」切换两个预置定义；number「运行输入 amount」
// 操作：切换定义触发重新注册并按新图执行；amount 决定 condition 条目的分支走向
// 预期：画布按定义渲染节点图并模拟执行；读数显示定义 id、注册结果、执行序列与状态
// 阅读主线：DEFS（JSON 定义）→ register → 执行循环走图 → emit 读数

import { createRenderLoop, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface DemoArgs { definition: 'chain' | 'branch'; amount: number; }
export interface DemoNode { id: string; kind: 'tool' | 'agent' | 'condition'; ref: string; next: string[]; }
export interface DemoDefinition { id: string; description: string; graph: DemoNode[]; }
export interface DemoSnapshot { workflowId: string; registered: string; steps: string; status: string; }
export interface DemoInstance { update: (args: DemoArgs) => void; dispose?: () => void; }

// 两个预置 JSON 定义：字段结构对齐官方（id/description/graph），真实定义另有 inputSchema/outputSchema（JSON Schema）
const DEFS: Record<DemoArgs['definition'], DemoDefinition> = {
  chain: { id: 'greeting-pipeline', description: 'tool → tool → agent 顺序链', graph: [
    { id: 'greet', kind: 'tool', ref: 'create-greeting', next: ['format'] },
    { id: 'format', kind: 'tool', ref: 'format-message', next: ['review'] },
    { id: 'review', kind: 'agent', ref: 'copywriter', next: [] },
  ] },
  branch: { id: 'support-router', description: 'condition 按输入分流', graph: [
    { id: 'classify', kind: 'tool', ref: 'classify-ticket', next: ['route'] },
    { id: 'route', kind: 'condition', ref: 'amount >= 100', next: ['vip', 'standard'] },
    { id: 'vip', kind: 'agent', ref: 'senior-support', next: [] },
    { id: 'standard', kind: 'agent', ref: 'support-agent', next: [] },
  ] },
};

const KIND_COLOR: Record<DemoNode['kind'], string> = { tool: '#2563eb', agent: '#7c3aed', condition: '#d97706' };

// 相对坐标布局（示意）：branch 用三列呈现分流走向
const LAYOUT: Record<DemoArgs['definition'], Record<string, [number, number]>> = {
  chain: { greet: [0.3, 0.2], format: [0.3, 0.5], review: [0.3, 0.8] },
  branch: { classify: [0.22, 0.18], route: [0.5, 0.5], vip: [0.78, 0.25], standard: [0.78, 0.78] },
};

export function createDemo(canvas: HTMLCanvasElement, emit: (snapshot: DemoSnapshot) => void): DemoInstance {
  const ctx = canvas.getContext('2d')!;
  let key: DemoArgs['definition'] = 'chain';
  let def = DEFS.chain;
  let amount = 100;
  let current = ''; // 当前执行到的条目 id
  let steps: string[] = []; // 已执行条目序列
  let doneStep = -1; // 完成时的步数，-1 表示未完成
  let step = 0;
  let acc = 0;

  function snapshot() {
    emit({
      workflowId: def.id, registered: '已注册', steps: steps.join(' → ') || '待执行',
      status: doneStep >= 0 ? 'success' : current ? 'running' : 'idle',
    });
  }

  function advance() { // 从 graph[0] 起沿 next 走；condition 条目按 amount 选 next[0] / next[1]
    if (doneStep >= 0 && step - doneStep > 3) { current = ''; steps = []; doneStep = -1; }
    if (doneStep >= 0) return;
    if (!current) current = def.graph[0].id;
    else {
      const node = def.graph.find((n) => n.id === current)!;
      const nid = node.kind === 'condition' ? node.next[amount >= 100 ? 0 : 1] : node.next[0];
      if (!nid) { doneStep = step; snapshot(); return; }
      current = nid;
    }
    steps.push(current);
    snapshot();
  }

  function draw() {
    const size = readCanvasSize(canvas);
    const xy = (id: string) => { const f = LAYOUT[key][id]; return { x: f[0] * size.width, y: f[1] * size.height }; };
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, size.width, size.height);
    ctx.fillStyle = '#0f172a'; ctx.font = '600 14px sans-serif';
    ctx.fillText('id: ' + def.id + ' — ' + def.description, 20, 26);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    for (const node of def.graph) for (const nid of node.next) { // 边
      const a = xy(node.id); const b = xy(nid);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.textAlign = 'center';
    for (const node of def.graph) { // 节点：高亮当前正在执行的条目
      const p = xy(node.id);
      ctx.fillStyle = KIND_COLOR[node.kind];
      ctx.fillRect(p.x - 55, p.y - 22, 110, 44);
      if (node.id === current) { ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 3; ctx.strokeRect(p.x - 55, p.y - 22, 110, 44); }
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 13px sans-serif'; ctx.fillText(node.kind + ': ' + node.id, p.x, p.y - 2);
      ctx.font = '11px sans-serif'; ctx.fillText(node.ref, p.x, p.y + 15);
    }
    ctx.textAlign = 'left';
  }

  function load(args: DemoArgs) { // 切换定义 / 修改输入：重新注册并重跑
    key = args.definition;
    def = DEFS[key];
    amount = args.amount;
    current = ''; steps = []; doneStep = -1; step = 0; acc = 0;
    snapshot();
  }

  load({ definition: 'chain', amount: 100 });
  const loop = createRenderLoop(canvas, (delta: number) => {
    acc += delta;
    if (acc > 0.8) { acc = 0; step += 1; advance(); }
    draw();
  }) as unknown as { dispose?: () => void } | undefined;
  return { update: load, dispose: () => { loop?.dispose?.(); } };
}
