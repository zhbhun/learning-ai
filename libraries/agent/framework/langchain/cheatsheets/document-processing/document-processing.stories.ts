import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
  type SplitterStrategy,
} from './example';

interface ExampleArgs {
  chunkSize: number;
  chunkOverlap: number;
  strategy: SplitterStrategy;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['块数', snapshot.chunkCount],
      ['最长块', `${snapshot.maxChunkLength} 字`],
      ['平均块长', `${snapshot.avgChunkLength} 字`],
      ['硬切块', snapshot.hardCutChunks],
      ['重叠块', snapshot.overlapChunks],
    ];
  },
});

const meta = {
  id: 'document-processing',
  title: '记忆与检索/文档加载与切分',
  tags: ['!dev'],
  args: {
    chunkSize: 120,
    chunkOverlap: 30,
    strategy: 'recursive',
  },
  argTypes: {
    chunkSize: {
      name: '块大小 chunkSize',
      description:
        '每块的目标上限（按字符计）。画布用 40–400 的缩比演示，真实包默认 1000。调小后块数上升、红色「硬切」标记增多。',
      control: {
        type: 'range',
        min: 40,
        max: 400,
        step: 20,
      },
    },
    chunkOverlap: {
      name: '块重叠 chunkOverlap',
      description:
        '相邻块共享的重叠预算（真实包默认 200）。调大后相邻块出现橙色「↩重叠 N 字」标记；调到不小于 chunkSize 时呈现真实报错。',
      control: {
        type: 'range',
        min: 0,
        max: 160,
        step: 20,
      },
    },
    strategy: {
      name: '切分器',
      description:
        'recursive 对应 RecursiveCharacterTextSplitter（["\\n\\n", "\\n", " ", ""] 逐级降级）；character 对应 CharacterTextSplitter（只认 "\\n\\n"，长段落不降级、整块保留）。',
      control: {
        type: 'radio',
        options: ['recursive', 'character'] satisfies SplitterStrategy[],
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
