import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createExample, type SkillsInstance, type SkillsSnapshot } from './example';

interface SkillsArgs {
  agentSkill: 'none' | 'inline-notes' | 'inline-conflict';
  workspace: 'none' | 'project' | 'global' | 'both';
}

const render = canvasStory({
  create: createExample,
  apply(instance: SkillsInstance, args: SkillsArgs) {
    instance.update(args);
  },
  readout(snapshot: SkillsSnapshot) {
    return [
      ['发现顺序', snapshot.order],
      ['同名冲突', snapshot.winner],
      ['注入工具', snapshot.tools],
    ];
  },
  captions: ['Skills 发现与加载（离线模拟）', '同名优先级：agent 级 > 本地项目 > 全局目录'],
});

const meta = {
  id: 'skills',
  title: '6. 扩展能力/运行环境/Skills 技能包',
  tags: ['!dev'],
  args: {
    agentSkill: 'inline-conflict',
    workspace: 'both',
  },
  argTypes: {
    agentSkill: {
      name: 'agent 级技能',
      description: '用 createSkill 在 agent.skills 内联定义，或不在 agent 上挂技能',
      control: {
        type: 'radio',
        labels: {
          none: '不挂载',
          'inline-notes': '内联 release-notes',
          'inline-conflict': '内联同名 code-review',
        },
      },
      options: ['none', 'inline-notes', 'inline-conflict'],
    },
    workspace: {
      name: 'workspace 来源',
      description: 'workspace skills 路径指向哪些技能目录',
      control: {
        type: 'radio',
        labels: {
          none: '不挂载',
          project: '项目 ./skills',
          global: '全局 .mastra/skills',
          both: '两者并存（同名冲突）',
        },
      },
      options: ['none', 'project', 'global', 'both'],
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<SkillsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
