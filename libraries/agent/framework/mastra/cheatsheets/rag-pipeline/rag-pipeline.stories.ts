import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createRag, type RagInstance, type RagSnapshot } from './example';

interface RagPipelineArgs {
  stage: string;
  paragraphs: number;
  topK: number;
}

const render = canvasStory({
  create: createRag,
  apply(instance: RagInstance, args: RagPipelineArgs) {
    instance.update(args);
  },
  readout(snapshot: RagSnapshot) {
    return [
      ['站点', snapshot.site],
      ['块数', snapshot.chunks],
      ['示意维度', snapshot.dim],
      ['命中数', snapshot.hits],
    ];
  },
  captions: ['离线示意：真实 text-embedding-3-small 为 1536 维', 'RAG 管道流'],
});

const meta = {
  id: 'rag-pipeline',
  title: '5. RAG/RAG 流水线',
  tags: ['!dev'],
  args: {
    stage: '切块',
    paragraphs: 4,
    topK: 3,
  },
  argTypes: {
    stage: {
      name: '站点',
      description: '步进五站：加载 → 切块 → 嵌入 → 入库 → 检索。',
      control: { type: 'radio' },
      options: ['加载', '切块', '嵌入', '入库', '检索'],
    },
    paragraphs: {
      name: '文档段数',
      description: '样例文档的段落数，改变切块数量。',
      control: { type: 'range', min: 2, max: 6, step: 1 },
    },
    topK: {
      name: 'topK',
      description: '检索返回的命中数上限。',
      control: { type: 'range', min: 1, max: 5, step: 1 },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<RagPipelineArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
