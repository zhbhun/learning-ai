import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  EVALUATOR_LABEL,
  THRESHOLD,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const renderEvaluatorLab = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['评估器', EVALUATOR_LABEL[snapshot.evaluator]],
      ['版本', snapshot.version === 'v1' ? 'v1 · baseline' : 'v2 · candidate'],
      ['得分', snapshot.score.toFixed(2)],
      [`门禁 ≥${THRESHOLD.toFixed(2)}`, snapshot.gate],
      [
        '对比 v1',
        `${snapshot.delta >= 0 ? '+' : ''}${snapshot.delta.toFixed(2)}`,
      ],
    ];
  },
});

const meta = {
  id: 'agent-evals',
  title: '观测、测试与部署/Agent 评估',
  tags: ['!dev'],
  args: {
    evaluator: 'judge',
    version: 'v1',
  },
  argTypes: {
    evaluator: {
      name: '评估器',
      description:
        '同一批答案在不同评估器下的判定：exact=逐字相等（漏判语义等价）；contains=关键词全命中；judge=LLM-as-judge 语义判定（分数为预置模拟值）。',
      control: {
        type: 'inline-radio',
        labels: {
          exact: '精确匹配',
          contains: '关键词包含',
          judge: 'LLM-judge（模拟）',
        } as Record<string, string>,
      },
    },
    version: {
      name: '版本',
      description:
        '回归前后对比：v1=baseline；v2=改提示词（要求照抄工具输出）后的 candidate——修好 E2/E4，但 E3 出现温度幻觉。',
      control: {
        type: 'inline-radio',
        labels: {
          v1: 'v1 · baseline',
          v2: 'v2 · candidate',
        } as Record<string, string>,
      },
    },
  },
  render: renderEvaluatorLab,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const EvaluatorLab: Story = {};
