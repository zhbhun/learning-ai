import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './mcp-status-demo.ts?raw';
import {
  createMcpStatusDemo,
  type StatusDemoInstance,
  type StatusSnapshot,
} from './mcp-status-demo';

interface DemoArgs {
  scenario: number;
  step: number;
}

const renderInteractive = canvasStory({
  create: createMcpStatusDemo,
  apply(instance: StatusDemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: StatusSnapshot) {
    return [
      ['场景', snapshot.scenarioLabel],
      ['核对点', snapshot.checkpointLabel],
      ['server 状态', snapshot.statusReadout],
    ];
  },
});

const meta = {
  id: 'mcp-integration',
  title: '扩展能力/工具与 MCP/接入 MCP server',
  tags: ['!dev'],
  args: {
    scenario: 0,
    step: 0,
  },
  argTypes: {
    scenario: {
      name: '连接场景',
      description:
        '四种场景:0 全部连上、1 stdio 拉不起来、2 远程要认证、3 缓存列表 pending。',
      control: {
        type: 'range',
        min: 0,
        max: 3,
        step: 1,
      },
    },
    step: {
      name: '核对步进',
      description:
        '核对点:0 init 消息、1 mcpServerStatus()、2 处理动作后。',
      control: {
        type: 'range',
        min: 0,
        max: 2,
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
