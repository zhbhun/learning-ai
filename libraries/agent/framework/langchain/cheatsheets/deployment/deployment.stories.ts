import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createExample,
  type ExampleArgs,
  type ExampleInstance,
  type ExampleSnapshot,
} from './example';

const renderFormSelector = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    const labels: Record<string, string> = {
      none: '无状态',
      stateful: '有状态',
      managed: '全托管',
      self: '自管容器',
      cloud: '可上云',
      own: '自有基础设施',
    };
    return [
      ['持久化', labels[snapshot.persistence]],
      ['运维', labels[snapshot.ops]],
      ['数据驻留', labels[snapshot.residency]],
      ['推荐形态', snapshot.formName],
    ];
  },
});

const meta = {
  id: 'deployment',
  title: '观测、测试与部署/部署',
  tags: ['!dev'],
  args: {
    persistence: 'stateful',
    ops: 'managed',
    residency: 'cloud',
  },
  argTypes: {
    persistence: {
      name: '持久化需求',
      description:
        '应用需不需要 Agent Server 的状态能力：thread 记忆、后台任务、crons。不需要时无状态 HTTP 服务就够，选自托管 Node 最轻。',
      control: {
        type: 'inline-radio',
        labels: {
          none: '无状态',
          stateful: '有状态',
        } as Record<string, string>,
      },
    },
    ops: {
      name: '运维能力',
      description:
        'Agent Server 家族里谁管基础设施：全托管交给 LangSmith Cloud / Hybrid；自管容器走 Standalone（Docker / Compose / K8s）。',
      control: {
        type: 'inline-radio',
        labels: {
          managed: '全托管',
          self: '自管容器',
        } as Record<string, string>,
      },
    },
    residency: {
      name: '数据驻留',
      description:
        '代码与数据能不能运行在 LangChain 托管云：可上云选 Cloud；必须留在自有基础设施时，全托管对应 Hybrid，自管对应 Standalone。',
      control: {
        type: 'inline-radio',
        labels: {
          cloud: '可上云',
          own: '自有基础设施',
        } as Record<string, string>,
      },
    },
  },
  render: renderFormSelector,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FormSelector: Story = {};
