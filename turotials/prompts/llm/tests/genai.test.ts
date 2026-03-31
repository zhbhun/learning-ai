import debug from 'debug'
import { describe, expect, it } from '@jest/globals'
import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  Type,
  type CallableTool,
  type FunctionCall,
  type Part,
  type Tool,
} from '@google/genai'

/** 与 LangChain `tool(...)` 示例等价的本地模拟工具，通过 Gemini CallableTool + AFC 执行 */
class TravelPlanningTools implements CallableTool {
  async tool(): Promise<Tool> {
    return {
      functionDeclarations: [
        {
          name: 'get_city_weather',
          description: '获取指定城市的天气状况和是否适合旅行',
          parameters: {
            type: Type.OBJECT,
            properties: {
              city: { type: Type.STRING, description: '城市名称' },
            },
            required: ['city'],
          },
        },
        {
          name: 'calculate_budget',
          description: '计算旅行预算，需要提供天数和人数',
          parameters: {
            type: Type.OBJECT,
            properties: {
              days: { type: Type.INTEGER, description: '旅行天数' },
              people: { type: Type.INTEGER, description: '旅行人数（含本人）' },
            },
            required: ['days', 'people'],
          },
        },
        {
          name: 'get_city_info',
          description: '获取城市的景点和美食信息',
          parameters: {
            type: Type.OBJECT,
            properties: {
              city: { type: Type.STRING, description: '城市名称' },
            },
            required: ['city'],
          },
        },
      ],
    }
  }

  async callTool(functionCalls: FunctionCall[]): Promise<Part[]> {
    const parts: Part[] = []
    for (const fc of functionCalls) {
      const name = fc.name ?? ''
      const id = fc.id
      const args = fc.args ?? {}

      let output: string
      switch (name) {
        case 'get_city_weather': {
          const city = String(args.city ?? '')
          const weather: Record<string, { temp: string; condition: string; suitable: boolean }> = {
            北京: { temp: '15-25°C', condition: '晴天', suitable: true },
            上海: { temp: '18-28°C', condition: '多云', suitable: true },
            成都: { temp: '12-20°C', condition: '小雨', suitable: false },
          }
          const data = weather[city] ?? { temp: 'N/A', condition: '未知', suitable: true }
          output = `${city}天气: ${data.condition}, 温度${data.temp}, ${data.suitable ? '适合旅行' : '不太适合旅行'}`
          break
        }
        case 'calculate_budget': {
          const days = toPositiveInt(args.days)
          const people = toPositiveInt(args.people)
          const perPersonPerDay = 500
          const total = days * people * perPersonPerDay
          output = `${people}人${days}天的预计费用: ${total}元 (含住宿、餐饮、交通)`
          break
        }
        case 'get_city_info': {
          const city = String(args.city ?? '')
          const info: Record<string, string> = {
            北京: '热门景点: 故宫、长城、天安门。特色美食: 烤鸭、炸酱面',
            上海: '热门景点: 外滩、东方明珠、迪士尼。特色美食: 小笼包、生煎',
            成都: '热门景点: 大熊猫基地、宽窄巷子。特色美食: 火锅、串串',
          }
          output = info[city] ?? `暂无${city}的详细信息`
          break
        }
        default:
          output = `未知工具: ${name}`
      }

      parts.push({
        functionResponse: {
          name,
          id,
          response: { output },
        },
      })
    }
    return parts
  }
}

function toPositiveInt(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.floor(v))
  if (typeof v === 'string') {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }
  return 0
}

describe('ReAct-style travel tools (Gemini + AFC)', () => {
  const ai = new GoogleGenAI({})
  const log = debug('llm:genai')
  const userQuestion = '我计划和2个朋友一起去北京玩3天，能给我一些建议吗？'

  it(
    '应通过工具调用天气、预算与城市信息并给出综合建议',
    async () => {
      const travelTools = new TravelPlanningTools()

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: userQuestion,
        config: {
          systemInstruction: `你是一个旅行顾问助手，帮助用户规划旅行。

你有以下工具（必须通过工具获取事实，不要编造天气、预算数字或景点列表）：
- get_city_weather: 获取城市天气与是否适合旅行
- calculate_budget: 计算旅行预算（人数须包含提问者本人；例如「我和2个朋友」共3人）
- get_city_info: 获取城市景点与美食

当用户询问旅行建议时，依次或按需调用上述工具，最后基于工具返回内容用中文给出简洁、可执行的建议。`,
          temperature: 0.3,
          tools: [travelTools],
          toolConfig: {
            functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
          },
          automaticFunctionCalling: { maximumRemoteCalls: 12 },
        },
      })

      const text = response.text?.trim() ?? ''
      log('text %o', text)
      log('afc %o', JSON.stringify(response.automaticFunctionCallingHistory))

      expect(text.length).toBeGreaterThan(0)

      const historyJson = JSON.stringify(response.automaticFunctionCallingHistory ?? [])
      expect(historyJson).toContain('get_city_weather')
      expect(historyJson).toContain('calculate_budget')
      expect(historyJson).toContain('get_city_info')

      expect(text).toMatch(/北京/)
    },
    120_000,
  )
})
