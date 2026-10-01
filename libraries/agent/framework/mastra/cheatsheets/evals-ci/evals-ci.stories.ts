import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './evals-ci-example.ts?raw';
import { createLayeredChecks, type LayerSnapshot } from './evals-ci-example';

interface EvalsCiArgs {
  scenario: 'normal' | 'missing' | 'wrongTool' | 'semantic';
  quickChecks: boolean;
  llmScorer: boolean;
}

const renderInteractive = canvasStory({
  create: createLayeredChecks,
  apply(instance: ReturnType<typeof createLayeredChecks>, args: EvalsCiArgs) {
    instance.update(args);
  },
  readout(snapshot: LayerSnapshot) {
    return [
      ['快检层结果', snapshot.quickLabel],
      ['快检层耗时', snapshot.quickUs === null ? '—' : `${snapshot.quickUs.toFixed(1)} μs（实测）`],
      ['LLM 层评分', snapshot.llmLabel],
      ['LLM 层耗时', snapshot.llmMs === null ? '—' : `≈${(snapshot.llmMs / 1000).toFixed(1)} s（示意）`],
      ['最终判定', snapshot.verdict],
    ];
  },
});

const meta = {
  id: 'evals-ci',
  title: '8. 生产化/质量运营/集成测试与 CI',
  tags: ['!dev'],
  args: {
    scenario: 'normal',
    quickChecks: true,
    llmScorer: true,
  },
  argTypes: {
    scenario: {
      name: '用例场景',
      description: '切换 agent 对同一问题的离线运行结果，观察哪一层把它拦下。',
      control: { type: 'radio', labels: { normal: '正常回答', missing: '漏写关键信息', wrongTool: '调错工具', semantic: '语义偏差' } },
      options: ['normal', 'missing', 'wrongTool', 'semantic'],
    },
    quickChecks: {
      name: '快检层（零 LLM）',
      description: '关闭后确定性断言不执行，观察确定性错误如何逃逸。',
      control: { type: 'boolean' },
    },
    llmScorer: {
      name: 'LLM 评分层',
      description: '关闭后只剩确定性门，观察语义问题如何逃逸。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<EvalsCiArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
