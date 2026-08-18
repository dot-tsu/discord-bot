import type { GuildTextBasedChannel } from 'discord.js'
import { Events } from 'distube'
import { MESSAGES } from '../messages/en.ts'
import { songDisplayName, updateNowPlaying } from './now-playing.ts'
import { player } from './player.ts'

function notify(textChannel: GuildTextBasedChannel | undefined, content: string) {
  if (textChannel)
    textChannel.send(content).catch((error: unknown) => console.error('[Music] Failed to send message:', error))
}

export function setupMusicEvents() {
  player
    .on(Events.ADD_SONG, (queue, song) => {
      const name = songDisplayName(song)
      console.info(`[Music] Song added to queue: ${name}`)
      notify(queue.textChannel, MESSAGES.songAdded(name))
    })
    .on(Events.ADD_LIST, (queue, playlist) => {
      const name = playlist.name ?? playlist.url ?? 'Playlist'
      console.info(`[Music] Playlist added to queue: ${name} (${playlist.songs.length} songs)`)
      notify(queue.textChannel, MESSAGES.playlistAdded(name, playlist.songs.length))
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
