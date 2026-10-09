import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './permissions-demo.ts?raw';
import {
  DEMO_SCENARIOS,
  createPermissionsDemo,
  type DemoInstance,
  type DemoMode,
  type DemoScenarioId,
  type DemoSnapshot,
} from './permissions-demo';

/** 用演示调用的展示文案作选项值,读起来即为正文里的调用描述 */
const SCENARIO_LABELS = Object.values(DEMO_SCENARIOS).map((item) => item.label);
const SCENARIO_BY_LABEL = new Map<string, DemoScenarioId>(
  Object.values(DEMO_SCENARIOS).map(
    (scenario) => [scenario.label, scenario.id] as const,
  ),
);

const MODES: DemoMode[] = [
  'default',
  'acceptEdits',
  'plan',
  'bypassPermissions',
  'dontAsk',
];

interface DemoArgs {
  scenario: string;
  mode: string;
  allowNpm: boolean;
  denyRm: boolean;
  askEnv: boolean;
  bareBash: boolean;
  hasCallback: boolean;
}

const renderInteractive = canvasStory({
  create: createPermissionsDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update({
      scenario: SCENARIO_BY_LABEL.get(args.scenario) ?? 'bash-npm-test',
      mode: MODES.includes(args.mode as DemoMode) ? (args.mode as DemoMode) : 'default',
      allowNpm: args.allowNpm,
      denyRm: args.denyRm,
      askEnv: args.askEnv,
      bareBash: args.bareBash,
      hasCallback: args.hasCallback,
    });
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['命中步骤', snapshot.stepReadout],
      ['调用结果', snapshot.outcomeReadout],
      ['canUseTool', snapshot.callbackReadout],
      ['SDK 警告', snapshot.warningReadout],
    ];
  },
});

const meta = {
  id: 'permissions',
  title: '配置与控制/权限与安全/权限规则与 canUseTool',
  tags: ['!dev'],
  args: {
    scenario: 'Bash: npm test',
    mode: 'default',
    allowNpm: true,
    denyRm: false,
    askEnv: false,
    bareBash: false,
    hasCallback: true,
  },
  argTypes: {
    scenario: {
      name: '待判定的调用',
      description: '选择走一遍评估链的工具调用(演示数据,不调用 LLM API)。',
      control: { type: 'select' },
      options: SCENARIO_LABELS,
    },
    mode: {
      name: 'permissionMode',
      description: '起始权限模式;deny/ask 规则在它之前,allow 规则在它之后。',
      control: { type: 'select' },
      options: MODES,
    },
    allowNpm: {
      name: 'allow 规则 Bash(npm *)',
      description: '作用域 allow 规则:只放行匹配的调用。',
      control: { type: 'boolean' },
    },
    denyRm: {
      name: 'deny 规则 Bash(rm *)',
      description: '作用域 deny 规则:任何模式下都拒绝匹配的调用。',
      control: { type: 'boolean' },
    },
    askEnv: {
      name: 'ask 规则 Read(./.env)',
      description: 'ask 规则(只能写在 settings.json):命中即交给 canUseTool。',
      control: { type: 'boolean' },
    },
    bareBash: {
      name: 'allowedTools 裸名 "Bash"',
      description: '裸名 allow 条目:第 5 步放行整个工具,已配回调时触发遮蔽警告。',
      control: { type: 'boolean' },
    },
    hasCallback: {
      name: '已配置 canUseTool',
      description: '关掉后,落到"提示"的调用会被直接拒绝。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
