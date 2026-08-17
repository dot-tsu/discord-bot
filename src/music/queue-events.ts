import { Events } from 'distube'
import { MESSAGES } from '../messages/en.ts'
import { songDisplayName, updateNowPlaying } from './now-playing.ts'
import { player } from './player.ts'

export function setupMusicEvents() {
  player
    .on(Events.ADD_SONG, (queue, song) => {
      const name = songDisplayName(song)
      console.info(`[Music] Song added to queue: ${name}`)
      queue.textChannel?.send(MESSAGES.songAdded(name))
    })
    .on(Events.ADD_LIST, (queue, playlist) => {
      const name = playlist.name ?? playlist.url ?? 'Playlist'
      console.info(`[Music] Playlist added to queue: ${name} (${playlist.songs.length} songs)`)
      queue.textChannel?.send(MESSAGES.playlistAdded(name, playlist.songs.length))
    })
    .on(Events.PLAY_SONG, (queue, song) => {
      console.info(`[Music] Now playing: ${songDisplayName(song)}`)
      void updateNowPlaying(queue, song)
    })
    .on(Events.FINISH, () => console.info('[Music] Queue finished'))
    .on(Events.ERROR, error => console.error('[Music] DisTube error:', error))
}
