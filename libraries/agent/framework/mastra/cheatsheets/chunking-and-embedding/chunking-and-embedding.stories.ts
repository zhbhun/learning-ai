import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createChunkingCanvas, type Snapshot, type Strategy } from './example';

interface ChunkingArgs {
  strategy: Strategy;
  maxCharacters: number;
  overlap: number;
}

const renderInteractive = canvasStory({
  create: createChunkingCanvas,
  apply(instance: { update: (args: Partial<ChunkingArgs>) => void }, args: ChunkingArgs) {
    instance.update(args);
  },
  readout(snapshot: Snapshot) {
    return [
      ['块数', snapshot.count],
      ['平均块长（字符）', snapshot.avg],
      ['跨节块数', snapshot.mixed],
    ];
  },
});

const meta = {
  id: 'chunking-and-embedding',
  title: '5. RAG/切块与嵌入',
  tags: ['!dev'],
  args: {
    strategy: 'recursive',
    maxCharacters: 120,
    overlap: 20,
  },
  argTypes: {
    strategy: {
      name: '切块策略',
      description: '对应 doc.chunk() 的 strategy 参数（示意其中四种）。',
      options: ['character', 'recursive', 'markdown', 'token'],
      labels: {
        character: 'character 字符硬切',
        recursive: 'recursive 递归合并',
        markdown: 'markdown 标题边界',
        token: 'token 预算换算',
      },
      control: {
        type: 'radio',
      },
    },
    maxCharacters: {
      name: 'maxCharacters 块大小上限',
      description: '每块的最大字符数（token 策略按 1 token ≈ 4 字符换算预算）。',
      control: {
        type: 'range',
        min: 40,
        max: 260,
        step: 10,
      },
    },
    overlap: {
      name: 'overlap 块间重叠',
      description: '相邻块共享的字符数，用于保留边界上下文。',
      control: {
        type: 'range',
        min: 0,
        max: 60,
        step: 5,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ChunkingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
