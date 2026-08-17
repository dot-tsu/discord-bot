import type { Queue } from 'distube'

export const MUSIC_ACTIONS = ['pause', 'resume', 'skip', 'shuffle', 'clear'] as const
export type MusicAction = typeof MUSIC_ACTIONS[number]

export function isMusicAction(value: string): value is MusicAction {
  return (MUSIC_ACTIONS as readonly string[]).includes(value)
}

export function togglePause(queue: Queue) {
  return queue.paused ? queue.resume() : queue.pause()
}

export async function skipCurrent(queue: Queue) {
  if (queue.songs.length > 1 || queue.autoplay)
    await queue.skip()
  else
    await queue.stop()
}

export async function runMusicAction(queue: Queue, action: MusicAction) {
  switch (action) {
    case 'pause':
    case 'resume':
      await togglePause(queue)
      break
    case 'skip':
      await skipCurrent(queue)
      break
    case 'shuffle':
      await queue.shuffle()
      break
    case 'clear':
      await queue.stop()
      break
  }
}
