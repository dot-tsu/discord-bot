import { PermissionFlagsBits } from 'discord.js'
import { MESSAGES } from '../messages/en.js'

export async function configureTextChannel(message, store) {
  if (!message.member?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await message.reply(MESSAGES.channelConfigurePermission)

    return
  }

  const channel = message.mentions.channels.first()

  if (!channel || !channel.isTextBased() || !('guild' in channel)) {
    await message.reply(MESSAGES.textChannelInvalid)

    return
  }

  if (!message.guildId)
    return

  await store.setTextChannel(message.guildId, channel.id)
  console.info(`[Config] Text channel set to: ${channel.name} (${channel.id})`)
  await message.reply(MESSAGES.textChannelConfigured(channel.toString()))
}
