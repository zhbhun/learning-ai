/**
 * 范例介绍：离线示意观察式记忆（OM）的三层结构——近期消息 / 观察日志 / 反思。
 * 输入：对话轮数（示意每轮新增约 9600 token，模拟带工具输出的长轮次）。
 * 操作：拖动「对话轮数」滑杆，回放压缩过程。
 * 预期结果：近期消息超过 messageTokens（30k）触发观察并回落到约 6k；
 *           观察日志超过 observationTokens（40k）触发反思并回落到 12k。
 * 阅读主线：三根条形读数 → 底部时间轴事件点 → 左下角三层 token 读数。
 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface LayersOptions { turns: number }
export interface LayerEvent { turn: number; kind: 'observation' | 'reflection' }
export interface LayersSnapshot {
  recent: number; observations: number; reflections: number;
  obsCount: number; reflCount: number; events: LayerEvent[];
}
export interface LayersInstance {
  update(options: LayersOptions): void;
  dispose(): void;
}

const MESSAGE_TOKENS = 30000; // observation.messageTokens 默认值
const OBSERVATION_TOKENS = 40000; // reflection.observationTokens 默认值
const KEEP_AFTER_OBSERVE = 6000; // bufferActivation 0.8 → 触发后保留约 20% 阈值
const TURN_TOKENS = 9600; // 每轮新增消息 token（示意：带工具输出的长轮次）
const OBSERVE_RATIO = 1 / 5; // Observer 压缩比（示意，官方为 5x–40x）
const REFLECT_RATIO = 1 / 3; // Reflector 对观察日志的整体压缩比（示意）
const MAX_TURNS = 40;

// 离线模拟：确定性回放 Observer / Reflector 的触发与压缩，不调用模型或网络。
function simulate(turns: number): LayersSnapshot {
  let recent = 0, observations = 0, reflections = 0, obsCount = 0, reflCount = 0;
  const events: LayerEvent[] = [];
  for (let turn = 1; turn <= Math.min(turns, MAX_TURNS); turn += 1) {
    recent += TURN_TOKENS;
    if (recent > MESSAGE_TOKENS) {
      // Observer：把超出阈值的旧历史压缩为带时间戳的观察条目
      observations += Math.round((recent - KEEP_AFTER_OBSERVE) * OBSERVE_RATIO);
      recent = KEEP_AFTER_OBSERVE;
      obsCount += 1; events.push({ turn, kind: 'observation' });
    }
    if (observations > OBSERVATION_TOKENS) {
      // Reflector：整体重写观察日志，旧信息压缩进反思层（示意保留 12k 近期细节）
      reflections += Math.round((observations - KEEP_AFTER_OBSERVE * 2) * REFLECT_RATIO);
      observations = KEEP_AFTER_OBSERVE * 2;
      reflCount += 1; events.push({ turn, kind: 'reflection' });
    }
  }
  return { recent, observations, reflections, obsCount, reflCount, events };
}

export function createLayers(
  canvas: HTMLCanvasElement,
  emit: (snapshot: LayersSnapshot) => void,
): LayersInstance {
  const ctx = canvas.getContext('2d')!;
  if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D。');
  let current: LayersOptions = { turns: 26 };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(360, size.width);
    const height = Math.max(280, size.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const snap = simulate(current.turns);
    const x0 = 118, x1 = width - 96, track = x1 - x0, ty = height - 46;
    ctx.fillStyle = '#172033';
    ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('三层记忆构成：消息历史压缩为观察，观察再压缩为反思', 24, 34);
    const rows = [
      { label: '近期消息', value: snap.recent, max: MESSAGE_TOKENS, color: '#4f7cff', note: '阈值 30k' },
      { label: '观察日志', value: snap.observations, max: OBSERVATION_TOKENS, color: '#18a05e', note: '阈值 40k' },
      { label: '反思', value: snap.reflections, max: 24000, color: '#e8890c', note: '示意比例' },
    ];
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i], y = 58 + i * 46;
      ctx.fillStyle = '#334155';
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(row.label, 24, y + 18);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(x0, y, track, 24);
      ctx.fillStyle = row.color;
      ctx.fillRect(x0, y, Math.min(track, (row.value / row.max) * track), 24);
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`${(row.value / 1000).toFixed(1)}k`, x1 + 8, y + 17);
      ctx.fillText(row.note, x0, y - 6);
    }
    // 底部时间轴：蓝点为观察触发轮次，橙菱形为反思触发轮次
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x0, ty, track, 2);
    for (const event of snap.events) {
      const px = x0 + (event.turn / MAX_TURNS) * track;
      ctx.fillStyle = event.kind === 'observation' ? '#4f7cff' : '#e8890c';
      ctx.beginPath();
      if (event.kind === 'observation') ctx.arc(px, ty + 1, 4, 0, Math.PI * 2);
      else { ctx.moveTo(px, ty - 5); ctx.lineTo(px + 5, ty + 1); ctx.lineTo(px, ty + 7); ctx.lineTo(px - 5, ty + 1); }
      ctx.fill();
    }
    ctx.fillStyle = '#64748b';
    ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(`● 观察 ◆ 反思 · 当前第 ${current.turns} 轮`, 24, ty + 24);

    emit(snap);
  }

  const resizeObserver = createResizeObserver(canvas, draw);

  return {
    update(options) {
      current = options;
      draw();
    },
    dispose() {
      resizeObserver.disconnect();
    },
  };
}
