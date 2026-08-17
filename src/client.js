import { Client, Events, GatewayIntentBits } from 'discord.js'

const INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildVoiceStates,
]

export const client = new Client({ intents: INTENTS })

client.once(Events.ClientReady, (readyClient) => {
  console.info(`[Discord] Ready as ${readyClient.user.tag}`)
})
