export const MUSIC_ACTIONS = ['pause', 'resume', 'skip', 'shuffle', 'clear']

export async function runMusicAction(queue, action) {
  switch (action) {
    case 'pause':
    case 'resume':
      await (queue.paused ? queue.resume() : queue.pause())
      break
    case 'skip':
      if (queue.songs.length > 1 || queue.autoplay)
        await queue.skip()
      else
        await queue.stop()
      break
    case 'shuffle':
      await queue.shuffle()
      break
    case 'clear':
      await queue.stop()
      break
    default:
      // the deleted MusicAction union type enforced exhaustive cases; the throw
      // keeps a new COMMAND_NAMES entry from silently no-opping with a checkmark
      throw new Error(`Unknown music action: ${action}`)
  }
}
