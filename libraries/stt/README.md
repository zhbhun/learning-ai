## 技术方案

| 技术\特性 | 语音识别（ASR） | 语种识别（LID） | 语音情感识别（SER） | 声学事件识别（AED） |
| --- | --- | --- | --- | --- |
| [SenseVoice](https://github.com/FunAudioLLM/SenseVoice) | ✔ | ✔(50+) | ✔ | ✔ |
| [Whisper](https://github.com/openai/whisper) | | | | |
| [DeepSpeech](https://github.com/mozilla/DeepSpeech) | | | | |
| [pocketsphinx](https://github.com/cmusphinx/pocketsphinx) | | | | |
| [kaldi](https://github.com/kaldi-asr/kaldi) | | | | |

ps：✔、✘

---


- [whisper](https://github.com/openai/whisper) - 61.1k ★, Robust Speech Recognition via Large-Scale Weak Supervision

  https://github.com/ggerganov/whisper.cpp/tree/master

- [DeepSpeech](https://github.com/mozilla/DeepSpeech) - 24.4k ★, DeepSpeech is an open source embedded (offline, on-device) speech-to-text engine which can run in real time on devices ranging from a Raspberry Pi 4 to high power GPU servers.

  - https://github.com/manuindersekhon/mozilla-deepspeech-flutter

- [pocketsphinx](https://github.com/cmusphinx/pocketsphinx) - 3.8k ★, A small speech recognizer
- [kaldi](https://github.com/kaldi-asr/kaldi) - 13.8k ★, kaldi-asr/kaldi is the official location of the Kaldi project.
- [SenseVoice](https://github.com/FunAudioLLM/SenseVoice) - Multilingual Voice Understanding Model

## Saas

- [Azure Speech Studio](https://speech.microsoft.com/portal)：实时语音转文本、批处理语音转文本、自定义语音识别、语音翻译

  - [cognitive-services-speech-sdk](https://github.com/Azure-Samples/cognitive-services-speech-sdk)

## 测试记录

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

