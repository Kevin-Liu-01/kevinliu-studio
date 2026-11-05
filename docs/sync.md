# Sync: how round material gets here

`pnpm sync` (scripts/sync.mjs) copies what the design rounds finished into this repo. The rounds folder
(`~/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`, or `ROUNDS=<dir>`) is read only. Nothing under the synced
folders is edited by hand: change the rounds, or change a rule or transform in `scripts/sync.mjs`, and sync again.

## Stages

| Stage | Source | Destination | What |
| --- | --- | --- | --- |
| cards | `r4/ex` | `public/ex`, `public/og`, `vendor/ex` | the card code and stylesheets, posters, grounds, pop-out cuts, logos, borders, front effects, frames, share images and loops; build-only data in `vendor/ex` |
| sound | `r4/sound` | `public/sound` | the player, the gallery boot, two manifests and exactly the Opus and AAC files they name (the kit's own `tools/ship.mjs` list) |
| battle | `r4/play`, `r3/battle`, `r3/cards` | `public/battle`, `vendor/battle` | the Mat and Arena page, its vendored engine bundle, trainer and figure art, maps, scene media and card pictures |

Each rule is an allow-list. Scratch folders (`.work`, `shots`, `study`, `src`, `takes` and others) are never listed.

## Transforms

The only edits are in `TRANSFORMS` in `scripts/sync.mjs`. Each patch names the exact text it attaches to and must match
exactly once, or the sync stops and says which anchor moved.

- `gallery.js`, `rituals.js`: the sound hooks from `r4/sound/INTEGRATION.md` section 2, and the lens address
  (`/cards/<id>` instead of a folder under `<base>`).
- `boot.gallery.js`: the gallery's music loop is left out (docs/sound.md).
- `battle/shared/battle.js`: Arena by path without a trailing slash, and Leave returns to `/`.
- `battle/vendor/broadcast/media.js`: the rounds' gate notes are emptied (the page never shows them).

## The scan

Every synced file is scanned. Text files fail on franchise names, the OMMC participant routes, the ElevenLabs header
and API-key shapes, and on General Translation anywhere except the Atlas card's records. Images fail on EXIF GPS.

## The lock

`sync.lock.json` records the rounds' git head, the time, and each file's source path, sha-256 and size. `pnpm sync
--check` exits 1 when any synced file differs from the rounds, so CI or a person can see the repo is behind.

## When a round finishes

1. `pnpm sync`, read the summary and the problems list.
2. `pnpm build` (the guard runs after it).
3. Look at the changed pages, then commit `sync.lock.json` with the files.
