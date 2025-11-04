import { createAgent, tool } from 'langchain'
import { MemorySaver, type Runtime } from '@langchain/langgraph'
import * as z from 'zod'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'

describe('Weather', () => {
  jest.setTimeout(60000)

  test('should return the weather for a given city', async () => {
    // Define system prompt
    const systemPrompt = `You are an expert weather forecaster, who speaks in puns.

  You have access to two tools:
  
  - get_weather_for_location: use this to get the weather for a specific location
  - get_user_location: use this to get the user's location
  
  If a user asks you for the weather, make sure you know the location. If you can tell from the question that they mean wherever they are, use the get_user_location tool to find their location.`

    // Define tools
    const getWeather = tool(
      ({ city }: { city: string }) => `It's always sunny in ${city}!`,
      {
        name: 'get_weather_for_location',
        description: 'Get the weather for a given city',
        schema: z.object({
          city: z.string(),
        }),
      }
    )

    const getUserLocation = tool(
      (_: any, config: Runtime<{ user_id: string }>) => {
        const { user_id } = config.context || { user_id: '1' }
        return user_id === '1' ? 'Florida' : 'SF'
      },
      {
        name: 'get_user_location',
        description: 'Retrieve user information based on user ID',
        schema: z.object({}),
      }
    )

    // Configure model
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.0-flash-lite',
    })

    // Define response format
    const responseFormat = z.object({
      punny_response: z.string(),
      weather_conditions: z.string().optional(),
    })

    // Set up memory
    const checkpointer = new MemorySaver()

    // Create agent
    const agent = createAgent({
      model,
      systemPrompt,
      tools: [getUserLocation, getWeather],
      responseFormat,
      checkpointer,
    })

    // Run agent
    // `thread_id` is a unique identifier for a given conversation.
    const config = {
      configurable: { thread_id: '1' },
      context: { user_id: '1' },
    }

    const response = await agent.invoke(
      { messages: [{ role: 'user', content: 'what is the weather outside?' }] },
      config
    )
    console.log(response.structuredResponse)
    // {
    //   punny_response: "Florida is still having a 'sun-derful' day! The sunshine is playing 'ray-dio' hits all day long! I'd say it's the perfect weather for some 'solar-bration'! If you were hoping for rain, I'm afraid that idea is all 'washed up' - the forecast remains 'clear-ly' brilliant!",
    //   weather_conditions: "It's always sunny in Florida!"
    // }
    expect(response.weather_conditions).toEqual('sunny')

    // Note that we can continue the conversation using the same `thread_id`.
    const thankYouResponse = await agent.invoke(
      { messages: [{ role: 'user', content: 'thank you!' }] },
      config
    )
    console.log(thankYouResponse.structuredResponse)
    // {
    //   punny_response: "You're 'thund-erfully' welcome! It's always a 'breeze' to help you stay 'current' with the weather. I'm just 'cloud'-ing around waiting to 'shower' you with more forecasts whenever you need them. Have a 'sun-sational' day in the Florida sunshine!",
    //   weather_conditions: undefined
    // }
  })
})
