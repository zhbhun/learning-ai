import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createBoundaryExample,
  type BoundaryInstance,
  type BoundarySnapshot,
  type Scenario,
} from './example';

interface BoundaryArgs {
  scenario: Scenario;
  durable: boolean;
}

const renderBoundary = canvasStory({
  create: createBoundaryExample,
  apply(instance: BoundaryInstance, args: BoundaryArgs) {
    instance.update(args);
  },
  readout(snapshot: BoundarySnapshot) {
    return [
      ['推荐协议', snapshot.proto],
      ['运行时归属', snapshot.owner],
      ['交换内容', snapshot.exchange],
      ['暂停任务跨重启', snapshot.recovery],
    ];
  },
  captions: ['互联边界选择器', '离线示意：不发起真实网络与子进程'],
});

const meta = {
  id: 'connections',
  title: '6. 扩展能力/工具与互联/A2A 与 ACP',
  tags: ['!dev'],
  args: {
    scenario: 'a2a',
    durable: false,
  },
  argTypes: {
    scenario: {
      name: '互联场景',
      description: '选择你要跨越的互联边界类型。',
      control: {
        type: 'radio',
        labels: {
          a2a: '跨服务调用远程 agent',
          acp: '外部 CLI 编码代理',
          sdk: '厂商 SDK 进程内',
          mcp: '仅工具互通',
        },
      },
      options: ['a2a', 'acp', 'sdk', 'mcp'],
    },
    durable: {
      name: '任务需跨重启恢复',
      description: '仅影响 A2A 场景的恢复判读。',
      control: { type: 'boolean' },
    },
  },
  render: renderBoundary,
  parameters: storySource(exampleSource),
} satisfies Meta<BoundaryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
