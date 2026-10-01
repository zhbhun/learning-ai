import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createResponsibilityExample,
  type FocusKey,
  type ResponsibilityInstance,
  type ResponsibilityOptions,
  type ResponsibilitySnapshot,
} from './example';

const renderResponsibility = canvasStory({
  create: createResponsibilityExample,
  apply(instance: ResponsibilityInstance, args: ResponsibilityOptions) {
    instance.update(args);
  },
  readout(snapshot: ResponsibilitySnapshot) {
    return [
      ['关注点', snapshot.focusLabel],
      ['自托管承担', snapshot.selfHostedActor],
      ['托管承担', snapshot.managedActor],
      ['托管侧你写的', snapshot.youMaintain],
    ];
  },
});

interface ExampleArgs extends ResponsibilityOptions {}

const meta = {
  id: 'managed-deep-agents',
  title: '多智能体与 Deep Agents/Deep Agents/Managed Deep Agents',
  tags: ['!dev'],
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<ExampleArgs>;

const FOCUS_OPTIONS: FocusKey[] = [
  'runtime',
  'prompt',
  'drafts',
  'memory',
  'execute',
  'channel',
  'schedule',
];

export const ResponsibilityMatrix: Story = {
  args: {
    focusItem: 'memory',
  },
  argTypes: {
    focusItem: {
      name: '关注点',
      description:
        '同一职责在两种模式下的承担方式：自托管侧是你的代码与配置（backend / store / server / 自写集成），托管侧是一个声明文件加平台供给的运行时组件。',
      control: {
        type: 'radio',
        options: FOCUS_OPTIONS,
        labels: {
          runtime: '服务器与 API',
          prompt: '系统提示',
          drafts: '草稿与任务文件',
          memory: '跨会话记忆',
          execute: '代码执行沙箱',
          channel: '消息渠道',
          schedule: '定时运行',
        } satisfies Record<FocusKey, string>,
      },
    },
  },
  render: renderResponsibility,
  parameters: storySource(exampleSource),
};
