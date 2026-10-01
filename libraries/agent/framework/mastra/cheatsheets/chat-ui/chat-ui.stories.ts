import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ChatUiInstance,
  type ChatUiSnapshot,
} from './example';

interface ChatUiArgs {
  path: string;
}

const render = canvasStory({
  create: createExample,
  apply(instance: ChatUiInstance, args: ChatUiArgs) {
    instance.update(args);
  },
  readout(snapshot: ChatUiSnapshot) {
    return [
      ['依赖', snapshot.deps],
      ['可控性', snapshot.control],
      ['出界面速度', snapshot.speed],
    ];
  },
});

const meta = {
  id: 'chat-ui',
  title: '9. 实战/前端接入与聊天 UI',
  tags: ['!dev'],
  args: {
    path: 'ai-sdk',
  },
  argTypes: {
    path: {
      name: '接入路径',
      description: '切换前端接入 Mastra 的三种方式，对比依赖、可控性与出界面速度（离线示意）。',
      options: ['client-js', 'ai-sdk', 'components'],
      control: {
        type: 'radio',
        labels: {
          'client-js': 'client-js 直连',
          'ai-sdk': 'AI SDK 转换',
          components: '组件库',
        },
      },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<ChatUiArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
