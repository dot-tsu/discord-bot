import { spawn } from 'node:child_process'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ExtractorPlugin, Playlist, Song } from 'distube'

const AUDIO_DIR = join(tmpdir(), 'dj-audio')
const FILE_MAX_AGE_MS = 86_400_000

// YouTube throttles the default android_vr client's media URLs (403) after a
// burst of requests; the plain android client is unaffected and yields a
// progressive mp4 that ffmpeg can read directly.
const YT_CLIENT_ARGS = ['--extractor-args', 'youtube:player_client=android']

// yt-dlp resolves YouTube metadata and streams far more reliably than ytdl-core
// (which fails to decipher current YouTube player JS). YouTube's googlevideo
// audio URLs only answer closed-range requests, which ffmpeg cannot stream, so
// the audio is downloaded to a local file and played from there. yt-dlp's own
// wrapper merges stderr into its JSON parse, so spawn it directly, reading
// stdout only and suppressing warnings.
async function runYtDlp(args) {
  const proc = spawn('yt-dlp', args)
  let stdout = ''
  let stderr = ''
  proc.stdout.on('data', chunk => (stdout += chunk))
  proc.stderr.on('data', chunk => (stderr += chunk))
  const code = await new Promise((resolve, reject) => {
    proc.on('error', reject)
    proc.on('close', resolve)
  })

  return { code, stdout, stderr }
}

async function ytDlpJson(url, extraFlags) {
  const { code, stdout, stderr } = await runYtDlp(['--no-warnings', ...YT_CLIENT_ARGS, '--dump-single-json', '--skip-download', ...extraFlags, url])

  if (code !== 0)
    throw new Error(stderr.trim() || `yt-dlp exited with code ${code}`)

  return JSON.parse(stdout)
}

async function downloadAudio(url, id) {
  await mkdir(AUDIO_DIR, { recursive: true })
  await cleanOldFiles()

  const existing = (await readdir(AUDIO_DIR)).find(file => file.startsWith(`${id}.`))

  if (existing)
    return existing

  const { code, stderr } = await runYtDlp(['--no-warnings', ...YT_CLIENT_ARGS, '-f', 'ba/ba*', '-o', join(AUDIO_DIR, `${id}.%(ext)s`), url])

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

export class YtDlpPlugin extends ExtractorPlugin {
  validate() {
    return true
  }

  getRelatedSongs() {
    return []
  }

  async searchSong(query, options) {
    const info = await ytDlpJson(`ytsearch1:${query}`, ['--no-playlist'])
    const first = info.entries?.[0]

    return first ? this.buildSong(first, options) : null
  }

  async resolve(url, options) {
    const info = await ytDlpJson(url, [])

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

  async getStreamURL(song) {
    const file = await downloadAudio(song.url, song.id)

    return `file://${join(AUDIO_DIR, file)}`
  }

  buildSong(info, options) {
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
        ageRestricted: info.age_limit >= 18,
      },
      options,
    )
  }
}
