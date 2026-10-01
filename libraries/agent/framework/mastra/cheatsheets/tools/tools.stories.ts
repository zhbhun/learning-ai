import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './tool-pipeline.ts?raw';
import {
  QUERIES,
  createToolPipeline,
  type ToolPipelineArgs,
  type ToolPipelineInstance,
  type ToolPipelineSnapshot,
} from './tool-pipeline';

interface ToolsArgs extends ToolPipelineArgs {}

const renderInteractive = canvasStory({
  captions: [
    '工具调用流水线（离线示意，不发起真实调用）',
    'get-customer',
  ],
  create: createToolPipeline,
  apply(instance: ToolPipelineInstance, args: ToolsArgs) {
    instance.update(args);
  },
  readout(snapshot: ToolPipelineSnapshot) {
    return [
      ['工具执行', snapshot.executed ? '已执行' : '已拦截（proceed: false）'],
      [
        '到达模型',
        `${snapshot.modelChars} 字符（完整结果 ${snapshot.fullChars} 字符）`,
      ],
      ['到达 UI', `phone: ${snapshot.uiPhone}`],
    ];
  },
});

const meta = {
  id: 'tools',
  title: '1. 起步/工具',
  tags: ['!dev'],
  args: {
    query: 'alice',
    slimForModel: true,
    redactForUi: true,
  },
  argTypes: {
    query: {
      name: '查询姓名',
      description:
        'alice 在 beforeToolCall 白名单内；eve 不在名单内，会触发 proceed: false 拦截。',
      options: [...QUERIES],
      control: {
        type: 'radio',
        labels: {
          alice: 'alice（白名单内）',
          eve: 'eve（不在白名单）',
        },
      },
    },
    slimForModel: {
      name: 'toModelOutput 瘦身',
      description:
        '开启后模型上下文只收到一行摘要；关闭后完整 JSON（含敏感字段与长文本）进入模型。',
      control: { type: 'boolean' },
    },
    redactForUi: {
      name: 'transform 脱敏',
      description:
        '开启后 UI 分支的手机号打码显示；关闭后原文直接渲染给用户界面。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ToolsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
