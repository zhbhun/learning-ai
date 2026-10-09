import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './streaming-output-demo.ts?raw';
import {
  createStreamingOutputDemo,
  type DemoInstance,
  type DemoSnapshot,
} from './streaming-output-demo';

interface DemoArgs {
  streaming: boolean;
  position: number;
}

const renderInteractive = canvasStory({
  create: createStreamingOutputDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update({ includePartial: args.streaming, position: args.position });
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['消息序号', `${snapshot.position + 1} / ${snapshot.total}`],
      ['当前', snapshot.current],
      ['已累积文本', snapshot.text || '—'],
      ['工具输入', snapshot.toolJson || '—'],
    ];
  },
});

const meta = {
  id: 'streaming-output',
  title: '配置与控制/输出控制/流式输出',
  tags: ['!dev'],
  args: {
    streaming: true,
    position: 0,
  },
  argTypes: {
    streaming: {
      name: 'includePartialMessages',
      description: 'Options 上的开关:打开后 stream_event 穿插在原有消息之间(默认关闭)。',
      control: {
        type: 'boolean',
      },
    },
    position: {
      name: '流位置',
      description: '回放到消息流的第几条(从 0 开始;超出序列长度时停在最后一条)。',
      control: {
        type: 'range',
        min: 0,
        max: 20,
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
