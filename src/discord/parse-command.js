const COMMAND_NAMES = ['skip', 'pause', 'resume', 'queue', 'shuffle', 'clear', 'remove']

function isCommandName(word) {
  return COMMAND_NAMES.includes(word)
}

function isConfigurationCommand(content, botId, botMentioned, channelMentionIds) {
  const [channelMentionId] = channelMentionIds

  if (!botMentioned || channelMentionIds.length !== 1 || channelMentionId === undefined)
    return false

  let rest = content

  for (const mention of [`<@${botId}>`, `<@!${botId}>`, `<#${channelMentionId}>`])
    rest = rest.replaceAll(mention, '')

  return rest.trim() === ''
}

function stripMention(content, botId) {
  return content.replaceAll(`<@${botId}>`, '').replaceAll(`<@!${botId}>`, '')
}

export function parseCommand(content, botId, botMentioned, channelMentionIds) {
  if (isConfigurationCommand(content, botId, botMentioned, channelMentionIds))
    return { type: 'configure' }

  const text = botMentioned ? stripMention(content, botId).trim() : content.trim()

  if (botMentioned) {
    const [word, ...rest] = text.split(/\s+/)

    if (word !== undefined && isCommandName(word)) {
      if (word === 'remove') {
        const rawIndex = rest[0]
        const index = rawIndex !== undefined && /^\d+$/.test(rawIndex) ? Number.parseInt(rawIndex, 10) : null

        return { type: 'remove', index }
      }

      return { type: word }
    }
  }

  return { type: 'query', query: text }
}
