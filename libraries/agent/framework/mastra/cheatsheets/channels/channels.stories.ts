import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ChannelsArgs,
  type ChannelSnapshot,
} from './example';

type ChannelsInstance = ReturnType<typeof createExample>;

const render = canvasStory({
  create: createExample,
  apply(instance: ChannelsInstance, args: ChannelsArgs) {
    instance.update(args);
  },
  readout(snapshot: ChannelSnapshot) {
    return [
      ['Webhook 路由', snapshot.webhookRoute],
      ['adapter 工厂', snapshot.adapterFactory],
      ['上下文条数', snapshot.contextMessages],
      ['回复形态', snapshot.replyForm],
    ];
  },
});

const meta = {
  id: 'channels',
  title: '6. 扩展能力/对外通道/Channels 消息渠道',
  tags: ['!dev'],
  args: {
    platform: 'slack',
    messageType: 'plain',
    withThreadContext: true,
  } satisfies ChannelsArgs,
  argTypes: {
    platform: {
      name: '平台 adapter',
      description: '选择消息平台，决定 adapter 工厂与 webhook 路由。',
      options: ['slack', 'teams', 'discord', 'telegram'],
      control: {
        type: 'radio',
        labels: {
          slack: 'Slack',
          teams: 'Teams',
          discord: 'Discord',
          telegram: 'Telegram',
        },
      },
    },
    messageType: {
      name: '消息类型',
      description: '普通消息回复 markdown，工具审批渲染为交互卡片。',
      options: ['plain', 'approval'],
      control: {
        type: 'radio',
        labels: { plain: '普通消息', approval: '工具审批请求' },
      },
    },
    withThreadContext: {
      name: '拉取线程上下文',
      description: '线程首条 @ 时自动拉取最近 10 条历史。',
      control: { type: 'boolean' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<ChannelsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
