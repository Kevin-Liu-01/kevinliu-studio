# Plan 022: Measure the battle's decoded audio across hands; if it piles up, let the last hand's card kits go

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. The lane C reviewer dispatched you and maintains
> `plans/README.md`: do not edit it. You start no server and no browser: the
> reviewer measured before (steps 1 to 3, done, recorded below) and measures
> again after your step 6; you write step 7 only when the reviewer sends you
> the after figures.
>
> This was an **investigate, then fix** plan. The investigation is done and its answer is **go**
> (`plans/results/022-sound-memory-on-phones.md`). Your part is steps 4 to 7.
>
> **Drift check (run first)**: `git -C ~/repos/kevinliu-studio-p2c diff --stat 7245c52..HEAD -- scripts/sync.mjs scripts/phone-memory.mjs public/sound/sound.js public/battle/shared/battle.js sync.lock.json docs/performance.md docs/sound.md docs/sync.md`
> It must print nothing. If any of these changed, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW (the unload); the theme question in step 8 is Kevin's decision and is not applied here
- **Depends on**: 005 and 019 (both on the lane branch: 019 is `7245c52`), 008, 009 and 018 (same `battle.js`
  entry; 018 is `f3b3474`). This plan adds its pairs after theirs.
- **Category**: perf
- **Planned at**: commit `7245c52` on lane C branch `improve/p2-battle` (base `4025230` plus plans 018 and 019),
  2026-11-10. Rounds HEAD `de54fad5`; sound pinned at `30e69931`, battle at `42ff51c7`; `r4/sound/sound.js` and
  `r4/play/shared/battle.js` are unchanged between their pins and rounds HEAD. First written against `c6245d9` on
  2026-11-09 and refreshed: the excerpts were re-read in the lane worktree and the measurement was run on a build of
  `7245c52`.

## Why this matters

Kevin, 2026-11-06: "it crashes on mobile a lot". The battle already sits near a phone's memory limit
(`docs/performance.md` records the Arena at about 400 MB of WebContent against a 500 MB budget, and "about +100 to
150 MB once a tap loads the sound kit"). Decoded audio lives in that same process, and two things in the player make
it larger than it needs to be.

1. **Card kits pile up. Measured, 2026-11-10.** Each new hand loads its six cards' sound kits (`card:<id>` groups).
   Nothing ever lets a group go. On a build of `7245c52`, Playwright Chromium with the iPhone 14 descriptor (coarse
   pointer true), three Auto hands at double speed with New Rival after each result, the player's own figure
   (`Sound.stats().pcm`, decoded bytes):

   | Moment | One-shots MB | Music MB | Total MB | Card kits fetched so far |
   | --- | --- | --- | --- | --- |
   | hand 1, kit loaded | 26.2 | 0 | 26.2 | 6 |
   | hand 1, result | 26.2 | 0 | 26.2 | 6 |
   | hand 2, kit loaded | 32.5 | 28.5 | 60.9 | 9 |
   | hand 2, result | 32.5 | 2.3 | 34.8 | 9 |
   | hand 3, kit loaded | 39.3 | 28.5 | 67.7 | 12 |
   | hand 3, result | 39.3 | 1.8 | 41.1 | 12 |

   `d` (one-shots at hand 3 loaded minus hand 1 loaded) is **13.1 MB**, against the plan's line of 3.0: **go**. Each
   New Rival hand adds its three new rival cards' kits (about 2.2 MB a card) and keeps the old ones for the rest of the
   visit. An emulated phone on a loaded Mac is not a real phone: these decoded sizes are exact (the player asks for a
   48 kHz context everywhere, so a file decodes to the same bytes on any device), but what an iPhone's process total
   does with them was not measured.
2. **iPhones always decode the whole theme.** The player streams themes through an `<audio>` element instead of
   decoding them only when `navigator.deviceMemory <= 2`. Safari does not implement `navigator.deviceMemory`, so no
   iPhone ever takes that path. Measured above: 28.5 MB while a hand plays. This plan does not change it (step 8).

This plan adds an `unload(group)` to the player and has the battle unload the card kits the new hand does not hold.

## Current state

Round code in two lanes of the design rounds repo
(`/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`): `r4/sound/sound.js` (lane r4/sound) and
`r4/play/shared/battle.js` (lane r4/play). The site ships them as `public/sound/sound.js` (site patches from plans
005 and 019) and `public/battle/shared/battle.js` (site patches from plans 008 and 018, phone patches from 009). Line
numbers below are the site copies' in the lane worktree `~/repos/kevinliu-studio-p2c` at `7245c52`; the rounds' own
numbers are in "Upstream request". Each of step 4's four anchors occurs once in the rounds export and once in the
site copy (checked 2026-11-10).

- `public/sound/sound.js:240-252`, the only way a decoded file is let go, and the player's own measure of what it
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

  `evict` is called only for music. `Sound.stats()` (`:1287`) returns `pcm: pcm()` among its fields.

- `public/sound/sound.js:253-257`, a group's load. `S.groups` remembers a loaded group; each file's record carries
  the group that first loaded it (`recOf`, `:186-190`). Line 256 carries plan 019's `.catch`:

```js
function load(group) {
  if (!group) return Promise.resolve();
  if (!S.ctx || !S.unlocked || !S.enabled) { S.wantGroups.add(group); return Promise.resolve(); }
  if (!S.m) return ensureManifest().then(() => load(group)).catch(() => { S.wantGroups.add(group); });
  if (S.groups.has(group)) return S.groups.get(group);
```

- `public/sound/sound.js:1276-1277`, the public face (the list `unload` joins):

```js
const Sound = {
  init, load, play, schedule, scene, board, music, intensity, stinger, duck, stop, setEnabled, setPage, bindToggle, unlock, panOf,
```

- `public/sound/sound.js:881-883`, the streaming path no iPhone takes:

```js
  // a device reporting 2 GB or less streams the theme through an <audio> element instead of decoding ~15 MB of PCM:
  // the whole file loops (no loop points, no laps, no Final Turns layer), and the score still ducks with the mix
  if (hasWindow && !S.offline && navigator.deviceMemory && navigator.deviceMemory <= 2) {
```

- `public/battle/shared/battle.js:202` and `:939-940`, the battle's side:

```js
let Sound = null, shotSound = null;
```

```js
  // a new hand stops the last one's sound and loads this one's six cards (a hand replaced before the import lands does nothing)
  soundReady.then((S) => { if (!S || my !== gen) return; S.stop(undefined, 120); for (const id of [...match.team, ...match.rival]) S.load(`card:${id}`); });
```

- In `public/sound/manifest.battle.json` no file of a `card:<id>` group is named by a cue of any other group
  (re-checked 2026-11-10: 0 card files shared; three `bt.whip` files are shared between `arena` and `battle`, which
  this plan never unloads), so unloading a card's group cannot take a file another group needs.
- The battle page does not put its player on `window`. It imports it as a module, so a second import of the same
  address gives the same instance: `import('/sound/sound.js').then((m) => m.default.stats().pcm)`.
- The result panel's keys are plain buttons whose text is `Rematch`, `New Rival`, `Watch Replay`
  (`public/battle/shared/battle.js:812-815`). `New Rival` starts a hand with three new rival cards. With `?auto=1` in
  the address every hand plays itself (`:1003`).
- `scripts/sync.mjs:304-328` (the sound.js entry; since plan 019 it is a many-line array that closes with `  ]),` on
  its own line, `:328`) and `:198-224` (the battle.js entry, which closes with `  ]),` at `:224` after plan 018's
  five pairs) are the two entries the fix extends. A pair is `[find, replace]`; `find` must occur exactly once
  (`patch`, `scripts/sync.mjs:156-163`); `after(add)` (`:183`) appends to the found text.
- `scripts/phone-memory.mjs:95-100`, plan 009's `PHONE` entry for `battle.js`, is applied after `TRANSFORMS`. One of
  its anchors is `"  director.stop();\n  clearTimeout(rushT); pace?.unrush();\n  match = next;\n"`, the lines just
  above the `soundReady.then` line this plan replaces; the two do not overlap. Keep every existing pair in both files
  exactly as it is.

Repo rules that apply (from `AGENTS.md`): the synced folders are never edited by hand; a fix to round code is an
anchored pair in `TRANSFORMS` in `scripts/sync.mjs`, then the sync; a phone's tab stays under its memory budget, and a
fix for it is measured before and after; append an entry to `memory.md`. Sound: nothing may be fetched or decoded
before the visitor's first gesture (plan 005); this plan changes nothing about when a load starts.

## Commands you will need

Run every command from the lane worktree, `~/repos/kevinliu-studio-p2c` (zsh on macOS: there is no `timeout`; the
shell's `grep` is ugrep, so use `/usr/bin/grep`; never name a variable `path`).

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | ends `synced from 30e69931 + 42ff51c7: 2 written, 0 removed` |
| Phone patches present | `node scripts/phone-memory.mjs --check` | six lines `has the phone patches`, exit 0 |
| Tests | `pnpm test` | `pass 10`, `fail 0` |
| Build and release guard | `pnpm build` | ends `verify-build: 256 pages, 248 sitemap URLs, 3565 files: all checks pass` |

`$HOME/k7-rescue/release-next/rounds-42ff51c7` is the export of the rounds at the shipped pins; a plain `pnpm sync`
from the live rounds folder fails by design. Dependencies are installed; do not run `pnpm install`.

## Scope

**In scope** (the only files you may modify):
- `scripts/sync.mjs` (two pairs on the sound.js entry, two on the battle.js entry)
- `public/sound/sound.js`, `public/battle/shared/battle.js` (rewritten by the sync, never by hand)
- `sync.lock.json` (rewritten by the sync)
- `docs/performance.md` (the measurement), `docs/sync.md` (one bullet), `memory.md` (one appended entry)

**Out of scope** (do NOT touch):
- Anything in the rounds folder. Never write there.
- `~/repos/kevinliu-studio-improve` (the plans and `plans/results/`): the reviewer writes there.
- The theme streaming condition (`sound.js:883`). It changes what phones hear; step 8 reports it for Kevin.
- The music's own budget (two themes at most, stingers released), the gallery's sound, `manifest.*.json`.
- Any server, browser, push, deploy, or paid or credentialed command (never `pnpm i18n:translate`).

## Git workflow

- Work in the lane worktree `~/repos/kevinliu-studio-p2c` on branch `improve/p2-battle`. Do not create a branch or a
  worktree. Never edit another checkout. Never `git stash`.
- One commit for this plan, stacked on `7245c52`, made in step 7 and not before. Commit by explicit path as the
  noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message: `perf(sound): a new hand lets the last hand's card kits go`, with a body of two or three lines (what and
  the measured figures), ending with the trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Do NOT push, open a PR or deploy.

## Steps

### Steps 1 to 3 (done by the reviewer, 2026-11-10): build, measure three hands, decide

Recorded under "Why this matters" and in `plans/results/022-sound-memory-on-phones.md`: `d` = 13.1 MB, **go**. The
measuring script is `~/k7-rescue/improve-audit/lane-c/measure-022.mjs` (the reviewer runs it; you do not).

### Step 4: Confirm the starting point and the anchors

Run the drift check from the top of this plan, then the sync check (it must print `in sync`), then:

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

### Step 5: Add the pairs to `scripts/sync.mjs`

Copy each block below into the file byte for byte (extract it from this plan file with a script rather than retyping
it; then compare).

**The sound.js entry** (it starts at the line `  'public/sound/sound.js': (t) => patch('sound.js', t, [[` and closes
with a line that is exactly `  ]),`, just above the comment `// the gallery's music loop is left out`). Add these
lines directly above that closing `  ]),`, after plan 019's last pair:

```js
    // a group's decoded files can be let go (the last hand's card kits): nothing but a faded theme ever was
    ['function evict(file) { const rec = S.files.get(file); if (rec) { rec.buf = null; S.files.delete(file); } }', after("\n/** kevinliu.studio: let a group's decoded files go (a hand's card kits when the next hand holds other cards); a later load fetches them again (scripts/sync.mjs) */\nfunction unload(group) { S.groups.delete(group); S.wantGroups.delete(group); for (const [file, rec] of [...S.files]) if (rec.group === group) { rec.buf = null; S.files.delete(file); } }")],
    ['  init, load, play, schedule, scene, board, music, intensity, stinger, duck, stop, setEnabled, setPage, bindToggle, unlock, panOf,', '  init, load, unload, play, schedule, scene, board, music, intensity, stinger, duck, stop, setEnabled, setPage, bindToggle, unlock, panOf,'],
```

**The battle.js entry** (it starts at `  'public/battle/shared/battle.js': (t) => patch('battle.js', t, [` and closes
with `  ]),` just above the comment that begins ``// `map=` is checked as the list's own key``). Add these lines
directly above that closing `  ]),`, after plan 018's last pair (the one that ends
`$('#replay').onclick = () => replayLast();"],`):

```js
    // a new hand lets the card kits of cards it does not hold go: each kit is 0.7 to 2.6 MB decoded and none was
    // ever released, so New Rival hands piled them up
    ["  soundReady.then((S) => { if (!S || my !== gen) return; S.stop(undefined, 120); for (const id of [...match.team, ...match.rival]) S.load(`card:${id}`); });", "  // kevinliu.studio: the last hand's card kits that this hand does not hold give their decoded audio back (scripts/sync.mjs)\n  soundReady.then((S) => { if (!S || my !== gen) return; S.stop(undefined, 120); const hand = new Set([...match.team, ...match.rival]); for (const id of soundCards) if (!hand.has(id)) S.unload?.(`card:${id}`); soundCards = hand; for (const id of hand) S.load(`card:${id}`); });"],
    ["let Sound = null, shotSound = null;", "let Sound = null, shotSound = null, soundCards = new Set();"],
```

**Verify**: `node --check scripts/sync.mjs` → exit 0. `git diff --stat` shows only `scripts/sync.mjs`, with 7
insertions and 0 deletions.

### Step 6: Sync, check, build

```bash
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs
T="$HOME/k7-rescue/improve-audit/lane-c"
for f in public/sound/sound.js public/battle/shared/battle.js; do cp $f "$T/kls-022-check.mjs" && node --check "$T/kls-022-check.mjs" && echo "ok $f"; done
/usr/bin/grep -c "function unload(group)" public/sound/sound.js
/usr/bin/grep -c "init, load, unload, play," public/sound/sound.js
/usr/bin/grep -c "S.unload?.(" public/battle/shared/battle.js
/usr/bin/grep -c "soundCards = new Set()" public/battle/shared/battle.js
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check
node scripts/phone-memory.mjs --check
pnpm test
pnpm build
```

**Verify**: the sync ends `2 written, 0 removed`; `ok` twice; `1`, `1`, `1`, `1`; `in sync`; six lines
`has the phone patches`; `pass 10` and `fail 0`; the build ends `all checks pass`. `git status --short` lists exactly
`scripts/sync.mjs`, `public/sound/sound.js`, `public/battle/shared/battle.js` and `sync.lock.json`.

**Then stop and report** (STATUS: COMPLETE for steps 4 to 6, nothing committed). The reviewer serves the build and
measures three hands again. The fix holds when, in the after run, one-shots at hand 3 loaded minus hand 1 loaded is
under `3.0` MB, one-shots at hand 1 loaded is within `1.0` MB of `26.2`, a group unloaded and loaded again through
the player's own face gives its bytes back and takes them again, and `/battle` with no input for 25 s still shows
`Sound.stats().files` of `0`.

### Step 7 (when the reviewer sends the after figures): Record it and commit

- `docs/performance.md`: at the end of the "Memory (phones)" section (after its last subsection), add a subsection
  `### Decoded audio across hands (2026-11-10)` with: one sentence on the method (Playwright Chromium, iPhone 14
  descriptor, coarse pointer, three Auto hands at double speed, New Rival after each result, the player's
  `Sound.stats().pcm`); the before table from "Why this matters"; the after table the reviewer sends; `d` before and
  after; the sentence "An emulated phone on a loaded Mac is not a real phone: the decoded sizes are exact, the
  process totals on an iPhone were not measured."; and one sentence that themes are still decoded whole on every
  iPhone (28.5 MB while a hand plays), which is Kevin's decision.
- `docs/sync.md`, under "Transforms", add a bullet after the `sound.js` bullet: ``- `sound.js`, `battle/shared/battle.js`: the player can unload a group, and a new hand unloads the card kits it does not hold (docs/performance.md, Memory).``
- Append an entry to `memory.md` (same shape as the entries above it: date, type perf, plan 022, files, both
  tables' key figures, open: the upstream request and the theme question). Never rewrite an older entry.

**Verify**: `/usr/bin/grep -c "Decoded audio across hands" docs/performance.md` → `1`. `git status --short` lists
exactly `scripts/sync.mjs`, `public/sound/sound.js`, `public/battle/shared/battle.js`, `sync.lock.json`,
`docs/performance.md`, `docs/sync.md`, `memory.md`. Commit them by path (see "Git workflow"). After the commit
`git status --short` prints nothing.

### Step 8 (the reviewer's report): The theme question for Kevin

No code changes for this. The lane report states `musicMB` at each moment (before run: 0, 0, 28.5, 2.3, 28.5, 1.8)
and this choice, in these words:

"Themes are decoded whole on every iPhone, because the player's low-memory path tests `navigator.deviceMemory`, which
Safari does not have. Streaming them on a touch screen (`matchMedia('(pointer: coarse)')` added to the test at
`r4/sound/sound.js:878`) would save the measured music MB on phones and lose loop points, lap changes and the Final
Turns layer there. Kevin decides."

## Upstream request (for the rounds lanes)

The executor does not write in the rounds. On a go, copy this section word for word into your final report; Kevin or
the lanes apply it. `r4/sound` has no `REQUESTS.md` (its line goes to Kevin); the play lane's log is
`r4/play/REQUESTS.md`.

`site (kevinliu-studio) -> sound: sound.js: add and export unload(group), which drops the group from S.groups and S.wantGroups and evicts every file whose record carries that group, because nothing but a faded theme was ever released and card kits piled up across hands (measured: see the site's docs/performance.md, Memory)`

`site (kevinliu-studio) -> play: shared/battle.js: start() unloads the card groups of the previous hand that the new hand does not hold before loading the new hand's, because each New Rival hand added three cards' decoded kits for the rest of the visit`

Source lines at rounds HEAD `868340d7`: `r4/sound/sound.js:237` (after `evict`), `:1270` (the `Sound` object);
`r4/play/shared/battle.js:202`, `:916`. The replacement text is the right-hand side of each pair in step 5.

## Test plan

The measurement is the test: before the fix the one-shot bytes grow hand over hand (26.2, 32.5, 39.3 MB); after it,
the third hand's figure stays within 3 MB of the first's. The reviewer also checks that a card that returns in a
later hand sounds again (its group loads again after an unload),
and that nothing is fetched before the first gesture. The syntax checks, marker counts, `pnpm test` and the release
guard cover the rest.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] Step 6's four counts are `1`; `node scripts/phone-memory.mjs --check` exits 0; `pnpm test` passes; `pnpm build` ends with `all checks pass`
- [ ] The reviewer's after run: one-shots at hand 3 loaded minus hand 1 loaded under `3.0`; hand 1 loaded within `1.0` of `26.2`; an unloaded group loads again; 0 sound files in 25 s with no input
- [ ] `docs/performance.md` holds the before table, the after table, `d` and the real-phone caveat
- [ ] One commit on `improve/p2-battle` touching only the seven in-scope files
- [ ] The lane report holds step 8's paragraph and numbers and the upstream request

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync` before your
  first edit, or the drift check prints anything.
- Any anchor in step 4 does not print `1`, or the sync stops with `patch anchor found N times` or
  `phone-memory anchor found N times`.
- The sync writes files other than the two named.
- Any existing pair in `scripts/sync.mjs` or `scripts/phone-memory.mjs` would have to change for yours to apply.

## Maintenance notes

- When a later rounds pin carries the upstream change, the anchors stop matching, the sync stops and names them, and
  these pairs are deleted in the same commit as the pin move.
- The 26-card battle makes this matter more: all 26 kits are about 54 MB decoded, and the eight new cards' kits
  already ship.
- A card that stays in the hand (your own three across a New Rival) is not unloaded, so nothing is fetched twice. A
  rival card that returns in a later hand is fetched again from the HTTP cache and decoded again.
- Found while reading, not planned: if the very first gesture on the battle is a click on the speaker key that turns
  sound off, the groups asked for at load stay in `S.wantGroups` and are not loaded when sound is turned back on
  (`setEnabled` calls `unlock()`, which loads only on the first unlock); cues then load one by one as they play.
- A reviewer should check that `unload` deletes from `S.groups`, or a later `load` of the same card would return the
  old promise and never fetch again.
