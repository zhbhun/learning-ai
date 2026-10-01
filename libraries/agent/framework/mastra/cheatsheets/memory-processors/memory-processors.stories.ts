import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createExample, type MemoryInstance, type MemorySnapshot } from './example';

interface MemoryProcessorArgs {
  workingMemory: boolean;
  semanticRecall: boolean;
  piiGuard: boolean;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: MemoryInstance, args: MemoryProcessorArgs) {
    instance.update(args);
  },
  readout(snapshot: MemorySnapshot) {
    return [
      ['输入方向', snapshot.inputOrder],
      ['模型看到', snapshot.modelSees],
      ['输出方向', snapshot.outputOrder],
      ['写入记忆', snapshot.memoryResult],
    ];
  },
});

const meta = {
  id: 'memory-processors',
  title: '4. 记忆/记忆处理器',
  tags: ['!dev'],
  args: {
    workingMemory: true,
    semanticRecall: true,
    piiGuard: false,
  },
  argTypes: {
    workingMemory: {
      name: '启用 WorkingMemory',
      description: '关闭后输入管道少一站，模型看不到工作记忆。',
      control: { type: 'boolean' },
    },
    semanticRecall: {
      name: '启用 SemanticRecall',
      description: '关闭后输入不召回，输出不做嵌入。',
      control: { type: 'boolean' },
    },
    piiGuard: {
      name: '添加自定义 pii-guard',
      description: '在记忆处理器之后挂自定义处理器；命中手机号即中止。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<MemoryProcessorArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
