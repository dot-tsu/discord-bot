import { Events } from 'distube'
import { announce } from '../dj/speak.js'
import { MESSAGES } from '../messages/en.js'
import { showQueue, songDisplayName, updateNowPlaying } from './now-playing.js'
import { player } from './player.js'

function announceInCharacter(store, textChannel, guildId, text) {
  if (!textChannel)
    return

  announce(textChannel, store.get(guildId), text)
}

// The dj's own tool calls add songs too; announcing each one would flood the
// channel and spend a request per song on messages the dj is already phrasing.
const guildsWithSuppressedAnnouncements = new Set()

export async function withAnnouncementsSuppressed(guildId, run) {
  guildsWithSuppressedAnnouncements.add(guildId)

  try {
    await run()
  }
  finally {
    guildsWithSuppressedAnnouncements.delete(guildId)
  }
}

export function setupMusicEvents(store) {
  player
    .on(Events.ADD_SONG, (queue, song) => {
      const name = songDisplayName(song)
      console.info(`[Music] Song added to queue: ${name}`)

      if (!guildsWithSuppressedAnnouncements.has(queue.id))
        announceInCharacter(store, queue.textChannel, queue.id, MESSAGES.songAdded(name))
    })
    .on(Events.ADD_LIST, (queue, playlist) => {
      const name = playlist.name ?? playlist.url ?? 'Playlist'
      console.info(`[Music] Playlist added to queue: ${name} (${playlist.songs.length} songs)`)

      if (!guildsWithSuppressedAnnouncements.has(queue.id))
        announceInCharacter(store, queue.textChannel, queue.id, MESSAGES.playlistAdded(name, playlist.songs.length))

      void showQueue(queue.textChannel, queue).catch((error) => {
        console.error('[Music] Failed to show queue after playlist:', error)
      })
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
