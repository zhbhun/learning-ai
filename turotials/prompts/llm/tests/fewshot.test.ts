import debug from 'debug'
import { describe, expect, it } from '@jest/globals'
import { GoogleGenAI } from '@google/genai'

/**
 * 少样本提示：在提示中给出若干「输入 → 输出」演示，引导模型按同一模式完成新样本。
 * 说明与示例见：https://www.promptingguide.ai/zh/techniques/fewshot
 */

/** 指南中「标签与句意不一致」的演示：模型仍应据最后一句话的真实情感作答。 */
function buildFewShotSentimentPrompt(): string {
  return `将下列句子分类为负面或正面。只输出一个词：负面 或 正面。

这太棒了！// 负面
这太糟糕了！// 正面
哇，那部电影太棒了！// 正面
多么可怕的节目！//
`
}

async function generateFewShot(
  ai: GoogleGenAI,
  prompt: string,
  log: debug.Debugger,
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
  log('fewshot -> %o', piece)
  return piece
}

function normalizeBinarySentiment(raw: string): string | null {
  const s = raw.replace(/\s/g, '')
  if (/(正面|积极|positive)/i.test(s)) return '正面'
  if (/(负面|消极|negative)/i.test(s)) return '负面'
  return null
}

describe('少样本提示（单次 generateContent，带上下文示例）', () => {
  const ai = new GoogleGenAI({})
  const log = debug('llm:fewshot')

  it('指南示例：错标演示下「多么可怕的节目！」仍应判为负面', async () => {
    const out = await generateFewShot(ai, buildFewShotSentimentPrompt(), log)
    expect(out.length).toBeGreaterThan(0)
    const label = normalizeBinarySentiment(out)
    expect(label).toBe('负面')
  }, 60_000)
})
