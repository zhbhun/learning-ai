import { createAgent, tool } from 'langchain'
import { MemorySaver } from '@langchain/langgraph'
import * as z from 'zod'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

describe('ReAct Agent Examples', () => {
  jest.setTimeout(60000)

  test('should use calculator tool to perform math operations', async () => {
    // 定义系统提示词
    const systemPrompt = `你是一个智能助手，擅长解决数学计算、天气查询和信息搜索等问题。

你有以下工具可以使用：
- calculator: 用于执行数学计算
- get_weather: 获取指定城市的天气信息
- search_knowledge: 搜索知识库获取信息

根据用户的问题，选择合适的工具来帮助回答。`

    // 定义计算器工具
    const calculator = tool(
      ({ expression }: { expression: string }) => {
        try {
          // 安全的数学表达式计算（实际项目中应使用更安全的解析器）
          const result = Function(`'use strict'; return (${expression})`)()
          return `计算结果: ${expression} = ${result}`
        } catch (error) {
          return `计算错误: 无法计算 "${expression}"`
        }
      },
      {
        name: 'calculator',
        description:
          '执行数学计算。输入数学表达式，例如 "2+2" 或 "10*5/2" 或 "Math.sqrt(16)"',
        schema: z.object({
          expression: z.string().describe('要计算的数学表达式'),
        }),
      }
    )

    // 定义天气工具
    const getWeather = tool(
      ({ city }: { city: string }) => {
        // 模拟天气数据
        const weatherData: Record<string, string> = {
          北京: '晴天，温度 15-25°C，空气质量良',
          上海: '多云，温度 18-28°C，空气质量优',
          广州: '小雨，温度 22-30°C，空气质量良',
          深圳: '晴天，温度 24-32°C，空气质量优',
        }
        return weatherData[city] || `抱歉，暂时没有 ${city} 的天气数据`
      },
      {
        name: 'get_weather',
        description:
          '获取指定城市的天气信息，包括温度、天气状况和空气质量。输入应该是城市名称（中文）',
        schema: z.object({
          city: z.string().describe('城市名称，例如：北京、上海'),
        }),
      }
    )

    // 定义搜索工具
    const searchKnowledge = tool(
      ({ query }: { query: string }) => {
        // 模拟知识库搜索
        const knowledge: Record<string, string> = {
          '长城': '长城是中国古代的军事防御工程，建于公元前7世纪，全长约21196公里',
          python: 'Python 是一种高级编程语言，由 Guido van Rossum 于1991年创建',
          '人工智能': 'AI（人工智能）是计算机科学的一个分支，致力于创建能够模拟人类智能的系统',
        }

        for (const [key, value] of Object.entries(knowledge)) {
          if (query.includes(key)) {
            return value
          }
        }
        return `没有找到关于 "${query}" 的相关信息`
      },
      {
        name: 'search_knowledge',
        description: '在知识库中搜索信息。输入搜索关键词',
        schema: z.object({
          query: z.string().describe('搜索关键词'),
        }),
      }
    )

    // 配置模型
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash-lite',
      temperature: 0, // 使用 0 以获得更确定性的结果
    })

    // 设置内存
    const checkpointer = new MemorySaver()

    // 创建 ReAct Agent
    const agent = createAgent({
      model,
      systemPrompt,
      tools: [calculator, getWeather, searchKnowledge],
      checkpointer,
    })

    // 测试场景1: 数学计算
    console.log('\n=== 测试1: 数学计算 ===')
    const config1 = {
      configurable: { thread_id: 'math-thread' },
    }

    const mathResponse = await agent.invoke(
      {
        messages: [{ role: 'user', content: '计算 (15 + 25) * 2 等于多少？' }],
      },
      config1
    )
    console.log('问题:', '计算 (15 + 25) * 2 等于多少？')
    console.log('回答:', mathResponse.messages[mathResponse.messages.length - 1].content)
    expect(mathResponse.messages).toBeDefined()

    // 测试场景2: 天气查询
    console.log('\n=== 测试2: 天气查询 ===')
    const config2 = {
      configurable: { thread_id: 'weather-thread' },
    }

    const weatherResponse = await agent.invoke(
      {
        messages: [{ role: 'user', content: '今天北京的天气怎么样？' }],
      },
      config2
    )
    console.log('问题:', '今天北京的天气怎么样？')
    console.log(
      '回答:',
      weatherResponse.messages[weatherResponse.messages.length - 1].content
    )
    expect(weatherResponse.messages).toBeDefined()

    // 测试场景3: 知识搜索
    console.log('\n=== 测试3: 知识搜索 ===')
    const config3 = {
      configurable: { thread_id: 'search-thread' },
    }

    const searchResponse = await agent.invoke(
      {
        messages: [{ role: 'user', content: '告诉我关于长城的信息' }],
      },
      config3
    )
    console.log('问题:', '告诉我关于长城的信息')
    console.log('回答:', searchResponse.messages[searchResponse.messages.length - 1].content)
    expect(searchResponse.messages).toBeDefined()
  })

  test('should handle complex multi-step reasoning', async () => {
    // 定义需要多步推理的场景
    const systemPrompt = `你是一个旅行顾问助手，帮助用户规划旅行。

你有以下工具：
- get_city_weather: 获取城市天气
- calculate_budget: 计算旅行预算
- get_city_info: 获取城市信息

当用户询问旅行建议时，你需要：
1. 查询目的地天气
2. 计算预算
3. 提供综合建议`

    // 天气工具
    const getCityWeather = tool(
      ({ city }: { city: string }) => {
        const weather: Record<string, any> = {
          北京: { temp: '15-25°C', condition: '晴天', suitable: true },
          上海: { temp: '18-28°C', condition: '多云', suitable: true },
          成都: { temp: '12-20°C', condition: '小雨', suitable: false },
        }
        const data = weather[city] || { temp: 'N/A', condition: '未知', suitable: true }
        return `${city}天气: ${data.condition}, 温度${data.temp}, ${data.suitable ? '适合旅行' : '不太适合旅行'}`
      },
      {
        name: 'get_city_weather',
        description: '获取指定城市的天气状况和是否适合旅行',
        schema: z.object({
          city: z.string(),
        }),
      }
    )

    // 预算计算工具
    const calculateBudget = tool(
      ({ days, people }: { days: number; people: number }) => {
        const perPersonPerDay = 500 // 每人每天500元
        const total = days * people * perPersonPerDay
        return `${people}人${days}天的预计费用: ${total}元 (含住宿、餐饮、交通)`
      },
      {
        name: 'calculate_budget',
        description: '计算旅行预算，需要提供天数和人数',
        schema: z.object({
          days: z.number().describe('旅行天数'),
          people: z.number().describe('旅行人数'),
        }),
      }
    )

    // 城市信息工具
    const getCityInfo = tool(
      ({ city }: { city: string }) => {
        const info: Record<string, string> = {
          北京: '热门景点: 故宫、长城、天安门。特色美食: 烤鸭、炸酱面',
          上海: '热门景点: 外滩、东方明珠、迪士尼。特色美食: 小笼包、生煎',
          成都: '热门景点: 大熊猫基地、宽窄巷子。特色美食: 火锅、串串',
        }
        return info[city] || `暂无${city}的详细信息`
      },
      {
        name: 'get_city_info',
        description: '获取城市的景点和美食信息',
        schema: z.object({
          city: z.string(),
        }),
      }
    )

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash-lite',
      temperature: 0.3, // 稍微增加一点创造性
    })

    const checkpointer = new MemorySaver()

    const agent = createAgent({
      model,
      systemPrompt,
      tools: [getCityWeather, calculateBudget, getCityInfo],
      checkpointer,
    })

    // 复杂查询：需要使用多个工具
    console.log('\n=== 测试: 多步推理 - 旅行规划 ===')
    const config = {
      configurable: { thread_id: 'travel-planning' },
    }

    const response = await agent.invoke(
      {
        messages: [
          {
            role: 'user',
            content: '我计划和2个朋友一起去北京玩3天，能给我一些建议吗？',
          },
        ],
      },
      config
    )

    console.log('问题:', '我计划和2个朋友一起去北京玩3天，能给我一些建议吗？')
    console.log('回答:', response.messages[response.messages.length - 1].content)

    // 验证响应
    expect(response.messages).toBeDefined()
    expect(response.messages.length).toBeGreaterThan(0)

    // 继续对话
    console.log('\n=== 继续对话 ===')
    const followUpResponse = await agent.invoke(
      {
        messages: [{ role: 'user', content: '如果是4天呢？' }],
      },
      config
    )

    console.log('问题:', '如果是4天呢？')
    console.log('回答:', followUpResponse.messages[followUpResponse.messages.length - 1].content)
    expect(followUpResponse.messages).toBeDefined()
  })

  test('should handle tool errors gracefully', async () => {
    // 测试工具错误处理
    const systemPrompt = '你是一个助手，使用工具来帮助用户。'

    const riskyTool = tool(
      ({ input }: { input: string }) => {
        if (input === 'error') {
          throw new Error('工具执行失败')
        }
        return `成功处理: ${input}`
      },
      {
        name: 'risky_tool',
        description: '一个可能会失败的工具',
        schema: z.object({
          input: z.string(),
        }),
      }
    )

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash-lite',
      temperature: 0,
    })

    const checkpointer = new MemorySaver()

    const agent = createAgent({
      model,
      systemPrompt,
      tools: [riskyTool],
      checkpointer,
    })

    console.log('\n=== 测试: 工具错误处理 ===')
    const config = {
      configurable: { thread_id: 'error-handling' },
    }

    // 这应该能正常处理或给出合理的错误信息
    const response = await agent.invoke(
      {
        messages: [{ role: 'user', content: '使用 risky_tool 处理 "test"' }],
      },
      config
    )

    console.log('问题:', '使用 risky_tool 处理 "test"')
    console.log('回答:', response.messages[response.messages.length - 1].content)
    expect(response.messages).toBeDefined()
  })
})

