import type { Meta, StoryObj } from '@storybook/html-vite';

import { canvasStory } from '../../assets/story-canvas.js';
import { storySource } from '../../assets/story-source.js';
import exampleSource from './example.ts?raw';
import {
  createVoiceChain,
  type VoiceChainInstance,
  type VoiceChainOptions,
  type VoiceChainSnapshot,
} from './example';

interface VoiceArgs {
  mode: VoiceChainOptions['mode'];
  stt: VoiceChainOptions['stt'];
  tts: VoiceChainOptions['tts'];
}

const renderVoiceChain = canvasStory({
  create: createVoiceChain,
  apply(instance: VoiceChainInstance, args: VoiceArgs) {
    instance.update(args);
  },
  readout(snapshot: VoiceChainSnapshot) {
    return [
      ['链路', snapshot.stages.map((stage) => stage.name).join(' → ')],
      ['各环节选型', snapshot.stages.map((stage) => stage.detail).join(' | ')],
      ['示意总延迟', snapshot.total],
    ];
  },
});

const meta = {
  id: 'voice',
  title: '6. 扩展能力/对外通道/语音',
  tags: ['!dev'],
  args: { mode: 'chain', stt: 'deepgram', tts: 'elevenlabs' },
  argTypes: {
    mode: {
      name: '接法',
      description: '分体链路（listen → generate → speak）或实时 STS（connect / send / on）。',
      control: { type: 'radio', labels: { chain: '分体链路 STT+LLM+TTS', realtime: '实时 STS' } },
      options: ['chain', 'realtime'],
    },
    stt: {
      name: 'STT provider',
      description: 'voice.listen() 背后的语音转文字 provider。',
      control: {
        type: 'select',
        labels: { openai: 'OpenAI（whisper-1）', deepgram: 'Deepgram（nova）', gladia: 'Gladia（仅 STT）' },
      },
      options: ['openai', 'deepgram', 'gladia'],
    },
    tts: {
      name: 'TTS provider',
      description: 'voice.speak() 背后的文字转语音 provider。',
      control: {
        type: 'select',
        labels: { elevenlabs: 'ElevenLabs（eleven_multilingual_v2）', deepgram: 'Deepgram（aura）', openai: 'OpenAI（alloy）' },
      },
      options: ['elevenlabs', 'deepgram', 'openai'],
    },
  },
  render: renderVoiceChain,
  parameters: storySource(exampleSource),
} satisfies Meta<VoiceArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Interactive: Story = {};
