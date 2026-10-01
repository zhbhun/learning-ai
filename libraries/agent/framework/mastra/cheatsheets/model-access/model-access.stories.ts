import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './model-string-parser.ts?raw';
import {
  GATEWAY_OPTIONS,
  MODEL_ID_OPTIONS,
  PROVIDER_OPTIONS,
  createModelParser,
  type ModelAccessInstance,
  type ModelAccessSnapshot,
} from './model-string-parser';

interface ModelAccessArgs {
  gateway: string;
  provider: string;
  modelId: string;
}

const renderInteractive = canvasStory({
  create: createModelParser,
  apply(instance: ModelAccessInstance, args: ModelAccessArgs) {
    instance.update(args);
  },
  readout(snapshot: ModelAccessSnapshot) {
    return [
      ['最终 model 字符串', snapshot.modelString],
      ['路由', snapshot.route],
      ['所需环境变量', snapshot.envVars],
    ];
  },
});

const meta = {
  id: 'model-access',
  title: '1. 起步/模型接入',
  tags: ['!dev'],
  args: {
    gateway: 'none',
    provider: 'openai',
    modelId: 'gpt-5.6-sol',
  },
  argTypes: {
    gateway: {
      name: '网关前缀',
      description:
        '选直连、models.dev 注册表或任一内置网关；画布分段与「路由」读数同步变化。',
      options: GATEWAY_OPTIONS.map((option) => option.id),
      control: {
        type: 'radio',
        labels: Object.fromEntries(
          GATEWAY_OPTIONS.map((option) => [option.id, option.label]),
        ),
      },
    },
    provider: {
      name: 'provider 段',
      description:
        '直连时的第一段、走网关时的第二段；所需环境变量跟随这一段。',
      options: [...PROVIDER_OPTIONS],
      control: {
        type: 'radio',
        labels: {
          openai: 'OpenAI',
          anthropic: 'Anthropic',
          google: 'Google',
          xai: 'xAI',
        },
      },
    },
    modelId: {
      name: '模型名',
      description: '字符串末段；候选取自官方文档示例，可任意搭配观察分段。',
      options: [...MODEL_ID_OPTIONS],
      control: {
        type: 'select',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<ModelAccessArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
