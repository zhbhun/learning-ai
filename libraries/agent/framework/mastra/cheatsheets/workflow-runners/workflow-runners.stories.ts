import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './topology.ts?raw';
import { createTopology, type RunnerArgs, type TopologyInstance, type TopologySnapshot } from './topology';

interface WorkflowRunnersArgs extends RunnerArgs {}

const renderInteractive = canvasStory({
  create: createTopology,
  captions: ['进程拆分拓扑（离线示意）', '切换形态、后端与聚焦 worker 观察判定'],
  apply(instance: TopologyInstance, args: WorkflowRunnersArgs) {
    instance.update(args);
  },
  readout(snapshot: TopologySnapshot) {
    return [
      ['判定', snapshot.ok ? '配置成立' : '配置冲突'],
      ['进程数', snapshot.processes],
      ['PubSub 后端', snapshot.backend],
      ['所需基础设施', snapshot.infra],
      ['步骤执行', snapshot.callback],
      ['边界提示', snapshot.notes],
    ];
  },
});

const meta = {
  id: 'workflow-runners',
  title: '8. 生产化/部署/运行器、Workers 与 PubSub',
  tags: ['!dev'],
  args: {
    topology: 'split',
    pubsub: 'redis-streams',
    focus: 'orchestration',
  },
  argTypes: {
    topology: {
      name: '部署形态',
      description: 'worker 留在 API 进程内（默认），还是拆成独立进程部署。',
      control: { type: 'radio' },
      options: ['single', 'split'],
      labels: { single: '单进程（默认）', split: '拆分 worker 进程' },
    },
    pubsub: {
      name: 'PubSub 后端',
      description: '拆分部署必须选 pull 模式的分布式后端。',
      control: { type: 'radio' },
      options: ['event-emitter', 'redis-streams'],
      labels: { 'event-emitter': 'EventEmitter（单机）', 'redis-streams': 'Redis Streams（分布式）' },
    },
    focus: {
      name: '聚焦 worker',
      description: '高亮一类 worker 的职责与事件流向。',
      control: { type: 'radio' },
      options: ['orchestration', 'scheduler', 'backgroundTasks'],
      labels: { orchestration: '编排 worker', scheduler: '调度 worker', backgroundTasks: '后台任务 worker' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<WorkflowRunnersArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
