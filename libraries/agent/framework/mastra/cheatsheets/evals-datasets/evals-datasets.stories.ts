import type { Meta, StoryObj } from '@storybook/html-vite';
import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './evals-datasets-example.ts?raw';
import {
  createMatrixExample,
  type MatrixArgs,
  type MatrixSnapshot,
} from './evals-datasets-example';

const renderInteractive = canvasStory({
  create: createMatrixExample,
  apply(instance: ReturnType<typeof createMatrixExample>, args: MatrixArgs) {
    instance.update(args);
  },
  readout(snapshot: MatrixSnapshot) {
    return [
      ['实验 verdict', snapshot.verdict],
      ['gate 均分', snapshot.gateAvg.toFixed(2)],
      ['helpfulness 均分', snapshot.thrAvg.toFixed(2)],
      ['gate 达标用例', `${snapshot.itemsPassingGates}/5`],
    ];
  },
  captions: ['离线示意 · 不调用真实模型或存储', 'verdict 规则：gate 均分必须 = 1.0'],
});

const meta = {
  id: 'evals-datasets',
  title: '8. 生产化/质量运营/数据集与实验',
  tags: ['!dev'],
  args: {
    datasetVersion: 1,
    scorerCombo: 'gates-threshold',
    threshold: 0.7,
  },
  argTypes: {
    datasetVersion: {
      name: '数据集版本',
      description: '实验固定运行的 SCD-2 版本：v1 初版 / v2 修订 / v3 定稿',
      options: [1, 2, 3],
      control: {
        type: 'radio',
        labels: { 1: 'v1 初版', 2: 'v2 修订', 3: 'v3 定稿' },
      },
    },
    scorerCombo: {
      name: 'scorer 组合',
      description: 'gates + threshold / 仅 gates / 仅 threshold',
      options: ['gates-threshold', 'gates-only', 'threshold-only'],
      control: {
        type: 'radio',
        labels: {
          'gates-threshold': 'gates + threshold',
          'gates-only': '仅 gates',
          'threshold-only': '仅 threshold',
        },
      },
    },
    threshold: {
      name: 'helpfulness threshold',
      description: '数字 threshold = 最低分，均分 ≥ 该值才通过',
      control: { type: 'range', min: 0, max: 1, step: 0.05 },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<MatrixArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
