import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
  type FilterKey,
} from './example';

interface ExampleArgs {
  prefix: boolean;
  filter: FilterKey;
  useLocal: boolean;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['服务器名前缀', snapshot.prefixLabel],
      ['桥接工具', snapshot.bridgedTools],
      ['本地工具', snapshot.localTools],
      ['模型可见', snapshot.modelFaces],
    ];
  },
});

const meta = {
  id: 'mcp',
  title: 'Agent 构建/MCP 接入',
  tags: ['!dev'],
  args: {
    prefix: true,
    filter: 'all',
    useLocal: true,
  },
  argTypes: {
    prefix: {
      name: '服务器名前缀',
      description:
        'prefixToolNameWithServerName（默认开）：工具名变为「服务器名__原名」。关闭后两个 server 的 read_file 撞名，listTools() 抛 Tool name collision。',
      control: {
        type: 'boolean',
      },
    },
    filter: {
      name: 'listTools 过滤',
      description:
        'listTools() 的服务器过滤参数：all 表示不传参数取全部，其余只取指定 server 的工具。',
      control: {
        type: 'radio',
        options: ['all', 'filesystem', 'notes'] satisfies FilterKey[],
      },
    },
    useLocal: {
      name: '附带本地工具',
      description:
        'createAgent 的 tools 数组里同时放本地 tool() 定义的 get_weather：不经 adapter，不参与前缀与过滤。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
