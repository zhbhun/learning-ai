import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  MODES,
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
  type ModeId,
} from './example';

interface InstallationArgs {
  mode: ModeId;
  skills: boolean;
}

const modeOptions = MODES.map((mode) => mode.id);

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: InstallationArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['安装路径', snapshot.modeLabel],
      ['生成文件', snapshot.fileCount],
      ['选中', `${snapshot.selectedName} — ${snapshot.selectedNote}`],
      ['下一步', snapshot.next],
    ];
  },
});

const meta = {
  id: 'installation',
  title: '1. 起步/安装与项目结构',
  tags: ['!dev'],
  args: {
    mode: 'starter',
    skills: true,
  },
  argTypes: {
    mode: {
      name: '安装路径',
      description: '切换 create-mastra 的三种产物或手动安装，目录树与读数同步变化。',
      options: modeOptions,
      control: {
        type: 'radio',
        labels: Object.fromEntries(MODES.map((mode) => [mode.id, mode.label])),
      },
    },
    skills: {
      name: '安装 skills',
      description: '是否安装面向 AI 编码助手的 Mastra skills（脚手架默认自动装，手动路径用 npx skills add）。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<InstallationArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
