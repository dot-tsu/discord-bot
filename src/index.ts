import { resolve } from 'node:path'
import process from 'node:process'
import { client } from './discord/client.ts'
import { setupInteractionRouter } from './discord/route-interaction.ts'
import { setupMessageRouter } from './discord/route-message.ts'
import { loadSettingsStore } from './guild-settings/store.ts'
import { setupLeaveWhenEmpty } from './music/leave-when-empty.ts'
import { setupMusicEvents } from './music/queue-events.ts'
import './music/player.ts'

const SETTINGS_PATH = resolve(import.meta.dirname, '../data/guilds.json')

async function main() {
  const token = process.env.DISCORD_TOKEN

  if (!token)
    throw new Error('Missing DISCORD_TOKEN. Set it in the environment.')

  const store = await loadSettingsStore(SETTINGS_PATH)

  setupMusicEvents()
  setupLeaveWhenEmpty()
  setupMessageRouter(store)
  setupInteractionRouter()

  await client.login(token)
}

main().catch(error => console.error('[System] Fatal error during startup:', error))
