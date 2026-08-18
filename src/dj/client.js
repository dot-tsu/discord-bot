import process from 'node:process'

const DEFAULT_MODEL = 'deepseek-v4-flash'

// Any OpenAI-compatible /chat/completions endpoint works: point OPENAI_BASE_URL
// at the provider and the rest is config, not code.
export async function requestCompletion({ messages, tools, timeoutMs }) {
  const endpoint = process.env.OPENAI_BASE_URL
  const apiKey = process.env.OPENAI_API_KEY

  if (!endpoint || !apiKey)
    throw new Error('Missing OPENAI_BASE_URL or OPENAI_API_KEY. Set them in the environment.')

  const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tools ? { model, messages, tools } : { model, messages }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok)
    throw new Error(`LLM endpoint responded ${response.status}: ${await response.text()}`)

  const { choices } = await response.json()

  return choices[0].message
}
