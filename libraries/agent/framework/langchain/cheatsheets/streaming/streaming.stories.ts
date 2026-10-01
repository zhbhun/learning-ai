import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  TOTAL_STEPS,
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const renderStreamReplay = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['回放进度', `${snapshot.step}/${snapshot.totalSteps}`],
      ['已收到 chunk', `${snapshot.chunkCount}/${snapshot.totalChunks}`],
      ['已拼接字符', `${snapshot.assembledLength}/${snapshot.answerLength}`],
    ];
  },
});

const meta = {
  id: 'streaming',
  title: '入门上手/流式输出',
  tags: ['!dev'],
  args: {
    step: TOTAL_STEPS,
  },
  argTypes: {
    step: {
      name: '回放进度',
      description:
        '模拟已到达的事件数：0=调用刚发出，1=start 事件，2..9=逐块 token 增量，10=end 事件。左侧 chunk 拼接与右侧事件序列同步推进。',
      control: {
        type: 'range',
        min: 0,
        max: TOTAL_STEPS,
        step: 1,
      },
    },
  },
  render: renderStreamReplay,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const StreamReplay: Story = {};
