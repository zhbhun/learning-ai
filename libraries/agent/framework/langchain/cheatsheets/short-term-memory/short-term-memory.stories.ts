import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

interface ExampleArgs {
  turns: number;
  budget: number;
  keep: number;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['历史总量', `${snapshot.historyCount} 条 / ${snapshot.historyTokens} tok`],
      ['裁剪窗口', `${snapshot.trimCount} 条 / ${snapshot.trimTokens} tok`],
      [
        '摘要窗口',
        snapshot.summaryTriggered
          ? `${snapshot.summaryCount} 条 / ${snapshot.summaryTokens} tok`
          : '未触发',
      ],
      [
        '姓名（裁剪/摘要）',
        `${snapshot.trimHasName ? '在' : '不在'} / ${snapshot.summaryHasName ? '在' : '不在'}`,
      ],
    ];
  },
});

const meta = {
  id: 'short-term-memory',
  title: 'Agent 构建/短期记忆',
  tags: ['!dev'],
  args: {
    turns: 6,
    budget: 300,
    keep: 3,
  },
  argTypes: {
    turns: {
      name: '对话轮数',
      description: '控制 thread 内累积的消息历史长度（每轮 human + ai 两条）。',
      control: {
        type: 'range',
        min: 3,
        max: 6,
        step: 1,
      },
    },
    budget: {
      name: 'token 预算',
      description:
        '同时充当裁剪的 maxTokens 与摘要的 trigger.tokens：预算越小，两种策略的差异越明显。',
      control: {
        type: 'range',
        min: 100,
        max: 420,
        step: 20,
      },
    },
    keep: {
      name: '摘要保留消息数',
      description: '摘要触发后原样保留的最近消息条数（keep.messages）。',
      control: {
        type: 'range',
        min: 1,
        max: 4,
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
