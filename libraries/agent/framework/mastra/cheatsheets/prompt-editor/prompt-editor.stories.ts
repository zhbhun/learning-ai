import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './editor-sim.ts?raw';
import {
  createEditorSim,
  type EditorArgs,
  type EditorInstance,
  type EditorSnapshot,
} from './editor-sim';

interface PromptEditorArgs extends EditorArgs {}

const renderDraftFlow = canvasStory({
  captions: ['草稿到发布（离线示意，不连接数据库）', 'Studio Editor · Prompts · Agents'],
  create: createEditorSim,
  apply(instance: EditorInstance, args: PromptEditorArgs) {
    instance.update(args);
  },
  readout(snapshot: EditorSnapshot) {
    return [
      ['当前操作', snapshot.operation],
      ['prompt block', snapshot.blockState],
      ['support-agent', snapshot.support],
      ['faq-agent', snapshot.faq],
      ['受影响 agent 数', snapshot.affected],
    ];
  },
});

const meta = {
  id: 'prompt-editor',
  title: '8. 生产化/质量运营/提示词管理与 Editor',
  tags: ['!dev'],
  args: {
    operation: 'draft',
    blockUpdate: false,
  },
  argTypes: {
    operation: {
      name: '版本操作',
      description: '切换草稿 / 发布 / 回滚，观察各 agent 生效版本与受影响数量。',
      options: ['draft', 'publish', 'rollback'],
      control: {
        type: 'radio',
        labels: {
          draft: '编辑草稿',
          publish: '发布',
          rollback: '回滚旧版',
        },
      },
    },
    blockUpdate: {
      name: 'prompt block 待发布修改',
      description: '打开后 prompt block「退货政策」存在待发布修改，发布时会同步所有引用方。',
      control: {
        type: 'boolean',
      },
    },
  },
  render: renderDraftFlow,
  parameters: storySource(exampleSource),
} satisfies Meta<PromptEditorArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
