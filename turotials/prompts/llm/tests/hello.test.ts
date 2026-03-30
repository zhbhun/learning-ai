import debug from 'debug'
import { describe, expect, it } from '@jest/globals'
import { GoogleGenAI } from '@google/genai'

describe('hello', () => {
  const ai = new GoogleGenAI({})
  const log = debug('llm:hello')
  it(
    'should get a non-empty greeting (hello) from the model',
    async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: 'You are a helpful assistant. Say hello to the user.',
      })
      const text = response.text?.trim() ?? ''
      log('response %o', text)
      expect(text.length).toBeGreaterThan(0)
      expect(text.toLowerCase()).toMatch(/hello/)
    },
    60_000,
  )
})
