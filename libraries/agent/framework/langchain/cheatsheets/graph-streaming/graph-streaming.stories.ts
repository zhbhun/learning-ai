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

const renderChannelReplay = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['通道', snapshot.mode === 'updates+custom' ? 'updates+custom' : snapshot.mode],
      ['subgraphs', snapshot.subgraphs ? 'true' : 'false'],
      ['chunk 数', snapshot.chunkCount],
      ['子图条目', snapshot.subgraphChunks],
    ];
  },
});

const meta = {
  id: 'graph-streaming',
  title: 'LangGraph 图编排/图级流式',
  tags: ['!dev'],
  args: {
    mode: 'updates',
    subgraphs: false,
  },
  argTypes: {
    mode: {
      name: 'streamMode（通道）',
      description:
        '同一次图执行的通道选择：updates=节点增量（默认）、values=每步全量快照、messages=(chunk, metadata) 元组、custom=writer 载荷、组合=[mode, chunk] 交错。',
      control: {
        type: 'inline-radio',
        labels: {
          updates: 'updates',
          values: 'values',
          messages: 'messages',
          custom: 'custom',
          'updates+custom': '["updates","custom"]',
        } as Record<string, string>,
      },
    },
    subgraphs: {
      name: 'subgraphs: true',
      description:
        '打开后子图内部条目进入流，所有 chunk 外层加 [namespace, …] 前缀；组合模式变 [namespace, mode, chunk] 三层。',
      control: { type: 'boolean' },
    },
  },
  render: renderChannelReplay,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ChannelReplay: Story = {};
