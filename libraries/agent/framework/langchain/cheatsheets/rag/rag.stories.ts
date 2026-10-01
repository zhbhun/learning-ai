import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

interface ExampleArgs {
  query: string;
  topK: number;
}

const QUERY_OPTIONS = [
  '未拆封的商品可以退货吗',
  '海外购的退款要多久到账',
  '可以用数字货币支付吗',
] as const;

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['进入上下文', `${snapshot.hits} 块`],
      ['top1 分数', snapshot.topScore.toFixed(2)],
      ['引用编号', snapshot.citations],
      ['回答状态', snapshot.status],
    ];
  },
});

const meta = {
  id: 'rag',
  title: '记忆与检索/RAG',
  tags: ['!dev'],
  args: {
    query: QUERY_OPTIONS[1],
    topK: 4,
  },
  argTypes: {
    query: {
      name: '查询问题',
      description:
        '三个预置查询：单块命中（只需 1 块）、跨块命中（回答需要 2 块）、无命中（语料里没有答案，触发兜底）。',
      control: {
        type: 'radio',
        options: [...QUERY_OPTIONS],
      },
    },
    topK: {
      name: '检索条数 topK',
      description:
        '检索截断位置（真实 VectorStoreRetriever 默认 k=4）。调小会把回答需要的块截在上下文外，回答退化为部分引用。',
      control: {
        type: 'range',
        min: 1,
        max: 6,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
