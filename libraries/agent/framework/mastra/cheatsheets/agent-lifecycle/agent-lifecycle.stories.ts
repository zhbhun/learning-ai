import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createLifecycle,
  type LifecycleInstance,
  type LifecyclePhase,
  type LifecycleSnapshot,
} from './example';

interface LifecycleArgs {
  phase: LifecyclePhase;
  maxSteps: number;
}

const render = canvasStory({
  create: createLifecycle,
  apply(instance: LifecycleInstance, args: LifecycleArgs) {
    instance.update(args);
  },
  readout(snapshot: LifecycleSnapshot) {
    return [
      ['当前阶段', snapshot.phaseLabel],
      ['触发回调', snapshot.callbacks],
      ['模型步数上限', snapshot.maxStepsLabel],
    ];
  },
  captions: ['Agent 执行时间轴（离线示意）', '回调时机依据官方 Agent Lifecycle 指南'],
});

const meta = {
  id: 'agent-lifecycle',
  title: '2. Agent 进阶/Agent 执行机制',
  tags: ['!dev'],
  args: {
    phase: 'loop',
    maxSteps: 3,
  },
  argTypes: {
    phase: {
      name: '切换阶段',
      description: '查看准备 / 循环迭代 / 收尾各阶段按顺序触发的回调',
      control: {
        type: 'radio',
        labels: {
          prep: '准备',
          loop: '循环迭代',
          finalize: '收尾',
        },
      },
      options: ['prep', 'loop', 'finalize'],
    },
    maxSteps: {
      name: 'maxSteps（模型步上限）',
      description: 'generate() 选项，默认 5；调整后观察循环卡内的迭代徽章数量',
      control: {
        type: 'range',
        min: 1,
        max: 6,
        step: 1,
      },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<LifecycleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
