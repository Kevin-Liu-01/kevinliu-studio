# Plan 006: A phone keeps the Pick Three team when the visitor comes back to the wall

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- src/components/Release.astro docs/performance.md public/ex/gallery.js`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

On the home page (the wall of 26 project cards) a visitor picks up to three cards into the dock ("Pick Three") and
plays them in the battle. On a touch screen the site deliberately reloads the wall whenever the visitor returns to it
with Back, to keep a phone's tab under its memory limit. The reload throws the picked team away: the team is only
ever written to the address when Play is pressed. So a phone visitor who picks one to three cards, taps About (or any
link), and presses Back finds an empty dock. A desktop keeps the team, because there the browser restores the page as
it was. After this plan the wall writes the team into its own address just before that reload, and the wall's
existing restore step reads it back, so the dock looks the same before and after.

## Current state

- `src/components/Release.astro` — one inline script, used by the two heavy pages: the wall
  (`src/layouts/Base.astro:51`, `{heavy && <Release />}`, and only `src/pages/index.astro` passes `heavy`) and the
  battle (`src/components/BattlePage.astro:30`). On a touch screen it gives the page's GPU memory and pictures back
  when the page enters the browser's back-forward cache (`pagehide` with `persisted`), and reloads the page when it
  comes back out of it (`pageshow` with `persisted`). The whole script is one line; it ends
  (`src/components/Release.astro:7`):

```js
addEventListener("pageshow",function(e){if(e.persisted)location.reload()})})()</script>
```

  The `pagehide` half only empties canvases, videos and `<img>` sources. The page's JavaScript state is untouched, so
  at `pageshow` the wall still knows its team.

- `public/ex/gallery.js` — the wall's script (synced from the design rounds, `r4/ex/gallery.js`; NEVER edit it). It
  exposes the dock's state read-only (`public/ex/gallery.js:1065-1074`):

```js
  globalThis.__table = Object.freeze({
    get order() { return FIGHTERS.map((f) => f.id); },
    get you() { return S.you.slice(); },
    get rival() { return S.rival.slice(); },
    get seed() { return S.seed; },
```

  It writes the team to the address only when Play is pressed (`public/ex/gallery.js:550`):

```js
    history.replaceState(history.state, '', location.pathname.replace(/\/cards\/[^/]+$/, '/') + location.search + `#you=${S.you.join(',')}&rival=${S.rival.join(',')}&seed=${S.seed}`);
```

  and reads it back on every load (`public/ex/gallery.js:975-985`):

```js
  function restore() {
    const h = new URLSearchParams(location.hash.slice(1));
    const ids = (k) => (h.get(k) || '').split(',').filter((id) => cards[id]);
    const mine = ids('you'), theirs = ids('rival').filter((id) => !mine.includes(id));
    if (Number(h.get('seed')) > 0) S.seed = Math.floor(Number(h.get('seed')));
    if (!mine.length || mine.length > SIZE || spent(mine) > BUDGET) return;
    S.you = mine;
    if (theirs.length === SIZE && spent(theirs) <= BUDGET && mine.length === SIZE) S.rival = theirs;
    teamChanged();
  }
  restore();
```

  So an address `/#you=katagami,mailroom&rival=&seed=30` restores a two-card team, and
  `/#you=a,b,c&rival=x,y,z&seed=7` restores both teams. An empty `rival=` is fine (`ids('rival')` is then empty).

- The battle page has no `__table`. The script must do nothing new there.
- While a card's lens is open on the wall, the address is `/cards/<id>` (the lens writes it), and the reload then
  loads that card's own page, which has no dock. This plan leaves that case as it is.

- `docs/performance.md:120`, the row of the Memory table that describes this reload:

```
| Safari's back-forward cache keeps the wall and the battle alive behind the page in view | the whole page | On a touch screen they lose their WebGL contexts and drop canvases, clips and pictures as they enter it; a return loads them again |
```

Repo rules that apply (from `AGENTS.md`): `public/ex`, `public/battle`, `public/sound`, `public/og` and `vendor/` are
synced from the design rounds and never edited by hand; a phone's tab stays under its memory budget
(`docs/performance.md`, Memory), so the reload itself stays; append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Build and release guard | `pnpm build` | last line starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass` |
| The reload's logic, no browser (created in step 1) | `node scripts/check-release.mjs dist/index.html` | `release: 5 cases pass`, exit 0 |
| Same, on the battle page | `node scripts/check-release.mjs dist/battle.html` | `release: 5 cases pass`, exit 0 |

There is no test runner, linter or CI in this repo. Do not run `pnpm check` (it is broken on `main`).

## Scope

**In scope** (the only files you should modify):
- `src/components/Release.astro`
- `scripts/check-release.mjs` (create)
- `docs/performance.md` (the one table row quoted above)
- `memory.md` (append one entry)
- `plans/README.md` (your status row)

**Out of scope** (do NOT touch, even though they look related):
- `public/ex/gallery.js` and every other file under `public/` and `vendor/`: synced round code. `restore()` already
  does what is needed.
- `scripts/sync.mjs` and `scripts/phone-memory.mjs`: no patch to round code is needed for this.
- The `pagehide` half of the script (the WebGL, canvas, video and picture release). Do not change what it gives back.
- Removing or weakening the reload: it is the phone memory fix (`docs/performance.md`, Memory).
- Saving the team anywhere else (localStorage, sessionStorage). The address is the one place the wall already reads.
- The lens-open case (`/cards/<id>` in the address): left as it is.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/006-phone-keeps-team-after-back` cut
  from `origin/main`. Never edit the main checkout (other sessions use it). Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`. For this plan:
  `fix(wall): a phone keeps the dock's team when it comes back to the wall`
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Add the check, and see it fail on today's build

Create `scripts/check-release.mjs` with exactly this content:

```js
#!/usr/bin/env node
// Checks Release.astro's inline script in a built page without a browser: node scripts/check-release.mjs dist/index.html
// It runs the script with a touch screen stubbed in and asserts what a return from the back-forward cache does: the
// wall writes the dock's team into its address, then reloads; a page without a team, or without a dock, only reloads.
import fs from 'node:fs';
import vm from 'node:vm';
const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check-release.mjs <built page>'); process.exit(2); }
const m = fs.readFileSync(file, 'utf8').match(/<script>(\(function\(\)\{if\(!matchMedia\("\(pointer: coarse\)"\)[\s\S]*?)<\/script>/);
if (!m) { console.error(`no Release script in ${file}`); process.exit(1); }
const run = (table, pathname) => {
  const calls = [], on = {};
  const ctx = {
    matchMedia: () => ({ matches: true }),
    HTMLCanvasElement: function () {},
    addEventListener: (type, fn) => { on[type] = fn; },
    document: { querySelectorAll: () => [] },
    history: { state: null, replaceState: (state, title, url) => calls.push(`replace ${url}`) },
    location: { pathname, search: '', reload: () => calls.push('reload') },
  };
  ctx.self = ctx;
  if (table) ctx.__table = table;
  vm.runInNewContext(m[1], ctx);
  on.pageshow({ persisted: false });
  if (calls.length) throw new Error('acted on a pageshow that was not from the back-forward cache');
  on.pageshow({ persisted: true });
  return calls.join(' | ');
};
// [the dock's state (gallery.js __table) or null for a page without one, the path, what must happen]
const CASES = [
  [{ you: ['katagami', 'mailroom'], rival: [], seed: 30 }, '/', 'replace /#you=katagami,mailroom&rival=&seed=30 | reload'],
  [{ you: ['katagami', 'mailroom', 'elo'], rival: ['jarhead', 'cotfly', 'loop'], seed: 7 }, '/', 'replace /#you=katagami,mailroom,elo&rival=jarhead,cotfly,loop&seed=7 | reload'],
  [{ you: [], rival: [], seed: 30 }, '/', 'reload'],
  [null, '/battle', 'reload'],
  [{ you: ['katagami'], rival: [], seed: 30 }, '/cards/katagami', 'reload'],
];
let bad = 0;
for (const [table, pathname, want] of CASES) {
  const got = run(table, pathname);
  if (got !== want) { bad++; console.error(`${JSON.stringify(table)} at ${pathname}: got "${got}", expected "${want}"`); }
}
if (bad) process.exit(1);
console.log(`release: ${CASES.length} cases pass`);
```

Then run `pnpm install --frozen-lockfile` and `pnpm build` (a fresh worktree has neither `node_modules` nor `dist`).

**Verify**: `node scripts/check-release.mjs dist/index.html; echo "exit $?"` → two lines that end
`got "reload", expected "replace /#you=...` and `exit 1`. That failure is the bug.

### Step 2: Write the team into the address before the reload

In `src/components/Release.astro`, in the one `<script is:inline>` line, replace exactly this text (it occurs once, at
the end of the line):

```js
addEventListener("pageshow",function(e){if(e.persisted)location.reload()})
```

with exactly this text:

```js
addEventListener("pageshow",function(e){if(!e.persisted)return;try{var t=self.__table;if(t&&t.you.length&&location.pathname==="/")history.replaceState(history.state,"","/"+location.search+"#you="+t.you.join(",")+"&rival="+t.rival.join(",")+"&seed="+t.seed)}catch(_){}location.reload()})
```

What it does: on a return from the back-forward cache, if the page has a dock (`self.__table`, the wall only), the
dock holds at least one card and the address is the wall's (`/`), it writes the same `#you=…&rival=…&seed=…` that
Play writes, then reloads as before. Anything that goes wrong in the write is swallowed, so the reload always runs.
Use double quotes only, as the rest of the line does. Keep the script on one line.

Also extend the comment block at the top of the file (the lines between the two `---`) with one sentence at its end:

```
// On the wall the reload keeps the dock's team: the team is written to the address first (gallery.js restore() reads it).
```

**Verify**: `grep -c 'if(e.persisted)location.reload()' src/components/Release.astro` → `0`.
**Verify**: `grep -c 'self.__table' src/components/Release.astro` → `1`.

### Step 3: Build and run the check on both heavy pages

Run `pnpm build`.

**Verify**: last line ends `all checks pass`.
**Verify**: `node scripts/check-release.mjs dist/index.html` → `release: 5 cases pass`.
**Verify**: `node scripts/check-release.mjs dist/battle.html` → `release: 5 cases pass`.
**Verify**: `node scripts/check-release.mjs dist/battle/arena.html` → `release: 5 cases pass`.

### Step 4: Check it in a browser, if `agent-browser` is installed

This is the behavioural check. It cannot put a page into a real back-forward cache, so it sends the page the same
event the browser sends on return. Run `which agent-browser`. If it prints nothing, skip this step and write
"browser check not run: agent-browser missing" in your report and in `memory.md`.

```
pnpm preview --port 4396 --host 127.0.0.1 &
# wait until: curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4396/   prints 200
export AGENT_BROWSER_SESSION=plan-006
agent-browser set device "iPhone 14"
agent-browser open http://127.0.0.1:4396/
agent-browser wait 6000
agent-browser eval "Gallery.toggle('katagami'); Gallery.toggle('mailroom'); JSON.stringify([location.hash, __table.you])"
agent-browser eval "dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); 'sent'"
agent-browser wait 8000
agent-browser eval "JSON.stringify([location.pathname, location.hash.replace(/seed=\\d+/, 'seed=N'), __table.you])"
agent-browser close
pnpm exec astro preview stop
```

**Verify**: the first `eval` prints `["",["katagami","mailroom"]]` (the team is in the dock, the address has no hash).
**Verify**: the last `eval` prints `["/","#you=katagami,mailroom&rival=&seed=N",["katagami","mailroom"]]` (the page
reloaded and the dock holds the same two cards).
**Verify**: `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4396/` → `000` (the server you started is
stopped). Never stop a server or browser you did not start.

If `set device` is not a command of your `agent-browser` version, or the first `eval` does not print the two cards,
do not improvise another harness: record "browser check not run" with the output and go on. Step 3 is the gate.

### Step 5: Keep the doc true, record and commit

In `docs/performance.md`, in the Memory table row quoted in "Current state", replace the last cell's ending

```
a return loads them again |
```

with

```
a return loads them again, and the wall writes the dock's team into its address first so the reload keeps it (`node scripts/check-release.mjs dist/index.html`) |
```

Append an entry to the end of `memory.md` in the file's existing shape (a `## 2026-MM-DD: <title> (<branch>, <agent>)`
heading, then `- **Type**:`, `- **Changed**:`, `- **Checked**:`, `- **Open**:` bullets). Under Checked give the
output of step 3 and say whether step 4 ran. Under Open write: "not checked on a real iPhone or in a real
back-forward cache; a lens left open (`/cards/<id>` in the address) still returns to that card's page".

Commit `src/components/Release.astro scripts/check-release.mjs docs/performance.md memory.md` by explicit path with
the message in "Git workflow".

**Verify**: `git status --short` → empty.

## Test plan

- New check: `scripts/check-release.mjs` runs the built inline script under Node's `vm` with a touch screen stubbed
  in and covers five cases: a partial team on the wall (written, then reload), both teams on the wall (written, then
  reload), an empty dock (reload only), a page without a dock, the battle (reload only), and a lens address on the
  wall (reload only). It also asserts that a normal `pageshow` (not from the cache) does nothing.
- Model: there is no test runner in this repo; the script follows `scripts/smoke.mjs`'s style (collect failures,
  print them, exit 1).
- Verification: `node scripts/check-release.mjs dist/index.html` → `release: 5 cases pass`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` ends with `all checks pass`
- [ ] `node scripts/check-release.mjs dist/index.html` prints `release: 5 cases pass`
- [ ] `node scripts/check-release.mjs dist/battle.html` prints `release: 5 cases pass`
- [ ] `grep -c 'if(e.persisted)location.reload()' src/components/Release.astro` → `0`
- [ ] `git diff --name-only origin/main...HEAD -- public vendor` prints nothing (no synced file changed)
- [ ] `git diff --name-only origin/main...HEAD` lists only the files in "In scope"
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `src/components/Release.astro` no longer ends its script with the `pageshow` text quoted in step 2 (it must occur
  exactly once), or `public/ex/gallery.js` no longer defines `globalThis.__table` with `you`, `rival` and `seed`, or
  `restore()` no longer reads `you`, `rival` and `seed` from `location.hash`.
- `scripts/check-release.mjs` reports `no Release script in dist/index.html` (the build renders the script
  differently from what this plan expects).
- `node scripts/check-release.mjs dist/index.html` still fails after step 2 and one careful re-type of the line.
- Making it work appears to need a change to any file under `public/` or `vendor/`.
- `pnpm build` fails for a reason unrelated to `Release.astro`.

## Maintenance notes

- The wall's address keeps the `#you=…` it was given. A visitor who then changes the dock and reloads by hand gets
  the team from the address, not the latest one. That is today's behaviour after Play and Back as well; fixing it
  means writing the address on every dock change, which belongs in the rounds' `r4/ex/gallery.js` (`teamChanged()`).
- A restored full team makes the wall warm its battle (and, in Chromium, prerender it). Plan 010
  (`plans/010-wall-phone-no-prerender.md`) turns that off on phones; land it with or before this plan if the phone
  memory soak (`scripts/memory/soak.mjs`) is going to be re-run.
- If the rounds rename `__table` or change `restore()`'s address format, `scripts/check-release.mjs` still passes (it
  stubs the table); the STOP condition above is the guard. A reviewer should compare the written address with
  `gallery.js`'s `go()` line.
- Deferred: the lens-open case, and a real-device check on iOS Safari.
