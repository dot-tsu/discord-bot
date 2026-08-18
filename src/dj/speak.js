import { requestCompletion } from './client.js'
import { personaFor } from './persona.js'

const REWRITE_TIMEOUT_MS = 8000
const REWRITE_RULES = 'Below is something the bot needs to tell someone. Say the same thing in your own voice and your own language, in one short line. Reply with that line and nothing else.'

// Returns null instead of throwing: every caller reacts to silence, none of them
// can do anything useful with the error.
async function speakInCharacter(channel, settings, text) {
  // A failed typing indicator is not worth interrupting the reply over.
  void channel.sendTyping().catch(() => {})

  try {
    const { content } = await requestCompletion({
      messages: [
        { role: 'system', content: `${personaFor(settings)}\n\n${REWRITE_RULES}` },
        { role: 'user', content: text },
      ],
      timeoutMs: REWRITE_TIMEOUT_MS,
    })

    return content?.trim() || null
  }
  catch (error) {
    console.error('[DJ] Could not put a message in character:', error)

    return null
  }
}

export async function say(message, settings, text) {
  const spoken = await speakInCharacter(message.channel, settings, text)

  if (spoken)
    await message.reply(spoken)
}

// A refusal carries the reason the request did not happen, so staying quiet
// would leave the person with no idea what went wrong.
export async function refuse(message, settings, text) {
  const spoken = await speakInCharacter(message.channel, settings, text)

  if (!spoken) {
    await message.react('❌')

    return
  }

  await message.reply(spoken)
}

export async function announce(channel, settings, text) {
  const spoken = await speakInCharacter(channel, settings, text)

  if (spoken)
    await channel.send(spoken).catch(error => console.error('[DJ] Failed to send announcement:', error))
}
