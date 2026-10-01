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

interface WorkflowHumanInTheLoopArgs {
  decision: ExampleArgs['decision'];
  flow: ExampleArgs['flow'];
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: WorkflowHumanInTheLoopArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      [
        '最终状态',
        snapshot.status === 'suspended'
          ? 'suspended（挂起等待人工）'
          : 'success',
      ],
      ['步骤轨迹', snapshot.trace],
      ['人工轮数', snapshot.rounds],
      [
        snapshot.status === 'suspended' ? '挂起原因' : 'bail 原因',
        snapshot.status === 'suspended'
          ? (snapshot.suspendReason ?? '—')
          : (snapshot.bailReason ?? '—'),
      ],
    ];
  },
  captions: ['suspend：挂起等待人工', 'resume：提交 resumeData'],
});

const meta = {
  id: 'workflow-human-in-the-loop',
  title: '3. 工作流/状态与恢复/人工介入',
  tags: ['!dev'],
  args: {
    decision: 'pending',
    flow: 'single',
  },
  argTypes: {
    decision: {
      name: '人工决策',
      description: '提交给 run.resume 的 resumeData.approved；pending 表示尚未提交决策。',
      control: {
        type: 'radio',
        labels: {
          pending: '待定（未提交）',
          approved: '批准',
          rejected: '拒绝',
        },
      },
      options: ['pending', 'approved', 'rejected'],
    },
    flow: {
      name: '审批链',
      description: '单级审批一轮 suspend/resume；两级审批演示多轮人工输入。',
      control: {
        type: 'radio',
        labels: {
          single: '单级审批',
          double: '两级审批',
        },
      },
      options: ['single', 'double'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<WorkflowHumanInTheLoopArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
