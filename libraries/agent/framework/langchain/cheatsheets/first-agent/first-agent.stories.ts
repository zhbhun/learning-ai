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
  question: 'weather' | 'chat';
  step: number;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['输入问题', snapshot.questionLabel],
      ['消息数', snapshot.messageCount],
      ['调用工具', snapshot.toolCalled ? 'get_weather' : '—'],
      ['最新消息', snapshot.latestType],
    ];
  },
});

const meta = {
  id: 'first-agent',
  title: '入门上手/第一个 Agent',
  tags: ['!dev'],
  args: {
    question: 'weather',
    step: 4,
  },
  argTypes: {
    question: {
      name: '输入问题',
      description:
        '切换问题类型：需要实时信息的问题才会触发工具调用回合。',
      control: {
        type: 'radio',
        options: ['weather', 'chat'],
      },
    },
    step: {
      name: '回放步骤',
      description: '从第 1 条消息开始逐步追加，观察 messages 数组的增长。',
      control: {
        type: 'range',
        min: 1,
        max: 4,
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
