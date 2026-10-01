import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createBrowserExample,
  type BrowserInstance,
  type BrowserSnapshot,
  type ProviderId,
} from './example';

interface BrowserArgs {
  provider: ProviderId;
}

const renderInteractive = canvasStory({
  create: createBrowserExample,
  apply(instance: BrowserInstance, args: BrowserArgs) {
    instance.update(args);
  },
  readout(snapshot: BrowserSnapshot) {
    return [
      ['运行位置', snapshot.location],
      ['定位方式', snapshot.targeting],
      ['部署要求', snapshot.requirement],
    ];
  },
  captions: ['Provider 选型对照', '离线示意，不启动真实浏览器'],
});

const meta = {
  id: 'browser',
  title: '6. 扩展能力/对外通道/浏览器自动化',
  tags: ['!dev'],
  args: {
    provider: 'agent-browser',
  },
  argTypes: {
    provider: {
      name: 'Provider',
      description: '切换四个 provider 的使用场景。',
      control: { type: 'radio' },
      options: ['agent-browser', 'stagehand', 'firecrawl', 'browser-viewer'],
      labels: {
        'agent-browser': 'AgentBrowser · 本地自动化',
        stagehand: 'Stagehand · 自然语言操作',
        firecrawl: 'FirecrawlBrowser · 免部署抓取',
        'browser-viewer': 'BrowserViewer · CLI 调试',
      },
    },
  },
  render: renderInteractive,
  parameters: storySource(exampleSource),
} satisfies Meta<BrowserArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
