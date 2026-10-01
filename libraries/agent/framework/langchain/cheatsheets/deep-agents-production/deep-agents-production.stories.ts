import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createBackendExample,
  createPermissionExample,
  type BackendInstance,
  type BackendOptions,
  type BackendSnapshot,
  type PermissionInstance,
  type PermissionOptions,
  type PermissionSnapshot,
} from './example';

const renderBackend = canvasStory({
  create: createBackendExample,
  apply(instance: BackendInstance, args: BackendOptions) {
    instance.update(args);
  },
  readout(snapshot: BackendSnapshot) {
    return [
      ['backend 配置', snapshot.backendLabel],
      ['路由目标', snapshot.routedTo],
      ['作用域', snapshot.scopeLabel],
      ['生命周期', snapshot.lifetimeLabel],
    ];
  },
});

const renderPermission = canvasStory({
  create: createPermissionExample,
  apply(instance: PermissionInstance, args: PermissionOptions) {
    instance.update(args);
  },
  readout(snapshot: PermissionSnapshot) {
    return [
      ['操作', snapshot.toolLabel],
      ['目标路径', snapshot.path],
      ['命中规则', snapshot.hitRule],
      ['调用结果', snapshot.resultLabel],
    ];
  },
});

// 两个实例的输入不同：BackendRouting 用 backendPreset / backendPath，
// PermissionCheck 用 permissionTool / permissionPath；
// 合并成一份 args 类型，各 Story 只取自己需要的键。
type ExampleArgs = BackendOptions & PermissionOptions;

const meta = {
  id: 'deep-agents-production',
  title: '多智能体与 Deep Agents/Deep Agents/生产化',
  tags: ['!dev'],
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<ExampleArgs>;

export const BackendRouting: Story = {
  args: {
    backendPreset: 'composite',
    backendPath: '/memories/agent.md',
  },
  argTypes: {
    backendPreset: {
      name: 'backend 配置',
      description:
        'StateBackend 单一：所有文件进本 thread 状态；CompositeBackend：/memories/ 前缀路由到 StoreBackend，其余（含 harness 内部数据）走默认 StateBackend；FilesystemBackend：全部落宿主磁盘。',
      control: {
        type: 'inline-radio',
        options: ['state', 'composite', 'filesystem'],
      },
      labels: {
        state: 'State 单一',
        composite: 'Composite 路由',
        filesystem: 'Filesystem 本地',
      },
    },
    backendPath: {
      name: '写入路径',
      description:
        '同一次 write_file 的目标：草稿、跨 thread 记忆、交付产物，以及 harness 自动写入的内部数据（大工具输出驱逐 / 会话历史）。',
      control: {
        type: 'inline-radio',
        options: [
          '/notes/draft.md',
          '/memories/agent.md',
          '/project/report.md',
          '/conversation_history/0002.md',
        ],
      },
    },
  },
  render: renderBackend,
  parameters: storySource(exampleSource),
};

export const PermissionCheck: Story = {
  args: {
    permissionTool: 'write_file',
    permissionPath: '/workspace/README.md',
  },
  argTypes: {
    permissionTool: {
      name: '工具调用',
      description:
        'write_file 映射为 operations 里的 write 语义，read_file 映射为 read 语义（read 同时覆盖 ls / glob / grep）；同一规则可以只对其中一类生效。',
      control: {
        type: 'inline-radio',
        options: ['write_file', 'read_file'],
      },
    },
    permissionPath: {
      name: '目标路径',
      description:
        'README.md 命中只挡写的 R1；.env 与 secrets/ 命中 R2；report.md 由 R3 放行；工作区之外的路径落到兜底 R4。',
      control: {
        type: 'inline-radio',
        options: [
          '/workspace/report.md',
          '/workspace/README.md',
          '/workspace/.env',
          '/memories/agent.md',
        ],
      },
    },
  },
  render: renderPermission,
  parameters: storySource(exampleSource),
};
