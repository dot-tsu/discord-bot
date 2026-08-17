import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { loadSettingsStore } from '../store.ts'

test('store round-trips settings and keeps guilds independent', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'settings-'))
  const filePath = join(dir, 'guilds.json')

  try {
    const store = await loadSettingsStore(filePath)
    expect(store.get('a').textChannelId).toBeNull()

    await store.setTextChannel('a', '111')
    await store.setTextChannel('b', '222')

    const reloaded = await loadSettingsStore(filePath)
    expect(reloaded.get('a').textChannelId).toBe('111')
    expect(reloaded.get('b').textChannelId).toBe('222')
    expect(reloaded.get('c').textChannelId).toBeNull()
  }
  finally {
    await rm(dir, { recursive: true, force: true })
  }
})
