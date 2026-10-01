/**
 * 范例介绍：离线绘制 Studio Editor 的「草稿 → 发布」版本流。
 * 输入：版本操作（draft / publish / rollback）+ prompt block 是否有待发布修改。
 * 操作：切换 Controls，观察 agent 行的生效版本徽章与底部「受影响 agent 数」读数。
 * 预期：草稿只改预览不动线上；发布让草稿上线并波及 block 引用方；回滚只生成新草稿。
 * 离线示意：不连接数据库、不发起网络请求、不调用真实 LLM。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface EditorArgs {
  operation: 'draft' | 'publish' | 'rollback';
  blockUpdate: boolean;
}

export interface EditorSnapshot {
  operation: string;
  blockState: string;
  support: string;
  faq: string;
  billing: string;
  affected: number;
}

export interface EditorInstance {
  update(args: EditorArgs): void;
  dispose?(): void;
}

const AGENTS = [
  { name: 'support-agent', usesBlock: true, hasDraft: true },
  { name: 'faq-agent', usesBlock: true, hasDraft: false },
  { name: 'billing-agent', usesBlock: false, hasDraft: false },
];

/** 版本判定：编辑草稿不动线上；发布让草稿与 block 生效；回滚只是生成新草稿。 */
function resolve(args: EditorArgs): EditorSnapshot {
  const published = args.operation === 'publish';
  const blockLive = published && args.blockUpdate;
  const versionOf = (a: (typeof AGENTS)[number]) =>
    !published ? 'v1 已发布' : a.hasDraft ? 'v2 已发布' : a.usesBlock && blockLive ? 'v2 block 同步' : 'v1 已发布';
  const operation =
    args.operation === 'draft' ? '编辑草稿' : args.operation === 'publish' ? '发布' : '回滚旧版';
  const blockState = args.operation === 'rollback'
    ? '已发布 v1 · 回滚生成新草稿 v3'
    : !args.blockUpdate ? '已发布 v1 · 无待发布修改'
    : published ? '已发布 v2 · 已同步所有引用方' : '草稿 v2 · 仅预览生效';
  return {
    operation, blockState,
    support: versionOf(AGENTS[0]), faq: versionOf(AGENTS[1]), billing: versionOf(AGENTS[2]),
    affected: published ? 1 + (blockLive ? 1 : 0) : 0,
  };
}

export function createEditorSim(canvas: HTMLCanvasElement, emit: (s: EditorSnapshot) => void): EditorInstance {
  const ctx = canvas.getContext('2d')!;
  let snapshot = resolve({ operation: 'draft', blockUpdate: false });

  function box(x: number, y: number, w: number, h: number, fill: string) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.stroke();
  }

  function chip(x: number, y: number, text: string, live: boolean) {
    ctx.beginPath();
    ctx.roundRect(x, y, 132, 26, 13);
    ctx.fillStyle = live ? '#dcfce7' : '#f1f5f9';
    ctx.fill();
    ctx.strokeStyle = live ? '#16a34a' : '#cbd5e1';
    ctx.stroke();
    ctx.fillStyle = live ? '#166534' : '#475569';
    ctx.font = `600 12px sans-serif`;
    ctx.fillText(text, x + 10, y + 17);
  }

  function draw() {
    const width = Math.max(640, readCanvasSize(canvas).width);
    const height = 300;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // prompt block 面板：状态随操作切换
    box(24, 18, width - 48, 58, '#f8fafc');
    ctx.fillStyle = '#172033';
    ctx.font = '600 14px sans-serif';
    ctx.fillText('prompt block「退货政策」', 40, 44);
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.fillText(snapshot.blockState, 40, 64);

    // agent 行：生效版本徽章
    const versions = [snapshot.support, snapshot.faq, snapshot.billing];
    AGENTS.forEach((a, i) => {
      const y = 90 + i * 56;
      box(24, y, width - 48, 46, '#ffffff');
      ctx.fillStyle = '#172033';
      ctx.font = '600 13px sans-serif';
      ctx.fillText(a.name, 40, y + 20);
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.fillText(
        a.usesBlock ? '引用 prompt block · id/name/model 由代码锁定' : '仅代码 instructions · 无 override',
        40, y + 37,
      );
      chip(width - 168, y + 10, versions[i], versions[i].startsWith('v2'));
    });

    ctx.fillStyle = snapshot.affected > 0 ? '#166534' : '#64748b';
    ctx.font = '600 13px sans-serif';
    ctx.fillText(`「${snapshot.operation}」影响 ${snapshot.affected} 个 agent 的线上版本`, 24, height - 14);
    emit(snapshot);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(args) {
      snapshot = resolve(args);
      draw();
    },
    dispose: () => resizeObserver.disconnect(),
  };
}
