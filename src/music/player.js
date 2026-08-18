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
      // the downloaded mp4 carries video too; extract only the audio stream
      output: { map: '0:a' },
    },
  },
})
