export const MESSAGES = {
  joinVoiceChannel: 'Please join a voice channel first to use this command.',
  stageChannelPermissions: 'I need speaker permissions to play in a stage channel, or we can use a regular voice channel.',
  botPermissions: 'I need permissions to join and speak in your voice channel.',
  noResult: 'Sorry, I couldn\'t find any song matching your query.',
  playbackError: 'Sorry, I encountered an error while trying to play music.',
  textChannelConfigured: (channel: string) => `All set! I am now listening in ${channel}.`,
  nowPlaying: (song: string) => `Now playing: "${song}"`,
  songAdded: (song: string) => `Added "${song}" to the queue.`,
  playlistAdded: (playlist: string, count: number) => `Added playlist "${playlist}" (${count} songs) to the queue.`,
}
