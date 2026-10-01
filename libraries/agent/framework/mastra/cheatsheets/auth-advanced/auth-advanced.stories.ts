import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createProviderChain,
  PROVIDER_LABEL,
  type AuthAdvancedInstance,
  type AuthAdvancedOptions,
  type AuthAdvancedSnapshot,
} from './example';

interface AuthAdvancedArgs {
  tokenType: 'legacy-jwt' | 'clerk-session' | 'api-key-token';
  chainOrder: 'jwt-first' | 'simple-first';
  fgaAction: 'memory:read' | 'memory:write' | 'agents:execute';
}

const renderInteractive = canvasStory({
  create: createProviderChain,
  apply(instance: AuthAdvancedInstance, args: AuthAdvancedArgs) {
    instance.update(args);
  },
  readout(snapshot: AuthAdvancedSnapshot) {
    return [
      ['认证成功的 provider', snapshot.winner ? PROVIDER_LABEL[snapshot.winner] : '无（401）'],
      ['FGA 判定', snapshot.allowed ? '允许' : '拒绝'],
    ];
  },
});

const meta = {
  id: 'auth-advanced',
  title: '8. 生产化/认证与授权/组合认证与细粒度授权',
  tags: ['!dev'],
  args: {
    tokenType: 'legacy-jwt',
    chainOrder: 'jwt-first',
    fgaAction: 'memory:write',
  },
  argTypes: {
    tokenType: {
      name: '请求 token',
      description: 'Authorization 头携带的凭据形态',
      options: ['legacy-jwt', 'clerk-session', 'api-key-token'],
      control: {
        type: 'select',
        labels: {
          'legacy-jwt': 'legacy-jwt（旧版 JWT）',
          'clerk-session': 'clerk-session（Clerk 会话）',
          'api-key-token': 'sk-integration-key（API key）',
        },
      },
    },
    chainOrder: {
      name: 'provider 链顺序',
      description: 'CompositeAuth 数组声明顺序',
      options: ['jwt-first', 'simple-first'],
      control: {
        type: 'select',
        labels: {
          'jwt-first': 'JWT → Clerk → SimpleAuth',
          'simple-first': 'SimpleAuth → Clerk → JWT',
        },
      },
    },
    fgaAction: {
      name: 'FGA 操作',
      description: 'member 用户对线程记忆 / Agent 的操作',
      options: ['memory:read', 'memory:write', 'agents:execute'],
      control: {
        type: 'select',
        labels: {
          'memory:read': 'memory:read',
          'memory:write': 'memory:write',
          'agents:execute': 'agents:execute',
        },
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<AuthAdvancedArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
