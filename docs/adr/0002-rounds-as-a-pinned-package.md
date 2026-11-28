# 0002: the rounds ship as a checked package, synced by tag with no JS transforms

2026-11-28. Proposed; applies after the battle-026 session syncs (it owns `r4/play`, `r4/ex` and the site's synced
copies until then). Audit mechanism 12 (`~/k7-rescue/practice-audit/PLAN.md`).

## Context

`scripts/sync.mjs` copies the rounds into `public/` and `vendor/` by allow-list from a hand-edited commit per stage
(`PIN`), then applies about 113 anchored text patches (`TRANSFORMS`, and `PHONE` in `scripts/phone-memory.mjs`). The
2026-11-28 map classified them:

- About 95 are fixes that belong in the round code: all 15 `sound.js` pairs, about 20 of `gallery.js`'s 29 (13 of them
  the sound hooks `r4/sound/INTEGRATION.md` section 2 specifies and the rounds never merged), 13 of `rituals.js`'s, 8
  of `battle.js`'s, the CSS pairs, the two `kit.js` pairs anchored on minifier names (`O2`, `Ml`, `_2`), all 8 `PHONE`
  pairs, the binary paint-outs and the two dropped captures. Six site requests in `r4/sound/REQUESTS.md` never landed.
- About 16 are site adaptations that need a hook in the round code: the lens address template, the Machine-view gate,
  the battle's mount bases (`/ex/`, the arena path, Leave's target), the gallery's music opt-out, `NOLINK`, the frost
  fallback, the card head list.
- One is obsolete: the `battle.js` `TITLES` pair, which the existing `BATTLE_STRINGS` `title.mat` and `title.arena`
  hook covers.

There are three patch engines (`sync.mjs` `patch`, `phone-memory.mjs` `patch`, `battle.ts` `swap`). The rounds'
`r4/play/tools/anchors-check.mjs` evaluates this site's `sync.mjs` with `new Function` to check its anchors. The rounds
have no `package.json`, no tags and no lint, type check or tests on the shipped code. Every file in `sync.lock.json` is
tracked at its stage's pin (cards 1091 of 1091, sound 1098, battle 997), so the working-tree export, `--admit-unpinned`
and the unpinned path are dead.

## Decision

1. **The rounds publish; the site consumes.** Each lane (`r4/ex`, `r4/play`, `r4/sound`) gets a `package.json` with
   `files` and an `exports` map, and a release script (`r4/release.mjs`) that runs the lane's checks (lint, a type
   check of the shipped modules with `checkJs`, the content scan, the hook contract tests), writes `dist/` and
   `manifest.json` (path, sha-256, bytes, role `runtime` or `build`), and cuts a tag `ex-vN`, `play-vN`, `sound-vN`
   only when they pass.
2. **Config, not patches.** The round code reads what differs per host from one object the page sets before it loads
   (`window.ROUND_HOST`: the lens URL template, the card-code base, the arena path, Leave's target, the music opt-out,
   the Machine-view gate, the private-repo list) and the strings it prints through the string table the battle already
   has (`override()`), extended to the wall. The rounds' own pages set the same object with their defaults.
3. **Sync by tag.** `pnpm sync` becomes: read each lane's tag from `rounds.json` (the only pin), `git archive <tag>`
   its `dist/`, verify every file against `manifest.json`, run the content scan, write. The lock becomes
   `{ lane: { tag, manifest sha } }`. `TRANSFORMS`, `PHONE`, `BINARY`, the allow-lists, `pageFiles`, the blob compare,
   `--admit-unpinned`, the export runbook and `phone-memory.mjs` are deleted. `ROUNDS_GIT` comes from the environment.
4. **Gates.** Moving a tag is a pull request that runs `pnpm build` (the site's one gate, ADR 0001) and the throttled
   phone first-paint check against a Vercel preview. The byte budgets (`scripts/budgets.json`) stay in the build.

## Migration (each step its own commit, each leaving the site shippable)

1. Now, site only: delete the dead unpinned path; read files from git at the pin (`git ls-tree`, `git cat-file
   --batch`); delete the four dead `vendor/ex` names; write the card head as `head.json` instead of regexing
   `vendor/ex/index.html` back in `cards.ts`. Output bytes are identical; `pnpm sync --check` shows no diff.
2. After battle-026 syncs: the rounds take the obsolete and the bug-fix patches (sound first: 15 pairs, then the wall's
   sound hooks, then the battle's), one lane at a time; each release moves that lane's pin and deletes its pairs here.
3. The rounds add `ROUND_HOST` and the wall's string table; the site sets them in `Base.astro` and `BattlePage.astro`
   and deletes the adaptation pairs, `i18n-room.ts`'s 37 reverse-matching label rules and its runtime history patch.
4. The rounds add `package.json`, `release.mjs` and the manifest; the site switches the sync to tags and deletes the
   remaining machinery. The rounds' `anchors-check.mjs` is deleted with the patches it checked.

## Rejected

- A `pnpm` `file:` tarball dependency: it puts 40 MB of media through the package manager on every install and buys
  nothing a manifest does not, while there is one consumer.
- Keeping the patches as data (`patches.json`) as the end state: it removes the `new Function` coupling but keeps the
  fork; it is worth doing only if step 2 stalls.
- A byte-identical verify of the rounds' build (rejected by the 11-26 audit's critic): the manifest's hashes are the
  check.
