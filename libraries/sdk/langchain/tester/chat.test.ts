import { v4 as uuidv4 } from 'uuid'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import {
  START,
  END,
  MessagesAnnotation,
  StateGraph,
  MemorySaver,
} from '@langchain/langgraph'

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash-lite',
})

// Define the function that calls the model
const callModel = async (state: typeof MessagesAnnotation.State) => {
  const response = await llm.invoke(state.messages)
  return { messages: response }
}

// Define a new graph
const workflow = new StateGraph(MessagesAnnotation)
  // Define the node and edge
  .addNode('model', callModel)
  .addEdge(START, 'model')
  .addEdge('model', END)

// Add memory
const memory = new MemorySaver()
const app = workflow.compile({ checkpointer: memory })

const config = { configurable: { thread_id: uuidv4() } }

describe('chat', () => {
  jest.setTimeout(30000)

  test('should remember the user name', async () => {
    await app.invoke(
      {
        messages: [
          {
            role: 'user',
            content: "Hi! I'm Bob.",
          },
        ],
      },
      config
    )
    const output = await app.invoke(
      {
        messages: [
          {
            role: 'user',
            content: "What's my name?",
          },
        ],
      },
      config
    )
    const message = output.messages[output.messages.length - 1]
    expect(message.content).toMatch(/Bob/)
  })
})
