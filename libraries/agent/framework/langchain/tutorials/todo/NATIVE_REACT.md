# 原生 ReAct 实现 - 不使用 LangChain

本文档展示如何使用 `@google/genai` SDK 原生实现 ReAct，不依赖 LangChain。

## 🎯 为什么要原生实现？

### 优势
- ✅ **理解更深入** - 清楚 ReAct 的每个步骤
- ✅ **更灵活** - 完全控制流程和逻辑
- ✅ **更轻量** - 只依赖 Google AI SDK
- ✅ **易于调试** - 代码简单直观
- ✅ **自定义** - 可以根据需求修改任何部分

### LangChain 的优势
- ✅ 开箱即用，快速开发
- ✅ 丰富的工具生态
- ✅ 支持多种 LLM
- ✅ 社区支持

## 📁 文件说明

### 1. native-react-simple.js
**简化版实现**

```bash
node native-react-simple.js
```

**特点：**
- 约 150 行代码
- 清晰的 ReAct 循环
- 2 个示例工具
- 适合学习 ReAct 原理

**核心代码：**
```javascript
// 1. 定义工具
const tools = {
  tool_name: {
    name: "tool_name",
    description: "工具描述",
    func: async (input) => { return result; }
  }
};

// 2. 构建 ReAct 提示词
function buildReActPrompt(question, history) {
  return `你是助手...
  Thought: 思考
  Action: 工具名
  Action Input: 输入
  ...`;
}

// 3. 解析响应
function parseResponse(text) {
  // 提取 Thought, Action, Action Input, Final Answer
}

// 4. 执行工具
async function executeTool(toolName, input) {
  return await tools[toolName].func(input);
}

// 5. ReAct 循环
while (iteration < maxIterations) {
  // 调用 AI
  // 解析响应
  // 执行工具
  // 更新历史
}
```

---

### 2. native-react-advanced.js
**高级版实现**

```bash
node native-react-advanced.js
```

**特点：**
- 面向对象设计
- ToolRegistry 管理工具
- ReActAgent 类
- 4 个工具（价格、计算、天气、搜索）
- 更好的错误处理
- 多个测试案例

**核心架构：**
```javascript
// 工具注册表
class ToolRegistry {
  register(name, description, func)
  get(name)
  getAll()
}

// ReAct Agent
class ReActAgent {
  constructor(model, toolRegistry, options)
  buildPrompt(question, history)
  parseResponse(text)
  executeTool(toolName, input)
  async run(question)
}
```

## 🔧 核心实现原理

### ReAct 循环流程

```
┌─────────────────────────────────────────┐
│  1. 构建提示词（问题 + 历史 + 格式）    │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  2. 调用 Gemini API                     │
│     model.generateContent(prompt)       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  3. 解析 AI 响应                        │
│     - 提取 Thought                      │
│     - 提取 Action                       │
│     - 提取 Action Input                 │
│     - 或检测 Final Answer               │
└─────────────┬───────────────────────────┘
              │
              ▼
        是否 Final Answer?
              │
        ┌─────┴─────┐
        │           │
       是          否
        │           │
        │           ▼
        │     ┌─────────────────────┐
        │     │  4. 执行工具        │
        │     │     tools[name](in) │
        │     └──────────┬──────────┘
        │                │
        │                ▼
        │     ┌─────────────────────┐
        │     │  5. 获取 Observation│
        │     └──────────┬──────────┘
        │                │
        │                ▼
        │     ┌─────────────────────┐
        │     │  6. 更新历史记录    │
        │     └──────────┬──────────┘
        │                │
        │                └──(返回步骤1)
        │
        ▼
   ┌─────────────┐
   │  返回答案   │
   └─────────────┘
```

### 关键代码解析

#### 1. 提示词设计

```javascript
const prompt = `你是一个智能助手，可以使用工具来回答问题。

可用工具：
- price_checker: 查询产品价格
- calculator: 执行数学计算

回答格式（严格遵循）：
Thought: 我需要...
Action: 工具名称
Action Input: 输入参数
Observation: [系统填入]

最终：
Thought: 我现在知道答案了
Final Answer: 答案

问题：${question}

${history}
开始：

Thought:`;
```

**要点：**
- ✅ 清楚说明可用工具
- ✅ 提供明确的格式示例
- ✅ 包含历史对话
- ✅ 以 "Thought:" 结尾引导 AI

#### 2. 响应解析

```javascript
function parseResponse(text) {
  // 检查最终答案
  const finalMatch = text.match(/Final Answer:\s*(.+)/i);
  if (finalMatch) {
    return { type: "final_answer", content: finalMatch[1] };
  }

  // 提取各部分
  const thought = text.match(/Thought:\s*(.+?)(?=\n|$)/i)?.[1];
  const action = text.match(/Action:\s*(.+?)(?=\n|$)/i)?.[1];
  const actionInput = text.match(/Action Input:\s*(.+?)(?=\n|$)/i)?.[1];

  if (!action || !actionInput) {
    return { type: "error", content: "解析失败" };
  }

  return { type: "action", thought, action, actionInput };
}
```

**要点：**
- ✅ 使用正则表达式提取关键信息
- ✅ 处理多种情况（最终答案、行动、错误）
- ✅ 返回结构化数据

#### 3. 工具执行

```javascript
async function executeTool(toolName, input) {
  const tool = tools[toolName];
  
  if (!tool) {
    return `错误：工具 ${toolName} 不存在`;
  }

  try {
    const result = await tool.func(input);
    return result;
  } catch (error) {
    return `错误：${error.message}`;
  }
}
```

**要点：**
- ✅ 验证工具存在性
- ✅ 错误处理
- ✅ 返回清晰的结果

#### 4. 历史管理

```javascript
// 每轮之后更新历史
history += `Thought: ${thought}\n`;
history += `Action: ${action}\n`;
history += `Action Input: ${actionInput}\n`;
history += `Observation: ${observation}\n\n`;
```

**要点：**
- ✅ 保持完整的对话历史
- ✅ 让 AI 可以参考之前的结果
- ✅ 格式一致

## 🚀 快速开始

### 1. 确保已安装依赖

```bash
# 查看 package.json
cat package.json

# 如果没有 @google/genai，安装它
pnpm add @google/genai
```

### 2. 设置 API Key

```bash
export GOOGLE_API_KEY='your-api-key-here'
```

### 3. 运行示例

```bash
# 简化版
node native-react-simple.js

# 高级版（推荐）
node native-react-advanced.js
```

## 📝 添加自定义工具

### 简化版

```javascript
// 在 tools 对象中添加
const tools = {
  // ... 现有工具

  my_new_tool: {
    name: "my_new_tool",
    description: "我的新工具，做什么事情。输入什么，返回什么。",
    func: async (input) => {
      // 你的逻辑
      const result = doSomething(input);
      return `结果：${result}`;
    },
  },
};
```

### 高级版

```javascript
// 使用 toolRegistry.register()
toolRegistry.register(
  "my_new_tool",                    // 工具名称
  "我的新工具的详细描述",            // 描述（很重要！）
  async (input) => {                // 执行函数
    const result = doSomething(input);
    return `结果：${result}`;
  }
);
```

### 工具设计最佳实践

```javascript
toolRegistry.register(
  "weather_api",
  
  // ✅ 好的描述：清晰、具体、有示例
  "查询指定城市的实时天气信息。输入城市名称（中文），返回天气、温度、湿度、空气质量。例如输入'北京'返回完整天气信息。",
  
  // ❌ 不好的描述：模糊
  // "查天气",
  
  async (city) => {
    // 验证输入
    if (!city || typeof city !== 'string') {
      return "错误：请提供有效的城市名称";
    }

    try {
      // 调用实际 API
      const data = await fetchWeatherAPI(city);
      
      // 返回结构化、易读的结果
      return `${city}天气：
        天气：${data.weather}
        温度：${data.temperature}°C
        湿度：${data.humidity}%
        空气质量：${data.aqi}`;
        
    } catch (error) {
      // 错误处理
      return `获取天气失败：${error.message}`;
    }
  }
);
```

## 🔍 调试技巧

### 1. 查看完整的提示词

```javascript
function buildReActPrompt(question, history) {
  const prompt = `...`;
  
  // 调试：打印提示词
  console.log("=== 提示词 ===");
  console.log(prompt);
  console.log("=============");
  
  return prompt;
}
```

### 2. 查看 AI 原始响应

```javascript
const result = await model.generateContent(prompt);
const response = result.response.text();

// 调试：打印原始响应
console.log("=== AI 原始响应 ===");
console.log(response);
console.log("==================");
```

### 3. 跟踪解析结果

```javascript
const parsed = parseResponse(response);

// 调试：打印解析结果
console.log("=== 解析结果 ===");
console.log(JSON.stringify(parsed, null, 2));
console.log("================");
```

### 4. 监控工具调用

```javascript
async function executeTool(toolName, input) {
  console.log(`🔧 调用工具: ${toolName}`);
  console.log(`📥 输入: ${input}`);
  
  const result = await tool.func(input);
  
  console.log(`📤 输出: ${result}`);
  
  return result;
}
```

## 🎨 扩展功能

### 1. 添加工具调用统计

```javascript
class ReActAgent {
  constructor(model, toolRegistry, options) {
    // ...
    this.stats = {
      toolCalls: {},
      totalIterations: 0,
    };
  }

  async executeTool(toolName, input) {
    // 统计
    this.stats.toolCalls[toolName] = 
      (this.stats.toolCalls[toolName] || 0) + 1;
    
    // 执行
    return await this.toolRegistry.get(toolName).func(input);
  }

  getStats() {
    return this.stats;
  }
}
```

### 2. 添加流式输出

```javascript
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
});

// 使用 generateContentStream
const result = await model.generateContentStream(prompt);

for await (const chunk of result.stream) {
  const text = chunk.text();
  process.stdout.write(text);
}
```

### 3. 添加缓存机制

```javascript
class ToolCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value);
  }

  has(key) {
    return this.cache.has(key);
  }
}

const cache = new ToolCache();

async function executeTool(toolName, input) {
  const cacheKey = `${toolName}:${input}`;
  
  if (cache.has(cacheKey)) {
    console.log("💾 使用缓存结果");
    return cache.get(cacheKey);
  }

  const result = await tool.func(input);
  cache.set(cacheKey, result);
  
  return result;
}
```

### 4. 添加超时控制

```javascript
async function runWithTimeout(fn, timeoutMs) {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("超时")), timeoutMs)
    ),
  ]);
}

async function run(question) {
  try {
    const result = await runWithTimeout(
      () => this.runInternal(question),
      30000  // 30秒超时
    );
    return result;
  } catch (error) {
    if (error.message === "超时") {
      return { success: false, answer: "执行超时" };
    }
    throw error;
  }
}
```

## 📊 对比：原生 vs LangChain

| 特性 | 原生实现 | LangChain |
|------|---------|-----------|
| 代码量 | 150-300 行 | 20-50 行 |
| 学习曲线 | 陡峭，需理解原理 | 平缓，抽象良好 |
| 灵活性 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 性能 | 轻量，快速 | 稍重 |
| 调试 | 容易，代码直观 | 需了解框架 |
| 工具生态 | 自己实现 | 丰富 |
| 多模型支持 | 需自己适配 | 开箱即用 |
| 适用场景 | 学习、特定需求 | 快速开发 |

## 🎓 学习建议

1. **先运行** `native-react-simple.js`，理解基本流程
2. **阅读代码**，理解每个函数的作用
3. **添加日志**，观察每一步的输出
4. **修改提示词**，看看 AI 行为如何变化
5. **添加新工具**，实践工具设计
6. **尝试高级版**，学习更好的代码组织
7. **对比 LangChain**，理解框架的价值

## 🐛 常见问题

### Q: AI 不按格式输出怎么办？

A: 
1. 检查提示词是否清晰
2. 在提示词中强调"严格遵循格式"
3. 提供更多示例
4. 使用 temperature: 0 提高确定性

### Q: 工具经常调用错误？

A: 
1. 改进工具描述，更具体
2. 在描述中提供输入示例
3. 检查工具名称是否容易混淆

### Q: 如何处理多步骤任务？

A: 
1. 增加 maxIterations
2. 在提示词中说明可以多次使用工具
3. 历史记录帮助 AI 记住之前的步骤

### Q: 性能优化？

A:
1. 使用缓存避免重复调用
2. 使用 gemini-flash 而不是 pro
3. 减少提示词长度
4. 并行执行独立的工具调用

## 📚 进一步学习

- [ReAct 论文](https://arxiv.org/abs/2210.03629)
- [Gemini API 文档](https://ai.google.dev/docs)
- [LangChain 对比学习](../react-example.md)

---

**开始构建你的 AI Agent！🚀**

