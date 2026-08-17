import { client } from '#client'
import { CONFIG } from '#features/config/app-config.js'
import { configureTextChannel } from '#features/discord/configure-text-channel.js'
import { handleMessage } from '#features/handlers/message-handler.js'
import { Events } from 'discord.js'

function isConfigurationCommand(message) {
  return message.mentions.has(message.client.user) && message.mentions.channels.size > 0
}

export function setupMessageListener() {
  client.on(Events.MessageCreate, (message) => {
    if (message.author?.bot)
      return

    if (isConfigurationCommand(message))
      return configureTextChannel(message)

    if (message.channelId === CONFIG.TEXT_CHANNEL_ID)
      handleMessage(message)
  })
}
