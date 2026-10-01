import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './chain-run.ts?raw';
import {
  createChainRun,
  type ChainRunArgs,
  type ChainRunInstance,
  type ChainRunSnapshot,
} from './chain-run';

interface WorkflowBasicsArgs {
  message: string;
  factor: number;
  failAnalyze: boolean;
}

const render = canvasStory({
  create: createChainRun,
  apply(instance: ChainRunInstance, args: ChainRunArgs) {
    instance.update(args);
  },
  readout(snapshot: ChainRunSnapshot) {
    return [
      ['run.status', snapshot.status],
      ['format-message 输出', snapshot.formatted],
      ['analyze 输出', snapshot.analyze],
      ['最终 result', snapshot.result],
    ];
  },
});

const meta = {
  id: 'workflow-basics',
  title: '3. 工作流/编排基础/工作流基础',
  tags: ['!dev'],
  args: {
    message: 'hello workflow',
    factor: 2.5,
    failAnalyze: false,
  },
  argTypes: {
    message: {
      name: '初始输入 message',
      description: 'run.start({ inputData }) 传入工作流的初始输入。',
      control: { type: 'text' },
    },
    factor: {
      name: '.map() 系数 factor',
      description: '步骤间映射把 step-1 输出长度乘以该系数，得到 step-3 的 strength。',
      control: { type: 'range', min: 1, max: 5, step: 0.5 },
    },
    failAnalyze: {
      name: 'analyze 步骤抛错',
      description: '模拟第二步 execute 抛异常，观察链条终止与 result.status = failed。',
      control: { type: 'boolean' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<WorkflowBasicsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
