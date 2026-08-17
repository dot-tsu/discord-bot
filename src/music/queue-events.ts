import { Events } from 'distube'
import { MESSAGES } from '../messages/en.ts'
import { songDisplayName, updateNowPlaying } from './now-playing.ts'
import { player } from './player.ts'

export function setupMusicEvents() {
  player
    .on(Events.ADD_SONG, (queue, song) => {
      const name = songDisplayName(song)
      console.info(`[Music] Song added to queue: ${name}`)

      const textChannel = queue.textChannel

      if (textChannel)
        textChannel.send(MESSAGES.songAdded(name)).catch(error => console.error('[Music] Failed to send song added message:', error))
    })
    .on(Events.ADD_LIST, (queue, playlist) => {
      const name = playlist.name ?? playlist.url ?? 'Playlist'
      console.info(`[Music] Playlist added to queue: ${name} (${playlist.songs.length} songs)`)

      const textChannel = queue.textChannel

      if (textChannel)
        textChannel.send(MESSAGES.playlistAdded(name, playlist.songs.length)).catch(error => console.error('[Music] Failed to send playlist added message:', error))
    })
    .on(Events.PLAY_SONG, (queue, song) => {
      console.info(`[Music] Now playing: ${songDisplayName(song)}`)
      void updateNowPlaying(queue, song).catch(error => console.error('[Music] Failed to update now playing:', error))
    })
    .on(Events.FINISH, (queue) => {
      console.info('[Music] Queue finished, leaving voice')
      player.voices.get(queue.id)?.leave()
    })
    .on(Events.ERROR, error => console.error('[Music] DisTube error:', error))
}
