import type { ResolveOptions } from 'distube'
import { spawn } from 'node:child_process'
import { ExtractorPlugin, Playlist, Song } from 'distube'

// yt-dlp resolves YouTube metadata and streams far more reliably than ytdl-core
// (which fails to decipher current YouTube player JS). The official distube
// wrapper merges stderr into its JSON parse, so any yt-dlp warning breaks it;
// spawn it directly, reading stdout only and suppressing warnings.
async function ytDlpJson(url: string, extraFlags: string[]) {
  const proc = spawn('yt-dlp', ['--no-warnings', '--no-call-home', '--dump-single-json', '--skip-download', ...extraFlags, url])
  let stdout = ''
  let stderr = ''
  proc.stdout.on('data', chunk => (stdout += chunk))
  proc.stderr.on('data', chunk => (stderr += chunk))
  const code = await new Promise<number>(resolve => proc.on('close', resolve))

  if (code !== 0)
    throw new Error(stderr.trim() || `yt-dlp exited with code ${code}`)

  return JSON.parse(stdout)
}

interface YtDlpInfo {
  id: string
  title: string
  fulltitle?: string
  webpage_url?: string
  original_url?: string
  is_live?: boolean
  thumbnail?: string
  thumbnails?: { url: string }[]
  duration?: number
  uploader?: string
  uploader_url?: string
  view_count?: number
  like_count?: number
  age_limit?: number
  extractor?: string
  url?: string
}

export class YtDlpPlugin extends ExtractorPlugin {
  validate() {
    return true
  }

  getRelatedSongs() {
    return []
  }

  async searchSong<T>(query: string, options: ResolveOptions<T>): Promise<Song<T> | null> {
    const info = (await ytDlpJson(`ytsearch1:${query}`, ['--no-playlist'])) as YtDlpInfo & { entries?: YtDlpInfo[] }
    const first = info.entries?.[0]

    return first ? this.buildSong(first, options) : null
  }

  async resolve<T>(url: string, options: ResolveOptions<T>): Promise<Song<T> | Playlist<T>> {
    const info = (await ytDlpJson(url, [])) as YtDlpInfo & { _type?: string, entries?: YtDlpInfo[] }

    if (info._type === 'playlist') {
      if (!info.entries || info.entries.length === 0)
        throw new Error('The playlist is empty')

      return new Playlist(
        {
          source: info.extractor ?? 'youtube',
          songs: info.entries.map(entry => this.buildSong(entry, options)),
          id: info.id.toString(),
          name: info.title,
          url: info.webpage_url,
          thumbnail: info.thumbnail ?? info.thumbnails?.[0]?.url,
        },
        options,
      )
    }

    return this.buildSong(info, options)
  }

  async getStreamURL(song: Song): Promise<string> {
    const info = (await ytDlpJson(song.url ?? '', ['-f', 'ba/ba*'])) as YtDlpInfo

    return info.url ?? ''
  }

  private buildSong<T>(info: YtDlpInfo, options: ResolveOptions<T>): Song<T> {
    return new Song(
      {
        plugin: this,
        source: info.extractor ?? 'youtube',
        playFromSource: true,
        id: info.id,
        name: info.title || info.fulltitle,
        url: info.webpage_url || info.original_url,
        isLive: info.is_live,
        thumbnail: info.thumbnail ?? info.thumbnails?.[0]?.url,
        duration: info.is_live ? 0 : info.duration,
        uploader: {
          name: info.uploader,
          url: info.uploader_url,
        },
        views: info.view_count,
        likes: info.like_count,
        ageRestricted: Boolean(info.age_limit) && (info.age_limit ?? 0) >= 18,
      },
      options,
    )
  }
}
