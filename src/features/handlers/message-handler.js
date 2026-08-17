import { CONFIG } from '#features/config/app-config.js'
import { hasVoicePermissions } from '#features/discord/has-voice-permissions.js'
import { playMusic } from '#features/handlers/play-music.js'
import { skipSong } from '#features/music/skip-song.js'
import { ChannelType } from 'discord.js'

function isSkipCommand(message) {
  const mentionsBot = message.mentions.has(message.client.user)

  return mentionsBot && message.content.toLowerCase().includes('skip')
}

export async function handleMessage(message) {
  const voiceChannel = message.member?.voice?.channel ?? null

  if (!voiceChannel) {
    message.reply(CONFIG.MESSAGES.ERRORS.JOIN_VOICE_CHANNEL)

    return
  }

  if (voiceChannel.type === ChannelType.GuildStageVoice) {
    message.reply(CONFIG.MESSAGES.ERRORS.STAGE_CHANNEL_PERMISSIONS)

    return
  }

  if (!hasVoicePermissions(voiceChannel, message)) {
    message.reply(CONFIG.MESSAGES.ERRORS.BOT_PERMISSIONS)

    return
  }

  if (isSkipCommand(message)) {
    await skipSong(message.guildId)
    message.react('✅')

    return
  }

  await playMusic(voiceChannel, message)
}
