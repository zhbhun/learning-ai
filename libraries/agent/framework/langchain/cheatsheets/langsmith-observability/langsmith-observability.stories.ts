import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const renderTraceTriage = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['排查入口', snapshot.entry],
      ['定位 run', snapshot.targetName],
      ['trace 总耗时', `${(snapshot.totalMs / 1000).toFixed(1)}s`],
      ['trace 总 token', snapshot.totalTokens.toLocaleString('en-US')],
      ['trace 总成本', `$${snapshot.totalCostUsd.toFixed(4)}`],
    ];
  },
});

const meta = {
  id: 'langsmith-observability',
  title: '观测、测试与部署/LangSmith 追踪',
  tags: ['!dev'],
  args: {
    entry: 'latency',
  },
  argTypes: {
    entry: {
      name: '排查入口',
      description:
        '同一条 trace 的三个排查入口：慢=按 start→end 区间找耗时最长的 run；贵=按 token 与成本找最贵的模型 run；错=找 status=error 的 run 读 error 字段。',
      control: {
        type: 'inline-radio',
        labels: {
          latency: '慢（延迟）',
          cost: '贵（成本）',
          error: '错（错误）',
        } as Record<string, string>,
      },
    },
  },
  render: renderTraceTriage,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TraceTriage: Story = {};
