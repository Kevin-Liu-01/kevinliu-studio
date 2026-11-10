# Plan 030: Kevin has a go or no-go for putting his October Claude of Tanks footage into the battle's moves

> **Executor instructions**: This is a spike. You test one thing in a scratch copy and write one decision document.
> Nothing ships and nothing in the design rounds is edited. Follow the steps in order. Run every verification command
> and confirm the expected result before moving on. If anything in "STOP conditions" occurs, stop and report; do not
> improvise. Do NOT edit `plans/README.md`: lane D's reviewer dispatched you and the audit session keeps the index.
>
> **Refreshed 2026-11-10 by lane D** against site commit `4025230` (lane worktree `~/repos/kevinliu-studio-dir`, branch
> `improve/direction`) and rounds HEAD `20496336`. The rounds paths this plan reads have not changed since the first
> writing; on the site only line numbers moved. Plan 026's result now exists and changes one premise (see "What plan
> 026 found", below). In this lane you write nothing in any site worktree: another executor is working in
> `~/repos/kevinliu-studio-dir`. You may read files there.
>
> **Drift check (run first)**:
> `git -C "/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30" log --oneline 20496336..HEAD -- r4/stage/cot2 r3/battle/data r3/battle/media-moves/claude-of-tanks r3/battle/broadcast/data/media.js r3/battle/broadcast/scenes r3/battle/tools/build-data.mjs r3/battle/broadcast/tools/media.py r4/play/vendor/broadcast/media.js`
> and `git -C ~/repos/kevinliu-studio-dir diff --stat 4025230..HEAD -- public/battle/vendor/broadcast/media.js public/battle/r3/media-moves/claude-of-tanks scripts/sync.mjs docs/battle.md`.
> If either prints anything, re-read the "Current state" facts against the live files before relying on them; a
> mismatch you cannot explain is a STOP condition.

## Status

- **Priority**: P3 (direction; Kevin's goal 2, and the site's strongest showing of goal 4, Claude of Tanks)
- **Effort**: S to M for the spike
- **Risk**: LOW for the spike (a scratch export; read-only on the live rounds)
- **Depends on**: none. Plan 026 (the 26-card battle routes) decides when the kit is rebuilt, which the Killcam clip
  needs; read its result if it exists (`plans/results/026-battle-26-cards.md`).
- **Category**: direction
- **Planned at**: commit `4025230` (site), rounds HEAD `20496336`, 2026-11-10 (first written at `c6245d9` and
  `868340d7`, 2026-11-09)

## Why this matters

Claude of Tanks is Kevin's fourth goal and one of the 18 cards the battle fields. Its four battle moves still play
older clips with the game's interface painted out, three of them small (518 x 332, 960 x 540, 526 x 244). On
2026-11-03 a design round filmed replacements from Kevin's own October captures and his October tanks and maps, at
1600 x 900 with no interface in frame, wrote the exact copy table, and then left them waiting: `docs/battle.md:28`
says they "go into r3/battle's media-moves with the same merge" as the 26-card roster, a merge with no date. This
spike finds out whether the clips can go in sooner, alone, without the kit rebuild, and gives Kevin a go or no-go per
clip with the evidence. If the answer is yes for three of four, the battle shows his current game weeks earlier.

## Current state

Two repositories. You read both; you write one result file in the audit worktree, a scratch folder, and a hand-over
folder for the reviewer.

- Site (read only for you): `~/repos/kevinliu-studio-dir` (Astro 7 static). The battle's files arrive from the rounds
  through `scripts/sync.mjs` at a pinned rounds commit (`PIN.battle = '42ff51c7'`, `scripts/sync.mjs:31`).
- Audit worktree: `~/repos/kevinliu-studio-improve`. You create `plans/results/030-claude-of-tanks-footage.md` there
  and commit nothing.
- Rounds repo: `/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`, called `<rounds>` below.
  `<rounds>/r3/battle` holds 572 uncommitted entries from a retired run (battle-r4b). **Never write anywhere under
  `<rounds>`, and never run a tool inside the live `<rounds>/r3/battle`.**

What the site says (`docs/battle.md:28`):

```
- Claude of Tanks' five new move videos (`r4/stage/cot2/footage`) go into r3/battle's media-moves with the same merge.
```

(The handoff's table has four move clips and one optional trait clip, five videos in all.)

What the battle plays today, from the site's shipped manifest (`public/battle/vendor/broadcast/media.js`, the
`claude-of-tanks` entry's first move; synced from `r4/play/vendor/broadcast/media.js`):

```
{"kind":"clip","cue":{"in":3550,"out":5000,"impact":3700,"unit":"ms"},"crop":null,"media":{"src":"media-moves/claude-of-tanks/cot-sabot-round-clean.mp4","kind":"video","w":518,"h":332,"dur":5500},"still":{"src":"media-moves/claude-of-tanks/sabot-round.webp","kind":"image","w":518,"h":332},"view":{"u":0.5,"v":0.63,"zoom":1.4},"burned":[{"x":0.9598, ...six painted-out boxes... }],"source":"move-media"}
```

The clips themselves are tracked in the rounds under `r3/battle/media-moves/claude-of-tanks/`
(`cot-sabot-round-clean.mp4`, `cot-killcam-clean.mp4`, `cot-one-spec-clean.mp4`, `cot-column-fire-clean.mp4` and four
`.webp` stills) and ship on the site under `public/battle/r3/media-moves/claude-of-tanks/`.

The handoff (`<rounds>/r4/stage/cot2/HANDOFF.md`, section "2b. r3/battle (for the merge run)", lines 212-232). Line 24
says "The move videos (2b) wait here for the merge run." The copy table, shortened (all sources are in
`<rounds>/r4/stage/cot2/footage/`, tracked in git; all destinations are `r3/battle/media-moves/claude-of-tanks/`
unless named):

| Step | Source | Bytes |
| --- | --- | --- |
| add | `cot-sabot-round-oct.mp4` (1600 x 900, 30 fps, 4.03 s) | 2,113,150 |
| add | `sabot-round-oct.webp` | 110,718 |
| add | `cot-killcam-xray-oct.mp4` (4.60 s) | 2,034,703 |
| add | `killcam-xray-oct.webp` | 236,876 |
| add | `killcam-victim-oct.webp` (the `thumb`) | 269,284 |
| add | `cot-one-spec-oct.mp4` (5.87 s) | 2,097,728 |
| add | `one-spec-oct.webp` | 258,626 |
| add | `cot-column-fire-oct.mp4` (4.47 s) | 2,070,938 |
| add | `column-fire-oct.webp` | 181,518 |
| optional | `cot-seeded-oct.mp4`, `seeded-oct.webp` (the trait scene plays no footage) | 2,088,018 and 155,976 |
| replace | `move-media.claude-of-tanks.json` to `r3/battle/data/move-media/claude-of-tanks.json` | 4,062 |
| edit | one line in `r3/battle/broadcast/scenes/claude-of-tanks.killcam.ts`: `const ENTRY = [684, 424];` (was `[322, 280]`, in the old 1024 px clip's pixels) | |
| rewrite | `r3/battle/MEDIA.md`, section `### claude-of-tanks` | |

The byte counts match the files on disk on 2026-11-09. The handoff adds: "New file names, so no cache serves an old
clip. Leave the `*-clean.mp4` files until the new ones are proven." and "Re-read the five scene files before merging."

The handoff's proof commands, run from `r3/battle` (lines 236-243):

```zsh
node tools/build-data.mjs
python3 -I broadcast/tools/media.py --data-only
node broadcast/tools/build.mjs && node broadcast/tools/validate.mjs     # 0 problems
PORT=<port> node tools/flashscan.mjs claude-of-tanks                      # with --outcomes crit,ko,rival, as scene.mjs gates
PORT=<port> node tools/scene.mjs claude-of-tanks.<sabot-round|killcam|one-spec|column-fire>
node broadcast/tools/thumbs.mjs && node tools/fit.mjs
```

What those tools read and write (so you know what the export must hold):

- `r3/battle/tools/build-data.mjs:13-20`: reads `r1/study-roster18/roster.json`, `r2/plates/`, and for a few cards
  (Claude of Tanks among them) media under `/Users/kevinliu/Documents/ChatGPT/Personal Website`. It writes
  `engine/src/roster.gen.ts`, `data/media.gen.json` and `data/media.gen.js`, and copies roster media into `media/`
  unless you pass `--no-copy` (its header, lines 2-3).
- `r3/battle/broadcast/tools/media.py:38-52`, the `--data-only` mode: rebuilds only `broadcast/data/media.js` from
  `data/media.gen.json`, keeps each card's shipped plate, and prints one line:
  ```python
      print(f"data/media.js: {', '.join(changed) or 'unchanged'}")
  ```
  So after the copy table it should print `data/media.js: claude-of-tanks`, and on an untouched checkout
  `data/media.js: unchanged`.

Two facts found while writing this plan that the earlier notes do not say:

1. **The page's manifest is an old copy.** `r4/play/vendor/broadcast/media.js` (what the site ships) was bundled from
   r3/battle on 2026-11-01 (`<rounds>/r4/play/vendor/SOURCES.md`, row `r3/battle/broadcast/data/media.js`
   `2026-11-01T05:17:10`). Compared on 2026-11-09, **all 18 cards' entries differ** between it and
   `r3/battle/broadcast/data/media.js` at rounds HEAD. So a regenerated r3 `media.js` cannot simply replace the page's
   copy: that would change every card's data under a kit built for the 11-01 data. Only Claude of Tanks' entry may
   move.
2. **Sound does not move.** `HANDOFF.md`, section 2d: "Nothing moves. Every new cue maps its clip's contact onto the
   scene's own impact, and the scenes' beats (feature at 560, 520, 620 and 590 ms; their impacts) are unchanged;
   r4/sound fires on those beats and reads no clip time." The cue names already match
   (`sig.claude-of-tanks.{sabot-round,killcam,one-spec,column-fire}` in `public/sound/manifest.battle.json`).

Why Killcam is different: its scene file holds a point in the clip's own pixels
(`r3/battle/broadcast/scenes/claude-of-tanks.killcam.ts:22` `const ENTRY = [322, 280];`, used at `:76` by
`kit.telestrate`). Scene files are compiled into `kit.js`, so the new Killcam clip is wrong until the kit is rebuilt.
`claude-of-tanks.one-spec.ts:26` and `:36` also hold coordinates (`at: [720, T.impact]`, `at: [250, 380]`); Step 5
finds out whether those are stage coordinates (safe) or clip pixels (not safe).

The checks that depend on a finished swap, from the tools' own headers in `<rounds>/r4/play/tools/`:

- `timings.mjs`: "Every move's timeline as the battle compiles it ... the full (first use) and short (repeat) scene's
  length and impact, from the runtime's own compileScene. Deterministic ... `node tools/timings.mjs [out.json]`"
  (needs the rounds root served on `PORT`, default 49510).
- `sound-sync.mjs`: "Sound against picture: for each scene, the hit cue whose real peak ... is nearest the frame
  where the stage's clock reaches the contact, in milliseconds ... `node tools/sound-sync.mjs [mode] [speed]`".
- `previews.mjs`: records each move's preview loop from the battle's own scene; "Resumable: a move whose webm exists
  is skipped ... `node tools/previews.mjs [card,card...]`". The site ships eight preview files for Claude of Tanks
  (`public/battle/previews/claude-of-tanks.*.webm` and `.webp`); they show the old clips until re-recorded.

**What plan 026 found** (`~/repos/kevinliu-studio-improve/plans/results/026-battle-26-cards.md`; read its first screen,
"What a clean kit rebuild takes with it besides the eight" and "Reviewer's browser run"): the battle page's engine and
every scene live inside `kit.js`; every route to 26 cards rebuilds the kit; a clean rebuild from the committed tree
changes 116 of the 186 source files of the shipped kit and needs a page flash scan of the 18 fielded cards first; and
plan 026 recommends that rebuild as the first step. So "wait for the kit" now has a shape: the Killcam clip would ride
the first 26-card kit, whose date depends on Kevin's answers to that document's questions. Use this in Step 6 ("Two
steps or one") and in the verdict; quote the 026 lines you rely on.

Vocabulary: "the kit" is `kit.js`, the bundle of the engine, runtime and every scene file; "the page's manifest" is
`r4/play/vendor/broadcast/media.js`; "the flash gate" limits bright flashes per scene.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Free disk | `df -h /System/Volumes/Data` | "Avail" at least 31 GB before the export |
| Export committed folders | `git -C "<rounds>" archive HEAD r3/battle r3/cards r1/study-roster18 r2/plates r4/stage/cot2/footage \| tar -x -C "$SPIKE"` | exit 0; about 200 MB |
| The page's manifest at the pin | `git -C "<rounds>" show 42ff51c7:r4/play/vendor/broadcast/media.js > "$SPIKE/page-media.js"` | a file of about 103 KB |
| Data build (in `$SPIKE/r3/battle`) | `node tools/build-data.mjs --no-copy` | exit 0 |
| Manifest build (same folder) | `python3 -I broadcast/tools/media.py --data-only` | prints `data/media.js: unchanged` or a list of card ids |
| Site sync check (proves the site is untouched) | run by the lane's reviewer, not by you | prints `in sync` |

`$SPIKE` is `~/k7-rescue/improve-audit/spike-030` (create it; outside both repositories; survives a reboot).

## Scope

**In scope** (the only files you create or modify):
- `~/repos/kevinliu-studio-improve/plans/results/030-claude-of-tanks-footage.md` (create): the go or no-go document.
  Do not commit it.
- Anything under `$SPIKE` (scratch; deleted in the last step).
- `~/k7-rescue/improve-audit/lane-d/cot-030/` (create): the hand-over for the reviewer's browser run (Step 4 says
  what goes in it) and `~/k7-rescue/improve-audit/lane-d/030-memory.md` (the `memory.md` entry's text; Step 7).

**Out of scope** (do NOT touch):
- Every path under `<rounds>`. In particular do not copy the clips into the live `r3/battle`, do not edit
  `claude-of-tanks.killcam.ts`, and do not run `build-data.mjs`, `media.py`, `build.mjs` or any check there.
- The site's synced folders, `scripts/sync.mjs` and the battle pin. Shipping the clips is a pin move by the release
  session, after Kevin says go.
- Rebuilding `kit.js`. Recording new previews. Running the flash gate. They belong to the build that follows.
- The card's own picture and loop (`HANDOFF.md` section 2a): Kevin kept today's card on 2026-11-03 ("this left onnne
  is better"). This plan is only about the four move clips.

## Git workflow

- You make no commit and touch no git state anywhere. The reviewer appends your `memory.md` text to the lane worktree
  (`~/repos/kevinliu-studio-dir`, branch `improve/direction`) and commits it; the audit session commits the result
  file.
- Never `git stash`. Do NOT push, open a PR or deploy.

## Steps

### Step 1: Export the committed battle and the footage into scratch

```sh
df -h /System/Volumes/Data            # Avail must be 31 GB or more
SPIKE=~/k7-rescue/improve-audit/spike-030; mkdir -p "$SPIKE"
R="/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30"
git -C "$R" status --short -- r4/stage/cot2 r3/battle/data r3/battle/media-moves | wc -l    # write this number down
git -C "$R" archive HEAD r3/battle r3/cards r1/study-roster18 r2/plates r4/stage/cot2/footage | tar -x -C "$SPIKE"
git -C "$R" show 42ff51c7:r4/play/vendor/broadcast/media.js > "$SPIKE/page-media.js"
cp "$SPIKE/r3/battle/broadcast/data/media.js" "$SPIKE/r3-media.before.js"
```

**Verify**: `ls "$SPIKE/r4/stage/cot2/footage"/*.mp4 | wc -l` prints `5`;
`wc -c < "$SPIKE/r4/stage/cot2/footage/cot-sabot-round-oct.mp4"` prints `2113150`;
`wc -c < "$SPIKE/page-media.js"` prints a number near 103000.

### Step 2: Prove the tools are quiet on the untouched export

```sh
cd "$SPIKE/r3/battle"
node tools/build-data.mjs --no-copy
python3 -I broadcast/tools/media.py --data-only
```

**Verify**: the last command prints `data/media.js: unchanged`. If it prints card ids instead, the committed data and
the committed manifest are already out of step: record the ids in the result document as a finding, copy the file it
just wrote over `"$SPIKE/r3-media.before.js"` (so the next comparison isolates the footage), and continue. If either
command fails, see STOP conditions.

### Step 3: Apply the handoff's copy table in the export

```sh
F="$SPIKE/r4/stage/cot2/footage"; D="$SPIKE/r3/battle/media-moves/claude-of-tanks"
cp "$F"/cot-sabot-round-oct.mp4 "$F"/sabot-round-oct.webp "$F"/cot-killcam-xray-oct.mp4 "$F"/killcam-xray-oct.webp "$F"/killcam-victim-oct.webp "$F"/cot-one-spec-oct.mp4 "$F"/one-spec-oct.webp "$F"/cot-column-fire-oct.mp4 "$F"/column-fire-oct.webp "$D"/
cp "$SPIKE/r3/battle/data/move-media/claude-of-tanks.json" "$SPIKE/move-media.before.json"
cp "$F/move-media.claude-of-tanks.json" "$SPIKE/r3/battle/data/move-media/claude-of-tanks.json"
cd "$SPIKE/r3/battle" && node tools/build-data.mjs --no-copy && python3 -I broadcast/tools/media.py --data-only
```

Do not make the Killcam `ENTRY` edit: scene files do not reach `media.js`, and Step 5 handles it.

**Verify**: the last command prints exactly `data/media.js: claude-of-tanks`. Any other card id in that line is a
STOP condition.

### Step 4: Show what changed, and splice it into the page's manifest

Run this from `$SPIKE` (it reads three files and writes two):

```sh
cd "$SPIKE" && node -e '
const fs=require("fs");const cut=(f)=>{const t=fs.readFileSync(f,"utf8");return JSON.parse(t.slice(t.indexOf("=")+1).trim().replace(/;$/,""));};
const before=cut("r3-media.before.js"),after=cut("r3/battle/broadcast/data/media.js"),page=cut("page-media.js");
const ch=Object.keys(after).filter(k=>JSON.stringify(after[k])!==JSON.stringify(before[k]));
console.log("r3 entries changed by the footage:",ch.join(", "));
const id="claude-of-tanks",fields=Object.keys(after[id]).filter(k=>JSON.stringify(after[id][k])!==JSON.stringify(before[id][k]));
console.log("fields of its entry that changed:",fields.join(", "));
console.log("page entry equals the r3 entry before the footage:",JSON.stringify(page[id])===JSON.stringify(before[id]));
for(const k of Object.keys(page[id]))if(JSON.stringify(page[id][k])!==JSON.stringify(before[id][k]))console.log("  page differs from r3-before in field:",k);
const spliced={...page,[id]:{...page[id],...Object.fromEntries(fields.map(k=>[k,after[id][k]]))}};
const text=fs.readFileSync("page-media.js","utf8");const head=text.slice(0,text.indexOf("=")+1);
fs.writeFileSync("page-media.spliced.js",head+" "+JSON.stringify(spliced)+";\n");
fs.writeFileSync("cot-entry.diff.json",JSON.stringify({before:page[id],after:spliced[id]},null,1));
console.log("other cards untouched in the splice:",Object.keys(page).filter(k=>k!==id).every(k=>JSON.stringify(page[k])===JSON.stringify(spliced[k])));
for(const m of spliced[id].moves)console.log(m.media&&m.media.src,JSON.stringify(m.cue),m.media&&(m.media.w+"x"+m.media.h));'
```

Then check that the site's three anchored patches on this file still match the spliced copy exactly once each (they
are in `~/repos/kevinliu-studio-dir/scripts/sync.mjs:233-235`):

```sh
node -e '
const t=require("fs").readFileSync(process.argv[1],"utf8");
for(const a of [`"card":{"src":"media/elo/card-elo-hub.png","kind":"image","w":2880,"h":1800}`,`"card":{"src":"media/turboslide/ts-hero-agents-repo.webp","kind":"image","w":2560,"h":1280}`,`"src":"media/prototemplate/pt-every-sentence.mp4"`])console.log(t.split(a).length-1,a.slice(0,50));' "$SPIKE/page-media.spliced.js"
```

Copy `cot-entry.diff.json`'s contents into the result document under "The change to the page's manifest".

Hand-over for the reviewer's browser run (the reviewer puts the new clips and the new entry into a copy of the site's
build and watches the four moves play under today's kit): copy into `~/k7-rescue/improve-audit/lane-d/cot-030/` the
files `cot-entry.diff.json` and `page-media.spliced.js`, and, in a subfolder `media-moves/claude-of-tanks/`, the nine
files Step 3 copied (the four `-oct.mp4` clips and the five `.webp` stills).

**Verify**: the first script prints `r3 entries changed by the footage: claude-of-tanks`, lists the changed fields
(expect `moves`; record whatever it prints), prints `other cards untouched in the splice: true`, and its last lines
name the four `-oct.mp4` clips at `1600x900`. The second script prints `1` three times. Record the line
"page entry equals the r3 entry before the footage" as printed, true or false; if false, the fields it lists are a
finding (the page's Claude of Tanks entry already differs from r3's for reasons other than the footage).

### Step 5: Decide, per clip, whether it needs the kit

Read the five scene files in the export, whole:
`$SPIKE/r3/battle/broadcast/scenes/claude-of-tanks.{sabot-round,killcam,one-spec,column-fire,trait}.ts`. For each
move, answer three questions in the result document, each with a `file:line`:

1. Does the scene hold any number in the clip's own pixels or the clip's own time (a point like `ENTRY`, a crop, a
   time offset into the clip)? `grep -n "ENTRY\|at: \[\|crop\|clipMs\|seek" <file>` is a start; read around each hit
   and say whether the coordinates are the stage's (1920 x 1080 design space or stage units) or the clip's.
2. Does the scene read its cue, view and media from the manifest (so the new values in Step 4 are enough)?
3. Verdict: "data only" (ships with the manifest and the files) or "needs the kit" (a scene edit, so it waits for a
   `kit.js` rebuild).

Killcam is known to need the kit (`claude-of-tanks.killcam.ts:22`, the `ENTRY` edit). State what the other three are.

**Verify**: the result document has a four-row table (Sabot Round, Killcam, One Spec, 14 v 14 / `column-fire`) with a
verdict and at least one `file:line` each, and Killcam's row says "needs the kit".

### Step 6: List the re-measurement the build must run, and what the site needs

Write these sections in the result document. Do not run the tools.

- "Checks at the build", in order, each with its command and what it proves, from the handoff's proof block and the
  tool headers quoted in "Current state": `node broadcast/tools/build.mjs && node broadcast/tools/validate.mjs`
  (0 problems); `PORT=<port> node tools/flashscan.mjs claude-of-tanks` (the flash gate; the handoff says the clips'
  pre-check passes on the encoded files and "the scene gate still has to run at the merge");
  `PORT=<port> node tools/scene.mjs claude-of-tanks.<move>`; then in `r4/play`: `node tools/timings.mjs` (the scenes'
  compiled length and impact; expect the scene impacts unchanged, because the handoff says the beats are unchanged),
  `node tools/sound-sync.mjs mat 1` and `arena` (hit cue against the contact frame, in ms), and
  `node tools/previews.mjs claude-of-tanks` after removing its eight existing preview files (the tool skips a move
  whose `.webm` exists).
- "What the site needs": the nine new files are tracked files under `r3/battle/media-moves/claude-of-tanks/`, which
  the battle stage of `scripts/sync.mjs` ships to `public/battle/r3/media-moves/claude-of-tanks/` only from the
  pinned commit. So shipping means: the clips and the spliced manifest committed in the rounds by the battle's lane,
  `PIN.battle` moved to that commit, a sync from an export, `pnpm build`, and the re-recorded previews in the same
  pin. About 9.4 MB of new media; the old `*-clean.mp4` files (about what they weigh today:
  `du -sh ~/repos/kevinliu-studio-dir/public/battle/r3/media-moves/claude-of-tanks`) stay until the new ones are proven,
  then leave.
- "Two steps or one": shipping three clips now and Killcam with the kit means two rounds of checks; waiting means one,
  with the old clips in place until the 26-card rebuild. State both plainly.

**Verify**: `/usr/bin/grep -c "tools/" ~/repos/kevinliu-studio-improve/plans/results/030-claude-of-tanks-footage.md` prints 6 or more.

### Step 7: Write the verdict and clean up

Finish `~/repos/kevinliu-studio-improve/plans/results/030-claude-of-tanks-footage.md` with, at the top (after a line
giving the date, the site commit and the rounds HEAD you read), one line per clip: **GO now**, **GO with the
kit**, or **NO-GO**, and the single reason. Then "Questions for Kevin": (1) ship three now and Killcam later, or all
four with the kit; (2) drop the old `*-clean.mp4` files once the new ones are live; (3) is the optional trait clip
(`cot-seeded-oct.mp4`) wanted anywhere. Then "Findings along the way" (Step 2's and Step 4's surprises, if any).

Write the `memory.md` entry's text to `~/k7-rescue/improve-audit/lane-d/030-memory.md` in the form of the last
entries of `~/repos/kevinliu-studio-dir/memory.md` (read them; do not edit that file): date 2026-11-10, type "spike",
asked by improve plan 030, changed: nothing that ships (the result document is
`plans/results/030-claude-of-tanks-footage.md` on `improve/audit`), the verdict per clip in one line, what you
measured, and the open questions' count.

Delete the scratch export: `rm -rf ~/k7-rescue/improve-audit/spike-030` (look at the path first; it must be exactly
that folder). Keep `~/k7-rescue/improve-audit/lane-d/cot-030/`.

**Verify** (use `/usr/bin/grep`): `head -14 ~/repos/kevinliu-studio-improve/plans/results/030-claude-of-tanks-footage.md | /usr/bin/grep -c "GO"`
prints 4 or more; `ls ~/k7-rescue/improve-audit/spike-030 2>&1` prints "No such file or directory";
`ls ~/k7-rescue/improve-audit/lane-d/cot-030/media-moves/claude-of-tanks | wc -l` prints `9`;
`git -C "<rounds>" status --short -- r4/stage/cot2 r3/battle/data r3/battle/media-moves | wc -l` prints the number it
printed before Step 1 (other sessions write elsewhere in the rounds, so compare these paths, not the whole tree).

## Revision 1 (lane D's reviewer, 2026-11-10, after the Step 2 stop)

Step 2 stopped correctly: `tools/build-data.mjs --no-copy` needs
`r1/study-roster18/turboslide/media/ts-perfect-export.webp`, which exists in the live rounds but is not tracked. The
rounds' `.gitignore` leaves most media out of git on purpose (lines 5 to 14: `*.png`, `*.jpg`, `*.webp`, `*.mp4` and
more), so a committed-only export can never run the data build: `git status --short --ignored -- r1/study-roster18
r2/plates` lists 357 ignored entries and no modified or untracked one. That is a finding for the result document
("Findings along the way"): the build that ships the footage must run in a full checkout, not from a `git archive`.

The plan's "tracked only" rule existed to keep battle-r4b's uncommitted work out of the experiment. Ignored media in
`r1` and `r2` is not that work. So, to continue:

1. Replace the export's two input folders with copy-on-write clones of the live ones (APFS clones: instant, no extra
   disk, and nothing the tools do can reach the live rounds):
   ```sh
   SPIKE=~/k7-rescue/improve-audit/spike-030; R="/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30"
   git -C "$R" status --short -- r1/study-roster18 r2/plates | wc -l     # must print 0: the tracked files there are the committed ones
   rm -rf "$SPIKE/r1/study-roster18" "$SPIKE/r2/plates"
   cp -Rc "$R/r1/study-roster18" "$SPIKE/r1/study-roster18"
   cp -Rc "$R/r2/plates" "$SPIKE/r2/plates"
   ```
   If the first command does not print `0`, stop and report.
2. Run Step 2 again. If a tool then names a missing file under `r3/battle` or `r3/cards`, look at it in the live
   rounds with `git -C "$R" status --short --ignored -- <that file>`: if its status is `!!` (ignored, so not part of
   battle-r4b's modified or untracked work), copy that one file into the same place in the export and note it; if its
   status is `??` or ` M`, or more than ten such files are needed, stop and report. Never copy a whole folder from
   `r3/battle`.
3. Continue with Steps 3 to 7 as written. In the result document, list every untracked input you brought in and say
   plainly that the experiment used committed code and data with git-ignored media from the live folders.

## Test plan

No code changes, so no new tests. The spike's own checks are its evidence:

- Step 2: the tools change nothing on an untouched export (`data/media.js: unchanged`).
- Step 3: the footage changes exactly one card (`data/media.js: claude-of-tanks`).
- Step 4: the splice leaves the other 17 cards byte-equal and the site's three patch anchors still match once.
- The rounds repo's status count for the paths this plan reads is the same before and after; the reviewer confirms
  the site's sync check still says `in sync`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `~/repos/kevinliu-studio-improve/plans/results/030-claude-of-tanks-footage.md` exists; its first 14 lines give
      a verdict for each of the four clips; it contains the manifest diff from Step 4, the four-row scene table from Step 5, "Checks at the build",
      "What the site needs" and "Questions for Kevin".
- [ ] The document records Step 2's and Step 3's printed lines verbatim.
- [ ] You changed nothing in any site worktree and made no commit.
- [ ] The rounds' status count for `r4/stage/cot2`, `r3/battle/data` and `r3/battle/media-moves` equals the count
      from before Step 1.
- [ ] `~/k7-rescue/improve-audit/spike-030` no longer exists; `~/k7-rescue/improve-audit/lane-d/cot-030/` holds the
      hand-over and `~/k7-rescue/improve-audit/lane-d/030-memory.md` exists.
- [ ] `plans/README.md` is untouched.

## STOP conditions

Stop and report back (do not improvise) if:

- `df` shows less than 31 GB available before the export.
- `node tools/build-data.mjs --no-copy` or `media.py --data-only` fails in the export. Report the error. If it names a
  missing file, add that one tracked folder to the `git archive` list and try once more; if it needs
  `/Users/kevinliu/Documents/ChatGPT/Personal Website` and that folder is missing, or anything untracked, stop.
- Step 3 prints any card id other than `claude-of-tanks`.
- Step 4 prints `other cards untouched in the splice: false`, or an anchor count other than `1`.
- A byte count in Step 1 differs from the table in "Current state" (the footage changed since the handoff).
- Any step seems to need a write under `<rounds>`, a kit rebuild, or a change to the site's synced files or pins.
- The rounds repo's status count changes for paths under `r4/stage/cot2` or `r3/battle/data` while you work.

## Maintenance notes

- The result of this spike feeds plan 026's decision: if Kevin picks a route that rebuilds the kit soon, shipping all
  four clips with it is one round of checks instead of two.
- After the swap ships, `docs/battle.md:28` is out of date and its line should be rewritten in the same release, and
  `r3/battle/MEDIA.md`'s `### claude-of-tanks` section rewritten in the rounds (the handoff's last table row).
- Media under `/battle/` is cached for a day (`vercel.json`); the new clips have new names, so no visitor is served an
  old clip under a new manifest.
- Plan 029 (move previews on card pages) shows `claude-of-tanks.sabot-round`, `.killcam` and `.one-spec` previews on
  the card's page; they keep showing the old clips until `tools/previews.mjs` re-records them.
- A reviewer should check that the verdicts follow from Step 5's `file:line` evidence and that the manifest diff
  touches only the `claude-of-tanks` entry.
