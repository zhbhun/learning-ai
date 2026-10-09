import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './custom-tools-demo.ts?raw';
import {
  createCustomToolsDemo,
  type DemoInstance,
  type DemoSnapshot,
  type ScenarioId,
} from './custom-tools-demo';

interface DemoArgs {
  scenario: ScenarioId;
  position: number;
}

const renderInteractive = canvasStory({
  create: createCustomToolsDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update({ scenario: args.scenario, position: args.position });
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['入参场景', snapshot.scenarioLabel],
      ['调用进度', `${snapshot.position + 1} / ${snapshot.total}`],
      ['当前阶段', snapshot.stage],
      ['模型收到', snapshot.modelReceives],
    ];
  },
});

const meta = {
  id: 'custom-tools',
  title: '扩展能力/工具与 MCP/进程内自定义工具',
  tags: ['!dev'],
  args: {
    scenario: 'valid',
    position: 4,
  },
  argTypes: {
    scenario: {
      name: '入参场景',
      description:
        '模型发来的入参场景:合法、缺必填字段、类型错误,或 handler 内的业务错误。',
      control: {
        type: 'radio',
        labels: {
          valid: '合法入参',
          missing: '缺必填字段',
          wrongType: '类型错误',
          unknownCity: '业务错误',
        },
      },
      options: ['valid', 'missing', 'wrongType', 'unknownCity'],
    },
    position: {
      name: '调用进度',
      description: '回放到调用链的第几站(0-4):tool_use → 校验 → handler → tool_result → 模型继续。',
      control: {
        type: 'range',
        min: 0,
        max: 4,
        step: 1,
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(demoSource),
} satisfies Meta<DemoArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
