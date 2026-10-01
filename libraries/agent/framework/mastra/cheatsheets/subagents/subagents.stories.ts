import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
  type SubagentsArgs,
} from './example';

const render = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: SubagentsArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['委派路径', snapshot.path],
      ['结果引用', snapshot.refs.length ? snapshot.refs.join('、') : '无'],
      ['最终回答', snapshot.answer],
    ];
  },
});

const meta = {
  id: 'subagents',
  title: '6. 扩展能力/工具与互联/子代理与监督者',
  tags: ['!dev'],
  args: {
    taskType: 'research',
    startHook: 'proceed',
    resultRefs: true,
  },
  argTypes: {
    taskType: {
      name: '任务类型',
      description: 'supervisor 依据子代理 description 决定直接回答或委派给谁。',
      options: ['qa', 'research', 'writing', 'pipeline'],
      control: {
        type: 'radio',
        labels: {
          qa: '简单问答',
          research: '专题研究',
          writing: '文案撰写',
          pipeline: '研究+写作流水线',
        },
      },
    },
    startHook: {
      name: 'onDelegationStart',
      description: '委派开始钩子的三种行为：放行、改写提示词、拒绝委派。',
      options: ['proceed', 'rewrite', 'reject'],
      control: {
        type: 'radio',
        labels: { proceed: '放行', rewrite: '改写提示词', reject: '拒绝委派' },
      },
    },
    resultRefs: {
      name: '结果引用 [ref: id]',
      description: '对应 enableResultReferences，成功委派会拿到结果引用 ID。',
      control: { type: 'boolean' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<SubagentsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
