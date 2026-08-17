import type { Queue, Song } from 'distube'
import { MESSAGES } from '../../../messages/en.ts'

export function onPlaySong(queue: Queue, song: Song) {
  const name = song.name ?? song.url ?? 'Unknown song'
  console.info(`[Music] Now playing: ${name}`)
  queue.textChannel?.send(MESSAGES.nowPlaying(name))
}
