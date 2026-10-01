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
      ['推荐入口', snapshot.pick],
      ['结构形态', snapshot.shapeLabel],
      ['人审中断', snapshot.reviewNote],
    ];
  },
});

const meta = {
  id: 'langgraph-thinking',
  title: 'LangGraph 图编排/LangGraph 思维模型',
  tags: ['!dev'],
  args: {
    modelDecides: true,
    complexStructure: false,
    embedExisting: false,
    needReview: false,
  },
  argTypes: {
    modelDecides: {
      name: '下一步由模型决定',
      description:
        '分支走向需要模型按输入实时决定（agent 一侧）；关闭则路径可在写代码时定死（workflow 一侧）。',
      control: { type: 'boolean' },
    },
    complexStructure: {
      name: '并行 / 汇合 / 显式状态',
      description:
        '存在并行后再汇合、多个决策点，或多个步骤要显式共享 state（偏向 Graph API）。',
      control: { type: 'boolean' },
    },
    embedExisting: {
      name: '优先嵌入既有代码',
      description:
        '希望把编排嵌进既有过程式代码、尽量少改结构（偏向 Functional API）。',
      control: { type: 'boolean' },
    },
    needReview: {
      name: '需要人审中断',
      description:
        '流程中要暂停等人审批。不改变推荐结果：三条线都支持 interrupt，落地需要 checkpointer。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
