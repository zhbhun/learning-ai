import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

interface ExampleArgs {
  amount: number;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['示例输入', snapshot.amount],
      ['计算结果', snapshot.result],
    ];
  },
});

const meta = {
  id: 'sample-course',
  title: '示例/课程模板',
  tags: ['!dev'],
  args: {
    amount: 3,
  },
  argTypes: {
    amount: {
      name: '示例输入',
      description: '替换为本课公开 API、参数或操作意图。',
      control: {
        type: 'range',
        min: 0,
        max: 10,
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
