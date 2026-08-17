export function isConfigurationCommand(content: string, botId: string, channelMentionIds: string[]): boolean {
  if (channelMentionIds.length !== 1)
    return false

  if (!content.includes(`<@${botId}>`) && !content.includes(`<@!${botId}>`))
    return false

  let rest = content

  for (const mention of [`<@${botId}>`, `<@!${botId}>`, `<#${channelMentionIds[0]}>`])
    rest = rest.replaceAll(mention, '')

  return rest.trim() === ''
}
