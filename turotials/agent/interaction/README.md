## 澄清

```md
## Assistant

我已经探索了 av-cliper 包的代码结构，这是一个基于 WebCodecs 的音视频合成库。在开始撰写设计文档之前，我需要了解一些细节：

**Tool: question**

**Input:**
\`\`\`json
{
  "questions": [
    {
      "question": "设计文档的目标读者是谁？",
      "header": "目标读者",
      "options": [
        {
          "label": "包的使用者（开发者）",
          "description": "帮助开发者理解如何使用 av-cliper 的 API 和核心概念"
        },
        {
          "label": "包的维护者/贡献者",
          "description": "帮助理解内部架构、设计决策和代码组织"
        },
        {
          "label": "两者兼顾",
          "description": "同时覆盖使用指南和内部实现细节"
        }
      ],
      "multiple": false
    },
    {
      "question": "设计文档需要覆盖的深度？",
      "header": "文档深度",
      "options": [
        {
          "label": "高层架构概览",
          "description": "核心模块关系、数据流、关键概念解释"
        },
        {
          "label": "详细实现说明",
          "description": "包含每个类的详细设计、关键算法、性能考量"
        },
        {
          "label": "完整技术文档",
          "description": "包含架构、实现细节、API 文档、使用示例、最佳实践"
        }
      ],
      "multiple": false
    },
    {
      "question": "文档的主要语言？",
      "header": "语言",
      "options": [
        {
          "label": "中文",
          "description": "与现有 README 和代码注释风格一致"
        },
        {
          "label": "英文",
          "description": "便于国际化传播"
        },
        {
          "label": "中英双语",
          "description": "关键术语双语对照"
        }
      ],
      "multiple": false
    }
  ]
}
\`\`\`

**Output:**
\`\`\`
User has answered your questions: "设计文档的目标读者是谁？"="两者兼顾", "设计文档需要覆盖的深度？"="高层架构概览", "文档的主要语言？"="中文". You can now continue with the user's answers in mind.
\`\`\`
```