import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createAgentDemo, type AgentArgs, type AgentInstance, type AgentSnapshot } from './example';

type FileBasedAgentsArgs = AgentArgs;

const renderInteractive = canvasStory({
  create: createAgentDemo,
  apply(instance: AgentInstance, args: AgentArgs) {
    instance.update(args);
  },
  readout(snapshot: AgentSnapshot) {
    return [
      ['注册 id', snapshot.id],
      ['instructions 来源', snapshot.buildOk ? snapshot.instructionsSource : '构建失败'],
      ['生效 tools', snapshot.tools],
      ['构建结果', snapshot.buildNote],
    ];
  },
});

const meta = {
  id: 'file-based-agents',
  title: '9. 实战/文件式 Agent 与项目组织',
  tags: ['!dev'],
  args: {
    instructions: 'md',
    tools: 'dir',
  },
  argTypes: {
    instructions: {
      name: 'instructions 来源',
      description: '目录指令文件与 config.instructions 的组合，三者全缺则构建失败。',
      control: { type: 'radio' },
      options: ['md', 'ts', 'static', 'dynamic', 'missing'],
      labels: {
        md: 'instructions.md',
        ts: 'instructions.ts（.ts 与 .md 并存）',
        static: 'md + config 静态 instructions',
        dynamic: 'md + config 动态 instructions',
        missing: '全缺（构建失败）',
      },
    },
    tools: {
      name: 'tools 组成',
      description: 'tools/ 子目录与 config.tools 的合并与覆盖行为。',
      control: { type: 'radio' },
      options: ['dir', 'config', 'both', 'fn'],
      labels: {
        dir: '仅 tools/ 目录',
        config: '仅 config.tools 对象',
        both: '目录 + config 同名覆盖',
        fn: 'config.tools 函数',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<FileBasedAgentsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
