import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash-lite',
})

async function translate(content: string) {
  const response = await model.invoke([
    new SystemMessage('Translate the following from English into Chinese'),
    new HumanMessage(content),
  ])
  return response
}

describe('translate function', () => {
  jest.setTimeout(30000)

  test('should handle single word translation', async () => {
    const result = await translate('cat')
    console.log(result)
    expect(result).toBeDefined()
    expect(result.content).toMatch(/猫/i)
  })
})
