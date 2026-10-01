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
      ['路由方式', snapshot.modeLabel],
      ['判断调用', snapshot.judgeCalls],
      ['图步数', snapshot.steps],
    ];
  },
});

const meta = {
  id: 'multi-agent-overview',
  title: '多智能体与 Deep Agents/多智能体/概览与路由',
  tags: ['!dev'],
  args: {
    routingMode: 'static',
    taskType: 'overview',
  },
  argTypes: {
    routingMode: {
      name: '路由方式',
      description:
        '静态条件路由：入口一次分类后走固定链；supervisor 循环：每轮读全局消息再决定下一个 worker 还是输出 FINISH。',
      control: {
        type: 'inline-radio',
        options: ['static', 'supervisor'],
      },
      labels: {
        static: '静态条件路由',
        supervisor: 'supervisor 循环',
      },
    },
    taskType: {
      name: '任务',
      description:
        '技术综述需要调研和成稿（supervisor 会因草稿缺引用回流补做）；事实核查只需一次检索；文案润色直接改写。',
      control: {
        type: 'inline-radio',
        options: ['overview', 'factCheck', 'polish'],
      },
      labels: {
        overview: '技术综述',
        factCheck: '事实核查',
        polish: '文案润色',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
