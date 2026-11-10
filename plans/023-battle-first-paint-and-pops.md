# Plan 023: Record the battle's known pops with their exact causes, fix the Arena's pads and flags, and hand the rest to the round

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. The lane C reviewer dispatched you and maintains
> `plans/README.md` and `plans/results/`: do not edit them. You start no
> server and no browser: the reviewer took the before captures (steps 1 to 3,
> done, recorded below), takes the after captures once your step 4 is in, and
> then tells you whether step 6 records a fix that ships or one that is
> reverted.
>
> This is a **spike**. Its product is evidence and a written record (`docs/performance.md` and
> `plans/results/023-battle-first-paint-and-pops.md`), one small fix that the evidence must confirm before it ships
> (the Arena's pads), and four requests for the round. It does not rebuild the battle's bundle and does not change how
> the interface hides during cutscenes.
>
> **Drift check (run first)**: `git -C ~/repos/kevinliu-studio-p2c diff --stat 4e42cd5..HEAD -- scripts/sync.mjs scripts/phone-memory.mjs public/battle/arena/board.js public/battle/shared/battle.js public/battle/mat/mat.css public/battle/arena/arena.css public/battle/shared/hud.css vendor/battle/mat/index.html src/lib/battle.ts sync.lock.json docs/performance.md docs/sync.md`
> It must print nothing. If any of these changed, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (one attribute on the Arena's pads, only on a deal; tried in a browser before this plan was refreshed)
- **Depends on**: 008 (its `public/battle/arena/board.js` entry in `scripts/sync.mjs` is where this plan's pair
  goes), 018 and 022 (same lane branch, earlier commits).
- **Category**: perf
- **Planned at**: commit `4e42cd5` on lane C branch `improve/p2-battle` (base `4025230` plus plans 018, 019 and
  022), 2026-11-10. Rounds HEAD `de54fad5`; battle pinned at `42ff51c7`; none of the round files below changed
  between the pin and rounds HEAD. First written against `c6245d9` on 2026-11-09 and refreshed: the excerpts were
  re-read in the lane worktree, the before captures were taken on a build of the lane branch, and the fix was changed
  by what they showed (see "What the before captures changed").

## Why this matters

The site's rule is "Nothing pops: a page paints whole" (`AGENTS.md`). `docs/performance.md` lists what the battle
still does against it, as things "left for the battle round", without causes:

> the 627 KB `kit.js` bundle keeps the board empty for about 2.7 s before the deal; the page is blank behind its font
> gate for up to 2 s on entry; the interface disappears after each cutscene and snaps back; the Arena shows both pads
> and labels for one frame, removes them and adds them back

Reading the round's code gives each of these a cause, to the line. Three of them need the round (a per-card bundle,
a different hide rule, a decision about the boot gate). One is one attribute: on a deal the Arena creates its pads
visible, lays the board out, and only then marks them hidden, so they fade out in front of the visitor and come back
with the first cards. This spike records all four causes with captures, ships that one fix only if the after capture
shows the pop gone and no new one in its place, and writes the other three as requests the play lane can act on.

## What the before captures changed (reviewer, 2026-11-10)

Evidence is in `~/k7-rescue/improve-audit/lane-c/023/` (`before-notes.md`; paint captures `before-*` taken with
`scripts/paint-capture.mjs` through agent-browser at 1440 x 900; `before-probe.json`, a frame-by-frame reading of
each pad's and flag's `data-on` and computed opacity from the page itself; `trial-plan.json` and `trial-deal.json`,
the two candidate fixes tried in a browser by patching `board.js` on its way to the page, with no change to the
build).

- **The pads pop; the flags do not.** In the Arena's first visible frame (`before-arena-load/f00003.jpg`) both pads
  are on the floor with no card on them; they are gone by `f00006.jpg` and the player's is back at `f00014.jpg` with
  the first card. The flags are already at opacity 0 in the first visible frame of every run, so this plan leaves
  them alone and says so in the request to the round.
- **The fix as first written fails its own test.** Creating the pads with `data-on="false"` always (the first
  version of this plan) removes the pop on a deal, but a switch from Mat to Arena in the middle of a hand then shows
  the Arena first without pads and fades them in over 0.2 s (`trial-plan.json`: opacity 0, 0.02, 0.07, 0.71, 0.94, 1
  after the switch). That is a new pop.
- **The fix this plan ships** creates the pads hidden only when the layout is mounted for a deal (`ctx.dealing`),
  which is exactly when `drawSides()` is about to mark them hidden. On a mode switch or a reload in the middle of a
  hand `ctx.dealing` is false and the pads are created as before. In the browser trial (`trial-deal.json`) the deal
  shows no pad until its side's first card, and the switch shows both pads at once.

## Current state

The battle page is round code: `r4/play` in the design rounds repo
(`/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`), lane r4/play. The site ships it under
`public/battle/` and `vendor/battle/`. Line numbers are the site copies' in the lane worktree
`~/repos/kevinliu-studio-p2c` at `4e42cd5`.

**Cause 1: on a deal the Arena's pads fade out at the reveal.**

- `public/battle/arena/board.js:200` and `:221`, inside the layout's mount. The pads are created with no `data-on`;
  the context is in hand (`this.ctx`), and `ctx.dealing` is true when the layout is mounted for a new hand
  (`public/battle/shared/battle.js:357-359`, `nextLayout(name, dealing)`; a mode switch and a resumed hand pass
  false):

```js
    this.ctx = ctx; this.host = host;
```

```js
    for (const s of SIDES) this.padG[s] = sv('g', { class: 'arena-pad', 'data-side': s }, this.groundSvg);
```

- `public/battle/arena/arena.css:110-111`, visible unless marked, with a fade:

```css
.arena-pad { --c: #999; transition: opacity .2s; }
.arena-pad[data-on="false"] { opacity: 0; }
```

- `public/battle/arena/board.js:755-767` and `:777-785`: `set(view)` shows a side's card only when it has been
  revealed or the layout is not dealing, then calls `drawSides(view)`, which is where `data-on` is first written
  (`:792`: `G.dataset.on = on ? 'true' : 'false';`). On a deal no card is shown yet, so both pads go to `false` and
  the 200 ms fade to 0 starts; `public/battle/shared/battle.js:968` un-hides the page straight after, so the fade is
  on screen. The first cards' entrance sets them back to `true`.
- The flags (`makeFlag`, `public/battle/arena/board.js:297-299`, `arena.css:185-186`) are created and marked in the
  same order, but were never seen above opacity 0 on a visible page in the reviewer's runs. This plan does not touch
  them.

**Cause 2: the interface hides and returns around every shot, not around the turn.**

- `public/battle/shared/battle.js:507` sets the attribute at each shot's start and `:547` removes it at each shot's
  end:

```js
      if (shot.variant !== 'off') app.dataset.scene = s.kind;
```

```js
      delete app.dataset.scene; delete app.dataset.landed; delete app.dataset.band;
```

- `public/battle/mat/mat.css:56` and `:202-204` (the Arena's twin is `public/battle/arena/arena.css:251-253`):

```css
.rail { position: absolute; z-index: 30; left: 0; right: 0; top: 0; height: var(--mat-y, 64px); display: flex; align-items: center; justify-content: space-between; padding: 0 24px 6px; transition: opacity .2s .25s; }
```

```css
#app[data-scene] .rail, #app[data-scene] .console { opacity: 0; transition: opacity .12s 0s; pointer-events: none; }
#app[data-busy="false"]:not([data-scene]) :is(.rail, .console) { transition-delay: 0s; }
#app[data-scene] .result { opacity: 0; }
```

  Between two shots of one batch the attribute is gone for a moment: the base rule starts fading the rail and console
  back in after 250 ms, and the next shot's attribute drops them again. After the last shot the second rule (no
  delay once the page is no longer busy) brings them back at once.

- `public/battle/shared/hud.css:366` and `:427` switch the plates, the log and the turn tab with
  `visibility ... 0s .12s`, so they snap rather than fade:

```css
#app[data-scene]:not([data-band]) .hud :is(.plate, .blog, .ttab) { visibility: hidden; transition: opacity .12s, visibility 0s .12s; }
```

**Cause 3: the first paint waits on about a megabyte of blocking scripts, then on the whole boot.**

- `vendor/battle/mat/index.html:96-108`: twelve classic scripts before the page's module, parsed in order:

```html
<script src="../../../r4/ex/fighters.js"></script>
<script src="../../../r4/ex/media.gen.js"></script>
<script src="../../../r4/ex/face.gen.js"></script>
<script src="../../../r4/ex/design/card.js"></script>
<script src="../../../r4/ex/design/plan.gen.js"></script>
<script src="../../../r4/ex/markup.js"></script>
<script src="../shared/excard.js"></script>
<script src="../vendor/cards/art.js"></script>
<script src="../vendor/cards/card-env.gen.js"></script>
<script src="../vendor/cards/card-sprite.gen.js"></script>
<script src="../vendor/broadcast/media.js"></script>
<script src="../vendor/broadcast/kit.js"></script>
<script type="module" src="../shared/battle.js"></script>
```

  On disk these twelve are 1,064 KB uncompressed: `kit.js` 627 KB, `fighters.js` 111 KB, `media.js` 103 KB,
  `media.gen.js` 63 KB, `markup.js` 52 KB, `plan.gen.js` 48 KB and six small ones. `kit.js` holds every scene and
  effect of all 18 battle cards; a battle uses six.

- `public/battle/shared/battle.js:53` registers and transforms every scene at module top level, before any battle
  starts: `install(K, engine, q.get('scenes') === 'three' ? K.SCENES.filter(...) : K.SCENES);`
- `public/battle/shared/battle.css:58` (and `mat/mat.css:40`, `arena/arena.css:28`) hide the whole page until a start
  finishes laying the board out: `html[data-boot] #app { visibility: hidden; }`. The static rail is inside `#app`.

**Cause 4: the font gate.**

- `vendor/battle/mat/index.html:10`, `:15` and `:19-21`:

```html
<link rel="preload" href="../vendor/fonts/katagami-sans-battle.woff2" as="font" type="font/woff2" crossorigin>
...
html[data-fonts] body{visibility:hidden}
...
  d.dataset.fonts = '';
  Promise.race([document.fonts.load('800 1em "Katagami Sans"'), new Promise(function (r) { setTimeout(r, 2000); })]).catch(function () {}).then(function () { delete d.dataset.fonts; });
```

  The gate hides `body` until the face loads, 2 s at most. The face is 28.8 KB and is preloaded first; the boot
  behind `data-boot` needs the megabyte of scripts above. So the gate can only lengthen the blank page when the face
  arrives after the whole boot. Step 3 measures which lifts last.

**How the site records a paint change.** `docs/performance.md`, "Checking it": serve the build, drive agent-browser,
and record with `node scripts/paint-capture.mjs "$(agent-browser get cdp-url)" <out-dir> <stop-file> [max-ms]`. The
reviewer does this; you do not. Timings from this Mac are not meaningful (its load is high); the order and count of
paints are.

**Where the site patches round code.** `scripts/sync.mjs:156-163`: a pair is `[find, replace]` in a `TRANSFORMS`
entry keyed by the synced file's path; `find` must occur exactly once. The entry for `public/battle/arena/board.js`
is at `scripts/sync.mjs:229-231` (plan 008 made it); it holds one pair and closes with `  ]),`:

```js
  'public/battle/arena/board.js': (t) => patch('board.js', t, [
    ["  const map = ctx.map && MAPS[ctx.map] ? ctx.map : HOME[ctx.leaders[1]] ?? 'atelier';", "  const map = ctx.map && Object.hasOwn(MAPS, ctx.map) ? ctx.map : HOME[ctx.leaders[1]] ?? 'atelier';"],
  ]),
```

`scripts/phone-memory.mjs` has no entry for `board.js`.

Repo rules that apply (from `AGENTS.md`): the synced folders are never edited by hand; a fix to round code is an
anchored pair in `TRANSFORMS`, then the sync; "Record a change that touches first paint with
`scripts/paint-capture.mjs` before and after"; append an entry to `memory.md`.

## Commands you will need

Run every command from the lane worktree, `~/repos/kevinliu-studio-p2c` (zsh on macOS: there is no `timeout`; the
shell's `grep` is ugrep, so use `/usr/bin/grep`; never name a variable `path`).

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | ends `synced from 30e69931 + 42ff51c7: 1 written, 0 removed` |
| Phone patches present | `node scripts/phone-memory.mjs --check` | six lines `has the phone patches`, exit 0 |
| Tests | `pnpm test` | `pass 10`, `fail 0` |
| Build and release guard | `pnpm build` | ends `verify-build: 256 pages, 248 sitemap URLs, 3565 files: all checks pass` |

Dependencies are installed; do not run `pnpm install`.

## Scope

**In scope** (the only files you may modify):
- `scripts/sync.mjs` (one pair added to the `public/battle/arena/board.js` entry)
- `public/battle/arena/board.js` (rewritten by the sync, never by hand), `sync.lock.json` (rewritten by the sync)
- `docs/performance.md` (the causes and the evidence), `docs/sync.md` (one bullet), `memory.md` (one appended entry)

**Out of scope** (do NOT touch):
- Anything in the rounds folder. Never write there. Anything under `~/repos/kevinliu-studio-improve`.
- The flags, `kit.js`, the script order in the battle page, `src/lib/battle.ts`, the font gate, `data-boot`, and the
  `[data-scene]` hide rules in `mat.css`, `arena.css`, `hud.css`. This plan writes requests for those; it does not
  change them.
- Any server, browser, push, deploy, or paid or credentialed command.

## Git workflow

- Work in the lane worktree `~/repos/kevinliu-studio-p2c` on branch `improve/p2-battle`. Do not create a branch or a
  worktree. Never edit another checkout. Never `git stash`.
- One commit for this plan, stacked on `4e42cd5`, made in step 6 and not before. Commit by explicit path as the
  noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message when the fix ships: `fix(battle): on a deal the Arena's pads start hidden instead of fading out at the reveal`,
  with a body of two or three lines (the cause, and that the battle's four known pops now have their causes in
  docs/performance.md), ending with the trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Do NOT push, open a PR or deploy.

## Steps

### Steps 1 to 3 (done by the reviewer, 2026-11-10): build, capture three moments, read them

Recorded in "What the before captures changed" and in `~/k7-rescue/improve-audit/lane-c/023/before-notes.md`:
`pads pop: yes`; 0 blank or rail-less frames on the Mat's load (first board frame `f00001.jpg`);
`switch shows pads at once: yes`; `font gate: not the last thing to lift on this run` (Arena: font 190 ms, kit
236 ms, first contentful paint 2328 ms; Mat: 102, 148 and 1160 ms).

### Step 4: Add the pads pair, sync and build

Run the drift check from the top of this plan and the sync check (`in sync`). Then confirm the anchor:

```bash
node --input-type=module <<'CHECK'
import fs from 'node:fs';
const a = "    for (const s of SIDES) this.padG[s] = sv('g', { class: 'arena-pad', 'data-side': s }, this.groundSvg);";
for (const f of [`${process.env.HOME}/k7-rescue/release-next/rounds-42ff51c7/r4/play/arena/board.js`, 'public/battle/arena/board.js']) console.log(fs.readFileSync(f, 'utf8').split(a).length - 1, f);
CHECK
```

It must print `1` twice.

In `scripts/sync.mjs`, in the `'public/battle/arena/board.js'` entry, add these three lines directly above its closing
`  ]),`, after plan 008's pair. Copy them from this plan file by script, byte for byte; do not retype them:

```js
    // on a deal the Arena made its pads visible, laid the board out, and only then marked them hidden, so they faded
    // out in front of the visitor at the reveal and came back with the first cards; on a deal they start hidden
    ["    for (const s of SIDES) this.padG[s] = sv('g', { class: 'arena-pad', 'data-side': s }, this.groundSvg);", "    for (const s of SIDES) this.padG[s] = sv('g', { class: 'arena-pad', 'data-side': s, ...(this.ctx.dealing ? { 'data-on': 'false' } : {}) }, this.groundSvg); // kevinliu.studio: on a deal the pads start hidden, as drawSides marks them a moment later (scripts/sync.mjs)"],
```

Then:

```bash
node --check scripts/sync.mjs
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs
T="$HOME/k7-rescue/improve-audit/lane-c"
cp public/battle/arena/board.js "$T/kls-023-board.mjs" && node --check "$T/kls-023-board.mjs" && echo ok
/usr/bin/grep -c "this.ctx.dealing ? { 'data-on': 'false' } : {}" public/battle/arena/board.js
/usr/bin/grep -c "Object.hasOwn(MAPS, ctx.map)" public/battle/arena/board.js
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check
node scripts/phone-memory.mjs --check
pnpm test
pnpm build
```

**Verify**: `node --check` exits 0; the sync ends `1 written, 0 removed`; `ok`; `1` (the new pair) and `1` (plan
008's pair is still there); `in sync`; six lines `has the phone patches`; `pass 10`, `fail 0`; the build ends
`all checks pass`. `git status --short` lists exactly `scripts/sync.mjs`, `public/battle/arena/board.js` and
`sync.lock.json`; `git diff --stat -- scripts/sync.mjs` shows 3 insertions and 0 deletions.

**Then stop and report** (STATUS: COMPLETE for step 4, nothing committed).

### Step 5 (the reviewer): Capture again and decide whether the fix ships

The reviewer serves your build, repeats the three captures and the frame-by-frame reading, and answers:

- (a) the Arena's load: no pad is visible before its side's first card arrives;
- (b) a switch from Mat to Arena: both pads are visible in the first frame that shows the Arena, as before;
- (c) when the first cards have arrived, both pads and both flags are there.

**The fix ships only if (a), (b) and (c) all hold.** Otherwise the reviewer tells you to revert:
`git checkout -- scripts/sync.mjs`, run the sync again (it must end `1 written, 0 removed` and `git status --short`
must then print nothing), and step 6 records "tried, reverted" with the reason the reviewer gives.

### Step 6 (when the reviewer sends the outcome): Write the record and commit

The reviewer adds a section named "Record text" to the end of this plan file with the exact text for
`docs/performance.md`, between two marker lines. Then:

- In `docs/performance.md`, replace the paragraph that begins `Left for the battle round (r4/play):` (five lines,
  just above `## Memory (phones)`) with the text between the markers, copied by script, byte for byte.
- If the fix ships, add to `docs/sync.md` under "Transforms", after the bullet that begins
  ``- `battle/shared/battle.js`, `battle/arena/board.js`: a bad address``:
  ``- `battle/arena/board.js`: on a deal the Arena's pads start hidden (`data-on="false"`), so they no longer fade out at the reveal (docs/performance.md, "The battle's pops and their causes").``
- Append an entry to `memory.md` (same shape as the entries above it: date, type fix, plan 023, files, what the
  captures showed before and after, open: the four upstream requests). Never rewrite an older entry.

**Verify**: `/usr/bin/grep -c "The battle's pops and their causes" docs/performance.md` prints at least `1`;
`/usr/bin/grep -c "Left for the battle round (r4/play):" docs/performance.md` prints `0`. `git status --short` lists
only files in scope. Commit them by path (see "Git workflow"); afterwards `git status --short` prints nothing.

## Upstream request (for the rounds lane)

The executor does not write in the rounds. The lane report carries this section word for word; Kevin or the play
lane applies it (the lane's log is `r4/play/REQUESTS.md`). Source line numbers are the rounds' own at HEAD
`de54fad5` (unchanged since `42ff51c7`).

`site (kevinliu-studio) -> play: arena/board.js: when the layout is mounted for a deal (ctx.dealing), create the pads (line 221) with data-on="false", because they are created visible, settle() lays the board out, and drawSides() only then marks them hidden, so at the reveal they fade from 1 to 0 over .2s and return with the first cards [site result: ships as a sync transform, on a deal only. Always creating them hidden was tried in a browser and rejected: a switch from Mat to Arena then shows the Arena without pads and fades them in over .2s. The flags (makeFlag, line 298) are created and marked in the same order but were at opacity 0 in the first visible frame of every run, so the site leaves them alone; the round may still want them created hidden on a deal for the same reason]`

`site (kevinliu-studio) -> play: shared/battle.js, mat/mat.css, arena/arena.css, shared/hud.css: hide the rail, console, plates, log and turn tab for the batch, not for each shot (battle.js sets data-scene at every shot's start, line 507, and deletes it at every shot's end, line 547; between two shots of one batch the base rule's .2s .25s fade-in starts and the next shot drops it again; hud.css flips visibility after .12s), because the interface flickers between the shots of a turn and snaps back after the last one [site reading: in the opening, between the two leads' entrances, the rail and console went from opacity 0 back to 1, stood for about 0.7 s and dropped to 0 again]`

`site (kevinliu-studio) -> play: vendor/broadcast/kit.js and mat/index.html: build the kit per card and register only the six cards' scenes (install() at battle.js:53 registers all 18 cards' scenes at module top level), and consider scoping data-boot to #board and .console so the static rail paints first, because twelve parser-blocking scripts (1,064 KB uncompressed, kit.js 627 KB of it) and the whole boot stand in front of the first paint`

`site (kevinliu-studio) -> play: mat/index.html: the font gate (data-fonts, 2 s cap) was not the last thing to lift in the site's local runs (Arena: font 190 ms, first contentful paint 2328 ms; Mat: font 102 ms, first contentful paint 1160 ms); it hides body while data-boot already hides #app, so it can only add blank time when the 28.8 KB preloaded face arrives after the megabyte of scripts`

## Test plan

This repo's tests (`pnpm test`) do not reach the battle page. The evidence is the paint captures and the page's own
frame-by-frame reading, before and after, read against (a), (b) and (c) in step 5. The release guard (`pnpm build`),
the sync check and the anchor counts cover the pair itself.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `~/k7-rescue/improve-audit/lane-c/023/before-notes.md` and `after-notes.md` exist (the reviewer writes them)
- [ ] `/usr/bin/grep -c "The battle's pops and their causes" docs/performance.md` prints at least `1`, and the old paragraph is gone
- [ ] If the fix ships: the sync check prints `in sync`, `/usr/bin/grep -c "this.ctx.dealing ? { 'data-on': 'false' } : {}" public/battle/arena/board.js` prints `1`, `pnpm test` passes and `pnpm build` ends with `all checks pass`
- [ ] If the fix is reverted: `git diff --stat 4e42cd5 -- public/battle scripts/sync.mjs sync.lock.json` prints nothing
- [ ] One commit on `improve/p2-battle` touching only in-scope files
- [ ] The lane report holds the four request lines

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, the sync check does not print `in sync` before your
  first edit, or the drift check prints anything.
- The anchor in step 4 does not print `1` twice, or the sync stops with `patch anchor found N times`, or the sync
  writes anything other than `public/battle/arena/board.js`.
- Plan 008's pair in the same entry would have to change for yours to apply.
- After a revert, `git status --short` still shows a synced file changed.

## Maintenance notes

- When a later rounds pin carries the upstream change, the anchor stops matching, the sync stops and names it, and
  the pair is deleted in the same commit as the pin move.
- The per-batch hide and the per-card kit are the two changes that would remove most of what a visitor sees pop.
  Both belong to the play lane and both interact with the 26-card kit rebuild (plan 026): a rebuilt kit is the moment
  to split it. `plans/results/023-battle-first-paint-and-pops.md` holds the written recommendation.
- A reviewer should open the before and after `arena-load` frames side by side rather than trust the notes.
- Times in this spike are from a loaded Mac serving itself; only the order of paints carries.

## Record text

Step 5's outcome (reviewer, 2026-11-10): (a), (b) and (c) all hold on a build of the working tree
(`~/k7-rescue/improve-audit/lane-c/023/after-notes.md`). **The fix ships.** For step 6, replace the old paragraph in
`docs/performance.md` with the lines between the two marker lines below (not the markers themselves).

<!-- record:start -->
### The battle's pops and their causes (2026-11-10)

The four things the battle still did against "nothing pops", each with its cause in the round's code (r4/play; line
numbers are the site copies'). One is fixed here; three are requests to the play lane (plan 023 and its result in
the audit's `plans/results/`). Evidence: paint captures and a frame-by-frame reading of the page, before and after,
kept in `~/k7-rescue/improve-audit/lane-c/023/`. Local numbers show order only; a Vercel preview is needed for times.

1. **The Arena's pads faded out at the reveal. Fixed by a sync transform.** On a deal the Arena created its pads
   visible (`battle/arena/board.js:221`), laid the board out, and only then marked them hidden (`drawSides`, `:792`),
   so the page was revealed with both pads on an empty floor, they faded to nothing over 0.2 s (`arena.css:110-111`)
   and came back with each side's first card. Before: the first Arena frame shows both pads, the next frames none,
   then the player's again with its card. After: the first Arena frame has no pad, and each pad arrives once, with
   its card. The pads start hidden only on a deal: creating them hidden always was tried and made a switch from Mat
   to Arena fade them in, which the shipped pair does not (the first Arena frame after the switch has both pads, as
   before). The flags are created and marked in the same order but were never seen on a visible page before their
   card, so they are left alone.
2. **The interface hides and returns around every shot, not around the turn.** `battle/shared/battle.js:507` sets
   `data-scene` at each shot's start and `:547` removes it at each shot's end; the rail and console fade out under it
   (`mat.css:202`, `arena.css:251`) and back in after 0.25 s without it (`mat.css:56`), and the plates, the log and
   the turn tab flip `visibility` after 0.12 s (`battle/shared/hud.css:366`, `:427`). In the opening, between the two
   leads' entrances, the rail and console went from opacity 0 back to 1, stood for about 0.7 s and dropped to 0
   again. Left to the round: hide for the batch, not for each shot.
3. **The first paint waits on about a megabyte of blocking scripts, then on the whole boot.** Twelve classic scripts
   stand before the page's module (`vendor/battle/mat/index.html:96-107`, 1,064 KB uncompressed, `kit.js` 627 KB of
   it, holding all 18 battle cards' scenes for a hand that uses six), `battle.js:53` registers every scene at module
   top level, and `html[data-boot] #app { visibility: hidden }` (`battle/shared/battle.css:58`) hides the page, the
   static rail included, until a start has laid the board out. Locally the Arena's first frame came 2.3 s after the
   navigation, after one black frame; the Mat's came at 1.4 s with the board already in it. Left to the round: a kit
   per card, and a boot gate that lets the rail paint first.
4. **The font gate was not what held the page.** `html[data-fonts] body { visibility: hidden }`
   (`vendor/battle/mat/index.html:15`, 2 s cap) lifts when the 28.8 KB preloaded face arrives: 190 ms on the Arena
   against a first contentful paint at 2328 ms (kit.js at 236 ms), and 102 ms against 1160 ms on the Mat (kit.js at
   148 ms). It can only add blank time when the face arrives after the scripts and the boot.

Not looked at by this spike, as recorded before: the Arena's team rail shows flat squares before the card art; at
390 the move list slides up over the active cards. The lens's Escape drops its action bar a frame before the
dissolve (`gallery.js`).
<!-- record:end -->
