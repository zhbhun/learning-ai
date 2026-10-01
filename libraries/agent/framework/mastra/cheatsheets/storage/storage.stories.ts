import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './storage-routing.ts?raw';
import {
  createStorageDemo,
  type StorageInstance,
  type StorageOptions,
  type StorageSnapshot,
} from './storage-routing';

const DOMAIN_OPTIONS = ['memory', 'workflows', 'observability', 'scores'];

interface StorageStoryArgs extends StorageOptions {}

const renderInteractive = canvasStory({
  captions: [
    '存储域路由示意（离线示意，不连接真实数据库）',
    'MastraCompositeStore',
  ],
  create: createStorageDemo,
  apply(instance: StorageInstance, args: StorageStoryArgs) {
    instance.update(args);
  },
  readout(snapshot: StorageSnapshot) {
    return [
      ['当前数据域', snapshot.domain],
      ['该域存什么', snapshot.stores],
      ['路由结果', snapshot.backend],
      ['其余域去向', snapshot.others],
    ];
  },
});

const meta = {
  id: 'storage',
  title: '1. 起步/存储与持久化',
  tags: ['!dev'],
  args: {
    domain: 'workflows',
    composite: false,
  },
  argTypes: {
    domain: {
      name: '数据域',
      description: '切换选中的数据域，观察它存什么、被路由到哪个后端。',
      options: [...DOMAIN_OPTIONS],
      control: {
        type: 'radio',
        labels: {
          memory: 'memory 记忆数据',
          workflows: 'workflows 工作流快照',
          observability: 'observability 追踪与日志',
          scores: 'scores 评分记录',
        },
      },
    },
    composite: {
      name: '复合存储（按域路由）',
      description:
        '开启后模拟 MastraCompositeStore：选中域经 domains 映射拆到专用后端，其余域留在 default。',
      control: { type: 'boolean' },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<StorageStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
