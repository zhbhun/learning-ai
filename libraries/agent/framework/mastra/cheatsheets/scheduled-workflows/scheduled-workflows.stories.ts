import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createScheduleTimeline,
  type ScheduleInstance,
  type ScheduleSnapshot,
} from './example';

interface ScheduledWorkflowsArgs {
  cron: string;
  timezone: string;
  fires: number;
}

const render = canvasStory({
  create: createScheduleTimeline,
  apply(instance: ScheduleInstance, args: ScheduledWorkflowsArgs) {
    instance.update(args);
  },
  readout(snapshot: ScheduleSnapshot) {
    return [
      ['cron', snapshot.cron],
      ['cron 解读', snapshot.description],
      ['时区', snapshot.timezone],
      ['下次触发', `${snapshot.nextFireLabel}（${snapshot.relative}）`],
      ['展望次数', snapshot.fireCount],
    ];
  },
});

const meta = {
  id: 'scheduled-workflows',
  title: '3. 工作流/运行方式/定时触发',
  tags: ['!dev'],
  args: {
    cron: '0 10 * * 1-5',
    timezone: 'Asia/Shanghai',
    fires: 5,
  },
  argTypes: {
    cron: {
      name: 'schedule.cron',
      description: '5 段 cron 表达式，构造 createWorkflow 时即被校验。',
      options: ['* * * * *', '0 9 * * *', '0 10 * * 1-5', '0 */6 * * *', '30 8 1 * *'],
      control: {
        type: 'select',
        labels: {
          '* * * * *': '每分钟',
          '0 9 * * *': '每天 09:00',
          '0 10 * * 1-5': '工作日 10:00',
          '0 */6 * * *': '每 6 小时',
          '30 8 1 * *': '每月 1 日 08:30',
        },
      },
    },
    timezone: {
      name: 'schedule.timezone',
      description: 'IANA 时区；缺省时用主机本地时区，生产环境建议显式指定。',
      options: ['Asia/Shanghai', 'UTC', 'Asia/Tokyo', 'Europe/London', 'America/New_York'],
      control: { type: 'select' },
    },
    fires: {
      name: '展望次数',
      description: '时间轴上展示的未来触发次数。',
      control: { type: 'range', min: 3, max: 8, step: 1 },
    },
  },
  render,
  parameters: storySource(exampleSource),
} satisfies Meta<ScheduledWorkflowsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
