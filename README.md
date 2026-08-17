[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tsu-ld/dj)

# tsu-ld/dj

A Discord bot that plays music in your voice channel. Drop a song name or a link in the assigned text channel and it starts playing. Controls live on the now-playing message as buttons, and the same commands work as plain text.

## Features

- **Play anything**: YouTube links and search terms, and Spotify links (track, album, playlist, artist) — the track info comes from Spotify and the audio plays from YouTube.
- **Full control surface**: pause, resume, skip, shuffle, clear, and a paginated queue view, all as buttons on the now-playing message or as `@DJ` text commands.
- **Playlists**: paste a playlist link and it queues the whole thing.
- **Leaves when done**: disconnects when the queue ends or the voice channel empties.
- **Remembers its channel**: the listening channel is set per server and survives restarts.
- **Welcome audio**: plays `assets/welcome.mp3` the first time it joins a voice channel each session (optional).

## Tech Stack

- **[Node.js](https://nodejs.org/)**: 24
- **[Bun](https://bun.sh/)**: installs, lints, and runs the test suite
- **Discord**: [discord.js](https://discord.js.org/) + [distube](https://distube.js.org/)
- **Multimedia**: [ffmpeg](https://ffmpeg.org/)

## Requirements

- **Node.js 24**
- **FFmpeg**: install it and make sure it's on your PATH (distube streams audio through it)
- **A Discord bot**: create one in the [Discord developer portal](https://discord.com/developers/applications) and invite it to your server with these intents: Send Messages, Embed Links, Attach Files, Read Message History, Connect, Speak, and the server members and voice states privileged intents.

## Setup

1. **Install dependencies**:

   ```bash
   bun install
   ```

2. **Set the bot token** in the `DISCORD_TOKEN` environment variable:

   ```bash
   export DISCORD_TOKEN=your_bot_token
   ```

3. **(Optional) welcome audio**: put an MP3 at `assets/welcome.mp3`.

## Run

```bash
bun run start
# or, while developing
bun run dev
```

## Using it

1. **Point it at a channel** (the author needs the Manage Channels permission):

   ```
   @DJ #music
   ```

   The bot replies in that channel from then on and remembers it after restarting.

2. **Play something**: join a voice channel and post a link or search term in the listening channel:

   ```
   never gonna give you up
   ```

3. **Control playback**: the buttons on the now-playing message cover everything. The same actions work as text if you prefer:

   ```
   @DJ skip
   @DJ pause
   @DJ resume
   @DJ queue
   @DJ shuffle
   @DJ clear
   @DJ remove 3
   ```
