import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './memory-window.ts?raw';
import {
  createMemoryWindow,
  type MemoryWindowInstance,
  type MemoryWindowSnapshot,
} from './memory-window';

interface MemoryBasicsArgs {
  resource: string;
  thread: string;
  lastMessages: number;
}

const renderInteractive = canvasStory({
  create: createMemoryWindow,
  apply(instance: MemoryWindowInstance, args: MemoryBasicsArgs) {
    instance.update(args);
  },
  readout(snapshot: MemoryWindowSnapshot) {
    return [
      ['归属', `${snapshot.resource} @ ${snapshot.thread}`],
      ['窗口内消息', snapshot.windowCount],
      ['线程总消息', snapshot.threadCount],
    ];
  },
});

const meta = {
  id: 'memory-basics',
  title: '4. 记忆/记忆基础与线程',
  tags: ['!dev'],
  args: {
    resource: 'user-alice',
    thread: 'thread-support-1',
    lastMessages: 10,
  },
  argTypes: {
    resource: {
      name: 'resource（用户标识）',
      description: '用户级稳定标识；切换后同名 thread 指向另一个用户的会话。',
      control: { type: 'radio' },
      options: ['user-alice', 'user-bob'],
    },
    thread: {
      name: 'thread（会话标识）',
      description: '会话级标识，与 resource 共同定位一条线程。',
      control: { type: 'radio' },
      options: ['thread-support-1', 'thread-billing-2'],
    },
    lastMessages: {
      name: 'lastMessages（注入条数）',
      description: '注入窗口内的最近消息条数，默认 10，工具消息同样计数。',
      control: { type: 'range', min: 0, max: 12, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<MemoryBasicsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
