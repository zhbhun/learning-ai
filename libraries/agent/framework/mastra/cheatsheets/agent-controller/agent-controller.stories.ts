import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createExample, type ExampleInstance, type ExampleSnapshot } from './example';

interface AgentControllerArgs {
  maxRuns: number;
  passRate: number;
}

const render = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: AgentControllerArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['轮次', `${snapshot.round}/${snapshot.maxRuns}`],
      ['状态', snapshot.status],
      ['剩余预算', `${snapshot.budgetLeft} 轮`],
    ];
  },
});

const meta = {
  id: 'agent-controller',
  title: '7. 长时运行/目标与 Agent Controller',
  tags: ['!dev'],
  args: {
    maxRuns: 3,
    passRate: 55,
  },
  argTypes: {
    maxRuns: {
      name: 'maxRuns 预算',
      description: '目标循环最多允许的 run 轮数，耗尽仍未达标则 paused。',
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
    passRate: {
      name: '每轮通过率',
      description: 'judge 打 1 分的基础概率（%）；每次反馈注入后通过率上升。',
      control: { type: 'range', min: 0, max: 100, step: 5 },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<AgentControllerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
