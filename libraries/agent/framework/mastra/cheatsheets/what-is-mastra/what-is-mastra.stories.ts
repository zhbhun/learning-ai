import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  LAYERS,
  type ExampleInstance,
  type ExampleSnapshot,
  type LayerId,
} from './example';

interface ExampleArgs {
  layer: LayerId;
}

const layerOptions = LAYERS.map((layer) => layer.id);

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['当前层', snapshot.name],
      ['职责', snapshot.duty],
      ['核心 API', snapshot.api],
    ];
  },
});

const meta = {
  id: 'what-is-mastra',
  title: '1. 起步/Mastra 是什么',
  tags: ['!dev'],
  args: {
    layer: 'agent',
  },
  argTypes: {
    layer: {
      name: '当前层',
      description: '切换要查看的架构层，画布高亮与左下角读数同步变化。',
      options: layerOptions,
      control: {
        type: 'radio',
        labels: Object.fromEntries(LAYERS.map((layer) => [layer.id, layer.name])),
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
