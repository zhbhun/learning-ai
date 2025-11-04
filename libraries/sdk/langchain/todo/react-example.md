# LangChain + Gemini ReAct Agent 示例

## 什么是 ReAct？

**ReAct** (Reasoning + Acting) 是一种提示词技术，它结合了：
- **推理 (Reasoning)**: AI 思考问题和计划步骤
- **行动 (Acting)**: AI 调用工具来获取信息或执行操作

ReAct 让 AI Agent 能够：
1. 分析问题
2. 决定需要使用什么工具
3. 执行工具调用
4. 根据结果继续推理
5. 最终得出答案

## ReAct 工作流程

```
问题 → 思考(Thought) → 行动(Action) → 观察(Observation) → 思考 → ... → 答案
```

### 示例流程：

**问题**: "北京今天的天气怎么样？如果温度超过 20 度，计算 20 的平方。"

1. **Thought**: 我需要先查询北京的天气
2. **Action**: 调用 weather 工具，参数 "北京"
3. **Observation**: 晴天，温度 15-25°C
4. **Thought**: 最高温度是 25°C，超过 20°C，需要计算 20 的平方
5. **Action**: 调用 calculator 工具，计算 "20^2"
6. **Observation**: 400
7. **Thought**: 现在我有了所有信息
8. **Answer**: 北京今天晴天，温度 15-25°C，20 的平方是 400

## 代码结构说明

### 1. 初始化 Gemini 模型

```javascript
const model = new ChatGoogleGenerativeAI({
  modelName: "gemini-1.5-pro",
  temperature: 0, // 设置为 0 使输出更确定性
  apiKey: process.env.GOOGLE_API_KEY,
});
```

### 2. 定义工具

工具是 Agent 可以调用的函数。每个工具需要：
- **name**: 工具名称
- **description**: 工具的功能描述（很重要！AI 根据这个决定何时使用工具）
- **func**: 实际执行的函数

```javascript
const weatherTool = new DynamicTool({
  name: "weather",
  description: "获取指定城市的天气信息。输入应该是城市名称。",
  func: async (input) => {
    // 工具逻辑
    return result;
  },
});
```

### 3. 创建 ReAct Agent

```javascript
// 从 LangChain Hub 拉取 ReAct 提示词模板
const prompt = await pull("hwchase17/react");

// 创建 agent
const agent = await createReactAgent({
  llm: model,
  tools,
  prompt,
});

// 创建执行器
const agentExecutor = new AgentExecutor({
  agent,
  tools,
  verbose: true, // 显示推理过程
  maxIterations: 5, // 防止无限循环
});
```

### 4. 运行 Agent

```javascript
const result = await agentExecutor.invoke({
  input: "你的问题",
});
console.log(result.output);
```

## 运行示例

### 1. 设置环境变量

```bash
export GOOGLE_API_KEY='your-gemini-api-key'
```

或者创建 `.env` 文件：
```
GOOGLE_API_KEY=your-gemini-api-key
```

### 2. 运行代码

```bash
node temp.js
```

## ReAct 提示词模板

LangChain Hub 中的 ReAct 模板大致如下：

```
Answer the following questions as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question

Begin!

Question: {input}
Thought: {agent_scratchpad}
```

## 关键概念

### 1. Tools（工具）
- 工具是 Agent 可以调用的外部函数
- 可以是 API 调用、数据库查询、计算等
- 工具描述要清晰准确，AI 根据描述选择工具

### 2. Agent Executor（执行器）
- 管理 Agent 的执行流程
- 处理工具调用和结果
- 控制迭代次数，防止死循环

### 3. Verbose Mode（详细模式）
- 开启后可以看到 AI 的完整思考过程
- 有助于调试和理解 Agent 行为

### 4. Max Iterations（最大迭代次数）
- 防止 Agent 陷入无限循环
- 建议设置为 3-10 之间

## 最佳实践

### 1. 工具描述要清晰
```javascript
// ❌ 不好的描述
description: "查天气"

// ✅ 好的描述
description: "获取指定城市的天气信息。输入应该是城市名称，例如：北京、上海、纽约等。"
```

### 2. 控制工具数量
- 工具太多会让 AI 难以选择
- 建议每个 Agent 3-7 个工具

### 3. 处理错误
```javascript
func: async (input) => {
  try {
    // 工具逻辑
  } catch (error) {
    return `错误: ${error.message}`;
  }
}
```

### 4. 使用适当的 temperature
- `temperature: 0` - 确定性输出，适合需要精确推理的任务
- `temperature: 0.7` - 更有创造性，适合开放性任务

## 常见问题

### Q: Agent 没有调用工具？
A: 检查工具描述是否清晰，或者问题是否真的需要工具

### Q: Agent 调用了错误的工具？
A: 改进工具描述，使其更加明确具体

### Q: Agent 陷入循环？
A: 
- 降低 `maxIterations`
- 检查工具返回值是否有用
- 改进提示词

### Q: 如何添加新工具？
A: 
```javascript
const newTool = new DynamicTool({
  name: "tool_name",
  description: "清晰的描述",
  func: async (input) => {
    return result;
  },
});

const tools = [...existingTools, newTool];
```

## 扩展阅读

- [ReAct 论文](https://arxiv.org/abs/2210.03629)
- [LangChain Agent 文档](https://js.langchain.com/docs/modules/agents/)
- [LangChain Hub](https://smith.langchain.com/hub)

## 进阶用法

### 自定义 ReAct 提示词

```javascript
import { PromptTemplate } from "@langchain/core/prompts";

const customPrompt = PromptTemplate.fromTemplate(`
你是一个有用的助手。你有以下工具可用：

{tools}

使用以下格式回答：

问题：{input}
思考：我应该怎么做
行动：使用的工具名称
行动输入：工具的输入
观察：工具的输出结果
...（重复思考/行动/观察）
思考：我现在知道答案了
最终答案：最终的答案

开始！

{agent_scratchpad}
`);
```

### 添加记忆功能

```javascript
import { BufferMemory } from "langchain/memory";

const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: "chat_history",
});

const agentExecutor = new AgentExecutor({
  agent,
  tools,
  memory, // 添加记忆
  verbose: true,
});
```

### 流式输出

```javascript
const result = await agentExecutor.stream({
  input: "你的问题",
});

for await (const chunk of result) {
  console.log(chunk);
}
```

