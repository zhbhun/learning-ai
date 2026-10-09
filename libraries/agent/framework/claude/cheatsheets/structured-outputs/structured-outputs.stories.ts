import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './structured-outputs-demo.ts?raw';
import {
  createStructuredOutputsDemo,
  type DemoInstance,
  type DemoSnapshot,
} from './structured-outputs-demo';

interface DemoArgs {
  scenario: number;
  attempt: number;
}

const renderInteractive = canvasStory({
  create: createStructuredOutputsDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['场景', snapshot.scenario],
      ['当前尝试', `${snapshot.attempt + 1} / ${snapshot.total}`],
      ['本次校验', snapshot.verdict],
      ['结局走向', snapshot.outcome],
    ];
  },
});

const meta = {
  id: 'structured-outputs',
  title: '配置与控制/输出控制/结构化输出',
  tags: ['!dev'],
  args: {
    scenario: 1,
    attempt: 0,
  },
  argTypes: {
    scenario: {
      name: '结局场景',
      description: '三种结局:0 一次合规、1 重试后合规、2 重试耗尽。',
      control: {
        type: 'range',
        min: 0,
        max: 2,
        step: 1,
      },
    },
    attempt: {
      name: '尝试步进',
      description: '查看第几次模型产出(从 0 开始;超出该场景的次数时停在最后一次)。',
      control: {
        type: 'range',
        min: 0,
        max: 2,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
