# Plan 022: Measure the battle's decoded audio across hands; if it piles up, let the last hand's card kits go

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> This is an **investigate, then fix** plan. Steps 1 to 3 measure and decide. Steps 4 to 7 run only when step 3 says
> "go". A "no-go" with the measurements recorded is a complete, successful run of this plan.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs public/sound/sound.js public/battle/shared/battle.js sync.lock.json docs/performance.md docs/sound.md docs/sync.md`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (the unload); the theme question in step 8 is Kevin's decision and is not applied here
- **Depends on**: none (it extends the same `scripts/sync.mjs` entries as plans 005, 008, 018 and 019; if one of them
  landed first, add this plan's pairs after theirs)
- **Category**: perf
- **Planned at**: commit `c6245d9`, 2026-11-09 (rounds HEAD `868340d7`; sound pinned at `30e69931`, battle at `42ff51c7`)

## Why this matters

Kevin, 2026-11-06: "it crashes on mobile a lot". The battle already sits near a phone's memory limit
(`docs/performance.md` records the Arena at about 400 MB of WebContent against a 500 MB budget, and "about +100 to
150 MB once a tap loads the sound kit"). Decoded audio lives in that same process, and two things in the player make
it larger than it needs to be. Both are read from the code and estimated from the files' lengths; neither has been
measured in a browser, which is why this plan measures first.

1. **Card kits pile up.** Each new hand loads its six cards' sound kits (`card:<id>` groups). Nothing ever lets a
   group go. Estimated from the files (seconds x 48,000 x channels x 4 bytes): the battle kit is 15.3 MB, a mode's
   board about 1.1 MB, a card's kit 0.7 to 2.6 MB (about 54 MB for all 26), one theme 23 to 26 MB. That is about
   75 MB for a first battle and about 110 MB after a few New Rival hands.
2. **iPhones always decode the whole theme.** The player streams themes through an `<audio>` element instead of
   decoding them only when `navigator.deviceMemory <= 2`. Safari does not implement `navigator.deviceMemory`, so no
   iPhone ever takes that path.

If the measurement confirms the pile-up, this plan adds an `unload(group)` to the player and has the battle unload the
card kits the new hand does not hold. The theme question trades music quality (loop points, lap changes, the Final
Turns layer) for about 25 MB on phones; it is reported with numbers and left to Kevin.

## Current state

Round code in two lanes of the design rounds repo
(`/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`): `r4/sound/sound.js` (lane r4/sound) and
`r4/play/shared/battle.js` (lane r4/play). Neither has changed between its shipped pin and rounds HEAD `868340d7`. The
site ships them as `public/sound/sound.js` (one site patch, one added line at 275) and
`public/battle/shared/battle.js` (three site patches). Line numbers below are the site copies'.

- `public/sound/sound.js:236-248`, the only way a decoded file is let go, and the player's own measure of what it
  holds:

```js
/** Let a decoded file go (a theme after it has faded): the next request fetches it again. */
function evict(file) { const rec = S.files.get(file); if (rec) { rec.buf = null; S.files.delete(file); } }
/** Decoded PCM the player holds, in bytes (length x channels x 4), split by music and one-shots; and the bytes of
 * fetched files it holds undecoded. */
function pcm() {
  let music = 0, oneShots = 0, undecoded = 0;
  for (const rec of S.files.values()) {
    if (rec.bytes) undecoded += rec.bytes.data.byteLength;
    if (rec.buf) { const b = rec.buf.length * rec.buf.numberOfChannels * 4; if (String(rec.group).startsWith('music:')) music += b; else oneShots += b; }
  }
  return { music, oneShots, total: music + oneShots, undecoded };
}
```

  `evict` is called only for music. `Sound.stats()` (`:1281`) returns `pcm: pcm()` among its fields.

- `public/sound/sound.js:249-262`, a group's load. `S.groups` remembers a loaded group; each file's record carries
  the group that first loaded it (`recOf`, `:182-186`):

```js
function load(group) {
  if (!group) return Promise.resolve();
  if (!S.ctx || !S.unlocked || !S.enabled) { S.wantGroups.add(group); return Promise.resolve(); }
  if (!S.m) return ensureManifest().then(() => load(group));
  if (S.groups.has(group)) return S.groups.get(group);
```

- `public/sound/sound.js:1270-1271`, the public face (the list `unload` joins):

```js
const Sound = {
  init, load, play, schedule, scene, board, music, intensity, stinger, duck, stop, setEnabled, setPage, bindToggle, unlock, panOf,
```

- `public/sound/sound.js:876-879`, the streaming path no iPhone takes:

```js
  // a device reporting 2 GB or less streams the theme through an <audio> element instead of decoding ~15 MB of PCM:
  // the whole file loops (no loop points, no laps, no Final Turns layer), and the score still ducks with the mix
  if (hasWindow && !S.offline && navigator.deviceMemory && navigator.deviceMemory <= 2) {
```

- `public/battle/shared/battle.js:202` and `:915-916`, the battle's side:

```js
let Sound = null, shotSound = null;
```

```js
  // a new hand stops the last one's sound and loads this one's six cards (a hand replaced before the import lands does nothing)
  soundReady.then((S) => { if (!S || my !== gen) return; S.stop(undefined, 120); for (const id of [...match.team, ...match.rival]) S.load(`card:${id}`); });
```

- In `public/sound/manifest.battle.json` no file of a `card:<id>` group is named by a cue of any other group (checked:
  0 of 489 files are shared), so unloading a card's group cannot take a file another group needs.
- The battle page does not put its player on `window`. It imports it as a module, so a second import of the same
  address gives the same instance: `import('/sound/sound.js').then((m) => m.default.stats().pcm)`.
- The result panel's keys are plain buttons whose text is `Rematch`, `New Rival`, `Watch Replay`
  (`public/battle/shared/battle.js:809-813`). `New Rival` starts a hand with three new rival cards. With `?auto=1` in
  the address every hand plays itself (`:979`).
- `scripts/sync.mjs:262` (the sound.js entry, one long line ending `S.gestured = true;\n"]]),`) and `:190-195` (the
  battle.js entry) are the two entries the fix extends. A pair is `[find, replace]`; `find` must occur exactly once
  (`scripts/sync.mjs:148-155`); `after(add)` (`:175`) appends to the found text.

Repo rules that apply (from `AGENTS.md`): the synced folders are never edited by hand; a fix to round code is an
anchored pair in `TRANSFORMS` in `scripts/sync.mjs`, then the sync; a phone's tab stays under its memory budget, and a
fix for it is measured before and after; append an entry to `memory.md`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | ends `synced from 30e69931 + 42ff51c7: 2 written, 0 removed` |
| Build and release guard | `pnpm build` | ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Local serve of `dist/` | `pnpm preview --port 4396 --host 127.0.0.1` | serves the build; stop it with `pnpm exec astro preview stop` |
| Browser | `agent-browser open <url>`, `wait <ms>`, `eval "<js>"`, `click "<selector>"`, `close` | prints the result |

The decoded size of a file does not depend on the device (the player asks for a 48 kHz context everywhere), so the
measurement runs in agent-browser's own Chromium and holds for a phone.

## Scope

**In scope** (the only files you may modify; the last four only on a "go"):
- `docs/performance.md` (the measurement, always), `memory.md` (one appended entry, always)
- `scripts/sync.mjs` (two pairs on the sound.js entry, two on the battle.js entry)
- `public/sound/sound.js`, `public/battle/shared/battle.js` (rewritten by the sync, never by hand)
- `sync.lock.json` (rewritten by the sync)
- `docs/sync.md` (one bullet)

**Out of scope** (do NOT touch):
- Anything in the rounds folder. Never write there.
- The theme streaming condition (`sound.js:879`). It changes what phones hear; step 8 reports it for Kevin.
- The music's own budget (two themes at most, stingers released), the gallery's sound, `manifest.*.json`.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/022-sound-memory-on-phones` cut from
  `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin` then
  `git -C ~/repos/kevinliu-studio worktree add -b improve/022-sound-memory-on-phones ~/repos/kevinliu-studio-022 origin/main`.
  Never edit the main checkout. Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `perf(cards): one copy of each card's shared markup, no unused frame code, no wasted fx posters`.
  On a go: `perf(sound): a new hand lets the last hand's card kits go`. On a no-go:
  `docs: record the battle's decoded audio across three hands`.
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Steps

### Step 1: Build and serve the unchanged site

```bash
pnpm install --frozen-lockfile
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check
pnpm build
pnpm preview --port 4396 --host 127.0.0.1 > "${TMPDIR:-/tmp}/kls-022-preview.log" 2>&1 &
for i in $(seq 1 40); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4396/battle)" = 200 ] && break; sleep 2; done
```

**Verify**: `in sync`; the build ends `all checks pass`; `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4396/battle` prints `200`.

### Step 2: Measure three hands

Save this as `"${TMPDIR:-/tmp}/kls-022-measure.sh"` and run it with `zsh`. It plays three hands by themselves at
double speed, pressing New Rival after each result, and prints the player's decoded bytes at five moments.

```bash
export AGENT_BROWSER_SESSION=improve-022
B=http://127.0.0.1:4396
pcm() {  # $1 = label
  agent-browser eval "import('/sound/sound.js').then((m) => { const p = m.default.stats().pcm; window.__pcm = JSON.stringify({ oneShotsMB: +(p.oneShots / 2 ** 20).toFixed(1), musicMB: +(p.music / 2 ** 20).toFixed(1), totalMB: +(p.total / 2 ** 20).toFixed(1), undecodedMB: +(p.undecoded / 2 ** 20).toFixed(1) }); }); 1" > /dev/null
  agent-browser wait 1000 > /dev/null
  echo "$1 $(agent-browser eval "window.__pcm")"
}
result() {  # wait up to 8 minutes for the result panel
  for i in $(seq 1 96); do
    [ "$(agent-browser eval "document.getElementById('app').dataset.phase")" = '"result"' ] && return 0
    agent-browser wait 5000 > /dev/null
  done
  echo "NO RESULT after 8 minutes"; return 1
}
agent-browser open "$B/about"
agent-browser eval "localStorage.setItem('battle-speed', '2'); localStorage.removeItem('kevin-liu-studio:sound'); 1"
agent-browser open "$B/battle?auto=1#team=claude-of-tanks,katagami,bday-land&rival=jarhead,mailroom,cotfly&seed=30"
agent-browser wait 8000
agent-browser click "#app"
agent-browser wait 20000
pcm "hand1-loaded"
result && pcm "hand1-result"
agent-browser eval "[...document.querySelectorAll('#result .key')].find((b) => b.textContent === 'New Rival').click(); 1"
agent-browser wait 25000
pcm "hand2-loaded"
result && pcm "hand2-result"
agent-browser eval "[...document.querySelectorAll('#result .key')].find((b) => b.textContent === 'New Rival').click(); 1"
agent-browser wait 25000
pcm "hand3-loaded"
agent-browser eval "location.hash"
agent-browser close
```

Run it: `zsh "${TMPDIR:-/tmp}/kls-022-measure.sh" | tee "${TMPDIR:-/tmp}/kls-022-before.txt"`, then stop the server:
`pnpm exec astro preview stop`.

**Verify**: five lines `hand1-loaded {...}` to `hand3-loaded {...}`, each a JSON object with `oneShotsMB`, `musicMB`,
`totalMB`, `undecodedMB`, and `oneShotsMB` at `hand1-loaded` greater than `10` (the kit did load). The last line shows
a `rival=` different from `jarhead,mailroom,cotfly`.

### Step 3: Decide

Let `d` be `oneShotsMB` at `hand3-loaded` minus `oneShotsMB` at `hand1-loaded`.

- **Go** when `d` is `3.0` or more: card kits pile up as estimated (three new rival cards a hand, 0.7 to 2.6 MB each).
- **No-go** when `d` is under `3.0`.

Either way, add a dated paragraph to `docs/performance.md`, at the end of the "Memory (phones)" section, with the five
measured lines as a small table (moment, one-shots MB, music MB, total MB), the value of `d`, and the decision. On a
no-go: append the `memory.md` entry, commit `docs/performance.md` and `memory.md` by path, update the index row to
DONE with "no-go: measured, no pile-up", and stop here.

**Verify**: `grep -c "hand3-loaded\|hand 3" docs/performance.md` is at least `1`.

### Step 4 (go only): Confirm the anchors

```bash
node --input-type=module <<'EOF'
import fs from 'node:fs';
const R = `${process.env.HOME}/k7-rescue/release-next/rounds-42ff51c7/r4/`;
const count = (file, anchors) => { const t = fs.readFileSync(R + file, 'utf8'); for (const a of anchors) console.log(t.split(a).length - 1, file); };
count('sound/sound.js', [
  'function evict(file) { const rec = S.files.get(file); if (rec) { rec.buf = null; S.files.delete(file); } }',
  '  init, load, play, schedule, scene, board, music, intensity, stinger, duck, stop, setEnabled, setPage, bindToggle, unlock, panOf,',
]);
count('play/shared/battle.js', [
  'let Sound = null, shotSound = null;',
  "  soundReady.then((S) => { if (!S || my !== gen) return; S.stop(undefined, 120); for (const id of [...match.team, ...match.rival]) S.load(`card:${id}`); });",
]);
EOF
```

**Verify**: four lines, each starting with `1`.

### Step 5 (go only): Add the pairs to `scripts/sync.mjs`

**The sound.js entry.** If it still ends with the text `  S.gestured = true;\n"]]),` (a literal backslash and `n`),
replace only the last five characters `"]]),` with `"],` and put `  ]),` on a new line below, then add the two pairs
between them. If it already has that shape, add the two pairs directly above its closing `  ]),`:

```js
    // a group's decoded files can be let go (the last hand's card kits): nothing but a faded theme ever was
    ['function evict(file) { const rec = S.files.get(file); if (rec) { rec.buf = null; S.files.delete(file); } }', after("\n/** kevinliu.studio: let a group's decoded files go (a hand's card kits when the next hand holds other cards); a later load fetches them again (scripts/sync.mjs) */\nfunction unload(group) { S.groups.delete(group); S.wantGroups.delete(group); for (const [file, rec] of [...S.files]) if (rec.group === group) { rec.buf = null; S.files.delete(file); } }")],
    ['  init, load, play, schedule, scene, board, music, intensity, stinger, duck, stop, setEnabled, setPage, bindToggle, unlock, panOf,', '  init, load, unload, play, schedule, scene, board, music, intensity, stinger, duck, stop, setEnabled, setPage, bindToggle, unlock, panOf,'],
```

**The battle.js entry.** Inside its array, after the last existing pair and before its closing `  ]),`, add:

```js
    // a new hand lets the card kits of cards it does not hold go: each kit is 0.7 to 2.6 MB decoded and none was
    // ever released, so New Rival hands piled them up
    ["  soundReady.then((S) => { if (!S || my !== gen) return; S.stop(undefined, 120); for (const id of [...match.team, ...match.rival]) S.load(`card:${id}`); });", "  // kevinliu.studio: the last hand's card kits that this hand does not hold give their decoded audio back (scripts/sync.mjs)\n  soundReady.then((S) => { if (!S || my !== gen) return; S.stop(undefined, 120); const hand = new Set([...match.team, ...match.rival]); for (const id of soundCards) if (!hand.has(id)) S.unload?.(`card:${id}`); soundCards = hand; for (const id of hand) S.load(`card:${id}`); });"],
    ["let Sound = null, shotSound = null;", "let Sound = null, shotSound = null, soundCards = new Set();"],
```

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 6 (go only): Sync, build, measure again

```bash
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs
for f in public/sound/sound.js public/battle/shared/battle.js; do cp $f "${TMPDIR:-/tmp}/kls-022-check.mjs" && node --check "${TMPDIR:-/tmp}/kls-022-check.mjs" && echo "ok $f"; done
grep -c "function unload(group)" public/sound/sound.js
grep -c "S.unload?.(" public/battle/shared/battle.js
pnpm build
```

then serve as in step 1, run the measurement script again into `kls-022-after.txt`, and stop the server.

**Verify**: the sync ends `2 written, 0 removed`; `ok` twice; `1` and `1`; the build ends `all checks pass`. In the
after file, `oneShotsMB` at `hand3-loaded` minus `oneShotsMB` at `hand1-loaded` is under `3.0`, and `oneShotsMB` at
`hand1-loaded` is within `1.0` of the before file's (the first hand loads the same kit).
`curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4396/` prints `000` once the server is stopped.

### Step 7 (go only): Record it

- `docs/performance.md`: extend step 3's paragraph with the after table.
- `docs/sync.md`, under "Transforms", add a bullet: ``- `sound.js`, `battle/shared/battle.js`: the player can unload a group, and a new hand unloads the card kits it does not hold (docs/performance.md, Memory).``
- Append an entry to `memory.md` (date, type perf, files, both tables, open: the upstream request and the theme
  question below).

**Verify**: `git status --short` lists exactly `scripts/sync.mjs`, `public/sound/sound.js`,
`public/battle/shared/battle.js`, `sync.lock.json`, `docs/performance.md`, `docs/sync.md`, `memory.md`. Commit them by
path.

### Step 8 (always): Report the theme question for Kevin

Do not change code for this. In your final report, state `musicMB` at each of the five moments (before file) and this
choice, in these words:

"Themes are decoded whole on every iPhone, because the player's low-memory path tests `navigator.deviceMemory`, which
Safari does not have. Streaming them on a touch screen (`matchMedia('(pointer: coarse)')` added to the test at
`r4/sound/sound.js:878`) would save the measured music MB on phones and lose loop points, lap changes and the Final
Turns layer there. Kevin decides."

**Verify**: the report contains the five `musicMB` values and that paragraph.

## Upstream request (for the rounds lanes)

The executor does not write in the rounds. On a go, copy this section word for word into your final report; Kevin or
the lanes apply it. `r4/sound` has no `REQUESTS.md` (its line goes to Kevin); the play lane's log is
`r4/play/REQUESTS.md`.

`site (kevinliu-studio) -> sound: sound.js: add and export unload(group), which drops the group from S.groups and S.wantGroups and evicts every file whose record carries that group, because nothing but a faded theme was ever released and card kits piled up across hands (measured: see the site's docs/performance.md, Memory)`

`site (kevinliu-studio) -> play: shared/battle.js: start() unloads the card groups of the previous hand that the new hand does not hold before loading the new hand's, because each New Rival hand added three cards' decoded kits for the rest of the visit`

Source lines at rounds HEAD `868340d7`: `r4/sound/sound.js:237` (after `evict`), `:1270` (the `Sound` object);
`r4/play/shared/battle.js:202`, `:916`. The replacement text is the right-hand side of each pair in step 5.

## Test plan

This repo has no test runner. The measurement script is the test: before the fix it shows the one-shot bytes growing
hand over hand; after it, the third hand's figure stays within 3 MB of the first's. The syntax checks, marker counts
and the release guard cover the rest.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `docs/performance.md` holds the before table, `d` and the decision
- [ ] On a no-go: `git status --short` shows only `docs/performance.md` and `memory.md` changed, and the index row says no-go
- [ ] On a go: `node scripts/sync.mjs --check` (with `ROUNDS` set as above) prints `in sync`; `grep -c "function unload(group)" public/sound/sound.js` prints `1`; `pnpm build` ends with `all checks pass`; the after file's hand 3 minus hand 1 one-shots is under `3.0`
- [ ] The final report holds step 8's paragraph and numbers
- [ ] No server is left running (`curl` to port 4396 prints `000`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync`.
- The script prints `NO RESULT after 8 minutes` (the battle did not finish under Auto on this machine), or
  `oneShotsMB` at `hand1-loaded` is `0` (sound did not unlock: check that the click landed). Report the output; do
  not guess the numbers.
- The rival did not change after New Rival (the last line still shows `rival=jarhead,mailroom,cotfly`).
- On a go: any anchor in step 4 does not print `1`, the sync writes files other than the two named, or after the fix
  `oneShotsMB` at `hand1-loaded` drops by more than `1.0` against the before file (the unload removed something the
  first hand needs). In that last case revert `scripts/sync.mjs`, run the sync again, and report.

## Maintenance notes

- When a later rounds pin carries the upstream change, the anchors stop matching, the sync stops and names them, and
  these pairs are deleted in the same commit as the pin move.
- The 26-card battle makes this matter more: all 26 kits are about 54 MB decoded, and the eight new cards' kits
  already ship.
- A card that stays in the hand (your own three across a New Rival) is not unloaded, so nothing is fetched twice.
- Found while reading, not planned: if the very first gesture on the battle is a click on the speaker key that turns
  sound off, the groups asked for at load stay in `S.wantGroups` and are not loaded when sound is turned back on
  (`setEnabled` calls `unlock()`, which loads only on the first unlock); cues then load one by one as they play.
- A reviewer should check that `unload` deletes from `S.groups`, or a later `load` of the same card would return the
  old promise and never fetch again.
