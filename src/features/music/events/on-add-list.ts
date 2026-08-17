import type { Playlist, Queue } from 'distube'
import { MESSAGES } from '../../../messages/en.ts'

export function onAddList(queue: Queue, playlist: Playlist) {
  console.info(`[Music] Playlist added to queue: ${playlist.name} (${playlist.songs.length} songs)`)
  queue.textChannel?.send(MESSAGES.playlistAdded(playlist.name, playlist.songs.length))
}
