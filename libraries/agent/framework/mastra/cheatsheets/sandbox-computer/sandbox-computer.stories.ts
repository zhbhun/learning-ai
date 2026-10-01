import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const render = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['当前动作', snapshot.action],
      ['循环阶段', snapshot.stage],
      ['动作后截图', snapshot.shot],
      ['需要审批', snapshot.approval],
    ];
  },
});

const meta = {
  id: 'sandbox-computer',
  title: '6. 扩展能力/运行环境/桌面沙箱',
  tags: ['!dev'],
  args: {
    step: 0,
    screenshotAfterAction: true,
    requireApproval: true,
  },
  argTypes: {
    step: {
      name: '循环步进',
      description: '推进 agent 的观察-行动循环：截图→点击→定位→键入→回看。',
      control: { type: 'range', min: 0, max: 4, step: 1 },
    },
    screenshotAfterAction: {
      name: '动作后自动截图',
      description: '对应 computer 工具的 screenshotAfterAction（默认 true）。',
      control: { type: 'boolean' },
    },
    requireApproval: {
      name: '键入需审批',
      description: '对应 computer_type 的 requireApproval（默认 false）。',
      control: { type: 'boolean' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
