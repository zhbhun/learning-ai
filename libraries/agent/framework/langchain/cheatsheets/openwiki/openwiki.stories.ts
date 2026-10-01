import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleOptions,
  type ExampleSnapshot,
} from './example';

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleOptions) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['变更位置', snapshot.scenarioLabel],
      ['时间线进度', snapshot.stepLabel],
      ['Claim 状态', snapshot.claimState],
      ['PR 结论', snapshot.prLabel],
    ];
  },
});

const meta = {
  id: 'openwiki',
  title: '多智能体与 Deep Agents/OpenWiki',
  tags: ['!dev'],
  args: {
    scenario: 'inside',
    step: 5,
  },
  argTypes: {
    scenario: {
      name: '变更位置',
      description:
        '证据窗口内：改动命中 repo:// 锚点，Claim 转 stale、页面重写并开 PR；证据窗口外：复核通过、页面不动、不开 PR。对照两种增量更新结局。',
      control: {
        type: 'inline-radio',
        options: ['outside', 'inside'],
      },
      labels: {
        outside: '证据窗口外（L120）',
        inside: '证据窗口内（L55）',
      },
    },
    step: {
      name: '时间线进度',
      description:
        '从第 1 步 init 开始逐步推进：提交源码改动、执行 code --update、核对或重写页面、CI 给出 PR 决定。',
      control: {
        type: 'range',
        min: 1,
        max: 5,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleOptions>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
