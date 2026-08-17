# Refactor spec: dj music bot

Hand this file to implementing agents. Every "verify" is a gate: the phase is not done until its checks pass. Do not skip or reorder phases.

## Context

A Discord music bot (discord.js 14 + distube 5.2.3) that plays songs from free text posted in a configured channel. 423 lines across 33 files, several dead, broken config system, no control surface beyond play/skip. Goal: pleasant to run and use, add the missing features, drop Raspberry Pi workarounds.

**No Rust rewrite.** Settled: every goal is cheaper in Node, distube already owns queue/search/playlist resolution, and the Pi constraint that justified Rust is gone. TypeScript is the chosen correctness upgrade; it is a **user decision**, not a bug-fixing strategy. It prevents shape errors going forward (typed config, typed store); the seven bugs below are behavioral and get fixed by the phases that touch them.

## Verified facts

Probed on this machine, 2026-08-17. Reproducible; re-run before contradicting.

- **Bun 1.3.14 cannot import `@distube/youtube`** (`this.compose is not a function`). Node 24.18 imports everything cleanly. Probe from the repo root: `bun -e "await import('@distube/youtube'); console.log('ok')"` (the `await` matters — a bare `import()` swallows the rejection). Therefore **Bun for install/lint/test, Node 24 for running**. If a future bump fixes the import, re-run the probe; when it passes, flipping the runtime scripts to Bun is pre-approved.
- **ffmpeg is not installed on this machine.** Runtime prerequisite. distube 5 streams via ffmpeg; the requirement stays.
- **distube 5 has no `leaveOnEmpty`/`leaveOnFinish`/`emptyCooldown` options** (distube 4 API, removed). Idle/empty disconnect is userland. `Events.FINISH` is emitted when the queue drains naturally (NOT by `queue.stop()`), and distube does **not** emit `Events.EMPTY` at all — its `EMPTY` enum entry is dead code in this version. Empty-channel detection is a discord.js `VoiceStateUpdate` watcher using the exported `isVoiceChannelEmpty(voiceState)` helper (checks the bot's current voice channel for human members).
- **distube 5 `Events`**: `error`, `addList`, `addSong`, `playSong`, `finishSong`, `empty`, `finish`, `initQueue`, `noRelated`, `disconnect`, `deleteQueue`, `ffmpegDebug`, `debug`.
- **Queue methods available**: `pause`, `resume`, `shuffle`, `jump`, `seek`, `setRepeatMode`, `remove`, `toggleAutoplay`, `addToQueue`, `skip`, `stop`, `previous`. Feature work uses these; no reimplementation.
- **`@distube/spotify@2.0.2` (latest) is added.** Its `exports` map is a bare CJS string (`"./dist/index.js"`), so TS routes every consumer to its CJS typings, which clash with distube's ESM declarations (dual-package hazard: `GuildMember._roles` declared twice). Assigning the plugin to the `plugins` array needs `as unknown as DisTubePlugin`; distube consumes plugins by duck typing (`p.init(this)`), so the cast is declaration-only. The plugin works with no credentials (scrapes a token; caps playlists at 100 tracks when scraping fails), so no env plumbing is wired.
- **Bun cannot run the bot at all** beyond the import probe above; it must be `node src/index.ts` at runtime. A real end-to-end voice playback test under Bun was never possible on this machine (no ffmpeg, no token) — the user reported the original failure occurred when distube tried to play in a voice channel; verify with a live token before flipping runtimes.
- **Node 24 strips TypeScript natively.** No build step. Erasable syntax only: no `enum`, no `namespace`, no constructor parameter properties, `import type` for type-only imports. `tsc --noEmit` is the type check; it must run in the lint script.
- **Button interactions arrive via the `InteractionCreate` event on the existing `Guilds` intent.** There is no `interactionCreate` gateway intent. Do not add intents for buttons.

**Current bugs the refactor must fix** (found by review; each is assigned a phase):

1. `app-config.js` reads `userConfig.ERRORS` / `userConfig.CONFIGURATION`; the documented shape is `MESSAGES.ERRORS` / `MESSAGES.CONFIGURATION`. Two of three config sections silently ignore overrides. -> phase 3
2. `is-configuration-command.js` fires on "mentions bot + mentions any channel", no permission check, one global `TEXT_CHANNEL_ID`. Anyone can repoint the bot; `@DJ skip #general` reconfigures instead of skipping. -> phase 4
3. Top-level `await loadConfig()` in `app-config.js`: a bad config throws at import and `main().catch` in `index.js` never fires. -> phase 2
4. `setup-message-listener.js` calls `handleMessage` unawaited/uncaught; `play-music.js` doesn't await/catch the intro; no `message.reply` is awaited or caught. -> phase 5
5. Intro tests `player.voices.has(guildId)` — "connected right now", so every reconnect replays it; it also blocks the search until the clip ends. -> phase 5
6. Skip reacts `✅` even when there is no queue. -> phase 5
7. Dead: `stop-by-guild.js`, `find-intro-file.js`; unused dep `@distube/file`; stale `package-lock.json`. -> phase 1

## Locked decisions

- **TypeScript, converted in touch, not as a sweep.** A file converts when a phase touches it. User decision; do not relitigate.
- **Per-guild settings.** `data/guilds.json` keyed by guild id. No global `TEXT_CHANNEL_ID`. The store's shape is a TS type; a wrong key anywhere in the codebase is a compile error.
- **Token in env (`DISCORD_TOKEN`), never in a file the bot rewrites.** No other secrets move.
- **Message templates are plain functions** in `src/messages/en.ts` (`songAdded: song => \`Added "${song}" to the queue.\``). No `{{token}}` engine, no renderer, no i18n machinery. Single language (English), sentence case, no jargon.
- **No slash commands.** The bot is driven from a dedicated text channel by design. Buttons on the now-playing embed carry most controls; `@DJ <word>` text commands stay as aliases.
- **No SQLite.** `node:sqlite` is still experimental on 22/24 and a handful of guilds does not warrant it.
- **Breaking change, no migration code.** Config shape changes; the user reconfigures once with `@DJ #channel`. No migrator, no shims for the old shape.
- **Spotify scope:** plugin resolves Spotify *metadata*, streams the matched track from YouTube. README says so; no claiming Spotify audio.

## Target architecture

```
src/
  index.ts                  boot: env token check, login, event setup, single fatal catch
  discord/
    client.ts               Client + intents + ready log
    route-message.ts        router: config cmd -> command -> play query; owns await/catch of everything it calls
    route-interaction.ts    button handling (InteractionCreate)
    parse-command.ts        decides what a message is: config | command(args) | query
    tests/parse-command.test.ts
  music/
    player.ts               DisTube instance + options + plugins
    queue-events.ts         all distube event handlers in one file, incl. leave-on-empty/finish
    intro.ts                welcome audio: per-guild once-per-session flag, non-blocking
    now-playing.ts          embed + buttons, edited in place, one message per guild
  guild-settings/
    store.ts                typed load/save of data/guilds.json, atomic write (temp + rename)
  messages/
    en.ts                   template functions
```

No play-song wrapper file: `route-message.ts` calls `player.play` directly and maps errors there. No URL-cleaning module unless phase 0 proves distube needs it (see below). No junk-drawer folders (`utils/`, `helpers/`). A file must justify its existence: a one-expression function with one caller lives in the caller. Relative imports only; the `package.json` `imports` map is deleted in phase 5, once the last `#features/*` file is gone.

## Phases

Each phase is its own commit on branch `tsu/refactor`: `type: short description`, one line, no body (phase 0 may carry one line naming the pinned SHA). Present the commit plan to the user before committing; never commit without approval.

Gates are labeled **[agent]** (must pass locally before the phase is done) or **[user]** (manual Discord acceptance for the branch, listed here so it is not forgotten).

### Phase 0 — baseline [agent + user]

- Install ffmpeg on the machine (system package, not npm).
- Pin `@distube/ytdl-core` to a commit SHA (currently a stranger's `master`). Record the SHA.
- Probe whether `clean-url.js` earns its existence: build a matrix of raw URLs (`youtu.be/<id>`, `watch?v=<id>`, `watch?v=<id>&list=<id>`, `playlist?list=<id>`, shorts URL) and run the YouTube plugin's `resolve()` against each — directly, no Discord client needed. If distube resolves all of them, `clean-url.js` dies in phase 1. If some forms fail, keep only those forms' normalization, as `music/clean-url.ts`, and note which.
- **Probe outcome (2026-08-17): `clean-url.js` dies.** All 7 URL forms pass the plugin's `validate()`; every video form (youtu.be, watch, shorts, tracking params, www-less) resolves directly, verified against official `@distube/ytdl-core@4.16.12` (the fork was removed — see below). Every rewrite clean-url performs produces input the plugin already accepts. Playlist *resolution* reliability is a ytpl/YouTube concern clean-url never influenced (it passes playlist URLs through unchanged). Do not re-litigate.
- Probe also found: **video search works; playlist-type search returns empty** (ytsr parses video results only on this version). Playlist-by-URL resolution was not verifiable against a confirmed-real playlist id — the phase-0 user gate must include one known-good playlist URL before phase 6 leans on it.
- **No ytdl-core fork.** The `ToddyTheNoobDud/ytdl-core-stuff` git dependency's entire delta over official `@distube/ytdl-core` is one line: `playerClients` defaulting to `['ANDROID_VR', 'WEB_EMBEDDED', 'IOS', 'ANDROID', 'TV']`. The fork is deleted — and the official `@distube/ytdl-core@4.16.12` already ships that exact default in `applyPlayerClients`, so no override is needed. Do not re-add `ytdlOptions.playerClients`.
- Verify **[user]**: `node src/index.js` boots, plays one track, and plays one known-good playlist URL.

### Phase 1 — deletions [agent]

- Delete `stop-by-guild.js`, `find-intro-file.js`. Delete `clean-url.js` if the phase 0 matrix proved it unnecessary.
- Fold single-expression files into their only caller: `should-ignore-message.js`, `get-user-voice-channel.js`, `is-configuration-command.js`, `is-skip-command.js`, `discord/login.js`, `config/intents.js`, `music/events/on-finish.js`, `music/events/on-error.js`.
- Deps: remove `@distube/file`, remove the `typescript` peerDep (re-added as devDep in phase 2), pin the opus alias to a real version: `"@discordjs/opus": "npm:mediaplex@1.0.0"`. Do **not** rename it to plain `mediaplex`: `@discordjs/voice` discovers its opus encoder only by the names `@discordjs/opus` and `opusscript`, so a rename would silently fall back to the ancient opusscript.
- Remove Pi-era compromises: `--max-old-space-size=256` from both scripts, `'b:a': '48k'` from the distube ffmpeg args.
- Delete `package-lock.json` (stale npm history; `bun.lock` is the lockfile).
- Verify **[agent]**: `bun run lint` clean; `node src/index.js` boots; diff is net-negative.

### Phase 2 — TypeScript foundation [agent]

- Add devDeps: `typescript`, `@types/node`.
- Rewrite `tsconfig.json` for a Node 24 service: `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `module`/`moduleResolution` `nodenext`, `noEmit`, `skipLibCheck`, `target`/`lib` `esnext`. Remove the react `jsx` option and the unused `@/*` alias.
- Rename `index.js` to `src/index.ts`, move `client.js` to `src/discord/client.ts`, move `player.js` to `src/music/player.ts`; type all three, converting their own imports to relative paths. Fold `distube-config.js` into `music/player.ts` while moving it.
- Do **not** touch the `package.json` `imports` map yet: `#features/*` files still use it until phase 5. Bump `engines` to `>=24`.
- `lint` script: `eslint . && tsc --noEmit`.
- Update AGENTS.md: bun for install/lint/test, Node 24 runtime, ffmpeg prerequisite.
- Verify **[agent]**: `bun run lint` green; `node src/index.ts` boots.

### Phase 3 — per-guild settings [agent]

- `src/guild-settings/store.ts`: typed `data/guilds.json` keyed by guild id. Atomic write: temp file in same dir, rename over. Load once at boot, write through on change. The store takes its file path as a parameter so its round-trip test can use a temp dir.
- `DISCORD_TOKEN` from env; `index.ts` fails fast with a clear message if missing. With `app-config.js` gone and boot restructured here, `main().catch` in `index.ts` becomes the single fatal handler (bug 3).
- Message templates move to `src/messages/en.ts` as functions. Delete `src/features/config/*`, and update its remaining consumers to their new sources: `configure-text-channel.js`, `message-handler.js`, `play-music.js`, and the music event handlers read `CONFIG.MESSAGES.*` and `CONFIG.TEXT_CHANNEL_ID`; they switch to `en.ts` and the store. The typed store shape is what makes bug 1 impossible.
- Verify **[agent]**: store round-trip test green (temp dir), lint green. **[user]**: two guilds configured independently, both survive restart; no file on disk holds the token.

### Phase 4 — config command [agent]

- `parse-command.ts` + `discord/tests/parse-command.test.ts` land together: configure triggers only when the message is exactly bot mention + one channel mention and the author has Manage Channels (bug 2). Test the exact ambiguity cases: `@DJ skip #general` is a skip, not a config; `@DJ play that song from #general` is a query.
- Verify **[agent]**: `bun test` green for this file, lint green.

### Phase 5 — control surface and play flow [agent]

- `route-message.ts` replaces `setup-message-listener.js` and `message-handler.js`. Routing order: config command, `@DJ <word>` alias, bare text -> play query.
- Command aliases: `skip`, `pause`, `resume`, `queue`, `shuffle`, `clear`, `remove <n>`. Map onto the Queue methods in Verified facts. No queue -> empty-queue message, no phantom ✅ (bug 6).
- Play flow: `route-message.ts` calls `player.play` directly; all replies awaited or caught; intro failure never kills a play (bug 4).
- `intro.ts`: per-guild once-per-session flag (reset on boot), playback does not block the search (bug 5).
- `now-playing.ts`: embed with buttons (pause/resume, skip, shuffle, clear, queue), one message per guild, **edited in place** across tracks. `route-interaction.ts` handles the `InteractionCreate` button events.
- Delete the `package.json` `imports` map: this phase removes the last `#features/*` files.
- Verify **[agent]**: lint green. **[user]**: manual pass of every command and button; two guilds do not cross-contaminate; reconnect twice -> intro plays once.

### Phase 6 — features [agent + user] — DONE

- Idle/empty disconnect: on `Events.FINISH`, `voice.leave()` (implemented in `queue-events.ts`). Empty-channel detection: `leave-when-empty.ts`, a discord.js `VoiceStateUpdate` watcher using `isVoiceChannelEmpty` (distube 5 does not emit `Events.EMPTY`; see Verified facts).
- Queue view: embed paginated past 10, via `queue` command and queue button.
- Spotify: `@distube/spotify` added, `new SpotifyPlugin()` registered with the dual-package-hazard cast (Verified facts). README states metadata-from-Spotify/audio-from-YouTube.
- Verify **[agent]**: lint green. **[user]**: each feature exercised manually; no orphan voice connections after idle.

### Phase 7 — close out [agent + user]

- README rewrite: what the bot does, setup (ffmpeg, token env, invite link), how to configure and drive it, no claims the bot does not meet.
- `bun run lint` green.
- Dispatch `linus-critique` on the full diff, fix core flaws, before presenting the branch.
- Verify **[user]**: full walkthrough from a fresh clone: install, configure, play, all controls.

## Rules for implementing agents

- No comments unless the reason lives outside the code (spec quirk, external constraint, workaround for someone else's bug).
- Early returns, no nested conditionals.
- Names reveal intent; booleans are yes/no questions. Preserve library names when wrapping.
- One concern per function. Reuse what exists before writing new code; two functions differing only in a constant are one function with a parameter.
- Never leave commented-out code. Never write migration/fallback code for conditions not confirmed to occur.
- No new dependencies for what a few lines cover. Media processing is the exception: never hand-roll it.
- User-facing strings: sentence case, no jargon, English.
- Tests live in `tests/` beside the code they cover, named after the unit, run with `bun test`. Assertions state the domain, never the current implementation's output.
- In `.ts` files, relative import specifiers must carry the real on-disk extension (`.ts` for `.ts` files, `.js` for the `.js` tail). `tsc` will NOT catch a wrong specifier — under `nodenext` it silently remaps `.js` to `.ts`, and only Node at boot fails. Every phase's verify therefore includes `node src/index.ts`: since the ESM graph loads eagerly, a bad specifier anywhere in `src/` fails at boot with `ERR_MODULE_NOT_FOUND`.
