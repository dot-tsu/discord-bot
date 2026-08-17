import { Events } from 'discord.js'
import { isVoiceChannelEmpty } from 'distube'
import { client } from '../discord/client.ts'
import { player } from './player.ts'

export function setupLeaveWhenEmpty() {
  client.on(Events.VoiceStateUpdate, (oldState) => {
    const voice = player.voices.get(oldState.guild.id)

    if (!voice || voice.channelId !== oldState.channel?.id)
      return

    if (!isVoiceChannelEmpty(oldState))
      return

    console.info('[Music] Voice channel empty, leaving')
    voice.leave()
  })
}
