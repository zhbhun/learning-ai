// 演示：Channels 消息入站出站流（离线示意，不发真实网络请求）
// 输入：平台 adapter（Slack/Teams/Discord/Telegram）、消息类型（普通 / 工具审批）、是否拉取线程上下文
// 操作：切换 Controls，观察管线各阶段文案、webhook 路由横幅与读数
// 预期结果：平台决定 adapter 工厂与 webhook 路由；审批请求回复交互卡片；线程上下文最多 10 条
// 阅读主线：simulateChannel() 组装快照 → createExample() 把快照画成入站出站管线

import { readCanvasSize, createResizeObserver } from '../../assets/canvas-runtime.js';

export type Platform = 'slack' | 'teams' | 'discord' | 'telegram';
export type MessageType = 'plain' | 'approval';

export interface ChannelStage {
  name: string;
  detail: string;
}

export interface ChannelSnapshot {
  platform: Platform;
  messageType: MessageType;
  adapterFactory: string;
  webhookRoute: string;
  contextMessages: number;
  replyForm: string;
  stages: ChannelStage[];
}

const PLATFORMS: Record<Platform, { label: string; factory: string }> = {
  slack: { label: 'Slack', factory: 'createSlackAdapter()' },
  teams: { label: 'Teams', factory: 'createTeamsAdapter()' },
  discord: { label: 'Discord', factory: 'createDiscordAdapter()' },
  telegram: { label: 'Telegram', factory: 'createTelegramAdapter()' },
};

// 核心模拟：webhook 先回 200、后台处理并按事件 ID 去重；线程首条 @ 拉取最近 10 条上下文
export function simulateChannel(
  platform: Platform,
  messageType: MessageType,
  withThreadContext: boolean,
): ChannelSnapshot {
  const p = PLATFORMS[platform];
  const stages: ChannelStage[] = [
    { name: '1 平台事件', detail: `${p.label} 推送 webhook 事件` },
    { name: '2 路由匹配', detail: '先返回 200，后台处理，存储按事件 ID 去重' },
    { name: '3 adapter 解析', detail: `${p.factory} 解析消息与发送者` },
    {
      name: '4 线程上下文',
      detail: withThreadContext ? '首条 @ 拉取最近 10 条消息' : '无历史上下文，直接进入 agent',
    },
    messageType === 'approval'
      ? { name: '5 回复', detail: 'requireToolApproval 渲染交互卡片（批准 / 拒绝）' }
      : { name: '5 回复', detail: 'markdown 回复，平台不支持则降级纯文本' },
  ];
  return {
    platform,
    messageType,
    adapterFactory: p.factory,
    webhookRoute: `/api/agents/assistant/channels/${platform}/webhook`,
    contextMessages: withThreadContext ? 10 : 0,
    replyForm: messageType === 'approval' ? '交互卡片' : 'markdown / 纯文本',
    stages,
  };
}

export interface ChannelsArgs {
  platform: Platform;
  messageType: MessageType;
  withThreadContext: boolean;
}

export function createExample(canvas: HTMLCanvasElement, emit: (s: ChannelSnapshot) => void) {
  const ctx = canvas.getContext('2d')!;

  function draw(snapshot: ChannelSnapshot) {
    const { width, height } = readCanvasSize(canvas);
    ctx.clearRect(0, 0, width, height);
    // 五个管线阶段纵向排列：平台事件在最上，回复在最下
    const rowH = Math.min(58, (height - 34) / snapshot.stages.length);
    snapshot.stages.forEach((stage, i) => {
      const y = 14 + i * rowH;
      const accent = stage.name.startsWith('5') ? '#2563eb' : '#16a34a';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(16, y, width - 32, rowH - 12);
      ctx.fillStyle = accent;
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(stage.name, 28, y + 19);
      ctx.fillStyle = '#334155';
      ctx.font = '12px sans-serif';
      ctx.fillText(stage.detail, 132, y + 19, width - 160);
    });
    // 底部横幅：挂 adapter 后自动注册的 webhook 路由，平台段随控件变化
    ctx.fillStyle = '#0f172a';
    ctx.font = '12px monospace';
    ctx.fillText(`POST ${snapshot.webhookRoute}`, 16, height - 8, width - 32);
  }

  let snapshot = simulateChannel('slack', 'plain', true);
  const observer = createResizeObserver(canvas, () => draw(snapshot));

  return {
    update(args: ChannelsArgs) {
      snapshot = simulateChannel(args.platform, args.messageType, args.withThreadContext);
      emit(snapshot);
      draw(snapshot);
    },
    dispose() {
      observer.disconnect();
    },
  };
}
