import type { Message } from 'discord.js'
import { hasVoicePermissions } from '#features/discord/has-voice-permissions.js'
import { playMusic } from '#features/handlers/play-music.ts'
import { skipSong } from '#features/music/skip-song.js'
import { ChannelType } from 'discord.js'
import { MESSAGES } from '../../messages/en.ts'

function isSkipCommand(message: Message) {
  const mentionsBot = message.mentions.has(message.client.user)

  return mentionsBot && message.content.toLowerCase().includes('skip')
}

export async function handleMessage(message: Message) {
  const voiceChannel = message.member?.voice?.channel ?? null

  if (!voiceChannel) {
    message.reply(MESSAGES.joinVoiceChannel)

    return
  }

  if (voiceChannel.type === ChannelType.GuildStageVoice) {
    message.reply(MESSAGES.stageChannelPermissions)

    return
  }

  if (!hasVoicePermissions(voiceChannel, message)) {
    message.reply(MESSAGES.botPermissions)

    return
  }

  if (isSkipCommand(message)) {
    await skipSong(message.guildId)
    message.react('✅')

    return
  }

  await playMusic(voiceChannel, message)
}
