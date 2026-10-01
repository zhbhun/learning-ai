import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './ops-signals.ts?raw';
import { createOpsPanel, type OpsInstance, type OpsSnapshot, type OpsView } from './ops-signals';

const VIEW_LABELS: Record<OpsView, string> = {
  trace: 'Trace 聚类',
  alerts: '告警规则',
  database: '数据库绑定',
};

interface PlatformOpsArgs {
  view: OpsView;
  traceCount: number;
  alertTriggers: string[];
}

const render = canvasStory({
  create: createOpsPanel,
  apply(instance: OpsInstance, args: PlatformOpsArgs) {
    instance.update(args);
  },
  readout(snapshot: OpsSnapshot) {
    return [
      ['当前视角', VIEW_LABELS[snapshot.view]],
      ['主题就绪', snapshot.themesReady ? '是（约 100 条阈值已达成）' : '未达成'],
      ['已选触发器', `${snapshot.triggerCount} / 3`],
    ];
  },
});

const meta = {
  id: 'platform-ops',
  title: '8. 生产化/Mastra Platform/平台观测与运维',
  tags: ['!dev'],
  args: {
    view: 'trace',
    traceCount: 120,
    alertTriggers: ['deploy-failed', 'service-crashed'],
  },
  argTypes: {
    view: {
      name: '运维视角',
      description: '切换 trace 聚类 / 告警规则 / 数据库绑定三个离线面板。',
      options: ['trace', 'alerts', 'database'],
      control: {
        type: 'radio',
        labels: { trace: 'Trace 聚类', alerts: '告警规则', database: '数据库绑定' },
      },
    },
    traceCount: {
      name: 'completed traces 数',
      description: 'trace 视角：约 100 条被处理后出现初始 themes。',
      control: { type: 'range', min: 0, max: 200, step: 10 },
    },
    alertTriggers: {
      name: '告警触发器',
      description: 'alerts 视角：勾选后画布显示到 destinations 的连线。',
      options: ['deploy-failed', 'service-crashed', 'service-oom'],
      control: {
        type: 'multi-select',
        labels: {
          'deploy-failed': 'Deploy failed',
          'service-crashed': 'Service crashed',
          'service-oom': 'Service OOM',
        },
      },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<PlatformOpsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
