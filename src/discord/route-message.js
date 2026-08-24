import { ChannelType, Events, PermissionFlagsBits } from 'discord.js'
import { askDj } from '../dj/ask.js'
import { refuse, say } from '../dj/speak.js'
import { MESSAGES } from '../messages/en.js'
import { playIntroIfFirstJoin } from '../music/intro.js'
import { scheduleNowPlayingRepost, showQueue } from '../music/now-playing.js'
import { player } from '../music/player.js'
import { isPositionInQueue, removeSongAt, runMusicAction } from '../music/queue-controls.js'
import { client } from './client.js'
import { configureTextChannel } from './configure-text-channel.js'
import { parseCommand } from './parse-command.js'

const MAX_PERSONA_LENGTH = 500
const DJ_REQUEST_COOLDOWN_MS = 15_000

const lastDjRequestAtByChannel = new Map()

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

      if (command.type === 'persona') {
        await configurePersona(message, store, command.text)

        return
      }

      if (message.channelId !== store.get(message.guildId).textChannelId)
        return

      if (command.type === 'query')
        await playQuery(store, message, command.query)
      else if (command.type === 'dj')
        await askDjInChannel(store, message, command.request)
      else
        await runCommand(store, message, command)
    }
    catch (error) {
      console.error('[Discord] Message handling error:', error)
    }

    const queue = player.getQueue(message.guildId)

    if (queue && queue.textChannel?.id === message.channelId)
      scheduleNowPlayingRepost(queue)
  })
}

async function configurePersona(message, store, text) {
  if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await refuse(message, store.get(message.guildId), MESSAGES.personaPermission)

    return
  }

  const persona = text.trim()

  if (!persona) {
    await refuse(message, store.get(message.guildId), MESSAGES.personaUsage)

    return
  }

  if (persona.length > MAX_PERSONA_LENGTH) {
    await refuse(message, store.get(message.guildId), MESSAGES.personaTooLong(MAX_PERSONA_LENGTH))

    return
  }

  await store.updateGuild(message.guildId, { persona })
  await say(message, store.get(message.guildId), MESSAGES.personaConfigured)
}

// The same checks gate every path into the voice channel: a direct query or
// the dj's own tool calls must not join where the bot cannot speak.
function voiceChannelProblem(voiceChannel, guild) {
  if (!voiceChannel)
    return MESSAGES.joinVoiceChannel

  if (voiceChannel.type === ChannelType.GuildStageVoice)
    return MESSAGES.stageChannelPermissions

  const permissions = voiceChannel.permissionsFor(guild.members.me)

  if (!permissions?.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]))
    return MESSAGES.botPermissions

  return null
}

async function playQuery(store, message, query) {
  const voiceChannel = message.member?.voice?.channel ?? null
  const settings = store.get(message.guildId)
  const problem = voiceChannelProblem(voiceChannel, message.guild)

  if (problem) {
    await refuse(message, settings, problem)

    return
  }

  await playIntroIfFirstJoin(voiceChannel)

  try {
    await player.play(voiceChannel, query, {
      textChannel: message.channel,
      member: message.member,
    })
  }
  catch (error) {
    if (!player.getQueue(voiceChannel.guild.id))
      await voiceChannel.guild.members.me?.voice.disconnect()

    if (error.errorCode === 'NO_RESULT') {
      await refuse(message, settings, MESSAGES.noResult)

      return
    }
    console.error('[Music] Play error:', error)
    await say(message, settings, MESSAGES.playbackError)
  }
}

async function askDjInChannel(store, message, request) {
  const lastRequest = lastDjRequestAtByChannel.get(message.channelId) ?? 0

  if (Date.now() - lastRequest < DJ_REQUEST_COOLDOWN_MS) {
    await message.reply(MESSAGES.djBusy)

    return
  }

  lastDjRequestAtByChannel.set(message.channelId, Date.now())

  const giveUpOnRequest = () => {
    lastDjRequestAtByChannel.delete(message.channelId)

    return message.react('❌')
  }
  let reply

  try {
    reply = await askDj({
      message,
      settings: store.get(message.guildId),
      request,
      voiceChannel: message.member?.voice?.channel ?? null,
    })
  }
  catch (error) {
    console.error('[DJ] Request failed:', error)
    await giveUpOnRequest()

    return
  }

  // A null reply means the model never said anything, which the person would
  // otherwise read as being ignored.
  if (!reply)
    return giveUpOnRequest()

  await message.reply(reply)
}

async function runCommand(store, message, command) {
  const queue = player.getQueue(message.guildId)

  if (!queue) {
    await refuse(message, store.get(message.guildId), MESSAGES.nothingPlaying)

    return
  }

  if (command.type === 'remove') {
    await runRemoveCommand(store, message, queue, command.index)

    return
  }

  if (command.type === 'queue') {
    await showQueue(message.channel, queue)

    return
  }

  await runMusicAction(queue, command.type)
  await message.react('✅')
}

async function runRemoveCommand(store, message, queue, index) {
  if (index === null) {
    await refuse(message, store.get(message.guildId), MESSAGES.removeUsage)

    return
  }

  if (!isPositionInQueue(queue, index)) {
    await refuse(message, store.get(message.guildId), MESSAGES.removeOutOfRange)

    return
  }

  await removeSongAt(queue, index)
  await message.react('✅')
}
