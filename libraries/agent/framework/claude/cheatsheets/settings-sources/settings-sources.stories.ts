import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './settings-sources-demo.ts?raw';
import {
  createSettingsSourcesDemo,
  type DemoInstance,
  type DemoSnapshot,
} from './settings-sources-demo';

interface DemoArgs {
  user: boolean;
  project: boolean;
  local: boolean;
  flag: boolean;
}

const renderInteractive = canvasStory({
  create: createSettingsSourcesDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['生效 model', snapshot.modelReadout],
      ['allow 规则', snapshot.allowReadout],
      ['记忆文件', snapshot.memoryReadout],
      ['隔离模式', snapshot.isolationReadout],
    ];
  },
});

const meta = {
  id: 'settings-sources',
  title: '配置与控制/配置体系/设置来源',
  tags: ['!dev'],
  args: {
    user: true,
    project: true,
    local: true,
    flag: false,
  },
  argTypes: {
    user: {
      name: 'user 全局层',
      description: '开关 ~/.claude/settings.json 与用户级 CLAUDE.md 的加载。',
      control: { type: 'boolean' },
    },
    project: {
      name: 'project 项目层',
      description: '开关 <cwd>/.claude/settings.json 与项目 CLAUDE.md 的加载;关掉即验证 CLAUDE.md 随它加载。',
      control: { type: 'boolean' },
    },
    local: {
      name: 'local 个人层',
      description: '开关 <cwd>/.claude/settings.local.json 与 CLAUDE.local.md 的加载。',
      control: { type: 'boolean' },
    },
    flag: {
      name: 'settings 标志层',
      description: '开关 Options.settings 注入的标志层;开启后观察它盖过所有文件层。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
