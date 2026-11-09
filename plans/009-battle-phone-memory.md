# Plan 009: On a phone the battle gives back shader worlds and warm-up bytes, and stops its card prints when nothing plays

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/phone-memory.mjs scripts/sync.mjs public/battle/shared/runtime.js public/battle/shared/battle.js sync.lock.json docs/performance.md docs/sync.md`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c6245d9`, 2026-11-09 (rounds HEAD `868340d7`; battle pinned at `42ff51c7`)

## Why this matters

Kevin, 2026-11-06: "it crashes on mobile a lot". Safari kills a tab whose memory passes its limit. The site's budget
(`docs/performance.md`, Memory) is WebContent under 500 MB at its peak and one WebGL context for the grounds; the
Arena is recorded there at about 400 MB with "two WebGL contexts", and named as "the next place to look". Reading the
battle's code shows why it is high and why it grows:

1. **A WebGL context per card, kept for the whole visit.** Each card's cutscene world is a full-stage WebGL2 canvas.
   When the next scene belongs to another card, the page hides the old canvas and keeps it in a Map so it need not
   link its shader again (about 350 ms). Nothing ever removes one. 12 of the 18 battle cards have such a world, so a
   six-card battle can hold six contexts, and Rematch and New Rival keep adding toward twelve. The "two" in the docs
   is what two presses produce.
2. **Every warmed clip's bytes, kept for the whole visit.** The page warms the HTTP cache by fetching each coming
   scene's media, and stores the promise of each response's `Blob` in a Map that lives as long as the page. The scene
   media are 110 clips (76 MB) and 308 pictures (35 MB); a single clip is up to 10.4 MB. The bytes are only needed in
   the cache.
3. **The cards' live prints never stop.** Once the board waits for a command the page starts the cards' animated
   grounds. They keep drawing behind the result panel after the battle ends and under the Log dialog.

After this plan, on a touch screen or a small-memory device the stage keeps at most one world besides the one on
screen (two contexts, not up to twelve); on every device the warm-up drops each Blob as soon as it has arrived; and
the card prints pause at the result and while the Log is open. The cost is one shader link (about 350 ms, on phones
only) when a third card's world comes up.

## Current state

The battle page is round code: `r4/play` in the design rounds repo
(`/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`), lane r4/play. `shared/runtime.js` and
`shared/battle.js` have not changed between the shipped pin `42ff51c7` and rounds HEAD `868340d7`. The site ships them
as `public/battle/shared/runtime.js` (unpatched) and `public/battle/shared/battle.js` (three site patches). Line
numbers are the same in both repos.

- `public/battle/shared/runtime.js:215-218`, the Stage and its Map of kept worlds:

```js
export class Stage extends runtime.Stage {
  /** Where the scene opens from and lands on, viewport px (the Director sets them from the layout before each play). */
  anchors = { source: null, target: null };
  grounds = new Map();
```

- `public/battle/shared/runtime.js:405-417`, where the outgoing world is kept and never let go:

```js
  /** A card's live ground links its program synchronously (about 350 ms): keep each one once linked, hidden while
   *  another card's world shows, instead of disposing it whenever the next scene's card differs. */
  ...
  setGround(ground) {
    const shader = ground?.kind === 'shader';
    if ((shader && this.shaderSource !== ground.source) || (!shader && this.shader)) {
      if (this.shader) { this.shader.canvas.hidden = true; this.grounds.set(this.shaderSource, this.shader); }
      const kept = shader ? this.grounds.get(ground.source) ?? null : null;
      this.shader = kept;
      this.shaderSource = kept ? ground.source : '';
    }
    const r = super.setGround(ground);
```

- A world object comes from the kit (`public/battle/vendor/broadcast/kit.js`, minified, `createShaderGround`). It has
  a `dispose()` that gives the context back and removes the canvas:
  `dispose(){o.getExtension("WEBGL_lose_context")?.loseContext(),e.remove()}`.
- `public/battle/shared/runtime.js:343-348`, the warm-up that keeps each Blob. Its only callers (`warm`, line 337, and
  `ahead`, line 354) wait for the promise and never read its value:

```js
  fetchOnce(src) {
    this.fetched ??= new Map();
    let p = this.fetched.get(src);
    if (!p) { p = fetch(src, { priority: 'low' }).then((r) => r.blob()).catch(() => null); this.fetched.set(src, p); }
    return p;
  }
```

- `public/battle/shared/battle.js:69-80`, the cards' live prints. `groundG` is the ground once started (the cards'
  `window.Ground`); it stays `null` under reduced motion, under Auto, and until the board first waits:

```js
let groundG = null, groundAsked = false;
function groundAtRest() {
  if (groundG || groundAsked || frozen() || reduced()) return;
  ...
    K.setLive(true);
    K.ground().then((G) => { groundG = G; if (G) layout?.ground?.(G); });
```

- The ground has a pause switch (`public/ex/ground.js:937`):
  `get paused() { return paused; }, set paused(v) { paused = !!v; for (const s of surfaces.values()) s.dirty = true; want(); },`
  and its frame loop stops while it is set (`public/ex/ground.js:787`: `const live = !reduced.matches && !hidden() && !paused;`).
  Do NOT call the kit's `K.groundPaused(...)`: it starts the ground (four scripts and a WebGL context) when the
  ground has not started yet. Set `groundG.paused` only when `groundG` exists.
- `public/battle/shared/battle.js:790-793`, `:822-831`, `:911-914`: the three places this plan touches.

```js
function showResult() {
  M.resultAt = performance.now();
  M.phase = 'result';
  app.dataset.phase = 'result';
```

```js
function openLog() {
  ...
  d.showModal();
  stage.hold(true); layout.hold(true);
  list.lastElementChild?.scrollIntoView({ block: 'end' });
}
$('#log').addEventListener('close', () => { stage.hold(false); layout.hold(false); });
```

```js
  const my = ++gen;
  director.stop();
  clearTimeout(rushT); pace?.unrush();
  match = next;
```

- `scripts/phone-memory.mjs:13-23` and `:57-63`, where phone patches live. `MARK` is `'kevinliu.studio phone memory'`;
  the release guard (`scripts/verify-build.mjs:28-31`) fails a build in which a file named in `PHONE` lacks that
  marker, so every new entry must write it at least once.

```js
function patch(file, text, pairs) {
  for (const [find, replace] of pairs) {
    const n = text.split(find).length - 1;
    if (n !== 1) throw new Error(`${file}: phone-memory anchor found ${n} times, expected once:\n  ${find.slice(0, 120)}`);
    text = text.replace(find, () => replace);
  }
  return text;
}
const MARK = 'kevinliu.studio phone memory';

export const PHONE = {
```

```js
  'public/battle/vendor/broadcast/kit.js': (t) => patch('kit.js', t, [
    ['i.addEventListener("loadeddata",s,{once:!0}),i.addEventListener("error",s,{once:!0})', `i.addEventListener("loadeddata",()=>{i.removeAttribute("src"),i.load(),s()},{once:!0}),i.addEventListener("error",s,{once:!0})/* ${MARK} */`],
  ]),
};
```

- `scripts/sync.mjs:377-378`: the sync applies `TRANSFORMS[dest]` first, then `PHONE[dest]`, so a `PHONE` anchor for
  `battle.js` is matched against the text after the site's three battle.js transforms (none of them touches the lines
  below).

Repo rules that apply (from `AGENTS.md`): never edit the synced folders by hand; a phone-memory fix to round code is
an anchored pair in `PHONE` in `scripts/phone-memory.mjs`, then the full sync (the standalone
`node scripts/phone-memory.mjs` does not rewrite a file that already carries the marker); "measure before and after on
the phone profiles"; append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | ends `synced from 30e69931 + 42ff51c7: 2 written, 0 removed` |
| Phone patches present | `node scripts/phone-memory.mjs --check` | exit 0, one `has the phone patches` line per file |
| Build and release guard | `pnpm build` | ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Local serve of `dist/` | `pnpm preview --port 4393 --host 127.0.0.1` | serves the build; stop it with `pnpm exec astro preview stop` |
| Phone memory, per page | `PLAYWRIGHT_CORE=<dir> PAGES=/battle,/battle/arena node scripts/memory/soak.mjs http://127.0.0.1:4393 <label> pages iphone-14` | one line per page: `iphone-14 /battle {"canvasMB":..,"glLive":..,...,"contentMB":..,"gpuMB":..}` |

`PLAYWRIGHT_CORE` is a `playwright-core` folder whose WebKit is installed. The last release used
`/Users/kevinliu/repos/Prototemplate/node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core`
(WebKit build 2336, present in `~/Library/Caches/ms-playwright/webkit-2336`). The soak writes
`scripts/memory/out/<label>-pages.jsonl`, which git ignores. Run one WebKit profile at a time.

## Scope

**In scope** (the only files you should modify):
- `scripts/phone-memory.mjs` (two new `PHONE` entries)
- `public/battle/shared/runtime.js`, `public/battle/shared/battle.js` (rewritten by the sync, never by hand)
- `sync.lock.json` (rewritten by the sync)
- `docs/performance.md` (Memory section: the causes table and the numbers), `docs/sync.md` (the `PHONE` bullet)
- `memory.md` (one appended entry)

**Out of scope** (do NOT touch):
- Anything in the rounds folder. Never write there.
- `public/battle/vendor/broadcast/kit.js` beyond what the sync already does to it.
- The desktop behaviour of the kept worlds (a desktop keeps every linked world, as the round designed).
- Pausing the prints during cutscenes, a pause key on the battle, the leaders' breathing: not in this plan.
- `scripts/sync.mjs` (no change is needed: it already applies every `PHONE` entry).

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/009-battle-phone-memory` cut from
  `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin` then
  `git -C ~/repos/kevinliu-studio worktree add -b improve/009-battle-phone-memory ~/repos/kevinliu-studio-009 origin/main`.
  Never edit the main checkout. Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `perf(cards): one copy of each card's shared markup, no unused frame code, no wasted fx posters`.
  Use: `perf(battle): a phone keeps two shader worlds, the warm-up keeps no bytes, the prints pause at the result`.
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Steps

### Step 1: Confirm the starting point and every anchor

`pnpm install --frozen-lockfile`, then:

```bash
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check
node --input-type=module <<'EOF'
import fs from 'node:fs';
const count = (file, anchors) => { const t = fs.readFileSync(file, 'utf8'); for (const a of anchors) console.log(t.split(a).length - 1, file); };
count('public/battle/shared/runtime.js', [
  'export class Stage extends runtime.Stage {',
  '      if (this.shader) { this.shader.canvas.hidden = true; this.grounds.set(this.shaderSource, this.shader); }',
  "    if (!p) { p = fetch(src, { priority: 'low' }).then((r) => r.blob()).catch(() => null); this.fetched.set(src, p); }",
]);
count('public/battle/shared/battle.js', [
  "  M.phase = 'result';\n  app.dataset.phase = 'result';\n",
  "  stage.hold(true); layout.hold(true);\n  list.lastElementChild?.scrollIntoView({ block: 'end' });",
  "$('#log').addEventListener('close', () => { stage.hold(false); layout.hold(false); });",
  "  director.stop();\n  clearTimeout(rushT); pace?.unrush();\n  match = next;\n",
]);
EOF
```

(The site's synced copies are counted here on purpose: they are the text `PHONE` sees, after `TRANSFORMS`.)

**Verify**: `in sync`, then seven lines each starting with `1`.

### Step 2: Measure before

```bash
pnpm build
pnpm preview --port 4393 --host 127.0.0.1 > "${TMPDIR:-/tmp}/kls-009-preview.log" 2>&1 &
for i in $(seq 1 40); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4393/battle)" = 200 ] && break; sleep 2; done
export PLAYWRIGHT_CORE=/Users/kevinliu/repos/Prototemplate/node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core
PAGES=/battle,/battle/arena node scripts/memory/soak.mjs http://127.0.0.1:4393 before-009 pages iphone-14 | tee "${TMPDIR:-/tmp}/kls-009-before.txt"
export AGENT_BROWSER_SESSION=improve-009
agent-browser set device "iPhone 14"
agent-browser open "http://127.0.0.1:4393/battle?auto=1#team=claude-of-tanks,katagami,bday-land&rival=jarhead,mailroom,cotfly&seed=30"
agent-browser wait 150000
agent-browser eval "JSON.stringify({ coarse: matchMedia('(pointer: coarse)').matches, stageCanvases: document.querySelectorAll('#stage canvas').length, phase: document.getElementById('app').dataset.phase })" | tee -a "${TMPDIR:-/tmp}/kls-009-before.txt"
agent-browser close
pnpm exec astro preview stop
```

**Verify**: the build passes; the soak prints two lines (`iphone-14 /battle {...}` and `iphone-14 /battle/arena {...}`);
the browser line has `"coarse":true`. Keep the file: it is the "before" column.

### Step 3: Add the two entries to `PHONE` in `scripts/phone-memory.mjs`

Directly after the closing `  ]),` of the `'public/battle/vendor/broadcast/kit.js'` entry and before the `};` that
ends `PHONE`, add:

```js
  // The battle's stage (r4/play shared/runtime.js) keeps every card's cutscene world once linked: a full-stage WebGL2
  // canvas each, hidden while another shows and never let go, so a visit climbed toward one context per card (12 of
  // the 18 cards have one). A touch screen or a small-memory device keeps the world going out and the one coming in
  // and gives the rest back (the kit's own dispose(): the context is lost and the canvas removed); the next use of a
  // dropped world links its program again, about 350 ms. On every device the media warm-up (fetchOnce) lets each
  // response's Blob go once it has arrived: the bytes are wanted in the HTTP cache, not on the page.
  'public/battle/shared/runtime.js': (t) => patch('runtime.js', t, [
    ['export class Stage extends runtime.Stage {', `// ${MARK}: a touch screen or a small-memory device keeps one card's world besides the one on screen; the others give
// their WebGL context back (scripts/phone-memory.mjs)
const LEAN_GROUNDS = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || (typeof navigator !== 'undefined' && navigator.deviceMemory > 0 && navigator.deviceMemory <= 4);
export class Stage extends runtime.Stage {`],
    ['      if (this.shader) { this.shader.canvas.hidden = true; this.grounds.set(this.shaderSource, this.shader); }', `      if (this.shader) { this.shader.canvas.hidden = true; this.grounds.set(this.shaderSource, this.shader); }
      if (LEAN_GROUNDS) for (const [src, sh] of [...this.grounds]) if (src !== this.shaderSource && !(shader && src === ground.source)) { sh.dispose(); this.grounds.delete(src); }`],
    ["    if (!p) { p = fetch(src, { priority: 'low' }).then((r) => r.blob()).catch(() => null); this.fetched.set(src, p); }", "    if (!p) { p = fetch(src, { priority: 'low' }).then((r) => r.blob()).then(() => true).catch(() => null); this.fetched.set(src, p); }"],
  ]),
  // The cards' live prints (r4/ex ground.js, started by r4/play shared/battle.js once the board waits) kept drawing
  // behind the result panel and under the Log. They pause there and take up again with the next hand or when the Log
  // closes. Only a ground that has started is touched: the kit's groundPaused() would start one.
  'public/battle/shared/battle.js': (t) => patch('battle.js', t, [
    ["  M.phase = 'result';\n  app.dataset.phase = 'result';\n", `  M.phase = 'result';\n  app.dataset.phase = 'result';\n  if (groundG) groundG.paused = true; // ${MARK}: the cards' live prints stop behind the result and the Log (scripts/phone-memory.mjs)\n`],
    ["  stage.hold(true); layout.hold(true);\n  list.lastElementChild?.scrollIntoView({ block: 'end' });", "  stage.hold(true); layout.hold(true);\n  if (groundG) groundG.paused = true;\n  list.lastElementChild?.scrollIntoView({ block: 'end' });"],
    ["$('#log').addEventListener('close', () => { stage.hold(false); layout.hold(false); });", "$('#log').addEventListener('close', () => { stage.hold(false); layout.hold(false); if (groundG && match?.state.phase !== 'over') groundG.paused = false; });"],
    ["  director.stop();\n  clearTimeout(rushT); pace?.unrush();\n  match = next;\n", "  director.stop();\n  clearTimeout(rushT); pace?.unrush();\n  match = next;\n  if (groundG) groundG.paused = false;\n"],
  ]),
```

How the keep rule reads: at the moment a different world (or a picture ground) comes in, the Map holds worlds seen
before. The one going out (`this.shaderSource`) and the one coming in (`ground.source`, when it is a shader) are kept;
every other one is disposed and removed from the Map. So the stage never holds more than two.

**Verify**: `node --check scripts/phone-memory.mjs` → exit 0.

### Step 4: Run the sync

`ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs`

**Verify**: ends `synced from 30e69931 + 42ff51c7: 2 written, 0 removed`. Then:

```bash
grep -c "kevinliu.studio phone memory" public/battle/shared/runtime.js public/battle/shared/battle.js
for f in runtime battle; do cp public/battle/shared/$f.js "${TMPDIR:-/tmp}/kls-009-$f.mjs" && node --check "${TMPDIR:-/tmp}/kls-009-$f.mjs" && echo "ok $f"; done
node scripts/phone-memory.mjs --check
git status --short
```

→ each file counts `1`; `ok runtime` and `ok battle`; the check exits 0 with five `has the phone patches` lines;
`git status` lists only `scripts/phone-memory.mjs`, the two battle files and `sync.lock.json`.

### Step 5: Build, then measure after

`pnpm build` (the guard now also requires the marker in both battle files), then repeat step 2's serve, soak and
browser commands with the label `after-009` and the file `kls-009-after.txt`, then stop the server and run
`curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4393/`.

**Verify**: the build ends `all checks pass`; the last command prints `000`; and, comparing the two text files:

- `glLive` on `/battle` and on `/battle/arena` after is less than or equal to before.
- `stageCanvases` after is less than or equal to before, and at most `3`.
- `"phase"` is the same kind of value as before (the battle still plays under Auto).
- Write down `contentMB` and `gpuMB` for both pages, before and after. They are reported, not gated: this Mac's load
  moves them.

### Step 6: Check the pause by hand in the browser

```bash
pnpm preview --port 4393 --host 127.0.0.1 > "${TMPDIR:-/tmp}/kls-009-preview.log" 2>&1 &
for i in $(seq 1 40); do [ "$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4393/battle)" = 200 ] && break; sleep 2; done
export AGENT_BROWSER_SESSION=improve-009
agent-browser open http://127.0.0.1:4393/battle
agent-browser wait 20000
agent-browser eval "JSON.stringify({ ground: !!window.Ground, paused: window.Ground ? window.Ground.paused : null })"
agent-browser click "#logb"
agent-browser wait 1000
agent-browser eval "JSON.stringify({ open: document.getElementById('log').open, paused: window.Ground ? window.Ground.paused : null })"
agent-browser click "#log-close"
agent-browser wait 1000
agent-browser eval "JSON.stringify({ open: document.getElementById('log').open, paused: window.Ground ? window.Ground.paused : null })"
agent-browser close
pnpm exec astro preview stop
```

**Verify**: when the first line shows `"ground":true` (the prints started), the second shows
`"open":true,"paused":true` and the third `"open":false,"paused":false`. When the first line shows `"ground":false`
(the page had not come to rest within 20 s on this machine), wait another 20 s and run the three evaluations again;
if it is still `false`, report that the pause could not be exercised and continue.

### Step 7: Record it

- `docs/performance.md`, Memory section, the table under "What held the memory": add three rows:
  `| The battle's stage kept every card's cutscene world (a WebGL2 canvas each) once linked | a context per card with a world, up to 12 across a visit | On a touch screen or a small-memory device only the world going out and the one coming in are kept |`,
  `| The battle's media warm-up kept every fetched clip and picture as a Blob | the bytes of every warmed file, up to 111 MB of scene media | The Blob is dropped once it arrives |`,
  `| The cards' live prints drew behind the result and under the Log | a frame loop with nothing to show | They pause there |`.
  Under "Results", add a short dated paragraph with the before and after numbers from steps 2 and 5.
- `docs/sync.md`, in the `PHONE` bullet, add: ``; `battle/shared/runtime.js` keeps two shader worlds on a phone and drops each warm-up Blob; `battle/shared/battle.js` pauses the card prints at the result and under the Log``.
- Append an entry to `memory.md` (date, type perf, files, the numbers, open: the upstream request below).

**Verify**: `git status --short` lists exactly `scripts/phone-memory.mjs`, `public/battle/shared/runtime.js`,
`public/battle/shared/battle.js`, `sync.lock.json`, `docs/performance.md`, `docs/sync.md`, `memory.md`. Commit them by
path.

## Upstream request (for the rounds lane)

The executor does not write in the rounds. Copy this section word for word into your final report; Kevin or the play
lane applies it (the lane's log is `r4/play/REQUESTS.md`).

Request lines (the rounds' format):

`site (kevinliu-studio) -> play: shared/runtime.js: Stage.setGround caps the kept shader grounds (on a coarse pointer or deviceMemory <= 4 keep only the outgoing and the incoming one and dispose() the rest; consider a small cap on desktop too), and fetchOnce resolves to true instead of keeping each response's Blob in this.fetched, because a visit held one WebGL2 context per card with a world (up to 12) and the bytes of every warmed clip (scene media are 111 MB), which is where the Arena's 400 MB on a phone comes from`

`site (kevinliu-studio) -> play: shared/battle.js: set groundG.paused = true in showResult() and openLog(), false in start() and on the Log's close (never through K.groundPaused, which starts the ground), because the cards' live prints kept a 30 fps loop running behind the result and under the Log`

Source edits at rounds HEAD `868340d7` (unchanged since `42ff51c7`), the same text as the site's pairs in step 3:
`r4/play/shared/runtime.js:215` (the `LEAN_GROUNDS` constant before the class), `:413` (the dispose loop after the
line that stores the outgoing world), `:346` (`.then(() => true)`); `r4/play/shared/battle.js:792-793`, `:827`, `:830`,
`:914` (the four `groundG.paused` lines).

## Test plan

This repo has no test runner. The checks are: the anchor counts (step 1), the syntax and marker checks (step 4), the
release guard, which now fails a build whose battle files lack the marker (step 5), the before and after numbers on
the iPhone 14 profile (steps 2 and 5), and the pause check (step 6).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] `node scripts/phone-memory.mjs --check` exits 0 and lists five files
- [ ] `grep -c "kevinliu.studio phone memory" public/battle/shared/runtime.js public/battle/shared/battle.js` prints `1` for each
- [ ] `pnpm build` ends with `all checks pass`
- [ ] `glLive` and `stageCanvases` after are less than or equal to before, and `stageCanvases` after is at most `3`
- [ ] The before and after numbers are written into `docs/performance.md`
- [ ] `git status --short` shows no file outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync` before your
  first edit.
- Any anchor in step 1 does not print `1`, or the sync stops with `anchor found N times`.
- The soak cannot run (no `PLAYWRIGHT_CORE` folder, WebKit will not launch, or it prints no line for a page). Do not
  ship the change unmeasured: report what failed.
- `"coarse":false` in the browser line: the phone emulation did not take, so the phone path was not exercised.
- `glLive` or `stageCanvases` is higher after than before, or the battle under Auto no longer reaches the phase it
  reached before. Revert `scripts/phone-memory.mjs`, run the sync again, and report.
- `stageCanvases` before is already `2` or less: the 150 second Auto battle did not bring up three different worlds,
  so the cap was not exercised. Report the numbers as they are and say so; do not claim the cap was measured.

## Maintenance notes

- When a later rounds pin carries the upstream change, the anchors stop matching, the sync stops and names them, and
  the two entries are deleted from `PHONE` in the same commit as the pin move.
- The 26-card battle (the kit rebuild) adds eight cards; if most have a shader world, the phone cap matters more, and
  a desktop cap becomes worth asking the round for (browsers allow about 16 WebGL contexts a page).
- `Release.astro` still gives every context back when the page enters the back-forward cache on a touch screen; this
  plan is about a page that stays open.
- A reviewer should check one thing in the keep rule: the world coming in is never disposed (the
  `!(shader && src === ground.source)` test), and the world going out is still in the Map when `kept` is read on the
  next line.
- Deferred on purpose: pausing the prints during full-window cutscenes, and honouring the home page's saved Pause
  choice (`localStorage['ill-pause']`) on the battle. Both change what the round shows and belong with the play lane.
