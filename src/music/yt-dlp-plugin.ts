import type { ResolveOptions, Song } from 'distube'
import { YtDlpPlugin } from '@distube/yt-dlp'

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

    // `instanceof Playlist` can't be used here: @distube/yt-dlp is CJS and
    // builds playlists from the CJS distube build, so the class identity never
    // matches the ESM one this file imports.
    if ('songs' in result) {
      const song = result.songs[0]

      return song ? (song as unknown as Song<T>) : null
    }

    return result as unknown as Song<T>
  }
}
