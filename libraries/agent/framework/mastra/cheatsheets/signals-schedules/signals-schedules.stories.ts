import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  DELIVERY_LABEL,
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
      ['Agent 状态', snapshot.agentState === 'active' ? '运行中' : '空闲'],
      ['投递类型', DELIVERY_LABEL[snapshot.delivery]],
      ['注入时机', snapshot.timing],
    ];
  },
});

const meta = {
  id: 'signals-schedules',
  title: '7. 长时运行/调度与信号',
  tags: ['!dev'],
  args: {
    agentState: 'active',
    delivery: 'message',
  },
  argTypes: {
    agentState: {
      name: 'Agent 当前状态',
      description: '线程此刻是空闲，还是有 run 正在执行',
      options: ['idle', 'active'],
      control: { type: 'radio', labels: { idle: '空闲', active: '运行中' } },
    },
    delivery: {
      name: '投递类型',
      description: '选择把输入送进线程的投递 API',
      options: ['message', 'queue', 'signal', 'notification'],
      control: {
        type: 'radio',
        labels: {
          message: 'sendMessage',
          queue: 'queueMessage',
          signal: 'sendSignal',
          notification: 'sendNotificationSignal',
        },
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
