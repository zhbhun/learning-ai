import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createPipelineExample, type PipelineArgs, type PipelineSnapshot } from './example';

type PipelineInstance = ReturnType<typeof createPipelineExample>;
type MiddlewareStoryArgs = PipelineArgs;

const render = canvasStory({
  create: createPipelineExample,
  apply(instance: PipelineInstance, args: MiddlewareStoryArgs) {
    instance.update(args);
  },
  readout(snapshot: PipelineSnapshot) {
    return [
      ['状态码', snapshot.status],
      ['隔离 resourceId', snapshot.resourceId],
      ['requestContext 键', snapshot.contextEntries.map(([k]) => k).join('、') || '（空）'],
    ];
  },
});

const meta = {
  id: 'middleware',
  title: '8. 生产化/服务与接入/中间件与请求上下文',
  tags: ['!dev'],
  args: {
    hasToken: true,
    authEnabled: true,
    injectEnabled: true,
  },
  argTypes: {
    hasToken: {
      name: '请求携带 Token',
      description: '模拟 Authorization 请求头是否存在。',
      control: { type: 'boolean' },
    },
    authEnabled: {
      name: '启用认证中间件',
      description: '对应 server.middleware 里的认证与 mapUserToResourceId。',
      control: { type: 'boolean' },
    },
    injectEnabled: {
      name: '启用租户注入中间件',
      description: '对应从请求头往 requestContext 注入键值的中间件。',
      control: { type: 'boolean' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<MiddlewareStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
