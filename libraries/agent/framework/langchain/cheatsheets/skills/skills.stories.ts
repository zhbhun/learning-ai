import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleOptions,
  type ExampleSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleOptions) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['加载策略', snapshot.strategyLabel],
      ['常驻 token', snapshot.residentTokens],
      ['按需 token', snapshot.onDemandTokens],
      ['合计 token', snapshot.totalTokens],
    ];
  },
});

const meta = {
  id: 'skills',
  title: '多智能体与 Deep Agents/多智能体/技能',
  tags: ['!dev'],
  args: {
    strategy: 'progressive',
    taskType: 'sales',
  },
  argTypes: {
    strategy: {
      name: '加载策略',
      description:
        '渐进式披露：常驻只有技能元数据，任务命中才加载正文与附属文件；全量塞系统提示：所有技能正文常驻，任何任务都全额支付。',
      control: {
        type: 'inline-radio',
        options: ['progressive', 'allInPrompt'],
      },
      labels: {
        progressive: '渐进式披露',
        allInPrompt: '全量塞系统提示',
      },
    },
    taskType: {
      name: '任务',
      description:
        '闲聊问候不触发技能；查销售额命中 sales-analytics 正文；重订货清单还要读正文引用的 references 文件；年终盘点同时命中两个技能的正文。',
      control: {
        type: 'inline-radio',
        options: ['chitchat', 'sales', 'reorder', 'review'],
      },
      labels: {
        chitchat: '闲聊问候',
        sales: '查销售额',
        reorder: '重订货清单',
        review: '年终盘点',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
