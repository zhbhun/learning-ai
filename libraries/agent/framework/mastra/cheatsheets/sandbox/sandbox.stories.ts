import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createSandboxExample,
  type SandboxArgs,
  type SandboxInstance,
  type SandboxSnapshot,
} from './example';

interface SandboxCourseArgs extends SandboxArgs {}

const render = canvasStory({
  create: createSandboxExample,
  apply(instance: SandboxInstance, args: SandboxCourseArgs) {
    instance.update(args);
  },
  readout(snapshot: SandboxSnapshot) {
    return [
      ['后端', snapshot.backend],
      ['隔离方式', snapshot.isolation],
      ['挂载', snapshot.mounts],
      ['网络', snapshot.network],
      ['命令工具', snapshot.commandTools],
      ['文件工具', snapshot.fileTools],
    ];
  },
});

const meta = {
  id: 'sandbox',
  title: '6. 扩展能力/运行环境/Sandbox 与文件系统',
  tags: ['!dev'],
  args: {
    backend: 'daytona',
    mountMode: 'mounts',
    networkBlockAll: false,
  },
  argTypes: {
    backend: {
      name: '沙箱后端',
      description: 'LocalSandbox 在本机以 Seatbelt/Bubblewrap 隔离；E2B / Daytona 为远程云端沙箱。',
      control: { type: 'radio', labels: { local: 'LocalSandbox（本机）', e2b: 'E2B（远程）', daytona: 'Daytona（远程）' } },
      options: ['local', 'e2b', 'daytona'],
    },
    mountMode: {
      name: '挂载配置',
      description: 'single = filesystem 单提供者；mounts = 多前缀 CompositeFilesystem。',
      control: { type: 'radio', labels: { single: '单提供者 filesystem', mounts: 'mounts 多路径' } },
      options: ['single', 'mounts'],
    },
    networkBlockAll: {
      name: 'networkBlockAll',
      description: '封锁沙箱出站网络（远程后端可配合域名白名单放行）。',
      control: { type: 'boolean' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<SandboxCourseArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
