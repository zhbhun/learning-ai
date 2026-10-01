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

const renderMessageBuilder = canvasStory({
  create: createExample,
  apply(instance: ExampleInstance, args: ExampleArgs) {
    instance.update(args);
  },
  readout(snapshot: ExampleSnapshot) {
    return [
      ['消息类', snapshot.className],
      ['OpenAI role', snapshot.openaiRole],
      ['内容块数', snapshot.blockCount],
    ];
  },
});

const meta = {
  id: 'models-and-messages',
  title: '入门上手/模型与消息',
  tags: ['!dev'],
  args: {
    role: 'human',
    contentForm: 'text-image',
    imageSource: 'url',
  },
  argTypes: {
    role: {
      name: '消息角色',
      description:
        '对应 SystemMessage / HumanMessage / AIMessage / ToolMessage，右侧同步显示 OpenAI 字典格式的 role。',
      control: {
        type: 'inline-radio',
        options: ['system', 'human', 'ai', 'tool'],
      },
    },
    contentForm: {
      name: '内容形态',
      description: 'content 是纯字符串，还是 text + image 两个内容块组成的数组。',
      control: {
        type: 'inline-radio',
        options: ['text', 'text-image'],
      },
    },
    imageSource: {
      name: '图片来源',
      description:
        '图片块的 source_type：url 直链 / base64 内嵌（需 mime_type + data）/ 提供方托管文件 id。',
      control: {
        type: 'inline-radio',
        options: ['url', 'base64', 'id'],
      },
    },
  },
  render: renderMessageBuilder,
  parameters: storySource(exampleSource),
} satisfies Meta<ExampleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MessageBuilder: Story = {};
