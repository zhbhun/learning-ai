import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './mcp-call-chain-demo.ts?raw';
import {
  createMcpChainDemo,
  type ChainDemoInstance,
  type ChainSnapshot,
  type TransportId,
} from './mcp-call-chain-demo';

interface DemoArgs {
  transport: TransportId;
  station: number;
}

const renderInteractive = canvasStory({
  create: createMcpChainDemo,
  apply(instance: ChainDemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: ChainSnapshot) {
    return [
      ['传输', snapshot.transportLabel],
      ['链路进度', snapshot.stationLabel],
      ['跨边界动作', snapshot.boundaryLabel],
      ['agent 侧可见', snapshot.agentSees],
    ];
  },
});

const meta = {
  id: 'mcp-server',
  title: '扩展能力/工具与 MCP/自建 MCP server',
  tags: ['!dev'],
  args: {
    transport: 'stdio',
    station: 0,
  },
  argTypes: {
    transport: {
      name: '传输',
      description:
        'agent 拿到自建 server 的两种形态:stdio 本地子进程,或 Streamable HTTP 端点。',
      control: {
        type: 'radio',
        labels: {
          stdio: 'stdio 本地进程',
          http: 'Streamable HTTP',
        },
      },
      options: ['stdio', 'http'],
    },
    station: {
      name: '链路进度',
      description:
        '回放到调用链的第几站(0-5):配置 → 拉起/连接 → initialize → 工具发现 → 工具调用 → 结果回传。',
      control: {
        type: 'range',
        min: 0,
        max: 5,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
