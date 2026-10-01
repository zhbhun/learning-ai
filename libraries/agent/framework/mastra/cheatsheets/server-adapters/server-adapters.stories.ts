import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createHostingExample,
  type HostingArgs,
  type HostingInstance,
  type HostingSnapshot,
} from './example';

const renderHosting = canvasStory({
  create: createHostingExample,
  apply(instance: HostingInstance, args: HostingArgs) {
    instance.update(args);
  },
  readout(snapshot: HostingSnapshot) {
    return [
      ['进程模型', snapshot.processModel],
      ['初始化', snapshot.init],
      ['适用场景', snapshot.scene],
    ];
  },
  captions: ['Mastra 托管形态对照', '离线示意 · 不发起真实请求'],
});

const meta = {
  id: 'server-adapters',
  title: '8. 生产化/服务与接入/服务器适配器',
  tags: ['!dev'],
  args: {
    mode: 'adapter',
  },
  argTypes: {
    mode: {
      name: '托管模式',
      description: '切换内置服务器、框架适配器与自定义适配器三种托管形态。',
      options: ['built-in', 'adapter', 'custom'],
      control: {
        type: 'radio',
        labels: {
          'built-in': '内置服务器',
          adapter: '框架适配器',
          custom: '自定义适配器',
        },
      },
    },
  },
  render: renderHosting,
  parameters: storySource(exampleSource),
} satisfies Meta<HostingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
