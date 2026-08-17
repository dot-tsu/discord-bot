import type { Message, VoiceBasedChannel } from 'discord.js'
import { PermissionFlagsBits } from 'discord.js'

export function hasVoicePermissions(voiceChannel: VoiceBasedChannel, message: Message): boolean {
  const botMember = message.guild?.members?.me

  if (!botMember)
    return false

  const permissions = voiceChannel.permissionsFor(botMember)

  return permissions?.has(PermissionFlagsBits.Connect) === true
    && permissions?.has(PermissionFlagsBits.Speak) === true
}
