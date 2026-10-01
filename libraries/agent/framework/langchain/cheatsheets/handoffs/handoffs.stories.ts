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
      ['活跃 Agent', snapshot.activeLabel],
      ['控制权转移', snapshot.movesText],
      [snapshot.contextName, snapshot.contextCount],
    ];
  },
});

const meta = {
  id: 'handoffs',
  title: '多智能体与 Deep Agents/多智能体/移交',
  tags: ['!dev'],
  args: {
    pattern: 'handoff',
    scenario: 'login',
  },
  argTypes: {
    pattern: {
      name: '协作模式',
      description:
        'handoff 转交：控制权随 transfer_to_x 整体移交，共享历史延续；subagent 委派：主 agent 保持控制权，子 agent 在隔离上下文工作后回传结果。',
      control: {
        type: 'inline-radio',
        options: ['handoff', 'subagent'],
      },
      labels: {
        handoff: 'handoff 转交',
        subagent: 'subagent 委派',
      },
    },
    scenario: {
      name: '对话场景',
      description:
        '购买咨询无需转移；登录故障触发一次转交或委派；价格加故障在 handoff 模式下出现 sales→support→sales 的乒乓回环。',
      control: {
        type: 'inline-radio',
        options: ['purchase', 'login', 'mixed'],
      },
      labels: {
        purchase: '购买咨询',
        login: '登录故障',
        mixed: '价格加故障',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
