# Plan 026 result: three routes from 18 to 26 battle cards, measured

- Date: 2026-11-10
- Site commit read: `4025230` (branch `improve/direction`, worktree `~/repos/kevinliu-studio-dir`)
- Rounds HEAD read: `de54fad5` for the first pass; HEAD had moved to `9e6e0cbe` by the revision (one commit, `r4/ex/REQUESTS.md` only, nothing under `r3/battle` or `r4/play`). `r3/battle` held 572 uncommitted entries at the start and end of both passes.
- Revision 1, 2026-11-10: the first pass said the page's engine is `vendor/engine.js` and recommended rebuilding only that. That was wrong: the page's engine is inside `kit.js` (`window.showdown`). Route C is redefined below and the sections it changes are rewritten; measurements from the first pass that are still true are kept.
- Recommendation: Route C as redefined (a kit rebuilt from the committed tree with the 26-card engine, the eight on default scenes until their own scenes pass the page flash scan). Every route needs a rebuilt `kit.js`; no recorded page flash reading for the eight is a pass (the three next-a cards read 297 failures in 312 variants, next-b's fixed scenes still read 40 open rows, and the committed next-b scenes have no reading at all), so Route C is the only first kit that carries no scene with a failing or missing page reading for a staged card. Its first gate is the re-check of the 18 fielded cards, which a clean rebuild changes in 116 of 186 listed source files.
- Run in a browser by the lane's reviewer (section "Reviewer's browser run"): with that kit swapped into a copy of the site's build, a Mat battle between six staged cards plays to its result with no page error; in the Arena a staged card has no figure and the battle never leaves its entrance, so the Arena's figure manifest must carry the eight in the same step.

Terms, defined once. "Fielded": a card the engine holds, so it has a team slot and a Battle button. "Staged": the eight cards (Sandbox Arena, Ariadne, Sigil UI, 050525, Sevenfold, Podium, OMMC, Atlas) whose scenes are written but not registered. "The kit": `kit.js`, the bundle of engine, runtime, scene grammar and every scene. "The closer's check": `PORT=<p> node tools/check.mjs` in `r3/battle`. "Flash gate": the limit on bright full-frame flashes per second of a scene (5 block transitions a second). "Compiled gate": the part of `validate.mjs` that checks every scene variant's flash count from its timeline, without a browser. "Page flash scan": the browser-based version (`flashscan`), which renders each variant and reads real frames. They are different checks; the dry run passed the first, the open failures below are from the second.

## Ships unused today

Run in `~/repos/kevinliu-studio-dir` at `4025230` (the Step 1 command).

| Material for the eight | Measured |
| --- | --- |
| Sound cues in `public/sound/manifest.battle.json` | 6 cues each for all eight cards (48 in all) |
| Entries in `public/battle/vendor/broadcast/media.js` | 0 of 8 (command printed `in media.js: 0 in engine: 0`) |
| Entries in `vendor/battle/vendor/engine.js` | 0 of 8 |
| Arena figures, `public/battle/media/figures/<id>/` | 968 KB (`du -sk`) |
| Move footage, `public/battle/r3/media-moves/<id>/` | 9,332 KB |
| Worlds, `public/battle/r3/broadcast/media/<id>/` | 10,660 KB |
| Move previews, `public/battle/previews/` | 144 files (72 `.webm` plus 72 `.webp`) for 18 cards; none for the eight |

What `vendor/engine.js` is for (corrected): it is build-only on the site (`scripts/sync.mjs:98-100` copies it to `vendor/battle/vendor/engine.js`). `src/lib/cards.ts:152` reads the roster from it, `cards.ts:185-186` returns no team for a card it lacks, and `src/views/Home.astro:58` writes `<meta name="battle-roster">` from that data. So a rebuilt `engine.js` alone opens the dock and the Battle buttons for the eight on the site. The battle page itself does not load `engine.js`: `vendor/battle/mat/index.html` loads `../vendor/broadcast/media.js` and `../vendor/broadcast/kit.js`, `public/battle/shared/battle.js:24-25` reads `window.bcKit` and `window.showdown` (both set by the kit), `public/battle/vendor/` holds only `broadcast`, `cards` and `fonts`, and `r4/play/vendor/SOURCES.md:42-46` says `kit.js` bundles the battle's engine. In the site's `public/battle/vendor/broadcast/kit.js` the string `"katagami"` occurs 12 times and `"ommc"` 0 times (counted). So `engine.js` alone would show Battle buttons for teams the page's own 18-fighter engine refuses. `engine.js` must be rebuilt together with the kit so the two rosters agree. `docs/battle.md:23` is the sentence to rewrite after any route lands.

Correction to the plan's premise, measured: the eight cards' `plate.json` files carry `groundImage` (a `.webp`) and no `groundSource`, so none of the eight brings a shader (WebGL) world. The 12 cards with shader worlds are all among the 18 already fielded: turboslide, glyphfield, katagami, claude-of-tanks, agent-pets, prototemplate, bday-land, powerlifting, elo, cotfly, princeton-td, kevin-wiki (read from `public/battle/vendor/broadcast/media.js` with the file's own loader). The 10.7 MB of "worlds" for the eight is images and loop clips.

## Route A: the committed battle plus the six registration steps, battle-r4b's work parked

What the notes say (forms read: the tracked text in my export, and `git diff` of the working tree). battle-r4b's uncommitted edits changed three of the quoted notes: `broadcast/scenes/next/README.md` (31 lines: next-b's table rows for Podium and Atlas, and a new "Flash choices" paragraph), `.work/next-harness/MERGE.md` (48 lines: Podium's knockout frame and Atlas's ending in the table, plus a new section "next-b's open items at hand-off", lines 256 on) and `.work/next-harness/merge-dry/RUN.md` (6 lines: the dry run's date moved from 2026-11-05 to 2026-11-06 and its landing and ending tallies). The six registration steps themselves (`scenes/next/README.md:25-39`) are the same in both forms. The dry run's headline numbers quoted below are from the working-tree RUN.md.

The registration list from `.work/next-harness/MERGE.md` ("Registration, step by step", line 64 on), one line each:

1. Roster and hooks: adopt r4/ex's `roster/battle-roster.json` in `tools/build-data.mjs`; add the eight trait names to `TraitName` and `TRAITS`.
2. Move the scenes up: `mv broadcast/scenes/next/*.ts broadcast/scenes/`, unedited.
3. Unstage: remove the eight from `data/next.json`; hand the crews' file globs in OWNERS.md to the cards' owners.
4. Data and plates: `node tools/build-data.mjs`, then `broadcast/tools/media.py` (one added line so it takes each of the eight's own `plate.json`), then `node broadcast/tools/thumbs.mjs` for the 32 new moves' thumbnails.
5. The per-card tables `ACCENT` (`broadcast/src/env.ts`) and `MATERIAL` (`broadcast/src/card.ts`) name the 18; add the eight, in one cold rescan with step 1.
6. Build and check: `node tools/build.mjs && node broadcast/tools/build.mjs && node broadcast/tools/validate.mjs` (must print 104/104, 26/26, 26/26), then `PORT=<p> node tools/check.mjs`, then the harness's full-roster battles.
7. Play lane: re-vendor into r4/play, move the eight figures from the figure manifest's `next` key into its list, add the eight to the Arena roster, rerun PLAY MODES section 8.

What I ran, in the export (`~/k7-rescue/improve-audit/spike-026`, committed files only; logs in `~/k7-rescue/improve-audit/lane-d/`):

- The untouched export's validator first failed to bundle: `broadcast/src/card.ts:13` and `:15` import `../../../cards/markup.js` and `art.js`, which sit in `r3/cards`, a tracked folder the plan's export list lacked. I added `r3/cards` to the archive once (the plan's allowed single addition). After that the committed 18-card baseline ended `0 problems` (`own scene: moves 72/72, traits 18/18, entrances 18/18`; `117 definitions, 108 scene files`).
- Steps 2 and 3 in the export: `mv broadcast/scenes/next/*.ts broadcast/scenes/` moved 56 files; `data/next.json` set to `"cards": []`. Then `node broadcast/tools/validate.mjs`. Its whole output (8 lines; the plan asked for the last 12, there are only 8):

```
landings: 8 attacks on the one spot; cards with more than one there: jarhead 2
edges: 0 scene definitions light something in their first or last 250 ms besides their way in and out (0 of them the page's own minor scenes, which fail); EDGES=list prints them, EDGES=strict fails them
117 definitions, 108 scene files
own scene: moves 72/72, traits 18/18, entrances 18/18
5360 compiled variants (every outcome, both sides, 1 to 5 hits) inside the flash gate
endings over the 72 moves (support: no target): support 16, inside 8, close 8, split 6, top 5, shoulder 5, versus 5, pip 3, own 3, whip 3, crash 3, claim 3, iris 2, invert 1, drop 1
grammar defaults by discipline: Agent pip/whip/split; Data split/crash/pip; Game crash/drop/whip; Interface iris/pip/split; Type drop/iris; Shader invert/iris; Infra whip/crash; Neutral pip
0 problems
```

  It reports no problem, which is not good news: it still counts `108 scene files` after 56 were moved up, because the validator reads the generated scene index (`scenes/index.gen.ts`), which only `broadcast/tools/build.mjs` rewrites (`broadcast/tools/build.mjs:3-6`). The moved files were invisible to it.
- Not in the plan, added to measure further: `node broadcast/tools/build.mjs` in the export (exit 0; `scenes: 156`, `card: ... 18 cards from ../cards`, `broadcast.js 70 KB`), then validate again: `165 definitions, 156 scene files`, but still `moves 72/72, traits 18/18, entrances 18/18`, `0 problems`. With all 156 scene files indexed, the validator still checks only the engine's 18 fighters, so the eight's scenes are not counted until the engine holds them.
- Also not in the plan: I copied the dry run's three changed engine files (`roster.gen.ts`, `traits.ts`, `types.ts` from `.work/next-harness/merge-dry/r3/battle/engine/src/`) into the export, rebuilt, and validated. Result, the mechanical part of Route A on committed scene files:

```
165 definitions, 156 scene files
own scene: moves 104/104, traits 26/26, entrances 26/26
7728 compiled variants (every outcome, both sides, 1 to 5 hits) inside the flash gate
0 problems
```

  So what Route A still needs is the engine change (step 1), and that part is available as the dry run's files. The compiled gate passes on the committed scenes. This does not show that the page flash scan passes (see Route B).

Engine diff, committed engine against the dry run's (`diff -ru ... | diffstat`, read-only on the rounds):

```
 roster.gen.ts | 4407 ++++++++++++++++++++++++++++++++++------------------------
 traits.ts     |    9 
 types.ts      |    3 
 3 files changed, 2623 insertions(+), 1796 deletions(-)
```

`roster.gen.ts` is generated (26 fighters instead of 18). The real hand-written change is 9 lines in `traits.ts` (dry-run `traits.ts:88-96`) and 2 added and 1 removed lines in `types.ts` (the `TraitName` union). Four hooks the dry run registered "as empty entries" (`merge-dry/RUN.md:4`; `traits.ts:93-96`: `'Fresh Sandbox': {}`, `'Exactly Once': {}`, `'Fused Rank': {}`, `'Zero Idle Time': {}`) are unbuilt work: Fresh Sandbox (clears a status at the end of a turn), Exactly Once (a multi-hit move into Ariadne lands one hit), Fused Rank (a resisted hit lifted to 1x) and Zero Idle Time (a miss lands half the damage). Their event shapes are written in `.work/next-harness/MERGE.md` (for example "Fused Rank" and "Zero Idle Time" sections) but nothing is implemented in `engine.ts`. The other four traits (Validated, Any Spelling, Top Teams Advance, Two-Page Spread) reuse existing hooks and are in the dry run's 9 lines.

The card adapter. `.work/next-harness/MERGE.md:54-62` ("The card adapter") says the round-3 card's `art.js` has a `FRAME` for the 18 only and the merge's swap to r4/ex's card "replaces all of it". `r4/play/vendor/SOURCES.md:16-24` says that swap already happened in round 5: the page prints r4/ex's card through `shared/excard.js`, and "Only `art.js`, `card-env.gen.js` and `card-sprite.gen.js` remain in `vendor/cards/` (the kit's bundle reads them)". What the kit still needs for the eight, from the files themselves: `r4/play/vendor/cards/art.js:26-45` holds `FRAME` with 18 entries and none of the eight (so `subjectOf` at `art.js:67` falls back to `FRAME[id] || {}`: no frame for them); `card-env.gen.js` holds `recipes`, `bands` and `media`, 18 entries each, none of the eight, and is generated by `r4/play/.work/mat/build.mjs` (its line 1); `card-sprite.gen.js` is generated from `vendor/cards/icons.svg` (its line 1) and names no card, so it needs no per-card entry. Also, the export's `broadcast/src/card.ts` build line reads `18 cards from ../cards` (`r3/cards` only has the 18). So for the eight the kit still needs: eight `FRAME` rows, eight rows in each of the three `card-env` tables, and the `ACCENT` and `MATERIAL` rows of step 5; until then the eight take defaults (MERGE.md step 5 says `palette[2]` and dots).

What Route A drops: everything under "battle-r4b, left in place" in `r4/play/REQUESTS.md:13-34`:
- Worlds lane (Princeton TD, Katagami, Agent Pets): "finished, and its critic passed (9 `scene.mjs` checks, 213 fresh flash readings, 0 failures)"; its scene code (Katagami axis cap removed, knockout frames for the three cards) is "among the 48 modified files in `r3/battle/broadcast/scenes/`" and "reaches the page only with a kit rebuild" (`REQUESTS.md:19-23`).
- Mixed lane: "tests 169/169, but its critic read 6 to 7 on the battle flash gate (limit 5); open" (`:24`).
- Next-b lane: its critic "logged flash failures on atlas, ommc and podium entrances"; open (`:25-26`).
- Closer: credit band, result sheet, top bar over knockout frames, phone timecode, `dropVersus`, `CHUNK_DEPS` modulepreload, fonts; tools (`serve.py`, `flashscan.mjs`, `page.mjs`, `lib.mjs`, `deps.mjs`, `site.mjs`); a rebuilt `broadcast.js` with 211 new and 289 removed chunks; its full check "never finished" (`:27-30`).
- Requests above that section addressed to "closer" are unanswered (`:31`).
- The 24 next-b scene files with the flash fixes. Of the 70 modified files, 25 are in `broadcast/scenes/next/` (24 scene files, six each for Atlas, OMMC, Podium and Sevenfold, plus the README). The export holds the older committed copies, so Route A would register next-b scenes without the fixes in the working tree.

Machine time: Route A as I ran it took minutes (validate, build). I did not time them. Step 6's `tools/check.mjs` is also Route A's gate; its cost is in Route B below.

## Route B: keep the salvage, finish the closer's check, then register

Status counts, `git -C <rounds> status --short -- r3/battle | awk '{print $1}' | sort | uniq -c` (run before and after; the same):

```
 213 ??
 289 D
  70 M
```

572 entries. The 289 deletions and 211 untracked entries under `broadcast/chunks/` are the rebuilt scene chunks; the other 70 modified files include 48 in `broadcast/scenes/` (25 of them in `scenes/next/`), none in `engine/` or `runtime/` (0 of 572 entries match `engine/` or `runtime/`).

What the notes record, copied. `r3/battle/.work/battle-r4/closer/NOTES.md:32-33`:

```
12:40 check restarted with POOL=8 (rate at POOL=5: 4.7 variants a minute at load ~100)
13:06 bottleneck: my Chromium's one GPU process at ~80% CPU (software raster for every page); the 8 renderers near idle, so POOL 8 did not raise the rate (2.7 to 4.7 a minute at load 100 to 360)
```

The "Next" list (`NOTES.md:19-22`): 1. targeted gate over the old failing scenes under the new core, fix each; 2. full `check.mjs` (cold for the rest); 3. perf, view-transition, layout-shift `--full`, frame recordings, sheets. The file has 33 lines and ends at the 13:06 line, so the check never finished.

Duration, from the plan's figure of 7,728 variants (the same number the dry run's validator prints as "7728 compiled variants"; I could not find in the notes that the page scan's variant count equals it):

- 7,728 / 4.7 = 1,644 minutes = 27.4 hours.
- 7,728 / 2.7 = 2,862 minutes = 47.7 hours.
- For scale, the 18-card count (5,360 variants from the baseline above): 5,360 / 4.7 = 19.0 hours; 5,360 / 2.7 = 33.1 hours.

Caveat on those hours: the rates were measured on a loaded machine (load 100 to 360, software rendering). `tools/check.mjs:2-3` says its browser results "come from the cache when nothing a variant renders has changed (cold: several minutes; warm: about one)". Registering the eight changes the engine, so the scan is cold. The hours are an upper estimate from the loaded rate, not a measurement I made; nobody has finished a cold full check.

What Route B inherits, with its file:

- Open flash failures, next-b: `r3/battle/.work/battle-r4/critic-next-b-build/lane-fail.txt` (untracked, 40 lines: 35 `flash.margin` rows at 6 against the limit of 5, and 5 `flash.blocks` rows at 7, spread over atlas, ommc, podium and sevenfold). The same figures are in the working-tree `MERGE.md` ("40 failures, 35 at 6 against the margin of 5 and 5 at 7", from `r7/flash-b4.log` and `r7/flash-b5.log`): "the entrances, 16", "Chat With Papers, 10", and a short list of single rows. MERGE.md also says it read 49 over in its first pass and 78 over after the first round of fixes, so the fixes in the working tree are what brought it to 40.
- Open failure, mixed lane: `REQUESTS.md:24`, 6 to 7 on the flash gate (limit 5).
- Next-b's own caveat (working-tree `MERGE.md`, item 2): the harness measured the eight on r4/ex's gallery ground, so "the flash readings and the world-as-target readings move with" the card swap; "rescan after the swap".
- A kit rebuild "would take all of it at once" (`REQUESTS.md:33-34`): all 572 entries, including the closer's core changes that were never fully checked.

No timeline exists for Route B: the check's own gate is red on 40 rows and the fixes for them are not written.

## What a clean kit rebuild takes with it besides the eight

Every route rebuilds `kit.js`. `r4/play/vendor/SOURCES.md` ("MAT prototype" table, 186 rows, every one under `r3/battle`) lists each source file of the shipped kit (the 11-01 build) with a sha-256 prefix of 12 hex characters. I computed the same prefix for each file in the committed export (`git archive HEAD r3/battle r3/cards ... r4/play`; script `~/k7-rescue/improve-audit/lane-d/hashcmp.mjs`, output `hashcmp.txt`). The same row paths all exist in the export (0 missing).

| Folder | Listed files | Same as the shipped kit | Different |
| --- | --- | --- | --- |
| `broadcast/scenes` | 133 | 40 | 93 |
| `broadcast/src` | 10 | 3 | 7 (`card.ts`, `env.ts`, `fx.ts`, `kit/index.ts`, `kit/scene.ts`, `looks.ts`, `scenes.ts`) |
| `engine/src` | 8 | 1 | 7 (`cpu.ts`, `engine.ts`, `index.ts`, `roster.gen.ts`, `rules.ts`, `traits.ts`, `types.ts`) |
| `runtime/src` | 16 | 11 | 5 (`cutscene.ts`, `director.ts`, `media.ts`, `stage.ts`, `timeline.ts`) |
| other (`api`, `broadcast.css`, `data/media.js`, font) | 19 | 15 | 4 (`api/showdown.ts`, `broadcast/broadcast.css`, `broadcast/data/media.js`, `fonts/katagami-sans-battle.woff2`) |
| Total | 186 | 70 | 116 |

The 93 different scene files cover every one of the 18 fielded cards plus the shared kits (turboslide, glyphfield, jarhead, katagami, claude-of-tanks, mailroom, local-search, agent-pets, loop, agent-machines, prototemplate, bday-land, powerlifting, elo, cotfly, relay, princeton-td, kevin-wiki, `agents.kit`, `mixed.kit`, `studio.kit`). So a clean rebuild from the committed tree is not a 26-card change on top of the live battle: it is a re-check of the 18 fielded cards against 116 changed sources (engine and runtime among them), and the closer's check that would cover it never finished (`closer/NOTES.md`). At the 18-card count of 5,360 compiled variants that is 19.0 to 33.1 hours at the notes' loaded rate (arithmetic in Route B), an upper estimate for the reason given there.

## Last page flash reading for each staged card

"Page flash scan" is `flashscan` (browser, real frames); the limit is 5 block transitions a second for the staged cards (entry counted) and 6 for R3's own scenes. The committed scene files for all eight entered the rounds in commit `f5317f1f` (2026-11-04 20:41 -0800). Of the 70 modified files, the next-b scene files (24) differ from that commit; no next-a scene file is modified.

| Card | Committed scene files | Working-tree scene files |
| --- | --- | --- |
| sandbox-arena | Fail. `r3/battle/.work/battle-r4/critic-next-a-build/flash3.log:316`: the critic's run of 2026-11-04 14:51 over three cards, "312 variants ... 297 failures"; for this card 86 of its 104 variants over 5 (counted from `flash3.json`; log lines 318 on). Same files as the committed ones. | Same files. |
| ariadne | Fail, older reading only. `next-a/verify/flash-2.log:1654` (2026-11-04 03:51, before two fixes): "1650 variants ... 944 failures"; for this card 252 margin rows and 4 rows over 6 (counted from the failure lines). The critic did not rescan this card (`flash3.json` has no ariadne rows). `MERGE.md` ("next-a's open item", line 243) records the same state. | Same files. |
| sigil-ui | Fail. `flash3.log:316`: 85 of 99 variants over 5, of which 16 at 7 or more (Preset Swap full reads 8, limit 6; `flash3.log:318`). | Same files. |
| dedalus-terminal | Fail. `flash3.log:316`: 67 of 109 variants over 5, 4 at 7 or more, plus 58 rows of other kinds (edge counts). | Same files. |
| sevenfold | No reading found. | Fail. `critic-next-b-build/lane-fail.txt` (2026-11-06 07:28): 16 rows, all at 6 (limit 5); the file lists 40 rows for the four next-b cards. Working-tree `MERGE.md` ("next-b's open items", from line 256): "40 failures, 35 at 6 ... and 5 at 7" from `next-b/r7/flash-b4.log:825` and `flash-b5.log:176`. |
| podium | No reading found. | Fail. `lane-fail.txt`: 9 rows (3 at 7, 6 at 6). |
| ommc | No reading found. | Fail. `lane-fail.txt`: 3 rows (1 at 7, 2 at 6). |
| atlas | No reading found. | Fail. `lane-fail.txt`: 12 rows (1 at 7, 11 at 6). |

Places searched for the "no reading found" cells: `r3/battle/.work/battle-r4/next-b/` (`NOTES.md`, `gate/`, `r5/`, `r6/`, `r7/`), `.work/next-harness/MERGE.md`, `scenes/next/README.md`, `r4/play/REQUESTS.md`, `r3/battle/.work/` top-level logs (`flash-all.log`, `check-cold-1.log`), and `r3/battle-r4/` (it exists, holding only a dated plan folder listing, no flash results for these cards). `next-b/NOTES.md:15` and `:30-32` record that the earliest next-b scans (r6 and r7) were taken after the 11-05 flash fixes that are among the uncommitted edits; `gate/flash.log` is empty. The `MERGE.md` figures of 49 over (first pass) and 78 over (`flash-b3`) are after those fixes too. So no scan of the committed next-b scene files exists in the notes. Next-a's four were last scanned on 2026-11-04, and the scans were taken in the harness, on a 5-block margin; the notes add that the harness scored the cards on a different gallery ground than the page (`MERGE.md`, next-b item 2), so these readings may move after the card swap.

## Kit builds in the export, measured

Both builds ran in the scratch export with copies of the tools. I read `r4/play/.work/mat/build.mjs` first: every write goes through `put(...)` or `fs.renameSync` under `V = ${ROOT}/r4/play/vendor`, so with `ROOT` set to the export, all writes land under the export. It reads `repo = .../Personal Website` only to load esbuild (read-only). Deviation from "change only `ROOT`": `mat/kit-entry.ts`, `mat/sd-global.ts`, `study/engine-entry.ts` and `study/director-entry.ts` each import from the live rounds path (8, 4, 2 and 4 lines), so I rewrote that path prefix to the export root in the export's copies of those four files; without it the build would have read the working tree, including battle-r4b's uncommitted edits, from the live rounds. The three engine files of the dry run were in `r3/battle/engine/src/`.

| | (a) eight's scenes under `scenes/next/`, not registered | (b) 56 scene files moved up, `data/next.json` emptied, `broadcast/tools/build.mjs` run first |
| --- | --- | --- |
| `build.mjs` | exit 0; `kit.js 714 KB, 173 inputs`; `sources: 187 files` | exit 0; `kit.js 792 KB, 229 inputs`; `sources: 243 files` |
| `kit.js` size | 730,959 bytes (the shipped one in the rounds: 626,685) | 811,308 bytes |
| `"ommc"` occurrences | 1 | 13 |
| `"katagami"` occurrences | 14 | 14 |
| Phone patch anchor (`i.addEventListener("loadeddata",s,{once:!0}),i.addEventListener("error",s,{once:!0})`, from `scripts/phone-memory.mjs`) | 1 (the site needs exactly 1) | 1 |
| `bundle.mjs` `engine.js` | 144,994 bytes; `FIGHTERS.length` 26 (the last eight are the staged ids) | same |
| `media.js` cards | 18 | 18 |
| validator | not run in (a) | 165 definitions, 156 scene files, `moves 104/104, traits 26/26, entrances 26/26`, `0 problems` |

The kits are at `~/k7-rescue/improve-audit/lane-d/kit-026/a/` and `b/` (each with `vendor/broadcast/kit.js`, `vendor/broadcast/media.js`, `vendor/engine.js`, `vendor/cards/`, `build.log`, `measure.txt`). Caveats for whoever opens them in a browser: both `media.js` files hold 18 cards, because `build-data.mjs`, `media.py` and `thumbs.mjs` (registration step 4) were not run, so in (b) the eight's scenes are registered but their plates, grounds and footage are not in the media manifest; the four trait hooks are the dry run's empty entries; nothing was run in a browser. The anchor survived both builds exactly once, but the minified names behind it can change with any source edit, so it stays a risk on every route and the site's `scripts/phone-memory.mjs --check` must pass on the real build. The other four phone patches act on `runtime.js` and `battle.js`, which these builds do not touch (`r4/play/shared/`).

## Reviewer's browser run of kit (a) (lane D's reviewer, 2026-11-10)

The executor started no browser. The reviewer copied the lane's site build (`4025230` plus plan 028), put build (a)'s `kit.js`, `media.js` and `vendor/cards/{art,card-env.gen,card-sprite.gen}.js` in place of the shipped ones, served the copy locally and drove it with Playwright Chromium at 1440 x 900, sound off, `?auto=1`. The copies are unpatched (no sync transforms, no phone patch), so this shows what the kit does, not a release. Results and screenshots: `~/k7-rescue/improve-audit/lane-d/run-026/`.

| Run | Address after `/battle?auto=1` | What happened |
| --- | --- | --- |
| Today's build, staged team (control) | `#team=ommc,katagami,mailroom&rival=atlas,elo,cotfly&seed=7` | The page's alert reads "Team: Unknown card: ommc. Playing the default hand." and the default teams play. This is the page's 18-fighter engine refusing the team, as the correction above says. |
| Kit (a), Mat, two staged cards | the same address | deal, entrance at 2.1 s, live at 6.4 s, result at 49 s: "Victory, 11 turns". No page error. Six 404s: `/battle/gallery/grounds/ommc.webp` and `atlas.webp`, and OMMC's four move thumbnails under `/battle/previews/`. |
| Kit (a), Mat, six staged cards | `#team=sandbox-arena,ariadne,podium&rival=sevenfold,sigil-ui,dedalus-terminal&seed=11` | Plays to "Defeat, 12 turns" in 40 s. No page error. Eighteen 404s of the same two kinds (six grounds, twelve thumbnails). |
| Kit (a), Arena, two staged cards | the first address with `&mode=arena` | The floor, both leaders and the hands print; no figure stands for OMMC or Atlas; the header's two lead thumbnails are broken images; the turn banner reads "Turn 1, Playing the turn" and the page was still in its entrance phase after 150 s. The battle does not start. |
| Kit (a), Arena, fielded cards only | `#team=katagami,mailroom,elo&rival=cotfly,bday-land,powerlifting&seed=7&mode=arena` | live at 24 s, "Victory, 12 turns" at 63 s. No error, no 404. |
| Today's build, Arena, the same fielded teams and seed | the same address | live at 18 s, "Defeat, 9 turns" at 46 s. |

What the run adds to the reading above:

- A staged card's default scene is not bare. It prints the page's own card (the wall's card, with its art and logo) beside the move's name in large type over a generic moving ground (`run-026/kita-mat-t006.jpg`, `kita-mat-t013.jpg`). What it lacks is the card's own staging, footage and world.
- The Arena does not degrade quietly for a card with no figure: the battle hangs at the entrance. Fielding the eight needs their figure entries in the page's manifest in the same step as the kit (the figures already ship; see "The Arena").
- The same teams and seed give a different battle under the rebuilt engine (Defeat in 9 turns today, Victory in 12 with kit (a)): 7 of the 8 engine source files differ from the shipped kit's (the count was taken with the dry run's 26-card roster and trait files in place, which are three of the seven). Every saved `#log=` address and every "same teams and seed" claim changes with any kit rebuild, on every route.
- Two kinds of file are missing for the eight on the site: the gallery ground the page asks for at `/battle/gallery/grounds/<id>.webp`, and the move thumbnails at `/battle/previews/<id>.<move>.webp`.

Not covered by this run: the page flash scan (no scene of the 18 or the eight was measured for flashes), a phone, the trait hooks (the four are empty), sound, and the kit under the site's sync patches.

## The Arena

`MERGE.md:96` (step 7, "PLAY") says to move the eight figures from the figure manifest's `next` key into its list and add the eight to the Arena's roster. What the files show: the site's `public/battle/media/figures/manifest.json` has keys `contract`, `about`, `views`, `figures`; `figures` holds the 18 fielded ids and there is no `next` key. The `next` key lives in the source, `r4/stage/figures/manifest.json:874` (8 entries: ariadne, atlas, dedalus-terminal, ommc, podium, sandbox-arena, sevenfold, sigil-ui), and `r4/stage/figures/tools/contract.json:22-24` lists `roster.fields` (18) and `roster.next` (8) with the note "next: the eight ... not yet in the engine the page loads". `r4/play/.work/stage/build.mjs:32` builds the page's manifest by looping over `C.roster.fields` only. The figure files for the eight are in `r4/play/media/figures/<id>/` and ship on the site (968 KB), and a `next` entry has the same keys as a `figures` entry (`method, scale, pixel, native, front, rear`, with `src, lo, w, h, foot, box, base`).

What the Arena does today for a fielded card with no entry in `figures` (read from code, not run): `public/battle/arena/board.js:178-179` skips decoding it (`const m = man.figures[f.id]; if (m) ...`); `board.js:482-483` `placeFigure` returns at once (`if (!m) return`), so no figure stands on the floor for it; `arena/ground.js:96-97` `envelope` skips it when solving the duel's floor (`if (!m) continue`) and returns `null` if none of a side's ids has a figure (`ground.js:107`). From that reading the card would play in the Mat but be missing from the Arena floor, silently. The reviewer's run shows more: with a staged card in the lead the Arena battle never leaves its entrance (table above), so this is a blocker for the Arena, not a cosmetic gap. What must change for the eight to stand: add them to `roster.fields` in `r4/stage/figures/tools/contract.json` (or merge the `next` entries into `figures`), re-run `r4/play/.work/stage/build.mjs`, and sync the manifest; no `board.js` change is evident. This is rounds work, in `r4/stage` and `r4/play/media`, not a site edit; I did not run the builder.

## Route C (redefined): a kit rebuilt from the committed tree with the 26-card engine; the eight on default scenes until their own pass the page flash scan

This is build (a) above. The kit and `engine.js` come from one bundle step so the page's roster (inside `kit.js`) and the site's build-time roster (`engine.js`) agree; the site's Battle buttons, dock and the page all see 26 fighters.

Verdict: possible, with named gaps. The next four statements about a staged card whose scenes are not registered were read from the shipped code, not run; I started no browser. Files are in `~/repos/kevinliu-studio-dir/public/battle/`.


1. Does the page survive a fielded card with no `media.js` entry? Yes, from the code. `window.BROADCAST_MEDIA` is read once at `shared/battle.js:54` (`runtime.createMedia(...)`). `createMedia` is `nl` in `vendor/broadcast/kit.js:3`; every accessor starts from `n(l) = t[l]` and uses optional chaining, so for an unknown id: `has` is false, `title` returns the id, `plate`, `loop`, `cutout`, `emblem` and `plateFile` return null, `feature` returns `plate()` (null), `palette` normalizes an undefined plate. `Stage.mediaOf` (`shared/runtime.js:319-333`) passes those straight into the scene, and `refsOf` filters nulls (`runtime.js:344`, `.filter(Boolean)`), so the warm-up skips them. Nothing throws; the eight would show no plate, no ground, no cutout and no footage in a scene. `shared/hud.js` does not read the media manifest at all (grep found no read).
2. Does the director fall back to a default scene? Yes. `findCutscene` is `qi` at `vendor/broadcast/kit.js:2`: it scans every registered scene of the same kind and keeps the most specific whose `card` and `move` (id or name) match, so a scene with no `card` is a valid match; `compileScene` throws only if no scene of that kind exists at all (`kit.js:2`, "Register a default for the kind"). `shared/runtime.js:208-209` repeats the lookup with `runtime.findCutscene({ kind: s.kind })?.short`. The validator's own line "grammar defaults by discipline" (output above) shows defaults are registered per discipline. What plays is the discipline's generic scene (a call-out with the move name, bars, number), without the card's own staging or footage; the reviewer's run shows the page's own card printed beside the move's name. That is the sentence for Kevin: the eight would play generic cutscenes, which falls short of "loud".
3. Previews and sound. Previews: `shared/hud.js:374` points the tooltip video at `previews/<card>.<move id>.webm` with a `.webp` poster; the eight have none. `hud.js:450` sets `v.onerror` to mark the move `data-novid` and `hud.css:147` hides the video, so the tooltip degrades cleanly. The move button thumbnail is a plain `<img>` (`hud.js:634`, source set at `hud.js:661`) with no error handler: a missing file shows nothing (opacity 0 until hover, `hud.css:467-468`; hidden below 1180 px, `hud.css:540`), so a broken-image icon may flash on hover at wide sizes. I did not run a browser to see it. Sound: the eight's six cues each already ship (`manifest.battle.json`, table above), so sound does not break.
4. Plan 009's two-world cap on a phone. The cap is per page visit: `LEAN_GROUNDS` is read once when the module loads (`shared/runtime.js:217`; marker comment `:215`), and the one `Stage` is created once at `shared/battle.js:56`. When a third shader world is asked for, `setGround` (`runtime.js:413-417`) stores the outgoing world in `this.grounds`, then, on a lean device, calls `dispose()` and deletes every held world that is neither the current one (`this.shaderSource`) nor the incoming one (`ground.source`). So the outgoing and the incoming stay, older ones are given back, and a dropped one links again on next use (the patch comment says about 350 ms). Nothing in these lines counts or lists the roster (`grep roster` in `runtime.js` finds nothing). Effect per route: all 12 shader worlds belong to the 18 already fielded and none of the eight has one (see "Ships unused today"), so fielding the eight raises neither the number of WebGL contexts a phone holds nor the cap's work. A battle still fields six cards. What grows is what a phone may fetch over a visit: the eight's images and loop clips (about 10.7 MB of worlds and 9.3 MB of move footage) when a scene needs them. Route C fetches none of them (no media entry); Routes A and B fetch them. The warm-up keeps no bytes (`runtime.js:349`, `.then(() => true)`), so fetched media do not stay in memory.

Kit anchor, a risk on every route (see the measured result above), found in `scripts/phone-memory.mjs`: the patch for `public/battle/vendor/broadcast/kit.js` is anchored on the exact minified text `i.addEventListener("loadeddata",s,{once:!0}),i.addEventListener("error",s,{once:!0})`, and each anchor must occur exactly once or the sync throws. A rebuilt `kit.js` can rename those minified variables, so a kit rebuild may break the sync until that anchor is rewritten. Builds (a) and (b) both kept it exactly once.

Gaps for Route C, named:
- The kit rebuild is a re-check of the 18 fielded cards (116 of 186 listed sources differ; table above). Its first gate is the page flash scan and the closer's check over the changed scenes; no note shows the committed 18-card scenes read on the page.
- The four unbuilt hooks (Fresh Sandbox, Exactly Once, Fused Rank, Zero Idle Time). Without them the engine fields Sandbox Arena, Ariadne, Sevenfold and Podium with a trait that does nothing in battle while their cards name it. Shapes are in MERGE.md.
- Arena: the eight need figure entries (section above); without them an Arena battle with a staged lead does not start (reviewer's run).
- The eight's gallery grounds (`/battle/gallery/grounds/<id>.webp`) are not on the site; the page asks for them (reviewer's run, 404).
- The eight's plates and footage are not in `media.js` in this build; registering their media (registration step 4) without their scenes is possible in principle but not measured here.
- Replays: old `#log=` addresses will replay differently once the roster changes the engine (direction finding DIR-06).
- The 12 moves' names (next section) are not fixed by the rebuild alone.
- Move previews and thumbnails for the 32 new moves stay missing.
- The site then moves its battle pin through `scripts/sync.mjs` (`PIN.battle`) and re-runs `scripts/phone-memory.mjs`.
- Do not take the engine-only shortcut: a rebuilt `engine.js` without the kit opens Battle buttons for teams the page's own engine refuses.

## Move ids and names

The pairing command (Step 6) printed, in `~/repos/kevinliu-studio-dir`, `12 renamed`, identical to the plan's table:

| Card | Engine move id (stable) | Engine name | Card's name today | Index |
| --- | --- | --- | --- | --- |
| glyphfield | `editable-layers` | Editable Layers | Source View | 2 |
| jarhead | `swift-hands` | Swift Hands | Computer Use | 3 |
| claude-of-tanks | `column-fire` | Column Fire | 14 v 14 | 3 |
| local-search | `148-7-ms` | 148.7 ms | Fast Search | 2 |
| local-search | `53-4-tokens` | 53.4 Tokens | Compact Results | 3 |
| agent-machines | `provider-route` | Provider Route | Compute Adapters | 2 |
| prototemplate | `type-field` | Type Field | Glyph Rain | 2 |
| bday-land | `plus999-love` | +999 Love | Doodle Barrage | 0 |
| powerlifting | `84-icons` | 84 Icons | Icon Set | 2 |
| relay | `1v1` | 1v1 | Head To Head | 1 |
| relay | `jev-choice` | Jev Choice | Action Menu | 2 |
| princeton-td | `offscreen-layers` | Offscreen Layers | Cached Map | 2 |

The rule to adopt: an engine move's `id` never changes, because it keys the scene file (`broadcast/scenes/<card>.<id>.ts`), the sound cue (`sig.<card>.<id>`) and the preview files (`previews/<card>.<id>.webm` and `.webp`). Its displayed `name` and words come from the card (`r4/ex/roster/battle-roster.json`). The map belongs where the roster is rebuilt: `r3/battle/tools/build-data.mjs` writes `engine/src/roster.gen.ts` (its header, line 4); README step 1 adopts r4/ex's roster there, and the 12 rows above are the first entries of that map. I checked all 12 scene files: each declares `move:` with the id (for example `relay.1v1.ts:16`, `claude-of-tanks.column-fire.ts:22`), and `findCutscene` (`kit.js:2`) accepts the id or the name, so a rename of the name alone matches as before.

Where a move name is printed in a battle, to check after the rename (all read from the engine's `move.name`):
- Move button name: `shared/hud.js:629`; tooltip header `hud.js:376`; the "Seen" list `hud.js:141`.
- Battle log lines: hit and miss at `hud.js:230` and `hud.js:245`.
- Screen-reader announcements and labels: `shared/battle.js:476-477` (live region), `:636` and `:638` (spoken description), `:651` (button label).
- Scene call-out: `runtime/src/director.ts:127` builds the scene's `title` from `move.move.name`, and `shared/runtime.js:400` prints it.
- The description lookup: `hud.js:613` finds the card's text with `ex.moves.find((x) => x.name === m.name)`. For each of the 12 the names differ today, so the lookup fails and the button prints the battle's own short line (as `r4/play/SPEC.md:101-105` says). Renaming to the card's name makes it find the card's words. This is the visible gain.
- The old page `broadcast/src/main.ts:303-310` also prints `e.move.name` (the broadcast page's ticker and log).

Scene files hold the old names only in comments, not in printed text. Per old name, matches under `broadcast/scenes/*.ts` in the export (`grep -rF`): Editable Layers 2 (comments in `glyphfield.fx.ts:375`, `glyphfield.editable-layers.ts:1`); Swift Hands 2; Column Fire 3 (one is in `bday-land.plus999-love.ts:19`, a comment); 148.7 ms 6 (`local-search.fx.ts:218-219`, `local-search.148-7-ms.ts:1,3,5,27`: comments, plus footage timing text in comments); 53.4 Tokens 2; Provider Route 5 (including `mixed.kit.ts:174`); Type Field 2; +999 Love 5; 84 Icons 2; Jev Choice 3; Offscreen Layers 2; `1v1` 15 lines in 6 files but 2 of those files are generated (`cards.gen.ts`, `index.gen.ts`) and the rest are the id itself, a comment, or the button label "Start 1v1" in the footage. I read every hit line: none prints the old name to the player. The footage itself (screenshots of the card's product) is not text I searched. One thing to check in the build that follows: any call-out string that a scene file computes at run time from `scene.title`, which follows the new name automatically.

## Comparison

| | What Kevin gets and when | What it drops or inherits | Machine time | What the first kit must pass | Open risks |
| --- | --- | --- | --- | --- | --- |
| A: committed battle plus six steps (kit (b) plus media step) | 26 loud cards after hooks, media step, kit and engine rebuilt | Drops battle-r4b's 572 entries; registers the committed next-b scenes (older than the fixes) | Compiled gate: minutes, passes 104/104 in build (b). Then page flash scan over the 18 (116 changed sources) plus the eight | Page flash scan on the 18 and on all eight cards' scenes; the recorded readings are failures for the three next-a cards (297 of 312 variants) and absent for committed next-b | The eight would ship with a failing or missing page reading; 27 to 48 h estimate for 7,728 variants |
| B: keep all salvage, finish the check | 26 loud cards with the closer's work; no end date | Inherits 40 open next-b rows, 6 to 7 on the mixed lane, a rebuild taking all 572 entries | 27.4 to 47.7 hours for one pass, more after fixes | Same scan, after fixes that are not written | Open fixes; unfinished closer's check |
| C (redefined): kit (a), eight on default scenes | 26 fielded cards in the dock, buttons and the page, eight on generic cutscenes | Touches none of the 572 entries; drops nothing; leaves the eight's scenes, footage, previews unused | Kit and engine bundle built in minutes here (not timed); the 18-card re-check 19.0 to 33.1 h at the loaded rate | Page flash scan and check over the 18 fielded cards' changed scenes (93 scene files, 7 core files); hooks built; Arena figures added (without them the Arena hangs, run by the reviewer). Mat play with all eight already runs in a browser | Generic scenes fall short of "loud"; four traits inert until hooks; anchor must survive the real build; saved replays change; phone: nothing added |

## Recommendation

Route C as redefined. The numbers that decide it: every route needs the same rebuilt kit and therefore the same re-check of the 18 fielded cards (116 of 186 listed sources changed, 93 of them scene files); adding the eight's scenes (A, B) adds scenes whose last page flash readings are failures (sandbox-arena 86 of 104, sigil-ui 85 of 99, dedalus-terminal 67 of 109 variants over 5; ariadne 252 margin rows in an older run) or nonexistent (committed next-b), and for next-b's fixed copy 40 open rows; Route C adds none of that exposure. It also makes the kit and `engine.js` agree, which the first-pass recommendation did not. The cost is that the eight play generic cutscenes, which falls short of "loud", and that Route C is not cheap: it is the full 18-card re-check plus four hooks plus the Arena manifest.

Smallest first step: kit (a) already plays the eight on the Mat in a browser (reviewer's run). What is left before the site can take it, in order: (1) add the eight to the Arena's figure manifest and confirm an Arena battle with a staged lead starts; (2) run the page flash scan over the 93 changed scene files' variants of the 18 fielded cards, the one measurement no note has; (3) write the four hooks or decide they stay inert. The eight's scenes then register card by card as each passes its own scan (next-a's four have no scene edits to wait for, only fixes for 297 margin rows).

## Questions for Kevin

1. Keep or park battle-r4b's uncommitted scene work for now (48 modified scene files: the finished Worlds-lane changes for Princeton TD, Katagami and Agent Pets, and next-b's 24 files with flash fixes)? Route C parks it; it stays on disk. (keep / park)
2. May the eight play default scenes for a while? (yes / no)
3. Is a day or more of machine time for the 18-card re-check acceptable (19 to 33 hours at the loaded rate; the header of `tools/check.mjs` says a cold run is minutes)? (yes / no)
4. Do the card's move names win over the battle's on all 12? (yes / list the exceptions)
5. Who writes the four hooks, or may the four traits stay inert at first? (write now / inert for now)
6. Who runs the rounds build (kit, engine, Arena manifest) and on what day does the site move `PIN.battle`?
7. Saved battle links replay differently after any kit rebuild (measured: the same teams and seed went from Defeat in 9 turns to Victory in 12). Accept that, or should the address carry an engine version first? (accept / version first)

## Not done here

- The four trait hooks.
- The real kit rebuild for shipping, `tools/build-data.mjs` with the 26-card roster, `broadcast/tools/media.py`, `thumbs.mjs`, and the `ACCENT` and `MATERIAL` rows.
- Arena: adding the eight to `r4/stage/figures/tools/contract.json` `roster.fields`, running `r4/play/.work/stage/build.mjs`, and syncing the manifest.
- `r4/play/tools/previews.mjs` for the 32 new moves and `r4/play/tools/timings.mjs` (tracked in `r4/play/tools/`, not in the committed `r3/battle/tools/`).
- The closer's check (`tools/check.mjs`) and the page flash scan on the committed or working-tree scenes, and on the kits built here.
- The site's pin move and `docs/battle.md`'s rewrite.
- The executor started no browser or server; its statements about a missing media entry, a missing scene or a missing figure come from reading the shipped code. The reviewer's run (section above) covers Mat and Arena play of kit (a) only.
