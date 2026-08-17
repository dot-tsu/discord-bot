import type { DisTubePlugin } from 'distube'
import { SpotifyPlugin } from '@distube/spotify'
import { YouTubePlugin } from '@distube/youtube'
import { DisTube } from 'distube'
import { client } from '../discord/client.ts'
import { spotifyApiCredentials } from './spotify-credentials.ts'

// @distube/spotify ships CJS-only typings, so its discord.js types resolve to a
// different declaration flavor than distube's and TS rejects the assignment.
// https://github.com/distubejs/spotify
const spotifyPlugin = new SpotifyPlugin({ api: spotifyApiCredentials }) as unknown as DisTubePlugin

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
