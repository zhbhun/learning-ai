import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createStreamExample,
  type StreamArgs,
  type StreamInstance,
  type StreamSnapshot,
} from './example';

const render = canvasStory({
  create: createStreamExample,
  apply(instance: StreamInstance, args: StreamArgs) {
    instance.update(args);
  },
  readout(snapshot: StreamSnapshot) {
    return [
      ['当前 chunk', snapshot.currentType],
      ['累计文本', `${snapshot.textChars} 字`],
      ['事件进度', snapshot.progressLabel],
    ];
  },
});

const meta = {
  id: 'streaming',
  title: '2. Agent 进阶/流式输出',
  tags: ['!dev'],
  args: {
    showTools: true,
    showCustom: true,
    step: 10,
  },
  argTypes: {
    showTools: {
      name: '显示工具事件',
      description: '关闭后 tool-call / tool-result 从时间轴消失，模拟只关心文本的前端过滤。',
      control: { type: 'boolean' },
    },
    showCustom: {
      name: '显示自定义事件',
      description: '关闭后 writer 写入的 data-tool-progress / weather-log 从时间轴消失。',
      control: { type: 'boolean' },
    },
    step: {
      name: '步进进度',
      description: '拖动滑块把流推进到第 n 个 chunk（0~14），观察事件按 fullStream 顺序依次出现。',
      control: { type: 'range', min: 0, max: 14, step: 1 },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<StreamArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
