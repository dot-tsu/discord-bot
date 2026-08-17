import type { Message, VoiceBasedChannel } from 'discord.js'
import type { DisTubeError } from 'distube'
import { playIntroIfFirstJoin } from '#features/first-join/play-intro.js'
import { playSong } from '#features/music/play-song.js'
import { MESSAGES } from '../../messages/en.ts'

export async function playMusic(voiceChannel: VoiceBasedChannel, message: Message) {
  await playIntroIfFirstJoin(voiceChannel)

  queueSong(voiceChannel, message).catch((error: DisTubeError) => {
    if (error.errorCode === 'NO_RESULT') {
      message.reply(MESSAGES.noResult)

      return
    }
    console.error(`[Music] Play error: ${error?.message ?? error}`)
    message.reply(MESSAGES.playbackError)
  })
}

async function queueSong(voiceChannel: VoiceBasedChannel, message: Message) {
  await playSong(voiceChannel, message.content.trim(), message)
}
