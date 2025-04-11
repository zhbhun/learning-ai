## 技术

### 开源

| 技术\特性 | 语音识别（ASR） | 语种识别（LID） | 语音情感识别（SER） | 声学事件识别（AED） | 总结 |
| --- | --- | --- | --- | --- | --- |
| [Whisper](https://github.com/openai/whisper) | | | | | 高质量通用语音转文字 |
| [FunASR](https://github.com/modelscope/FunASR) | ✔ | | | | 支持中文识别极佳 |
| [Coqui STT](https://github.com/coqui-ai/STT) / [DeepSpeech](https://github.com/mozilla/DeepSpeech) | ✔ | | | | 可 fine-tune 适配领域词汇，但比 Vosk 更重，需要较大内存 |
| [SenseVoice](https://github.com/FunAudioLLM/SenseVoice) | ✔ | ✔(50+) | ✔ | ✔ | 部分开源，适用中文语音场景 |
| [pocketsphinx](https://github.com/cmusphinx/pocketsphinx) | ✔ | | | | 极轻量，适合嵌入式、离线命令词识别 |
| [Vosk](https://alphacephei.com/vosk/) | ✔ | | | | 资源占用极小，适合嵌入式和移动端 |
| [kaldi](https://github.com/kaldi-asr/kaldi) | ✔ | | | | 经典的语音识别引擎，C++ 编写，被广泛用于学术研究和工业界，但非常复杂，部署难度高，学习曲线陡峭 |
| [espnet](https://github.com/espnet/espnet) | ✔ | | | | 学术模型质量高（适合自定义训练），但不适合初学者，依赖多，使用复杂 |

### 付费

- [Azure Speech Studio](https://speech.microsoft.com/portal)：实时语音转文本、批处理语音转文本、自定义语音识别、语音翻译

  - [cognitive-services-speech-sdk](https://github.com/Azure-Samples/cognitive-services-speech-sdk)

## 应用

- Whisper

  - [OpenAI-Whisper-GUI](https://github.com/rudymohammadbali/OpenAI-Whisper-GUI)
  - [whisper-gui](https://github.com/Pikurrot/whisper-gui)

- 语音备忘录（Android / iOS / Mac / Windows）：可直接录音+听写，结合备忘录与键盘听写功能
- 讯飞听见（Android / iOS）：国内常用的语音转文字应用，准确率高，支持实时字幕、导出文字
- Google 录音机（Android Pixel）：支持离线语音识别、自动转录、关键词搜索(可通过APK安装)
- Otter.ai（Android /iOS）：专业会议转录工具，自动分段、区分说话人，提供云同步

## 测试

- SenseVoice

  - 语言识别

    - [mp3](./assets/zh.mp3) `<|zh|><|NEUTRAL|><|Speech|><|woitn|>开饭时间早上九点至下午五点`
    - [en.mp3](./assets/en.mp3) `<|en|><|NEUTRAL|><|Speech|><|woitn|>the tribal chieftain called for the boy and presented him with fifty pieces of good`
    - [ja.mp3](./assets/ja.mp3) `<|ja|><|NEUTRAL|><|Speech|><|woitn|>うちの中学は弁当制で持っていきない場合は50円の学校販売のパンを買う`
    - [ko.mp3](./assets/ko.mp3) `<|ko|><|NEUTRAL|><|Speech|><|woitn|>조금만 생각을 하면서 살면 훨씬 편할 거야`

  - 语音情感识别

    - 正常：[emo_1.wav](./assets/emo_1.wav) `<|en|><|EMO_UNKNOWN|><|Speech|><|woitn|>i did go and made many prisoners`
    - 伤心：[emo_2.wav](./assets/emo_2.wav) `<|en|><|SAD|><|Speech|><|woitn|>i did go and made many prisoners`
    - 愤怒：[emo_3.wav](./assets/emo_3.wav) `<|zh|><|ANGRY|><|Speech|><|woitn|>英国的哲学家曾经说过`
    - 开心：[emo_4.wav](./assets/emo_4.wav) `<|zh|><|HAPPY|><|Speech|><|woitn|>英国的哲学家曾经说过`

  - 声学事件识别

    - [event_1.wav](./assets/event_1.wav) `<|nospeech|><|EMO_UNKNOWN|><|Cry|><|woitn|>`
    - [event_2.wav](./assets/event_2.wav) `<|nospeech|><|EMO_UNKNOWN|><|Laughter|><|woitn|>`
    - [event_3.wav](./assets/event_3.wav) `<|nospeech|><|EMO_UNKNOWN|><|Cough|><|woitn|>`

  - 综合测试

    - [rich_1.wav](./assets/rich_1.wav) `<|en|><|EMO_UNKNOWN|><|Applause|><|woitn|>senior staff principal doris jackson wakefield faculty and of course my fellow classmates i am honored to have been chosen to speak before my classmates as well as the students across america today`

      - 时长：17s
      - 耗时：150ms

    - [rich_2.wav](./assets/rich_2.wav) `<|zh|><|ANGRY|><|Applause|><|woitn|>我起飞前没有扫二维码我都在看彭晏我连安全演示片我都没有看所以我当时脑`

      - 时长：10s
      - 耗时：150ms

    - [rich_3.wav](./assets/rich_3.wav) `<|en|><|EMO_UNKNOWN|><|Speech|><|woitn|>i have to remind myself that some birds aren't meant to be caged their feathers are just too bright`

      - 时长：6s
      - 耗时：130ms

