import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { AgentExecutor, createReactAgent } from 'langchain/agents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { DynamicTool } from '@langchain/core/tools'
import { pull } from 'langchain/hub'

const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.5-flash-lite',
  temperature: 0, // 降低随机性，提高格式遵循能力
  // 关键配置：让模型在 "Observation:" 之前停止生成
  stopSequences: ['Observation:', '\nObservation:'],
})

// 查询产品价格
const priceChecker = new DynamicTool({
  name: 'price_checker',
  description: '查询产品的价格。输入产品名称，返回价格（元）。',
  func: async (productName) => {
    // 模拟价格数据库
    const prices: Record<string, number> = {
      iPhone: 5999,
      iPad: 3999,
      MacBook: 9999,
      AirPods: 1299,
    }

    const price = prices[productName]
    if (price) {
      return `${productName} 的价格是 ${price} 元`
    }
    return `抱歉，找不到 ${productName} 的价格`
  },
})

// 计算折扣价
const discountCalculator = new DynamicTool({
  name: 'discount_calculator',
  description:
    "计算打折后的价格。输入格式：'原价,折扣'，例如 '5999,0.8' 表示 5999 元打 8 折。",
  func: async (input) => {
    const [price, discount] = input.split(',').map(Number)
    if (isNaN(price) || isNaN(discount)) {
      return "输入格式错误，请使用'原价,折扣'的格式"
    }
    const finalPrice = price * discount
    return `打折后价格：${finalPrice} 元`
  },
})

describe('ReAct', () => {
  jest.setTimeout(300000)

  test('should handle price query', async () => {
    try {
      // @see https://smith.langchain.com/hub/hwchase17/react?organizationId=f6bdcd1a-e94e-4921-8aff-07cf2eb75499
      const prompt = await pull<ChatPromptTemplate>('hwchase17/react')
      const tools = [priceChecker, discountCalculator]
      const agent = await createReactAgent({
        llm: model,
        tools,
        prompt,
      })
      const agentExecutor = new AgentExecutor({
        agent,
        tools,
        verbose: true,
        maxIterations: 3,
        handleParsingErrors: false, // 自动处理解析错误
      })
      const question = 'iPhone 打 8 折后多少钱？'
      /**
       * 预期
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
      })
      console.log(result)
      /**
       * 总结
       *
       * 1. Thought (思考): AI 分析问题，决定下一步做什么
       * 2. Action (行动): AI 选择一个工具来使用
       * 3. Action Input (输入): AI 确定工具的输入参数
       * 4. Observation (观察): 工具返回结果
       * 5. 循环步骤 1-4，直到 AI 认为可以给出最终答案
       * 6. Final Answer (最终答案): AI 综合所有信息给出答案
       */
    } catch (error) {
      console.error(
        '❌ 错误:',
        error instanceof Error ? error.message : String(error)
      )
    }
  })
})
