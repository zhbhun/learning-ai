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

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['run 状态', snapshot.status],
      ['播放位置', `${snapshot.time.toFixed(1)}s / ${snapshot.total}s`],
      ['离线缓冲事件', snapshot.buffered],
      ['慢工具', snapshot.bg],
    ];
  },
});

const meta = {
  id: 'durable-agents',
  title: '7. 长时运行/Durable Agents 与后台任务',
  tags: ['!dev'],
  args: {
    disconnectAt: 3.5,
    reconnectAfter: 2.5,
    slowTool: 'background',
  },
  argTypes: {
    disconnectAt: {
      name: '断线时刻（秒）',
      description: 'run 进行到该秒数时客户端断开连接',
      control: { type: 'range', min: 0, max: 8, step: 0.5 },
    },
    reconnectAfter: {
      name: '离线时长（秒）',
      description: '0 表示全程在线，不产生缓冲与回放',
      control: { type: 'range', min: 0, max: 5, step: 0.5 },
    },
    slowTool: {
      name: '慢工具执行方式',
      description: '后台任务派发后 agent 继续输出；前台阻塞期间无 chunk',
      options: ['background', 'foreground'],
      control: { type: 'radio', labels: { background: '后台任务', foreground: '前台阻塞' } },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
