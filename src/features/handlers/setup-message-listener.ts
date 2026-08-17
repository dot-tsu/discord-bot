import type { Message } from 'discord.js'
import type { GuildSettingsStore } from '../../guild-settings/store.ts'
import { client } from '#client'
import { configureTextChannel } from '#features/discord/configure-text-channel.ts'
import { handleMessage } from '#features/handlers/message-handler.ts'
import { Events } from 'discord.js'

function isConfigurationCommand(message: Message) {
  return message.mentions.has(message.client.user) && message.mentions.channels.size > 0
}

export function setupMessageListener(store: GuildSettingsStore) {
  client.on(Events.MessageCreate, (message) => {
    if (message.author?.bot)
      return

    if (isConfigurationCommand(message))
      return configureTextChannel(message, store)

    if (!message.guildId)
      return

    if (message.channelId === store.get(message.guildId).textChannelId)
      handleMessage(message)
  })
}
