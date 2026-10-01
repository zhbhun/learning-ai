import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './signals-example.ts?raw';
import { createSignalsCanvas, type SignalsInstance, type SignalsSnapshot } from './signals-example';

interface SignalsArgs {
  signal: 'log' | 'metric' | 'feedback';
  drill: boolean;
}

const render = canvasStory({
  create: createSignalsCanvas,
  apply(instance: SignalsInstance, args: SignalsArgs) {
    instance.update(args);
  },
  readout(snapshot: SignalsSnapshot) {
    return [
      ['当前信号', snapshot.name],
      ['查询方式', snapshot.query],
      ['存储要求', snapshot.storage],
      ['定位路径', snapshot.path],
    ];
  },
});

const meta = {
  id: 'logging-metrics',
  title: '8. 生产化/可观测性/日志、指标与反馈',
  tags: ['!dev'],
  args: {
    signal: 'log',
    drill: false,
  },
  argTypes: {
    signal: {
      name: '当前信号',
      description: '切换要查看的信号通路。',
      control: {
        type: 'radio',
        labels: {
          log: '结构化日志',
          metric: 'Span 指标',
          feedback: '人工反馈',
        },
      },
      options: ['log', 'metric', 'feedback'],
    },
    drill: {
      name: '按 trace 下钻',
      description: '打开后画出当前信号与 trace 条的关联线。',
      control: { type: 'boolean' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<SignalsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
