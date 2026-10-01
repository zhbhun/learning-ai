import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSearchCompare,
  type SearchInstance,
  type SearchSnapshot,
} from './example';

interface SandboxSearchArgs {
  query: string;
  mode: 'bm25' | 'vector' | 'hybrid';
  vectorWeight: number;
}

const renderInteractive = canvasStory({
  create: createSearchCompare,
  apply(instance: SearchInstance, args: SandboxSearchArgs) {
    instance.update(args);
  },
  readout(snapshot: SearchSnapshot) {
    return [
      ['bm25 Top1', `${snapshot.tops.bm25.id}（${snapshot.tops.bm25.score.toFixed(2)}）`],
      ['vector Top1', `${snapshot.tops.vector.id}（${snapshot.tops.vector.score.toFixed(2)}）`],
      ['hybrid Top1', `${snapshot.tops.hybrid.id}（${snapshot.tops.hybrid.score.toFixed(2)}）`],
    ];
  },
});

const meta = {
  id: 'sandbox-search',
  title: '6. 扩展能力/运行环境/沙箱搜索与 LSP',
  tags: ['!dev'],
  args: {
    query: 'auth',
    mode: 'hybrid',
    vectorWeight: 0.5,
  },
  argTypes: {
    query: {
      name: '查询词',
      description: '偏关键词（auth、useState hook）或偏语义（如何处理用户登录鉴权）。',
      control: { type: 'select' },
      options: ['auth', 'useState hook', '如何处理用户登录鉴权'],
    },
    mode: {
      name: '检索模式',
      description: 'bm25 与 vector 都配置时，未传 mode 默认 hybrid。',
      control: { type: 'radio' },
      options: ['bm25', 'vector', 'hybrid'],
      labels: {
        bm25: 'bm25 关键词',
        vector: 'vector 语义',
        hybrid: 'hybrid 混合',
      },
    },
    vectorWeight: {
      name: '向量权重（hybrid）',
      description: '0 全用 BM25，1 全用向量，0.5 等权。',
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<SandboxSearchArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
