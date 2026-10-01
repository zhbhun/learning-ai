import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

interface CapstoneArgs {
  layer: string;
}

const layerOptions = [
  'ingress',
  'orchestration',
  'memory',
  'knowledge',
  'quality',
  'deployment',
];

const layerLabels: Record<string, string> = {
  ingress: '入口',
  orchestration: '编排',
  memory: '记忆',
  knowledge: '知识',
  quality: '质量',
  deployment: '部署',
};

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: CapstoneArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['高亮层', snapshot.layer],
      ['层职责', snapshot.duty],
      ['深入课程', snapshot.courses],
      ['起步模板', snapshot.templates],
    ];
  },
  captions: [
    '六层参考架构 · 请求自上而下，回复自下而上',
    '离线示意 · 不含真实调用',
  ],
});

const meta = {
  id: 'capstone',
  title: '9. 实战/完整示例项目',
  tags: ['!dev'],
  args: {
    layer: 'orchestration',
  },
  argTypes: {
    layer: {
      name: '高亮架构层',
      description: '选择要聚焦的一层，读数给出该层职责、深入课程与官方起步模板。',
      // Storybook 10：options 必须与 control 平级写在 argType 顶层
      control: {
        type: 'select',
        labels: layerLabels,
      },
      options: layerOptions,
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<CapstoneArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
