import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type TaskTriageInstance,
  type TaskTriageSnapshot,
} from './example';

interface TaskTriageArgs {
  predictability: number;
  recovery: number;
  audit: number;
}

const render = canvasStory({
  create: createExample,
  apply(instance: TaskTriageInstance, args: TaskTriageArgs) {
    instance.update(args);
  },
  readout(snapshot: TaskTriageSnapshot) {
    return [
      ['推荐结论', snapshot.recommendation],
      ['工作流需求分', snapshot.workflowNeed],
      ['维护方', snapshot.maintainBy],
    ];
  },
  captions: ['任务分流器', '离线示意 · 不调用真实模型'],
});

const meta = {
  id: 'agent-or-workflow',
  title: '3. 工作流/编排基础/Agent 还是工作流',
  tags: ['!dev'],
  args: {
    predictability: 9,
    recovery: 8,
    audit: 6,
  },
  argTypes: {
    predictability: {
      name: '路径可预测性',
      description: '步骤能否事先枚举：10 表示完全可枚举。',
      control: { type: 'range', min: 0, max: 10, step: 1 },
    },
    recovery: {
      name: '失败恢复需求',
      description: '中断后需要从某一步恢复续跑的程度。',
      control: { type: 'range', min: 0, max: 10, step: 1 },
    },
    audit: {
      name: '审计需求',
      description: '要求每步留痕、可回查合规的程度。',
      control: { type: 'range', min: 0, max: 10, step: 1 },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<TaskTriageArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
