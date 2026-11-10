# Plan 026: Kevin has a written, measured choice of how the battle gets from 18 cards to 26

> **Executor instructions**: This is a spike. You measure, read and write one decision document. You build nothing that
> ships and you decide nothing for Kevin. Follow the steps in order. Run every verification command and confirm the
> expected result before moving on. If anything in "STOP conditions" occurs, stop and report; do not improvise. When
> done, do NOT edit `plans/README.md`: lane D's reviewer dispatched you and the audit session keeps the index.
>
> **Refreshed 2026-11-10 by lane D** against site commit `4025230` (branch `improve/direction`, worktree
> `~/repos/kevinliu-studio-dir`) and rounds HEAD `de54fad5`. Every "Current state" fact below was re-opened at those
> commits; what moved since the first writing is marked "(refresh)".
>
> **Drift check (run first)**:
> `git -C ~/repos/kevinliu-studio-dir diff --stat 4025230..HEAD -- docs/battle.md src/lib/cards.ts vendor/battle public/battle/vendor public/sound/manifest.battle.json`
> and `git -C "/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30" log --oneline de54fad5..HEAD -- r3/battle r4/play`.
> If either prints anything, re-read the "Current state" facts against the live files before you rely on them; a
> mismatch you cannot explain is a STOP condition.

## Status

- **Priority**: P1 (direction; it unblocks Kevin's goals 1, 2 and 3 at once)
- **Effort**: M for this spike (the build it leads to is L and is not in this plan)
- **Risk**: LOW for the spike (read-only on the live rounds; all experiments run in a scratch export)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `4025230` (site, `feat/i18n` with the ten P1 plans), rounds HEAD `de54fad5`, 2026-11-10
  (first written at `c6245d9` and `868340d7` on 2026-11-09)

## Why this matters

Kevin's goals, in order: 26 loud collectible cards, one battle engine with Mat and Arena modes, ElevenLabs sound, and
Claude of Tanks. Today the battle holds 18 of the 26 cards. The other eight (Sandbox Arena, Ariadne, Sigil UI, 050525,
Sevenfold, Podium, OMMC, Atlas) have no Battle button on their card pages, the home dock cannot pick them, and about
22 MB of their battle material (sound cues, Arena figures, move footage, worlds) already ships and can never play.
Twelve moves also carry one name on the card and another in the battle. Three routes to 26 exist, each with a
different cost, and the notes that describe them are spread over six files in two repositories. This spike puts the
measurements and the trade-offs on one page so Kevin (or the main portfolio session) can pick a route once.

## Current state

Two repositories. You read both. You write only: the result document in the audit worktree, one `memory.md` entry in
the lane worktree, and a scratch folder.

- Site worktree for this lane: `~/repos/kevinliu-studio-dir` (branch `improve/direction`, Astro 7 static site, cut from
  `4025230`). Run every site command there. Never touch `~/repos/kevinliu-studio` itself or any other
  `~/repos/kevinliu-studio-*` worktree; they belong to other sessions.
- Audit worktree (the plans): `~/repos/kevinliu-studio-improve`. You create one file there,
  `plans/results/026-battle-26-cards.md`, and commit nothing there.
- Rounds repo (the source of the cards, battle and sound):
  `/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`, called `<rounds>` below. Other sessions write
  in it. `<rounds>/r3/battle` holds 572 uncommitted entries left by a retired run called battle-r4b
  (`git -C <rounds> status --short -- r3/battle`: 289 deleted, 70 modified, 213 untracked; the same counts on
  2026-11-09 and 2026-11-10). **Never write anywhere under `<rounds>`.**
- (refresh) Three of the notes this plan quotes are among the 70 modified files, so their working-tree text differs
  from the committed text your export will hold: `r3/battle/broadcast/scenes/next/README.md` (31 lines changed),
  `r3/battle/.work/next-harness/MERGE.md` (48) and `r3/battle/.work/next-harness/merge-dry/RUN.md` (6). The excerpts
  below were taken from the working tree. Read both forms (`git -C <rounds> diff -- <file>` is read-only) and say in the
  result document which form each quoted line comes from and what battle-r4b changed in them.

What the site says (`docs/battle.md:23-25`):

```
- The battle holds 18 of the 26 cards. The eight added on 11-01 have staged scenes in
  `r3/battle/broadcast/scenes/next/`; registering them (adopting `roster/battle-roster.json`, moving the scenes up,
  rebuilding the engine and kit) is merge work that waits for battle-r4b to finish writing r3/battle.
```

Where the 18 comes from (`src/lib/cards.ts:152-157` and `:185-186`): the roster is read from the engine bundle, and a
card the engine lacks gets no team, so no Battle link.

```ts
export const battleRoster = await (async () => {
  const file = path.join(ROOT, 'vendor/battle/vendor/engine.js');
  if (!fs.existsSync(file)) return null;
  const b = await import(/* @vite-ignore */ file) as { RULES: any; FIGHTERS: Fighter[] };
  return { budget: b.RULES.team.budget as number, cost: Object.fromEntries(b.FIGHTERS.map((f) => [f.id, f.cost])) as Record<string, number> };
})();
...
export function teamFor(lead: string): string[] | null {
  if (!battleRoster || !(lead in battleRoster.cost)) return null;
```

So the site needs no code change to field 26: a rebuilt `vendor/engine.js`, `kit.js` and `media.js` arriving through
the sync is enough (`<meta name="battle-roster">` and `teamFor` follow the engine).

What already ships for the eight and cannot be reached (measured at `c6245d9`; the cue count and the figures were
re-measured at `4025230`: 6 cues a card, 968 KB of figures):

| Material | Where on the site | Size |
| --- | --- | --- |
| 6 battle sound cues a card (`sig.<id>.<move>`, `.entrance`, `.trait`), 48 cues, 89 file stems | `public/sound/manifest.battle.json`, files under `public/sound/out/` | 1.36 MB (Opus and AAC) |
| Arena figures | `public/battle/media/figures/<id>/` | 0.93 MB (968 KB by `du -sk`) |
| Move footage | `public/battle/r3/media-moves/<id>/` | 9.3 MB |
| Worlds (loop, wide, portrait, poster, object, emblem, ground) | `public/battle/r3/broadcast/media/<id>/` | 10.7 MB |

What is missing for the eight: an entry in the engine (`vendor/battle/vendor/engine.js` names none of them), an entry
in `public/battle/vendor/broadcast/media.js` (none), their scenes in `kit.js`, and move previews
(`public/battle/previews/` holds 144 files for 18 cards).

The staged work in the rounds (all read-only for you):

- `<rounds>/r3/battle/broadcast/scenes/next/README.md` (tracked; 57 files in that folder): the eight cards' scene
  files and the six registration steps. Lines 25-39 are the steps; step 6 reads:
  ```
  6. `node broadcast/tools/validate.mjs` must print moves 104/104, traits 26/26, entrances 26/26 (the dry run did:
     `.work/next-harness/merge-dry/RUN.md`), then `PORT=<p> node tools/check.mjs`.
  ```
- `<rounds>/r3/battle/.work/next-harness/MERGE.md` (tracked, 299 lines): the full commands, the trait hooks'
  event shapes and "The card adapter".
- `<rounds>/r3/battle/.work/next-harness/merge-dry/RUN.md`: a dry run on 2026-11-06 moved 56 scene files and printed
  `own scene: moves 104/104, traits 26/26, entrances 26/26`, `7728 compiled variants ... inside the flash gate`,
  `0 problems`. It registered the four new trait hooks "as empty entries" (line 4), so the hooks are not implemented.
- `<rounds>/r4/play/REQUESTS.md`, section "battle-r4b, left in place (2026-11-08, at the round 5 merge)": what the
  retired run left uncommitted. Its closing lines:
  ```
  A later kit rebuild from r3/battle would take all of it at once, so it needs the closer's full check first. That
  belongs to the 26-card follow-up.
  ```
  The same section records open failures: the mixed lane reads 6 to 7 on the battle flash gate (limit 5), and the
  next-b lane logged flash failures on the Atlas, OMMC and Podium entrances.
- `<rounds>/r3/battle/.work/battle-r4/closer/NOTES.md:32-33`: the full check's measured rate.
  ```
  12:40 check restarted with POOL=8 (rate at POOL=5: 4.7 variants a minute at load ~100)
  13:06 bottleneck: my Chromium's one GPU process at ~80% CPU (software raster for every page); the 8 renderers near idle, so POOL 8 did not raise the rate (2.7 to 4.7 a minute at load 100 to 360)
  ```
  At 2.7 to 4.7 variants a minute, 7,728 variants take about 27 to 48 hours.
- `<rounds>/r4/play/vendor/SOURCES.md:3-5`: how the page's bundles are built.
  ```
  Every file here is either bundled read-only from the round-3 battle or written for this folder. Nothing imports from
  `r3/battle` live: it is still changing. Rebuild the two bundles with `node .work/study/bundle.mjs` (the Personal
  Website repository's esbuild, through its JS API) and record the new mtimes below.
  ```
  `engine.js` is built by `r4/play/.work/study/bundle.mjs`; `kit.js` and `media.js` by `r4/play/.work/mat/build.mjs`
  (its header, lines 1-10). Both need `/Users/kevinliu/Documents/ChatGPT/Personal Website/node_modules`.
- `<rounds>/r4/play/SPEC.md:101-105`: the 12 engine moves with no card move of the same name.
  ```
  The 12 engine moves with no card move of the same name, whose buttons print the battle's own short line (ended with a
  period) until the roster rebuild: glyphfield Editable Layers; jarhead Swift Hands; claude-of-tanks Column Fire;
  local-search 148.7 ms and 53.4 Tokens; agent-machines Provider Route; prototemplate Type Field; bday-land +999 Love;
  powerlifting 84 Icons; relay 1v1 and Jev Choice; princeton-td Offscreen Layers.
  ```

The 12 renamed moves, paired on 2026-11-09 by comparing `vendor/battle/vendor/engine.js` with `public/ex/fighters.js`.
In every case the card's new name sits at the same index of the card's move list and describes the same feature:

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

The engine move id is also the key of three file families: the scene file
(`r3/battle/broadcast/scenes/<card>.<id>.ts`), the sound cue (`sig.<card>.<id>` in
`public/sound/manifest.battle.json`) and the move preview (`public/battle/previews/<card>.<id>.webm` and `.webp`).
Renaming an id would orphan all three; renaming only the displayed name would not.

**(refresh) What plan 009 changed, which the route choice must read.** Plan 009 is DONE and is in `4025230`. On a
touch screen or a small-memory device the battle now keeps two shader worlds instead of one WebGL2 context per card
with a world (`memory.md`, entry "2026-11-09: the battle gives back shader worlds and warm-up bytes on a phone":
"A touch screen or small-memory device now keeps two worlds, the warm-up keeps no bytes, the prints pause at the
result and under the Log"; measured there: stage canvases 3 to 2 over a 150 s Auto battle in Chromium with the iPhone
14 descriptor). The change is a `PHONE` patch in `scripts/phone-memory.mjs` applied to
`public/battle/shared/runtime.js` and `public/battle/shared/battle.js` (search those two synced files for the marker
`kevinliu.studio phone memory`). The eight staged cards each bring a world (10.7 MB of world files in all), so each
route must say what a 26-card roster does to a phone under that cap (Step 5, question 4).

Vocabulary to use: "fielded" (a card the engine holds), "staged" (the eight), "the kit" (`kit.js`, the bundle of
engine, runtime, Broadcast grammar and every scene), "the closer's check" (`PORT=<p> node tools/check.mjs` in
r3/battle), "flash gate" (the limit on bright flashes per scene).

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Free disk | `df -h /System/Volumes/Data` | "Avail" at least 31 GB before any export |
| Rounds HEAD | `git -C "<rounds>" rev-parse --short HEAD` | `de54fad5` or later (see drift check) |
| Export committed folders | `git -C "<rounds>" archive HEAD r3/battle r1/study-roster18 r2/plates r4/ex/roster \| tar -x -C "$SPIKE"` | exit 0; about 190 MB |
| The scenes' own validator | `node broadcast/tools/validate.mjs` (in `$SPIKE/r3/battle`) | prints `own scene: moves N/N, traits N/N, entrances N/N` and `0 problems` |
| Site build (only to confirm you changed nothing that builds) | `pnpm build` (in `~/repos/kevinliu-studio-dir`) | ends `verify-build: 256 pages, 248 sitemap URLs, 3565 files: all checks pass` (the lane baseline at `4025230`); the lane's reviewer runs it, not you |

`$SPIKE` is `~/k7-rescue/improve-audit/spike-026` (create it; it is outside both repositories and survives a reboot,
unlike `/tmp`).

## Scope

**In scope** (the only files you create or modify):
- `~/repos/kevinliu-studio-improve/plans/results/026-battle-26-cards.md` (create, with its folder): the decision
  document. Do not commit it; the audit session commits plan files.
- `~/repos/kevinliu-studio-dir/memory.md`: append one entry (Step 7).
- Anything under `$SPIKE` (scratch; delete it in the last step). Logs you want to keep go to
  `~/k7-rescue/improve-audit/lane-d/`.

**Out of scope** (do NOT touch):
- Every path under `<rounds>`: no edits, no `git add`, no `git stash`, no checkout, no tool that writes there. In
  particular never run a build or a check inside the live `<rounds>/r3/battle`; battle-r4b's uncommitted work is
  there and a rebuild would take all of it.
- The site's synced folders (`public/ex`, `public/battle`, `public/sound`, `public/og`, `vendor/`), `scripts/sync.mjs`,
  `src/`. This spike changes no shipped file.
- Implementing the four trait hooks, rebuilding `engine.js` or `kit.js` for shipping, moving a sync pin, running the
  closer's full check (27 to 48 hours). They belong to the build that follows Kevin's choice.
- Choosing the route. You recommend; Kevin chooses.

## Git workflow

- Work in the lane worktree that already exists: `~/repos/kevinliu-studio-dir`, branch `improve/direction`. Do not
  create a branch or a worktree. Never edit `~/repos/kevinliu-studio` or another worktree. Never `git stash`.
- One commit on `improve/direction`, by explicit path, as the noreply address, holding only the `memory.md` entry:
  `git -C ~/repos/kevinliu-studio-dir -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "docs(memory): the 26-card battle routes, measured (improve plan 026)" -m "Co-Authored-By: Claude <noreply@anthropic.com>" -- memory.md`
- Commit nothing in `~/repos/kevinliu-studio-improve`.
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Confirm the inventory of what ships unused

In `~/repos/kevinliu-studio-dir`, run:

```sh
node -e '
const fs=require("fs");const NEW=["sandbox-arena","ariadne","sigil-ui","dedalus-terminal","sevenfold","podium","ommc","atlas"];
const b=JSON.parse(fs.readFileSync("public/sound/manifest.battle.json","utf8"));
for(const id of NEW)console.log(id,Object.keys(b.cues).filter(k=>k.startsWith("sig."+id+".")).length,"cues");
const t=fs.readFileSync("public/battle/vendor/broadcast/media.js","utf8"),e=fs.readFileSync("vendor/battle/vendor/engine.js","utf8");
console.log("in media.js:",NEW.filter(id=>t.includes("\""+id+"\"")).length,"in engine:",NEW.filter(id=>e.includes("\""+id+"\"")).length);'
du -sk public/battle/media/figures/{sandbox-arena,ariadne,sigil-ui,dedalus-terminal,sevenfold,podium,ommc,atlas} | awk '{s+=$1} END{print s" KB figures"}'
```

Record the numbers in the result document's "Ships unused today" table.

**Verify**: each of the eight prints `6 cues`; the last line of the node script prints `in media.js: 0 in engine: 0`.

### Step 2: Export the committed battle into scratch

```sh
df -h /System/Volumes/Data            # Avail must be 31 GB or more
SPIKE=~/k7-rescue/improve-audit/spike-026; mkdir -p "$SPIKE"
R="/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30"
git -C "$R" archive HEAD r3/battle r1/study-roster18 r2/plates r4/ex/roster | tar -x -C "$SPIKE"
```

The export holds the committed files only: none of battle-r4b's uncommitted work. It is your copy for routes A and C.

**Verify**: `ls "$SPIKE/r3/battle/broadcast/scenes/next" | wc -l` prints `57`, and
`cd "$SPIKE/r3/battle" && node broadcast/tools/validate.mjs | tail -3` ends with a line containing `0 problems` (the
committed 18-card baseline). If the validator needs a file the export lacks, see STOP conditions.

### Step 3: Route A, measured: a clean rebuild from the committed battle

Route A is "the committed r3/battle plus only the six steps of `broadcast/scenes/next/README.md`, with battle-r4b's
work parked". Measure how far the mechanical part goes in the export, and list what is left:

1. Read `$SPIKE/r3/battle/.work/next-harness/MERGE.md` from "Registration, step by step" to the end. Copy its step
   list into the result document with one line each.
2. Do steps 2 and 3 of the README in the export only: move the 56 scene files
   (`mv broadcast/scenes/next/*.ts broadcast/scenes/`), and empty the staged list in `data/next.json` (set `"cards": []`).
3. Run `node broadcast/tools/validate.mjs` and record its last 12 lines verbatim. Without step 1 of the README (the
   roster and the trait hooks) it is expected to report problems for the eight; record exactly what it reports. That
   list is the measure of what route A still needs.
4. Compare the dry run's engine with the committed engine, to size step 1:
   `diff -ru "$SPIKE/r3/battle/engine/src" "$R/r3/battle/.work/next-harness/merge-dry/r3/battle/engine/src" | diffstat 2>/dev/null || diff -rq "$SPIKE/r3/battle/engine/src" "$R/r3/battle/.work/next-harness/merge-dry/r3/battle/engine/src"`
   (read-only on `$R`). Record the files that differ and the line counts. Name the four hooks that the dry run left
   empty (README step 1 and MERGE.md name them: Fresh Sandbox, Exactly Once, and next-b's two) as unbuilt work.
5. Read "The card adapter" in MERGE.md and `<rounds>/r4/play/vendor/SOURCES.md` lines 16-24. Answer in the result
   document: since round 5 the page prints r4/ex's card through `shared/excard.js`; which of the adapter's parts does
   the kit still need for the eight (its `vendor/cards/art.js` FRAME, `card-env.gen.js`, `card-sprite.gen.js`)? Cite
   the lines you read.
6. List what route A drops: the items under "battle-r4b, left in place" in `<rounds>/r4/play/REQUESTS.md` (the
   Worlds lane's knockout frames for Princeton TD, Katagami and Agent Pets; the closer's credit band, result sheet,
   phone timecode and the rest). Copy the list.

**Verify**: the result document has a "Route A" section with: the validator's output, the engine diff's file list,
the four unbuilt hooks by name, the card adapter answer with file and line citations, and the dropped list.
`git -C "$R" status --short -- r3/battle | wc -l` prints the same number as before this step (you wrote nothing there).

### Step 4: Route B, measured: keep the salvage, finish the closer's check

Do not run the check. From files only:

1. Record `git -C "$R" status --short -- r3/battle | awk '{print $1}' | sort | uniq -c`.
2. From `<rounds>/r4/play/REQUESTS.md` ("battle-r4b, left in place") copy each lane's state and each open failure.
3. From `<rounds>/r3/battle/.work/battle-r4/closer/NOTES.md` copy the rate lines (12:40 and 13:06) and the "Next"
   list. Compute the full check's duration: 7,728 variants at 2.7 and at 4.7 a minute, in hours.
4. State what route B inherits: the open flash-gate failures by lane, and that a kit rebuild takes all 572
   uncommitted entries at once.

**Verify**: the "Route B" section holds the status counts, the two computed durations (about 27 and 48 hours; show
the arithmetic), and the open failures quoted with their file.

### Step 5: Route C, read: the engine first

Route C rebuilds only `engine.js` with the 26-card roster so the dock and the Battle buttons open at once, and lets
default scenes stand in for the eight until the kit lands. Answer from the shipped code, with file and line for each:

1. Does the page survive a fielded card with no `media.js` entry? Search `public/battle/shared/battle.js`,
   `public/battle/shared/runtime.js` and `public/battle/shared/hud.js` for reads of the media manifest
   (`BROADCAST_MEDIA`, `media.cards`, `mediaOf`) and report each read that would throw or print nothing for an
   unknown id.
2. Does the director fall back to a default scene for a move with no scene file? `<rounds>/r4/play/vendor/SOURCES.md:10`
   says the director bundle carries "the runtime's default scene for every kind"; find where the kit resolves a scene
   (`findCutscene`) and say what plays.
3. Would previews and sound break? The tooltip names `previews/<card>.<move id>.webm` (search
   `public/battle/shared/hud.js` for `PREVIEWS`; the line number has moved); the eight have none. The eight's sound
   cues already ship.
4. (refresh) What does a 26-card roster do to a phone under plan 009's cap of two worlds? Open the patched code (search
   `public/battle/shared/runtime.js` and `public/battle/shared/battle.js` for `kevinliu.studio phone memory`) and
   answer with `file:line`: is the cap per visit or per battle, which world is given back when a third is asked for,
   and does anything in it count or list the roster? Then say, for each route, whether fielding the eight raises what a
   phone holds at once (a battle still fields six cards) or only what it may fetch over a visit. This answer goes in
   the comparison table's "open risks" column.

Give a verdict: possible, possible with named gaps, or not possible, and say plainly that the eight would play
generic cutscenes, which falls short of Kevin's "loud".

**Verify**: the "Route C" section answers the four questions, each with at least one `file:line` you opened.

### Step 6: Design the move-id map (on paper)

Write a "Move ids and names" section:

1. Re-run the pairing to confirm the table in "Current state" still holds:
   ```sh
   node --input-type=module -e '
   import fs from "node:fs"; import vm from "node:vm";
   const eng = await import(process.cwd() + "/vendor/battle/vendor/engine.js");
   const ctx = { module: { exports: {} }, globalThis: {} }; vm.runInNewContext(fs.readFileSync("public/ex/fighters.js", "utf8"), ctx);
   const F = (Object.keys(ctx.module.exports).length ? ctx.module.exports : ctx.globalThis).FIGHTERS; let n = 0;
   for (const e of eng.FIGHTERS) { const f = F.find((x) => x.id === e.id); e.moves.forEach((m, i) => { if (m.name.toLowerCase() !== f.moves[i].name.toLowerCase()) { n++; console.log(e.id, m.id, "|", m.name, "->", f.moves[i].name); } }); }
   console.log(n, "renamed");'
   ```
2. State the rule to adopt: an engine move's `id` never changes (it keys the scene file, `sig.<card>.<id>` and
   `previews/<card>.<id>.*`); its displayed `name` and words come from the card (`r4/ex/roster/battle-roster.json`).
   Say which file would hold the map when the roster is rebuilt (`r3/battle/tools/build-data.mjs` writes
   `engine/src/roster.gen.ts`; README step 1 adopts r4/ex's roster there) and that the 12 rows above are its first
   entries.
3. List every place a name is printed during a battle so the build that follows can check them: the move button and
   tooltip (`public/battle/shared/hud.js`, `cardMoveText` at line 612), the log, and any call-out a scene file prints
   with the old name (search `$SPIKE/r3/battle/broadcast/scenes/` for each old name, for example
   `grep -rn "Column Fire" broadcast/scenes | head`). Report the hits per move.

**Verify**: the command prints `12 renamed`; the section holds the rule, the 12-row table and the per-move hit counts.

### Step 7: Write the recommendation and the questions for Kevin

Finish `~/repos/kevinliu-studio-improve/plans/results/026-battle-26-cards.md` with:

- A three-row comparison table: route, what Kevin gets and when, what it drops or inherits, machine time, open risks.
- One recommended route with the reason in two or three sentences. The recommendation must follow from the numbers
  above, not from this plan.
- "Questions for Kevin", numbered, each answerable in a word or a line. At least: (1) keep or park battle-r4b's
  finished Worlds-lane work; (2) is a day or more of machine time for the closer's check acceptable; (3) may the eight
  play default scenes for a while (route C); (4) the card's move names win over the battle's on all 12; (5) who runs
  the build (a rounds session) and when the site moves its battle pin.
- "Not done here": the four hooks, the kit rebuild, `tools/previews.mjs` for the 32 new moves, `tools/timings.mjs`,
  the site's pin move.

The document's first lines state: the date, the site commit (`4025230`), the rounds HEAD you read, and one sentence
with the recommendation, so Kevin can stop reading after the first screen.

Then append one entry to `~/repos/kevinliu-studio-dir/memory.md` in the file's existing form (look at its last two
entries): date 2026-11-10, type "spike", asked by improve plan 026, changed: nothing that ships (the result document
is `plans/results/026-battle-26-cards.md` on `improve/audit`), the recommendation in one sentence, and the open
questions' count. Commit it as "Git workflow" says.

Then delete the scratch export: `rm -rf ~/k7-rescue/improve-audit/spike-026` (look at the path first; it must be
exactly that folder).

**Verify** (use `/usr/bin/grep`; the shell's `grep` is another tool on this Mac), with
`D=~/repos/kevinliu-studio-improve/plans/results/026-battle-26-cards.md`: `/usr/bin/grep -c "^## " $D` prints 7 or
more; `/usr/bin/grep -n "Questions for Kevin" $D` prints one line;
`ls ~/k7-rescue/improve-audit/spike-026 2>&1` prints "No such file or directory".

## Revision 1 (lane D's reviewer, 2026-11-10, after the first result)

The first result recommends route C on a premise this plan gave it and the code contradicts. Correct it before
anything else, then measure what the correction makes necessary.

**The fact.** The battle page's engine is inside `kit.js`, not in `vendor/engine.js`:

- `<rounds>/r4/play/vendor/SOURCES.md:42-46`: "`vendor/broadcast/kit.js` bundles the battle's engine, runtime, the
  Broadcast grammar, effects, card module and all scene files".
- The page's scripts (`~/repos/kevinliu-studio-dir/vendor/battle/mat/index.html`) load `../vendor/broadcast/media.js`
  and `../vendor/broadcast/kit.js`; none loads `engine.js`. `public/battle/shared/battle.js:24-25` reads
  `const K = window.bcKit;` and `const sd = window.showdown;` (both set by the kit).
- `public/battle/vendor/` holds `broadcast`, `cards` and `fonts`; there is no `engine.js` under `public/`.
- `vendor/battle/vendor/engine.js` is build-only on the site (`scripts/sync.mjs:98-100`; `src/lib/cards.ts:152`
  reads the roster from it). In `public/battle/vendor/broadcast/kit.js` the string `"katagami"` occurs 12 times and
  `"ommc"` 0 times.

So rebuilding only `engine.js` opens the dock and the Battle buttons for the eight on the site, while the page's own
engine still holds 18 fighters and refuses those teams. Every route needs a rebuilt `kit.js`. Route C is therefore
redefined: **a kit rebuilt from the committed tree with the 26-card engine, in which a staged card's own scenes and
media are registered only once they pass the page flash scan; until then that card plays the default scene.** Routes A
and B keep their meaning.

Do these, in the same scratch folder as before (`~/k7-rescue/improve-audit/spike-026`, export it again with
`git archive HEAD r3/battle r3/cards r1/study-roster18 r2/plates r4/ex/roster r4/play`; nothing under `<rounds>` is
written, and no server or browser is started):

1. **Rewrite the result's Route C section, comparison table, recommendation and first lines** on the corrected fact.
   Keep what the first pass read about a fielded card with no media entry and about default scenes (it now describes a
   staged card whose scenes are not yet registered), and say plainly that it was read from code, not run. Say what
   `vendor/engine.js` is for (the site's build and r4/play's tools) and that it must be rebuilt together with the kit
   so the two rosters agree. State that the `kit.js` anchor in `scripts/phone-memory.mjs` is a risk on every route.
2. **What a clean kit rebuild takes with it besides the eight.** `r4/play/vendor/SOURCES.md` lists every file the
   shipped kit (the 11-01 build) was bundled from, each with a sha-256 prefix (12 hex characters). For each listed
   `r3/battle` and `r3/cards` path, compute the same prefix for the committed file in your export and count: same,
   different, missing. List the different ones by folder (scenes, broadcast/src, runtime, engine, other). This is the
   size of the re-check the 18 fielded cards need on any clean rebuild; put the counts in the document.
3. **Each staged card's last recorded page flash reading.** For all eight (sandbox-arena, ariadne, sigil-ui,
   dedalus-terminal, sevenfold, podium, ommc, atlas) find, in the rounds' notes (read-only: `r3/battle/.work/`,
   `r3/battle/broadcast/scenes/next/README.md`, `r3/battle-r4/` if it exists, `r4/play/REQUESTS.md`), the last page
   flash scan result for the committed scene files and, where they differ, for the working-tree files: pass or fail,
   how many rows over, the file and line. If no note records one for a card, write "no reading found" and name the
   places you searched. One table row a card.
4. **Build the kit in the export, twice, and measure it.** Copy `r4/play/.work/mat/build.mjs` inside the export and
   change only its `ROOT` constant to the export's root (it hard-codes the live rounds path and writes into
   `r4/play/vendor`; in the export that is scratch). Read the script first and confirm every path it writes is under
   the export; if any is not, do not run it and report. Put the dry run's three engine files in the export's
   `r3/battle/engine/src/` as before. Then:
   - (a) with the eight's scenes still under `scenes/next/` (not registered): run the copy; record whether it builds,
     the size of `vendor/broadcast/kit.js`, how many times `"ommc"` and `"katagami"` occur in it, and how many times
     the phone patch's anchor text occurs (the exact string is in `~/repos/kevinliu-studio-dir/scripts/phone-memory.mjs`,
     the `kit.js` entry; the site needs exactly one). Also rebuild `engine.js` with `r4/play/.work/study/bundle.mjs`
     (same `ROOT` treatment if it has one; it writes beside itself) and record that `FIGHTERS.length` is 26
     (`node --input-type=module -e 'const m=await import("<path>/engine.js");console.log(m.FIGHTERS.length)'`).
   - (b) with the 56 scene files moved up and `data/next.json` emptied, and `broadcast/tools/build.mjs` run first as
     in your first pass: the same measurements.
   Keep both outputs for the reviewer's browser run: copy each build's `r4/play/vendor/broadcast/kit.js`,
   `r4/play/vendor/broadcast/media.js`, `r4/play/vendor/engine.js` and `r4/play/vendor/cards/` to
   `~/k7-rescue/improve-audit/lane-d/kit-026/a/` and `.../b/`. If the build needs a file the export lacks, add that
   one tracked folder once; if it needs something untracked or fails twice, stop there, keep the error text, and write
   the failure into the document as a finding (it measures how far a clean kit rebuild is from running).
5. **The Arena.** The first result does not mention it. Read `r3/battle/.work/next-harness/MERGE.md` step 7 and the
   site's `public/battle/media/figures/manifest.json` and `public/battle/arena/board.js`: what does the Arena do
   today for a card whose figure is under the manifest's `next` key (or absent from its list), and what must change
   for the eight to stand on the floor? Answer with `file:line`, under Route C and in the "Not done here" list.
6. **Re-derive the recommendation** from the document's numbers after 1 to 5. It may or may not be route C. Say for
   each route what the first kit rebuild must pass before the site can take it, and give Kevin the smallest first step.
   Keep "Questions for Kevin" short and answerable; add or drop questions as the facts require.
7. Touch nothing in `~/repos/kevinliu-studio-dir` in this revision (another executor is working there, and
   `memory.md` is append-only: the first entry stays). Instead write the corrected entry's text, in the file's form and
   titled "2026-11-10: the 26-card battle routes, corrected (spike, improve plan 026)", to
   `~/k7-rescue/improve-audit/lane-d/026-memory-correction.md`: what the first entry got wrong (the page's engine is
   in `kit.js`), the new recommendation in one sentence, the measurements of steps 2 to 4, and the open questions'
   count. The reviewer appends and commits it.
8. Delete `~/k7-rescue/improve-audit/spike-026` again at the end; keep `~/k7-rescue/improve-audit/lane-d/kit-026/`.

## Test plan

No code changes, so no new tests. The checks are the document's own contents (Step 7's greps) and proof that nothing
else moved:

- Before the commit, `git -C ~/repos/kevinliu-studio-dir status --short` lists only `memory.md`; after it, nothing.
- `git -C ~/repos/kevinliu-studio-improve status --short` lists `plans/results/` (and plan files the lane's reviewer
  rewrote); you added only `plans/results/026-battle-26-cards.md`.
- `git -C "<rounds>" status --short -- r3/battle | wc -l` prints the number recorded in Step 4.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `~/repos/kevinliu-studio-improve/plans/results/026-battle-26-cards.md` exists and contains the sections "Ships
      unused today", "Route A", "Route B", "Route C", "Move ids and names", a recommendation, and "Questions for Kevin"
      (`/usr/bin/grep -c "Route [ABC]"` on it prints 3 or more).
- [ ] The "Route C" section answers question 4 (plan 009's two-world cap) with a `file:line`.
- [ ] The document quotes the validator's output from Step 3 and shows the 27 and 48 hour arithmetic.
- [ ] `improve/direction` has one new commit that touches only `memory.md`; `git status --short` in
      `~/repos/kevinliu-studio-dir` is empty.
- [ ] `git -C "<rounds>" status --short | wc -l` is unchanged from the count you recorded before Step 2.
- [ ] `~/k7-rescue/improve-audit/spike-026` no longer exists.
- [ ] `plans/README.md` is untouched (the audit session keeps it).

## STOP conditions

Stop and report back (do not improvise) if:

- `df` shows less than 31 GB available before the export (Kevin keeps 30 GB free).
- A tool in the export needs a file outside it. Add that one tracked folder to the `git archive` list once; if it then
  needs something untracked or something under `.work` that the export lacks, stop and report which file.
- `node broadcast/tools/validate.mjs` fails on the untouched export (the committed baseline is not green): report its
  output; that is itself a finding for the decision.
- Any step seems to need a write under `<rounds>`, a run of `tools/check.mjs`, or a rebuild of `kit.js` for shipping.
- `<rounds>/r3/battle`'s uncommitted entry count changes while you work (another session is writing it): finish what
  reads you can, note the time, and report.
- The 12-move table no longer matches Step 6's output.

## Maintenance notes

- This plan pairs with plan 030 (Claude of Tanks' footage), which also needs a clean place to run r3/battle's tools,
  and with plan 029 (move previews on card pages), which reads the same move ids.
- Whatever route is chosen, the site's side is a pin move in `scripts/sync.mjs` (`PIN.battle`) plus a sync from an
  export, done by the release session; `docs/battle.md` then needs its "State on 2026-11-05" section rewritten.
- A reviewer should check that the recommendation is supported by the measurements in the document and that every
  quoted line has a file and line.
- Deferred on purpose: a shareable replay link with an engine version in the address (direction finding DIR-06). It
  matters once the roster rebuild changes the numbers, because old `#log=` addresses will replay differently; raise it
  in the build that follows.
