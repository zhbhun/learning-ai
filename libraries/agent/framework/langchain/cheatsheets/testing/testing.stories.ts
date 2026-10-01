import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const renderPyramidMap = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['被测对象', snapshot.subject],
      ['落点层级', snapshot.layerName],
      ['模型', snapshot.model],
      ['断言', snapshot.assert],
    ];
  },
});

const meta = {
  id: 'testing',
  title: '观测、测试与部署/测试',
  tags: ['!dev'],
  args: {
    subject: 'tool',
  },
  argTypes: {
    subject: {
      name: '被测对象',
      description:
        '三种典型被测对象：工具函数=纯函数直接测；Agent 编排=真跑循环但模型用假模型；最终回答=只能用真实模型冒烟。切换后高亮金字塔对应层。',
      control: {
        type: 'inline-radio',
        labels: {
          tool: '工具函数',
          loop: 'Agent 编排',
          answer: '最终回答',
        } as Record<string, string>,
      },
    },
  },
  render: renderPyramidMap,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PyramidMap: Story = {};
