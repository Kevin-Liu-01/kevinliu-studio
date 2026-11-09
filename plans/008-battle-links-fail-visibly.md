# Plan 008: A battle link that cannot start says why, and never leaves a blank page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs public/battle/shared/battle.js public/battle/arena/board.js src/components/BattlePage.astro sync.lock.json docs/battle.md docs/sync.md`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c6245d9`, 2026-11-09 (rounds HEAD `868340d7`; battle pinned at `42ff51c7`)

## Why this matters

A battle's address holds its teams, seed, mode, map and move log, so people share it. Three things go wrong with a
bad one today:

1. An unknown or over-budget card, or a log an older rules version wrote, makes the engine refuse the battle. The page
   writes the reason into its alert and starts the default hand, and the default hand's start erases the alert in the
   same task. The visitor sees a different battle with nothing said, and the address is overwritten.
2. `#mode=constructor` (or `toString`, `__proto__`) passes the page's mode check, because the check reads a plain
   object by key. The layout then fails to load, the start promise rejects with nothing to catch it, and the page
   stays hidden for good: its whole `#app`, the alert and the Leave link included. `#map=constructor` does the same on
   the Arena.
3. Any failure on the boot path (a layout, map or figure file that will not load on a weak connection) ends the same
   way: a blank page with no error state.

After this plan: the reason stays on screen while the fallback hand plays; a log that will not replay is retried as
the same teams without the log before the default hand is used; `mode=` and `map=` are checked as the list's own
keys; a start that rejects un-hides the page and says so; and a script that never loads cannot leave the page hidden
for more than 8 seconds. The engine's own validation is sound and is not changed.

## Current state

The battle page is round code: `r4/play` in the design rounds repo
(`/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`), lane r4/play. `shared/battle.js` and
`arena/board.js` have not changed between the shipped pin `42ff51c7` and rounds HEAD `868340d7`. The site ships them
as `public/battle/shared/battle.js` (with three site patches from `scripts/sync.mjs`) and
`public/battle/arena/board.js` (unpatched). Line numbers are the same in both repos.

- `public/battle/shared/battle.js:13` and `:196`, the mode check. `MODES` is a plain object, so an inherited name is
  truthy:

```js
const MODES = { mat: () => import('../mat/board.js').then((m) => m.MatBoard), arena: () => import('../arena/board.js').then((m) => m.ArenaBoard) };
...
let mode = MODES[hashParams.get('mode')] ? hashParams.get('mode') : /\/arena(\/|$)/.test(location.pathname) ? 'arena' : 'mat';
```

- `public/battle/shared/battle.js:906-910` and `:923`, the start. The catch writes the alert and calls
  `start(DEFAULT)`, which runs synchronously down to line 923 and clears it:

```js
const DEFAULT = { team: ['claude-of-tanks', 'katagami', 'bday-land'], rival: ['jarhead', 'mailroom', 'cotfly'], seed: 30 };
async function start(p, replay = false, resume = false) {
  let next;
  try { next = sd.start({ team: p.team, rival: p.rival, seed: p.seed, log: replay || resume ? p.log : undefined }); }
  catch (err) { $('#error').textContent = String(err.message ?? err); if (!match) start(DEFAULT); return; }
  ...
  $('#error').textContent = '';
  hud.bind(match);
```

- `public/battle/shared/battle.js:1001-1004`, the boot. Neither promise is caught:

```js
const first = sd.parseHash(location.hash);
const resuming = Boolean(first.log) && hashParams.get('resume') === '1';
if (q.get('fixture')) runFixture(q.get('fixture'));
else start({ ...DEFAULT, ...first, leaders: hashParams.get('leaders') ?? undefined, map: hashParams.get('map') ?? undefined }, Boolean(first.log) && !resuming, resuming);
```

- `public/battle/shared/battle.js:942-944`: the page is un-hidden only when a start reaches
  `delete document.documentElement.dataset.boot;`.
- `public/battle/shared/battle.css:58` (and `mat/mat.css:40`, `arena/arena.css:28`): `html[data-boot] #app { visibility: hidden; }`.
- `public/battle/arena/board.js:21` and `:26-29`, the map check, the same pattern:

```js
export const MAPS = { archive: 'Lantern Archive', atelier: 'Design Atelier', foundry: 'Red Machine Foundry', observatory: 'Cloud Observatory', runtime: 'Runtime Engine Hall', terrace: 'Moss Survey Terrace' };
...
const mapOf = (ctx) => {
  const map = ctx.map && MAPS[ctx.map] ? ctx.map : HOME[ctx.leaders[1]] ?? 'atelier';
  return innerWidth < 600 ? PHONE_SKIP[map] ?? map : map;
};
```

- `vendor/battle/mat/index.html:91`, the alert the page already has: `<p class="error" id="error" role="alert"></p>`.
- `src/components/BattlePage.astro:29-31`, where the site adds its own inline script before the round page's head
  (which loads `shared/pace.js`, the script that later replaces `window.setTimeout` with a scene-time version):

```astro
<script is:inline>/* the page writes its state as a bare "#..." address; ... */(function(h){['replaceState','pushState'].forEach(function(k){var f=h[k];h[k]=function(s,t,u){...}})})(history)</script>
<Release />
<Fragment set:html={battlePage.head} />
```

- `scripts/sync.mjs:190-195`, the battle.js entry the first part of this plan extends:

```js
  'public/battle/shared/battle.js': (t) => patch('battle.js', t, [
    // the layout switch renames the tab; it keeps this site's page titles instead
    ["const TITLES = { mat: 'Card Mat', arena: 'Arena' };", "const TITLES = { mat: 'Battle | Kevin Liu', arena: 'Battle, Arena | Kevin Liu' };"],
    ["/\\/arena\\//.test(location.pathname)", "/\\/arena(\\/|$)/.test(location.pathname)"],
    ["return `../../../r3/cards/index.html${p}`;", "return `/${p}`;"],
  ]),
```

- `scripts/sync.mjs:148-155` and `:175`: a pair is `[find, replace]`; `find` must occur exactly once; `replace` may be
  a function of the found text, and `const after = (add) => (find) => find + add;` appends after it.
- The engine's messages are readable as they are, for example `Unknown fighter nope`, `Team: ...`, `Replay: ...`
  (`vendor/battle/vendor/engine.js`).

Repo rules that apply (from `AGENTS.md`): the synced folders (`public/battle`, `vendor/`) are never edited by hand; a
fix to round code is an anchored pair in `TRANSFORMS` in `scripts/sync.mjs`, then the sync; every page keeps one h1, a
canonical, JSON-LD and a Markdown twin (`pnpm build` checks); append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | ends `synced from 30e69931 + 42ff51c7: 2 written, 0 removed` |
| Build and release guard | `pnpm build` | ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Local serve of `dist/` | `pnpm preview --port 4392 --host 127.0.0.1` | serves the build; stop it with `pnpm exec astro preview stop` |
| Browser | `agent-browser open <url>`, `agent-browser wait <ms>`, `agent-browser eval "<js>"`, `agent-browser close` | prints the result |

`$HOME/k7-rescue/release-next/rounds-42ff51c7` is the export of the rounds at the shipped pins; a plain `pnpm sync`
from the live rounds folder fails by design. There is no test command in this repo.

## Scope

**In scope** (the only files you should modify):
- `scripts/sync.mjs` (six pairs added to the battle.js entry; one new entry for `public/battle/arena/board.js`)
- `public/battle/shared/battle.js`, `public/battle/arena/board.js` (rewritten by the sync, never by hand)
- `sync.lock.json` (rewritten by the sync)
- `src/components/BattlePage.astro` (one inline script)
- `docs/battle.md`, `docs/sync.md` (a short note each), `memory.md` (one appended entry)

**Out of scope** (do NOT touch):
- Anything in the rounds folder. Never write there.
- `vendor/battle/vendor/engine.js` and the kit: the engine's validation already rejects every bad input.
- `src/lib/battle.ts`, the address format, `leaders=` (already filtered), the `?fixture=` feature itself.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/008-battle-links-fail-visibly` cut from
  `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin` then
  `git -C ~/repos/kevinliu-studio worktree add -b improve/008-battle-links-fail-visibly ~/repos/kevinliu-studio-008 origin/main`.
  Never edit the main checkout. Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`.
  Use: `fix(battle): a link that cannot start says why and never leaves the page hidden`.
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Steps

### Step 1: Confirm the starting point

`pnpm install --frozen-lockfile`, then the sync check.

**Verify**: `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` → prints `in sync`.

### Step 2: Confirm every anchor occurs exactly once

```bash
node --input-type=module <<'EOF'
import fs from 'node:fs';
const R = `${process.env.HOME}/k7-rescue/release-next/rounds-42ff51c7/r4/play/`;
const count = (file, anchors) => { const t = fs.readFileSync(R + file, 'utf8'); for (const a of anchors) console.log(t.split(a).length - 1, file); };
count('shared/battle.js', [
  "let mode = MODES[hashParams.get('mode')] ? hashParams.get('mode') :",
  "const DEFAULT = { team: ['claude-of-tanks', 'katagami', 'bday-land'], rival: ['jarhead', 'mailroom', 'cotfly'], seed: 30 };\n",
  "  catch (err) { $('#error').textContent = String(err.message ?? err); if (!match) start(DEFAULT); return; }",
  "  $('#error').textContent = '';\n  hud.bind(match);",
  "else start({ ...DEFAULT, ...first, leaders: hashParams.get('leaders') ?? undefined, map: hashParams.get('map') ?? undefined }, Boolean(first.log) && !resuming, resuming);",
  "if (q.get('fixture')) runFixture(q.get('fixture'));",
]);
count('arena/board.js', ["  const map = ctx.map && MAPS[ctx.map] ? ctx.map : HOME[ctx.leaders[1]] ?? 'atelier';"]);
EOF
```

**Verify**: seven lines, each starting with `1`.

### Step 3: Add six pairs to the battle.js entry in `scripts/sync.mjs`

Inside the array of the `'public/battle/shared/battle.js'` entry (shown under "Current state"), after the last
existing pair and before the closing `  ]),`, add:

```js
    // an address that cannot start: `mode=` is checked as the list's own key (an inherited name such as "constructor"
    // passed, the layout failed to load and the page stayed hidden); the reason stays on screen after the hand that
    // plays instead begins (its start cleared the alert in the same task); a log that will not replay is retried as
    // the same teams without it before the default hand; and a start that rejects un-hides the page and says so
    ["let mode = MODES[hashParams.get('mode')] ? hashParams.get('mode') :", "let mode = Object.hasOwn(MODES, hashParams.get('mode') ?? '') ? hashParams.get('mode') :"],
    ["const DEFAULT = { team: ['claude-of-tanks', 'katagami', 'bday-land'], rival: ['jarhead', 'mailroom', 'cotfly'], seed: 30 };\n", after("// kevinliu.studio: why an address could not start, kept on screen after the hand that plays instead begins; and a boot that\n// rejects (a layout, map or figure file that will not load) un-hides the page with the reason (scripts/sync.mjs)\nlet keptError = '';\nfunction bootFailed(err) {\n  if (document.documentElement.dataset.boot === undefined) return;\n  delete document.documentElement.dataset.boot;\n  $('#error').textContent = `The battle could not start (${String(err?.message ?? err)}). Reload the page, or Leave.`;\n}\n")],
    ["  catch (err) { $('#error').textContent = String(err.message ?? err); if (!match) start(DEFAULT); return; }", "  catch (err) {\n    const retry = (replay || resume) && p.log;\n    keptError = `${String(err.message ?? err)} ${retry ? 'Playing this hand from its start.' : 'Playing the default hand.'}`;\n    $('#error').textContent = String(err.message ?? err);\n    if (!match && p !== DEFAULT) start(retry ? { ...p, log: undefined } : DEFAULT).catch(bootFailed);\n    else keptError = '';\n    return;\n  }"],
    ["  $('#error').textContent = '';\n  hud.bind(match);", "  $('#error').textContent = keptError; keptError = '';\n  hud.bind(match);"],
    ["else start({ ...DEFAULT, ...first, leaders: hashParams.get('leaders') ?? undefined, map: hashParams.get('map') ?? undefined }, Boolean(first.log) && !resuming, resuming);", "else start({ ...DEFAULT, ...first, leaders: hashParams.get('leaders') ?? undefined, map: hashParams.get('map') ?? undefined }, Boolean(first.log) && !resuming, resuming).catch(bootFailed);"],
    ["if (q.get('fixture')) runFixture(q.get('fixture'));", "if (q.get('fixture')) runFixture(q.get('fixture')).catch(bootFailed);"],
```

How the new catch behaves, so you can check it by reading: a failed start with no battle yet (`!match`) and not
already the default hand starts either the same teams without the log (when the log was the problem) or the default
hand; `keptError` carries the reason into that start, which writes it into the alert on the line that used to clear
it. A failure while a battle already exists only shows the reason. The default hand never retries itself.

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 4: Add the entry for the Arena's map check

In `scripts/sync.mjs`, directly after the closing `  ]),` of the `'public/battle/shared/battle.js'` entry, add a new
entry (if an entry for `'public/battle/arena/board.js'` already exists, add the pair to its array instead):

```js
  // `map=` is checked as the list's own key: an inherited name ("constructor") passed, its ground file was a 404 and
  // the Arena's boot rejected with the page still hidden
  'public/battle/arena/board.js': (t) => patch('board.js', t, [
    ["  const map = ctx.map && MAPS[ctx.map] ? ctx.map : HOME[ctx.leaders[1]] ?? 'atelier';", "  const map = ctx.map && Object.hasOwn(MAPS, ctx.map) ? ctx.map : HOME[ctx.leaders[1]] ?? 'atelier';"],
  ]),
```

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 5: Run the sync

`ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs`

**Verify**: ends `synced from 30e69931 + 42ff51c7: 2 written, 0 removed`. Then:
`cp public/battle/shared/battle.js "${TMPDIR:-/tmp}/kls-008-battle.mjs" && node --check "${TMPDIR:-/tmp}/kls-008-battle.mjs"` → exit 0;
the same for `public/battle/arena/board.js`;
`grep -c "bootFailed" public/battle/shared/battle.js` → `4`;
`grep -c "Object.hasOwn(MAPS" public/battle/arena/board.js` → `1`.

### Step 6: Add the site's backstop to `src/components/BattlePage.astro`

Directly after the existing `<script is:inline>` line that wraps `history.replaceState` (line 29) and before
`<Release />`, add this one line. It must stay before `<Fragment set:html={battlePage.head} />`, because that head
loads `shared/pace.js`, which replaces `window.setTimeout`; this script keeps the browser's own.

```astro
<script is:inline>/* a boot that never finishes (a script that will not load, an error before the first frame) un-hides the page after 8 s with a reason in the alert, so the alert and Leave can be reached; a boot that finishes first is left alone */(function(d,wait){var asked=false;function check(){asked=false;if(d.dataset.boot===undefined)return;delete d.dataset.boot;var e=document.getElementById('error');if(e&&!e.textContent)e.textContent='The battle could not start. Reload the page, or Leave.'}function later(ev){if(asked||d.dataset.boot===undefined)return;if(ev.type==='error'&&!(ev instanceof ErrorEvent)&&!(ev.target&&ev.target.tagName==='SCRIPT'))return;asked=true;wait(check,8000)}addEventListener('error',later,true);addEventListener('unhandledrejection',later)})(document.documentElement,setTimeout.bind(window))</script>
```

It ignores failed pictures and clips (only a failed `<script>` or an uncaught error counts), and it waits 8 seconds so
an error that did not stop the boot changes nothing.

**Verify**: `pnpm build` → ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass`, and
`grep -c "un-hides the page after 8 s" dist/battle.html dist/battle/arena.html` → `1` for each file.

### Step 7: Check the behaviour in a browser

```bash
pnpm preview --port 4392 --host 127.0.0.1 > "${TMPDIR:-/tmp}/kls-008-preview.log" 2>&1 &
for i in $(seq 1 40); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4392/battle)" = 200 ] && break; sleep 2; done
export AGENT_BROWSER_SESSION=improve-008
B=http://127.0.0.1:4392
probe='JSON.stringify({ hidden: document.documentElement.dataset.boot !== undefined, phase: document.getElementById("app").dataset.phase, error: document.getElementById("error").textContent, hash: location.hash })'
agent-browser open "$B/battle#mode=constructor";            agent-browser wait 12000; agent-browser eval "$probe"
agent-browser open "$B/about"
agent-browser open "$B/battle/arena#map=constructor";       agent-browser wait 12000; agent-browser eval "$probe"
agent-browser open "$B/about"
agent-browser open "$B/battle#team=nope,nope,nope";         agent-browser wait 12000; agent-browser eval "$probe"
agent-browser open "$B/about"
agent-browser open "$B/battle?fixture=9";                   agent-browser wait 12000; agent-browser eval "$probe"
agent-browser open "$B/about"
agent-browser open "$B/battle";                             agent-browser wait 12000; agent-browser eval "$probe"
agent-browser eval "document.documentElement.dataset.boot = ''; dispatchEvent(new ErrorEvent('error', { message: 'x' })); 1"
agent-browser wait 9000; agent-browser eval "$probe"
agent-browser close
pnpm exec astro preview stop
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4392/
```

(The visits to `/about` between cases make each battle address a fresh page load; a change of hash alone does not
reload the page.)

**Verify**, one JSON line per case:
1. `mode=constructor`: `"hidden":false`, `"phase"` is `entrance` or `live`, `"error":""`, and `hash` contains `mode=mat`.
2. `map=constructor` on the Arena: `"hidden":false`, `"phase"` is `entrance` or `live`, `"error":""`.
3. `team=nope,nope,nope`: `"hidden":false`, `"error"` is not empty and ends with `Playing the default hand.`, and
   `hash` contains `team=claude-of-tanks,katagami,bday-land`.
4. `?fixture=9`: `"hidden":false` and `"error"` starts with `The battle could not start`.
5. plain `/battle`: `"hidden":false`, `"error":""` (no false alarm).
6. after the simulated late error: `"hidden":false` and `"error"` is `The battle could not start. Reload the page, or Leave.`

The last line prints `000` (the server is stopped).

### Step 8: Record it

- `docs/battle.md`, after the "Address:" bullet, add a bullet:
  `- A link that cannot start says why in the page's alert and plays the same teams without the log, or the default hand; mode= and map= accept only their own names; a boot that fails un-hides the page with the reason (sync transforms, and one inline script in BattlePage.astro).`
- `docs/sync.md`, under "Transforms", add a bullet:
  ``- `battle/shared/battle.js`, `battle/arena/board.js`: a bad address keeps its reason on screen, retries without its log, checks `mode=` and `map=` as own keys, and a start that rejects un-hides the page.``
- Append an entry to `memory.md` (date, type fix, files, the six results of step 7, open: the upstream request below).

**Verify**: `git status --short` lists exactly `scripts/sync.mjs`, `public/battle/shared/battle.js`,
`public/battle/arena/board.js`, `sync.lock.json`, `src/components/BattlePage.astro`, `docs/battle.md`, `docs/sync.md`,
`memory.md`. Commit them by path.

## Upstream request (for the rounds lane)

The executor does not write in the rounds. Copy this section word for word into your final report; Kevin or the play
lane applies it (the lane's log is `r4/play/REQUESTS.md`).

Request lines (the rounds' format):

`site (kevinliu-studio) -> play: shared/battle.js: check mode= with Object.hasOwn(MODES, ...), keep a failed start's reason in #error after the fallback hand starts (start() clears it in the same task), retry a failed replay or resume as the same teams without the log before DEFAULT, never retry DEFAULT itself, and catch the boot's start() and runFixture() promises with a handler that removes data-boot and writes #error, because #mode=constructor and any boot-path network failure left the page hidden for good and a bad shared link opened the default hand with nothing said`

`site (kevinliu-studio) -> play: arena/board.js: mapOf checks Object.hasOwn(MAPS, ctx.map), because #map=constructor fetched a 404 ground and the Arena's boot rejected with the page hidden`

Source edits at rounds HEAD `868340d7` (unchanged since `42ff51c7`), the same text as the site's pairs:

- `r4/play/shared/battle.js:196`: `MODES[hashParams.get('mode')]` becomes `Object.hasOwn(MODES, hashParams.get('mode') ?? '')`.
- `r4/play/shared/battle.js:906-910`: add `let keptError = '';` and the `bootFailed(err)` function after `DEFAULT`, and
  replace the one-line `catch` with the block in step 3.
- `r4/play/shared/battle.js:923`: `$('#error').textContent = '';` becomes `$('#error').textContent = keptError; keptError = '';`.
- `r4/play/shared/battle.js:1003-1004`: append `.catch(bootFailed)` to both the `runFixture(...)` and the `start(...)` call.
- `r4/play/arena/board.js:27`: `MAPS[ctx.map]` becomes `Object.hasOwn(MAPS, ctx.map)`.

## Test plan

This repo has no test runner. The regression checks are step 7's six cases, which cover: an inherited `mode`, an
inherited `map`, an unknown team, a boot that rejects (`?fixture=9` asks for a file the site does not ship), a healthy
boot with no false alarm, and the 8 second backstop.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] `grep -c "bootFailed" public/battle/shared/battle.js` prints `4`; `grep -c "Object.hasOwn(MAPS" public/battle/arena/board.js` prints `1`
- [ ] `pnpm build` ends with `all checks pass`
- [ ] All six results in step 7 match, and the server answers `000` afterwards
- [ ] `git status --short` shows no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync` before your
  first edit.
- Any anchor in step 2 does not print `1`, or the sync stops with `patch anchor found N times`.
- The sync writes files other than `public/battle/shared/battle.js` and `public/battle/arena/board.js`.
- Case 5 in step 7 (the plain battle) shows a non-empty `error` or `"hidden":true`: the change broke a healthy boot.
  Revert `scripts/sync.mjs` and `BattlePage.astro`, run the sync again, and report.
- A case in step 7 still shows `"hidden":true` after 12 seconds. Report which, with the output of
  `agent-browser eval "document.getElementById('error').textContent"`.

## Maintenance notes

- When a later rounds pin carries the upstream change, the anchors stop matching, the sync stops and names them, and
  the pairs (and the `board.js` entry, if it holds nothing else) are deleted in the same commit as the pin move. The
  inline script in `BattlePage.astro` can stay: it is harmless beside an upstream handler.
- `map=constructor` stays in the address (the page copies `map=` through); the Arena ignores it and uses the leader's
  home map. Harmless, and not changed here.
- The three sentences the page can now show ("Playing the default hand.", "Playing this hand from its start.", "The
  battle could not start ...") are new visible strings: the i18n branch will need keys for them.
- A reviewer should read the new `catch` for one thing: `start(DEFAULT)` can never call itself again.
