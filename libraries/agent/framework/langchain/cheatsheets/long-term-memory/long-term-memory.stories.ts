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
      ['当前命名空间', snapshot.namespace],
      ['注入记忆条数', snapshot.injectedCount],
      ['Store 总条数', snapshot.storeTotal],
    ];
  },
});

const meta = {
  id: 'long-term-memory',
  title: '记忆与检索/长期记忆与 Store',
  tags: ['!dev'],
  args: {
    userId: 'alice',
    threadId: 'thread-1',
    aliceMemories: 3,
    bobMemories: 2,
    limit: 2,
    writeThisCall: false,
  },
  argTypes: {
    userId: {
      name: '当前 user_id',
      description:
        '本次调用传入 context 的 user_id：决定检索哪个命名空间，是长期记忆的隔离键。',
      control: { type: 'inline-radio' },
      options: ['alice', 'bob'],
    },
    threadId: {
      name: '当前 thread_id',
      description:
        '本次调用传入 configurable 的 thread_id：只影响短期记忆（消息历史），不影响 store 命名空间。',
      control: { type: 'inline-radio' },
      options: ['thread-1', 'thread-2'],
    },
    aliceMemories: {
      name: 'alice 已积累记忆',
      description:
        '命名空间 ("alice", "memories") 里已积累的记忆条数，跨会话保留。',
      control: { type: 'range', min: 0, max: 3, step: 1 },
    },
    bobMemories: {
      name: 'bob 已积累记忆',
      description: '命名空间 ("bob", "memories") 里已积累的记忆条数。',
      control: { type: 'range', min: 0, max: 2, step: 1 },
    },
    limit: {
      name: '注入上限 limit',
      description:
        'search 时注入系统提示的记忆条数上限（真实默认 10，这里缩小以便观察截断）。',
      control: { type: 'range', min: 1, max: 3, step: 1 },
    },
    writeThisCall: {
      name: '热路径写入',
      description:
        '本次调用中模型通过 save_memory 工具写回一条新记忆：落在当前 user 的命名空间，任意 thread 下次调用可见。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
