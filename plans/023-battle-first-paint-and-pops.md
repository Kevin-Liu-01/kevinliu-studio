# Plan 023: Record the battle's known pops with their exact causes, fix the Arena's pads and flags, and hand the rest to the round

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> This is a **spike**. Its product is evidence and a written record (`docs/performance.md`), one small fix that the
> evidence must confirm before it ships (the Arena's pads and flags), and three requests for the round. It does not
> rebuild the battle's bundle and does not change how the interface hides during cutscenes.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs public/battle/arena/board.js public/battle/shared/battle.js public/battle/mat/mat.css public/battle/arena/arena.css public/battle/shared/hud.css vendor/battle/mat/index.html src/lib/battle.ts sync.lock.json docs/performance.md`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (the pads fix changes what a mode switch shows; step 5 decides whether it ships)
- **Depends on**: none (it adds to the `public/battle/arena/board.js` entry that plan 008 creates in
  `scripts/sync.mjs`; if 008 landed first, add this plan's pairs to that entry)
- **Category**: perf
- **Planned at**: commit `c6245d9`, 2026-11-09 (rounds HEAD `868340d7`; battle pinned at `42ff51c7`)

## Why this matters

The site's rule is "Nothing pops: a page paints whole" (`AGENTS.md`). `docs/performance.md` lists what the battle
still does against it, as things "left for the battle round", without causes:

> the 627 KB `kit.js` bundle keeps the board empty for about 2.7 s before the deal; the page is blank behind its font
> gate for up to 2 s on entry; the interface disappears after each cutscene and snaps back; the Arena shows both pads
> and labels for one frame, removes them and adds them back

Reading the round's code gives each of these a cause, to the line. Three of them need the round (a per-card bundle,
a different hide rule, a decision about the boot gate). One is two attributes: the Arena creates its pads and flags
visible, measures the board, and only then marks them hidden, so they fade out in front of the visitor and come back
with the first cards. This spike records all four causes with before captures, tries that one fix under the site's
paint-capture method, ships it only if the capture shows the pop gone and no new one in its place, and writes the
other three as requests the play lane can act on.

## Current state

The battle page is round code: `r4/play` in the design rounds repo
(`/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`), lane r4/play. None of the files below has
changed between the shipped pin `42ff51c7` and rounds HEAD `868340d7`. The site ships them under `public/battle/` and
`vendor/battle/`. Line numbers are the site copies'.

**Cause 1: the Arena's pads and flags fade out at the reveal.**

- `public/battle/arena/board.js:221` and `:297-299`, created with no `data-on`:

```js
    for (const s of SIDES) this.padG[s] = sv('g', { class: 'arena-pad', 'data-side': s }, this.groundSvg);
```

```js
  makeFlag(side) {
    const f = el('div', 'flag', this.flagsEl);
    f.dataset.side = side;
```

- `public/battle/arena/arena.css:110-111` and `:185-186`, visible unless marked, with a fade:

```css
.arena-pad { --c: #999; transition: opacity .2s; }
.arena-pad[data-on="false"] { opacity: 0; }
```

```css
.flag { --c: #999; position: absolute; left: 0; top: 0; width: 0; height: 0; transition: opacity .2s; }
.flag[data-on="false"] { opacity: 0; }
```

- `public/battle/arena/board.js:755-767`: `set(view)` first runs `settle()` (which lays the board out, measuring the
  flags while they are at opacity 1) and only at its end calls `drawSides(view)`, which is where `data-on` is first
  written (`:792`: `G.dataset.on = on ? 'true' : 'false';`, `:804`: `F.el.dataset.on = on ? 'true' : 'false';`). On a
  deal no card is shown yet, so both go to `false` and the 200 ms fade to 0 starts. `public/battle/shared/battle.js:944`
  un-hides the page straight after, so the fade is on screen. The first cards' entrance sets them back to `true`.

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
and record with `node scripts/paint-capture.mjs "$(agent-browser get cdp-url)" <out-dir> <stop-file> [max-ms]`
(`scripts/paint-capture.mjs:1-7`). It screencasts the browser's current page until `<stop-file>` exists (or `max-ms`,
default 60000), writes every frame as `f00000.jpg`, `f00001.jpg`, ... with `frames.json` (each frame's file and time
in seconds from the first frame) and creates a file named `started` in the out dir once it records. Timings from this
Mac are not meaningful (its load is high); the order and count of paints are.

**Where the site patches round code.** `scripts/sync.mjs:148-155`: a pair is `[find, replace]` in a `TRANSFORMS`
entry keyed by the synced file's path; `find` must occur exactly once. There is no entry for
`public/battle/arena/board.js` at this commit (plan 008 adds one).

Repo rules that apply (from `AGENTS.md`): the synced folders are never edited by hand; a fix to round code is an
anchored pair in `TRANSFORMS`, then the sync; "Record a change that touches first paint with
`scripts/paint-capture.mjs` before and after"; append an entry to `memory.md`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | ends `synced from 30e69931 + 42ff51c7: 1 written, 0 removed` |
| Build and release guard | `pnpm build` | ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Local serve of `dist/` | `pnpm preview --port 4397 --host 127.0.0.1` | serves the build; stop it with `pnpm exec astro preview stop` |
| Paint capture | `node scripts/paint-capture.mjs "$(agent-browser get cdp-url)" <out-dir> <stop-file> 30000` | prints `N frames over S s -> <out-dir>` |
| Browser | `agent-browser open <url>`, `wait <ms>`, `eval "<js>"`, `press <key>`, `close` | prints the result |

Keep captures outside the repo, in `$HOME/k7-rescue/improve-audit/023/` (a reboot wipes `/tmp`).

## Scope

**In scope** (the only files you may modify):
- `docs/performance.md` (always: the causes and the evidence), `memory.md` (always: one appended entry)
- Only if step 5 says the fix holds: `scripts/sync.mjs` (two pairs on the `public/battle/arena/board.js` entry),
  `public/battle/arena/board.js` (rewritten by the sync, never by hand), `sync.lock.json`, `docs/sync.md` (one bullet)

**Out of scope** (do NOT touch):
- Anything in the rounds folder. Never write there.
- `kit.js`, the script order in the battle page, `src/lib/battle.ts`, the font gate, `data-boot`, and the
  `[data-scene]` hide rules in `mat.css`, `arena.css`, `hud.css`. This plan writes requests for those; it does not
  change them.
- Any deploy. Real load times need a Vercel preview, which needs Kevin's yes; this spike records order, not times.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/023-battle-first-paint-and-pops` cut
  from `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin` then
  `git -C ~/repos/kevinliu-studio worktree add -b improve/023-battle-first-paint-and-pops ~/repos/kevinliu-studio-023 origin/main`.
  Never edit the main checkout. Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `docs: record the 11-09 release's promotion and rollback target`,
  `fix(release): wrap the lens tray inside a phone's width`. Use `docs(performance): the battle's pops and their causes`
  and, if the fix ships, `fix(battle): the Arena's pads and flags start hidden instead of fading out at the reveal`.
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Steps

### Step 1: Build and serve the unchanged site

```bash
pnpm install --frozen-lockfile
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check
pnpm build
mkdir -p "$HOME/k7-rescue/improve-audit/023"
pnpm preview --port 4397 --host 127.0.0.1 > "$HOME/k7-rescue/improve-audit/023/preview.log" 2>&1 &
for i in $(seq 1 40); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4397/battle)" = 200 ] && break; sleep 2; done
```

**Verify**: `in sync`; the build ends `all checks pass`; the server answers 200 for `/battle`.

### Step 2: Capture the three moments, before

Save this as `$HOME/k7-rescue/improve-audit/023/capture.sh`. It takes a label and records three captures into
`$HOME/k7-rescue/improve-audit/023/<label>-<name>/`: a cold Arena load, a cold Mat load, and a switch from Mat to
Arena (the `M` key) once the Mat waits for a command.

```bash
export AGENT_BROWSER_SESSION=improve-023
D="$HOME/k7-rescue/improve-audit/023"; B=http://127.0.0.1:4397; L="$1"
cap() {  # $1 = name, then the commands to run while recording
  local out="$D/$L-$1"; shift
  rm -rf "$out" "$out.stop"; mkdir -p "$out"
  node scripts/paint-capture.mjs "$(agent-browser get cdp-url)" "$out" "$out.stop" 40000 &
  local pid=$!
  for i in $(seq 1 50); do [ -e "$out/started" ] && break; sleep 0.2; done
  "$@"
  touch "$out.stop"; wait $pid
}
arena() { agent-browser open "$B/battle/arena#team=claude-of-tanks,katagami,bday-land&rival=jarhead,mailroom,cotfly&seed=30"; agent-browser wait 12000; }
mat()   { agent-browser open "$B/battle#team=claude-of-tanks,katagami,bday-land&rival=jarhead,mailroom,cotfly&seed=30"; agent-browser wait 12000; }
flip()  { agent-browser press m; agent-browser wait 5000; }
agent-browser open "$B/about"
cap arena-load arena
agent-browser open "$B/about"
cap mat-load mat
agent-browser wait 15000
cap mat-to-arena flip
agent-browser eval "JSON.stringify({ font: Math.round(performance.getEntriesByType('resource').find((e) => /katagami-sans-battle\.woff2/.test(e.name))?.responseEnd ?? -1), kit: Math.round(performance.getEntriesByType('resource').find((e) => /\/kit\.js/.test(e.name))?.responseEnd ?? -1), fcp: Math.round(performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')?.startTime ?? -1), mode: document.getElementById('app').dataset.mode ?? location.hash })"
agent-browser close
```

Run it from the worktree root: `zsh "$HOME/k7-rescue/improve-audit/023/capture.sh" before | tee "$HOME/k7-rescue/improve-audit/023/before.txt"`

**Verify**: three lines `N frames over S s -> .../before-arena-load` (and `-mat-load`, `-mat-to-arena`), each with N
of at least `5`, and one JSON line with `font`, `kit` and `fcp` all greater than `0`.

### Step 3: Read the before captures and write down what they show

For each capture folder, open `frames.json` (file and time of every frame) and look at the frames (they are JPEGs;
read them as images). Answer these, with frame file names as evidence:

1. `before-arena-load`: after the first frame that shows the Arena's floor, is there a frame where the two pads (the
   card-shaped outlines on the floor) or the two flags (name and HP on a small cloth) are visible, then a later frame
   where they are gone, then a later frame where they are back? Write `pads pop: yes` or `pads pop: no`, with the
   three frame names.
2. `before-mat-load`: how many frames show a blank or rail-less page before the board appears? Write the count and
   the first frame that shows the board.
3. `before-mat-to-arena`: are the pads and flags visible in the first frame that shows the Arena after the switch?
   Write `switch shows pads at once: yes` or `no`.
4. From the JSON line: write `font`, `kit` and `fcp` in ms. If `font` is less than `fcp` by 200 or more, write
   `font gate: not the last thing to lift on this run`; otherwise write `font gate: may be the last thing to lift`.

**Verify**: `$HOME/k7-rescue/improve-audit/023/before-notes.md` exists and holds the four answers.

### Step 4: Try the pads and flags fix

Skip this step and step 5 if step 3 answered `pads pop: no` (write that in the record and go to step 6).

Confirm the anchors, then add the pairs:

```bash
node --input-type=module <<'EOF'
import fs from 'node:fs';
const t = fs.readFileSync(`${process.env.HOME}/k7-rescue/release-next/rounds-42ff51c7/r4/play/arena/board.js`, 'utf8');
for (const a of [
  "    for (const s of SIDES) this.padG[s] = sv('g', { class: 'arena-pad', 'data-side': s }, this.groundSvg);",
  "    const f = el('div', 'flag', this.flagsEl);\n    f.dataset.side = side;",
]) console.log(t.split(a).length - 1);
EOF
```

→ `1` and `1`.

In `scripts/sync.mjs`, if there is an entry for `'public/battle/arena/board.js'`, add the two pairs to its array. If
there is none, add this entry directly after the closing `  ]),` of the `'public/battle/shared/battle.js'` entry:

```js
  // the Arena made its pads and flags visible, laid the board out, and only then marked them hidden, so they faded
  // out in front of the visitor at the reveal and came back with the first cards; they start hidden
  'public/battle/arena/board.js': (t) => patch('board.js', t, [
    ["    for (const s of SIDES) this.padG[s] = sv('g', { class: 'arena-pad', 'data-side': s }, this.groundSvg);", "    for (const s of SIDES) this.padG[s] = sv('g', { class: 'arena-pad', 'data-side': s, 'data-on': 'false' }, this.groundSvg);"],
    ["    const f = el('div', 'flag', this.flagsEl);\n    f.dataset.side = side;", "    const f = el('div', 'flag', this.flagsEl);\n    f.dataset.side = side;\n    f.dataset.on = 'false';"],
  ]),
```

Then stop the server, sync, build, serve again and capture again:

```bash
pnpm exec astro preview stop
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs
cp public/battle/arena/board.js "${TMPDIR:-/tmp}/kls-023-board.mjs" && node --check "${TMPDIR:-/tmp}/kls-023-board.mjs" && echo ok
pnpm build
pnpm preview --port 4397 --host 127.0.0.1 > "$HOME/k7-rescue/improve-audit/023/preview.log" 2>&1 &
for i in $(seq 1 40); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4397/battle)" = 200 ] && break; sleep 2; done
zsh "$HOME/k7-rescue/improve-audit/023/capture.sh" after | tee "$HOME/k7-rescue/improve-audit/023/after.txt"
```

**Verify**: `node --check scripts/sync.mjs` exits 0 before the sync; the sync ends `1 written, 0 removed`; `ok`; the
build ends `all checks pass`; three `after-*` capture folders exist.

### Step 5: Decide whether the fix ships

Read the after captures the same way and answer:

- (a) `after-arena-load`: `pads pop: no`? (The pads and flags must not be visible before the first cards arrive.)
- (b) `after-mat-to-arena`: are the pads and flags visible in the first frame that shows the Arena, as before? A new
  fade-in after the switch (the Arena visible first without pads, then pads arriving) is a new pop.
- (c) When the first cards have arrived (the last frames of `after-arena-load`), are both pads and both flags there?

**The fix ships only if (a) is no pop, (b) is "visible at once" and (c) is yes.** Otherwise revert it:
`git checkout -- scripts/sync.mjs`, run the sync again (it must end `1 written, 0 removed` and
`git status --short` must then show no synced file changed), and record what you saw. A failed (b) means the round
needs a different fix (no transition on the first draw), which goes into the request in step 6 instead.

**Verify**: `$HOME/k7-rescue/improve-audit/023/after-notes.md` exists with the three answers and the word `ships` or
`reverted`.

### Step 6: Write the record

Stop the server (`pnpm exec astro preview stop`; `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4397/`
prints `000`).

In `docs/performance.md`, replace the paragraph that begins `Left for the battle round (r4/play):` with a subsection
`### The battle's pops and their causes (<today's date>)` that holds:

- One short paragraph per cause (1 to 4 as in "Current state"), each with its file and line, and for the pads either
  "fixed by a sync transform" or "tried, reverted, because ...".
- What the captures showed (the answers from steps 3 and 5) and where they are kept
  (`~/k7-rescue/improve-audit/023/`).
- The `font`, `kit` and `fcp` numbers, with the sentence: "Local numbers show order only; a Vercel preview is needed
  for times."
- The items of the old paragraph this spike did not look at, kept word for word: the Arena's team rail showing flat
  squares before the card art; the move list sliding up over the active cards at 390; the lens's Escape dropping its
  action bar a frame before the dissolve (`gallery.js`).

If the fix ships, also add to `docs/sync.md` under "Transforms":
``- `battle/arena/board.js`: the Arena's pads and flags start hidden (`data-on="false"`), so they no longer fade out at the reveal.``

Append an entry to `memory.md` (date, type docs or fix, files, the answers, open: the upstream requests below).

**Verify**: `grep -c "The battle's pops and their causes" docs/performance.md` → `1`;
`grep -c "Left for the battle round (r4/play):" docs/performance.md` → `0`. `git status --short` lists only files in
scope. Commit them by path (two commits if the fix ships: the fix with its synced file and lock, then the docs).

## Upstream request (for the rounds lane)

The executor does not write in the rounds. Copy this section word for word into your final report, with the outcome
of step 5 filled in; Kevin or the play lane applies it (the lane's log is `r4/play/REQUESTS.md`).

`site (kevinliu-studio) -> play: arena/board.js: create the pads (line 221) with data-on="false" and the flags (makeFlag, line 298) with dataset.on = 'false', because they are created visible, settle() lays the board out, and drawSides() only then marks them hidden, so at the reveal they fade from 1 to 0 over .2s and return with the first cards [site result: ships as a sync transform | reverted because a mode switch then fades them in: the first draw needs no transition]`

`site (kevinliu-studio) -> play: shared/battle.js, mat/mat.css, arena/arena.css, shared/hud.css: hide the rail, console, plates, log and turn tab for the batch, not for each shot (battle.js sets data-scene at every shot's start, line 507, and deletes it at every shot's end, line 547; between two shots of one batch the base rule's .2s .25s fade-in starts and the next shot drops it again; hud.css flips visibility after .12s), because the interface flickers between the shots of a turn and snaps back after the last one`

`site (kevinliu-studio) -> play: vendor/broadcast/kit.js and mat/index.html: build the kit per card and register only the six cards' scenes (install() at battle.js:53 registers all 18 cards' scenes at module top level), and consider scoping data-boot to #board and .console so the static rail paints first, because twelve parser-blocking scripts (1,064 KB uncompressed, kit.js 627 KB of it) and the whole boot stand in front of the first paint`

`site (kevinliu-studio) -> play: mat/index.html: the font gate (data-fonts, 2 s cap) [was | was not] the last thing to lift in the site's local runs (font <n> ms, first contentful paint <n> ms); it hides body while data-boot already hides #app, so it can only add blank time when the 28.8 KB preloaded face arrives after the megabyte of scripts`

## Test plan

This repo has no test runner. The evidence is the paint captures (before, and after if the fix is tried), read frame
by frame against the questions in steps 3 and 5. The release guard (`pnpm build`) and the anchor counts cover the fix
itself.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `$HOME/k7-rescue/improve-audit/023/before-notes.md` exists; `after-notes.md` exists unless step 3 said `pads pop: no`
- [ ] `grep -c "The battle's pops and their causes" docs/performance.md` prints `1`
- [ ] If the fix ships: `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`, `grep -c "'data-on': 'false'" public/battle/arena/board.js` prints `1`, and `pnpm build` ends with `all checks pass`
- [ ] If the fix is reverted: `git diff --stat origin/main -- public/battle scripts/sync.mjs sync.lock.json` prints nothing
- [ ] No server is left running (`curl` to port 4397 prints `000`)
- [ ] The final report holds the four request lines with the bracketed parts filled in
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync`.
- `agent-browser get cdp-url` prints nothing, or a capture ends with `no frames`. Do not judge a pop without frames.
- A capture has fewer than five frames, or you cannot tell from the frames whether the pads are there (the frames are
  at most 960 px wide). Report which capture and stop; do not guess.
- Either anchor in step 4 does not print `1`, or the sync writes anything other than `public/battle/arena/board.js`.
- After a revert, `git status --short` still shows a synced file changed.

## Maintenance notes

- If the fix ships: when a later rounds pin carries the upstream change, the anchors stop matching, the sync stops
  and names them, and the pairs are deleted in the same commit as the pin move.
- The per-batch hide and the per-card kit are the two changes that would remove most of what a visitor sees pop.
  Both belong to the play lane and both interact with the 26-card kit rebuild (plan 026): a rebuilt kit is the moment
  to split it.
- A reviewer should open the before and after `arena-load` frames side by side rather than trust the notes.
- Times in this spike are from a loaded Mac serving itself; only the order of paints carries.
