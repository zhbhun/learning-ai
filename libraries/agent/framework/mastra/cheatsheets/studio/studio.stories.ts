import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './studio-map.ts?raw';
import {
  AREAS,
  AREA_LABELS,
  createStudioMap,
  type StudioMapArgs,
  type StudioMapInstance,
  type StudioMapSnapshot,
} from './studio-map';

interface StudioArgs extends StudioMapArgs {}

const renderPanelMap = canvasStory({
  captions: ['Studio 面板地图（离线示意，不启动真实服务）', 'mastra dev · localhost:4111'],
  create: createStudioMap,
  apply(instance: StudioMapInstance, args: StudioArgs) {
    instance.update(args);
  },
  readout(snapshot: StudioMapSnapshot) {
    return [
      ['当前分区', snapshot.label],
      ['典型调试场景', snapshot.scenario],
      ['定义在代码', snapshot.codeSide],
    ];
  },
});

const meta = {
  id: 'studio',
  title: '1. 起步/用 Studio 调试',
  tags: ['!dev'],
  args: {
    area: 'agents',
  },
  argTypes: {
    area: {
      name: '功能分区',
      description: '切换左侧导航分区，查看该区能做什么、典型调试场景与定义在代码里的部分。',
      options: [...AREAS],
      control: {
        type: 'radio',
        labels: AREA_LABELS,
      },
    },
  },
  render: renderPanelMap,
  parameters: storySource(exampleSource),
} satisfies Meta<StudioArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
