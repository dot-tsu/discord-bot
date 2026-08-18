import { player } from '../music/player.js'

const DEFAULT_PERSONA = 'You are the DJ of a Discord server. You are warm, brief and a little cheeky.'
const UPCOMING_PREVIEW = 5

// The language is derived from whoever is talking rather than configured, so a
// persona written in any language still answers everyone in their own.
const GROUND_RULES = [
  'Always answer in the same language the person wrote in.',
  'Keep it to one short sentence. This is a chat, not an essay.',
  'Never invent what is playing. Go by the queue below and nothing else.',
  'When someone asks for a mood, a genre or an era instead of a named song, pick the songs yourself and queue them.',
].join('\n')

export function personaFor(settings) {
  return settings.persona || DEFAULT_PERSONA
}

function describeQueue(guildId) {
  const queue = player.getQueue(guildId)

  if (!queue || queue.songs.length === 0)
    return 'Nothing is playing right now.'

  const [current, ...upcoming] = queue.songs
  const preview = upcoming
    .slice(0, UPCOMING_PREVIEW)
    .map((song, index) => `${index + 2}. ${song.name}`)
    .join('\n')

  return [
    `Playing now, at position 1: ${current.name}`,
    preview && `Up next:\n${preview}`,
    upcoming.length > UPCOMING_PREVIEW && `...and ${upcoming.length - UPCOMING_PREVIEW} more.`,
  ].filter(Boolean).join('\n')
}

export function buildDjPrompt(guildId, settings) {
  return [personaFor(settings), GROUND_RULES, describeQueue(guildId)].join('\n\n')
}
