import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './agent-config-flow.ts?raw';
import {
  INSTRUCTION_LEVELS,
  RUN_MODES,
  createAgentConfigFlow,
  type AgentConfigArgs,
  type AgentConfigInstance,
  type AgentConfigSnapshot,
} from './agent-config-flow';

const renderInteractive = canvasStory({
  create: createAgentConfigFlow,
  apply(instance: AgentConfigInstance, args: AgentConfigArgs) {
    instance.update(args);
  },
  readout(snapshot: AgentConfigSnapshot) {
    return [
      ['预测行为', snapshot.behavior],
      ['工具调用', snapshot.tool],
      ['输出形态', snapshot.output],
    ];
  },
});

const meta = {
  id: 'first-agent',
  title: '1. 起步/第一个 Agent',
  tags: ['!dev'],
  args: {
    instructionLevel: 'full',
    withTool: true,
    runMode: 'stream',
  },
  argTypes: {
    instructionLevel: {
      name: 'instructions 明确度',
      description:
        '从抽象一句话到「角色+规则+输出要求」三段式；左侧配置卡与「预测行为」读数同步变化。',
      options: [...INSTRUCTION_LEVELS],
      control: {
        type: 'radio',
        labels: {
          vague: '一句话（无规则）',
          role: '角色一句话',
          full: '角色+规则+输出要求',
        },
      },
    },
    withTool: {
      name: '挂载 get-weather 工具',
      description:
        '打开后执行流程出现工具调用回路，「工具调用」读数与底部提示同步变化。',
      control: { type: 'boolean' },
    },
    runMode: {
      name: '运行方式',
      description:
        'generate 一次性返回完整结果；stream 经 textStream 逐块输出；响应区随之切换。',
      options: [...RUN_MODES],
      control: {
        type: 'radio',
        labels: {
          generate: 'generate（一次性）',
          stream: 'stream（逐块）',
        },
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<AgentConfigArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
