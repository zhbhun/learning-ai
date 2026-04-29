- [TTS Arena By Huggingface](https://huggingface.co/spaces/TTS-AGI/TTS-Arena-V2)
- [TTS Artificial Analysis](https://artificialanalysis.ai/text-to-speech/arena?tab=leaderboard)

---

TODO

- [Gemini 3.1 Flash TTS](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-tts/)

## 框架

- [VITS](https://huggingface.co/docs/transformers/model_doc/vits) -  An end-to-end TTS architecture that utilizes conditional variational autoencoder with adversarial learning

  - https://arxiv.org/abs/2106.06103

- [FastSpeech2](https://arxiv.org/abs/2006.04558) - A non-autoregressive TTS architecture that utilizes feed-forward Transformer blocks.
- [Tacotron]()
- [Vall-E](https://arxiv.org/abs/2301.02111) - A zero-shot TTS architecture that uses a neural codec language model with discrete codes.
- [NaturalSpeech2](https://arxiv.org/abs/2304.09116) - An architecture for TTS that utilizes a latent diffusion model to generate natural-sounding voices.
- Transformer TTS

## 数据集

- [The LJ Speech Dataset](https://keithito.com/LJ-Speech-Dataset/)

## 模型

| 模型 | 时间 | 语种 | 效果(MOS) | RTF(速度) | Finetune / Clone | License |
| --- | --- | --- | --- | --- | --- | --- |
| [Tacotron2](https://github.com/NVIDIA/tacotron2) | 2018 | 中英西法 | 可用(很多其他模型以此为基础训练) | CPU 0.2 | 支持 | BSD-3-Clause |
| [FastSpeech2](https://github.com/ming024/FastSpeech2) | 2020 | 中英西法 | 从架构上看逊色于Tacotron2 | CPU 0.06 | 支持 | MIT |
| [VITS](https://huggingface.co/docs/transformers/model_doc/vits) | 2023 | 中英西法 |	优于 Tacotron2	 | CPU 0.18 | 支持 | MIT |
| [Bert-VITS2](https://github.com/fishaudio/Bert-VITS2) | 2023 | 中英日 | 惊艳，10min语料基本能完全复刻声音（音色、语气、韵律等） | CPU 0.88，GPU 0.04 | 支持 | AGPL-3.0 |
| [VITS Fast Fine-tuning](https://github.com/Plachtaa/VITS-fast-fine-tuning) | 2023 | 中英日 | 惊艳，20-30条语料基本能完全复刻声音（音色、语气、韵律等） |	 CPU 0.95，GPU 0.05 |	支持 | Apache-2.0 |
| [VALL-E-X](https://github.com/Plachtaa/VALL-E-X) | 2023	| 中英日 | 音色像，底模中文语料可能不足，发音不地道，且无需训练，1条音频跨语种克隆推理	 | colab 环境下 GPU 推理很慢 | 支持 |	MIT |
| [OpenVoice](https://github.com/myshell-ai/OpenVoice) | 2024 | 中英 | 文本 |	音色克隆很不像，音质还行，可通过参数调节情绪、语速 | 很快，堪比流式 | 无需训练，1条音频跨语种克隆推理 |	Free commercial usage |
| [MeloTTS](https://github.com/myshell-ai/MeloTTS) | 2024 |	中英西法日韩 | 音量不稳定，忽高忽低	号称CPU级别实时推理 | 实测 CPU 0.75，GPU 0.04 |	底模只能推理，无法 ft，训练语料要求未知 | MIT |

---

| 技术\特性 | 多语言 | 效果（情感、重音、节奏、停顿和语调） | SSML | 克隆 | 速度 | 其他 |
| --- | --- | --- | --- | --- | --- | --- |
| CosyVoice | 中英日粤韩5种语言 | 支持 | 支持 | 仅需要3~10s的原始音频，支持跨语种的语音合成中 | ？| 英语等语言推理生成的音频会多出一些奇怪的声音 |
| OpenVoice | 中英法日韩西班牙等 | 一般 | 不支持 | 支持 | ？ | 生成语音效果较为一般，可以集合其他 TTS 来改变音频音色 |

---

- [VibeVoice](https://github.com/microsoft/VibeVoice) - Open-Source Frontier Voice AI
- [Real-Time-Voice-Cloning](https://github.com/CorentinJ/Real-Time-Voice-Cloning) - 50.9k ★, Clone a voice in 5 seconds to generate arbitrary speech in real-time
- [MockingBird](https://github.com/babysor/MockingBird) - 33.9k ★, Clone a voice in 5 seconds to generate arbitrary speech in real-time

  - [实时中文语音克隆——开源项目MockingBird体验](https://security.tencent.com/index.php/blog/msg/204)

- [Bark](https://github.com/suno-ai/bark) - 32.8k ★, Text-Prompted Generative Audio Model

  - https://huggingface.co/spaces/suno/bark

- [OpenVoice](https://github.com/myshell-ai/OpenVoice) - 24.3k ★, Instant voice cloning by MyShell.
- [GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) - 23.9k ★, 1 min voice data can also be used to train a good TTS model! (few shot voice cloning)

  - [GPT-SoVITS指南](https://www.yuque.com/baicaigongchang1145haoyuangong/ib3g1e)
  - [24天9.3k star! GPT-SoVITS语音克隆超详细教程](https://zhuanlan.zhihu.com/p/681754094)
  - [GPT-SoVITS整合包部署及使用教程](https://www.bilibili.com/read/cv30898214/)
  - [你的声音，现在是我的了！- 手把手教你用 GPT-SoVITS 克隆声音！](https://www.bilibili.com/video/BV1P541117yn)
  - [GPT-SoVITS在线一键语音生成合集（Xz乔希）](https://www.modelscope.cn/studios/xzjosh/GPT-SoVITS/summary)

- [LocalAI](https://github.com/mudler/LocalAI) - 20k ★,🤖 The free, Open Source OpenAI alternative. Self-hosted, community-driven and local-first. Drop-in replacement for OpenAI running on cons…
- [tortoise-tts](https://github.com/neonbjb/tortoise-tts) - 11.9k ★, A multi-voice TTS system trained with an emphasis on quality

  优点：支持多声，且生成的音频会根据语句意思调整语气

  缺点：多人声混乱，并且同一句话不同地方语气、语调和音色会不同

  https://huggingface.co/spaces/Manmay/tortoise-tts

- [PaddleSpeech](https://github.com/PaddlePaddle/PaddleSpeech) - 10.2k ★, Easy-to-use Speech Toolkit including Self-Supervised Learning model, SOTA/Streaming ASR with punctuation, Streaming TTS with text frontend, Speaker Verification System, End-to-End Speech Translation and Keyword Spotting. Won NAACL2022 Best Demo Award.
- [NeMo](https://github.com/NVIDIA/NeMo) - 10.1k ★, A scalable generative AI framework built for researchers and developers working on Large Language Models, Multimodal, and Speech AI (Automatic Speech Recognition and Text-to-Speech)
- [VALL-E-X](https://github.com/Plachtaa/VALL-E-X) - 7.2k ★, An open source implementation of Microsoft's VALL-E X zero-shot TTS model.
- [Bert-VITS2](https://github.com/fishaudio/Bert-VITS2)

  - [Bert-VITS2在线一键语音生成合集（Xz乔希）](https://www.modelscope.cn/studios/xzjosh/Bert-VITS2/summary)
  - [【AI星瞳（坏女人）】在线语音合成（Bert-Vits2 2.3中日英）](https://huggingface.co/spaces/XzJosh/badXT-Bert-VITS2-2.3)

- [fish-speech](https://github.com/fishaudio/fish-speech)
- [VALL-E-X](https://github.com/Plachtaa/VALL-E-X) -  7.3k ★, An open source implementation of Microsoft's VALL-E X zero-shot TTS model. Demo is available in
- [EmotiVoice](https://github.com/netease-youdao/EmotiVoice) - 6.4k ★, EmotiVoice 😊: a Multi-Voice and Prompt-Controlled TTS Engine

  https://replicate.com/bramhooimeijer/emotivoice

- [VITS Fast Fine-tuning](https://github.com/Plachtaa/VITS-fast-fine-tuning) - This repo is a pipeline of VITS finetuning for fast speaker adaptation TTS, and many-to-many voice conversion
- [MeloTTS](https://github.com/myshell-ai/MeloTTS) - 3.7k ★, High-quality multi-lingual text-to-speech library by MyShell.ai. Support English, Spanish, French, Chinese, Japanese and Korean.

  - [MeloTTS HuggingFace](https://huggingface.co/myshell-ai/MeloTTS-English)
  - [MeloTTS Demo](https://huggingface.co/spaces/mrfakename/MeloTTS)
  - https://huggingface.co/spaces/myshell-ai/OpenVoiceV2

- [FastSpeech2](https://github.com/ming024/FastSpeech2) - 1.6k ★, An implementation of Microsoft's "FastSpeech 2: Fast and High-Quality End-to-End Text to Speech"
- [mms](https://github.com/facebookresearch/fairseq/blob/main/examples/mms/README.md)

  - https://github.com/jaywalnut310/vits
  - https://github.com/ylacombe/finetune-hf-vits

- [microsoft/speecht5_tts](https://huggingface.co/microsoft/speecht5_tts)
- [edge-tts](https://github.com/rany2/edge-tts/) - Use Microsoft Edge's online text-to-speech service from Python WITHOUT needing Microsoft Edge or Windows or an API key
- [clone-voice](https://github.com/jianchang512/clone-voice?tab=readme-ov-file)
- [ChatTTS](https://github.com/2noise/chattts)

  - https://github.com/jianchang512/ChatTTS-ui?tab=readme-ov-file
  - [Awesome-ChatTTS](https://github.com/panyanyany/Awesome-ChatTTS) - ChatTTS资源大全，免费体验地址，音色库等

- [Seed-TTS](https://github.com/BytedanceSpeech/seed-tts-eval)

  https://bytedancespeech.github.io/seedtts_tech_report/

- [StreamSpeech](https://github.com/ictnlp/StreamSpeech) - StreamSpeech is an “All in One” seamless model for offline and simultaneous speech recognition, speech translation and speech synthesis.
- [parler-tts](https://github.com/huggingface/parler-tts) - Inference and training library for high-quality TTS models.
- [fish-speech](https://github.com/fishaudio/fish-speech)
- [CosyVoice](https://github.com/FunAudioLLM/CosyVoice) - Multi-lingual large voice generation model, providing inference, training and deployment full-stack ability.

  - CosyVoice-base-300M：擅长准确代表说话者身份，无需微调即可适应不同上下文，能够跨语言克隆声音。
  - CosyVoice-instruct-300M：能够生成富有情感表现力的语音，允许通过指令文本进行精细调整。
  - CosyVoice-sft-300M：已针对七位多语言说话者进行了微调，适合立即部署使用。
  - https://developer.aliyun.com/article/1562292

- [mars5-tts](https://github.com/camb-ai/mars5-tts) - MARS5 speech model (TTS) from CAMB.AI
- https://github.com/espeak-ng/espeak-ng - eSpeak NG is an open source speech synthesizer that supports more than hundred languages and accents.
- https://github.com/SWivid/F5-TTS - A Fairytaler that Fakes Fluent and Faithful Speech with Flow Matching

  https://www.bilibili.com/video/BV1cbm5YTEPN/?spm_id_from=333.788.recommend_more_video.11&vd_source=2e69ba889e556e858093542d78fc08c0

- [IndexTTS](https://github.com/index-tts/index-tts) - An Industrial-Level Controllable and Efficient Zero-Shot Text-To-Speech System

## 工具

- [TTS](https://github.com/coqui-ai/TTS) - 29.9k ★, a deep learning toolkit for Text-to-Speech, battle-tested in research and production

  - [字正腔圆,万国同音,coqui-ai TTS跨语种语音克隆,钢铁侠讲16国语言(Python3.10) ](https://www.cnblogs.com/v3ucn/p/17944671)
  - [【TTS】4：coqui-ai代码实战](https://zhuanlan.zhihu.com/p/680441700)
  - https://huggingface.co/spaces/coqui/xtts

- [PaddleSpeech](https://github.com/PaddlePaddle/PaddleSpeech) - 10.3k ★,  Easy-to-use Speech Toolkit including Self-Supervised Learning model, SOTA/Streaming ASR with punctuation, Streaming TTS with text frontend, Speaker Verification System, End-to-End Speech Translation and Keyword Spotting. Won NAACL2022 Best Demo Award.
- [mozilla/TTS](https://github.com/mozilla/TTS) - 8.8k ★, Deep learning for Text to Speech
- [Amphion](https://github.com/open-mmlab/Amphion) - 4K ★, Amphion (/æmˈfaɪən/) is a toolkit for Audio, Music, and Speech Generation. Its purpose is to support reproducible research and help junior researchers and engineers get started in the field of audio, music, and speech generation research and development.
- [tts-generation-webui](https://github.com/rsxdalv/tts-generation-webui) - 1.3k ★, TTS Generation Web UI (Bark, MusicGen + AudioGen, Tortoise, RVC, Vocos, Demucs, SeamlessM4T, MAGNet, StyleTTS2, MMS)

  - [TTS Generation WebUI-用于AI音频生成的WebUI](https://www.noiseblogs.top/posts/3edd9196/)

- https://luvvoice.com/ - 基于微软 TTS 开发的在线工具


## Sass

- [Azure Speech Studio](https://speech.microsoft.com/portal)：语音库、定制声音、有声内容创作、
- [ElevenLabs](https://elevenlabs.io/) - 19.6M/Monthly, Text to Speech & AI Voice Generator

  Features

  - Text to Speech
  - Speech to Speech
  - Voice Clone
  - Project(Audiobook Workshop)
  - Dubbing
  - ...

- [Speechify](https://speechify.com/) - 7.1M/Monthly, Speechify is a leading text-to-speech app available on Chrome, iOS, and Android. It allows users to convert text into natural-sounding speech, making it easier and more efficient to listen to documents, articles, PDFs, emails, and more on any device. Millions of people have downloaded Speechify and it has received millions of 5-star reviews.

  - Text to speech - Speechify AI Voice Over uses advanced AI text to speech technology, which allows video creators, podcasters, narrators, gaming developers, business professionals, and more to create lifelike generative AI voice overs, saving time and money.
  - Transcription - Easily, and quickly, transcribe any video. Simply upload your audio or video and click “Transcribe” to get the most accurate transcription.
  - Voice Clone - Create high quality AI clones of human voices within seconds.
  - AI avatars and voiceovers 
  - Dubbing - Best AI Dubbing for video and content localization

- [TTSMaker](https://ttsmaker.com/) - 4.2M/Monthly, TTSMaker is a completely free online text-to-speech tool that supports unlimited usage, including commercial use. With over 200 AI voices and support for multiple languages, you can choose from a variety of voice styles to read your text and e-books aloud. You can also download the synthesized audio files. No registration or payment is required, you can use it directly online for free forever.
- [NaturalReader](https://www.naturalreaders.com/) - 3.8M/Monthly, https://www.naturalreaders.com/
- https://www.toolify.ai/search/text%20to%20speach?r=search-handle
- [MiniMax TTS](https://www.minimaxi.com/document/speech-synthesis-engine?id=645e034eeb82db92fba9ac20)
- https://www.lmnt.com/

## 参考

- [语音合成（TTS）开源调研与测评](https://zhuanlan.zhihu.com/p/687094556)