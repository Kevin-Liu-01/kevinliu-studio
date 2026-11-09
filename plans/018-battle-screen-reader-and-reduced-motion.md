# Plan 018: The battle announces every outcome, honours reduced motion on the Mat, and keeps one h1

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs public/battle/shared/battle.js public/battle/mat/mat.css public/battle/arena/arena.css sync.lock.json docs/sync.md docs/battle.md`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (it edits the same `scripts/sync.mjs` entries as plans 008 and 023; if one of them landed
  first, add this plan's pairs after theirs)
- **Category**: bug
- **Planned at**: commit `c6245d9`, 2026-11-09 (rounds HEAD `868340d7`; battle pinned at `42ff51c7`)

## Why this matters

Five small defects in the battle page, each read in the code:

1. **A screen reader hears only the last event of a turn.** The page writes each outcome into one live region, and a
   shot delivers all its outcomes in one synchronous loop, so "Killcam, 84 to Jarhead." is overwritten by "Jarhead is
   out." before it can be announced (WCAG 4.1.3). After this plan the lines of one batch are joined and written once.
2. **The Mat ignores reduced motion for its interface.** The rule that should switch off the Mat's transitions under
   `prefers-reduced-motion` ships with an unclosed selector list and no declarations, so the browser drops it. The
   round-5 merge cut it; the Arena's copy is whole. After this plan the Mat's rule is restored.
3. **Enter or Space on a focused speed, mode or sound key skips the scene instead of pressing the key.** The round's
   own spec says "the speed buttons never skip", and the pointer path already exempts those keys. After this plan the
   keyboard path exempts the same set.
4. **Two h1 elements at the result.** The site makes the page's wordmark its one h1; the result panel adds a second
   ("Victory", "Defeat" or "Draw"). After this plan the result's heading is an h2.
5. **Replay can leave the console open or locked.** `replayLast` does not check whether a new battle started while it
   played, and has no `finally`. After this plan it does.

## Current state

The battle page is round code: `r4/play` in the design rounds repo
(`/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`), lane r4/play. `shared/battle.js`,
`mat/mat.css` and `arena/arena.css` have not changed between the shipped pin `42ff51c7` and rounds HEAD `868340d7`.
The site ships them under `public/battle/` with site patches from `scripts/sync.mjs`. Line numbers below are the site
copies'; they are the same in the rounds for `battle.js`.

- `public/battle/shared/battle.js:468-479` and `:672`, the announcements. `onEvent` runs once per outcome, inside one
  loop (`public/battle/shared/runtime.js:532`: `for (const e of shot.post) h.event(e, shot);`):

```js
function onEvent(e) {
  ...
  if (e.kind === 'hit') live(`${e.move.name}, ${e.damage} to ${who(e.target)}.`);
  else if (e.kind === 'miss') live(`${e.move.name} missed.`);
  else if (e.kind === 'switch' && e.reason !== 'lead') live(`${title(e.card)} in for ${e.side === 'player' ? 'you' : 'the rival'}.`);
  else if (e.kind === 'ko') live(`${title(e.card)} is out.`);
```

```js
function live(text) { $('#live').textContent = text; }
```

  The region is `<p class="sr" id="live" aria-live="polite"></p>` (`vendor/battle/mat/index.html:93`).

- `public/battle/mat/mat.css:286-289`, the broken rule (the file's text, exactly):

```css
/* ============================================================ reduced motion: every step a still */
@media (prefers-reduced-motion: reduce) {
  .rail, .console, .key, .slot-lift, .slot[data-dim], }
```

  Before the round-5 merge (rounds commit `a2318daf`) the line was
  `.rail, .console, .key, .slot-lift, .slot[data-dim], .kit-chip, .result, #app[data-scene] .rail, #app[data-scene] .console, .slot[data-zone="finale"] :is(.chips, .tokens) { transition: none !important; }`.
  `.kit-chip` no longer exists anywhere in the battle; every other selector still does. The Arena's whole rule, for
  comparison (`public/battle/arena/arena.css:364-367`):

```css
@media (prefers-reduced-motion: reduce) {
  .fig-breath { animation: none; }
  .rail, .console, .key, .pip, .hcard, .result, .flag, .arena-pad, #app[data-scene] .rail, #app[data-scene] .console { transition: none !important; }
}
```

- `public/battle/shared/battle.js:854-857` and `:866-867`, the keys. The pointer path exempts
  `dialog, .seg, .speed, .tip, #sound`; the key path exempts nothing:

```js
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if ($('#log').open) return;
  if (stage.playing && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); e.stopPropagation(); skip(); return; }
```

```js
addEventListener('pointerdown', (e) => { if (stage.playing && !e.target.closest?.('dialog, .seg, .speed, .tip, #sound')) { swallowUntil = realNow() + 800; skip(); } }, true);
```

- `public/battle/shared/battle.js:800`, the result's heading, and its styles `public/battle/mat/mat.css:239` and
  `:270`, `public/battle/arena/arena.css:289` and `:345` (`.result h1 {` twice in each sheet, nowhere else):

```js
  el('h1', '', r, win === 'draw' ? 'Draw' : win === 'player' ? 'Victory' : 'Defeat');
```

  The site's h1 comes from `src/lib/battle.ts:42`: `['<p class="mark">Kevin Liu</p>', '<h1 class="mark">Kevin Liu</h1>'],`.

- `public/battle/shared/battle.js:835-848`, the replay. `gen` is the battle's generation counter (line 191); `present`
  and `start` compare it after every `await`, this function does not:

```js
async function replayLast() {
  if (busy || !lastShot?.scene) return;
  busy = true; render();
  const s = { ...lastShot.scene, variant: reduced() ? 'reduced' : 'full' };
  const c = runtime.compileScene(s);
  await stage.prepare(s, c);
  dress(s, c);
  app.dataset.scene = 'replay';
  stage.anchors = { source: layout.anchor('source', s.side), target: null };
  await stage.play(s, c, {});
  delete app.dataset.scene;
  busy = false; render();
}
$('#replay').onclick = () => replayLast();
```

- `scripts/sync.mjs:190-195`, `:228` and `:232-235`, the three entries this plan extends (`HIDE`, `KEY_EASE`,
  `KEY_MOVE` and `NARROW_ARENA` are constants defined above them; `everyOf(file, text, find, replace, n)` replaces an
  anchor that must occur exactly `n` times, `scripts/sync.mjs:157-161`):

```js
  'public/battle/shared/battle.js': (t) => patch('battle.js', t, [
    // the layout switch renames the tab; it keeps this site's page titles instead
    ["const TITLES = { mat: 'Card Mat', arena: 'Arena' };", "const TITLES = { mat: 'Battle | Kevin Liu', arena: 'Battle, Arena | Kevin Liu' };"],
    ["/\\/arena\\//.test(location.pathname)", "/\\/arena(\\/|$)/.test(location.pathname)"],
    ["return `../../../r3/cards/index.html${p}`;", "return `/${p}`;"],
  ]),
```

```js
  'public/battle/mat/mat.css': (t) => patch('mat.css', t, [['  .mark { display: none; }', HIDE], [KEY_EASE, KEY_MOVE]]),
```

```js
  'public/battle/arena/arena.css': (t) => patch('arena.css', everyOf('arena.css', t, '  .mark { display: none; }', HIDE, 2), [
    ['/* ============================================================ reduced motion: every step a still */', before(NARROW_ARENA)],
    [KEY_EASE, KEY_MOVE],
  ]),
```

Repo rules that apply (from `AGENTS.md`): never edit the synced folders by hand; a fix to round code is an anchored
pair in `TRANSFORMS` in `scripts/sync.mjs`, then the sync; every page keeps one h1; append an entry to `memory.md`.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | ends `synced from 30e69931 + 42ff51c7: 3 written, 0 removed` |
| Build and release guard | `pnpm build` | ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Local serve of `dist/` | `pnpm preview --port 4394 --host 127.0.0.1` | serves the build; stop it with `pnpm exec astro preview stop` |
| Browser | `agent-browser open <url>`, `agent-browser wait <ms>`, `agent-browser eval "<js>"`, `agent-browser close` | prints the result |

`$HOME/k7-rescue/release-next/rounds-42ff51c7` is the export of the rounds at the shipped pins; a plain `pnpm sync`
from the live rounds folder fails by design. There is no test command in this repo.

## Scope

**In scope** (the only files you should modify):
- `scripts/sync.mjs` (five pairs added to the battle.js entry; the mat.css and arena.css entries reshaped)
- `public/battle/shared/battle.js`, `public/battle/mat/mat.css`, `public/battle/arena/arena.css` (rewritten by the
  sync, never by hand)
- `sync.lock.json` (rewritten by the sync)
- `docs/sync.md` (one bullet), `memory.md` (one appended entry)

**Out of scope** (do NOT touch):
- Anything in the rounds folder. Never write there.
- The single-key shortcuts themselves (1 to 4, G, S, K, A, R, L, N, M, X). See "Maintenance notes".
- Announcing more event kinds (status, heal, items, traits): this plan only stops the existing lines from being lost.
- `src/lib/battle.ts` (the page's h1 stays the wordmark), `public/battle/shared/hud.css`.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/018-battle-screen-reader-and-reduced-motion`
  cut from `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin` then
  `git -C ~/repos/kevinliu-studio worktree add -b improve/018-battle-screen-reader-and-reduced-motion ~/repos/kevinliu-studio-018 origin/main`.
  Never edit the main checkout. Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`.
  Use: `fix(battle): every outcome announced, the Mat's reduced-motion rule restored, one h1, a guarded replay`.
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Steps

### Step 1: Confirm the starting point and every anchor

`pnpm install --frozen-lockfile`, then:

```bash
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check
node --input-type=module <<'EOF'
import fs from 'node:fs';
const R = `${process.env.HOME}/k7-rescue/release-next/rounds-42ff51c7/r4/play/`;
const count = (file, anchors) => { const t = fs.readFileSync(R + file, 'utf8'); for (const a of anchors) console.log(t.split(a).length - 1, file); };
count('shared/battle.js', [
  "function live(text) { $('#live').textContent = text; }",
  "  if (stage.playing && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); e.stopPropagation(); skip(); return; }",
  "  el('h1', '', r, win === 'draw' ? 'Draw' : win === 'player' ? 'Victory' : 'Defeat');",
  "  if (busy || !lastShot?.scene) return;\n  busy = true; render();\n  const s = { ...lastShot.scene, variant: reduced() ? 'reduced' : 'full' };",
  "  await stage.play(s, c, {});\n  delete app.dataset.scene;\n  busy = false; render();\n}\n$('#replay').onclick = () => replayLast();",
]);
count('mat/mat.css', ['  .rail, .console, .key, .slot-lift, .slot[data-dim], }', '.result h1 {']);
count('arena/arena.css', ['.result h1 {']);
EOF
```

**Verify**: `in sync`; then five lines `1 shared/battle.js`, then `1 mat/mat.css`, `2 mat/mat.css`, `2 arena/arena.css`.

### Step 2: Add five pairs to the battle.js entry in `scripts/sync.mjs`

Inside the array of the `'public/battle/shared/battle.js'` entry, after the last existing pair and before its closing
`  ]),`, add:

```js
    // one batch's outcomes are announced together: a shot lands all its events in one loop, and each one overwrote
    // the live region, so a hit was lost behind the knockout that followed it
    ["function live(text) { $('#live').textContent = text; }", "// kevinliu.studio: one batch's outcomes are announced together, not only the last one written (scripts/sync.mjs)\nlet liveLines = [];\nfunction live(text) { if (!liveLines.length) queueMicrotask(() => { $('#live').textContent = liveLines.join(' '); liveLines = []; }); liveLines.push(text); }"],
    // Enter or Space on a focused speed, mode or sound key presses that key instead of skipping the scene, as a
    // pointer press on them already does (r4/play SPEC.md: "the speed buttons never skip")
    ["  if (stage.playing && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); e.stopPropagation(); skip(); return; }", "  if (stage.playing && (e.key === ' ' || e.key === 'Enter') && !e.target?.closest?.('dialog, .seg, .speed, .tip, #sound')) { e.preventDefault(); e.stopPropagation(); skip(); return; } // kevinliu.studio: a focused speed, mode or sound key is pressed, not skipped (scripts/sync.mjs)"],
    // the page's h1 is its wordmark (src/lib/battle.ts); the result's title is the next level down
    ["  el('h1', '', r, win === 'draw' ? 'Draw' : win === 'player' ? 'Victory' : 'Defeat');", "  el('h2', '', r, win === 'draw' ? 'Draw' : win === 'player' ? 'Victory' : 'Defeat'); // kevinliu.studio: the page keeps one h1 (scripts/sync.mjs)"],
    // a replay that a new battle overtakes leaves that battle's state alone, and one that throws unlocks the console
    ["  if (busy || !lastShot?.scene) return;\n  busy = true; render();\n  const s = { ...lastShot.scene, variant: reduced() ? 'reduced' : 'full' };", "  if (busy || !lastShot?.scene) return;\n  const my = gen; // kevinliu.studio: a replay that a new battle overtakes leaves that battle's state alone (scripts/sync.mjs)\n  busy = true; render();\n  try {\n  const s = { ...lastShot.scene, variant: reduced() ? 'reduced' : 'full' };"],
    ["  await stage.play(s, c, {});\n  delete app.dataset.scene;\n  busy = false; render();\n}\n$('#replay').onclick = () => replayLast();", "  await stage.play(s, c, {});\n  } finally {\n    if (app.dataset.scene === 'replay') delete app.dataset.scene;\n    if (my === gen) { busy = false; render(); }\n  }\n}\n$('#replay').onclick = () => replayLast();"],
```

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 3: Reshape the mat.css entry

Replace the whole `'public/battle/mat/mat.css'` line (shown under "Current state") with:

```js
  // the result's title is an h2 here (the page's h1 is its wordmark), so its two rules follow it. The Mat's
  // reduced-motion rule arrived from the round-5 merge with an unclosed selector list and no declarations, so the
  // browser dropped it and the Mat's rail, console, keys and slots kept their transitions under reduced motion; it is
  // the rule from before that merge again, less the retired .kit-chip
  'public/battle/mat/mat.css': (t) => patch('mat.css', everyOf('mat.css', t, '.result h1 {', '.result h2 {', 2), [
    ['  .mark { display: none; }', HIDE],
    [KEY_EASE, KEY_MOVE],
    ['  .rail, .console, .key, .slot-lift, .slot[data-dim], }', '  .rail, .console, .key, .slot-lift, .slot[data-dim], .result, #app[data-scene] .rail, #app[data-scene] .console, .slot[data-zone="finale"] :is(.chips, .tokens) { transition: none !important; }\n}'],
  ]),
```

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 4: Reshape the arena.css entry's first line

In the `'public/battle/arena/arena.css'` entry, replace only its first line

```js
  'public/battle/arena/arena.css': (t) => patch('arena.css', everyOf('arena.css', t, '  .mark { display: none; }', HIDE, 2), [
```

with

```js
  'public/battle/arena/arena.css': (t) => patch('arena.css', everyOf('arena.css', everyOf('arena.css', t, '  .mark { display: none; }', HIDE, 2), '.result h1 {', '.result h2 {', 2), [
```

Leave the pairs inside its array as they are.

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 5: Run the sync

`ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs`

**Verify**: ends `synced from 30e69931 + 42ff51c7: 3 written, 0 removed`. Then:

```bash
cp public/battle/shared/battle.js "${TMPDIR:-/tmp}/kls-018-battle.mjs" && node --check "${TMPDIR:-/tmp}/kls-018-battle.mjs" && echo ok
grep -c "liveLines" public/battle/shared/battle.js
grep -c "el('h1'" public/battle/shared/battle.js
grep -c "result h1" public/battle/mat/mat.css public/battle/arena/arena.css
grep -c "result h2 {" public/battle/mat/mat.css public/battle/arena/arena.css
grep -c '.slot\[data-dim\], .result, #app\[data-scene\] .rail, #app\[data-scene\] .console, .slot\[data-zone="finale"\] :is(.chips, .tokens) { transition: none !important; }' public/battle/mat/mat.css
grep -c ".slot\[data-dim\], }" public/battle/mat/mat.css
```

→ `ok`; `2`; `0`; `0` and `0`; `2` and `2`; `1`; `0`.

### Step 6: Build and check in a browser

```bash
pnpm build
pnpm preview --port 4394 --host 127.0.0.1 > "${TMPDIR:-/tmp}/kls-018-preview.log" 2>&1 &
for i in $(seq 1 40); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4394/battle)" = 200 ] && break; sleep 2; done
export AGENT_BROWSER_SESSION=improve-018
agent-browser open "http://127.0.0.1:4394/battle?auto=1"
agent-browser wait 60000
agent-browser eval "JSON.stringify({ h1: document.querySelectorAll('h1').length, live: document.getElementById('live').textContent, phase: document.getElementById('app').dataset.phase })"
agent-browser wait 240000
agent-browser eval "JSON.stringify({ h1: document.querySelectorAll('h1').length, resultH2: !!document.querySelector('#result h2'), phase: document.getElementById('app').dataset.phase })"
agent-browser set media reduced-motion
agent-browser open "http://127.0.0.1:4394/about"
agent-browser open "http://127.0.0.1:4394/battle"
agent-browser wait 15000
agent-browser eval "matchMedia('(prefers-reduced-motion: reduce)').matches"
agent-browser eval "getComputedStyle(document.querySelector('.rail')).transitionDuration"
agent-browser close
pnpm exec astro preview stop
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4394/
```

**Verify**: the build ends `all checks pass`. The first JSON line has `"h1":1` and a non-empty `"live"` (the battle
plays itself under `?auto=1`, so by 60 s at least one outcome has been announced). The second has `"h1":1`; when its
`"phase"` is `result` it must also have `"resultH2":true` (when the battle has not ended after five minutes on this
machine, report the phase and go on: the h2 is already proven by step 5's counts). The reduced-motion pair prints
`true` and then `0s`. (If the first of the pair prints `false`, the emulation did not take: run
`agent-browser set media light reduced-motion`, reload the battle and repeat the pair; if it is still `false`, report
that the browser check could not run and rely on step 5's counts.) The last line prints `000`.

### Step 7: Record it

- `docs/sync.md`, under "Transforms", add a bullet:
  ``- `battle/shared/battle.js`, `battle/mat/mat.css`, `battle/arena/arena.css`: one batch's outcomes are announced together; Enter or Space on a focused speed, mode or sound key presses it; the result's title is an h2; Replay is guarded by the battle's generation; and the Mat's reduced-motion rule, which round 5 shipped empty, is whole again.``
- Append an entry to `memory.md` (date, type fix, files, step 6's three results, open: the upstream request below and
  the single-key shortcut decision in "Maintenance notes").

**Verify**: `git status --short` lists exactly `scripts/sync.mjs`, `public/battle/shared/battle.js`,
`public/battle/mat/mat.css`, `public/battle/arena/arena.css`, `sync.lock.json`, `docs/sync.md`, `memory.md`. Commit
them by path.

## Upstream request (for the rounds lane)

The executor does not write in the rounds. Copy this section word for word into your final report; Kevin or the play
lane applies it (the lane's log is `r4/play/REQUESTS.md`).

Request lines (the rounds' format):

`site (kevinliu-studio) -> play: mat/mat.css: line 289's reduced-motion rule is ".rail, .console, .key, .slot-lift, .slot[data-dim], }" (the round-5 merge a2318daf cut it): restore ".rail, .console, .key, .slot-lift, .slot[data-dim], .result, #app[data-scene] .rail, #app[data-scene] .console, .slot[data-zone=\"finale\"] :is(.chips, .tokens) { transition: none !important; }" and close the block, because the browser drops the rule and the Mat's interface animates under reduced motion`

`site (kevinliu-studio) -> play: shared/battle.js: live() joins the lines written in one task and writes #live once (a shot's events land in one loop and each overwrote the last); the Space or Enter skip does not fire when the key's target is inside "dialog, .seg, .speed, .tip, #sound" (the pointer path's own list; SPEC.md says the speed buttons never skip); replayLast captures gen, wraps its body in try/finally and only clears busy when gen is unchanged, because a hit was never announced when a knockout followed it, a focused speed key could not be pressed with the keyboard during a scene, and a Rematch during a replay unlocked the console mid-deal`

`site (kevinliu-studio) -> play: shared/battle.js and both sheets: the result's title is an h2 (.result h2), because the site serves the wordmark as the page's h1`

Source lines at rounds HEAD `868340d7` (unchanged since `42ff51c7`): `r4/play/shared/battle.js:672` (`live`), `:857`
(the skip), `:800` (the heading), `:835-847` (`replayLast`); `r4/play/mat/mat.css:289`, `:239`, `:270`;
`r4/play/arena/arena.css:289`, `:345`. The replacement text is the right-hand side of each pair in steps 2 and 3.

## Test plan

This repo has no test runner. The checks are: the anchor counts (step 1), the counts on the synced files (step 5),
the release guard (one h1 per built page is one of its checks), and step 6's browser checks: one h1 while the battle
plays, a non-empty live region, an h2 at the result, and a zero transition duration on the Mat's rail under reduced
motion (before this plan that last value is `0.2s`).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] Step 5's seven counts are `ok`, `2`, `0`, `0`/`0`, `2`/`2`, `1`, `0`
- [ ] `pnpm build` ends with `all checks pass`
- [ ] In step 6: `"h1":1` in both JSON lines, a non-empty `"live"`, and `0s` under reduced motion; the server answers `000` afterwards
- [ ] `git status --short` shows no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync` before your
  first edit.
- Any count in step 1 differs, or the sync stops with `anchor found N times`.
- The sync writes files other than the three named.
- In step 6 the battle does not play (`"phase"` stays `boot` or `deal` at 60 s) or `"live"` is empty at 60 s: the
  change to `live()` may have broken the page. Revert `scripts/sync.mjs`, run the sync again, and report.
- Reduced motion is emulated (`true`) and the rail's transition duration is not `0s`. Report the value.

## Maintenance notes

- When a later rounds pin carries the upstream change, the anchors stop matching, the sync stops and names them, and
  these pairs are deleted in the same commit as the pin move.
- **Not in this plan, and it needs a design decision:** the battle's single-key shortcuts (1 to 4, G, S, K, A, R, L,
  N, M, X on `window`, `public/battle/shared/battle.js:854-865`) have no off switch and cannot be remapped, which
  fails WCAG 2.1.4 (Character Key Shortcuts, Level A) for speech-input users. A fix needs a new control in r4/play's
  rail (the same place the Machine switch is waiting for) or a rule for when the keys are live. That is Kevin's and
  the play lane's call.
- Also left for the play lane: announcing status, heal, drain, recoil, barrier, stat changes, items, Guard and traits
  (the visual log writes them, `public/battle/shared/hud.js`; the live region does not), and
  `pointer-events: none` on `#app[data-scene] .result`, whose keys stay clickable while invisible.
- The Space and Enter exemption uses the pointer path's own list. If the round adds a control that stays usable during
  a scene, both lists need it.
