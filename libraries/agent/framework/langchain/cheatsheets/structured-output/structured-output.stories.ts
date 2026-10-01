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

const renderSchemaBench = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['校验结果', snapshot.verdict],
      ['错误位置', snapshot.errorPath],
    ];
  },
});

const meta = {
  id: 'structured-output',
  title: '入门上手/结构化输出',
  tags: ['!dev'],
  args: {
    schemaForm: 'required-optional',
    sampleFlaw: 'valid',
  },
  argTypes: {
    schemaForm: {
      name: 'schema 形态',
      description:
        'zod schema 的构造维度：必填与可选（optional + min/max）、枚举（z.enum）、嵌套与数组（z.array(Actor) + nullable）。',
      control: {
        type: 'inline-radio',
        options: ['required-optional', 'enum', 'nested-array'],
      },
    },
    sampleFlaw: {
      name: '样本缺陷',
      description:
        '模型返回样本的缺陷类型：valid 合法样本 / invalid-value 取值非法（越界或枚举外）/ missing-field 缺必填字段。',
      control: {
        type: 'inline-radio',
        options: ['valid', 'invalid-value', 'missing-field'],
      },
    },
  },
  render: renderSchemaBench,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SchemaBench: Story = {};
