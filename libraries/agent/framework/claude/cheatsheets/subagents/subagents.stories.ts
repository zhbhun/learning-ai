import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './subagents-context-demo.ts?raw';
import {
  createSubagentsContextDemo,
  SCENARIOS,
  type ScenarioId,
  type SubagentsInstance,
  type SubagentsSnapshot,
} from './subagents-context-demo';

/** 用场景展示文案作选项值,读起来即为正文里的场景描述 */
const SCENARIO_LABELS = Object.values(SCENARIOS).map((item) => item.label);
const SCENARIO_BY_LABEL = new Map<string, ScenarioId>(
  Object.values(SCENARIOS).map(
    (scenario) => [scenario.label, scenario.id] as const,
  ),
);

interface DemoArgs {
  scenario: string;
  runInBackground: boolean;
}

const renderInteractive = canvasStory({
  create: createSubagentsContextDemo,
  apply(instance: SubagentsInstance, args: DemoArgs) {
    instance.update({
      scenario: SCENARIO_BY_LABEL.get(args.scenario) ?? 'success',
      runInBackground: args.runInBackground,
    });
  },
  readout(snapshot: SubagentsSnapshot) {
    return [
      ['主代理上下文', snapshot.parentReadout],
      ['子代理上下文', snapshot.subagentReadout],
      ['回传主代理', snapshot.returnedReadout],
    ];
  },
});

const meta = {
  id: 'subagents',
  title: '扩展能力/子代理与扩展/子代理',
  tags: ['!dev'],
  args: {
    scenario: '正常完成',
    runInBackground: true,
  },
  argTypes: {
    scenario: {
      name: '子代理结束方式',
      description:
        '切换子代理怎么结束,对照两列各留下什么、主代理收到什么(演示数据,不调用 LLM API)。',
      control: { type: 'select' },
      options: SCENARIO_LABELS,
    },
    runInBackground: {
      name: '后台运行',
      description:
        '打开 = 省略 run_in_background(默认后台);关闭 = run_in_background: false,主代理停下等待。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
