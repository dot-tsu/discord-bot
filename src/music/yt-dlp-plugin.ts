import type { ResolveOptions } from 'distube'
import { spawn } from 'node:child_process'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ExtractorPlugin, Playlist, Song } from 'distube'

const AUDIO_DIR = join(tmpdir(), 'dj-audio')
const FILE_MAX_AGE_MS = 86_400_000

// yt-dlp resolves YouTube metadata and streams far more reliably than ytdl-core
// (which fails to decipher current YouTube player JS). YouTube's googlevideo
// audio URLs only answer closed-range requests, which ffmpeg cannot stream, so
// the audio is downloaded to a local file and played from there. yt-dlp's own
// wrapper merges stderr into its JSON parse, so spawn it directly, reading
// stdout only and suppressing warnings.
async function ytDlpJson(url: string, extraFlags: string[]) {
  const proc = spawn('yt-dlp', ['--no-warnings', '--dump-single-json', '--skip-download', ...extraFlags, url])
  let stdout = ''
  let stderr = ''
  proc.stdout.on('data', chunk => (stdout += chunk))
  proc.stderr.on('data', chunk => (stderr += chunk))
  const code = await new Promise<number>(resolve => proc.on('close', resolve))

  if (code !== 0)
    throw new Error(stderr.trim() || `yt-dlp exited with code ${code}`)

  return JSON.parse(stdout)
}

async function downloadAudio(url: string, id: string) {
  await mkdir(AUDIO_DIR, { recursive: true })
  await cleanOldFiles()

  const existing = (await readdir(AUDIO_DIR)).find(file => file.startsWith(`${id}.`))

  if (existing)
    return existing

  const proc = spawn('yt-dlp', ['--no-warnings', '-f', 'ba/ba*', '-o', join(AUDIO_DIR, `${id}.%(ext)s`), url])
  let stderr = ''
  proc.stderr.on('data', chunk => (stderr += chunk))
  const code = await new Promise<number>(resolve => proc.on('close', resolve))

  if (code !== 0)
    throw new Error(`yt-dlp failed to download ${url}: ${stderr.trim() || `exit ${code}`}`)

  const file = (await readdir(AUDIO_DIR)).find(name => name.startsWith(`${id}.`))

  if (!file)
    throw new Error('yt-dlp downloaded audio but no file was found')

  return file
}

async function cleanOldFiles() {
  const now = Date.now()

  for (const file of await readdir(AUDIO_DIR)) {
    const path = join(AUDIO_DIR, file)
    const info = await stat(path).catch(() => null)

    if (info && now - info.mtimeMs > FILE_MAX_AGE_MS)
      await rm(path, { force: true })
  }
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
    const file = await downloadAudio(song.url ?? '', song.id)

    return `file://${join(AUDIO_DIR, file)}`
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
