import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './hybrid-pipeline.ts?raw';
import {
  createHybridPipeline,
  type HybridPipelineArgs,
  type HybridPipelineInstance,
  type HybridPipelineSnapshot,
} from './hybrid-pipeline';

interface PipelineArgs {
  coreStep: HybridPipelineArgs['coreStep'];
  structuredOutput: boolean;
}

const render = canvasStory({
  create: createHybridPipeline,
  apply(instance: HybridPipelineInstance, args: PipelineArgs) {
    instance.update(args);
  },
  readout(snapshot: HybridPipelineSnapshot) {
    return [
      ['核心步骤', snapshot.coreStepLabel],
      ['确定性', snapshot.deterministic],
      ['耗时示意', snapshot.latency],
      ['输出形态', snapshot.outputShape],
      ['图谱记录', snapshot.graphEntry],
    ];
  },
});

const meta = {
  id: 'agents-and-tools-in-workflows',
  title: '3. 工作流/编排基础/工作流中的 Agent 与工具',
  tags: ['!dev'],
  args: {
    coreStep: 'agent',
    structuredOutput: false,
  },
  argTypes: {
    coreStep: {
      name: '核心步骤实现',
      description: '把同一段核心处理分别实现为代码步骤、工具步骤或 agent 步骤。',
      options: ['code', 'tool', 'agent'],
      control: {
        type: 'radio',
        labels: {
          code: '代码步骤',
          tool: '工具步骤 createStep(tool)',
          agent: 'agent 步骤 .agent()',
        },
      },
    },
    structuredOutput: {
      name: 'structuredOutput',
      description: '仅对 agent 步骤生效：开启后输出被 schema 约束为结构化字段。',
      control: { type: 'boolean' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<PipelineArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
