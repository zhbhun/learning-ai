import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createGuardrailDemo,
  type GuardrailInstance,
  type GuardrailOptions,
  type GuardrailSnapshot,
} from './example';

interface GuardrailsArgs extends GuardrailOptions {}

const renderGuardrails = canvasStory({
  create: createGuardrailDemo,
  apply(instance: GuardrailInstance, args: GuardrailsArgs) {
    instance.update(args);
  },
  readout(snapshot: GuardrailSnapshot) {
    return [
      ['tripwire', snapshot.tripwire ? '已触发' : '未触发'],
      ['拦截位置', snapshot.tripwire ? snapshot.processorId : '—'],
      ['输出形态', snapshot.outcome],
    ];
  },
  captions: ['离线模拟 · 不调用真实模型', '输入端 → 防护门 → 输出端'],
});

const meta = {
  id: 'guardrails',
  title: '2. Agent 进阶/安全防护',
  tags: ['!dev'],
  args: {
    inputType: 'injection',
    injectionStrategy: 'block',
    piiStrategy: 'redact',
  },
  argTypes: {
    inputType: {
      name: '输入文本类型',
      description: '切换进入防护门的用户文本样本。',
      control: {
        type: 'radio',
        labels: {
          normal: '正常文本',
          injection: '含注入模式',
          pii: '含 PII',
        },
      },
      options: ['normal', 'injection', 'pii'],
    },
    injectionStrategy: {
      name: '注入检测策略',
      description: 'PromptInjectionDetector 命中注入模式时执行的策略。',
      control: {
        type: 'select',
        labels: {
          block: 'block（拦截）',
          rewrite: 'rewrite（改写）',
          detect: 'detect（仅检测）',
        },
      },
      options: ['block', 'rewrite', 'detect'],
    },
    piiStrategy: {
      name: 'PII 检测策略',
      description: 'PIIDetector 命中个人身份信息时执行的策略。',
      control: {
        type: 'select',
        labels: {
          block: 'block（拦截）',
          redact: 'redact（掩码）',
          detect: 'detect（仅检测）',
        },
      },
      options: ['block', 'redact', 'detect'],
    },
  },
  render: renderGuardrails,
  parameters: storySource(exampleSource),
} satisfies Meta<GuardrailsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
