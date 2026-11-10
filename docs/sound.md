# Sound

The kit is r4/sound's: ElevenLabs effects and music, mastered there, shipped here as Opus (`.webm`) with AAC (`.m4a`)
for older Safari. `public/sound` holds only what the two page manifests name. The ElevenLabs key, the raw takes, the
ledger and the generation receipts stay in the rounds and never come here; the sync scans for key shapes.

## Policy

- Sound answers the visitor's own actions: a press, a hover, a tilt, a flip, adding or removing a card, tearing a pack,
  and the battle they start.
- Nothing but the player and its manifest is fetched before the first gesture. The player unlocks audio on that gesture.
- The home page makes one silent `AudioContext` at idle after load and closes it at once (`src/pages/index.astro`,
  only when sound would be on). A browser's first context waits on its audio service starting, which took 4.7 s inside
  the first press on a busy machine (2026-11-05); started at idle, the press makes its own context in about 1 ms.
  Nothing plays and nothing is fetched.
- Under `prefers-reduced-motion` sound defaults to off. A saved choice (`localStorage['kevin-liu-studio:sound']`)
  always wins and syncs across tabs. The header's speaker button toggles it.
- The gallery's music loop (`mus.gallery`) is not played: reading the wall makes no sound of its own. This is a
  reversible decision. To restore it, delete the `boot.gallery.js` transform in `scripts/sync.mjs`.

## Where it is wired

- Home: `/sound/boot.gallery.js` (module, before `gallery.js`) sets `globalThis.Sound` and binds `#sound`.
  `gallery.js` and `rituals.js` carry the hooks from r4/sound `INTEGRATION.md` section 2, applied by the sync as
  anchored patches. Each call goes through `globalThis.Sound?.`, so a page whose sound fails behaves as before.
- A card page (`/cards/<id>`, in every language): the header's speaker key is there too, and a press on the card
  plays `card.lift` and that card's `sig.<id>.lift`. Nothing under `/sound/` is fetched before the visitor's first
  press of the card (or of the key, turning sound on): the page's inline script (`src/views/Card.astro`) then
  imports the player by its content address with `manifest.gallery.json` and the card's own `sig:<id>` group, and
  sets `globalThis.Sound` as the home page does. It does not use `bindToggle`, which would load the gallery's whole
  kit. In the Machine view the card is not shown, so only the key works.
- Battle: round 5 (r4/play 42ff51c7, `SPEC.md` section 10) wires INTEGRATION.md section 3 in `shared/battle.js`: a
  dynamic import of `/sound/sound.js` with `manifest.battle.json`, the rail's speaker key (N) bound to the same saved
  choice, and every board moment and scene cue on the stage's own clock. It fetches the player and the manifest at load
  (`resumeAtLoad`) and the sounds at the first gesture on the page, or at load where the browser already lets the page
  play. A sync transform keeps that promise: `sound.js`'s `unlock()` treated a cue played before any gesture as one and
  fetched every wanted group, about 240 files and 2.3 MB, while every such cue was dropped. A second transform makes a cue asked for while the context is not yet unlocked return without fetching its file (the deal and the leads' entrances fetched 10 files with no gesture).
