import type { VoiceConnection } from '@discordjs/voice'
import type { VoiceBasedChannel } from 'discord.js'
import { createReadStream, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { AudioPlayerStatus, createAudioPlayer, createAudioResource } from '@discordjs/voice'
import { player } from './player.ts'

const INTRO_FILE_PATH = resolve(import.meta.dirname, '../../assets/welcome.mp3')
const INTRO_EXISTS = existsSync(INTRO_FILE_PATH)
const greetedGuilds = new Set<string>()

export async function playIntroIfFirstJoin(voiceChannel: VoiceBasedChannel) {
  if (!INTRO_EXISTS || greetedGuilds.has(voiceChannel.guild.id))
    return

  greetedGuilds.add(voiceChannel.guild.id)

  const voice = await player.voices.join(voiceChannel)
  await playFileInVoice(voice.connection, INTRO_FILE_PATH)
  voice.connection.subscribe(voice.audioPlayer)
}

function playFileInVoice(connection: VoiceConnection, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const resource = createAudioResource(createReadStream(filePath))
    const audioPlayer = createAudioPlayer()

    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      audioPlayer.stop()
      resolve()
    })
    audioPlayer.on('error', (error) => {
      audioPlayer.stop()
      reject(error)
    })

    connection.subscribe(audioPlayer)
    audioPlayer.play(resource)
  })
}
