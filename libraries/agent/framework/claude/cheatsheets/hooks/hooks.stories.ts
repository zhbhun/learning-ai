import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './hooks-timeline-demo.ts?raw';
import {
  createHooksTimelineDemo,
  TIMELINE_SCENARIOS,
  type TimelineInstance,
  type TimelineScenarioId,
  type TimelineSnapshot,
} from './hooks-timeline-demo';

/** 用场景展示文案作选项值,读起来即为正文里的场景描述 */
const SCENARIO_LABELS = Object.values(TIMELINE_SCENARIOS).map((item) => item.label);
const SCENARIO_BY_LABEL = new Map<string, TimelineScenarioId>(
  Object.values(TIMELINE_SCENARIOS).map(
    (scenario) => [scenario.label, scenario.id] as const,
  ),
);

interface DemoArgs {
  scenario: string;
}

const renderInteractive = canvasStory({
  create: createHooksTimelineDemo,
  apply(instance: TimelineInstance, args: DemoArgs) {
    instance.update({
      scenario: SCENARIO_BY_LABEL.get(args.scenario) ?? 'edit-file',
    });
  },
  readout(snapshot: TimelineSnapshot) {
    return [
      ['事件数', snapshot.countReadout],
      ['结束事件', snapshot.endReadout],
      ['子代理内事件', snapshot.subagentReadout],
    ];
  },
});

const meta = {
  id: 'hooks',
  title: '配置与控制/Hooks/Hook 事件',
  tags: ['!dev'],
  args: {
    scenario: '改一个文件',
  },
  argTypes: {
    scenario: {
      name: '任务场景',
      description:
        '选择回放哪一轮任务的 Hook 事件时间线(演示数据,不调用 LLM API)。',
      control: { type: 'select' },
      options: SCENARIO_LABELS,
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
