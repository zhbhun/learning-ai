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
      ['当前超步', snapshot.stepLabel],
      ['执行节点', snapshot.nodes],
      ['notes 通道', snapshot.notesLabel],
      ['results 通道', snapshot.resultsLabel],
    ];
  },
});

const meta = {
  id: 'graph-api',
  title: 'LangGraph 图编排/Graph API',
  tags: ['!dev'],
  args: {
    isRefund: true,
    notesConcat: false,
    fanout: 0,
  },
  argTypes: {
    isRefund: {
      name: '输入问题含「退款」',
      description:
        '打开时输入为「我要申请退款」，条件边路由到 billing；关闭时路由到 general。',
      control: { type: 'boolean' },
    },
    notesConcat: {
      name: 'notes 用追加合并',
      description:
        '关闭为默认的覆盖语义（最后写入生效）；打开后 notes 通道改为 concat reducer，节点返回值逐条累积。',
      control: { type: 'boolean' },
    },
    fanout: {
      name: 'Send 并行分支数',
      description:
        '0 表示走条件路由分支；大于 0 时条件边返回 Send ×N，worker 并行执行后经 results 通道汇合。',
      control: { type: 'range', min: 0, max: 3, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
