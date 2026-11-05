# Sound

The kit is r4/sound's: ElevenLabs effects and music, mastered there, shipped here as Opus (`.webm`) with AAC (`.m4a`)
for older Safari. `public/sound` holds only what the two page manifests name. The ElevenLabs key, the raw takes, the
ledger and the generation receipts stay in the rounds and never come here; the sync scans for key shapes.

## Policy

- Sound answers the visitor's own actions: a press, a hover, a tilt, a flip, adding or removing a card, tearing a pack,
  and the battle they start.
- Nothing is fetched before the first gesture. The player unlocks audio on that gesture.
- Under `prefers-reduced-motion` sound defaults to off. A saved choice (`localStorage['kevin-liu-studio:sound']`)
  always wins and syncs across tabs. The header's speaker button toggles it.
- The gallery's music loop (`mus.gallery`) is not played: reading the wall makes no sound of its own. This is a
  reversible decision. To restore it, delete the `boot.gallery.js` transform in `scripts/sync.mjs`.

## Where it is wired

- Home: `/sound/boot.gallery.js` (module, before `gallery.js`) sets `globalThis.Sound` and binds `#sound`.
  `gallery.js` and `rituals.js` carry the hooks from r4/sound `INTEGRATION.md` section 2, applied by the sync as
  anchored patches. Each call goes through `globalThis.Sound?.`, so a page whose sound fails behaves as before.
- Battle: INTEGRATION.md sections 3 and 4 are wired by the battle-r4b run in r4/play and r3/battle. Until that run's
  re-vendor lands and is synced, the battle plays silent.
