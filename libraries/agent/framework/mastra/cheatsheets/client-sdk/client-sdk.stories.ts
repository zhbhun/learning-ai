import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createExample, type TopologyArgs, type TopologySnapshot } from './example';

type TopologyInstance = ReturnType<typeof createExample>;

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: TopologyInstance, args: TopologyArgs) {
    instance.update(args);
  },
  readout(snapshot: TopologySnapshot) {
    return [
      ['请求路径', snapshot.path],
      ['凭据', snapshot.auth],
      ['返回形态', snapshot.shape],
    ];
  },
  captions: ['离线示意，不发起真实请求', '路由细节回查 8.1.1 Mastra Server 与 API 路由'],
});

const meta = {
  id: 'client-sdk',
  title: '8. 生产化/服务与接入/Mastra Client SDK',
  tags: ['!dev'],
  args: {
    source: 'browser',
    resource: 'agent-stream',
  },
  argTypes: {
    source: {
      name: '调用来源',
      description: '切换发起调用的宿主：浏览器页面或 Node 服务。',
      control: {
        type: 'radio',
        labels: {
          browser: '浏览器页面',
          node: 'Node 服务',
        },
      },
      options: ['browser', 'node'],
    },
    resource: {
      name: '资源面',
      description: '切换调用的服务端资源，观察路径与返回形态。',
      control: {
        type: 'radio',
        labels: {
          'agent-stream': 'Agent 流式对话',
          workflow: 'Workflow 运行',
          memory: 'Memory 线程',
        },
      },
      options: ['agent-stream', 'workflow', 'memory'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<TopologyArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
