import { Events } from 'discord.js'
import { client } from '../discord/client.ts'
import { player } from './player.ts'

export function setupLeaveWhenEmpty() {
  client.on(Events.VoiceStateUpdate, (oldState) => {
    const leftChannel = oldState.channel

    if (!leftChannel)
      return

    const voice = player.voices.get(leftChannel.guild.id)

    if (!voice || voice.channelId !== leftChannel.id)
      return

    if (leftChannel.members.some(member => !member.user.bot))
      return

    console.info('[Music] Voice channel empty, leaving')
    voice.leave()
  })
}
