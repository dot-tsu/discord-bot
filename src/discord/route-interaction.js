import { Events, MessageFlags } from 'discord.js'
import { MESSAGES } from '../messages/en.js'
import { queueView, showQueue } from '../music/now-playing.js'
import { player } from '../music/player.js'
import { runMusicAction } from '../music/queue-controls.js'
import { client } from './client.js'

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

async function handleNowPlayingButton(interaction) {
  const guildId = interaction.guildId

  if (!guildId)
    return

  const queue = player.getQueue(guildId)
  const action = interaction.customId.slice('np:'.length)

  if (!queue) {
    await interaction.reply({ content: MESSAGES.nothingPlaying, flags: MessageFlags.Ephemeral })

    return
  }

  if (action === 'queue') {
    await interaction.deferUpdate()
    await showQueue(queue.textChannel, queue)

    return
  }

  // ack before acting: distube actions can exceed the 3s window while downloading audio
  await interaction.deferUpdate()
  await runMusicAction(queue, action)
}

async function handleQueuePageButton(interaction) {
  const guildId = interaction.guildId

  if (!guildId)
    return

  const [direction, rawPage] = interaction.customId.slice('nq:'.length).split(':')
  const page = Number.parseInt(rawPage, 10)

  if (!Number.isInteger(page)) {
    await interaction.deferUpdate()

    return
  }

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

async function updateQueueMessage(interaction, payload) {
  await interaction.deferUpdate()
  await interaction.message.edit(payload)
}
