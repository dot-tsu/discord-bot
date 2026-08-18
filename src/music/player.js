import { SpotifyPlugin } from '@distube/spotify'
import { DisTube } from 'distube'
import { client } from '../discord/client.js'
import { YtDlpPlugin } from './yt-dlp-plugin.js'

export const player = new DisTube(client, {
  plugins: [new SpotifyPlugin(), new YtDlpPlugin()],
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
