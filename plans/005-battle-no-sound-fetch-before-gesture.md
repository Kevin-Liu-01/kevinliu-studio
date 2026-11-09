# Plan 005: The battle fetches no sound file before the visitor's first gesture

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs public/sound/sound.js sync.lock.json docs/sound.md docs/sync.md`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c6245d9`, 2026-11-09 (rounds HEAD `868340d7`; sound pinned at `30e69931`)

## Why this matters

The site's sound policy (`docs/sound.md`) says: "Nothing but the player and its manifest is fetched before the first
gesture." On `/battle` that is not true. With no click, key or touch and no `?auto=1`, a local serve of the production
build fetched 10 files under `/sound/out/` in 25 seconds (the deal, a card flip, the scene's bars and pop-up, two card
entrances). They are downloaded and decoded, and none of them can play, because the browser keeps the audio context
suspended until a gesture. The last release fixed the large case (about 240 files) and left this one.

The cause is one line of the sound player. On the battle page the player makes its `AudioContext` at load
(`resumeAtLoad`), so `S.ctx` exists while `S.unlocked` is still false. `playCue` only stops when there is no context, so
every cue the battle plays before a gesture goes on to fetch its file. After this plan, a cue asked for while the
context is not unlocked returns at once and fetches nothing. The fanfare path (`stinger`) gets the same guard.

Why the first press still sounds, on both pages: the player listens for the first gesture in the capture phase, so
`unlock(e)` runs before any handler of the page and sets `S.unlocked = true` synchronously. The press's own handler
then calls `play`, which finds the context unlocked and behaves exactly as today. On the home page the context does
not exist before a gesture at all, so today's code already returns there; nothing changes.

## Current state

The root cause is round code: `r4/sound/sound.js` in the design rounds repo
(`/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`), lane r4/sound. The file has not changed
between the shipped pin `30e69931` and rounds HEAD `868340d7`. The site ships it as `public/sound/sound.js` with one
site patch already applied by `scripts/sync.mjs` (the line marked `kevinliu.studio` below). Line numbers here are the
site copy's; the rounds file's are one lower after line 274.

- `public/sound/sound.js:457-476`, the cue path. Line 462 is the bug: with a context but no unlock it carries on to
  `loadFile` on line 474.

```js
function playCue(id, c, o) {
  const key = o.key ? `${id}|${o.key}` : id;
  const t = performance.now();
  const prior = S.last.get(key);
  if (!o.force && prior && t - prior.at < (o.cooldownMs ?? c.cooldownMs ?? 60)) { S.stats.drops.cooldown++; return null; }
  if (!S.ctx || !S.unlocked) { unlock(); if (!S.ctx) return null; }
  const k = pickVariant(id, c, o);
  ...
    if (!o.at && !o.atMs) S.pending.push({ id, c, k, o, file, any: o.variant === undefined && c.files.length > 1 ? c.files : null, t: o._t ?? t });
    loadFile(file, c.group, o.at || o.atMs ? 'low' : 'high');
    return null;
```

- `public/sound/sound.js:273-276`, `unlock`, with the patch the last release added. A call with no event and no
  earlier gesture returns before it sets anything, so line 462's `unlock()` leaves `S.unlocked` false:

```js
function unlock(e) {
  if (e && e.isTrusted === false) return;
  if (!e && !S.gestured && !(S.ctx && S.ctx.state === 'running')) return; // kevinliu.studio: no gesture, no fetch (scripts/sync.mjs)
  S.gestured = true;
```

- `public/sound/sound.js:1089-1091`, the fanfare path, which also loads with only a context:

```js
function stinger(id, o = {}) {
  const c = S.m?.cues[id];
  if (!c || !S.enabled || !S.ctx) return null;
```

- `public/sound/sound.js:1246-1249`, why the battle has a context before any gesture:

```js
    if (S.gestured) unlock();
    else if (o.resumeAtLoad && S.enabled && makeContext()) {
      S.ctx.resume().then(() => { if (S.ctx.state === 'running') unlock(); }).catch(() => {});
    }
```

- `public/battle/shared/battle.js:205` asks for that: `Sound.init({ manifest: ..., page: 'battle', resumeAtLoad: true, groups: ['battle', mode, `music:mus.${mode}`] });`
  Its deal (`battle.js:962`, `await cue('deal', null, 'pre')`) and the leads' entrances then play cues with no gesture.
- `scripts/sync.mjs:262`, the entry this plan extends. It is one long line that starts
  `'public/sound/sound.js': (t) => patch('sound.js', t, [[` and ends
  `// kevinliu.studio: no gesture, no fetch (scripts/sync.mjs)\n  S.gestured = true;\n"]]),`
- How a patch works (`scripts/sync.mjs:148-155`): each pair is `[find, replace]`; `find` must occur exactly once in
  the file as the rounds have it, or the sync stops and names the anchor.

Repo rules that apply (from `AGENTS.md`):

- `public/sound/` is synced from the rounds. Never edit `public/sound/sound.js` by hand. A fix the site needs in round
  code is an anchored pair in `TRANSFORMS` in `scripts/sync.mjs`; then the sync rewrites the file and `sync.lock.json`.
- Sound plays only for the visitor's own actions; nothing but the player and its manifest is fetched before the first
  gesture.
- Append an entry to `memory.md` after the change. Never rewrite its old entries.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | ends `synced from 30e69931 + 42ff51c7: 1 written, 0 removed` |
| Build and release guard | `pnpm build` | ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Local serve of `dist/` | `pnpm preview --port 4391 --host 127.0.0.1` | serves the build; stop it with `pnpm exec astro preview stop` |
| Browser | `agent-browser open <url>`, `agent-browser wait <ms>`, `agent-browser eval "<js>"`, `agent-browser click "<selector>"`, `agent-browser close` | prints the result |

`$HOME/k7-rescue/release-next/rounds-42ff51c7` is the export of the rounds at the shipped pins. A plain `pnpm sync`
from the live rounds folder fails by design (its working tree is past the pins). There is no test command in this repo.

## Scope

**In scope** (the only files you should modify):
- `scripts/sync.mjs` (two pairs added to the `'public/sound/sound.js'` entry)
- `public/sound/sound.js` (rewritten by the sync, never by hand)
- `sync.lock.json` (rewritten by the sync)
- `docs/sound.md`, `docs/sync.md` (one sentence each)
- `memory.md` (one appended entry)

**Out of scope** (do NOT touch, even though they look related):
- Anything in the rounds folder. Never write there.
- `public/battle/shared/battle.js`: the battle's calls are correct; the player must refuse them.
- `resumeAtLoad` itself: it lets a browser that already allows audio play the opening, which the policy permits.
- The `?auto=1` behaviour beyond this fix, the music loop, `boot.gallery.js`.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/005-battle-no-sound-fetch-before-gesture`
  cut from `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin` then
  `git -C ~/repos/kevinliu-studio worktree add -b improve/005-battle-no-sound-fetch-before-gesture ~/repos/kevinliu-studio-005 origin/main`.
  Never edit the main checkout (other sessions use it). Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`.
  Use: `fix(sound): a cue asked for before the context is unlocked fetches nothing`.
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Steps

### Step 1: Confirm the starting point

In the worktree: `pnpm install --frozen-lockfile`, then the sync check.

**Verify**: `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` → prints `in sync`.

### Step 2: Confirm both anchors occur exactly once in the rounds' file

```bash
node --input-type=module <<'EOF'
import fs from 'node:fs';
const t = fs.readFileSync(`${process.env.HOME}/k7-rescue/release-next/rounds-42ff51c7/r4/sound/sound.js`, 'utf8');
for (const a of [
  '  if (!S.ctx || !S.unlocked) { unlock(); if (!S.ctx) return null; }',
  '  if (!c || !S.enabled || !S.ctx) return null;',
]) console.log(t.split(a).length - 1);
EOF
```

**Verify**: prints `1` and `1`.

### Step 3: Add the two pairs to the sound.js entry in `scripts/sync.mjs`

Find the end of the entry (the text `  S.gestured = true;\n"]]),` with a literal backslash and `n`, once in the file,
on line 262). Replace only its last five characters `"]]),` with the following, so the existing pair stays first and
the array gains two pairs:

```js
"],
    // nothing is fetched before the context is unlocked: on the battle the player makes its context at load
    // (resumeAtLoad), so a cue played before any gesture (the deal, the leads' entrances) passed the old check, fetched
    // and decoded its file, and was dropped by the suspended context (10 files in 25 s with no input). The fanfare path
    // had the same check
    ['  if (!S.ctx || !S.unlocked) { unlock(); if (!S.ctx) return null; }', '  if (!S.ctx || !S.unlocked) { unlock(); if (!S.ctx || !S.unlocked) return null; } // kevinliu.studio: no unlocked context, no fetch (scripts/sync.mjs)'],
    ['  if (!c || !S.enabled || !S.ctx) return null;', '  if (!c || !S.enabled || !S.ctx || !S.unlocked) return null; // kevinliu.studio: no unlocked context, no fetch (scripts/sync.mjs)'],
  ]),
```

If the entry already holds more pairs (another plan landed first), add these two as the last elements of its array
instead; the pairs themselves do not change.

**Verify**: `node --check scripts/sync.mjs` → exit 0, no output.

### Step 4: Run the sync

`ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs`

**Verify**: ends `synced from 30e69931 + 42ff51c7: 1 written, 0 removed`. Then
`grep -c "no unlocked context, no fetch" public/sound/sound.js` → `2`, `node --check public/sound/sound.js` → exit 0,
and `git status --short` lists only `scripts/sync.mjs`, `public/sound/sound.js` and `sync.lock.json`.

### Step 5: Build

`pnpm build`

**Verify**: ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass`.

### Step 6: Check the behaviour in a browser

```bash
pnpm preview --port 4391 --host 127.0.0.1 > "${TMPDIR:-/tmp}/kls-005-preview.log" 2>&1 &
for i in $(seq 1 40); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4391/battle)" = 200 ] && break; sleep 2; done
export AGENT_BROWSER_SESSION=improve-005
agent-browser open http://127.0.0.1:4391/battle
agent-browser wait 25000
agent-browser eval "performance.getEntriesByType('resource').filter(e => /\/sound\/out\//.test(e.name)).length"
agent-browser eval "performance.getEntriesByType('resource').filter(e => /\/sound\/(sound\.js|manifest\.battle\.json)/.test(e.name)).length"
agent-browser click "#app"
agent-browser wait 8000
agent-browser eval "performance.getEntriesByType('resource').filter(e => /\/sound\/out\//.test(e.name)).length"
agent-browser open http://127.0.0.1:4391/
agent-browser wait 5000
agent-browser eval "performance.getEntriesByType('resource').filter(e => /\/sound\/out\//.test(e.name)).length"
agent-browser click ".wall .card"
agent-browser wait 4000
agent-browser eval "performance.getEntriesByType('resource').filter(e => /\/sound\/out\//.test(e.name)).length"
agent-browser close
pnpm exec astro preview stop
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4391/
```

**Verify**, in order: the first number is `0` (nothing under `/sound/out/` with no gesture); the second is `2` (the
player and the manifest, which the policy allows); the third, after one click, is greater than `20` (the kit loads on
the gesture); on the home page the fourth is `0` and the fifth, after a press on a card, is greater than `0`; the last
line prints `000` (the server is stopped).

### Step 7: Record it

- `docs/sound.md`, at the end of the "Battle" bullet under "Where it is wired", add:
  `A second transform makes a cue asked for while the context is not yet unlocked return without fetching its file (the deal and the leads' entrances fetched 10 files with no gesture).`
- `docs/sync.md`, under "Transforms", change the `sound.js` bullet to:
  ``- `sound.js`: a cue played before the first gesture neither counts as one nor fetches the kit, and a cue or fanfare asked for before the context is unlocked fetches nothing (docs/sound.md).``
- Append an entry to `memory.md` (date, type fix, the files changed, the numbers from step 6, and "open: the rounds
  should take this upstream, see the request in this plan").

**Verify**: `git diff --stat` lists exactly `scripts/sync.mjs`, `public/sound/sound.js`, `sync.lock.json`,
`docs/sound.md`, `docs/sync.md`, `memory.md`. Commit them by path.

## Upstream request (for the rounds lane)

The executor does not write in the rounds. Copy this section word for word into your final report; Kevin or the sound
lane applies it. `r4/sound` has no `REQUESTS.md`, so the line goes to Kevin.

Request line (the rounds' format):

`site (kevinliu-studio) -> sound: sound.js: playCue and stinger return when the context is not unlocked (add "|| !S.unlocked" to both checks), and unlock() with no event returns unless a gesture was seen or the context already runs, because on the battle page (resumeAtLoad) cues played before any gesture fetched and decoded files the suspended context then dropped: 10 files in 25 s with no input, about 240 before the site's first patch`

Source edit, `r4/sound/sound.js` at rounds HEAD `868340d7` (unchanged since `30e69931`):

- Line 461, now: `  if (!S.ctx || !S.unlocked) { unlock(); if (!S.ctx) return null; }`
  After: `  if (!S.ctx || !S.unlocked) { unlock(); if (!S.ctx || !S.unlocked) return null; }`
- Line 1090, now: `  if (!c || !S.enabled || !S.ctx) return null;`
  After: `  if (!c || !S.enabled || !S.ctx || !S.unlocked) return null;`
- Lines 273-275 (the site's earlier patch, also still missing upstream), now:
  `function unlock(e) {` / `  if (e && e.isTrusted === false) return;` / `  S.gestured = true;`
  After, a line between the last two: `  if (!e && !S.gestured && !(S.ctx && S.ctx.state === 'running')) return;`

## Test plan

This repo has no test runner. The checks are the ones in the steps: the anchor counts (step 2), the syntax check and
marker count (step 4), the release guard (step 5), and the browser check (step 6), which is the regression test for
this bug: zero requests under `/sound/out/` on `/battle` after 25 seconds without input.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] `grep -c "no unlocked context, no fetch" public/sound/sound.js` prints `2`
- [ ] `pnpm build` ends with `all checks pass`
- [ ] Step 6's five numbers are `0`, `2`, more than `20`, `0`, more than `0`, and the server answers `000` afterwards
- [ ] `git status --short` shows no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync` before your
  first edit.
- Either anchor in step 2 does not print `1`, or the sync stops with `patch anchor found N times`.
- The sync writes more than one file, or removes any.
- In step 6 the third number stays `0` after the click (the gesture no longer unlocks sound), or the fifth stays `0`
  (the home page's press is silent). Either means the guard is wrong for a path this plan did not foresee: revert
  your change to `scripts/sync.mjs`, run the sync again, and report.
- The first number in step 6 is not `0`. Report the file names
  (`agent-browser eval "performance.getEntriesByType('resource').filter(e => /\/sound\/out\//.test(e.name)).map(e => e.name).join(' ')"`).

## Maintenance notes

- When a later rounds pin carries the upstream change, the anchors stop matching, the sync stops and names them, and
  the two pairs are deleted in the same commit as the pin move.
- A browser that already lets the page play audio at load (a returning visitor in Chrome with media engagement) still
  unlocks at load through `resumeAtLoad` and loads the kit then. That is the documented behaviour, not a regression.
- A reviewer should check that no third load path exists before unlock: `load()` and `music()` already check
  `S.unlocked` (`public/sound/sound.js:251`, `:1015`); `prefetch` is reached only from a theme that is already playing.
- Known and not changed here: with `?auto=1` the battle plays on without a gesture; after this plan it fetches no
  sound for it either.
