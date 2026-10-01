import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './processor-pipeline.ts?raw';
import {
  createPipeline,
  type PipelineInstance,
  type PipelineSnapshot,
} from './processor-pipeline';

interface PipelineArgs {
  useLimiter: boolean;
  tokenBudget: number;
  filterToolCalls: boolean;
}

const renderInteractive = canvasStory({
  create: createPipeline,
  apply(instance: PipelineInstance, args: PipelineArgs) {
    instance.update(args);
  },
  readout(snapshot: PipelineSnapshot) {
    return [
      ['原始 token', snapshot.rawTokens],
      ['进入模型 token', snapshot.finalTokens],
      ['TokenLimiter 裁剪块', snapshot.limiterDropped],
      ['ToolCallFilter 过滤块', snapshot.toolFiltered],
    ];
  },
});

const meta = {
  id: 'processors',
  title: '2. Agent 进阶/输入输出处理器',
  tags: ['!dev'],
  args: {
    useLimiter: true,
    tokenBudget: 250,
    filterToolCalls: false,
  },
  argTypes: {
    useLimiter: {
      name: '启用 TokenLimiter',
      description: '从最旧的非 system 块开始丢弃，直到总 token 不超预算。',
      control: { type: 'boolean' },
    },
    tokenBudget: {
      name: '令牌预算',
      description: 'TokenLimiter 的预算上限，拖动后观察被裁剪的块。',
      control: { type: 'range', min: 60, max: 420, step: 30 },
    },
    filterToolCalls: {
      name: '启用 ToolCallFilter',
      description: '把 tool-call / tool-result 块从进入模型的消息里移除。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<PipelineArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
