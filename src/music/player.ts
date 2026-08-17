import type { DisTubePlugin } from 'distube'
import { SpotifyPlugin } from '@distube/spotify'
import { YouTubePlugin } from '@distube/youtube'
import { DisTube } from 'distube'
import { client } from '../discord/client.ts'

// @distube/spotify's exports map routes every consumer to its CJS build, so its
// typings clash with distube's ESM declarations (dual-package hazard) and TS
// rejects the assignment. distube consumes plugins by duck typing, so the cast
// is only a declaration-level workaround.
const spotifyPlugin = new SpotifyPlugin() as unknown as DisTubePlugin

export const player = new DisTube(client, {
  plugins: [new YouTubePlugin(), spotifyPlugin],
  emitAddListWhenCreatingQueue: true,
  emitAddSongWhenCreatingQueue: false,
  savePreviousSongs: false,
  ffmpeg: {
    args: {
      global: { hide_banner: true },
      input: {
        reconnect: 1,
        reconnect_streamed: 1,
        reconnect_delay_max: 5,
      },
      output: {
        ac: 2,
        ar: 48000,
        map: '0:a',
      },
    },
  },
})
