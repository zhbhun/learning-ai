import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './user-input-demo.ts?raw';
import {
  createUserInputDemo,
  type DemoInstance,
  type DemoSnapshot,
} from './user-input-demo';

interface DemoArgs {
  scenario: number;
}

const renderInteractive = canvasStory({
  create: createUserInputDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['答案场景', snapshot.scenario],
      ['答案值', snapshot.answer],
      ['回填形态', snapshot.form],
    ];
  },
});

const meta = {
  id: 'user-input',
  title: '扩展能力/上下文与文件/附件与用户输入',
  tags: ['!dev'],
  args: {
    scenario: 0,
  },
  argTypes: {
    scenario: {
      name: '答案场景',
      description:
        '四种回填形态:0 单选回 label、1 多选回数组、2 多选回逗号串、3 自由文本(Other 通道)。',
      control: {
        type: 'range',
        min: 0,
        max: 3,
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
