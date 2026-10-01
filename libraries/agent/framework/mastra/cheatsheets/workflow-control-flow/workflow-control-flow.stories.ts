import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './flow-graph.ts?raw';
import {
  createFlowGraph,
  type FlowGraphArgs,
  type FlowGraphInstance,
  type FlowGraphSnapshot,
} from './flow-graph';

interface ControlFlowArgs {
  primitive: FlowGraphArgs['primitive'];
  branchValue: number;
  concurrency: number;
}

const render = canvasStory({
  create: createFlowGraph,
  apply(instance: FlowGraphInstance, args: ControlFlowArgs) {
    instance.update(args);
  },
  readout(snapshot: FlowGraphSnapshot) {
    return [
      ['执行序列', snapshot.sequence],
      ['已执行步骤', snapshot.executedSteps],
      ['并发峰值', snapshot.concurrencyPeak],
      ['关键判断', snapshot.note],
    ];
  },
});

const meta = {
  id: 'workflow-control-flow',
  title: '3. 工作流/编排基础/控制流',
  tags: ['!dev'],
  args: {
    primitive: 'then',
    branchValue: 50,
    concurrency: 2,
  },
  argTypes: {
    primitive: {
      name: '控制流原语',
      description: '切换执行图对应的控制流原语。',
      options: ['then', 'parallel', 'branch', 'dountil', 'foreach'],
      control: {
        type: 'radio',
        labels: {
          then: '.then 顺序',
          parallel: '.parallel 并行',
          branch: '.branch 条件分支',
          dountil: '.dountil 循环',
          foreach: '.foreach 批处理',
        },
      },
    },
    branchValue: {
      name: 'branch 判断值 value',
      description: '分支条件：≥ 80 走 step-approve，≥ 40 走 step-review，其余走 step-reject；只有第一个为真的分支被执行。',
      control: { type: 'range', min: 0, max: 100, step: 5 },
    },
    concurrency: {
      name: 'foreach 并发度 concurrency',
      description: '6 个数组项的同时处理数量，默认 1 表示逐项执行。',
      control: { type: 'range', min: 1, max: 6, step: 1 },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<ControlFlowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
