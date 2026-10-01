import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createDemo, type DemoArgs, type DemoInstance, type DemoSnapshot } from './example';

const render = canvasStory({
  create: createDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['定义 id', snapshot.workflowId],
      ['注册', snapshot.registered],
      ['执行序列', snapshot.steps],
      ['状态', snapshot.status],
    ];
  },
  captions: ['JSON 定义 → 执行图（离线示意）'],
});

const meta = {
  id: 'dynamic-workflows',
  title: '3. 工作流/运行方式/动态工作流',
  tags: ['!dev'],
  args: {
    definition: 'chain',
    amount: 100,
  },
  argTypes: {
    definition: {
      name: 'JSON 定义',
      description: '切换预置工作流定义，重新注册并按新步骤图执行。',
      control: { type: 'radio' },
      options: ['chain', 'branch'],
      labels: { chain: '顺序链 greeting-pipeline', branch: '分支 support-router' },
    },
    amount: {
      name: '运行输入 amount',
      description: '分支定义中 condition 条目的判断输入，amount >= 100 走 vip。',
      control: { type: 'number', min: 0, max: 200, step: 10 },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
