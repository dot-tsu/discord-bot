import process from 'node:process'

const ENDPOINT = 'https://opencode.ai/zen/go/v1/chat/completions'
const MODEL = 'deepseek-v4-flash'

export async function requestCompletion({ messages, tools, timeoutMs }) {
  const apiKey = process.env.OPENCODE_GO_KEY

  if (!apiKey)
    throw new Error('Missing OPENCODE_GO_KEY. Set it in the environment.')

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tools ? { model: MODEL, messages, tools } : { model: MODEL, messages }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok)
    throw new Error(`Zen Go responded ${response.status}: ${await response.text()}`)

  const { choices } = await response.json()

  return choices[0].message
}
