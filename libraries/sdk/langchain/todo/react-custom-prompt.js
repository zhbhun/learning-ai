import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicTool } from "@langchain/core/tools";
import { AgentExecutor, createReactAgent } from "langchain/agents";
import { PromptTemplate } from "@langchain/core/prompts";

/**
 * 高级示例：自定义 ReAct 提示词
 * 
 * 这个示例展示如何自定义 ReAct 提示词模板，
 * 使其更符合中文语境和特定需求
 */

// 初始化模型
const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro", // 使用 model 而不是 modelName
  temperature: 0,
  apiKey: process.env.GOOGLE_API_KEY,
});

// 定义工具
const tools = [
  new DynamicTool({
    name: "搜索知识库",
    description: "在知识库中搜索相关信息。输入搜索关键词。",
    func: async (query) => {
      const knowledge = {
        "ReAct": "ReAct 是一种提示词技术，结合了推理（Reasoning）和行动（Acting）。它让 AI 能够思考并调用工具来解决问题。",
        "LangChain": "LangChain 是一个框架，用于开发由大语言模型驱动的应用程序。",
        "Gemini": "Gemini 是 Google 开发的多模态大语言模型。",
      };
      
      for (const [key, value] of Object.entries(knowledge)) {
        if (query.includes(key)) {
          return value;
        }
      }
      return "未找到相关信息";
    },
  }),
  
  new DynamicTool({
    name: "计算器",
    description: "执行数学计算。输入数学表达式，例如 '2+2' 或 '10*5'。",
    func: async (expression) => {
      try {
        // 注意：实际应用中应该使用更安全的计算方法
        const result = eval(expression);
        return `计算结果：${result}`;
      } catch (error) {
        return "计算错误，请检查表达式";
      }
    },
  }),
];

// 自定义中文 ReAct 提示词模板
const customPromptTemplate = `你是一个智能助手，可以使用工具来回答问题。

你可以使用以下工具：
{tools}

回答问题时，请严格按照以下格式：

问题：{input}
思考：我需要分析这个问题，决定下一步做什么
行动：工具名称
行动输入：工具的输入参数
观察结果：工具返回的结果
思考：基于观察结果，我应该继续还是给出答案
... (可以重复"思考-行动-行动输入-观察结果"多次)
思考：现在我掌握了足够的信息
最终答案：对原始问题的完整回答

注意事项：
1. 每次只能使用一个工具
2. 工具名称必须是以下之一：{tool_names}
3. 如果已经有足够信息，直接给出最终答案
4. 思考过程要清晰，解释为什么选择某个工具

开始！

问题：{input}
{agent_scratchpad}`;

// 创建自定义提示词
const customPrompt = PromptTemplate.fromTemplate(customPromptTemplate);

async function main() {
  try {
    console.log("🎯 高级示例：自定义 ReAct 提示词\n");
    
    // 创建 agent（使用自定义提示词）
    const agent = await createReactAgent({
      llm: model,
      tools,
      prompt: customPrompt,
    });
    
    // 创建执行器
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      maxIterations: 5,
    });
    
    // 测试 1：需要搜索知识
    console.log("=" .repeat(70));
    console.log("📝 测试 1: 知识查询");
    console.log("=" .repeat(70));
    
    const result1 = await agentExecutor.invoke({
      input: "什么是 ReAct？它有什么用？",
    });
    
    console.log("\n✅ 答案:", result1.output);
    
    // 测试 2：需要计算
    console.log("\n" + "=".repeat(70));
    console.log("📝 测试 2: 数学计算");
    console.log("=" .repeat(70));
    
    const result2 = await agentExecutor.invoke({
      input: "计算 (25 + 15) * 2 的结果",
    });
    
    console.log("\n✅ 答案:", result2.output);
    
    // 测试 3：组合查询
    console.log("\n" + "=".repeat(70));
    console.log("📝 测试 3: 组合任务");
    console.log("=" .repeat(70));
    
    const result3 = await agentExecutor.invoke({
      input: "LangChain 是什么？如果有 3 个开发者使用它，每人开发 5 个项目，总共多少个项目？",
    });
    
    console.log("\n✅ 答案:", result3.output);
    
    // 显示提示词模板
    console.log("\n" + "=".repeat(70));
    console.log("📄 使用的自定义提示词模板：");
    console.log("=" .repeat(70));
    console.log(customPromptTemplate);
    
    console.log("\n💡 自定义提示词的优势：");
    console.log("  1. 更符合中文语境");
    console.log("  2. 可以添加特定的规则和约束");
    console.log("  3. 可以调整推理格式");
    console.log("  4. 可以优化 AI 的行为模式");
    
  } catch (error) {
    console.error("❌ 错误:", error.message);
  }
}

main();

