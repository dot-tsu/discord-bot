import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface GuildSettings {
  textChannelId: string | null
}

export interface GuildSettingsStore {
  get: (guildId: string) => GuildSettings
  setTextChannel: (guildId: string, channelId: string) => Promise<void>
}

type GuildSettingsMap = Record<string, GuildSettings>

const DEFAULT_SETTINGS: GuildSettings = { textChannelId: null }

let writeChain: Promise<void> = Promise.resolve()

async function readSettings(filePath: string): Promise<GuildSettingsMap> {
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'))
  }
  catch {
    return {}
  }
}

function writeSettings(filePath: string, settings: GuildSettingsMap): Promise<void> {
  writeChain = writeChain.then(async () => {
    await mkdir(dirname(filePath), { recursive: true })
    const tempPath = `${filePath}.tmp`
    await writeFile(tempPath, `${JSON.stringify(settings, null, 2)}\n`)
    await rename(tempPath, filePath)
  })

  return writeChain
}

export async function loadSettingsStore(filePath: string): Promise<GuildSettingsStore> {
  let settings = await readSettings(filePath)

  return {
    get(guildId) {
      return settings[guildId] ?? DEFAULT_SETTINGS
    },
    async setTextChannel(guildId, channelId) {
      settings = {
        ...settings,
        [guildId]: { ...settings[guildId], textChannelId: channelId },
      }
      await writeSettings(filePath, settings)
    },
  }
}
