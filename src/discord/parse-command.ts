export function isConfigurationCommand(content: string, botId: string, botMentioned: boolean, channelMentionIds: string[]): boolean {
  const [channelMentionId] = channelMentionIds

  if (!botMentioned || channelMentionIds.length !== 1 || channelMentionId === undefined)
    return false

  let rest = content

  for (const mention of [`<@${botId}>`, `<@!${botId}>`, `<#${channelMentionId}>`])
    rest = rest.replaceAll(mention, '')

  return rest.trim() === ''
}
