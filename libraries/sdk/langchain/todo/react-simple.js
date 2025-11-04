import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicTool } from "@langchain/core/tools";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { pull } from "langchain/hub";

/**
 * 简化版 ReAct 示例
 *
 * 这个示例展示了 ReAct (Reasoning + Acting) 的核心概念：
 * - AI 思考 (Thought)
 * - AI 采取行动 (Action)
 * - AI 观察结果 (Observation)
 * - 循环直到得出最终答案
 */

// 1. 初始化 Gemini 模型
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash", // 使用 model 而不是 modelName
  temperature: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

// 2. 定义一个简单的工具：查询产品价格
const priceChecker = new DynamicTool({
  name: "price_checker",
  description: "查询产品的价格。输入产品名称，返回价格（元）。",
  func: async (productName) => {
    // 模拟价格数据库
    const prices = {
      iPhone: 5999,
      iPad: 3999,
      MacBook: 9999,
      AirPods: 1299,
    };

    const price = prices[productName];
    if (price) {
      return `${productName} 的价格是 ${price} 元`;
    }
    return `抱歉，找不到 ${productName} 的价格`;
  },
});

// 3. 定义另一个工具：计算折扣价
const discountCalculator = new DynamicTool({
  name: "discount_calculator",
  description:
    "计算打折后的价格。输入格式：'原价,折扣'，例如 '5999,0.8' 表示 5999 元打 8 折。",
  func: async (input) => {
    const [price, discount] = input.split(",").map(Number);
    if (isNaN(price) || isNaN(discount)) {
      return "输入格式错误，请使用'原价,折扣'的格式";
    }
    const finalPrice = price * discount;
    return `打折后价格：${finalPrice} 元`;
  },
});

async function main() {
  try {
    console.log("🤖 ReAct 简化示例 - 理解 AI 的思考过程\n");

    // 4. 从 LangChain Hub 获取 ReAct 提示词模板
    console.log("📥 加载 ReAct 提示词模板...");
    const prompt = await pull("hwchase17/react");

    // 5. 创建 ReAct Agent
    console.log("🔧 创建 ReAct Agent...\n");
    const tools = [priceChecker, discountCalculator];

    const agent = await createReactAgent({
      llm: model,
      tools,
      prompt,
    });

    // 6. 创建 Agent 执行器
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true, // 重要：显示 AI 的思考过程
      maxIterations: 3,
    });

    // 7. 测试问题
    const question = "iPhone 打 8 折后多少钱？";

    console.log("=".repeat(60));
    console.log("❓ 问题:", question);
    console.log("=".repeat(60));
    console.log("\n💭 观察 AI 的 ReAct 过程：\n");

    /**
     * 预期的 ReAct 流程：
     *
     * Thought: 我需要先查询 iPhone 的原价
     * Action: price_checker
     * Action Input: iPhone
     * Observation: iPhone 的价格是 5999 元
     *
     * Thought: 现在我知道原价了，需要计算 8 折后的价格
     * Action: discount_calculator
     * Action Input: 5999,0.8
     * Observation: 打折后价格：4799.2 元
     *
     * Thought: 我现在知道最终答案了
     * Final Answer: iPhone 打 8 折后是 4799.2 元
     */

    const result = await agentExecutor.invoke({
      input: question,
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ 最终答案:", result.output);
    console.log("=".repeat(60));

    // 额外说明
    console.log("\n📚 ReAct 要点总结：");
    console.log("1. Thought (思考): AI 分析问题，决定下一步做什么");
    console.log("2. Action (行动): AI 选择一个工具来使用");
    console.log("3. Action Input (输入): AI 确定工具的输入参数");
    console.log("4. Observation (观察): 工具返回结果");
    console.log("5. 循环步骤 1-4，直到 AI 认为可以给出最终答案");
    console.log("6. Final Answer (最终答案): AI 综合所有信息给出答案\n");
  } catch (error) {
    console.error("❌ 错误:", error.message);
    if (!process.env.GOOGLE_API_KEY) {
      console.log("\n💡 提示: 请设置 GOOGLE_API_KEY 环境变量");
      console.log("   macOS/Linux: export GOOGLE_API_KEY='your-key'");
      console.log("   Windows: set GOOGLE_API_KEY=your-key");
    }
  }
}

main();
