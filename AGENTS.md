# AGENTS.md

## Run Commands

- `bun install` - Install dependencies (Bun is the package manager)
- `npm start` - Production run (Node 24 runtime)
- `npm run dev` - Development with `--watch` flag for auto-reload
- `npm run lint` - Linting via antfu/eslint-config + `tsc --noEmit`
- `bun test` - Run tests

## Requirements

- **Node.js 24** (required, per `package.json` engines; strips TypeScript natively, no build step)
- **FFmpeg** - Must be installed separately and on PATH (not an npm dependency)

## Configuration

- Bot token goes in the `DISCORD_TOKEN` environment variable
- Per-guild settings are auto-persisted to `data/guilds.json` (gitignored)
- Configure the listening channel by mentioning the bot and a channel: `@DJ #music`
- `assets/welcome.mp3` (optional) - Played when bot first joins a voice channel per guild

## Architecture

- Entry point: `src/index.ts`
- Import aliases: `#client`, `#player`, `#features/*` (defined in `package.json` imports)
- Uses discord.js 14 + distube 5 for music playback
- TypeScript in `.ts` files: relative imports use the `.ts` extension (Node 24 native stripping)
- Tests run with `bun test`
