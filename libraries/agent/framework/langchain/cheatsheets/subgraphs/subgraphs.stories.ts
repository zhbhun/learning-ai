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
      ['父图 foo', snapshot.parentFoo],
      ['子图 state', snapshot.subState],
      ['子图 checkpoint_ns', snapshot.subNamespace],
    ];
  },
});

const meta = {
  id: 'subgraphs',
  title: 'LangGraph 图编排/子图',
  tags: ['!dev'],
  args: {
    linkMode: 'shared',
    subSteps: 2,
  },
  argTypes: {
    linkMode: {
      name: '通信模式',
      description:
        '父子图 schema 一致选共享状态键（编译后的子图直接挂给 addNode）；不一致选包装节点（父节点内 invoke 并显式转换输入输出）。',
      control: { type: 'inline-radio' },
      options: ['shared', 'wrapper'],
      labels: {
        shared: '共享状态键',
        wrapper: '包装节点',
      },
    },
    subSteps: {
      name: '子图推进',
      description:
        '0 尚未进入子图；1 subgraphNode1 完成（私有 bar 就绪）；2 子图跑完且 node1 返回（父图 foo 被写回）。',
      control: { type: 'range', min: 0, max: 2, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
