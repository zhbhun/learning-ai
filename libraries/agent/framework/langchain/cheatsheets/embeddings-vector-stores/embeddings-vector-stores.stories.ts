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
      ['查询词', snapshot.query],
      ['topK', snapshot.topK],
      ['第一名（分数）', snapshot.top1],
      ['返回条数', snapshot.hitCount],
    ];
  },
});

const meta = {
  id: 'embeddings-vector-stores',
  title: '记忆与检索/嵌入与向量库',
  tags: ['!dev'],
  args: {
    queryKey: 'pet',
    topK: 3,
  },
  argTypes: {
    queryKey: {
      name: '查询词',
      description:
        '预置查询（embedQuery 的输入）：前三个分别命中语料中的宠物 / 大模型 / 烹饪语义簇；「量子纠错」与语料无关，用来观察分数绝对值。',
      control: { type: 'inline-radio' },
      options: ['pet', 'llm', 'cooking', 'offtopic'],
      labels: {
        pet: '宠物出门',
        llm: '大模型注意力',
        cooking: '家常菜',
        offtopic: '量子纠错（无关）',
      },
    },
    topK: {
      name: 'topK',
      description:
        'similaritySearch 的 k：返回分数最高的前 k 条；语料共 6 条，落在 k 之外的行变灰。',
      control: { type: 'range', min: 1, max: 6, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
