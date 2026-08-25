import { expect, test } from 'bun:test'
import { finishedAudioFile } from '../yt-dlp-plugin.js'

test('a partially downloaded song is not playable', () => {
  const files = ['def456.m4a.part', 'abc123.webm', 'abc123.m4a.part']

  expect(finishedAudioFile(files, 'abc123')).toBe('abc123.webm')
})

test('the finished audio file is found by id', () => {
  expect(finishedAudioFile(['abc123.m4a'], 'abc123')).toBe('abc123.m4a')
})

test('files belonging to other songs are ignored', () => {
  expect(finishedAudioFile(['def456.m4a', 'abc123.m4a.part', 'xyz789.webm'], 'abc123')).toBeUndefined()
})
