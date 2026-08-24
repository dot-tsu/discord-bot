import process from 'node:process'
import { afterEach, expect, test } from 'bun:test'
import { requestCompletion } from '../client.js'

const realFetch = globalThis.fetch

function stubCompletionApi(reply) {
  const bodies = []

  globalThis.fetch = async (_url, init) => {
    bodies.push(JSON.parse(init.body))

    return Response.json({ choices: [{ message: reply }] })
  }
  process.env.OPENAI_BASE_URL = 'https://llm.example.com/v1/chat/completions'
  process.env.OPENAI_API_KEY = 'test-key'

  return bodies
}

afterEach(() => {
  globalThis.fetch = realFetch
  delete process.env.OPENAI_BASE_URL
  delete process.env.OPENAI_API_KEY
})

test('a request with tools asks the endpoint to pick them', async () => {
  const tools = [{ type: 'function', function: { name: 'skip_song', parameters: {} } }]
  const bodies = stubCompletionApi({ role: 'assistant', content: 'va' })

  await requestCompletion({ messages: [{ role: 'user', content: 'skippea' }], tools, timeoutMs: 1000 })

  expect(bodies[0].tools).toEqual(tools)
  expect(bodies[0].tool_choice).toBe('auto')
})

test('a request without tools sends neither key', async () => {
  const bodies = stubCompletionApi({ role: 'assistant', content: 'va' })

  await requestCompletion({ messages: [{ role: 'user', content: 'que suena?' }], timeoutMs: 1000 })

  expect(bodies[0].tools).toBeUndefined()
  expect(bodies[0].tool_choice).toBeUndefined()
})
