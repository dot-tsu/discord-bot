import type { Playlist, Queue } from 'distube'
import { MESSAGES } from '../../../messages/en.ts'

export function onAddList(queue: Queue, playlist: Playlist) {
  const name = playlist.name ?? playlist.url ?? 'Playlist'
  console.info(`[Music] Playlist added to queue: ${name} (${playlist.songs.length} songs)`)
  queue.textChannel?.send(MESSAGES.playlistAdded(name, playlist.songs.length))
}
