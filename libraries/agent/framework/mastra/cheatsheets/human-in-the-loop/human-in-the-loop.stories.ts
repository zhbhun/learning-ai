import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createHitlExample,
  type HitlArgs,
  type HitlInstance,
  type HitlSnapshot,
} from './example';

const render = canvasStory({
  create: createHitlExample,
  apply(instance: HitlInstance, args: HitlArgs) {
    instance.update(args);
  },
  readout(snapshot: HitlSnapshot) {
    return [
      ['介入机制', snapshot.mechanismLabel],
      ['工具 execute', snapshot.executeState],
      ['模型收到', snapshot.modelFeedback],
    ];
  },
});

const meta = {
  id: 'human-in-the-loop',
  title: '2. Agent 进阶/工具审批与挂起',
  tags: ['!dev'],
  args: {
    mechanism: 'approval',
    decision: 'approve',
    reason: '删除操作不在本次授权范围，请改为标记归档',
  },
  argTypes: {
    mechanism: {
      name: '介入机制',
      description: '预执行审批在 execute 之前拦截；工具内挂起在 execute 运行中暂停。',
      options: ['approval', 'suspend'],
      control: {
        type: 'radio',
        labels: { approval: '预执行审批', suspend: '工具内挂起' },
      },
    },
    decision: {
      name: '人工决策',
      description: '批准则恢复执行；拒绝时预执行审批会把理由回传给模型。',
      options: ['approve', 'decline'],
      control: {
        type: 'radio',
        labels: { approve: '批准', decline: '拒绝' },
      },
    },
    reason: {
      name: '拒绝理由',
      description: 'declineToolCall 的 reason 参数，拒绝时替代工具结果回传给模型。',
      control: { type: 'text' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<HitlArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
