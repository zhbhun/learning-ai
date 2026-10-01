import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createDeployPipeline,
  type DeployArgs,
  type DeployInstance,
  type DeployMode,
  type DeploySnapshot,
} from './example';

interface DeploymentArgs {
  mode: DeployMode;
  drainTimeout: number;
}

const renderInteractive = canvasStory({
  create: createDeployPipeline,
  apply(instance: DeployInstance, args: DeploymentArgs) {
    instance.update({ mode: args.mode, drainTimeout: args.drainTimeout });
  },
  readout(snapshot: DeploySnapshot) {
    return [
      ['部署方式', snapshot.modeLabel],
      ['构建产物', snapshot.artifacts],
      ['启动命令', snapshot.command],
      ['健康检查', snapshot.health],
      ['drain 窗口', `${snapshot.drainTimeoutMs} ms`],
    ];
  },
});

const meta = {
  id: 'deployment',
  title: '8. 生产化/部署/部署概览与自托管',
  tags: ['!dev'],
  args: {
    mode: 'self-host',
    drainTimeout: 5,
  },
  argTypes: {
    mode: {
      name: '部署方式',
      description: '切换部署路径，观察产物、启动命令与健康检查的变化。',
      control: {
        type: 'radio',
        labels: {
          'self-host': '自托管 server',
          sandbox: '沙箱',
          platform: '云平台',
        },
      },
      options: ['self-host', 'sandbox', 'platform'],
    },
    drainTimeout: {
      name: 'drainTimeout（秒）',
      description: '自托管优雅关闭时等待活跃请求与流的窗口，默认 5 秒。',
      control: {
        type: 'range',
        min: 0,
        max: 30,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<DeploymentArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
