import type { Message } from 'discord.js'
import type { Queue, Song } from 'distube'
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js'

const QUEUE_PAGE_SIZE = 10
const nowPlayingMessages = new Map<string, Message>()

export function songDisplayName(song: Song): string {
  return song.name ?? song.url ?? 'Unknown song'
}

export async function updateNowPlaying(queue: Queue, song: Song) {
  const channel = queue.textChannel

  if (!channel)
    return

  const embed = nowPlayingEmbed(queue, song)
  const row = nowPlayingRow()
  const existing = nowPlayingMessages.get(queue.id)

  if (existing?.editable) {
    try {
      await existing.edit({ embeds: [embed], components: [row] })

      return
    }
    catch (error) {
      console.error('[Music] Failed to edit now playing message:', error)
      nowPlayingMessages.delete(queue.id)
    }
  }

  const sent = await channel.send({ embeds: [embed], components: [row] })
  nowPlayingMessages.set(queue.id, sent)
}

function nowPlayingEmbed(queue: Queue, song: Song) {
  return new EmbedBuilder()
    .setTitle(songDisplayName(song))
    .setURL(song.url ?? null)
    .addFields(
      { name: 'Duration', value: song.formattedDuration, inline: true },
      { name: 'In queue', value: String(Math.max(queue.songs.length - 1, 0)), inline: true },
    )
}

function nowPlayingRow() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('np:pause').setLabel('Pause / resume').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np:skip').setLabel('Skip').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np:shuffle').setLabel('Shuffle').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np:clear').setLabel('Clear').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('np:queue').setLabel('Queue').setStyle(ButtonStyle.Secondary),
  )
}

export function queueEmbed(queue: Queue, page: number) {
  const total = queue.songs.length
  const pageCount = Math.max(Math.ceil(total / QUEUE_PAGE_SIZE), 1)
  const start = (page - 1) * QUEUE_PAGE_SIZE
  const lines = queue.songs
    .slice(start, start + QUEUE_PAGE_SIZE)
    .map((song, index) => `${start + index + 1}. ${songDisplayName(song)}`)

  return new EmbedBuilder()
    .setTitle(`Queue (${total} songs)`)
    .setDescription(lines.join('\n') || 'Empty')
    .setFooter({ text: `Page ${page} of ${pageCount}` })
}

export function queueRow(queue: Queue, page: number) {
  const pageCount = Math.max(Math.ceil(queue.songs.length / QUEUE_PAGE_SIZE), 1)

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`nq:prev:${page}`)
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`nq:next:${page}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= pageCount),
  )
}
