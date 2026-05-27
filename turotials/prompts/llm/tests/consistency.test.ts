import debug from 'debug'
import { describe, expect, it } from '@jest/globals'
import { GoogleGenAI } from '@google/genai'

/**
 * 自我一致性：少样本 CoT 下对同一提示多次采样不同推理路径，再对最终答案做多数决。
 * 思路与范例见：https://www.promptingguide.ai/zh/techniques/consistency
 */

const FEW_SHOT_COT_SISTER = `Q：林中有15棵树。林业工人今天将在林中种树。完成后，将有21棵树。林业工人今天种了多少棵树？
A：我们从15棵树开始。后来我们有21棵树。差异必须是他们种树的数量。因此，他们必须种了21-15 = 6棵树。答案是6。

Q：停车场有3辆汽车，又来了2辆汽车，停车场有多少辆汽车？
A：停车场已经有3辆汽车。又来了2辆。现在有3 + 2 = 5辆汽车。答案是5。

Q：Leah有32块巧克力，她的姐姐有42块。如果他们吃了35块，他们总共还剩多少块？
A：Leah有32块巧克力，Leah的姐姐有42块。这意味着最初有32 + 42 = 74块巧克力。已经吃了35块。因此，他们总共还剩74-35 = 39块巧克力。答案是39。

Q：Jason有20个棒棒糖。他给Denny一些棒棒糖。现在Jason只有12个棒棒糖。Jason给Denny多少棒棒糖？
A：Jason有20个棒棒糖。因为他现在只有12个，所以他必须把剩下的给Denny。他给Denny的棒棒糖数量必须是20-12 = 8个棒棒糖。答案是8。

Q：Shawn有五个玩具。圣诞节，他从他的父母那里得到了两个玩具。他现在有多少个玩具？
A：他有5个玩具。他从妈妈那里得到了2个，所以在那之后他有5 + 2 = 7个玩具。然后他从爸爸那里得到了2个，所以总共他有7 + 2 = 9个玩具。答案是9。

Q：服务器房间里有9台计算机。从周一到周四，每天都会安装5台计算机。现在服务器房间里有多少台计算机？
A：从周一到周四有4天。每天都添加了5台计算机。这意味着总共添加了4 * 5 = 20台计算机。一开始有9台计算机，所以现在有9 + 20 = 29台计算机。答案是29。

Q：Michael有58个高尔夫球。星期二，他丢失了23个高尔夫球。星期三，他又丢失了2个。星期三结束时他还剩多少个高尔夫球？
A：Michael最初有58个球。星期二他丢失了23个，所以在那之后他有58-23 = 35个球。星期三他又丢失了2个，所以现在他有35-2 = 33个球。答案是33。

Q：Olivia有23美元。她用每个3美元的价格买了五个百吉饼。她还剩多少钱？
A：她用每个3美元的价格买了5个百吉饼。这意味着她花了15美元。她还剩8美元。

Q：当我6岁时，我的妹妹是我的一半年龄。现在我70岁了，我的妹妹多大？
A：`

async function generateOne(
  ai: GoogleGenAI,
  prompt: string,
  log: debug.Debugger,
  label: string,
  sampleIndex: number,
): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt,
    config: {
      /** 自我一致性需要多样化解码，温度高于单次贪婪/低温推理 */
      temperature: 0.75,
      thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
    },
  })
  const piece = (response.text ?? '').trim()
  log('%s #%d\n%s', label, sampleIndex, piece)
  return piece
}

/** 从单条 CoT 回复中尽量抽出「最终数字答案」（与指南示例中「答案是N」一致） */
function extractFinalNumericAnswer(raw: string): number | null {
  const s = raw.replace(/\*+/g, '')
  const m =
    s.match(/答案(?:是|为|：|:)\s*(\d+)/) ??
    s.match(/answer\s+is\s*:?\s*(\d+)/i) ??
    s.match(/答案是\s*(\d+)/)
  if (m?.[1]) return parseInt(m[1], 10)
  const tail = s.match(/(\d+)\s*岁?\s*$/m)
  if (tail?.[1]) return parseInt(tail[1], 10)
  return null
}

function majorityVote(values: number[]): number | null {
  if (values.length === 0) return null
  const counts = new Map<number, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: number | null = null
  let bestCount = 0
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v
      bestCount = c
    }
  }
  return best
}

describe('自我一致性：少样本 CoT + 多次采样 + 多数决', () => {
  const ai = new GoogleGenAI({})
  const log = debug('llm:consistency')
  const SAMPLE_N = 7

  it('妹妹年龄题：多次采样后多数答案应为 67（纠偏错误路径如 35）', async () => {
    const outputs = await Promise.all(
      Array.from({ length: SAMPLE_N }, (_, i) =>
        generateOne(
          ai,
          FEW_SHOT_COT_SISTER,
          log,
          '--- 自我一致性 · 单条采样 ---',
          i + 1,
        ),
      ),
    )

    const parsed = outputs
      .map((t) => extractFinalNumericAnswer(t))
      .filter((n): n is number => n !== null)

    expect(parsed.length).toBeGreaterThanOrEqual(Math.ceil(SAMPLE_N / 2))

    const winner = majorityVote(parsed)
    expect(winner).toBe(67)
  }, 180_000)
})
