import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './slash-commands-demo.ts?raw';
import {
  createSlashCommandsDemo,
  type DemoInstance,
  type DemoOptions,
  type DemoSnapshot,
} from './slash-commands-demo';

interface DemoArgs {
  user: boolean;
  project: boolean;
  cwdWeb: boolean;
  readNested: boolean;
}

const renderInteractive = canvasStory({
  create: createSlashCommandsDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['启动时可用', snapshot.countReadout],
      ['仓库根命令', snapshot.repoReadout],
      ['嵌套命令', snapshot.nestedReadout],
    ];
  },
});

const meta = {
  id: 'slash-commands',
  title: '扩展能力/子代理与扩展/Slash 命令',
  tags: ['!dev'],
  args: {
    user: true,
    project: true,
    cwdWeb: false,
    readNested: false,
  },
  argTypes: {
    user: {
      name: 'user 层',
      description: '开关 ~/.claude 下命令(skills/commands)的加载。',
      control: { type: 'boolean' },
    },
    project: {
      name: 'project 层',
      description: '开关仓库内命令的加载;关掉后 user 层命令仍在。',
      control: { type: 'boolean' },
    },
    cwdWeb: {
      name: '启动于 packages/web',
      description: '切换启动目录:仓库根 ↔ packages/web 子目录;观察仓库根命令是否仍回溯可见。',
      control: { type: 'boolean' },
    },
    readNested: {
      name: 'agent 已读取 packages/web',
      description: '模拟 agent 读取该子树文件后的按需加载;对应一条 commands_changed 通知。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
