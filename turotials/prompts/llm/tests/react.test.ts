import debug from 'debug'
import { describe, expect, it } from '@jest/globals'
import { GoogleGenAI } from '@google/genai'

/**
 * 手写 ReAct：模型只生成「思考 + 操作」文本；本机解析操作、执行工具、写回「观察」。
 * 不使用 Gemini Function Calling / automaticFunctionCalling / 思考模式。
 * 格式参考：https://www.promptingguide.ai/zh/techniques/react
 */

const REACT_SYSTEM = `你是一个按 ReAct 框架行动的旅行顾问助手。

交互方式是多轮对话：**每一次**你生成内容时，只对应 ReAct 里的「思考 → 操作」这一步；系统在**你停笔之后**执行工具，并把结果以「观察 N：…」追加到对话里。在你看到系统写的观察之前，**不得假设或编造**任何工具结果（天气、预算、景点等）。

【本条回复允许的内容 — 仅此两行，多一字都不要】
第 1 行：思考 N：用一句话说明为何接下来要执行下面的操作（N 为步骤序号，随对话递增）。
第 2 行：操作 N：工具名 [参数]（必须单行，且必须是整条回复的末行；其后不得再出现换行或续写）。

【严禁】在同一条回复里连续写多组「思考/操作」；严禁自行撰写「观察」或模拟工具输出；不要用 Markdown 代码块包裹操作行。

可用工具（参数在方括号内，多参数用英文逗号分隔）：
- get_city_weather [城市名] — 天气与是否适合旅行
- calculate_budget [天数, 人数] — 人数须含提问者本人（「我和2个朋友」= 3 人）
- get_city_info [城市名] — 景点与美食
- 结束 [最终给用户的完整中文建议] — 仅在系统已追加过必要观察、信息足够后使用；方括号内可多行，但仍不得插入「观察」段。

示例（整轮回复到此结束，不要续写观察或下一步）：
思考 1：需要先确认目的地天气。
操作 1：get_city_weather [北京]
`

function parseLastAction(
  text: string,
): { tool: string; bracket: string } | null {
  const re = /操作\s*\d+\s*[：:]\s*(\S+)\s*\[([^\]]*)\]/g
  let m: RegExpExecArray | null
  let last: RegExpExecArray | null = null
  while ((m = re.exec(text)) !== null) last = m
  if (last) return { tool: last[1].trim(), bracket: last[2].trim() }

  const re2 = /操作\s*\d+\s+(\S+)\s*\[([^\]]*)\]/g
  last = null
  while ((m = re2.exec(text)) !== null) last = m
  if (!last) return null
  return { tool: last[1].trim(), bracket: last[2].trim() }
}

/** 仅执行数据类工具；「结束」在循环里单独处理，不视为一次工具调用。 */
function runTravelTool(tool: string, bracket: string): string {
  let output: string
  switch (tool) {
    case 'get_city_weather': {
      const city = bracket.trim()
      const weather: Record<
        string,
        { temp: string; condition: string; suitable: boolean }
      > = {
        北京: { temp: '15-25°C', condition: '晴天', suitable: true },
        上海: { temp: '18-28°C', condition: '多云', suitable: true },
        成都: { temp: '12-20°C', condition: '小雨', suitable: false },
      }
      const data = weather[city] ?? {
        temp: 'N/A',
        condition: '未知',
        suitable: true,
      }
      output = `${city}天气: ${data.condition}, 温度${data.temp}, ${data.suitable ? '适合旅行' : '不太适合旅行'}`
      break
    }
    case 'calculate_budget': {
      const parts = bracket.split(',').map((s) => s.trim())
      const days = toPositiveInt(parts[0])
      const people = toPositiveInt(parts[1])
      const perPersonPerDay = 500
      const total = days * people * perPersonPerDay
      output = `${people}人${days}天的预计费用: ${total}元 (含住宿、餐饮、交通)`
      break
    }
    case 'get_city_info': {
      const city = bracket.trim()
      const info: Record<string, string> = {
        北京: '热门景点: 故宫、长城、天安门。特色美食: 烤鸭、炸酱面',
        上海: '热门景点: 外滩、东方明珠、迪士尼。特色美食: 小笼包、生煎',
        成都: '热门景点: 大熊猫基地、宽窄巷子。特色美食: 火锅、串串',
      }
      output = info[city] ?? `暂无${city}的详细信息`
      break
    }
    default:
      output = `未知工具「${tool}」。请仅使用: get_city_weather, calculate_budget, get_city_info；收束时用 结束 [建议]。`
  }
  return output
}

/** 最后一轮可能只写「最终答案」而未严格带「操作 N」行时的兜底 */
function tryLooseFinalAnswer(text: string): string | null {
  const m = text.match(/最终答案\s*[：:]\s*([\s\S]+)/)
  const s = m?.[1]?.trim()
  return s && s.length > 0 ? s : null
}

function toPositiveInt(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v))
    return Math.max(0, Math.floor(v))
  if (typeof v === 'string') {
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }
  return 0
}

async function runReactLoop(
  ai: GoogleGenAI,
  userQuestion: string,
  options: { maxSteps: number; log: debug.Debugger },
): Promise<{ finalAnswer: string; transcript: string }> {
  let transcript = `问题：${userQuestion}\n\n`
  let step = 0
  let finalAnswer = ''

  for (let i = 0; i < options.maxSteps; i++) {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: transcript,
      config: {
        systemInstruction: REACT_SYSTEM,
        temperature: 0.2,
        // thinkingBudget: 0 关闭模型内置 thinking（与提示词里的 ReAct「思考」分离）
        thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
      },
    })

    const piece = (response.text ?? '').trim()
    if (!piece) {
      options.log('empty generation at step %d', i)
      break
    }
    transcript += `${piece}\n\n`

    const action = parseLastAction(piece)

    if (action?.tool === '结束') {
      finalAnswer = action.bracket.trim()
      break
    }

    if (!action) {
      const loose = tryLooseFinalAnswer(piece)
      if (loose) {
        finalAnswer = loose
        break
      }
      transcript +=
        '观察（系统）：未解析到「操作 N：工具 [参数]」格式的单行。请严格按系统说明重新输出一轮思考+操作。\n\n'
      continue
    }

    const observation = runTravelTool(action.tool, action.bracket)
    step += 1
    transcript += `观察 ${step}：${observation}\n\n`
  }

  return { finalAnswer, transcript }
}

describe('ReAct 旅行规划（纯文本循环 + 本地工具，无 Gemini FC）', () => {
  const ai = new GoogleGenAI({})
  const log = debug('llm:react')
  const userQuestion = '我计划和2个朋友一起去北京玩3天，能给我一些建议吗？'

  it('应通过多轮 思考-操作-观察 调用三类工具并以「结束」给出综合建议', async () => {
    const { finalAnswer, transcript } = await runReactLoop(ai, userQuestion, {
      maxSteps: 16,
      log,
    })

    log('transcript\n%s', transcript)
    expect(finalAnswer.length).toBeGreaterThan(0)

    expect(transcript).toMatch(/get_city_weather/)
    expect(transcript).toMatch(/calculate_budget/)
    expect(transcript).toMatch(/get_city_info/)

    expect(finalAnswer + transcript).toMatch(/北京/)
  }, 120_000)
})
