import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './state-machine.ts?raw';
import {
  createSuspendResumeMachine,
  type SuspendResumeArgs,
  type SuspendResumeInstance,
  type SuspendResumeSnapshot,
} from './state-machine';

interface SuspendResumeStoryArgs {
  suspendStep: SuspendResumeArgs['suspendStep'];
  resumeData: SuspendResumeArgs['resumeData'];
  storage: SuspendResumeArgs['storage'];
}

const render = canvasStory({
  create: createSuspendResumeMachine,
  apply(instance: SuspendResumeInstance, args: SuspendResumeStoryArgs) {
    instance.update(args);
  },
  readout(snapshot: SuspendResumeSnapshot) {
    return [
      ['最终状态', snapshot.status],
      ['挂起路径 result.suspended', snapshot.suspendedPath],
      ['恢复提交 resumeData', snapshot.resumeData],
      ['关键判断', snapshot.note],
    ];
  },
});

const meta = {
  id: 'suspend-and-resume',
  title: '3. 工作流/状态与恢复/挂起与恢复',
  tags: ['!dev'],
  args: {
    suspendStep: 'step-approve',
    resumeData: 'approve',
    storage: 'libsql',
  },
  argTypes: {
    suspendStep: {
      name: '挂起点位置',
      description: 'suspend() 调用所在的步骤；切换后画布重放一次完整执行。',
      options: ['step-fetch', 'step-approve', 'step-notify'],
      control: {
        type: 'radio',
        labels: {
          'step-fetch': 'step-fetch（第 1 步）',
          'step-approve': 'step-approve（第 2 步）',
          'step-notify': 'step-notify（第 3 步）',
        },
      },
    },
    resumeData: {
      name: '恢复数据 resumeData',
      description: 'run.resume() 提交的审批结果：approved=true 重跑后继续；false 条件不满足、再次挂起。',
      options: ['approve', 'reject'],
      control: {
        type: 'radio',
        labels: {
          approve: 'approved: true',
          reject: 'approved: false',
        },
      },
    },
    storage: {
      name: 'storage 快照存储',
      description: '未配置持久化存储时快照不落盘，进程重启后挂起的 run 无法恢复。',
      options: ['libsql', 'none'],
      control: {
        type: 'radio',
        labels: {
          libsql: 'LibSQLStore（默认）',
          none: '未配置',
        },
      },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<SuspendResumeStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
