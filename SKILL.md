---
name: kevinliu-studio
description: How to work in Kevin Liu's site repo (Astro 7, static). Read before any edit here. Cards, battle and sound come from the design rounds through pnpm sync; never edit the synced folders.
---

# Working in kevinliu-studio

1. Read `AGENTS.md` and the newest entries of `memory.md`.
2. Decide where the change belongs:
   - Card words, numbers, art, battle scenes or sound: in the design rounds, then `pnpm sync`.
   - A fix this site needs in round code: an anchored patch in `TRANSFORMS` (`scripts/sync.mjs`).
   - Pages, metadata, twins, styles: `src/`.
3. `pnpm build`. The guard must pass. Look at the pages you touched at 1440 and 390 wide.
4. Commit by explicit path. Append to `memory.md`.
