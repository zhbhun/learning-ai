import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createAuthFlow,
  type AuthInstance,
  type AuthOptions,
  type AuthSnapshot,
} from './example';

interface AuthBasicsArgs {
  authMode: AuthOptions['authMode'];
  token: AuthOptions['token'];
}

const render = canvasStory({
  create: createAuthFlow,
  apply(instance: AuthInstance, args: AuthBasicsArgs) {
    instance.update(args);
  },
  readout(snapshot: AuthSnapshot) {
    return [
      ['内置 API 路由', snapshot.apiRoute],
      ['Studio', snapshot.studio],
      ['公开路径', snapshot.publicPath],
    ];
  },
});

const meta = {
  id: 'auth-basics',
  title: '8. 生产化/认证与授权/认证基础',
  tags: ['!dev'],
  args: {
    authMode: 'simple',
    token: 'none',
  },
  argTypes: {
    authMode: {
      name: '认证配置',
      description: 'Mastra 配置里 server.auth 的三种状态。',
      control: { type: 'radio' },
      options: ['none', 'simple', 'jwt'],
      labels: { none: '无认证', simple: 'SimpleAuth', jwt: 'MastraJwtAuth' },
    },
    token: {
      name: '请求凭据',
      description: '请求携带的 token 状态。',
      control: { type: 'radio' },
      options: ['none', 'valid', 'invalid'],
      labels: { none: '无 token', valid: '有效 token', invalid: '无效 token' },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<AuthBasicsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
