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

type WorkflowErrorHandlingArgs = ExampleArgs;

const render = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: WorkflowErrorHandlingArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['最终状态', snapshot.status],
      ['step2 尝试', `${snapshot.attempts} 次`],
      ['触发回调', snapshot.callbacks],
      ['走向', snapshot.route],
    ];
  },
  captions: ['失败重试轨迹', '离线示意 · 不调用真实 LLM'],
});

const meta = {
  id: 'workflow-error-handling',
  title: '3. 工作流/状态与恢复/错误处理',
  tags: ['!dev'],
  args: {
    failureMode: 'transient',
    retries: 2,
    fallbackOn: true,
  },
  argTypes: {
    failureMode: {
      name: '失败注入',
      description: 'step2 的失败类型：瞬时失败重试一次即恢复，持久失败重试无效。',
      options: ['none', 'transient', 'permanent'],
      control: {
        type: 'radio',
        labels: {
          none: '无失败',
          transient: '瞬时失败',
          permanent: '持久失败',
        },
      },
    },
    retries: {
      name: '重试次数',
      description: '对应 retries / retryConfig.attempts：失败后最多再尝试的次数。',
      control: { type: 'range', min: 0, max: 3, step: 1 },
    },
    fallbackOn: {
      name: '降级分支',
      description: '重试耗尽后是否经 branch 走 fallbackStep 降级路径。',
      control: { type: 'boolean' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<WorkflowErrorHandlingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
