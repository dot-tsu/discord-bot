import { YouTubePlugin } from '@distube/youtube'
import { DisTube } from 'distube'
import { client } from '../discord/client.ts'

export const player = new DisTube(client, {
  plugins: [new YouTubePlugin()],
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
