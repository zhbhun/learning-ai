import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
  type InputGuardKey,
  type OutputGuardKey,
} from './example';

interface ExampleArgs {
  inputGuard: InputGuardKey;
  outputGuard: OutputGuardKey;
  step: number;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['输入护栏', snapshot.inputGuardAction],
      ['模型调用', snapshot.modelCalls],
      ['输出护栏', snapshot.outputGuardAction],
      ['invoke 结局', snapshot.ending],
    ];
  },
});

const meta = {
  id: 'guardrails',
  title: 'Agent 构建/护栏',
  tags: ['!dev'],
  args: {
    inputGuard: 'redact',
    outputGuard: 'retry',
    step: 8,
  },
  argTypes: {
    inputGuard: {
      name: '输入护栏',
      description:
        '模型调用前的处置：off 原样放行、redact 改写（PII 脱敏后继续）、block 拦截（合成拒绝回复并 jumpTo end）。',
      control: {
        type: 'radio',
        options: ['off', 'redact', 'block'] satisfies InputGuardKey[],
      },
    },
    outputGuard: {
      name: '输出护栏',
      description:
        '模型返回后的处置：pass 校验通过、flag 命中敏感词拦截替换、retry schema 校验失败后合成修正请求重试。',
      control: {
        type: 'radio',
        options: ['pass', 'flag', 'retry'] satisfies OutputGuardKey[],
      },
    },
    step: {
      name: '回放步骤',
      description:
        '从第 1 段开始逐步追加：输入 → 输入护栏 → 模型 → 输出护栏 →（重试时）修正请求 → 第 2 轮 → 再检。',
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
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
