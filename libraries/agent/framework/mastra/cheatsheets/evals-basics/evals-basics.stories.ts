import type { Meta, StoryObj } from '@storybook/html-vite';
import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './evals-basics-example.ts?raw';
import {
  createEvalsExample,
  type EvalsArgs,
  type EvalsSnapshot,
} from './evals-basics-example';

const renderInteractive = canvasStory({
  create: createEvalsExample,
  apply(instance: ReturnType<typeof createEvalsExample>, args: EvalsArgs) {
    instance.update(args);
  },
  readout(snapshot: EvalsSnapshot) {
    return [
      ['流水线', snapshot.kind],
      ['得分', snapshot.score.toFixed(2)],
      ['judge 调用', `${snapshot.judgeCalls} 次`],
      ['理由', snapshot.reasonSource],
    ];
  },
  captions: ['离线示意 · 不调用真实 judge 模型', '分数落库 mastra_scorers（示意）'],
});

const meta = {
  id: 'evals-basics',
  title: '8. 生产化/质量运营/评估基础与 Scorer',
  tags: ['!dev'],
  args: {
    kind: 'builtin',
    preprocess: true,
    analyze: true,
    reason: true,
  },
  argTypes: {
    kind: {
      name: '流水线类型',
      description: '内置 answer-relevancy / 自定义 quote-sources',
      options: ['builtin', 'custom'],
      control: {
        type: 'radio',
        labels: { builtin: '内置 answer-relevancy', custom: '自定义 quote-sources' },
      },
    },
    preprocess: {
      name: 'preprocess 步骤',
      description: '关闭后输入未清洗，内置流水线得分下降',
      control: { type: 'boolean' },
    },
    analyze: {
      name: 'analyze 步骤',
      description: '关闭后自定义 generateScore 退回函数启发式',
      control: { type: 'boolean' },
    },
    reason: {
      name: 'generateReason 步骤',
      description: '关闭后只出分，理由读数变为未生成',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<EvalsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
