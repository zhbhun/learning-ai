import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './recall-window.ts?raw';
import { createRecall, type RecallInstance, type RecallSnapshot } from './recall-window';

interface RecallArgs {
  topK: number;
  messageRange: number;
  scope: 'thread' | 'resource';
}

const renderInteractive = canvasStory({
  create: createRecall,
  apply(instance: RecallInstance, args: RecallArgs) {
    instance.update(args);
  },
  readout(snapshot: RecallSnapshot) {
    return [
      ['匹配条数', snapshot.matchCount],
      ['窗口内消息', snapshot.windowCount],
      ['估算注入 token', snapshot.windowTokens],
    ];
  },
});

const meta = {
  id: 'semantic-recall',
  title: '4. 记忆/语义召回',
  tags: ['!dev'],
  args: {
    topK: 2,
    messageRange: 1,
    scope: 'thread' as const,
  },
  argTypes: {
    topK: {
      name: 'topK',
      description: '按相似度取多少条匹配。',
      control: { type: 'range', min: 1, max: 3, step: 1 },
    },
    messageRange: {
      name: 'messageRange',
      description: '每条匹配前后各附带几条相邻消息。',
      control: { type: 'range', min: 0, max: 2, step: 1 },
    },
    scope: {
      name: 'scope',
      description: '搜当前 thread 还是整个 resource 的全部 threads。',
      options: ['thread', 'resource'],
      control: { type: 'radio', labels: { thread: 'thread（当前会话）', resource: 'resource（跨会话）' } },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<RecallArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
