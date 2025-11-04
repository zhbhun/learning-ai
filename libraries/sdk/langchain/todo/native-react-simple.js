import { GoogleGenAI } from "@google/genai";

/**
 * 使用 Gemini 原生 Function Calling
 * 不需要手动实现 ReAct 循环，Gemini 会自动决定何时调用工具
 */

// 初始化 Gemini
const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

// 定义工具的实际执行函数
const toolFunctions = {
  price_checker: async (args) => {
    const { productName } = args;
    const prices = {
      iPhone: 5999,
      iPad: 3999,
      MacBook: 9999,
      AirPods: 1299,
    };
    const price = prices[productName];
    return price
      ? { price, message: `${productName} 的价格是 ${price} 元` }
      : { error: `抱歉，找不到 ${productName} 的价格` };
  },

  discount_calculator: async (args) => {
    const { originalPrice, discount } = args;
    if (typeof originalPrice !== "number" || typeof discount !== "number") {
      return { error: "参数类型错误，请提供数字" };
    }
    if (discount <= 0 || discount > 1) {
      return { error: "折扣应该在 0 到 1 之间" };
    }
    const finalPrice = originalPrice * discount;
    return {
      originalPrice,
      discount,
      finalPrice,
      message: `原价 ${originalPrice} 元，打 ${
        discount * 10
      } 折后价格：${finalPrice} 元`,
    };
  },
};

// 定义 Gemini Function Declarations
const functionDeclarations = [
  {
    name: "price_checker",
    description:
      "查询产品的价格。输入产品名称（如 iPhone、iPad、MacBook、AirPods），返回价格（元）。",
    parameters: {
      type: "object",
      properties: {
        productName: {
          type: "string",
          description: "产品名称，例如：iPhone、iPad、MacBook、AirPods",
        },
      },
      required: ["productName"],
    },
  },
  {
    name: "discount_calculator",
    description: "计算打折后的价格。输入原价和折扣比例，返回打折后的价格。",
    parameters: {
      type: "object",
      properties: {
        originalPrice: {
          type: "number",
          description: "商品原价（元）",
        },
        discount: {
          type: "number",
          description: "折扣比例，0-1之间的小数。例如 0.8 表示打8折",
        },
      },
      required: ["originalPrice", "discount"],
    },
  },
];

// 执行工具调用
async function executeFunctionCall(functionCall) {
  const { name, args } = functionCall;
  console.log(`\n🔧 执行工具: ${name}`);
  console.log(`📥 参数:`, JSON.stringify(args, null, 2));

  const func = toolFunctions[name];
  if (!func) {
    const error = `错误：工具 ${name} 不存在`;
    console.log(`❌ ${error}`);
    return { error };
  }

  try {
    const result = await func(args);
    console.log(`✅ 执行结果:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    const errorMsg = `工具执行错误：${error.message}`;
    console.log(`❌ ${errorMsg}`);
    return { error: errorMsg };
  }
}

// 主对话循环（使用 Gemini 原生 Function Calling）
async function runFunctionCalling(question, maxIterations = 10) {
  console.log("=".repeat(70));
  console.log("🚀 使用 Gemini 原生 Function Calling");
  console.log("=".repeat(70));
  console.log(`\n❓ 问题: ${question}\n`);

  // 创建模型实例（带工具配置）
  const chat = genAI.chats.create({
    model: "gemini-2.5-flash",
    tools: [{ functionDeclarations }],
  });

  // 初始化对话历史
  let iteration = 0;

  // 发送初始问题
  console.log(`\n--- 第 ${++iteration} 轮：发送用户问题 ---`);
  let result = await chat.sendMessage({
    message: question,
    config: {
      tools: [{ functionDeclarations }],
    },
  });

  // 循环处理工具调用
  while (iteration < maxIterations) {
    // 检查是否有工具调用
    const functionCalls = result.functionCalls

    if (!functionCalls || functionCalls.length === 0) {
      // 没有工具调用，说明 AI 已经给出最终答案
      const finalAnswer = result.text();
      console.log("\n" + "=".repeat(70));
      console.log("✅ 最终答案:");
      console.log("=".repeat(70));
      console.log(finalAnswer);
      console.log("=".repeat(70));
      return finalAnswer;
    }

    // 执行所有工具调用
    console.log(`\n📞 收到 ${functionCalls.length} 个工具调用`);
    const functionResponses = [];

    for (const functionCall of functionCalls) {
      const executeResult = await executeFunctionCall(functionCall);

      functionResponses.push({
        functionResponse: {
          name: functionCall.name,
          response: executeResult,
        },
      });
    }

    // 将工具执行结果返回给模型
    console.log(`\n--- 第 ${++iteration} 轮：返回工具执行结果 ---`);
    result = await chat.sendMessage({
      message: JSON.stringify(functionResponses),
      config: {
        tools: [{ functionDeclarations }],
      },
    });
  }

  console.log("\n⚠️ 达到最大迭代次数");
  return "未能得出最终答案";
}

// 运行示例
async function main() {
  try {
    console.log("🎯 Gemini 原生 Function Calling 示例\n");

    if (!process.env.GOOGLE_API_KEY) {
      console.error("❌ 错误: 请设置 GOOGLE_API_KEY 环境变量");
      process.exit(1);
    }

    // 测试问题
    const question = "iPhone 打 8 折后多少钱？";
    await runFunctionCalling(question);

    console.log("\n\n📚 Gemini Function Calling 核心概念：");
    console.log("1. 定义 Function Declarations - 告诉 Gemini 有哪些工具可用");
    console.log("2. Gemini 自动决定何时调用工具，返回结构化的 FunctionCall");
    console.log("3. 我们执行工具并获取结果");
    console.log("4. 将结果作为 FunctionResponse 返回给 Gemini");
    console.log("5. Gemini 根据结果继续对话或给出最终答案");
    console.log("\n💡 优势：");
    console.log("- 不需要手动解析文本格式的 Action/Observation");
    console.log("- Gemini 原生支持，调用更可靠");
    console.log("- 可以并行调用多个工具");
  } catch (error) {
    console.error("❌ 错误:", error.message);
    console.error("详细错误:", error);
  }
}

main();
