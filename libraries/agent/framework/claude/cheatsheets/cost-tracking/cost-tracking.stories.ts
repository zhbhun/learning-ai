import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './cost-tracking-demo.ts?raw';
import {
  createCostTrackingDemo,
  type DemoInstance,
  type DemoSnapshot,
} from './cost-tracking-demo';

interface DemoArgs {
  resultIndex: number;
  subagent: number;
}

const renderInteractive = canvasStory({
  create: createCostTrackingDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['读取的 result', snapshot.resultLabel],
      ['usage · output_tokens(主循环 · 本轮输入)', snapshot.usageOutputTokens],
      ['modelUsage · costUSD 合计(全链路 · 累计)', `$${snapshot.modelUsageCostTotal.toFixed(4)}`],
      ['total_cost_usd(估算 · 累计)', `$${snapshot.totalCostUsd.toFixed(4)}`],
    ];
  },
});

const meta = {
  id: 'cost-tracking',
  title: '生产化/可观测与成本/成本与用量',
  tags: ['!dev'],
  args: {
    resultIndex: 1,
    subagent: 1,
  },
  argTypes: {
    resultIndex: {
      name: '读取的 result',
      description:
        '回放流式输入会话的第几条 result(1 = 第 1 轮输入结束,2 = 第 2 轮输入结束)。',
      control: {
        type: 'range',
        min: 1,
        max: 2,
        step: 1,
      },
    },
    subagent: {
      name: '子代理调用',
      description: '第 1 轮输入是否派出一个子代理(观察 usage 与 modelUsage 的口径差)。',
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
