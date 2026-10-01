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
      ['任务场景', snapshot.scenarioLabel],
      ['回放步骤', snapshot.stepLabel],
      ['工具调用', snapshot.toolCalls],
      ['虚拟文件', snapshot.fileCount],
    ];
  },
});

const meta = {
  id: 'deep-agents-quickstart',
  title: '多智能体与 Deep Agents/Deep Agents/上手',
  tags: ['!dev'],
  args: {
    scenario: 'research',
    step: 8,
  },
  argTypes: {
    scenario: {
      name: '任务场景',
      description:
        '调研写报告：检索结果先卸载进文件系统再取回成稿；重构现有模块：先圈定文件，读改校验后删除旧文件。两种典型编排覆盖不同内置工具。',
      control: {
        type: 'inline-radio',
        options: ['research', 'refactor'],
      },
      labels: {
        research: '调研并写报告',
        refactor: '重构现有模块',
      },
    },
    step: {
      name: '回放步骤',
      description:
        '从第 1 步开始逐步执行，观察工具调用逐条追加、目录树随 write_file / edit_file / delete 演化。',
      control: {
        type: 'range',
        min: 1,
        max: 8,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
