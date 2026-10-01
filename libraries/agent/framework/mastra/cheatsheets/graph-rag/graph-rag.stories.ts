import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGraphRagDemo,
  type WalkArgs,
  type WalkInstance,
  type WalkSnapshot,
} from './example';

interface GraphRagArgs {
  randomWalkSteps: number;
  restartProb: number;
  topK: number;
}

const renderInteractive = canvasStory({
  create: createGraphRagDemo,
  apply(instance: WalkInstance, args: GraphRagArgs) {
    instance.update(args);
  },
  readout(snapshot: WalkSnapshot) {
    return [
      ['命中节点', snapshot.entry],
      ['游走步数', snapshot.steps],
      ['选中节点', snapshot.selected],
    ];
  },
});

const meta = {
  id: 'graph-rag',
  title: '5. RAG/GraphRAG',
  tags: ['!dev'],
  args: {
    randomWalkSteps: 100,
    restartProb: 0.15,
    topK: 4,
  },
  argTypes: {
    randomWalkSteps: {
      name: '游走步数 randomWalkSteps',
      description: '每次查询的随机游走步数，官方默认 100。',
      control: { type: 'range', min: 10, max: 200, step: 10 },
    },
    restartProb: {
      name: '重启概率 restartProb',
      description: '每步跳回命中节点的概率，官方默认 0.15。',
      control: { type: 'range', min: 0, max: 0.5, step: 0.05 },
    },
    topK: {
      name: '返回数量 topK',
      description: '返回的节点数，官方默认 10，示意中限 1~6。',
      control: { type: 'range', min: 1, max: 6, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<GraphRagArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
