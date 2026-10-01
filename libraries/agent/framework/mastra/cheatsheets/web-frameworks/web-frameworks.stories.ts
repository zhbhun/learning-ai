import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createIntegrationExample,
  type IntegrationInstance,
  type IntegrationSnapshot,
  type ProjectShape,
} from './example';

interface WebFrameworksArgs {
  shape: ProjectShape;
}

const renderInteractive = canvasStory({
  create: createIntegrationExample,
  apply(instance: IntegrationInstance, args: WebFrameworksArgs) {
    instance.update(args);
  },
  readout(snapshot: IntegrationSnapshot) {
    return [
      ['项目形态', snapshot.label],
      ['推荐路径', snapshot.path],
      ['适配器包', snapshot.pkg],
      ['默认前缀', snapshot.prefix],
    ];
  },
});

const meta = {
  id: 'web-frameworks',
  title: '9. 实战/Web 框架集成',
  tags: ['!dev'],
  args: {
    shape: 'next-new',
  },
  argTypes: {
    shape: {
      name: '项目形态',
      description: '切换项目形态，观察推荐的集成路径、适配器包与接线步骤',
      control: {
        type: 'radio',
        labels: {
          'next-new': '全新 Next.js',
          'express-existing': '已有 Express',
          'hono-min': '最小 Hono',
        },
      },
      options: ['next-new', 'express-existing', 'hono-min'],
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<WebFrameworksArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
