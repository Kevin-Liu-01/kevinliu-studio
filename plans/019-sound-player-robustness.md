# Plan 019: The sound player keeps the visitor's choice after Back, answers the battle's speaker key, keeps real time, and retries a failed manifest

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

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (steps 3 to 5); MED (step 6, the manifest retry)
- **Depends on**: none (it extends the same `scripts/sync.mjs` entry as plans 005 and 022; if one of them landed
  first, add this plan's pairs after theirs)
- **Category**: bug
- **Planned at**: commit `c6245d9`, 2026-11-09 (rounds HEAD `868340d7`; sound pinned at `30e69931`)

## Why this matters

Four defects in the sound player (`sound.js`), which the home page and the battle share. Each step below carries its
own confidence, because not all four were reproduced in a browser.

1. **A muted choice is forgotten after Back** (confidence: MED-HIGH, from the code and the browser spec). The player
   keeps pages in sync through the `storage` event. A page held in the back-forward cache gets no such event. Mute on
   `/battle`, press Back, and the home page comes back still "on" and makes sound on the next hover.
2. **The battle's speaker key answers with silence** (confidence: HIGH). Turning sound on plays the cue `ui.sound.on`
   and loads the group `gallery`. The battle's manifest has neither; it has its own toggle cue, `bt.ui.toggle`.
3. **The player's waits run in scene time on the battle** (confidence: MED: the code is certain, how audible it is
   is not measured). The battle's clock (`shared/pace.js`) replaces `window.setTimeout` so every page timer runs up to
   four times faster during a scene's rush. The round's spec says sound keeps real time, but the player's own timers
   (a theme's stop, the eviction of a faded theme, lap changes, a prefetch) use the global one.
4. **One failed manifest fetch silences the page for good** (confidence: MED). The fetch has no status check, and its
   rejected promise is cached. A flaky phone connection at the first press, or a 404 during a deploy, leaves the page
   silent until a reload and logs an unhandled rejection on every later hover.

## Current state

The root cause is round code: `r4/sound/sound.js` in the design rounds repo
(`/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`), lane r4/sound. The file has not changed
between the shipped pin `30e69931` and rounds HEAD `868340d7`. The site ships it as `public/sound/sound.js` with one
site patch (one added line, 275). Line numbers below are the site copy's; after line 274 the rounds file's are one
lower.

- `public/sound/sound.js:1236-1243`, the only cross-page sync:

```js
    S.enabled = preference();
    if (hasWindow && !bound) {
      bound = true;
      addEventListener('storage', (e) => { if (e.key === KEY && (e.newValue === 'on' || e.newValue === 'off')) setEnabled(e.newValue === 'on', { persist: false }); });
      document.addEventListener('visibilitychange', onVisibility);
```

  `saved()` (`:60`) returns `true`, `false` or `null` from `localStorage['kevin-liu-studio:sound']`.

- `public/sound/sound.js:1186-1194`, the toggle's answer (inside `setEnabled`):

```js
    // turning sound on is a gesture: the context starts here (a change from another tab is not)
    if (persist) S.resumeAskedAt = performance.now();
    unlock();
    if (S.ctx && S.ctx.state === 'suspended') S.ctx.resume().catch(() => {});
    // the theme that was playing when sound went off comes back
    if (S.unlocked && S.m && S.music.wanted) { const { track, o } = S.music.wanted; S.music.wanted = null; music(track, o); }
    if (feedback) { play('ui.sound.on', { force: true, waitMs: 900 }); load('gallery'); }
```

  `public/sound/manifest.battle.json` has no cue `ui.sound.on` and no cue in the group `gallery`. It has
  `bt.ui.toggle` (group `battle`, files `gallery/ui.mode-1` and `gallery/ui.mode-2`). `S.page` is `'battle'` there
  (`public/battle/shared/battle.js:205`) and `'gallery'` on the home page (`public/sound/boot.gallery.js:9`).

- `public/battle/shared/pace.js:53-54` and `:189`, the clock. It replaces the page's timers and offers the real one:

```js
  window.setTimeout = function (fn, ms) { return add(fn, ms, Array.prototype.slice.call(arguments, 2), false); };
  window.setInterval = function (fn, ms) { return add(fn, ms, Array.prototype.slice.call(arguments, 2), true); };
```

```js
    now: now, realNow: realNow, realTimeout: realTimeout, realRaf: realRaf,
```

  `public/sound/sound.js` calls `setTimeout(` in five places (lines 312, 886, 928, 961, 1102). `clearTimeout` needs no
  change: the clock's version passes an id it does not know to the browser's own.

- `public/sound/sound.js:143-158`, the manifest:

```js
function ensureManifest() {
  if (S.mp) return S.mp;
  const src = S.opts.manifest ?? 'manifest.json';
  S.mp = (async () => {
    if (typeof src === 'string') {
      const url = new URL(src, hasWindow ? document.baseURI : 'file:///');
      S.m = await (await fetch(url)).json();
      S.base = baseOf();
    } else { S.m = src; S.base = S.opts.base ?? 'out/'; }
    S.pageDb = S.opts.pageDb ?? (S.page && S.m.pages && S.m.pages[S.page] ? S.m.pages[S.page].gainDb : 0);
    applyGraph();
    return S.m;
  })();
  return S.mp;
}
```

  Its callers with no `catch`: `:252` (`load`), `:296` and `:300` (`unlock`), `:448` (`play`), `:1244` (`init`).
  `unlock` runs its loading block only on the first gesture (`const first = !S.unlocked; ... if (!first) return;`,
  `:279-288`), and removes its gesture listeners once the context runs (`unbindGestures`, `:320-326`).

- `scripts/sync.mjs:262`, the entry this plan extends. It is one long line that starts
  `'public/sound/sound.js': (t) => patch('sound.js', t, [[` and ends
  `// kevinliu.studio: no gesture, no fetch (scripts/sync.mjs)\n  S.gestured = true;\n"]]),`
- `scripts/sync.mjs:148-155`, `:175-176`: a pair is `[find, replace]`; `find` must occur exactly once; `replace` may
  be a function of the found text; `after(add)` appends to it and `before(add)` puts `add` in front of it.

Repo rules that apply (from `AGENTS.md`): `public/sound/` is synced, never edited by hand; a fix to round code is an
anchored pair in `TRANSFORMS` in `scripts/sync.mjs`, then the sync; sound plays only for the visitor's own actions and
a saved choice always wins; append an entry to `memory.md`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | ends `synced from 30e69931 + 42ff51c7: 1 written, 0 removed` |
| Build and release guard | `pnpm build` | ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Local serve of `dist/` | `pnpm preview --port 4395 --host 127.0.0.1` | serves the build; stop it with `pnpm exec astro preview stop` |
| Browser | `agent-browser open <url>`, `wait <ms>`, `eval "<js>"`, `click "<selector>"`, `set offline on|off`, `close` | prints the result |

`$HOME/k7-rescue/release-next/rounds-42ff51c7` is the export of the rounds at the shipped pins; a plain `pnpm sync`
from the live rounds folder fails by design. There is no test command in this repo.

## Scope

**In scope** (the only files you should modify):
- `scripts/sync.mjs` (pairs added to the `'public/sound/sound.js'` entry)
- `public/sound/sound.js` (rewritten by the sync, never by hand)
- `sync.lock.json` (rewritten by the sync)
- `docs/sound.md`, `docs/sync.md` (a sentence each), `memory.md` (one appended entry)

**Out of scope** (do NOT touch):
- Anything in the rounds folder. Never write there.
- `public/battle/shared/pace.js` and `battle.js`: the clock is right to speed the page's timers; the player opts out.
- The player's use of `performance.now()` (also on the battle's clock). See "Maintenance notes".
- Safari's `interrupted` audio state, the AAC fallback after a network error, the speaker key's first paint: recorded
  as open questions, not planned.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/019-sound-player-robustness` cut from
  `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin` then
  `git -C ~/repos/kevinliu-studio worktree add -b improve/019-sound-player-robustness ~/repos/kevinliu-studio-019 origin/main`.
  Never edit the main checkout. Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`.
  Use: `fix(sound): the choice survives Back, the battle's key answers, waits keep real time, a failed manifest retries`.
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Steps

### Step 1: Confirm the starting point and every anchor

`pnpm install --frozen-lockfile`, then:

```bash
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check
node --input-type=module <<'EOF'
import fs from 'node:fs';
const t = fs.readFileSync(`${process.env.HOME}/k7-rescue/release-next/rounds-42ff51c7/r4/sound/sound.js`, 'utf8');
for (const a of [
  "      addEventListener('storage', (e) => { if (e.key === KEY && (e.newValue === 'on' || e.newValue === 'off')) setEnabled(e.newValue === 'on', { persist: false }); });\n",
  "    if (feedback) { play('ui.sound.on', { force: true, waitMs: 900 }); load('gallery'); }",
  "const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];",
  '      S.m = await (await fetch(url)).json();',
  '    applyGraph();\n    return S.m;\n  })();\n  return S.mp;',
  '    });\n  });\n}\nfunction bindGestures() {',
  '    if (S.unlocked) { S.pendingIds.push({ id: id0, o, t: performance.now() }); ensureManifest(); }',
  '  if (!S.m) return ensureManifest().then(() => load(group));',
  '    ensureManifest(); // its request goes first',
  "    if (o.eager || o.resumeAtLoad || typeof o.manifest === 'object') await ensureManifest();",
]) console.log(t.split(a).length - 1);
const m = JSON.parse(fs.readFileSync('public/sound/manifest.battle.json', 'utf8'));
console.log(Boolean(m.cues['bt.ui.toggle']), Boolean(m.cues['ui.sound.on']));
EOF
```

**Verify**: `in sync`; ten lines of `1`; then `true false`.

### Step 2: Open the sound.js entry for more pairs

In `scripts/sync.mjs`, find the end of the sound.js entry: the text `  S.gestured = true;\n"]]),` (a literal backslash
and `n`), once in the file. Replace only its last five characters `"]]),` with `"],` followed by a new line holding
`  ]),`, so the entry ends:

```js
... // kevinliu.studio: no gesture, no fetch (scripts/sync.mjs)\n  S.gestured = true;\n"],
  ]),
```

If the entry already has this shape (another plan landed first), skip this step. Each step below adds its pairs as new
lines directly above that closing `  ]),`.

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 3 (confidence MED-HIGH): The saved choice is read again when a page comes back from the back-forward cache

Add:

```js
    // a page shown again from the back-forward cache missed every storage event: it reads the saved choice
    ["      addEventListener('storage', (e) => { if (e.key === KEY && (e.newValue === 'on' || e.newValue === 'off')) setEnabled(e.newValue === 'on', { persist: false }); });\n", after("      // kevinliu.studio: a page shown again from the back-forward cache gets no storage event; it reads the saved choice (scripts/sync.mjs)\n      addEventListener('pageshow', (e) => { if (!e.persisted) return; const s = saved(); if (s !== null && s !== S.enabled) setEnabled(s, { persist: false }); });\n")],
```

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 4 (confidence HIGH): The battle's speaker key answers with the battle's own cue

Add:

```js
    // the battle's manifest has no ui.sound.on and no gallery group: its speaker key answers with bt.ui.toggle
    ["    if (feedback) { play('ui.sound.on', { force: true, waitMs: 900 }); load('gallery'); }", "    if (feedback) { play(S.m && !S.m.cues['ui.sound.on'] && S.m.cues['bt.ui.toggle'] ? 'bt.ui.toggle' : 'ui.sound.on', { force: true, waitMs: 900 }); if (S.page !== 'battle') load('gallery'); } // kevinliu.studio: the battle answers with its own toggle cue (scripts/sync.mjs)"],
```

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 5 (confidence MED): The player's own waits keep real time under the battle's clock

Add:

```js
    // the battle's clock (shared/pace.js) runs every page timer in scene time, up to four times as fast in a rush;
    // the player's waits (a theme's stop, the eviction of a faded theme, lap changes, a prefetch) keep real time
    ["const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];", before("// kevinliu.studio: the battle's clock (shared/pace.js) runs every page timer in scene time; the player's waits keep real time (scripts/sync.mjs)\nconst setTimeout = (fn, ms, ...a) => (globalThis.battlePace?.realTimeout ?? globalThis.setTimeout)(fn, ms, ...a);\n")],
```

This declares a module-level `setTimeout` inside `sound.js` only, so its five existing calls use it with no other
edit. On the home page there is no `battlePace`, and it is the browser's timer as before.

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 6 (confidence MED): A manifest that fails to load is asked for again on the next gesture

Add these seven pairs together (they are one change; never land some of them):

```js
    // a manifest that fails (a dropped request, a 404 mid-deploy) was cached as a rejected promise: the page stayed
    // silent until a reload and every later hover logged an unhandled rejection. The fetch checks its status, a
    // failure clears the cache, the first-gesture loading re-arms for the next gesture, and no caller is left uncaught
    ['      S.m = await (await fetch(url)).json();', '      const res = await fetch(url);\n      if (!res.ok) throw new Error(`manifest ${res.status}`);\n      S.m = await res.json();'],
    ['    applyGraph();\n    return S.m;\n  })();\n  return S.mp;', '    applyGraph();\n    return S.m;\n  })().catch((e) => { S.mp = null; throw e; }); // kevinliu.studio: a manifest that failed is asked for again (scripts/sync.mjs)\n  return S.mp;'],
    ['    });\n  });\n}\nfunction bindGestures() {', '    });\n  }).catch(() => { S.unlocked = false; if (!S.gesturesBound) { bindGestures(); S.gesturesBound = true; } }); // kevinliu.studio: the next gesture asks again (scripts/sync.mjs)\n}\nfunction bindGestures() {'],
    ['    if (S.unlocked) { S.pendingIds.push({ id: id0, o, t: performance.now() }); ensureManifest(); }', '    if (S.unlocked) { S.pendingIds.push({ id: id0, o, t: performance.now() }); ensureManifest().catch(() => {}); }'],
    ['  if (!S.m) return ensureManifest().then(() => load(group));', '  if (!S.m) return ensureManifest().then(() => load(group)).catch(() => { S.wantGroups.add(group); });'],
    ['    ensureManifest(); // its request goes first', '    ensureManifest().catch(() => {}); // its request goes first'],
    ["    if (o.eager || o.resumeAtLoad || typeof o.manifest === 'object') await ensureManifest();", "    if (o.eager || o.resumeAtLoad || typeof o.manifest === 'object') await ensureManifest().catch(() => {});"],
```

How it reads: `unlock` loads the kit only on the gesture that first unlocks. When the manifest behind that gesture
fails, the third pair marks the player as not yet unlocked and listens for gestures again, so the next press runs the
same loading with a fresh request.

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 7: Run the sync and build

```bash
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs
cp public/sound/sound.js "${TMPDIR:-/tmp}/kls-019-sound.mjs" && node --check "${TMPDIR:-/tmp}/kls-019-sound.mjs" && echo ok
grep -c "addEventListener('pageshow'" public/sound/sound.js
grep -c "'bt.ui.toggle' : 'ui.sound.on'" public/sound/sound.js
grep -c "globalThis.battlePace?.realTimeout" public/sound/sound.js
grep -c "ensureManifest()\.catch\|ensureManifest().then(() => load(group)).catch" public/sound/sound.js
pnpm build
```

**Verify**: the sync ends `1 written, 0 removed`; then `ok`, `1`, `1`, `1`, `4`; the build ends `all checks pass`.

### Step 8: Check the behaviour in a browser

```bash
pnpm preview --port 4395 --host 127.0.0.1 > "${TMPDIR:-/tmp}/kls-019-preview.log" 2>&1 &
for i in $(seq 1 40); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4395/)" = 200 ] && break; sleep 2; done
export AGENT_BROWSER_SESSION=improve-019
B=http://127.0.0.1:4395
# (a) the saved choice after a back-forward restore, on the home page
agent-browser open "$B/"; agent-browser wait 4000
agent-browser eval "document.getElementById('sound').getAttribute('aria-pressed')"
agent-browser eval "localStorage.setItem('kevin-liu-studio:sound', 'off'); dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); document.getElementById('sound').getAttribute('aria-pressed')"
agent-browser eval "localStorage.removeItem('kevin-liu-studio:sound'); 1"
# (b) a manifest that fails once is asked for again
agent-browser open "$B/about"; agent-browser open "$B/"; agent-browser wait 4000
agent-browser set offline on
agent-browser click "#pause"; agent-browser wait 2000
agent-browser eval "String(globalThis.Sound.manifest === null)"
agent-browser set offline off
agent-browser click "#pause"; agent-browser wait 4000
agent-browser eval "String(globalThis.Sound.manifest !== null)"
# (c) the battle's speaker key answers, and the kit still loads on a gesture
agent-browser open "$B/battle"; agent-browser wait 15000
agent-browser eval "import('/sound/sound.js').then((m) => { window.__plays = []; m.default.on('play', (d) => window.__plays.push(d.id)); }); 1"
agent-browser click "#app"; agent-browser wait 8000
agent-browser click "#sound"; agent-browser wait 3000
agent-browser click "#sound"; agent-browser wait 3000
agent-browser eval "JSON.stringify({ pressed: document.getElementById('sound').getAttribute('aria-pressed'), toggled: window.__plays.includes('bt.ui.toggle'), files: performance.getEntriesByType('resource').filter((e) => /\/sound\/out\//.test(e.name)).length })"
agent-browser close
pnpm exec astro preview stop
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4395/
```

**Verify**:
- (a) prints `true`, then `false` (the key follows the saved choice after the restore event).
- (b) prints `true` while offline (no manifest yet), then `true` after the second press online (the manifest arrived).
- (c) prints `"pressed":"true"`, `"toggled":true` and `"files"` greater than `20`. (The first click, on the page
  itself, is the gesture that loads the kit; the two clicks on the speaker key turn sound off and on again.)
- The last line prints `000`.

### Step 9: Record it

- `docs/sound.md`, under "Policy", extend the saved-choice bullet with: `A page that comes back from the back-forward cache reads it again.`
  Under "Where it is wired", add a bullet: ``- Site transforms on `sound.js` (docs/sync.md): the battle's speaker key answers with `bt.ui.toggle`; the player's own timers keep real time under the battle's clock; a manifest that fails to load is asked for again on the next gesture.``
- `docs/sync.md`, under "Transforms", extend the `sound.js` bullet with: `; the saved choice is read again on a back-forward restore, the battle's speaker key answers with its own cue, the player's timers keep real time under the battle's clock, and a failed manifest is retried`.
- Append an entry to `memory.md` (date, type fix, files, step 8's results, open: the upstream request below).

**Verify**: `git status --short` lists exactly `scripts/sync.mjs`, `public/sound/sound.js`, `sync.lock.json`,
`docs/sound.md`, `docs/sync.md`, `memory.md`. Commit them by path.

## Upstream request (for the rounds lane)

The executor does not write in the rounds. Copy this section word for word into your final report; Kevin or the sound
lane applies it. `r4/sound` has no `REQUESTS.md`, so the lines go to Kevin.

Request lines (the rounds' format):

`site (kevinliu-studio) -> sound: sound.js: init() also listens for pageshow with persisted and applies saved() when it differs from S.enabled, because a page restored from the back-forward cache gets no storage event and came back sounding after it was muted on the next page`

`site (kevinliu-studio) -> sound: sound.js: setEnabled's feedback plays bt.ui.toggle when the manifest has no ui.sound.on and loads the gallery group only off the battle page, because the battle's speaker key (N) answered with nothing`

`site (kevinliu-studio) -> sound: sound.js: its setTimeout calls use battlePace.realTimeout when the page has one, because shared/pace.js runs page timers in scene time (up to 4x in a rush) and SPEC.md says sound keeps real time; its performance.now() reads have the same question`

`site (kevinliu-studio) -> sound: sound.js: ensureManifest checks res.ok, clears S.mp on failure, every caller catches, and unlock re-arms (S.unlocked = false, gestures bound again) when the manifest behind the first gesture fails, because one failed fetch left the page silent until a reload`

Source lines at rounds HEAD `868340d7` (unchanged since `30e69931`): `r4/sound/sound.js:1238` (storage listener),
`:1192` (feedback), `:32` (`GESTURES`, the timer shim goes before it), `:143-158` (`ensureManifest`), `:252`, `:295`,
`:299-317` (the end of `unlock`), `:447`, `:1243`. The replacement text is the right-hand side of each pair above.

## Test plan

This repo has no test runner. The checks are: the anchor counts and the manifest facts (step 1), the syntax check and
the four marker counts (step 7), the release guard, and step 8's three browser cases. Case (a) fails before this plan
with `true`, `true`; case (b) fails with `true`, `false`; case (c) fails with `"toggled":false`. The timer change
(step 5) has no behavioural check here: it is verified by its count and by the battle still playing sound in case (c).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] Step 7's counts are `ok`, `1`, `1`, `1`, `4`
- [ ] `pnpm build` ends with `all checks pass`
- [ ] Step 8: (a) `true` then `false`; (b) `true` then `true`; (c) `"pressed":"true"`, `"toggled":true`, `"files"` over 20; the server answers `000` afterwards
- [ ] `git status --short` shows no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync` before your
  first edit.
- Any anchor in step 1 does not print `1`, the manifest line is not `true false`, or the sync stops with
  `patch anchor found N times`.
- Case (c) shows `"files"` of `0` after its three clicks, or case (b)'s second line is `false`: sound no longer loads on a
  gesture. Remove step 6's seven pairs (all of them), run the sync and step 8 again. If (c) then passes, keep steps 3
  to 5, commit them, and report step 6 as blocked with what you saw. If (c) still fails, revert everything and report.
- `agent-browser set offline on` is not available or leaves the page unable to run case (b): skip case (b), say so in
  the report, and treat step 6 as unverified (leave its pairs out).

## Maintenance notes

- When a later rounds pin carries the upstream change, the anchors stop matching, the sync stops and names them, and
  these pairs are deleted in the same commit as the pin move.
- The player also reads `performance.now()`, which the battle's clock speeds up too (cooldowns, the 250 ms wait for a
  late file, the resume grace). That is the same question as step 5 and is left to the sound lane: changing it
  touches how the battle passes times into the player.
- Not planned, with reasons: Safari's `interrupted` state with the page still visible (needs a device to confirm);
  a single network error moving the page to AAC for the visit (low impact); the battle's speaker key painting "off"
  before the player loads (probably hidden by the boot).
- A reviewer should read step 6 for one thing: after a failed manifest the player must end in a state where the next
  gesture loads everything (`S.mp` is `null`, `S.unlocked` is `false`, the gesture listeners are bound).
- Plan 005 changes the line below `play`'s cooldown check in the same file; the two plans' pairs do not overlap.
