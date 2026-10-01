import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './working-memory-block.ts?raw';
import {
  createWorkingMemoryBlock,
  type WorkingMemoryBlockInstance,
  type WorkingMemoryBlockSnapshot,
} from './working-memory-block';

interface WorkingMemoryArgs {
  mode: 'template' | 'schema';
  scope: 'resource' | 'thread';
  info: number;
}

const renderInteractive = canvasStory({
  create: createWorkingMemoryBlock,
  apply(instance: WorkingMemoryBlockInstance, args: WorkingMemoryArgs) {
    instance.update(args);
  },
  readout(snapshot: WorkingMemoryBlockSnapshot) {
    return [
      ['形态', snapshot.mode],
      ['写入语义', snapshot.semantic],
      ['已知事实', snapshot.facts],
      ['最近写入负载', snapshot.payload],
      ['作用域', snapshot.scope],
    ];
  },
});

const meta = {
  id: 'working-memory',
  title: '4. 记忆/工作记忆',
  tags: ['!dev'],
  args: {
    mode: 'template',
    scope: 'resource',
    info: 2,
  },
  argTypes: {
    mode: {
      name: '记忆形态',
      description: 'template 用 Markdown 模板（replace 整块重写）；schema 用 zod 等结构化定义（merge 增量合并），二者互斥。',
      control: { type: 'radio', labels: { template: 'Markdown 模板', schema: '结构化 schema' } },
      options: ['template', 'schema'],
    },
    scope: {
      name: '作用域 scope',
      description: 'resource 跨线程共享（默认，需存储支持 mastra_resources 表）；thread 仅当前线程。',
      control: { type: 'radio', labels: { resource: 'resource（跨线程）', thread: 'thread（线程内）' } },
      options: ['resource', 'thread'],
    },
    info: {
      name: '对话进度',
      description: '模拟用户依次告知新信息：0 初始 → 1 姓名 → 2 城市 → 3 长期目标。',
      control: { type: 'range', min: 0, max: 3, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<WorkingMemoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
