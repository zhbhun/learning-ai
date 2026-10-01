import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleOptions,
  type ExampleSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleOptions) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['thread-1 快照数', snapshot.thread1Count],
      ['thread-2 快照数', snapshot.thread2Count],
      ['重启后可恢复', snapshot.recoverable],
    ];
  },
});

const meta = {
  id: 'persistence',
  title: 'LangGraph 图编排/持久化',
  tags: ['!dev'],
  args: {
    checkpointerKind: 'memory',
    stepsThread1: 4,
    stepsThread2: 2,
    restarted: false,
  },
  argTypes: {
    checkpointerKind: {
      name: '存储实现',
      description:
        'compile({ checkpointer }) 传入的实现：不传（默认）、MemorySaver（进程内存）或数据库版（如 PostgresSaver）。',
      control: { type: 'inline-radio' },
      options: ['none', 'memory', 'postgres'],
      labels: {
        none: '无（默认）',
        memory: 'MemorySaver',
        postgres: '数据库（Postgres）',
      },
    },
    stepsThread1: {
      name: 'thread-1 推进',
      description:
        'thread_id 为 t1 的 invoke 已推进的 checkpoint 数：0 未运行，1-4 对应一次 invoke 依次落下的快照。',
      control: { type: 'range', min: 0, max: 4, step: 1 },
    },
    stepsThread2: {
      name: 'thread-2 推进',
      description:
        'thread_id 为 t2 的 invoke 已推进的 checkpoint 数，与 t1 互相独立。',
      control: { type: 'range', min: 0, max: 4, step: 1 },
    },
    restarted: {
      name: '模拟进程重启',
      description:
        '模拟进程退出后再次调用 getState：MemorySaver 的 RAM 数据清空，数据库实现的链仍在。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
