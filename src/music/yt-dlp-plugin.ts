import type { ResolveOptions, Song } from 'distube'
import { YtDlpPlugin } from '@distube/yt-dlp'
import { Playlist } from 'distube'

// The official distube yt-dlp plugin resolves URLs and streams but cannot
// search; yt-dlp's own ytsearch1: pseudo-URL covers that. @distube/yt-dlp ships
// CJS-only typings, so its ResolveOptions clash with distube's ESM ones and the
// options need a cast to flow through.
export class YtDlpSearchPlugin extends YtDlpPlugin {
  constructor() {
    super({ update: false })
  }

  async searchSong<T>(query: string, options: ResolveOptions<T>): Promise<Song<T> | null> {
    const result = await this.resolve(`ytsearch1:${query}`, options as never)

    if (result instanceof Playlist) {
      const song = result.songs[0]

      return song ? (song as Song<T>) : null
    }

    return result as unknown as Song<T>
  }
}
