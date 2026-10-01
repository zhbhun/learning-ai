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
      ['任务形态', snapshot.taskLabel],
      ['裸 Agent 峰值', snapshot.barePeak],
      ['默认栈峰值', snapshot.harnessPeak],
      ['组合配置峰值', snapshot.fullPeak],
      ['卸载文件', snapshot.offloads],
      ['摘要次数', snapshot.summaries],
      ['task 委派', snapshot.delegations],
    ];
  },
});

const meta = {
  id: 'deep-agents-capabilities',
  title: '多智能体与 Deep Agents/Deep Agents/核心能力',
  tags: ['!dev'],
  args: {
    taskType: 'longResearch',
  },
  argTypes: {
    taskType: {
      name: '任务形态',
      description:
        '单次大结果触发 20k 卸载阈值；长程研究触发 128k 窗口的 85% 摘要线；领域问答 + 偏好记忆展示输入上下文的常驻与按需之别。',
      control: {
        type: 'inline-radio',
        options: ['bigResult', 'longResearch', 'domainMemory'],
      },
      labels: {
        bigResult: '单次大结果：工具返回 30k',
        longResearch: '长程研究：12 轮 × 12k',
        domainMemory: '领域问答 + 偏好记忆',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
