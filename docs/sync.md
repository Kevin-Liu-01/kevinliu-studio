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

Each rule is an allow-list. Scratch folders (`.work`, `shots`, `study`, `src`, `takes` and others) are never listed. A
missing source folder, a rule that matches nothing, or a named file the round no longer has is a problem, not a quiet
skip.

Two round captures stay behind (`DROP`): the Elo sign-in screen, whose email placeholder names General Translation, and
the Turboslide hero, whose slide prints a photographer's credit. The battle's media manifest points those two cards at
other captures from the same projects.

## Read first, write last

The sync reads, transforms and scans every file before it writes any. When any problem is found, nothing is written or
removed and it exits 1. Only files listed in the previous `sync.lock.json` are ever removed, so a file the sync never
wrote is never touched.

## Transforms

The only edits are in `TRANSFORMS` in `scripts/sync.mjs`. Each patch names the exact text it attaches to and must match
exactly once, or the sync stops and says which anchor moved.

- `gallery.js`, `rituals.js`: the sound hooks from `r4/sound/INTEGRATION.md` section 2, and the lens address
  (`/cards/<id>` instead of a folder under `<base>`).
- `boot.gallery.js`: the gallery's music loop is left out (docs/sound.md).
- `battle/shared/battle.js`: Arena by path without a trailing slash, and Leave returns to `/`.
- `battle/shared/battle.js`: the layout switch keeps this site's page titles.
- `battle/mat/mat.css`, `battle/arena/arena.css`: the wordmark h1 is visually hidden on phones, not removed.
- `battle/vendor/broadcast/media.js`: the rounds' gate notes are emptied (the page never shows them), the Elo and
  Turboslide cards use the captures that replace the dropped ones, and the Prototemplate loop points at the clip that
  exists.
- `ex/markup.js`: the lens's Visit link carries no placeholder `#`, which `<base>` would turn into `/ex/`.
- `rituals.js` also resolves the battle page's stylesheets against that page's own `<base>`, and plays the pack reveal
  for a reduced-motion pack.
- Binary (`BINARY`): the two Elo API captures have their Lifecycle paragraph, which names General Translation's email
  domain, painted out.

## The scan

Every synced file is scanned. Text files fail on franchise names, the OMMC participant routes, the ElevenLabs header
and API-key shapes, and on General Translation anywhere except the Atlas card's records. Images, video and audio fail on location metadata
(`scripts/location.mjs`: GPS in EXIF for JPEG, AVIF, WebP and PNG, GPS in XMP, and the MP4 and QuickTime location
atoms). The release guard runs the same check on `dist`.

## The lock

`sync.lock.json` records the rounds' git head, the time, and each file's source path, sha-256 and size. It is rewritten
only when a file or the rounds' head changed, so a rerun with nothing new leaves no diff. `pnpm sync
--check` exits 1 when any synced file differs from the rounds, so CI or a person can see the repo is behind.

## When a round finishes

1. `pnpm sync`, read the summary and the problems list.
2. `pnpm build` (the guard runs after it).
3. Look at the changed pages, then commit `sync.lock.json` with the files.
