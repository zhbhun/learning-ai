import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './sandbox-enforcement-demo.ts?raw';
import {
  createSandboxEnforcementDemo,
  type DemoArgs,
  type DemoInstance,
  type DemoSnapshot,
} from './sandbox-enforcement-demo';

const renderInteractive = canvasStory({
  create: createSandboxEnforcementDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['沙箱内免提示', `${snapshot.autoCount} 条`],
      ['需审批', `${snapshot.promptCount} 条`],
      ['拒绝', `${snapshot.deniedCount} 条`],
      ['逃逸口', snapshot.escapeReadout],
    ];
  },
});

const meta = {
  id: 'sandbox',
  title: '配置与控制/权限与安全/沙箱',
  tags: ['!dev'],
  args: {
    enabled: true,
    autoAllow: true,
    allowUnsandboxed: true,
  } satisfies DemoArgs,
  argTypes: {
    enabled: {
      name: 'sandbox.enabled',
      description: '沙箱总开关(默认 false)。关闭即整体不启用,全部命令走常规权限流。',
      control: { type: 'boolean' },
    },
    autoAllow: {
      name: 'autoAllowBashIfSandboxed',
      description: '沙箱内 Bash 是否免提示(默认 true)。关闭后观察沙箱内命令也逐条需审批。',
      control: { type: 'boolean' },
    },
    allowUnsandboxed: {
      name: 'allowUnsandboxedCommands',
      description: '是否接受 dangerouslyDisableSandbox 逃逸(默认 true)。关闭即严格模式,观察逃逸参数被完全忽略。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
