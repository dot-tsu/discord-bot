import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'bun:test'
import { loadSettingsStore } from '../store.ts'

async function withTempStore(run: (filePath: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), 'settings-'))
  const filePath = join(dir, 'guilds.json')

  try {
    await run(filePath)
  }
  finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test('store round-trips settings and keeps guilds independent', async () => {
  await withTempStore(async (filePath) => {
    const store = await loadSettingsStore(filePath)
    expect(store.get('a').textChannelId).toBeNull()

    await store.setTextChannel('a', '111')
    await store.setTextChannel('b', '222')

    const reloaded = await loadSettingsStore(filePath)
    expect(reloaded.get('a').textChannelId).toBe('111')
    expect(reloaded.get('b').textChannelId).toBe('222')
    expect(reloaded.get('c').textChannelId).toBeNull()
  })
})

test('concurrent writes all persist', async () => {
  await withTempStore(async (filePath) => {
    const store = await loadSettingsStore(filePath)

    await Promise.all(
      Array.from({ length: 20 }, (_, i) => store.setTextChannel(`g${i}`, `c${i}`)),
    )

    const reloaded = await loadSettingsStore(filePath)
    expect(reloaded.get('g0').textChannelId).toBe('c0')
    expect(reloaded.get('g19').textChannelId).toBe('c19')
  })
})

test('corrupt settings file fails the store load', async () => {
  await withTempStore(async (filePath) => {
    await writeFile(filePath, '{ not json')

    expect(loadSettingsStore(filePath)).rejects.toThrow()
  })
})
