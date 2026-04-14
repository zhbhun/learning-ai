import debug from 'debug'
import { describe, expect, it } from '@jest/globals'
import { GoogleGenAI } from '@google/genai'

/**
 * 同一道苹果应用题对比：
 * - 纯零样本：只给问题（指南中易直接跳步答错，如 11）；
 * - 零样本思维链：问题后加「让我们逐步思考。」（Kojima 等，见指南）。
 * https://www.promptingguide.ai/zh/techniques/cot
 */

const APPLE_WORD_PROBLEM = `我去市场买了10个苹果。我给了邻居2个苹果和修理工2个苹果。然后我去买了5个苹果并吃了1个。我还剩下多少苹果？`

function buildApplePromptPlain(): string {
  return APPLE_WORD_PROBLEM
}

function buildApplePromptCoT(): string {
  return `${APPLE_WORD_PROBLEM}

让我们逐步思考。`
}

async function generate(
  ai: GoogleGenAI,
  prompt: string,
  log: debug.Debugger,
  label: string,
): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: prompt,
    config: {
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
    },
  })
  const piece = (response.text ?? '').trim()
  log('%s\n%s', label, piece)
  return piece
}

/** 最终剩余应为 10 个苹果（中间可出现 11）；去掉 Markdown 粗体便于匹配。 */
function appleAnswerSaysTen(raw: string): boolean {
  const s = raw.replace(/\*+/g, '')
  return (
    /还剩下?\s*10\s*个?\s*苹果|还剩[^\n。]{0,40}10\s*个?\s*苹果|剩下[^\n。]{0,20}10\s*个?\s*苹果|最终[^\n。]{0,20}10\s*个?\s*苹果|答案是?\s*10\s*个?\s*苹果/i.test(
      s,
    ) || /所以[^\n。]{0,60}10\s*个?\s*苹果/i.test(s)
  )
}

describe('苹果题：零样本 vs 思维链（对比输出）', () => {
  const ai = new GoogleGenAI({})
  const log = debug('llm:cot')

  it('纯零样本：仅问题，无「让我们逐步思考」；只校验有输出（对错因模型而异，看日志对比）', async () => {
    const out = await generate(
      ai,
      buildApplePromptPlain(),
      log,
      '--- 苹果题 · 纯零样本 ---',
    )
    expect(out.length).toBeGreaterThan(0)
  }, 60_000)

  it('思维链：追加「让我们逐步思考。」后应得到剩余 10 个苹果', async () => {
    const out = await generate(
      ai,
      buildApplePromptCoT(),
      log,
      '--- 苹果题 · 零样本思维链 ---',
    )
    expect(out.length).toBeGreaterThan(0)
    expect(appleAnswerSaysTen(out)).toBe(true)
  }, 60_000)
})
