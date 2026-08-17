import type { Message } from 'discord.js'
import type { GuildSettingsStore } from '../../guild-settings/store.ts'
import { MESSAGES } from '../../messages/en.ts'

export async function configureTextChannel(message: Message, store: GuildSettingsStore) {
  const channel = message.mentions.channels.first()

  if (!channel || !channel.isTextBased() || !('guild' in channel))
    return

  if (!message.guildId)
    return

  await store.setTextChannel(message.guildId, channel.id)
  console.info(`[Config] Text channel set to: ${channel.name} (${channel.id})`)
  message.reply(MESSAGES.textChannelConfigured(channel.toString()))
}
