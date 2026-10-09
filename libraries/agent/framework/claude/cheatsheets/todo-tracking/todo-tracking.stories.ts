import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './todo-tracking-demo.ts?raw';
import {
  createTodoTrackingDemo,
  type DemoInstance,
  type DemoSnapshot,
} from './todo-tracking-demo';

interface DemoArgs {
  position: number;
}

const renderInteractive = canvasStory({
  create: createTodoTrackingDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['当前消息', snapshot.current],
      ['任务清单', snapshot.list],
      ['进度', snapshot.progress],
    ];
  },
});

const meta = {
  id: 'todo-tracking',
  title: '扩展能力/上下文与文件/TODO 跟踪',
  tags: ['!dev'],
  args: {
    position: 4,
  },
  argTypes: {
    position: {
      name: '流位置',
      description:
        '回放到消息流的第几条(0 从头开始;全部为演示数据,不调用 LLM API)。',
      control: {
        type: 'range',
        min: 0,
        max: 7,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
