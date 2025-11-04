import { GoogleGenerativeAI } from "@google/genai";

/**
 * 原生实现 ReAct - 高级版
 * 包含更多工具、更好的错误处理、支持多轮对话
 */

// 初始化 Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    temperature: 0,
  },
});

// 工具注册表
class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  register(name, description, func) {
    this.tools.set(name, { name, description, func });
    return this;
  }

  get(name) {
    return this.tools.get(name);
  }

  getAll() {
    return Array.from(this.tools.values());
  }

  getDescriptions() {
    return this.getAll()
      .map((tool) => `- ${tool.name}: ${tool.description}`)
      .join("\n");
  }

  getNames() {
    return Array.from(this.tools.keys()).join(", ");
  }
}

// 创建工具注册表
const toolRegistry = new ToolRegistry();

// 注册工具
toolRegistry
  .register(
    "price_checker",
    "查询产品的价格。输入产品名称（如 iPhone, iPad, MacBook），返回价格。",
    async (productName) => {
      const prices = {
        iPhone: 5999,
        iPad: 3999,
        MacBook: 9999,
        AirPods: 1299,
        "Apple Watch": 2999,
      };

      const product = Object.keys(prices).find(
        (key) => key.toLowerCase() === productName.toLowerCase()
      );

      if (product) {
        return `${product} 的价格是 ${prices[product]} 元`;
      }
      return `抱歉，找不到 ${productName} 的价格信息。可查询的产品有：${Object.keys(prices).join("、")}`;
    }
  )
  .register(
    "calculator",
    "执行数学计算。输入数学表达式（如 100*0.8 或 5999-1000），返回计算结果。",
    async (expression) => {
      try {
        // 安全的计算方法：只允许数字和基本运算符
        const sanitized = expression.replace(/[^0-9+\-*/().]/g, "");
        if (sanitized !== expression.replace(/\s/g, "")) {
          return "错误：表达式包含非法字符";
        }

        const result = Function(`"use strict"; return (${sanitized})`)();
        return `计算结果：${result}`;
      } catch (error) {
        return `计算错误：${error.message}`;
      }
    }
  )
  .register(
    "weather",
    "查询城市的天气信息。输入城市名称（中文），返回天气、温度等信息。",
    async (city) => {
      const weatherData = {
        北京: { weather: "晴天", temp: "15-25°C", aqi: "良好" },
        上海: { weather: "多云", temp: "18-26°C", aqi: "轻度污染" },
        广州: { weather: "小雨", temp: "22-28°C", aqi: "优" },
        深圳: { weather: "阴天", temp: "23-29°C", aqi: "良好" },
      };

      const data = weatherData[city];
      if (data) {
        return `${city}天气：${data.weather}，温度 ${data.temp}，空气质量${data.aqi}`;
      }
      return `抱歉，暂无 ${city} 的天气信息`;
    }
  )
  .register(
    "search",
    "搜索互联网信息。输入搜索关键词，返回相关信息。",
    async (query) => {
      const mockData = {
        react: "ReAct 是一种提示词技术，结合了推理（Reasoning）和行动（Acting）。",
        gemini: "Gemini 是 Google 开发的多模态大语言模型，支持文本、图像等输入。",
        ai: "人工智能（AI）是计算机科学的一个分支，致力于创建能够执行通常需要人类智能的任务的系统。",
      };

      for (const [key, value] of Object.entries(mockData)) {
        if (query.toLowerCase().includes(key)) {
          return value;
        }
      }

      return `关于"${query}"的搜索结果：这是一个模拟搜索，实际应用中会调用真实搜索 API。`;
    }
  );

// ReAct Agent 类
class ReActAgent {
  constructor(model, toolRegistry, options = {}) {
    this.model = model;
    this.toolRegistry = toolRegistry;
    this.maxIterations = options.maxIterations || 5;
    this.verbose = options.verbose !== false;
  }

  buildPrompt(question, history = "") {
    return `你是一个智能助手，可以使用工具来回答用户的问题。

可用工具：
${this.toolRegistry.getDescriptions()}

回答格式（严格遵循）：
Thought: 分析问题，决定下一步
Action: 工具名称（必须是 ${this.toolRegistry.getNames()} 之一）
Action Input: 工具的输入参数
Observation: [工具输出，由系统填入]

重复以上步骤，直到可以回答问题，然后：
Thought: 我现在掌握了足够的信息
Final Answer: 最终答案

规则：
1. 每次只能使用一个工具
2. 必须等待 Observation 后才能继续
3. Action 必须精确匹配工具名称
4. 如果不需要工具就能回答，直接给出 Final Answer

问题：${question}

${history}开始：

Thought:`;
  }

  parseResponse(text) {
    if (this.verbose) {
      console.log("\n🤖 AI 原始响应：");
      console.log("-".repeat(70));
      console.log(text);
      console.log("-".repeat(70));
    }

    // 检查最终答案
    const finalAnswerMatch = text.match(/Final Answer:\s*(.+?)(?=\n\n|\n$|$)/is);
    if (finalAnswerMatch) {
      return {
        type: "final_answer",
        content: finalAnswerMatch[1].trim(),
      };
    }

    // 提取各部分
    const thoughtMatch = text.match(/Thought:\s*(.+?)(?=\n|$)/i);
    const actionMatch = text.match(/Action:\s*(.+?)(?=\n|$)/i);
    const actionInputMatch = text.match(/Action Input:\s*(.+?)(?=\n|$)/i);

    if (!actionMatch) {
      // AI 可能直接给出了答案，尝试提取
      if (thoughtMatch) {
        return {
          type: "final_answer",
          content: thoughtMatch[1].trim(),
        };
      }
      return { type: "error", content: "无法解析响应：未找到 Action 或 Final Answer" };
    }

    const thought = thoughtMatch ? thoughtMatch[1].trim() : "";
    const action = actionMatch[1].trim();
    const actionInput = actionInputMatch ? actionInputMatch[1].trim() : "";

    if (!actionInput) {
      return { type: "error", content: "未找到 Action Input" };
    }

    return {
      type: "action",
      thought,
      action,
      actionInput,
    };
  }

  async executeTool(toolName, input) {
    const tool = this.toolRegistry.get(toolName);

    if (!tool) {
      const availableTools = this.toolRegistry.getNames();
      return `错误：工具 "${toolName}" 不存在。可用工具：${availableTools}`;
    }

    try {
      const result = await tool.func(input);
      return result;
    } catch (error) {
      return `工具执行错误：${error.message}`;
    }
  }

  async run(question) {
    if (this.verbose) {
      console.log("=".repeat(70));
      console.log("🚀 ReAct Agent 开始运行");
      console.log("=".repeat(70));
      console.log(`\n❓ 问题: ${question}\n`);
    }

    let history = "";
    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;

      if (this.verbose) {
        console.log(`\n${"─".repeat(70)}`);
        console.log(`📍 第 ${iteration}/${this.maxIterations} 轮`);
        console.log(`${"─".repeat(70)}`);
      }

      try {
        // 构建提示词并调用 AI
        const prompt = this.buildPrompt(question, history);
        const result = await this.model.generateContent(prompt);
        const response = result.response.text();

        // 解析响应
        const parsed = this.parseResponse(response);

        if (parsed.type === "final_answer") {
          if (this.verbose) {
            console.log("\n" + "=".repeat(70));
            console.log("✅ 得到最终答案");
            console.log("=".repeat(70));
          }
          return {
            success: true,
            answer: parsed.content,
            iterations: iteration,
          };
        }

        if (parsed.type === "error") {
          console.error(`\n❌ 解析错误: ${parsed.content}`);
          break;
        }

        if (parsed.type === "action") {
          if (this.verbose) {
            console.log(`\n💭 Thought: ${parsed.thought}`);
            console.log(`🔧 Action: ${parsed.action}`);
            console.log(`📥 Action Input: ${parsed.actionInput}`);
          }

          // 执行工具
          const observation = await this.executeTool(
            parsed.action,
            parsed.actionInput
          );

          if (this.verbose) {
            console.log(`👀 Observation: ${observation}`);
          }

          // 更新历史
          history += `Thought: ${parsed.thought}\n`;
          history += `Action: ${parsed.action}\n`;
          history += `Action Input: ${parsed.actionInput}\n`;
          history += `Observation: ${observation}\n\n`;
        }
      } catch (error) {
        console.error(`\n❌ 第 ${iteration} 轮出错:`, error.message);
        break;
      }
    }

    return {
      success: false,
      answer: "达到最大迭代次数，未能得出最终答案",
      iterations: iteration,
    };
  }
}

// 主函数
async function main() {
  try {
    console.log("🎯 原生 ReAct 实现 - 高级版\n");

    if (!process.env.GOOGLE_API_KEY) {
      console.error("❌ 错误: 请设置 GOOGLE_API_KEY 环境变量");
      console.log("示例: export GOOGLE_API_KEY='your-key-here'");
      process.exit(1);
    }

    // 创建 Agent
    const agent = new ReActAgent(model, toolRegistry, {
      maxIterations: 5,
      verbose: true,
    });

    // 测试案例
    const testCases = [
      "iPhone 打 8 折后多少钱？",
      "北京的天气怎么样？",
      "如果 iPad 价格减去 1000 元，最终多少钱？",
    ];

    for (let i = 0; i < testCases.length; i++) {
      console.log(`\n\n${"█".repeat(70)}`);
      console.log(`测试案例 ${i + 1}/${testCases.length}`);
      console.log("█".repeat(70));

      const result = await agent.run(testCases[i]);

      console.log("\n" + "=".repeat(70));
      console.log(result.success ? "✅ 成功" : "❌ 失败");
      console.log("=".repeat(70));
      console.log(`答案: ${result.answer}`);
      console.log(`迭代次数: ${result.iterations}`);
      console.log("=".repeat(70));

      // 等待一下避免 API 限流
      if (i < testCases.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log("\n\n📚 总结：");
    console.log("─".repeat(70));
    console.log("✨ 这个实现展示了如何不依赖 langchain 手动实现 ReAct");
    console.log("✨ 核心组件：");
    console.log("   1. ToolRegistry - 管理工具");
    console.log("   2. ReActAgent - 处理 ReAct 循环");
    console.log("   3. Prompt 构建 - 指导 AI 行为");
    console.log("   4. 响应解析 - 提取 Action 和 Input");
    console.log("   5. 工具执行 - 调用实际函数");
    console.log("─".repeat(70));
  } catch (error) {
    console.error("\n❌ 错误:", error);
    console.error(error.stack);
  }
}

main();

