import { CONFIG } from '#features/config/app-config.js'
import { playIntroIfFirstJoin } from '#features/first-join/play-intro.js'
import { playSong } from '#features/music/play-song.js'

export async function playMusic(voiceChannel, message) {
  await playIntroIfFirstJoin(voiceChannel)

  queueSong(voiceChannel, message).catch((error) => {
    if (error.errorCode === 'NO_RESULT') {
      message.reply(CONFIG.MESSAGES.ERRORS.NO_RESULT)

      return
    }
    console.error(`[Music] Play error: ${error?.message ?? error}`)
    message.reply(CONFIG.MESSAGES.ERRORS.PLAYBACK_ERROR)
  })
}

async function queueSong(voiceChannel, message) {
  await playSong(voiceChannel, message.content.trim(), message)
}
