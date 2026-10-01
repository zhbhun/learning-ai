import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './structured-output-pipeline.ts?raw';
import {
  STRATEGIES,
  createStructuredOutputPipeline,
  type StructuredOutputArgs,
  type StructuredOutputInstance,
  type StructuredOutputSnapshot,
} from './structured-output-pipeline';

interface StructuredOutputStoryArgs extends StructuredOutputArgs {}

const OUTCOME_LABEL: Record<StructuredOutputSnapshot['outcome'], string> = {
  object: 'response.object（校验通过）',
  'warn-object': '警告后继续，调用不中断',
  fallback: 'fallbackValue（兜底替换）',
  throw: '抛出错误，调用中断',
};

const renderInteractive = canvasStory({
  captions: [
    '同一 prompt 的两种结局（离线示意，不发起真实调用）',
    'structuredOutput',
  ],
  create: createStructuredOutputPipeline,
  apply(instance: StructuredOutputInstance, args: StructuredOutputStoryArgs) {
    instance.update(args);
  },
  readout(snapshot: StructuredOutputSnapshot) {
    return [
      ['执行结果', OUTCOME_LABEL[snapshot.outcome]],
      [
        'usedFallbackValue',
        snapshot.usedFallbackValue === null
          ? '—（无 response）'
          : String(snapshot.usedFallbackValue),
      ],
    ];
  },
});

const meta = {
  id: 'structured-output',
  title: '1. 起步/结构化输出',
  tags: ['!dev'],
  args: {
    errorStrategy: 'strict',
    simulateFailure: true,
  },
  argTypes: {
    errorStrategy: {
      name: 'errorStrategy',
      description:
        '解析或 schema 校验失败时的策略；strict 是官方默认，抛错中断调用。',
      options: [...STRATEGIES],
      control: {
        type: 'radio',
        labels: {
          strict: 'strict（默认：抛错）',
          warn: 'warn（警告后继续）',
          fallback: 'fallback（返回兜底值）',
        },
      },
    },
    simulateFailure: {
      name: '模拟校验失败',
      description:
        '开启后模型输出无法通过 schema 校验（summary 给了数字、priority 超出枚举）；关闭时返回合法结果。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<StructuredOutputStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
