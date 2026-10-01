/** 范例介绍：Mastra 语音链路离线示意——分体链路（STT→LLM→TTS）与实时 STS 两种接法。
 * 输入：mode 接法、stt / tts 两个 provider 控件（纯示意，无真实音频或网络请求）。
 * 操作：切换控件，观察链路节点、组合标题与各环节示意延迟的变化。
 * 预期结果：分体模式显示 listen / generate / speak 三段构成；实时模式显示 connect + send + on 两段。
 * 阅读主线：方法族不变，换 provider 只换构造；延迟为教学示意，非官方实测。 */
import { createResizeObserver, readCanvasSize } from '../../assets/canvas-runtime.js';

export interface VoiceChainOptions {
  mode: 'chain' | 'realtime';
  stt: 'openai' | 'deepgram' | 'gladia';
  tts: 'elevenlabs' | 'deepgram' | 'openai';
}

export interface StageSnapshot {
  name: string;
  detail: string;
  latency: string;
  weight: number; // 示意延迟权重，仅决定条形长度
}

export interface VoiceChainSnapshot {
  title: string;
  stages: StageSnapshot[];
  total: string;
}

export interface VoiceChainInstance {
  update(options: VoiceChainOptions): void;
  dispose(): void;
}

// 模型名与默认值来自官方文档；latency 区间与 weight 为教学示意（非实测）。
const STT_META: Record<VoiceChainOptions['stt'], StageSnapshot> = {
  openai: { name: 'voice.listen()', detail: 'OpenAI · whisper-1', latency: '0.3–0.8s', weight: 0.55 },
  deepgram: { name: 'voice.listen()', detail: 'Deepgram · nova', latency: '0.2–0.5s', weight: 0.35 },
  gladia: { name: 'voice.listen()', detail: 'Gladia（仅 STT）', latency: '0.4–0.9s', weight: 0.65 },
};
const TTS_META: Record<VoiceChainOptions['tts'], StageSnapshot> = {
  elevenlabs: { name: 'voice.speak()', detail: 'ElevenLabs · eleven_multilingual_v2', latency: '0.3–0.7s', weight: 0.5 },
  deepgram: { name: 'voice.speak()', detail: 'Deepgram · aura', latency: '0.2–0.4s', weight: 0.3 },
  openai: { name: 'voice.speak()', detail: 'OpenAI · alloy', latency: '0.3–0.6s', weight: 0.45 },
};
const LLM_STAGE: StageSnapshot = { name: 'agent.generate()', detail: 'LLM · openai/gpt-4o', latency: '0.5–1.5s', weight: 1 };
const REALTIME_STAGES: StageSnapshot[] = [
  { name: 'voice.connect() + send()', detail: '麦克风上行流（Gemini Live / Nova Sonic / xAI 等需先 connect）', latency: '持续流', weight: 0.2 },
  { name: "on('speaker') / on('writing')", detail: '实时模型回传音频与双方转写', latency: '亚秒级', weight: 0.4 },
];

export function createVoiceChain(canvas: HTMLCanvasElement, emit: (snapshot: VoiceChainSnapshot) => void): VoiceChainInstance {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持 Canvas 2D。');
  const ctx: CanvasRenderingContext2D = context;
  let current: VoiceChainOptions = { mode: 'chain', stt: 'deepgram', tts: 'elevenlabs' };

  function draw() {
    const size = readCanvasSize(canvas);
    const width = Math.max(320, size.width);
    const height = Math.max(240, size.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const chain = current.mode === 'chain';
    const stages = chain ? [STT_META[current.stt], LLM_STAGE, TTS_META[current.tts]] : REALTIME_STAGES;
    const allDeepgram = current.stt === 'deepgram' && current.tts === 'deepgram';
    const title = chain
      ? allDeepgram
        ? '同一 provider 全包：new DeepgramVoice() 一个实例即可'
        : '跨 provider 组合：new CompositeVoice({ input, output })'
      : '实时 STS：先 connect()，send 麦克风流，on 收音频与转写';

    ctx.fillStyle = '#172033';
    ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(title, 24, 34, width - 48);

    const gap = 30;
    const boxW = (width - 48 - gap * (stages.length - 1)) / stages.length;
    stages.forEach((stage, index) => {
      const x = 24 + index * (boxW + gap);
      const y = 56;
      ctx.fillStyle = '#eef2ff';
      ctx.fillRect(x, y, boxW, 96);
      ctx.strokeStyle = '#6366f1';
      ctx.strokeRect(x, y, boxW, 96);
      ctx.fillStyle = '#312e81';
      ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(stage.name, x + 10, y + 24, boxW - 20);
      ctx.fillStyle = '#475569';
      ctx.font = '12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText(stage.detail, x + 10, y + 46, boxW - 20);
      ctx.fillStyle = '#c7d2fe';
      ctx.fillRect(x + 10, y + 60, (boxW - 20) * Math.min(1, stage.weight), 8); // 示意延迟条
      ctx.fillStyle = '#4338ca';
      ctx.fillText(`示意延迟 ${stage.latency}`, x + 10, y + 88, boxW - 20);
      if (index < stages.length - 1) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px ui-sans-serif, system-ui, sans-serif';
        ctx.fillText('→', x + boxW + 6, y + 52);
      }
    });

    const total = chain
      ? `分段等待合计约 ${stages.reduce((sum, s) => sum + s.weight, 0).toFixed(1)}s（示意）`
      : '无分段等待：亚秒级往返（示意）';
    emit({ title, stages, total });
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
