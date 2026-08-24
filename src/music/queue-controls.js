import { clearPlaybackMessages, updateNowPlaying } from './now-playing.js'

export const MUSIC_ACTIONS = ['pause', 'resume', 'radio', 'skip', 'shuffle', 'clear']

export function isPositionInQueue(queue, position) {
  return position > 0 && position <= queue.songs.length
}

export async function removeSongAt(queue, position) {
  if (position === 1) {
    await runMusicAction(queue, 'skip')

    return
  }

  // distube's Queue.remove() deletes the whole queue; there is no single-song
  // removal API, so remove from the internal song list directly.
  queue.songs.splice(position - 1, 1)
}

export async function runMusicAction(queue, action) {
  switch (action) {
    case 'pause':
    case 'resume':
      await (queue.paused ? queue.resume() : queue.pause())
      break
    case 'radio':
      queue.toggleAutoplay()
      await updateNowPlaying(queue, queue.songs[0])
      break
    case 'skip':
      if (queue.songs.length > 1 || queue.autoplay) {
        await queue.skip()
      }
      else {
        await runMusicAction(queue, 'clear')
      }
      break
    case 'shuffle':
      await queue.shuffle()
      break
    case 'clear':
      await queue.stop()
      await clearPlaybackMessages(queue.id)
      break
    default:
      // the deleted MusicAction union type enforced exhaustive cases; the throw
      // keeps a new COMMAND_NAMES entry from silently no-opping with a checkmark
      throw new Error(`Unknown music action: ${action}`)
  }
}
