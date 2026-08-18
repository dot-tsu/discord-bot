import { requestCompletion } from './client.js'
import { recallConversation, rememberConversation } from './history.js'
import { buildDjPrompt } from './persona.js'
import { DJ_TOOLS, runTool } from './tools.js'

const DJ_TIMEOUT_MS = 25_000
// One round to call the tools, one to speak about what happened. The third is
// slack for a follow-up call; past that the model is going in circles.
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

  void message.channel.sendTyping().catch(() => {})

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const reply = await requestCompletion({
      messages: [{ role: 'system', content: buildDjPrompt(message.guildId, settings) }, ...exchange],
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

  // No reply ever came out, so the exchange holds dangling tool calls. Nothing
  // gets remembered: the next request starts from a clean conversation.
  return null
}
