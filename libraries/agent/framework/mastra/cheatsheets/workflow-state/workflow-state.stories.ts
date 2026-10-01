import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './state-scoreboard.ts?raw';
import {
  createScoreboard,
  type ScoreboardInstance,
  type ScoreboardSnapshot,
} from './state-scoreboard';

interface WorkflowStateArgs {
  stateKeys: number;
  relayHops: number;
  suspendBeforeSummary: boolean;
}

const renderInteractive = canvasStory({
  create: createScoreboard,
  apply(instance: ScoreboardInstance, args: WorkflowStateArgs) {
    instance.update(args);
  },
  readout(snapshot: ScoreboardSnapshot) {
    return [
      ['经共享 state 可见', `${snapshot.stateVisible} 个字段`],
      ['经输入输出链可见', `${snapshot.chainVisible} 个字段`],
      ['挂起恢复', snapshot.suspendNote],
    ];
  },
  captions: ['input / output 逐层传递', '共享 state'],
});

const meta = {
  id: 'workflow-state',
  title: '3. 工作流/状态与恢复/共享状态',
  tags: ['!dev'],
  args: {
    stateKeys: 2,
    relayHops: 1,
    suspendBeforeSummary: false,
  },
  argTypes: {
    stateKeys: {
      name: '写入 state 的步骤数',
      description: '从左到右有几个步骤通过 setState 把自己的字段写入共享 state。',
      control: { type: 'range', min: 0, max: 3, step: 1 },
    },
    relayHops: {
      name: '输出链转发跳数',
      description: '从汇总步往回数，输出链上连续转发上游字段的跳数。',
      control: { type: 'range', min: 0, max: 3, step: 1 },
    },
    suspendBeforeSummary: {
      name: '汇总前挂起再恢复',
      description: '在最后一个生产步骤与汇总步之间模拟 suspend → resume。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<WorkflowStateArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
