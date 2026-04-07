import debug from 'debug'
import { describe, expect, it } from '@jest/globals'
import { GoogleGenAI } from '@google/genai'

/**
 * 零样本提示：仅给出任务说明与待分类文本，不提供任何示例（与少样本相对）。
 * 示例与说明见：https://www.promptingguide.ai/zh/techniques/zeroshot
 */

const ZEROSHOT_SENTIMENT_PREFIX = `将文本分类为中性、负面或正面。

文本：`

function buildSentimentPrompt(text: string): string {
  return `${ZEROSHOT_SENTIMENT_PREFIX}${text}
情感：`
}

async function classifySentiment(
  ai: GoogleGenAI,
  text: string,
  log: debug.Debugger,
): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    contents: buildSentimentPrompt(text),
    config: {
      temperature: 0.1,
      thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
    },
  })
  const piece = (response.text ?? '').trim()
  log('input %o -> %o', text, piece)
  return piece
}

/** 从模型输出中抽取「中性 / 负面 / 正面」之一，忽略前后缀说明。 */
function normalizeSentimentLabel(raw: string): string | null {
  const s = raw.replace(/\s/g, '')
  if (/(正面|积极|positive)/i.test(s)) return '正面'
  if (/(负面|消极|negative)/i.test(s)) return '负面'
  if (/(中性|neutral)/i.test(s)) return '中性'
  return null
}

describe('零样本情感分类（无示例演示，单次 generateContent）', () => {
  const ai = new GoogleGenAI({})
  const log = debug('llm:zeroshot')

  it('指南示例：「我认为这次假期还可以。」应判为中性', async () => {
    const text = '我认为这次假期还可以。'
    const out = await classifySentiment(ai, text, log)
    expect(out.length).toBeGreaterThan(0)
    const label = normalizeSentimentLabel(out)
    expect(label).toBe('中性')
  }, 60_000)

  it('零样本延伸：明显褒义句应判为正面', async () => {
    const text = '这次服务超出预期，我非常满意。'
    const out = await classifySentiment(ai, text, log)
    expect(out.length).toBeGreaterThan(0)
    const label = normalizeSentimentLabel(out)
    expect(label).toBe('正面')
  }, 60_000)

  it('零样本延伸：明显贬义句应判为负面', async () => {
    const text = '体验极差，完全不值得推荐。'
    const out = await classifySentiment(ai, text, log)
    expect(out.length).toBeGreaterThan(0)
    const label = normalizeSentimentLabel(out)
    expect(label).toBe('负面')
  }, 60_000)
})
