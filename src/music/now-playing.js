import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js'

const QUEUE_PAGE_SIZE = 10
const NOW_PLAYING_REPOST_DEBOUNCE_MS = 2_000
const nowPlayingMessages = new Map()
const repostTimersByGuild = new Map()
const messageWritesByGuild = new Map()

export function songDisplayName(song) {
  return song.name ?? song.url ?? 'Unknown song'
}

export function updateNowPlaying(queue, song) {
  return withQueuedWrites(queue.id, () => writeNowPlaying(queue, song))
}

function withQueuedWrites(guildId, write) {
  const previous = messageWritesByGuild.get(guildId) ?? Promise.resolve()
  const next = previous.catch(() => {}).then(write)
  messageWritesByGuild.set(guildId, next)

  return next
}

async function writeNowPlaying(queue, song) {
  const channel = queue.textChannel

  if (!channel)
    return

  const embed = nowPlayingEmbed(queue, song)
  const row = nowPlayingRow()
  const existing = nowPlayingMessages.get(queue.id)

  if (existing?.editable && existing.channelId === channel.id) {
    try {
      await existing.edit({ embeds: [embed], components: [row] })

      return
    }
    catch (error) {
      console.error('[Music] Failed to edit now playing message:', error)

      if (nowPlayingMessages.get(queue.id) === existing)
        nowPlayingMessages.delete(queue.id)
    }
  }

  const sent = await channel.send({ embeds: [embed], components: [row] })
  nowPlayingMessages.set(queue.id, sent)
}

export function scheduleNowPlayingRepost(queue) {
  clearTimeout(repostTimersByGuild.get(queue.id))

  repostTimersByGuild.set(queue.id, setTimeout(() => {
    repostTimersByGuild.delete(queue.id)
    void withQueuedWrites(queue.id, () => repostNowPlaying(queue)).catch((error) => {
      console.error('[Music] Failed to repost now playing message:', error)
    })
  }, NOW_PLAYING_REPOST_DEBOUNCE_MS))
}

async function repostNowPlaying(queue) {
  const existing = nowPlayingMessages.get(queue.id)

  if (!existing || !existing.deletable)
    return

  await existing.delete()
  nowPlayingMessages.delete(queue.id)
  await writeNowPlaying(queue, queue.songs[0])
}

function nowPlayingEmbed(queue, song) {
  return new EmbedBuilder()
    .setTitle(songDisplayName(song))
    .setURL(song.url ?? null)
    .addFields(
      { name: 'Duration', value: song.formattedDuration, inline: true },
      { name: 'In queue', value: String(Math.max(queue.songs.length - 1, 0)), inline: true },
    )
}

function nowPlayingRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('np:pause').setLabel('Pause / resume').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np:skip').setLabel('Skip').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np:shuffle').setLabel('Shuffle').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('np:clear').setLabel('Clear').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('np:queue').setLabel('Queue').setStyle(ButtonStyle.Secondary),
  )
}

export function queueView(queue, page) {
  const total = queue.songs.length
  const pageCount = Math.max(Math.ceil(total / QUEUE_PAGE_SIZE), 1)
  const start = (page - 1) * QUEUE_PAGE_SIZE
  const lines = queue.songs
    .slice(start, start + QUEUE_PAGE_SIZE)
    .map((song, index) => `${start + index + 1}. ${songDisplayName(song)}`)

  const embed = new EmbedBuilder()
    .setTitle(`Queue (${total} songs)`)
    .setDescription(lines.join('\n') || 'Empty')
    .setFooter({ text: `Page ${page} of ${pageCount}` })

  const row = new ActionRowBuilder().addComponents(
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

  return { embed, row }
}
