import type { Queue, Song } from 'distube'
import { MESSAGES } from '../../../messages/en.ts'

export function onPlaySong(queue: Queue, song: Song) {
  console.info(`[Music] Now playing: ${song.name}`)
  queue.textChannel?.send(MESSAGES.nowPlaying(song.name))
}
