import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './three-layers.ts?raw';
import { createLayers, type LayersInstance, type LayersSnapshot } from './three-layers';

interface ObservationalMemoryArgs {
  turns: number;
}

const renderInteractive = canvasStory({
  create: createLayers,
  apply(instance: LayersInstance, args: ObservationalMemoryArgs) {
    instance.update(args);
  },
  readout(snapshot: LayersSnapshot) {
    return [
      ['近期消息', `${(snapshot.recent / 1000).toFixed(1)}k tok`],
      ['观察日志', `${(snapshot.observations / 1000).toFixed(1)}k tok`],
      ['反思', `${(snapshot.reflections / 1000).toFixed(1)}k tok`],
      ['观察 / 反思次数', `${snapshot.obsCount} / ${snapshot.reflCount}`],
    ];
  },
});

const meta = {
  id: 'observational-memory',
  title: '4. 记忆/观察式记忆',
  tags: ['!dev'],
  args: {
    turns: 26,
  },
  argTypes: {
    turns: {
      name: '对话轮数',
      description: '推进对话，回放消息压缩为观察、观察日志压缩为反思的过程。',
      control: {
        type: 'range',
        min: 0,
        max: 40,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ObservationalMemoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
