import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createWindowChart,
  type WindowInstance,
  type WindowSnapshot,
} from './example';

interface ContextWindowArgs {
  sources: string[];
  lastMessages: number;
}

const render = canvasStory({
  create: createWindowChart,
  apply(instance: WindowInstance, args: ContextWindowArgs) {
    instance.update(args);
  },
  readout(snapshot: WindowSnapshot) {
    return [
      ['总 token', snapshot.total],
      ['每轮注入', snapshot.perTurn],
      ['偶尔注入', snapshot.occasional],
    ];
  },
});

const meta = {
  id: 'context-engineering',
  title: '2. Agent 进阶/上下文工程',
  tags: ['!dev'],
  args: {
    sources: ['instructions-static', 'tools', 'memory'],
    lastMessages: 10,
  },
  argTypes: {
    sources: {
      name: '上下文来源',
      description: '勾选注入窗口的来源，观察堆叠条、读数与建议动作。',
      control: {
        type: 'multi-select',
        labels: {
          'instructions-static': '静态 instructions',
          'instructions-dynamic': '动态 instructions / 内联注入',
          tools: '工具描述',
          memory: '记忆 lastMessages',
          rag: 'RAG 检索结果',
          signals: '信号',
        },
      },
      options: [
        'instructions-static',
        'instructions-dynamic',
        'tools',
        'memory',
        'rag',
        'signals',
      ],
    },
    lastMessages: {
      name: 'lastMessages 条数',
      description: 'Memory 保留的最近消息条数（官方默认 10）。',
      control: { type: 'range', min: 0, max: 40, step: 1 },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<ContextWindowArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
