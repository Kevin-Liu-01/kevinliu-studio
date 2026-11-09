# Sound

The kit is r4/sound's: ElevenLabs effects and music, mastered there, shipped here as Opus (`.webm`) with AAC (`.m4a`)
for older Safari. `public/sound` holds only what the two page manifests name. The ElevenLabs key, the raw takes, the
ledger and the generation receipts stay in the rounds and never come here; the sync scans for key shapes.

## Policy

- Sound answers the visitor's own actions: a press, a hover, a tilt, a flip, adding or removing a card, tearing a pack,
  and the battle they start.
- On the home page nothing is fetched before the first gesture. The player unlocks audio on that gesture.
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
- Battle: round 5 (r4/play 42ff51c7, `SPEC.md` section 10) wires INTEGRATION.md section 3 in `shared/battle.js`: a
  dynamic import of `/sound/sound.js` with `manifest.battle.json`, the rail's speaker key (N) bound to the same saved
  choice, and every board moment and scene cue on the stage's own clock. The visitor started the battle with Play, so
  the page asks for the battle group and its mode's theme as it loads (`resumeAtLoad`, about 30 short files) and plays
  once the browser allows audio, after the first gesture on the page.
