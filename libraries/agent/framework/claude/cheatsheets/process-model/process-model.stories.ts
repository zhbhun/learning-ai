import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './process-model-timeline-demo.ts?raw';
import {
  createProcessModelDemo,
  WARM_MODES,
  type WarmModeId,
  type WarmSnapshot,
  type WarmTimelineInstance,
} from './process-model-timeline-demo';

/** 用方式展示文案作选项值,读起来即为正文里的方式描述 */
const MODE_LABELS = Object.values(WARM_MODES).map((mode) => mode.label);
const MODE_BY_LABEL = new Map<string, WarmModeId>(
  Object.values(WARM_MODES).map((mode) => [mode.label, mode.id] as const),
);

interface DemoArgs {
  mode: string;
  position: number;
}

const renderInteractive = canvasStory({
  create: createProcessModelDemo,
  apply(instance: WarmTimelineInstance, args: DemoArgs) {
    instance.update({
      mode: MODE_BY_LABEL.get(args.mode) ?? 'prewarm',
      position: args.position,
    });
  },
  readout(snapshot: WarmSnapshot) {
    return [
      ['预热方式', snapshot.modeLabel],
      ['当前阶段', snapshot.phaseLabel],
      ['用户等待', snapshot.userWaitReadout],
      ['启动时已完成', snapshot.bootReadout],
    ];
  },
});

const meta = {
  id: 'process-model',
  title: '生产化/运行与部署/进程与预热',
  tags: ['!dev'],
  args: {
    mode: 'prewarm()',
    position: 78,
  },
  argTypes: {
    mode: {
      name: '预热方式',
      description:
        '获取会话的三种方式:直接 query()、startup()(目录已知)、prewarm()(目录未知,先留备件)。演示数据,不调用 LLM API。',
      control: { type: 'radio' },
      options: MODE_LABELS,
    },
    position: {
      name: '时间进度',
      description: '观察时间线推进到哪个位置(0-100%)。',
      control: { type: 'range', min: 0, max: 100, step: 1 },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
