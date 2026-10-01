import type { Meta, StoryObj } from '@storybook/html-vite';
import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './tracing-example.ts?raw';
import {
  createTracingExample,
  type TracingArgs,
  type TracingSnapshot,
} from './tracing-example';

const renderInteractive = canvasStory({
  create: createTracingExample,
  apply(instance: ReturnType<typeof createTracingExample>, args: TracingArgs) {
    instance.update(args);
  },
  readout(snapshot: TracingSnapshot) {
    return [
      ['采样判定', snapshot.sampled ? '命中 · 导出 trace' : '丢弃 · 不导出'],
      ['traceId', snapshot.traceId ?? 'undefined'],
      ['root span 耗时', `${snapshot.rootMs} ms（示意）`],
      ['LLM 耗时占比', `${snapshot.llmShare}%`],
    ];
  },
  captions: ['离线示意 · 不发起真实请求'],
});

const meta = {
  id: 'tracing',
  title: '8. 生产化/可观测性/追踪 Tracing',
  tags: ['!dev'],
  args: {
    sampling: 'always',
    probability: 0.5,
    view: 'tree',
  },
  argTypes: {
    sampling: {
      name: '采样策略',
      description: 'always 全采 / never 全丢 / ratio 按概率',
      options: ['always', 'never', 'ratio'],
      control: {
        type: 'radio',
        labels: { always: 'always 全采', never: 'never 全丢', ratio: 'ratio 按概率' },
      },
    },
    probability: {
      name: 'ratio 概率',
      description: 'sampling.type 为 ratio 时生效',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
    view: {
      name: 'trace 视图',
      description: 'span 树展开层级 / 时间轴看耗时占比',
      options: ['tree', 'timeline'],
      control: {
        type: 'radio',
        labels: { tree: 'span 树（层级展开）', timeline: '时间轴（耗时占比）' },
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<TracingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
