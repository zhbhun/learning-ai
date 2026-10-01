import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createCodeModeDemo,
  type CodeModeInstance,
  type CodeModeOptions,
  type CodeModeSnapshot,
} from './example';

interface CodeModeArgs extends CodeModeOptions {}

const renderCodeMode = canvasStory({
  create: createCodeModeDemo,
  apply(instance: CodeModeInstance, args: CodeModeArgs) {
    instance.update(args);
  },
  readout(snapshot: CodeModeSnapshot) {
    return [
      ['模型往返次数', snapshot.modelRounds],
      ['累计 token（示意）', snapshot.totalTokens.toLocaleString('zh-Hans-CN')],
      ['工具执行位置', snapshot.toolExec],
    ];
  },
  captions: ['离线示意计算 · 不调用真实模型', '工具永远在宿主执行，进沙箱的只有编排代码'],
});

const meta = {
  id: 'code-mode',
  title: '2. Agent 进阶/代码模式',
  tags: ['!dev'],
  args: {
    mode: 'loop',
    toolCalls: 5,
  },
  argTypes: {
    mode: {
      name: '执行路径',
      description: '切换传统工具循环与代码模式的执行时间轴。',
      control: {
        type: 'radio',
        labels: {
          loop: '传统循环',
          code: '代码模式',
        },
      },
      options: ['loop', 'code'],
    },
    toolCalls: {
      name: '编排中的工具调用次数',
      description: '完成一次聚合任务需要调用的工具数量（示意）。',
      control: {
        type: 'range',
        min: 1,
        max: 10,
        step: 1,
      },
    },
  },
  render: renderCodeMode,
  parameters: storySource(exampleSource),
} satisfies Meta<CodeModeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
