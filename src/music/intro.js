import { createReadStream, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createAudioResource } from '@discordjs/voice'
import { player } from './player.js'

const INTRO_FILE_PATH = resolve(import.meta.dirname, '../../assets/welcome.mp3')
const INTRO_EXISTS = existsSync(INTRO_FILE_PATH)
const greetedGuilds = new Set()

export async function playIntroIfFirstJoin(voiceChannel) {
  if (!INTRO_EXISTS || greetedGuilds.has(voiceChannel.guild.id))
    return

  greetedGuilds.add(voiceChannel.guild.id)

  try {
    const voice = await player.voices.join(voiceChannel)
    const resource = createAudioResource(createReadStream(INTRO_FILE_PATH))
    voice.audioPlayer.play(resource)
  }
  catch (error) {
    greetedGuilds.delete(voiceChannel.guild.id)
    console.error('[Voice] Intro failed:', error)
  }
}
