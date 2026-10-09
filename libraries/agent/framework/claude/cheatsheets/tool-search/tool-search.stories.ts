import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import demoSource from './tool-search-demo.ts?raw';
import {
  createToolSearchDemo,
  type DemoArgs,
  type DemoInstance,
  type DemoSnapshot,
  type ModeId,
} from './tool-search-demo';

const renderInteractive = canvasStory({
  create: createToolSearchDemo,
  apply(instance: DemoInstance, args: DemoArgs) {
    instance.update(args);
  },
  readout(snapshot: DemoSnapshot) {
    return [
      ['模式', snapshot.modeLabel],
      ['激活判断', snapshot.stateReadout],
      ['首回合上下文', snapshot.contextReadout],
      ['搜索成本', snapshot.costReadout],
    ];
  },
});

const meta = {
  id: 'tool-search',
  title: '扩展能力/工具与 MCP/工具搜索',
  tags: ['!dev'],
  args: {
    mode: 'auto' as ModeId,
    definitionTokens: 24,
    exemptTokens: 0,
  },
  argTypes: {
    mode: {
      name: 'ENABLE_TOOL_SEARCH',
      description:
        '取值:未设置/true 始终延迟(演示环境不含回退条件)、auto 达窗口 10% 才延迟、auto:5 达 5% 才延迟、false 始终整载。',
      control: {
        type: 'radio',
        labels: {
          on: '开启(未设置 / true)',
          auto: 'auto(10%)',
          auto5: 'auto:5(5%)',
          off: 'false(关闭)',
        },
      },
      options: ['on', 'auto', 'auto5', 'off'],
    },
    definitionTokens: {
      name: '工具定义规模',
      description: '全部工具定义的 token 总量(千;演示按约 250 token/工具折算)。',
      control: {
        type: 'range',
        min: 0,
        max: 60,
        step: 1,
      },
    },
    exemptTokens: {
      name: 'alwaysLoad 豁免',
      description: '其中常驻上下文、不进可延迟池的 token(千;超过总量时按总量截断)。',
      control: {
        type: 'range',
        min: 0,
        max: 60,
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
