import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Calculator } from "langchain/tools/calculator";
import { DynamicTool } from "@langchain/core/tools";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { pull } from "langchain/hub";

// 初始化 Gemini 模型
const model = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-pro", // 使用 model 而不是 modelName
  temperature: 0,
  apiKey: process.env.GOOGLE_API_KEY, // 请设置环境变量 GOOGLE_API_KEY
});

// 创建工具集
// 1. 计算器工具
const calculatorTool = new Calculator();

// 2. 自定义天气查询工具
const weatherTool = new DynamicTool({
  name: "weather",
  description: "获取指定城市的天气信息。输入应该是城市名称，例如：北京、上海、纽约等。",
  func: async (input) => {
    // 这里是模拟的天气数据，实际应用中应该调用真实的天气 API
    const weatherData = {
      "北京": "晴天，温度 15-25°C，空气质量良好",
      "上海": "多云，温度 18-26°C，有轻微雾霾",
      "纽约": "阴天，温度 10-18°C，可能有小雨",
      "伦敦": "多云转晴，温度 8-15°C",
    };
    
    const result = weatherData[input] || `抱歉，暂时没有 ${input} 的天气信息`;
    return result;
  },
});

// 3. 搜索工具（模拟）
const searchTool = new DynamicTool({
  name: "search",
  description: "在互联网上搜索最新信息。输入应该是搜索查询词。",
  func: async (input) => {
    // 模拟搜索结果
    const mockResults = {
      "人工智能": "人工智能（AI）是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。",
      "langchain": "LangChain 是一个用于开发由大语言模型驱动的应用程序的框架。",
      "gemini": "Gemini 是 Google 推出的多模态大语言模型，支持文本、图像等多种输入。",
    };
    
    for (const [key, value] of Object.entries(mockResults)) {
      if (input.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
    
    return `关于"${input}"的搜索结果：这是一个模拟的搜索工具，返回相关信息。`;
  },
});

// 组合所有工具
const tools = [calculatorTool, weatherTool, searchTool];

async function runReActAgent() {
  try {
    console.log("🤖 正在初始化 ReAct Agent...\n");
    
    // 从 LangChain Hub 拉取 ReAct 提示词模板
    const prompt = await pull("hwchase17/react");
    
    // 创建 ReAct agent
    const agent = await createReactAgent({
      llm: model,
      tools,
      prompt,
    });
    
    // 创建 agent 执行器
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true, // 显示详细的推理过程
      maxIterations: 5, // 最大迭代次数
    });
    
    // 测试案例 1：需要计算的问题
    console.log("=" .repeat(60));
    console.log("📝 测试案例 1: 数学计算");
    console.log("=" .repeat(60));
    const result1 = await agentExecutor.invoke({
      input: "如果一个产品原价是 299 元，打 8 折后再减 30 元，最终价格是多少？",
    });
    console.log("\n✅ 最终答案:", result1.output);
    
    // 测试案例 2：需要查询天气
    console.log("\n" + "=".repeat(60));
    console.log("📝 测试案例 2: 天气查询");
    console.log("=" .repeat(60));
    const result2 = await agentExecutor.invoke({
      input: "北京今天的天气怎么样？",
    });
    console.log("\n✅ 最终答案:", result2.output);
    
    // 测试案例 3：综合问题（需要搜索和计算）
    console.log("\n" + "=".repeat(60));
    console.log("📝 测试案例 3: 综合任务");
    console.log("=" .repeat(60));
    const result3 = await agentExecutor.invoke({
      input: "LangChain 是什么？如果有 3 个开发者每人工作 8 小时，总共工作多少小时？",
    });
    console.log("\n✅ 最终答案:", result3.output);
    
  } catch (error) {
    console.error("❌ 错误:", error.message);
    if (error.message.includes("API key")) {
      console.log("\n💡 提示: 请确保设置了 GOOGLE_API_KEY 环境变量");
      console.log("   例如: export GOOGLE_API_KEY='your-api-key-here'");
    }
  }
}

// 运行示例
console.log("🚀 LangChain + Gemini ReAct Agent 示例\n");
runReActAgent();

