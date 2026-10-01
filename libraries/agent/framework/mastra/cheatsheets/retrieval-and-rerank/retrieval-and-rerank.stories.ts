import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createRerankExample,
  type RerankExampleInstance,
  type RerankExampleSnapshot,
} from './example';

interface RerankArgs {
  mode: 'vector' | 'rerank';
  semanticWeight: number;
  vectorWeight: number;
  positionWeight: number;
  topK: number;
}

const renderInteractive = canvasStory({
  create: createRerankExample,
  apply(instance: RerankExampleInstance, args: RerankArgs) {
    instance.update(args);
  },
  readout(snapshot: RerankExampleSnapshot) {
    return [
      ['排序模式', snapshot.mode === 'rerank' ? '重排加权' : '仅向量序'],
      ['首位候选', snapshot.first],
      ['入选候选', `${snapshot.selected} / ${snapshot.total}`],
      ['重排新进 topK', snapshot.newEntries],
    ];
  },
});

const meta = {
  id: 'retrieval-and-rerank',
  title: '5. RAG/检索与重排',
  tags: ['!dev'],
  args: {
    mode: 'rerank',
    semanticWeight: 0.5,
    vectorWeight: 0.3,
    positionWeight: 0.2,
    topK: 4,
  },
  argTypes: {
    mode: {
      name: '排序模式',
      description: '仅向量序按召回相似度排列；重排加权按三路加权综合分排列。',
      options: ['vector', 'rerank'],
      control: { type: 'radio', labels: { vector: '仅向量序', rerank: '重排加权' } },
    },
    semanticWeight: {
      name: '语义权重',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    vectorWeight: {
      name: '向量权重',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    positionWeight: {
      name: '位置权重',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    topK: {
      name: 'topK 截断',
      control: { type: 'range', min: 1, max: 8, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<RerankArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
