import { onAddList } from '#features/music/events/on-add-list.ts'
import { onAddSong } from '#features/music/events/on-add-song.ts'
import { onPlaySong } from '#features/music/events/on-play-song.ts'
import { player } from '#player'
import { Events } from 'distube'

export function setupMusicEvents() {
  player
    .on(Events.ADD_SONG, onAddSong)
    .on(Events.ADD_LIST, onAddList)
    .on(Events.PLAY_SONG, onPlaySong)
    .on(Events.FINISH, () => console.info('[Music] Queue finished'))
    .on(Events.ERROR, error => console.error('[Music] DisTube error:', error))
}
