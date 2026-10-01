import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
  type RewriteKey,
} from './example';

interface ExampleArgs {
  rewrite: RewriteKey;
  step: number;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['回放步数', snapshot.stepLabel],
      ['当前阶段', snapshot.phaseLabel],
      ['传播方向', snapshot.directionLabel],
      ['模型收到', snapshot.modelSees],
      ['外层收到', snapshot.outerSees],
    ];
  },
});

const meta = {
  id: 'middleware',
  title: 'Agent 构建/中间件',
  tags: ['!dev'],
  args: {
    rewrite: 'none',
    step: 13,
  },
  argTypes: {
    rewrite: {
      name: '改写位置',
      description:
        'inner 层在哪一段改写：不改写、进入段改写 request（只影响更内层与模型）、返回段改写 AIMessage（只影响更外层）。',
      control: {
        type: 'radio',
        options: ['none', 'request', 'response'] satisfies RewriteKey[],
      },
    },
    step: {
      name: '回放步骤',
      description:
        '从第 1 步开始逐步推进，观察调用链先正序执行节点式钩子，再逐层进入 wrapModelCall 抵达模型后原路穿出，最后反序执行 after 钩子。',
      control: {
        type: 'range',
        min: 1,
        max: 13,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
