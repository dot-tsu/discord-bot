import type { ButtonInteraction } from 'discord.js'
import { Events } from 'discord.js'
import { MESSAGES } from '../messages/en.ts'
import { queueEmbed, queueRow } from '../music/now-playing.ts'
import { player } from '../music/player.ts'
import { clearQueue, skipCurrent, togglePause } from '../music/queue-controls.ts'
import { client } from './client.ts'

export function setupInteractionRouter() {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (!interaction.isButton())
        return

      if (interaction.customId.startsWith('np:')) {
        await handleNowPlayingButton(interaction)

        return
      }

      if (interaction.customId.startsWith('nq:'))
        await handleQueuePageButton(interaction)
    }
    catch (error) {
      console.error('[Discord] Interaction error:', error)
    }
  })
}

async function handleNowPlayingButton(interaction: ButtonInteraction) {
  const guildId = interaction.guildId

  if (!guildId)
    return

  const queue = player.getQueue(guildId)
  const action = interaction.customId.slice('np:'.length)

  if (!queue) {
    await interaction.reply({ content: MESSAGES.nothingPlaying, ephemeral: true })

    return
  }

  if (action === 'queue') {
    await interaction.reply({ embeds: [queueEmbed(queue, 1)], components: [queueRow(queue, 1)] })

    return
  }

  switch (action) {
    case 'pause':
      await togglePause(queue)
      break
    case 'skip':
      await skipCurrent(queue)
      break
    case 'shuffle':
      await queue.shuffle()
      break
    case 'clear':
      await clearQueue(queue)
      break
  }

  await interaction.deferUpdate()
}

async function handleQueuePageButton(interaction: ButtonInteraction) {
  const guildId = interaction.guildId

  if (!guildId)
    return

  const [direction, rawPage] = interaction.customId.slice('nq:'.length).split(':')
  const page = Number.parseInt(rawPage ?? '1', 10)
  const queue = player.getQueue(guildId)

  if (!queue) {
    await interaction.update({ content: MESSAGES.nothingPlaying, embeds: [], components: [] })

    return
  }

  const targetPage = direction === 'prev' ? page - 1 : page + 1

  await interaction.update({
    embeds: [queueEmbed(queue, targetPage)],
    components: [queueRow(queue, targetPage)],
  })
}
