import type { Queue, Song } from 'distube'
import { MESSAGES } from '../../../messages/en.ts'

export function onAddSong(queue: Queue, song: Song) {
  console.info(`[Music] Song added to queue: ${song.name}`)
  queue.textChannel?.send(MESSAGES.songAdded(song.name))
}
