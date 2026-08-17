export type Command
  = | { type: 'configure' }
    | { type: 'skip' }
    | { type: 'pause' }
    | { type: 'resume' }
    | { type: 'queue' }
    | { type: 'shuffle' }
    | { type: 'clear' }
    | { type: 'remove', index: number | null }
    | { type: 'query', query: string }

const COMMAND_NAMES = ['skip', 'pause', 'resume', 'queue', 'shuffle', 'clear', 'remove'] as const

type CommandName = typeof COMMAND_NAMES[number]

function isCommandName(word: string): word is CommandName {
  return (COMMAND_NAMES as readonly string[]).includes(word)
}

function isConfigurationCommand(content: string, botId: string, botMentioned: boolean, channelMentionIds: string[]): boolean {
  const [channelMentionId] = channelMentionIds

  if (!botMentioned || channelMentionIds.length !== 1 || channelMentionId === undefined)
    return false

  let rest = content

  for (const mention of [`<@${botId}>`, `<@!${botId}>`, `<#${channelMentionId}>`])
    rest = rest.replaceAll(mention, '')

  return rest.trim() === ''
}

function stripMention(content: string, botId: string): string {
  return content.replaceAll(`<@${botId}>`, '').replaceAll(`<@!${botId}>`, '')
}

export function parseCommand(content: string, botId: string, botMentioned: boolean, channelMentionIds: string[]): Command {
  if (isConfigurationCommand(content, botId, botMentioned, channelMentionIds))
    return { type: 'configure' }

  const text = botMentioned ? stripMention(content, botId).trim() : content.trim()

  if (botMentioned) {
    const [word, ...rest] = text.split(/\s+/)

    if (word !== undefined && isCommandName(word)) {
      if (word === 'remove') {
        const rawIndex = rest[0]
        const index = rawIndex === undefined ? null : Number.parseInt(rawIndex, 10)

        return { type: 'remove', index: Number.isNaN(index) ? null : index }
      }

      return { type: word }
    }
  }

  return { type: 'query', query: text }
}
