import { onAddList } from '#features/music/events/on-add-list.js'
import { onAddSong } from '#features/music/events/on-add-song.js'
import { onPlaySong } from '#features/music/events/on-play-song.js'
import { player } from '#player'

export function setupMusicEvents() {
  player
    .on('addSong', onAddSong)
    .on('addList', onAddList)
    .on('playSong', onPlaySong)
    .on('finish', () => console.info('[Music] Queue finished'))
    .on('error', error => console.error('[Music] DisTube error:', error))
}
