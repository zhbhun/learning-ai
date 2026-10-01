import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleInstance,
  type ExampleSnapshot,
  type ScenarioKey,
} from './example';

interface ExampleArgs {
  scenario: ScenarioKey;
  step: number;
}

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['轨迹场景', snapshot.scenarioLabel],
      ['消息数', snapshot.messageCount],
      ['工具调用', snapshot.toolCalls],
      ['grade 判定', snapshot.gradePath],
      ['结局', snapshot.ending],
    ];
  },
});

const meta = {
  id: 'agentic-rag',
  title: '记忆与检索/Agentic RAG',
  tags: ['!dev'],
  args: {
    scenario: 'one-shot',
    step: 5,
  },
  argTypes: {
    scenario: {
      name: '轨迹场景',
      description:
        '切换检索循环的轨迹：闲聊不检索、一次命中、首查不足重写再检索、多检索源路由、不收敛被次数上限拦截。',
      control: {
        type: 'radio',
        options: ['chat', 'one-shot', 'rewrite', 'route', 'limit'] satisfies ScenarioKey[],
      },
    },
    step: {
      name: '回放步骤',
      description: '从第 1 个块开始逐步追加，观察决策、检索、评估路由的先后顺序。',
      control: {
        type: 'range',
        min: 1,
        max: 9,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
