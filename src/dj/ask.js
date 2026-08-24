import { requestCompletion } from './client.js'
import { recallConversation, rememberConversation } from './history.js'
import { buildDjPrompt } from './persona.js'
import { DJ_TOOLS, runTool } from './tools.js'

const DJ_TIMEOUT_MS = 25_000
// Three rounds to act through the tools, then one forced spoken answer: a
// model that keeps calling tools until the cap would otherwise act in silence.
const MAX_TOOL_ROUNDS = 3

function parseToolArguments(raw) {
  try {
    return JSON.parse(raw)
  }
  catch {
    return null
  }
}

async function resolveToolCall(call, context) {
  const toolResult = async () => {
    const args = parseToolArguments(call.function.arguments)

    if (!args)
      return { error: 'those arguments were not valid JSON' }

    return runTool(call.function.name, args, context)
  }

  try {
    return { role: 'tool', tool_call_id: call.id, content: JSON.stringify(await toolResult()) }
  }
  catch (error) {
    console.error(`[DJ] Tool "${call.function.name}" failed:`, error)

    return { role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: 'the player could not do that' }) }
  }
}

export async function askDj({ message, settings, request, voiceChannel }) {
  const context = {
    guildId: message.guildId,
    voiceChannel,
    textChannel: message.channel,
    member: message.member,
  }
  const exchange = [...recallConversation(message.channelId), { role: 'user', content: request }]
  const conversationWithRules = () => [
    { role: 'system', content: buildDjPrompt(message.guildId, settings) },
    ...exchange,
  ]

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    void message.channel.sendTyping().catch(() => {})

    const reply = await requestCompletion({
      messages: conversationWithRules(),
      tools: DJ_TOOLS,
      timeoutMs: DJ_TIMEOUT_MS,
    })

    exchange.push(reply)

    if (!reply.tool_calls?.length) {
      rememberConversation(message.channelId, exchange)

      return reply.content?.trim() || null
    }

    for (const call of reply.tool_calls)
      exchange.push(await resolveToolCall(call, context))
  }

  // Tools off for the closing call, so the answer cannot carry more dangling
  // tool calls and the conversation stays safe to remember.
  void message.channel.sendTyping().catch(() => {})

  const reply = await requestCompletion({
    messages: conversationWithRules(),
    timeoutMs: DJ_TIMEOUT_MS,
  })

  rememberConversation(message.channelId, [...exchange, reply])

  return reply.content?.trim() || null
}
