import { ChannelType, Events, PermissionFlagsBits } from 'discord.js'
import { MESSAGES } from '../messages/en.js'
import { playIntroIfFirstJoin } from '../music/intro.js'
import { queueView } from '../music/now-playing.js'
import { player } from '../music/player.js'
import { runMusicAction } from '../music/queue-controls.js'
import { client } from './client.js'
import { configureTextChannel } from './configure-text-channel.js'
import { parseCommand } from './parse-command.js'

export function setupMessageRouter(store) {
  client.on(Events.MessageCreate, async (message) => {
    try {
      if (message.author.bot)
        return

      if (!message.guildId)
        return

      if (!message.channel.isTextBased())
        return

      const command = parseCommand(
        message.content,
        message.client.user.id,
        message.mentions.members?.has(message.client.user.id) ?? false,
        [...message.mentions.channels.keys()],
      )

      if (command.type === 'configure') {
        await configureTextChannel(message, store)

        return
      }

      if (message.channelId !== store.get(message.guildId).textChannelId)
        return

      if (command.type === 'query')
        await playQuery(message, message.channel, command.query)
      else
        await runCommand(message, message.guildId, message.channel, command)
    }
    catch (error) {
      console.error('[Discord] Message handling error:', error)
    }
  })
}

async function playQuery(message, channel, query) {
  const voiceChannel = message.member?.voice?.channel ?? null

  if (!voiceChannel) {
    await message.reply(MESSAGES.joinVoiceChannel)

    return
  }

  if (voiceChannel.type === ChannelType.GuildStageVoice) {
    await message.reply(MESSAGES.stageChannelPermissions)

    return
  }

  const permissions = voiceChannel.permissionsFor(message.guild.members.me)

  if (!permissions?.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
    await message.reply(MESSAGES.botPermissions)

    return
  }

  await playIntroIfFirstJoin(voiceChannel)

  try {
    await player.play(voiceChannel, query, {
      textChannel: channel,
      member: message.member,
    })
  }
  catch (error) {
    if (!player.getQueue(voiceChannel.guild.id))
      await voiceChannel.guild.members.me?.voice.disconnect()

    if (error.errorCode === 'NO_RESULT') {
      await message.reply(MESSAGES.noResult)

      return
    }
    console.error('[Music] Play error:', error)
    await message.reply(MESSAGES.playbackError)
  }
}

async function runCommand(message, guildId, channel, command) {
  const queue = player.getQueue(guildId)

  if (!queue) {
    await message.reply(MESSAGES.nothingPlaying)

    return
  }

  if (command.type === 'remove') {
    await runRemoveCommand(message, queue, command.index)

    return
  }

  if (command.type === 'queue') {
    const view = queueView(queue, 1)
    await channel.send({ embeds: [view.embed], components: [view.row] })

    return
  }

  await runMusicAction(queue, command.type)
  await message.react('✅')
}

async function runRemoveCommand(message, queue, index) {
  if (index === null) {
    await message.reply(MESSAGES.removeUsage)

    return
  }

  if (index <= 0 || index > queue.songs.length) {
    await message.reply(MESSAGES.removeOutOfRange)

    return
  }

  if (index === 1)
    await runMusicAction(queue, 'skip')
  else
    // distube's Queue.remove() deletes the whole queue; there is no single-song
    // removal API, so remove from the internal song list directly.
    queue.songs.splice(index - 1, 1)

  await message.react('✅')
}
