import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
  type DecisionKey,
} from './example';

interface ExampleArgs {
  decision: DecisionKey;
  step: number;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['恢复决定', snapshot.decisionLabel],
      ['工具执行', snapshot.toolExecution],
      ['回传给模型', snapshot.feedback],
      ['当前结局', snapshot.ending],
    ];
  },
});

const meta = {
  id: 'human-in-the-loop',
  title: 'Agent 构建/人机协同',
  tags: ['!dev'],
  args: {
    decision: 'approve',
    step: 5,
  },
  argTypes: {
    decision: {
      name: '恢复决定',
      description:
        'Command resume 里的决定类型：approve 原样执行、edit 改参后执行、reject 不执行并回喂拒绝消息。',
      control: {
        type: 'radio',
        options: ['approve', 'edit', 'reject'] satisfies DecisionKey[],
      },
    },
    step: {
      name: '回放步骤',
      description: '从第 1 段开始逐步追加：请求 → 意图 → 挂起（__interrupt__）→ 回传 → 回答。',
      control: {
        type: 'range',
        min: 1,
        max: 5,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
