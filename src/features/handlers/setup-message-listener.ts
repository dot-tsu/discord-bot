import type { GuildSettingsStore } from '../../guild-settings/store.ts'
import { client } from '#client'
import { configureTextChannel } from '#features/discord/configure-text-channel.ts'
import { handleMessage } from '#features/handlers/message-handler.ts'
import { Events } from 'discord.js'
import { isConfigurationCommand } from '../../discord/parse-command.ts'

export function setupMessageListener(store: GuildSettingsStore) {
  client.on(Events.MessageCreate, (message) => {
    if (message.author?.bot)
      return

    if (!message.guildId)
      return

    const channelMentionIds = [...message.mentions.channels.keys()]
    const botMentioned = message.mentions.members?.has(message.client.user.id) ?? false

    if (isConfigurationCommand(message.content, message.client.user.id, botMentioned, channelMentionIds)) {
      configureTextChannel(message, store)
        .catch(error => console.error('[Config] Failed to configure channel:', error))

      return
    }

    if (message.channelId === store.get(message.guildId).textChannelId)
      handleMessage(message)
  })
}
