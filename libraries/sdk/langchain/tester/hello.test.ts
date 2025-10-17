import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatPromptTemplate } from '@langchain/core/prompts'

const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash-lite',
})

async function translate(text: string, language = 'Chinese') {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ['system', 'Translate the following from English into {language}'],
    ['user', '{text}'],
  ])
  const promptValue = await promptTemplate.invoke({
    language,
    text,
  })
  const promptMessages = promptValue.toChatMessages()
  // [
  //   new SystemMessage(`Translate the following from English into ${language}`),
  //   new HumanMessage(text),
  // ]
  return model.invoke(promptMessages)
}

describe('translate function', () => {
  jest.setTimeout(30000)

  test('should handle single word translation', async () => {
    const result = await translate('cat')
    // const result: AIMessage = {
    //   id: 'run-06f39944-31b7-47fa-9f14-71eefef7b275',
    //   content: '猫 (māo)\n',
    //   additional_kwargs: {
    //     finishReason: 'STOP',
    //     avgLogprobs: -0.005241605763634046,
    //   },
    //   response_metadata: {
    //     tokenUsage: {
    //       promptTokens: 8,
    //       completionTokens: 6,
    //       totalTokens: 14,
    //     },
    //     finishReason: 'STOP',
    //     avgLogprobs: -0.005241605763634046,
    //   },
    //   tool_calls: [],
    //   invalid_tool_calls: [],
    //   usage_metadata: {
    //     input_tokens: 8,
    //     output_tokens: 6,
    //     total_tokens: 14,
    //   },
    // }
    console.log(result)
    expect(result).toBeDefined()
    expect(result.content).toMatch(/猫/i)
  })
})
