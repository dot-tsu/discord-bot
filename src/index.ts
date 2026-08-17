import { CONFIG } from '#features/config/app-config.js'
import { setupMessageListener } from '#features/handlers/setup-message-listener.js'
import { setupMusicEvents } from '#features/music/events/setup-music-events.js'
import { client } from './discord/client.ts'
import './music/player.ts'

async function main() {
  setupMusicEvents()
  setupMessageListener()

  await client.login(CONFIG.DISCORD_TOKEN)
}

main().catch(error => console.error('[System] Fatal error during startup:', error))
