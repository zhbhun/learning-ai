import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './hook-control-demo.ts?raw';
import {
  DECISION_LABELS,
  DEMO_SCENARIOS,
  createHookControlDemo,
  type DemoInstance,
  type DemoOptions,
  type DemoScenarioId,
  type DemoSnapshot,
  type HookDecision,
} from './hook-control-demo';

/** 用演示调用的展示文案作选项值,读起来即为正文里的调用描述 */
const SCENARIO_LABELS = Object.values(DEMO_SCENARIOS).map((item) => item.label);
const SCENARIO_BY_LABEL = new Map<string, DemoScenarioId>(
  Object.values(DEMO_SCENARIOS).map(
    (scenario) => [scenario.label, scenario.id] as const,
  ),
);

const DECISION_BY_LABEL = new Map<string, HookDecision>(
  Object.entries(DECISION_LABELS).map(
    ([value, label]) => [label, value as HookDecision],
  ),
);
const DECISION_LABELS_LIST = Object.values(DECISION_LABELS);

interface DemoArgs {
  scenario: string;
  hookDecision: string;
  denyEnv: boolean;
  hasCallback: boolean;
}

const renderInteractive = canvasStory({
  create: createHookControlDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update({
      scenario: SCENARIO_BY_LABEL.get(args.scenario) ?? 'write-env',
      hookDecision: DECISION_BY_LABEL.get(args.hookDecision) ?? 'none',
      denyEnv: args.denyEnv,
      hasCallback: args.hasCallback,
    } satisfies DemoOptions);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['hook 表态', snapshot.hookReadout],
      ['最终判定', snapshot.stepReadout],
      ['调用结果', snapshot.outcomeReadout],
      ['canUseTool', snapshot.callbackReadout],
    ];
  },
});

const meta = {
  id: 'hook-control',
  title: '配置与控制/Hooks/Hook 拦截与自动化',
  tags: ['!dev'],
  args: {
    scenario: 'Write: .env',
    hookDecision: '{}(不表态)',
    denyEnv: false,
    hasCallback: true,
  },
  argTypes: {
    scenario: {
      name: '待判定的调用',
      description: '选择走一遍评估链的工具调用(演示数据,不调用 LLM API)。',
      control: { type: 'select' },
      options: SCENARIO_LABELS,
    },
    hookDecision: {
      name: 'hook 决策',
      description:
        'PreToolUse 回调返回的 permissionDecision;{} 表示返回空对象、不表态。',
      control: { type: 'select' },
      options: DECISION_LABELS_LIST,
    },
    denyEnv: {
      name: 'deny 规则 Edit(./.env)',
      description:
        '作用域 deny 规则管住 Write:第 2 步否决,压过 hook 的 allow。',
      control: { type: 'boolean' },
    },
    hasCallback: {
      name: '已配置 canUseTool',
      description: '关掉后,落到"提示"的调用被直接拒绝。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
