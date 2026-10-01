import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createMultiTurnExample,
  type MultiTurnExampleInstance,
  type MultiTurnExampleSnapshot,
} from './example';

interface MultiTurnEvalArgs {
  turns: number;
  quality: number;
  threshold: number;
}

const renderInteractive = canvasStory({
  create: createMultiTurnExample,
  apply(instance: MultiTurnExampleInstance, args: MultiTurnEvalArgs) {
    instance.update(args);
  },
  readout(snapshot: MultiTurnExampleSnapshot) {
    return [
      ['对话轮数', snapshot.turns],
      ['目标轮得分', snapshot.quality],
      ['整体 verdict', snapshot.verdict],
    ];
  },
});

const meta = {
  id: 'evals-multi-turn',
  title: '8. 生产化/质量运营/多轮与会话评估',
  tags: ['!dev'],
  args: {
    turns: 3,
    quality: 0.8,
    threshold: 0.6,
  },
  argTypes: {
    turns: {
      name: '对话轮数',
      description: '数据集条目里的 inputs 数组长度，各轮顺序发到同一 thread。',
      control: {
        type: 'range',
        min: 1,
        max: 4,
        step: 1,
      },
    },
    quality: {
      name: '目标轮答案质量',
      description: '第 2 轮（目标轮）的模拟得分，低于 0.3 视为该轮 gate 失败。',
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
    },
    threshold: {
      name: '阈值 threshold',
      description: '逐轮 scorers 的判定阈值，得分未达记为「阈值未达」。',
      control: {
        type: 'range',
        min: 0,
        max: 1,
        step: 0.05,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<MultiTurnEvalArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
