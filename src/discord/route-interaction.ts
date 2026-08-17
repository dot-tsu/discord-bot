import type { ActionRowBuilder, ButtonBuilder, ButtonInteraction, EmbedBuilder } from 'discord.js'
import { Events } from 'discord.js'
import { MESSAGES } from '../messages/en.ts'
import { queueView } from '../music/now-playing.ts'
import { player } from '../music/player.ts'
import { isMusicAction, runMusicAction } from '../music/queue-controls.ts'
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
    const view = queueView(queue, 1)
    await interaction.reply({ embeds: [view.embed], components: [view.row] })

    return
  }

  if (isMusicAction(action)) {
    await runMusicAction(queue, action)
    await interaction.deferUpdate()
  }
}

async function handleQueuePageButton(interaction: ButtonInteraction) {
  const guildId = interaction.guildId

  if (!guildId)
    return

  const [direction, rawPage] = interaction.customId.slice('nq:'.length).split(':')
  const page = Number.parseInt(rawPage ?? '1', 10)
  const queue = player.getQueue(guildId)

  if (!queue) {
    await updateQueueMessage(interaction, {
      content: MESSAGES.nothingPlaying,
      embeds: [],
      components: [],
    })

    return
  }

  const targetPage = direction === 'prev' ? page - 1 : page + 1
  const view = queueView(queue, targetPage)

  await updateQueueMessage(interaction, {
    embeds: [view.embed],
    components: [view.row],
  })
}

async function updateQueueMessage(
  interaction: ButtonInteraction,
  payload: { content?: string, embeds: EmbedBuilder[], components: ActionRowBuilder<ButtonBuilder>[] },
) {
  if (interaction.message.interactionMetadata) {
    await interaction.update(payload)

    return
  }

  await interaction.deferUpdate()
  await interaction.message.edit(payload)
}
