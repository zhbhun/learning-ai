import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type PlatformArgs,
  type PlatformInstance,
  type PlatformSnapshot,
} from './example';

interface CourseArgs {
  view: PlatformArgs['view'];
  env: PlatformArgs['env'];
}

const render = canvasStory({
  create: createExample,
  apply(instance: PlatformInstance, args: CourseArgs) {
    instance.update(args);
  },
  readout(snapshot: PlatformSnapshot) {
    return [
      ['当前视角', snapshot.view],
      ['当前环境', snapshot.env],
      ['关键要点', snapshot.key],
      ['说明', snapshot.detail],
    ];
  },
});

const meta = {
  id: 'mastra-platform',
  title: '8. 生产化/Mastra Platform/Platform 入门',
  tags: ['!dev'],
  args: {
    view: 'products',
    env: 'production',
  },
  argTypes: {
    view: {
      name: '视角',
      description: '切换产品构成 / 部署流程 / 环境分层示意图。',
      control: {
        type: 'radio',
        labels: { products: '产品构成', deploy: '部署流程', env: '环境分层' },
      },
      options: ['products', 'deploy', 'env'],
    },
    env: {
      name: '当前环境',
      description: '「环境分层」视角下高亮的环境。',
      control: {
        type: 'radio',
        labels: { production: 'production', staging: 'staging' },
      },
      options: ['production', 'staging'],
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<CourseArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
