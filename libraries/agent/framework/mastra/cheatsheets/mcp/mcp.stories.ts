import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createMcpExample, type McpInstance, type McpSnapshot } from './example';

interface McpArgs {
  mode: 'client' | 'server';
  connection: 'stdio' | 'url';
  approval: 'off' | 'sensitive' | 'all';
}

const renderInteractive = canvasStory({
  create: createMcpExample,
  apply(instance: McpInstance, args: McpArgs) {
    instance.update(args);
  },
  readout(snapshot: McpSnapshot) {
    return [
      ['工具流向', snapshot.flow],
      [
        '审批拦截',
        snapshot.mode === 'server'
          ? '不适用（客户端能力）'
          : snapshot.blocked.length
            ? snapshot.blocked.join('、')
            : '无',
      ],
      ['放行工具数', snapshot.mode === 'server' ? '-' : snapshot.passed],
    ];
  },
});

const meta = {
  id: 'mcp',
  title: '6. 扩展能力/工具与互联/MCP',
  tags: ['!dev'],
  args: { mode: 'client', connection: 'stdio', approval: 'sensitive' },
  argTypes: {
    mode: {
      name: '方向',
      description: '作为客户端接入外部工具，或作为服务端暴露 Mastra 能力。',
      options: ['client', 'server'],
      control: { type: 'radio', labels: { client: '作为客户端', server: '作为服务端' } },
    },
    connection: {
      name: '连接方式',
      description: 'stdio 本地子进程或远程 Streamable HTTP，仅客户端方向生效。',
      options: ['stdio', 'url'],
      control: { type: 'radio', labels: { stdio: 'stdio 本地', url: 'URL 远程' } },
      if: { arg: 'mode', eq: 'client' },
    },
    approval: {
      name: '审批策略',
      description: 'requireToolApproval：不审批 / 按工具名审批 / 全部审批。',
      options: ['off', 'sensitive', 'all'],
      control: {
        type: 'radio',
        labels: { off: '不审批', sensitive: '按工具名审批', all: '全部审批' },
      },
      if: { arg: 'mode', eq: 'client' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<McpArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
