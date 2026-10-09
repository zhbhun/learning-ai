import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './skills-allowlist-demo.ts?raw';
import {
  createSkillsAllowlistDemo,
  type DemoInstance,
  type DemoSnapshot,
} from './skills-allowlist-demo';

interface DemoArgs {
  mode: 'omit' | 'all' | 'list' | 'none';
  pdf: boolean;
  commitHelper: boolean;
  securityCheck: boolean;
}

const renderInteractive = canvasStory({
  create: createSkillsAllowlistDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['init skills 数组', snapshot.initReadout],
      ['模型可见', snapshot.visibleReadout],
      ['Skill 工具调 commit-helper', snapshot.toolReadout],
      ['/commit-helper dispatch', snapshot.dispatchReadout],
    ];
  },
});

const meta = {
  id: 'skills',
  title: '扩展能力/子代理与扩展/Agent Skills',
  tags: ['!dev'],
  args: {
    mode: 'omit',
    pdf: true,
    commitHelper: false,
    securityCheck: true,
  },
  argTypes: {
    mode: {
      name: 'skills 选项',
      description:
        '四档取值:省略与 "all" 放行全部;名称列表只放行列出的;[] 全禁。',
      control: {
        type: 'select',
        labels: {
          omit: '省略(默认)',
          all: "'all'",
          list: '名称列表',
          none: '[]',
        },
      },
      options: ['omit', 'all', 'list', 'none'],
    },
    pdf: {
      name: '列表:pdf',
      description: '名称列表模式下是否列入 pdf;仅「名称列表」模式生效。',
      control: { type: 'boolean' },
    },
    commitHelper: {
      name: '列表:commit-helper',
      description:
        '名称列表模式下是否列入 commit-helper;默认不列入,用于观察未放行技能的三条路径。',
      control: { type: 'boolean' },
    },
    securityCheck: {
      name: '列表:security-check',
      description: '名称列表模式下是否列入 security-check;仅「名称列表」模式生效。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
