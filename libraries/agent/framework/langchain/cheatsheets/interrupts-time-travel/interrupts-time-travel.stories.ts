import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import interruptReplaySource from './interrupt-replay.ts?raw';
import timeTravelSource from './time-travel.ts?raw';
import {
  createExample as createInterruptReplay,
  type ExampleInstance as InterruptReplayInstance,
  type ExampleOptions as InterruptReplayOptions,
  type ExampleSnapshot as InterruptReplaySnapshot,
  type DecisionKey,
} from './interrupt-replay';
import {
  createExample as createTimeTravel,
  type ExampleInstance as TimeTravelInstance,
  type ExampleOptions as TimeTravelOptions,
  type ExampleSnapshot as TimeTravelSnapshot,
  type TravelMode,
} from './time-travel';

interface InterruptReplayArgs {
  decision: DecisionKey;
  phase: number;
}

const renderInterruptReplay = canvasStory({
  create: createInterruptReplay,
  apply(instance: InterruptReplayInstance, args: InterruptReplayArgs) {
    instance.update(args);
  },
  readout(snapshot: InterruptReplaySnapshot) {
    return [
      ['前置代码执行', snapshot.preCodeRuns],
      ['interrupt() 调用', snapshot.interruptOutcome],
      ['节点完成', snapshot.nodeDone],
      ['最终 result', snapshot.result],
    ];
  },
});

interface TimeTravelArgs {
  mode: TravelMode;
  forkIndex: number;
}

const renderTimeTravel = canvasStory({
  create: createTimeTravel,
  apply(instance: TimeTravelInstance, args: TimeTravelArgs) {
    instance.update(args);
  },
  readout(snapshot: TimeTravelSnapshot) {
    return [
      ['选中快照', snapshot.selectedStep],
      ['generateTopic 重跑', snapshot.topicReruns],
      ['writeJoke 重跑', snapshot.jokeReruns],
      ['本次结局', snapshot.outcome],
    ];
  },
});

const meta = {
  id: 'interrupts-time-travel',
  title: 'LangGraph 图编排/中断与时间旅行',
  tags: ['!dev'],
} satisfies Meta;

export default meta;

type InterruptReplayStory = StoryObj<{
  decision: DecisionKey;
  phase: number;
}>;

export const InterruptReplay: InterruptReplayStory = {
  args: {
    decision: 'approve',
    phase: 2,
  },
  argTypes: {
    decision: {
      name: 'resume 值',
      description:
        "Command({ resume }) 传入的决定：interrupt() 恢复时原样返回它，决定 result 走「已发布」还是「已取消」。",
      control: {
        type: 'radio',
        options: ['approve', 'reject'] satisfies DecisionKey[],
      },
    },
    phase: {
      name: '回放阶段',
      description:
        '① 首次执行 → ② interrupt() 抛出挂起 → ③ resume 后节点从头重跑 → ④ interrupt() 返回 resume 值并完成。',
      control: {
        type: 'range',
        min: 1,
        max: 4,
        step: 1,
      },
    },
  },
  parameters: storySource(interruptReplaySource),
  render: renderInterruptReplay,
};

type TimeTravelStory = StoryObj<{
  mode: TravelMode;
  forkIndex: number;
}>;

export const TimeTravel: TimeTravelStory = {
  args: {
    mode: 'fork',
    forkIndex: 2,
  },
  argTypes: {
    mode: {
      name: '玩法',
      description:
        '重放：invoke(null, snapshot.config) 从历史点继续；分叉：updateState 改 state 再继续，原历史不动。',
      control: {
        type: 'inline-radio',
        options: ['replay', 'fork'] satisfies TravelMode[],
        labels: {
          replay: '重放（replay）',
          fork: '分叉（fork）',
        },
      },
    },
    forkIndex: {
      name: '时间坐标',
      description:
        'getStateHistory 选中的快照：step 0（generateTopic 待执行）、step 1（writeJoke 待执行）、step 2（已完成）。',
      control: {
        type: 'range',
        min: 1,
        max: 3,
        step: 1,
      },
    },
  },
  parameters: storySource(timeTravelSource),
  render: renderTimeTravel,
};
