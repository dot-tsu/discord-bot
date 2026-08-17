import type { Queue } from 'distube'

export function togglePause(queue: Queue) {
  return queue.paused ? queue.resume() : queue.pause()
}

export async function skipCurrent(queue: Queue) {
  if (queue.songs.length > 1 || queue.autoplay)
    await queue.skip()
  else
    await queue.stop()
}

export async function clearQueue(queue: Queue) {
  queue.songs.length = 0

  if (!queue.stopped)
    await queue.skip()
}
