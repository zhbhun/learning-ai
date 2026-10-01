import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
  type ModeKey,
} from './example';

interface ExampleArgs {
  mode: ModeKey;
  step: number;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['执行模式', snapshot.modeLabel],
      ['消息数', snapshot.messageCount],
      ['工具结果', snapshot.toolOutcome],
      ['最终结局', snapshot.ending],
    ];
  },
});

const meta = {
  id: 'tools',
  title: 'Agent 构建/工具',
  tags: ['!dev'],
  args: {
    mode: 'ok',
    step: 4,
  },
  argTypes: {
    mode: {
      name: '执行模式',
      description:
        '切换工具回合的结局：正常、抛错（默认捕获 / 冒泡终止）、返回错误文本、调用不存在的工具。',
      control: {
        type: 'radio',
        options: [
          'ok',
          'throw-caught',
          'throw-bubble',
          'return-error',
          'unknown-tool',
        ] satisfies ModeKey[],
      },
    },
    step: {
      name: '回放步骤',
      description: '从第 1 条消息开始逐步追加，观察 id 与 tool_call_id 的配对。',
      control: {
        type: 'range',
        min: 1,
        max: 6,
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
