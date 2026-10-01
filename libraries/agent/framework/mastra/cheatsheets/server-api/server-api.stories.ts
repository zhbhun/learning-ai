import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import { createExample, type RouteTableArgs, type RouteSnapshot } from './example';

type RouteTableInstance = ReturnType<typeof createExample>;

const renderInteractive = canvasStory({
  create: createExample,
  apply(instance: RouteTableInstance, args: RouteTableArgs) {
    instance.update(args);
  },
  readout(snapshot: RouteSnapshot) {
    return [
      ['路由类别', snapshot.categoryLabel],
      ['路由条数', snapshot.routeCount],
      ['认证要求', snapshot.authSummary],
    ];
  },
  captions: ['离线示意，不发起真实请求', '路由清单回查 /api/openapi.json'],
});

const meta = {
  id: 'server-api',
  title: '8. 生产化/服务与接入/Mastra Server 与 API 路由',
  tags: ['!dev'],
  args: {
    category: 'builtin',
    authConfigured: false,
  },
  argTypes: {
    category: {
      name: '路由类别',
      description: '切换 API 路由表展示的三类路由。',
      control: {
        type: 'radio',
        labels: {
          builtin: '内置 agent 路由',
          custom: '自定义注册',
          docs: 'OpenAPI 与文档',
        },
      },
      options: ['builtin', 'custom', 'docs'],
    },
    authConfigured: {
      name: '配置 server.auth',
      description: '模拟是否配置认证：开启后自定义路由默认需登录。',
      control: 'boolean',
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<RouteTableArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
