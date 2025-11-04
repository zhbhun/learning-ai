import * as z from 'zod'
import { BuiltInState, HumanMessage, createAgent, tool } from 'langchain'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

const getWeather = tool(
  ({ city }: { city: string }) => `It's always sunny in ${city}!`,
  {
    name: 'get_weather',
    description: 'Get the weather for a given city',
    schema: z.object({
      city: z.string(),
    }),
  }
)

const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash-lite',
})

const agent = createAgent({
  model,
  tools: [getWeather],
})

describe('Hello', () => {
  jest.setTimeout(30000)

  test('should return the weather for a given city', async () => {
    const result: BuiltInState = await agent.invoke({
      messages: [new HumanMessage("What's the weather in Tokyo?")],
    })
    console.log(result.messages)
    const message = result.messages[result.messages.length - 1]
    expect(message.content).toMatch(/sunny/i)
  })
})
