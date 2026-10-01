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
      ['任务请求', snapshot.taskLabel],
      ['上下文模式', snapshot.modeLabel],
      ['主上下文消息', snapshot.mainMessages],
      ['子代理侧消息', snapshot.subMessages],
      ['委派次数', snapshot.delegations],
    ];
  },
});

const meta = {
  id: 'subagents',
  title: '多智能体与 Deep Agents/多智能体/子代理',
  tags: ['!dev'],
  args: {
    taskType: 'single',
    contextMode: 'isolated',
  },
  argTypes: {
    taskType: {
      name: '任务请求',
      description:
        '单域任务只派一个子代理；跨域任务单轮派出两个并行执行；模糊指代任务依赖主对话历史才能解析。',
      control: {
        type: 'inline-radio',
        options: ['single', 'cross', 'ambiguous'],
      },
      labels: {
        single: '单域：安排站会',
        cross: '跨域：订会议 + 发邮件',
        ambiguous: '模糊指代：改到同一时间',
      },
    },
    contextMode: {
      name: '上下文模式',
      description:
        'isolated（默认）：子代理只收到任务描述，完整历史留在隔离气泡里；fork：透传主对话历史，指代可解析但气泡更大。',
      control: {
        type: 'inline-radio',
        options: ['isolated', 'fork'],
      },
      labels: {
        isolated: 'isolated（默认隔离）',
        fork: 'fork（透传历史）',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
