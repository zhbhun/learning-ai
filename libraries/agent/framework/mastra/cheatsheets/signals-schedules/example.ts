/**
 * 演示内容：信号投递时机——四种投递 API 在「空闲 / 运行中」线程下的落点（离线示意）。
 * 输入：agentState（线程当前状态）、delivery（sendMessage / queueMessage / sendSignal / sendNotificationSignal）。
 * 操作：在 Controls 中切换两个单选框，时间轴、事件落点与读数即时重排。
 * 预期结果：读数给出注入时机（唤醒开流 / 立即注入 / 排队等待 / 持久化 / 收件箱两阶段）。
 * 阅读主线：TIMING 决策表对应官方投递语义；draw() 只画时间轴，不触网、不运行真实 agent。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export type AgentState = 'idle' | 'active';
export type DeliveryKind = 'message' | 'queue' | 'signal' | 'notification';

export interface ExampleArgs { agentState: AgentState; delivery: DeliveryKind; }
export interface ExampleSnapshot { agentState: AgentState; delivery: DeliveryKind; timing: string; }
export interface ExampleInstance { update(args: ExampleArgs): void; dispose(): void; }

export const DELIVERY_LABEL: Record<DeliveryKind, string> = {
  message: 'sendMessage 消息',
  queue: 'queueMessage 排队消息',
  signal: 'sendSignal 信号',
  notification: 'sendNotificationSignal 通知',
};

/** 空闲 / 运行中两侧的落点：语义与官方文档一致，信号空闲侧取 ifIdle.persist 示例取值。 */
const TIMING: Record<DeliveryKind, Record<AgentState, { timing: string; note: string; color: string }>> = {
  message: {
    idle: { timing: '唤醒开流', note: '唤醒空闲线程，立即开启新流', color: '#16a34a' },
    active: { timing: '立即注入', note: '成为运行中循环的新输入', color: '#16a34a' },
  },
  queue: {
    idle: { timing: '唤醒开流', note: '空闲时与消息同样立即开始', color: '#16a34a' },
    active: { timing: '排队等待', note: '当前 run 结束后再开新 run，保持轮次顺序', color: '#f59e0b' },
  },
  signal: {
    idle: { timing: '持久化待下次', note: 'ifIdle.persist：随下一次运行注入', color: '#8b5cf6' },
    active: { timing: '注入当前循环', note: '以 XML 标签进入本轮输入', color: '#16a34a' },
  },
  notification: {
    idle: { timing: '收件箱两阶段', note: '先入库，dispatch 决定投递时机', color: '#f59e0b' },
    active: { timing: '收件箱两阶段', note: 'urgent 立即投递，其余等空闲或合并', color: '#f59e0b' },
  },
};

export function createExample(
  canvas: HTMLCanvasElement,
  emit: (snapshot: ExampleSnapshot) => void,
): ExampleInstance {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('当前浏览器不支持 Canvas 2D。');
  }
  const ctx: CanvasRenderingContext2D = context;
  let current: ExampleArgs = { agentState: 'active', delivery: 'message' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const rule = TIMING[current.delivery][current.agentState];
    const x0 = 64;
    const track = width - 128;
    const y = Math.round(height * 0.46);

    // 标题 + 时间轴（左端为「现在」）
    ctx.fillStyle = '#172033';
    ctx.font = '600 17px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`${DELIVERY_LABEL[current.delivery]} · 线程${current.agentState === 'active' ? '运行中' : '空闲'}`, 48, 48);
    ctx.strokeStyle = '#cbd5e1';
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + track, y); ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('现在', x0 - 6, y + 26);

    // 运行中：先有当前 run（蓝条），事件落点在其结束处；空闲：事件就在「现在」
    let eventX = x0;
    if (current.agentState === 'active') {
      const runW = Math.round(track * 0.42);
      eventX = x0 + runW;
      ctx.fillStyle = '#4f7cff'; ctx.fillRect(x0, y - 12, runW, 24);
      ctx.fillStyle = '#475569'; ctx.fillText('运行中的 run', x0, y - 22);
      if (current.delivery === 'queue') {
        ctx.fillStyle = '#fde68a'; ctx.fillRect(eventX + 28, y - 12, Math.round(track * 0.28), 24);
        ctx.fillStyle = '#92400e'; ctx.fillText('排队的新 run', eventX + 28, y - 22);
      }
    }

    // 事件落点：竖线 + 圆点，颜色随 TIMING 决策变化
    ctx.strokeStyle = rule.color;
    ctx.beginPath(); ctx.moveTo(eventX, y - 40); ctx.lineTo(eventX, y + 40); ctx.stroke();
    ctx.fillStyle = rule.color;
    ctx.beginPath(); ctx.arc(eventX, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`注入时机：${rule.timing}`, x0, y + 78);
    ctx.fillStyle = '#475569';
    ctx.font = '14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(rule.note, x0, y + 102);
    emit({ agentState: current.agentState, delivery: current.delivery, timing: rule.timing });
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(args) {
      current = args;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
