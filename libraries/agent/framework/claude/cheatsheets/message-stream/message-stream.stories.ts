import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './message-stream-demo.ts?raw';
import {
  createMessageStreamDemo,
  type DemoInstance,
  type DemoSnapshot,
} from './message-stream-demo';

interface DemoArgs {
  toolTurns: number;
  position: number;
}

const renderInteractive = canvasStory({
  create: createMessageStreamDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['消息序号', `${snapshot.position + 1} / ${snapshot.total}`],
      ['type', snapshot.type],
      ['载荷摘要', snapshot.summary],
    ];
  },
});

const meta = {
  id: 'message-stream',
  title: '上手/消息流',
  tags: ['!dev'],
  args: {
    toolTurns: 2,
    position: 0,
  },
  argTypes: {
    toolTurns: {
      name: '工具轮数',
      description: 'agent 走几轮工具调用再给出最终回答(0 = 一次工具都不调用)。',
      control: {
        type: 'range',
        min: 0,
        max: 2,
        step: 1,
      },
    },
    position: {
      name: '流位置',
      description: '回放到消息流的第几条(从 0 开始;超出序列长度时停在最后一条)。',
      control: {
        type: 'range',
        min: 0,
        max: 6,
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
