import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createBoundaryExample,
  createMemoryExample,
  type BoundaryInstance,
  type BoundaryOptions,
  type BoundarySnapshot,
  type MemoryInstance,
  type MemoryOptions,
  type MemorySnapshot,
} from './example';

const renderBoundary = canvasStory({
  create: createBoundaryExample,
  apply(instance: BoundaryInstance, args: BoundaryOptions) {
    instance.update(args);
  },
  readout(snapshot: BoundarySnapshot) {
    return [
      ['enrich 执行', `${snapshot.enrichRuns} 次`],
      ['fetch 尝试', `${snapshot.fetchAttempts} 次`],
      ['恢复路径', snapshot.outcomeLabel],
    ];
  },
});

const renderMemory = canvasStory({
  create: createMemoryExample,
  apply(instance: MemoryInstance, args: MemoryOptions) {
    instance.update(args);
  },
  readout(snapshot: MemorySnapshot) {
    return [
      ['末次返回', snapshot.lastReturned],
      ['累计保存', snapshot.totalSaved],
      ['模式', snapshot.modeLabel],
    ];
  },
});

// 两个实例的输入不同：Boundary 用 enrichIsTask / fetchHasRetry，
// Memory 用 useFinal；合并成一份 args 类型，各 Story 只取自己需要的键。
type ExampleArgs = BoundaryOptions & MemoryOptions;

const meta = {
  id: 'functional-api',
  title: 'LangGraph 图编排/Functional API',
  tags: ['!dev'],
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<ExampleArgs>;

export const Boundary: Story = {
  args: {
    enrichIsTask: true,
    fetchHasRetry: false,
  },
  argTypes: {
    enrichIsTask: {
      name: 'enrich 包成 task',
      description:
        '同一逻辑包成 task（结果入 checkpoint，恢复时不重跑）或留作普通函数（重放时重新执行）。',
      control: { type: 'boolean' },
    },
    fetchHasRetry: {
      name: 'fetch 带 retry 策略',
      description:
        'task 级 RetryPolicy：首次失败在 task 内重试消化，流程不中断，不产生恢复场景。',
      control: { type: 'boolean' },
    },
  },
  render: renderBoundary,
  parameters: storySource(exampleSource),
};

export const Memory: Story = {
  args: {
    useFinal: false,
  },
  argTypes: {
    useFinal: {
      name: '用 entrypoint.final 解耦',
      description:
        '关闭：保存值就是返回值；打开：调用者拿到上次的累计值，checkpoint 保存新累计。',
      control: { type: 'boolean' },
    },
  },
  render: renderMemory,
  parameters: storySource(exampleSource),
};
