import type { Queue, Song } from 'distube'
import { MESSAGES } from '../../../messages/en.ts'

export function onAddSong(queue: Queue, song: Song) {
  const name = song.name ?? song.url ?? 'Unknown song'
  console.info(`[Music] Song added to queue: ${name}`)
  queue.textChannel?.send(MESSAGES.songAdded(name))
}
