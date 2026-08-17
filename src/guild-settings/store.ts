import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface GuildSettings {
  textChannelId: string | null
}

export interface GuildSettingsStore {
  get: (guildId: string) => Readonly<GuildSettings>
  setTextChannel: (guildId: string, channelId: string) => Promise<void>
}

type GuildSettingsMap = Record<string, GuildSettings>

const DEFAULT_SETTINGS: GuildSettings = { textChannelId: null }

async function readSettings(filePath: string): Promise<GuildSettingsMap> {
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'))
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      return {}

    throw error
  }
}

export async function loadSettingsStore(filePath: string): Promise<GuildSettingsStore> {
  let settings = await readSettings(filePath)
  let writeChain: Promise<void> = Promise.resolve()

  function writeSettings(): Promise<void> {
    writeChain = writeChain.catch(() => {}).then(async () => {
      await mkdir(dirname(filePath), { recursive: true })
      const tempPath = `${filePath}.tmp`
      await writeFile(tempPath, `${JSON.stringify(settings, null, 2)}\n`)
      await rename(tempPath, filePath)
    })

    return writeChain
  }

  return {
    get(guildId) {
      return settings[guildId] ? { ...settings[guildId] } : { ...DEFAULT_SETTINGS }
    },
    async setTextChannel(guildId, channelId) {
      settings = {
        ...settings,
        [guildId]: { ...settings[guildId], textChannelId: channelId },
      }
      await writeSettings()
    },
  }
}
