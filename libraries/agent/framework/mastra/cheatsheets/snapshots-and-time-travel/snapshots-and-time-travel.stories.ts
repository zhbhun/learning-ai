import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createTimeTravelScene,
  type TimeTravelArgs,
  type TimeTravelInstance,
  type TimeTravelSnapshot,
} from './example';

interface TimeTravelStoryArgs extends TimeTravelArgs {}

const render = canvasStory({
  create: createTimeTravelScene,
  apply(instance: TimeTravelInstance, args: TimeTravelStoryArgs) {
    instance.update(args);
  },
  readout(snapshot: TimeTravelSnapshot) {
    return [
      ['重跑起点 step', snapshot.targetStep],
      ['覆盖 inputData', snapshot.inputData],
      ['context 来源', snapshot.contextSource],
      ['新轨迹结果', snapshot.replayStatus],
      ['关键判断', snapshot.note],
    ];
  },
});

const meta = {
  id: 'snapshots-and-time-travel',
  title: '3. 工作流/状态与恢复/快照与时间旅行',
  tags: ['!dev'],
  args: {
    travelStep: 'step-api',
    inputDataMode: 'corrected',
    contextSource: 'snapshot',
  },
  argTypes: {
    travelStep: {
      name: 'timeTravel 目标步骤',
      description: 'run.timeTravel({ step }) 的重跑起点；切换后画布重放一次分叉动画。',
      options: ['step-fetch', 'step-approve', 'step-api'],
      control: {
        type: 'radio',
        labels: {
          'step-fetch': 'step-fetch（第 1 步）',
          'step-approve': 'step-approve（第 2 步）',
          'step-api': 'step-api（故障步骤）',
        },
      },
    },
    inputDataMode: {
      name: 'inputData 覆盖',
      description: '传给目标步骤的输入：修正值让 step-api 重跑成功，原输入则再次失败。',
      options: ['corrected', 'original'],
      control: {
        type: 'radio',
        labels: {
          corrected: '修正输入 { value: 5 }',
          original: '沿用原输入 { value: 1 }',
        },
      },
    },
    contextSource: {
      name: 'context 来源',
      description: '目标步骤之前的结果从哪里重建：读取 workflow_snapshots 快照，或使用自定义 context 对象。',
      options: ['snapshot', 'custom'],
      control: {
        type: 'radio',
        labels: {
          snapshot: '存储快照（默认）',
          custom: '自定义 context',
        },
      },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<TimeTravelStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
