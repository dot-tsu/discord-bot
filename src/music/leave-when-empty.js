import { Events } from 'discord.js'
import { isVoiceChannelEmpty } from 'distube'
import { client } from '../discord/client.js'
import { clearPlaybackMessages } from './now-playing.js'
import { player } from './player.js'

export function setupLeaveWhenEmpty() {
  client.on(Events.VoiceStateUpdate, (oldState) => {
    const voice = player.voices.get(oldState.guild.id)

    if (!voice || voice.channelId !== oldState.channel?.id)
      return

    if (!isVoiceChannelEmpty(oldState))
      return

    console.info('[Music] Voice channel empty, leaving')
    void clearPlaybackMessages(oldState.guild.id)
    voice.leave()
  })
}
