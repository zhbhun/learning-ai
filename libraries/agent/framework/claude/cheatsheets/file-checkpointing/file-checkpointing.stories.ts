import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './file-checkpointing-demo.ts?raw';
import {
  createFileCheckpointingDemo,
  type DemoInstance,
  type DemoSnapshot,
} from './file-checkpointing-demo';

interface DemoArgs {
  checkpoint: number;
}

const renderInteractive = canvasStory({
  create: createFileCheckpointingDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['回退到', snapshot.target],
      ['utils.ts', snapshot.utilsFile],
      ['helpers.ts', snapshot.helpersFile],
      ['对话历史', snapshot.conversation],
    ];
  },
});

const meta = {
  id: 'file-checkpointing',
  title: '扩展能力/上下文与文件/文件检查点',
  tags: ['!dev'],
  args: {
    checkpoint: 0,
  },
  argTypes: {
    checkpoint: {
      name: '回退到',
      description:
        '选择回退目标检查点(0=m1 初始状态、1=m2、2=m3;全部为演示数据,不调用 LLM API)。',
      control: {
        type: 'range',
        min: 0,
        max: 2,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
