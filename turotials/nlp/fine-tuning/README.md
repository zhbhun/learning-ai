## Why

大模型通常是针对通用任务进行训练的，可能并不总是适合特定任务。微调是调整大模型参数的过程，以使其在特定任务上的性能更好。

- 提高效率：可以使大模型在特定任务上更有效。例如，在对问答数据集进行微调后，大模型可能能够更快、更准确地回答问题。
- 提高准确性：微调可以显着提高大模型在特定任务上的准确性。例如，在对新闻文章数据集进行微调后，大模型可能能够更准确地识别文章的情感。
- 提高泛化能力：可以提高大模型的泛化能力,这意味着它们可以更好地执行与训练数据中数据不同的任务。例如，在对不同类型的创意文本格式(如诗歌、代码、脚本、音乐作品、电子邮
件、信件等)的数据集进行微调后，大模型可能能够生成更具创意和原创性的文本格式。
- 减少数据需求：可以减少训练大模型所需的数据量。

## When / Where

- 在特定任务上实现高精度：如果正在开发一个用于医疗诊断的模型,那么您需要确保该模型能够准确地识别疾病。
- 有大量特定于任务的数据：如果正在开发一个用于客户服务的模型,那么您可以使用客户对话的数据来微调模型。
- 需要模型能够快速执行特定任务：如果正在开发一个用于实时翻译的模型,那么您需要确保该模型能够快速翻译语音。

## How

- [FastChat](https://github.com/lm-sys/FastChat) - An open platform for training, serving, and evaluating large language models. Release repo for Vicuna and Chatbot Arena.
- [peft](https://github.com/huggingface/peft) - PEFT: State-of-the-art Parameter-Efficient Fine-Tuning.
- [ColossalAI](https://github.com/hpcaitech/ColossalAI) - Colossal-AI 为您提供了一系列并行组件。我们的目标是让您的分布式 AI 模型像构建普通的单 GPU 模型一样简单。我们提供的友好工具可以让您在几行代码内快速开始分布式训练和推理。
- [LMFlow](https://github.com/OptimalScale/LMFlow/blob/main/readme/README_zh-hans.md) - 一个可扩展、方便和高效的工具箱，用于微调大型机器学习模型。我们的目标是开发一套用户友好、快速可靠，并对整个社区开放的全流程微调代码库。
- [unsloth](https://github.com/unslothai/unsloth) - Finetune Llama 3, Mistral & Gemma LLMs 2-5x faster with 80% less memory
- https://github.com/hiyouga/ChatGLM-Efficient-Tuning - 对 ChatGLM-6B 进行参数高效微调。
- https://github.com/AGI-Edgerunners/LLM-Adapters

---

- [baize-chatbot](https://github.com/project-baize/baize-chatbot) - Let ChatGPT teach your own chatbot in hours with a single GPU!

  [用ChatGPT训练羊驼：「白泽」开源，轻松构建专属模型，可在线试玩](https://developer.aliyun.com/article/1228540)

- [Play with LLMs](https://github.com/evilpsycho/play-with-llms)
- [使用 Hugging Face 微调 Gemma 模型](https://huggingface.co/blog/zh/gemma-peft)
- [大语言模型（LLM）微调技术笔记](https://www.mingliumengshao.com/2023/06/08/%E5%A4%A7%E8%AF%AD%E8%A8%80%E6%A8%A1%E5%9E%8B%EF%BC%88llm%EF%BC%89%E5%BE%AE%E8%B0%83%E6%8A%80%E6%9C%AF%E7%AC%94%E8%AE%B0/)
- [LLM微调:如何制作自己的指令数据集](https://zhuanlan.zhihu.com/p/686408310)

## Example

- [Awesome Domain LLM：收集和梳理垂直领域的开源大语言模型、数据集及评测基准](https://www.mingliumengshao.com/2023/10/11/awesome-domain-llm%ef%bc%9a%e6%94%b6%e9%9b%86%e5%92%8c%e6%a2%b3%e7%90%86%e5%9e%82%e7%9b%b4%e9%a2%86%e5%9f%9f%e7%9a%84%e5%bc%80%e6%ba%90%e5%a4%a7%e8%af%ad%e8%a8%80%e6%a8%a1%e5%9e%8b%e3%80%81%e6%95%b0/)
- [中文儿童情感陪伴大模型“巧板”](https://github.com/HIT-SCIR-SC/QiaoBan)
- [国际中文教育大模型](https://github.com/blcuicall/taoli)
- [EduChat](https://github.com/ECNU-ICALK/EduChat) - 开源中英教育对话大模型。(通用基座模型，GPU部署，数据清理) 