import { playIntroIfFirstJoin } from '../music/intro.js'
import { player, ytDlpPlugin } from '../music/player.js'
import { isPositionInQueue, MUSIC_ACTIONS, removeSongAt, runMusicAction } from '../music/queue-controls.js'
import { withAnnouncementsSuppressed } from '../music/queue-events.js'

const MAX_SONGS_PER_REQUEST = 10
// Buttons get a blind toggle, but the model must name the outcome; toggle is a
// coin flip until it can see the paused state.
const PLAYBACK_ACTIONS = MUSIC_ACTIONS.filter(action => action !== 'toggle')

export const DJ_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'queue_songs',
      description: 'Add songs to the queue. Every entry is searched on YouTube, so write each one as "Artist - Title". When the request is a mood, a genre or an era rather than a named song, choose the songs yourself.',
      parameters: {
        type: 'object',
        properties: {
          songs: {
            type: 'array',
            items: { type: 'string' },
            description: `Up to ${MAX_SONGS_PER_REQUEST} songs, in the order they should play.`,
          },
        },
        required: ['songs'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'control_playback',
      description: 'Act on what is already playing.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: PLAYBACK_ACTIONS },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_song',
      description: 'Drop one song from the queue by position, where 1 is the song playing right now.',
      parameters: {
        type: 'object',
        properties: {
          position: { type: 'integer' },
        },
        required: ['position'],
      },
    },
  },
]

// All searches run in parallel, then the resolved playlist is added with a
// single play() so the queue keeps the requested order and only one add event
// fires. A burst of searches is a real YouTube 403 risk, but ten at once is
// what a request like "poneme una playlist" means, and the throttle seen so
// far only hit googlevideo media URLs, not search queries.
async function queueSongs(songs, context) {
  const wanted = songs.slice(0, MAX_SONGS_PER_REQUEST)

  if (!wanted.length)
    return { error: 'no songs were given' }

  const { voiceChannel, textChannel, member } = context

  if (!voiceChannel)
    return { error: 'they are not in a voice channel, so there is nowhere to play' }

  await playIntroIfFirstJoin(voiceChannel)

  const resolved = (await Promise.all(
    wanted.map(song => ytDlpPlugin.searchSong(song, { member }).catch((error) => {
      console.error(`[DJ] Could not find "${song}":`, error)

      return null
    })),
  )).filter(Boolean)

  if (!resolved.length)
    return { error: 'none of those songs were found' }

  const playlist = await player.createCustomPlaylist(resolved, { member })

  await withAnnouncementsSuppressed(voiceChannel.guild.id, () => player.play(voiceChannel, playlist, { textChannel, member }))

  return {
    queued: resolved.length,
    missing: songs.length - resolved.length,
    first_added: resolved[0].name,
  }
}

export async function runTool(name, args, context) {
  if (name === 'queue_songs')
    return queueSongs(args.songs ?? [], context)

  const queue = player.getQueue(context.guildId)

  if (!queue)
    return { error: 'nothing is playing right now' }

  if (name === 'control_playback') {
    if (!PLAYBACK_ACTIONS.includes(args.action))
      return { error: `cannot do "${args.action}"` }

    await runMusicAction(queue, args.action)

    return { done: args.action, paused: queue.paused, radio: queue.autoplay }
  }

  if (name === 'remove_song') {
    if (!Number.isInteger(args.position) || !isPositionInQueue(queue, args.position))
      return { error: `there is no song at position ${args.position}` }

    const removed = queue.songs[args.position - 1].name
    await removeSongAt(queue, args.position)

    return { removed }
  }

  return { error: `there is no tool called ${name}` }
}
