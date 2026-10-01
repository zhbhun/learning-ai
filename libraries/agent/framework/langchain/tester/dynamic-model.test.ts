import { createAgent, tool, type AgentMiddleware } from 'langchain'
import { MemorySaver } from '@langchain/langgraph'
import * as z from 'zod'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

describe('Dynamic Model Selection', () => {
  jest.setTimeout(120000) // 增加到 2 分钟

  test('should select model based on keywords using middleware', async () => {
    console.log('\n=== 使用 Middleware 根据关键词动态选择模型 ===\n')

    // 1. 定义两个模型
    const lightModel = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash-lite', // 轻量级模型
      temperature: 0.7,
    })

    const advancedModel = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash', // 高级模型
      temperature: 0.7,
    })

    // 2. 定义复杂任务关键词
    const complexKeywords = ['分析', '比较', '解释', '为什么', '详细']

    // 3. 创建动态模型选择 Middleware
    const dynamicModelSelection: AgentMiddleware = {
      name: 'DynamicModelSelection',
      wrapModelCall: (request, handler) => {
        // 获取用户输入
        const lastMessage = request.messages[request.messages.length - 1]
        const userInput =
          typeof lastMessage.content === 'string' ? lastMessage.content : ''

        // 检查是否包含复杂关键词
        const isComplex = complexKeywords.some((keyword) => userInput.includes(keyword))

        if (isComplex) {
          console.log(`💡 检测到复杂关键词 → 使用高级模型`)
          return handler({ ...request, model: advancedModel })
        } else {
          console.log(`💡 简单查询 → 使用轻量级模型`)
          return handler({ ...request, model: lightModel })
        }
      },
    }

    // 4. 定义工具
    const searchTool = tool(
      ({ query }: { query: string }) => {
        return `关于 "${query}" 的信息：这是一个用于开发 AI 应用的框架。`
      },
      {
        name: 'search',
        description: '搜索知识库',
        schema: z.object({
          query: z.string(),
        }),
      }
    )

    // 5. 创建 Agent（传入 middleware）
    const agent = createAgent({
      model: lightModel, // 基础模型
      tools: [searchTool],
      systemPrompt: '你是一个智能助手，可以回答问题。',
      checkpointer: new MemorySaver(),
      middleware: [dynamicModelSelection], // 关键：使用 middleware
    })

    // 6. 测试简单查询
    console.log('\n📝 测试: "LangChain 是什么？"')
    const response = await agent.invoke(
      {
        messages: [{ role: 'user', content: 'LangChain 是什么？' }],
      },
      { configurable: { thread_id: 'test-1' } }
    )
    console.log('🤖 回复:', response.messages[response.messages.length - 1].content)
    console.log('\n✅ 测试完成')
    
    expect(response.messages).toBeDefined()
  })
})
