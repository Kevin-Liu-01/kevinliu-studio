# Sync: how round material gets here

`pnpm sync` (scripts/sync.mjs) copies what the design rounds finished into this repo. The rounds folder
(`~/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`, or `ROUNDS=<dir>`) is read only. Nothing under the synced
folders is edited by hand: change the rounds, or change a rule or transform in `scripts/sync.mjs`, and sync again.

## Stages

| Stage | Source | Destination | What |
| --- | --- | --- | --- |
| cards | `r4/ex` | `public/ex`, `public/og`, `vendor/ex` | the card code and stylesheets, posters, grounds, pop-out cuts, logos, borders, front effects, frames, share images and loops; build-only data in `vendor/ex` |
| sound | `r4/sound` | `public/sound` | the player, the gallery boot, two manifests and exactly the Opus and AAC files they name (the kit's own `tools/ship.mjs` list) |
| battle | `r4/play`, `r3/battle`, `r3/cards` | `public/battle`, `vendor/battle` | the Mat and Arena page, its vendored kit, trainer and figure art, maps, move previews, scene media and card pictures; the engine bundle (build-only, the roster) |

The cards stage also ships the round page's closure (`pageFiles` in `scripts/sync.mjs`): every sheet and script
`r4/ex/index.html` loads, the two modules `markup.js` requires beside itself at build (`design/card.js`,
`design/plan.gen.js`), and every picture, clip or font those files or the round's printed pages name (a sheet's names
resolve against the sheet). The head itself goes to `vendor/ex/index.html`, and `src/lib/cards.ts` loads exactly that
list, so a file the round adds to its page ships and loads with no new rule. Before 11-07 the sync named files one by
one, missed `design/card.js`, `design/plan.gen.js`, `printings.js`, the frames and `styles/breakout`, and the wall
quietly printed `markup.js`'s plain fallback; the release guard now fails a card without its family (`data-fam`) and a
Breakout card without `breakout.css`.

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

The only edits are in `TRANSFORMS` in `scripts/sync.mjs` and `PHONE` in `scripts/phone-memory.mjs` (applied after
`TRANSFORMS`). Each patch names the exact text it attaches to and must match exactly once, or the sync stops and says
which anchor moved. A patch whose file no rule shipped also stops the sync: a file the rounds renamed never loses its
patch quietly. `node scripts/phone-memory.mjs` on its own patches every file in memory before it writes any.

- `gallery.js`, `rituals.js`: the sound hooks from `r4/sound/INTEGRATION.md` section 2, and the lens address
  (`/cards/<id>` instead of a folder under `<base>`).
- `gallery.js`, `ex/markup.js`: Play's P key acts only from the dock, messages sent together are spoken as one line, the rival's side is a group whose wells name their cards, and the card that takes focus back from the lens scrolls into view.
- `gallery.js`: Pause is saved only when pressed (reduced motion is not the visitor's choice), a lens always steps back out of its own history entry, a card's history entry opens nothing in the Machine view, and the tab carries the card page's title while the lens holds its address.
- `boot.gallery.js`: the gallery's music loop is left out (docs/sound.md).
- `sound.js`: a cue played before the first gesture neither counts as one nor fetches the kit, and a cue or fanfare asked for before the context is unlocked fetches nothing (docs/sound.md).
- `battle/shared/battle.js`: Arena by path without a trailing slash, and Leave returns to `/`.
- `battle/shared/battle.js`: the layout switch keeps this site's page titles.
- `battle/shared/battle.js`, `battle/arena/board.js`: a bad address keeps its reason on screen, retries without its log, checks `mode=` and `map=` as own keys, and a start that rejects un-hides the page.
- `battle/shared/excard.js`: the battle prints the wall's card from `/ex/` (the rounds' `../../../r4/ex/`), and a phone
  prints it plain, as the wall does. `src/lib/battle.ts` maps the page's own `../../../r4/ex/` sheet and scripts to
  `/ex/` by content address; the cards stage ships `face.gen.js` and the icon set to `public/ex` for it.
- `battle/mat/mat.css`, `battle/arena/arena.css`: the wordmark h1 is visually hidden on phones, not removed.
- `battle/mat/mat.css`, `battle/arena/arena.css`: a key transitions only its press (`transform`); its raise and colour
  change at once.
- `battle/arena/arena.css`: under 360 px the rail's column holds the rail's width and the team pips tighten, so Leave
  stays on screen at 320 px.
- `battle/shared/hud.css`: under 360 px round 5's rail keys and gaps tighten, so Leave ends 8 px in at 320 px.
- `battle/vendor/broadcast/media.js`: the rounds' gate notes are emptied (the page never shows them), the Elo and
  Turboslide cards use the captures that replace the dropped ones, and the Prototemplate loop points at the clip that
  exists.
- `ex/markup.js`: the lens's Visit link carries no placeholder `#`, which `<base>` would turn into `/ex/`.
- `ex/card.css`: the frosted slips' inline 1x tile (a 30 KB data URL, the fallback of `--frost`) is left out; every page sets `--frost` itself (`ui.css`, and `BattlePage.astro` for the battle).
- `rituals.js` also resolves the battle page's stylesheets against that page's own `<base>`, and plays the pack reveal
  for a reduced-motion pack.
- `PHONE` (`scripts/phone-memory.mjs`, docs/performance.md, Memory): `ex/ground.js` caps the shared canvas at 2048 and
  the density at 1.5 on a touch screen or a small-memory device, and gives an off-screen card's canvases back;
  `ex/rituals.js` cuts the next pack at the press there instead of holding it rastered; `ex/gallery.js` adds no prerender of the battle there, and `ex/rituals.js` reads only the battle's acceptance at idle and builds the opening cast at the press; `battle/vendor/broadcast/kit.js`
  lets each preloaded clip drop its source once its first frame loads. When the rounds are not at hand,
  `ex/rituals.js` cuts the next pack at the press there instead of holding it rastered; `battle/vendor/broadcast/kit.js`
  lets each preloaded clip drop its source once its first frame loads; `battle/shared/runtime.js` keeps two shader worlds on a phone and drops each warm-up Blob; `battle/shared/battle.js` pauses the card prints at the result and under the Log. When the rounds are not at hand,
  `node scripts/phone-memory.mjs` applies them to the synced files in place (only to bytes `sync.lock.json` records)
  and updates the lock; the release guard fails a build whose files lack them.
- Binary (`BINARY`): the two Elo API captures have their Lifecycle paragraph, which names General Translation's email
  domain, painted out.

## The scan

Every synced file is scanned. Text files fail on franchise names, the OMMC participant routes, the ElevenLabs header
and API-key shapes, and on General Translation anywhere except the Atlas card's records. Images, video and audio fail on location metadata
(`scripts/location.mjs`: GPS in EXIF for JPEG, AVIF, WebP and PNG, GPS in XMP, and the MP4 and QuickTime location
atoms). The rules live in `scripts/rules.mjs`, and the release guard reads `dist` with the same function
(`scanBuffer`), so the two cannot drift. Names are matched on a normalized text: entities and escapes decoded,
accents off, and every run of spaces, hyphens and underscores read as one space. Each file's path is read too.
`pnpm test` runs the rules' tests (`scripts/rules.test.mjs`).

## Pins

Each stage ships the rounds as they were at one commit (`PIN` in `scripts/sync.mjs`): today cards and sound at
30e69931 (the 11-07 release's Breakout final) and the battle at 42ff51c7 (round 5 with its sound). Every shipped file
git tracks is compared with its stage's pin, and a file that differs stops the sync, so a plain `pnpm sync` never ships
round work after the cutoff. A shipped file the pin does not have (the 78 frame SVGs under `r4/ex/design/{lit,fxcut}`
were generated and committed only after 30e69931) ships only with the bytes the last lock recorded; a new or changed
one stops the sync until it has been looked at and admitted with `--admit-unpinned`. A release moves a pin in the same
commit as the files it brings.

The working tree usually has moved past the pins, so a release syncs from an export: `git archive <pin>` of each
stage's folders plus the git-ignored frame SVGs, then `ROUNDS=<export> pnpm sync`. The pins are read from the rounds'
own checkout either way.

## The lock

`sync.lock.json` records the rounds' checkout (`rounds`), the pinned commits (`head`, and `pins` by stage), the time,
and each file's source path, sha-256 and size. It is rewritten only when a file or a pin changed, so a rerun with
nothing new leaves no diff. `pnpm sync --check` exits 1 when any synced file differs from the rounds and names each one,
so CI or a person can see the repo is behind and why.

`node scripts/lock-check.mjs` needs no rounds folder: it fails when a synced file differs from the lock, is
missing, or is not in the lock at all (a hand edit, a stray file, a `.tmp` a stopped sync left). `pnpm build` runs
it first, so the host and CI enforce that the synced folders change only through `pnpm sync`.

## When a round finishes

1. Move the stage's pin to the round's commit, then `pnpm sync` (or `ROUNDS=<export> pnpm sync`), and read the summary
   and the problems list.
2. `pnpm build` (the guard runs after it).
3. Look at the changed pages, then commit `sync.lock.json` with the files.
