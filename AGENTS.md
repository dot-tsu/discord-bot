# AGENTS.md

## Run Commands

- `bun install` - Install dependencies (Bun is the package manager and script runner)
- `bun run start` - Production run
- `bun run dev` - Development with `--watch` flag for auto-reload
- `bun run lint` - Linting via antfu/eslint-config
- `bun test` - Run tests

## Requirements

- **Node.js 24** (required, per `package.json` engines; the runtime is Node, not Bun - distube is incompatible with Bun)
- **FFmpeg** - Must be installed separately and on PATH (not an npm dependency)
- **yt-dlp** - Must be installed separately and on PATH (not an npm dependency)

## Configuration

- Bot token goes in the `DISCORD_TOKEN` environment variable
- Per-guild settings are auto-persisted to `data/guilds.json` (gitignored)
- Configure the listening channel by mentioning the bot and a channel: `@DJ #music`
- `assets/welcome.mp3` (optional) - Played when bot first joins a voice channel per guild

## Runtime notes

- Node 24 runs plain JavaScript natively; there is no build step and no TypeScript.
- YouTube playback uses the `yt-dlp` binary directly (ytdl-core fails to decipher current YouTube player JS). Audio is downloaded to a file in `$TMPDIR/dj-audio` and played from there: YouTube's googlevideo audio URLs only answer closed-range requests, which ffmpeg cannot stream. The `player_client=android` extractor arg avoids YouTube's IP throttling (403s). Files older than a day are cleaned up.

## Architecture

- Entry point: `src/index.js`
- Uses discord.js 14 + distube 5 for music playback
- Plain JavaScript: relative imports carry the real on-disk `.js` extension (Node 24 ESM)
- Tests run with `bun test`
