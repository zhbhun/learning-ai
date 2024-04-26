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

- [ColossalAI](https://github.com/hpcaitech/ColossalAI) - Colossal-AI 为您提供了一系列并行组件。我们的目标是让您的分布式 AI 模型像构建普通的单 GPU 模型一样简单。我们提供的友好工具可以让您在几行代码内快速开始分布式训练和推理。
- [unsloth](https://github.com/unslothai/unsloth) - Finetune Llama 3, Mistral & Gemma LLMs 2-5x faster with 80% less memory
- [baize-chatbot](https://github.com/project-baize/baize-chatbot) - Let ChatGPT teach your own chatbot in hours with a single GPU!

---

- [中文指令微调数据集（长期更新）](https://zhuanlan.zhihu.com/p/631640097)