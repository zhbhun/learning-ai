import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createExample, type DecisionArgs, type DecisionInstance, type DecisionSnapshot } from './example';

interface CloudDeploymentArgs {
  workload: DecisionArgs['workload'];
  scale: number;
}

const renderInteractive = canvasStory({
  create: createExample,
  captions: ['选型矩阵（离线示意）', '切换负载观察推荐形态'],
  apply(instance: DecisionInstance, args: CloudDeploymentArgs) {
    instance.update({ workload: args.workload, scale: args.scale });
  },
  readout(snapshot: DecisionSnapshot) {
    return [
      ['负载 → 形态', `${snapshot.workload} → ${snapshot.shape}`],
      ['代表平台', snapshot.platforms],
      ['存储注意', snapshot.storage],
      ['规模提示', snapshot.scaleNote],
    ];
  },
});

const meta = {
  id: 'cloud-deployment',
  title: '8. 生产化/部署/云平台部署',
  tags: ['!dev'],
  args: {
    workload: 'burst',
    scale: 500,
  },
  argTypes: {
    workload: {
      name: '负载特征',
      description: 'Agent 应用的主要负载模式，决定匹配的部署形态。',
      control: { type: 'radio' },
      options: ['burst', 'long', 'persistent'],
      labels: { burst: '突发流量', long: '长任务', persistent: '常驻连接' },
    },
    scale: {
      name: '峰值并发',
      description: '每分钟请求数量级（示意值），超过 2000 触发规模提示。',
      control: {
        type: 'range',
        min: 100,
        max: 5000,
        step: 100,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CloudDeploymentArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
