// One exchange can be four messages when the DJ uses a tool: the request, the
// tool call, its result, and the spoken reply. Sixteen holds roughly the last
// four exchanges.
const MAX_MESSAGES = 16
const IDLE_TTL_MS = 600_000

const conversationsByChannel = new Map()

// The API rejects a `tool` message that is not preceded by the `assistant`
// message carrying its tool_calls, so a blind slice can produce a conversation
// the model refuses. Cut forward to the first request instead.
export function trimToWholeExchanges(messages) {
  const recent = messages.slice(-MAX_MESSAGES)
  const firstRequestIndex = recent.findIndex(message => message.role === 'user')

  if (firstRequestIndex < 0)
    return []

  return recent.slice(firstRequestIndex)
}

export function recallConversation(channelId) {
  const conversation = conversationsByChannel.get(channelId)

  if (!conversation)
    return []

  if (Date.now() - conversation.lastSpokeAt > IDLE_TTL_MS) {
    conversationsByChannel.delete(channelId)

    return []
  }

  return conversation.messages
}

export function rememberConversation(channelId, messages) {
  conversationsByChannel.set(channelId, {
    lastSpokeAt: Date.now(),
    messages: trimToWholeExchanges(messages),
  })
}
