import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const DEFAULT_SETTINGS = { textChannelId: null, persona: null }

async function readSettings(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf-8'))
  }
  catch (error) {
    if (error.code === 'ENOENT')
      return {}

    throw error
  }
}

export async function loadSettingsStore(filePath) {
  let settings = await readSettings(filePath)
  let writeChain = Promise.resolve()

  function writeSettings() {
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
    async updateGuild(guildId, changes) {
      settings = {
        ...settings,
        [guildId]: { ...settings[guildId], ...changes },
      }
      await writeSettings()
    },
  }
}
