import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './permission-modes-demo.ts?raw';
import {
  createPermissionModesDemo,
  type DemoCallId,
  type DemoInstance,
  type DemoModeId,
  type DemoSnapshot,
} from './permission-modes-demo';

interface DemoArgs {
  mode: DemoModeId;
  call: DemoCallId;
}

const renderInteractive = canvasStory({
  create: createPermissionModesDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['结果', snapshot.verdictReadout],
      ['决定环节', snapshot.stepReadout],
      ['免审批范围', snapshot.coverageReadout],
      ['说明', snapshot.reasonReadout],
    ];
  },
});

const meta = {
  id: 'permission-modes',
  title: '配置与控制/权限与安全/权限模式',
  tags: ['!dev'],
  args: {
    mode: 'default',
    call: 'edit-inside',
  },
  argTypes: {
    mode: {
      name: 'permissionMode',
      description: '要判定的权限模式;auto 依赖模型分类器,不纳入演示。',
      control: { type: 'radio' },
      options: ['default', 'acceptEdits', 'plan', 'bypassPermissions', 'dontAsk'],
    },
    call: {
      name: '模拟调用',
      description: '六类代表性工具调用,矩阵高亮对应的行;"范围内"指工作目录与 additionalDirectories。',
      control: { type: 'select' },
      options: [
        'read-inside',
        'edit-inside',
        'fs-command-inside',
        'bash-other',
        'edit-outside',
        'rm-critical',
      ],
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
