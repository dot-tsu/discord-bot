import process from 'node:process'
import { setupMessageListener } from '#features/handlers/setup-message-listener.ts'
import { setupMusicEvents } from '#features/music/events/setup-music-events.ts'
import { client } from './discord/client.ts'
import { loadSettingsStore } from './guild-settings/store.ts'
import './music/player.ts'

const SETTINGS_PATH = 'data/guilds.json'

async function main() {
  const token = process.env.DISCORD_TOKEN

  if (!token)
    throw new Error('Missing DISCORD_TOKEN. Set it in the environment.')

  const store = await loadSettingsStore(SETTINGS_PATH)

  setupMusicEvents()
  setupMessageListener(store)

  await client.login(token)
}

main().catch(error => console.error('[System] Fatal error during startup:', error))
