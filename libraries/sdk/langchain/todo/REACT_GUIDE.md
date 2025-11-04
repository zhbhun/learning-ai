# ReAct 提示词完整指南

## 📚 目录

1. [什么是 ReAct](#什么是-react)
2. [快速开始](#快速开始)
3. [示例文件说明](#示例文件说明)
4. [ReAct 工作原理](#react-工作原理)
5. [实战技巧](#实战技巧)

---

## 什么是 ReAct

**ReAct = Reasoning (推理) + Acting (行动)**

ReAct 是一种让 AI 能够：
1. **思考**问题
2. **决定**使用什么工具
3. **执行**工具调用
4. **观察**结果
5. **继续思考**或给出答案

### 为什么需要 ReAct？

传统的 LLM 只能生成文本，无法：
- ❌ 获取实时信息（如天气、股价）
- ❌ 执行复杂计算
- ❌ 查询数据库
- ❌ 调用 API

使用 ReAct，AI 可以：
- ✅ 调用工具获取实时数据
- ✅ 执行复杂操作
- ✅ 结合多个工具解决复杂问题
- ✅ 动态调整策略

---

## 快速开始

### 1. 安装依赖

项目已经配置好依赖，如果需要重新安装：

```bash
cd /Users/zhanghuabin/Project/learning/ai/libraries/sdk/langchain/tester
npm install
# 或
pnpm install
```

### 2. 设置 API Key

获取 Gemini API Key：https://aistudio.google.com/app/apikey

```bash
# macOS/Linux
export GOOGLE_API_KEY='your-api-key-here'

# Windows
set GOOGLE_API_KEY=your-api-key-here
```

或创建 `.env` 文件：
```env
GOOGLE_API_KEY=your-api-key-here
```

如果使用 `.env` 文件，需要安装 dotenv：
```bash
npm install dotenv
```

并在代码顶部添加：
```javascript
import 'dotenv/config';
```

### 3. 运行示例

```bash
# 简化版（推荐新手）
node react-simple.js

# 完整版（多个工具和测试案例）
node temp.js

# 自定义提示词版（高级用法）
node react-custom-prompt.js
```

---

## 示例文件说明

### 📄 react-simple.js
**适合：** 初学者

**特点：**
- 只有 2 个简单工具
- 代码有详细注释
- 清晰展示 ReAct 流程

**学习重点：**
- ReAct 的基本概念
- 如何定义工具
- 如何创建 Agent

**运行：**
```bash
node react-simple.js
```

---

### 📄 temp.js
**适合：** 进阶学习

**特点：**
- 3 个实用工具（计算器、天气、搜索）
- 多个测试案例
- 展示真实应用场景

**学习重点：**
- 工具的最佳实践
- 错误处理
- 多工具协作

**运行：**
```bash
node temp.js
```

---

### 📄 react-custom-prompt.js
**适合：** 高级用户

**特点：**
- 自定义中文提示词
- 优化的推理格式
- 展示高级配置

**学习重点：**
- 如何自定义提示词
- 提示词工程技巧
- 优化 AI 行为

**运行：**
```bash
node react-custom-prompt.js
```

---

### 📄 react-example.md
**完整的理论和实践指南**
- ReAct 原理详解
- 代码结构说明
- 最佳实践
- 常见问题解答
- 扩展阅读

---

## ReAct 工作原理

### 流程图

```
┌─────────────┐
│  用户提问   │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Thought (思考)     │ ← AI 分析问题
│  "我需要查询天气"  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Action (行动)      │ ← AI 选择工具
│  weather            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Action Input       │ ← AI 准备输入
│  "北京"             │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Observation        │ ← 工具返回结果
│  "晴天，15-25°C"    │
└──────┬──────────────┘
       │
       ▼
   需要更多信息？
       │
   ┌───┴───┐
   │       │
  是      否
   │       │
   │       ▼
   │   ┌─────────────┐
   │   │ Final Answer│
   │   └─────────────┘
   │
   └──(返回 Thought)
```

### 实际例子

**问题：** "iPhone 打 8 折后多少钱？"

```
Thought: 我需要先查询 iPhone 的原价
Action: price_checker
Action Input: iPhone
Observation: iPhone 的价格是 5999 元

Thought: 现在我知道原价了，需要计算 8 折后的价格
Action: discount_calculator  
Action Input: 5999,0.8
Observation: 打折后价格：4799.2 元

Thought: 我现在知道最终答案了
Final Answer: iPhone 打 8 折后是 4799.2 元
```

---

## 实战技巧

### 1. 编写好的工具描述

工具描述是 AI 选择工具的唯一依据！

#### ❌ 不好的描述
```javascript
description: "查天气"
```

#### ✅ 好的描述
```javascript
description: "获取指定城市的天气信息，包括温度、天气状况和空气质量。输入应该是城市名称（中文或英文），例如：北京、上海、New York。"
```

**要点：**
- 说明工具的功能
- 说明输入格式
- 提供示例
- 说明返回什么

---

### 2. 工具函数最佳实践

```javascript
const goodTool = new DynamicTool({
  name: "calculator",
  description: "执行数学计算。输入数学表达式，例如 '2+2' 或 '10*5/2'。",
  func: async (input) => {
    try {
      // 1. 验证输入
      if (!input || typeof input !== 'string') {
        return "错误：请提供有效的数学表达式";
      }
      
      // 2. 执行操作
      const result = performCalculation(input);
      
      // 3. 返回清晰的结果
      return `计算结果：${result}`;
      
    } catch (error) {
      // 4. 处理错误
      return `计算错误：${error.message}`;
    }
  },
});
```

**要点：**
- ✅ 验证输入
- ✅ 错误处理
- ✅ 返回清晰的结果
- ✅ 使用 async/await

---

### 3. 控制 Agent 行为

```javascript
const agentExecutor = new AgentExecutor({
  agent,
  tools,
  
  // 显示推理过程（开发时开启）
  verbose: true,
  
  // 最大迭代次数（防止死循环）
  maxIterations: 5,
  
  // 超时时间
  timeout: 30000, // 30 秒
  
  // 早停策略
  earlyStoppingMethod: "generate",
});
```

---

### 4. 温度设置

```javascript
// 需要精确推理 → temperature = 0
const model = new ChatGoogleGenerativeAI({
  temperature: 0, // 确定性输出
});

// 需要创造性 → temperature = 0.7-1.0
const model = new ChatGoogleGenerativeAI({
  temperature: 0.8, // 更有创造性
});
```

---

### 5. 调试技巧

#### 方法 1：开启 verbose
```javascript
const agentExecutor = new AgentExecutor({
  verbose: true, // 看到完整推理过程
});
```

#### 方法 2：添加日志
```javascript
const tool = new DynamicTool({
  name: "my_tool",
  func: async (input) => {
    console.log("工具输入:", input); // 调试
    const result = await doSomething(input);
    console.log("工具输出:", result); // 调试
    return result;
  },
});
```

#### 方法 3：捕获每一步
```javascript
const result = await agentExecutor.invoke(
  { input: "问题" },
  {
    callbacks: [{
      handleToolStart(tool, input) {
        console.log(`🔧 使用工具: ${tool.name}`);
        console.log(`📥 输入: ${input}`);
      },
      handleToolEnd(output) {
        console.log(`📤 输出: ${output}`);
      },
    }],
  }
);
```

---

### 6. 常见问题及解决方案

#### 问题 1：Agent 不调用工具
**原因：** 工具描述不清晰或问题不需要工具

**解决：**
```javascript
// ❌ 描述太简单
description: "搜索"

// ✅ 描述详细
description: "在互联网上搜索最新信息。当你需要查找实时数据、新闻或不在你知识库中的信息时使用。输入搜索关键词。"
```

---

#### 问题 2：Agent 调用错误的工具
**原因：** 多个工具描述相似

**解决：**
```javascript
// ❌ 描述重叠
tool1: { description: "获取信息" }
tool2: { description: "查询信息" }

// ✅ 描述明确
tool1: { description: "从数据库中获取历史数据" }
tool2: { description: "从互联网搜索最新信息" }
```

---

#### 问题 3：Agent 陷入循环
**原因：** 工具没有返回有用信息

**解决：**
```javascript
// ❌ 返回不明确
return "成功";

// ✅ 返回详细信息
return "查询成功，找到 3 条记录：...";

// 设置最大迭代次数
const agentExecutor = new AgentExecutor({
  maxIterations: 3, // 限制循环次数
});
```

---

#### 问题 4：性能慢
**解决：**
1. 减少工具数量
2. 优化工具执行速度
3. 使用更快的模型
4. 减少 verbose 输出

---

### 7. 工具设计原则

#### 单一职责
```javascript
// ❌ 工具做太多事
const multiTool = new DynamicTool({
  name: "super_tool",
  description: "可以查天气、算数、搜索、翻译",
  func: async (input) => {
    // 太复杂！
  },
});

// ✅ 每个工具只做一件事
const weatherTool = new DynamicTool({
  name: "weather",
  description: "查询城市天气",
  func: async (city) => { /* ... */ },
});

const calculatorTool = new DynamicTool({
  name: "calculator",
  description: "执行数学计算",
  func: async (expr) => { /* ... */ },
});
```

#### 输入输出清晰
```javascript
const goodTool = new DynamicTool({
  name: "search_user",
  description: "根据用户ID查询用户信息。输入用户ID（数字），返回用户的姓名、邮箱和注册日期。",
  func: async (userId) => {
    const user = await db.findUser(userId);
    // 返回结构化信息
    return `用户信息：
    - 姓名：${user.name}
    - 邮箱：${user.email}
    - 注册日期：${user.createdAt}`;
  },
});
```

---

## 📚 进阶学习

### 推荐阅读
1. [ReAct 论文](https://arxiv.org/abs/2210.03629) - 原始论文
2. [LangChain 官方文档](https://js.langchain.com/docs/modules/agents/)
3. [Gemini API 文档](https://ai.google.dev/docs)

### 推荐观看
1. [LangChain 系列课程](https://www.bilibili.com/video/BV1Uh4y1X76G/)

### 实战项目
1. 客服机器人（查询订单、退换货）
2. 数据分析助手（查询数据库、生成报表）
3. 个人助理（查日程、发邮件、设提醒）

---

## 🎯 下一步

1. ✅ 运行 `react-simple.js` 理解基础概念
2. ✅ 运行 `temp.js` 看更多实例
3. ✅ 阅读 `react-example.md` 深入学习
4. ✅ 修改代码，添加自己的工具
5. ✅ 尝试 `react-custom-prompt.js` 自定义提示词
6. ✅ 构建自己的 AI Agent 应用

---

## 💬 常见问题

**Q: Gemini API 免费吗？**
A: 有免费额度，具体查看 https://ai.google.dev/pricing

**Q: 可以用其他模型吗？**
A: 可以！LangChain 支持 OpenAI、Claude 等多种模型

**Q: 如何添加更多工具？**
A: 参考示例代码，创建新的 DynamicTool 并添加到 tools 数组

**Q: ReAct 和普通 Prompt 有什么区别？**
A: 普通 Prompt 只能生成文本，ReAct 可以调用工具和外部系统

**Q: 工具调用会消耗更多 tokens 吗？**
A: 是的，每次工具调用都会产生额外的推理步骤

---

## 📞 获取帮助

- 查看代码注释
- 阅读 `react-example.md`
- 开启 `verbose: true` 查看详细日志
- 在 LangChain Discord 社区提问

---

**祝学习愉快！🚀**

