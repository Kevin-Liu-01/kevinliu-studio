# Plan 010: On a phone the wall no longer prerenders the battle or builds its opening cast before a press

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/phone-memory.mjs scripts/sync.mjs scripts/memory/soak.mjs public/ex/gallery.js public/ex/rituals.js sync.lock.json docs/sync.md docs/performance.md`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M (the code is small; the measurement takes most of the time)
- **Risk**: LOW (a phone loses the instant swap into the battle and pays for the opening cast in the first frames of Play; a desktop is unchanged)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Kevin reported on 2026-11-06 that the site "crashes on mobile a lot", and the repo keeps a phone memory budget
(`docs/performance.md`, "Memory"): one WebGL context for the grounds, nothing rastered ahead of a press, WebContent
under 500 MB. Two pieces of the wall's code still break "nothing ahead of a press" on a phone:

1. As soon as both teams of three exist, `gallery.js` adds a `<script type="speculationrules">` that asks the browser to
   **prerender the whole battle page** with `eagerness: 'immediate'`. Chromium on Android then boots the battle (a
   627 KB script bundle, its own WebGL contexts, its media) in a hidden page while the visitor is still on the wall.
2. At idle, `rituals.js` **builds the battle's opening cast**: six subject pictures placed on the stage at opacity
   0.001 (so they are decoded and rastered), and six leads drawn into the shared canvas.

Teams are written into the wall's address when Play is pressed, so every return from the battle to the wall repeats
both. The memory cost has never been measured (the soak harness's WebKit profiles do not run speculation rules), so
this plan measures it before and after and records the numbers.

The root cause is round code: `r4/ex/gallery.js` and `r4/ex/rituals.js` in the design rounds repo, both owned by the
rounds' **room** lane. This site may not edit synced round files or write in the rounds, so the fix ships here as
anchored patches in `PHONE` (`scripts/phone-memory.mjs`), and the same change goes to the rounds as a request
(section "Upstream request" below).

## Current state

Files and roles:

- `public/ex/gallery.js`: the wall's state and wiring. **Synced from the rounds (`r4/ex/gallery.js`, pinned at rounds
  commit `30e69931`). Never edit it by hand.** It contains the prerender rule.
- `public/ex/rituals.js`: the wall's animated sequences. **Synced (`r4/ex/rituals.js`). Never edit it by hand.** It
  contains `warm()`, the idle pre-build of the battle's opening.
- `scripts/phone-memory.mjs`: exports `PHONE`, a map from a synced file's path to a function that applies anchored
  text patches to it. `scripts/sync.mjs` applies `PHONE[dest]` after its own `TRANSFORMS[dest]` on every sync.
- `scripts/verify-build.mjs`: the release guard, run by `pnpm build`. It fails the build when a file named in `PHONE`
  does not contain the text `kevinliu.studio phone memory`.
- `scripts/memory/soak.mjs`: the phone memory harness (Playwright).
- `sync.lock.json`: records every synced file's sha-256. The sync rewrites it.

The prerender rule, `public/ex/gallery.js:503-519` (identical text at rounds HEAD `868340d7`,
`r4/ex/gallery.js:536-552`):

```js
    // the six dock cards carry view-transition names; the battle prerenders once both teams exist
    const url = battleUrl();
    [...wells.you, ...wells.rival].forEach((w) => { ... });
    if (url !== prerendered) {
      prerendered = url;
      const old = $('#prerender');
      if (old) old.remove();
      if (url && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
        // at idle, so the add that completes the teams never shares its frame with the rule
        (globalThis.requestIdleCallback || setTimeout)(() => {
          if (prerendered !== url || $('#prerender')) return;
          const s = document.createElement('script');
          s.type = 'speculationrules'; s.id = 'prerender';
          s.textContent = JSON.stringify({ prerender: [{ source: 'list', urls: [url], eagerness: 'immediate' }] });
          document.head.append(s);
        }, { timeout: 300 });
      }
```

The idle pre-build, `public/ex/rituals.js:279-296` (rounds HEAD `r4/ex/rituals.js:275-292`, same text):

```js
    function warm() {
      const { S } = G;
      const ids = [...S.you, ...S.rival];
      if (ids.length < 6) return true;
      ...
      if (primed !== key) {
        primed = key;
        probe();
        idle(function prep() { if (G.ritual) idle(prep); else prepEntry(); });
      }
      if (warmed === key) return true;
      if (!live() || (Ground.prewarm && !Ground.prewarm(ids))) return false; // still linking: try again
```

`warm()` is called from five places. Two of them run at idle, before any press:

- `public/ex/rituals.js:265`, when the rival's deal ends (the teams have just become complete):
  `... S.rival.forEach((id) => cards[id].el.classList.add('theirs')); own(T); idle(warm); });`
- `public/ex/rituals.js:306`, the boot loop (teams restored from the address):
  `        if ((!sized || !warm()) && ++tries < 40) setTimeout(boot, 250);`

The other three are the press path and stay as they are: `pointerenter` and `focus` on `#play`
(`rituals.js:310-311`), and `entry()` itself (`rituals.js:487-488`, `warm(); const C = prepEntry();`), which is what
Play runs. `probe()` (`rituals.js:317`) only fetches the battle's HTML and stylesheets to read whether it accepts a
View Transition; it holds no pictures and stays at idle.

The existing phone patches, `scripts/phone-memory.mjs:53-56`. Note the constant `LEAN` that the second pair adds to
`rituals.js`; the new pairs reuse it:

```js
  'public/ex/rituals.js': (t) => patch('rituals.js', t, [
    ['        if (packOff() || RM()) {', `        if (packOff() || RM() || LEAN) { // ${MARK} (scripts/phone-memory.mjs)`],
    ['    const live = () => !!(Ground && Ground.available);', "    const live = () => !!(Ground && Ground.available);\n    const LEAN = matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4;"],
  ]),
```

`MARK` is `'kevinliu.studio phone memory'` (`scripts/phone-memory.mjs:21`). `patch()` (`:13-20`) requires each
anchor to occur **exactly once** in the text or it throws. `PHONE` has no `'public/ex/gallery.js'` key today.

The three anchors this plan uses were counted on 2026-11-09 in the pinned source (`git show 30e69931:r4/ex/<file>`),
in the shipped copy and at rounds HEAD: each occurs exactly once in all three, and no existing `TRANSFORMS` or `PHONE`
pair rewrites them.

Repo rules that apply (from `AGENTS.md`):

- `public/ex`, `public/battle`, `public/sound`, `public/og` and `vendor/` are synced. **Never edit them by hand.** A
  fix to round code is an anchored patch; then the sync rewrites the synced file and `sync.lock.json`, and all are
  committed together.
- A new `PHONE` pair on a file that already carries the marker (here `rituals.js`) is **not** applied by the
  standalone `node scripts/phone-memory.mjs` (it skips files that contain the marker, line 77). Use the full sync.
- Never write anything in the rounds folder.
- Append an entry to `memory.md` after the change. Never rewrite old entries.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | last line `synced from 30e69931 + 42ff51c7: 2 written, 0 removed` |
| Build and release guard | `pnpm build` | last line `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Serve `dist/` | `pnpm preview --port 4410 --host 127.0.0.1` (run in the background) | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4410/` prints `200` (may take 30 s on a loaded machine) |
| Stop the serve | `pnpm exec astro preview stop` | prints `Stopped preview server` |
| Memory, one page | see Step 2 | one line per run starting `pixel-7 /#you=` |

`~/k7-rescue/release-next/rounds-42ff51c7` is the export of the rounds the 11-09 release was synced from. A plain
`pnpm sync` fails by design (the live rounds folder is past the pinned commits). There is no test suite and no lint;
`pnpm check` is broken on `main`, do not run it.

## Scope

**In scope** (the only files you should modify):

- `scripts/phone-memory.mjs`
- `scripts/memory/soak.mjs` (Step 1 only: one line)
- `public/ex/gallery.js`, `public/ex/rituals.js`, `sync.lock.json` (**only through the sync command, never by hand**)
- `docs/sync.md`, `docs/performance.md` (Step 7)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):

- Anything in the rounds folder (`~/Documents/ChatGPT/portfolio-design-rounds/`). Read only.
- `scripts/sync.mjs` and its `TRANSFORMS`: this is a phone-memory patch, and `PHONE` is where those live.
- `rituals.js`'s `probe()`, the `pointerenter` and `focus` handlers on `#play`, and `entry()`: the press path must
  keep preparing the opening.
- `src/components/Release.astro` and the wall's other memory code in `src/pages/index.astro`.
- The battle's own code under `public/battle/`.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/010-wall-phone-no-prerender` cut from
  `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin && git -C ~/repos/kevinliu-studio worktree add -b improve/010-wall-phone-no-prerender ~/repos/kevinliu-studio-010 origin/main`.
  Never edit the main checkout (other sessions use it). Never use `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`.
- Message style, from this repo's log: `fix(sound): no sound fetched before the first gesture on the battle`,
  `perf(cards): one copy of each card's shared markup, no unused frame code, no wasted fx posters`. Use
  `perf(wall): no battle prerender and no opening cast ahead of a press on a phone`.
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Upstream request (for the rounds lane)

The executor does not apply this. Copy this whole section, word for word, into your final report so Kevin or the
rounds' room lane can apply it. When a later pinned commit carries it, the site's patches from Steps 3 and 4 stop
matching and are deleted (see "Maintenance notes").

Lane: **r4/ex room** (owns `gallery.js` and `rituals.js`, `r4/ex/OWNERS.md`). Request lines, in the rounds' format
(`r4/ex/REQUESTS.md`):

```
site -> room: gallery.js: in teamChanged(), do not add the speculationrules prerender of the battle when matchMedia('(pointer: coarse)').matches or navigator.deviceMemory <= 4, because on a phone it boots the whole battle (kit.js, its WebGL contexts, its media) behind the wall before any press, against the site's phone memory budget (kevinliu-studio docs/performance.md, Memory)
site -> room: rituals.js: on the same devices, the two idle callers of warm() (the end of the rival's deal, and the boot loop) only call probe(); the press path (pointerenter and focus on #play, entry()) keeps calling warm() and prepEntry(), because the cast on the stage at opacity 0.001 and the six prewarmed leads are rastered ahead of a press
```

Source edit 1, `r4/ex/gallery.js:543` at rounds HEAD `868340d7`. Current line:

```js
      if (url && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
```

After:

```js
      if (url && !(matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4) && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {
```

Source edit 2, `r4/ex/rituals.js` at rounds HEAD `868340d7`. Add after line 37 (`const live = ...`), if the rounds do
not already define it:

```js
    const LEAN = matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4;
```

Line 261, current tail `own(T); idle(warm); });` becomes `own(T); idle(LEAN ? probe : warm); });`.

Line 302, current:

```js
        if ((!sized || !warm()) && ++tries < 40) setTimeout(boot, 250);
```

After:

```js
        if (LEAN && sized) { if (G.S.you.length + G.S.rival.length === 6) probe(); } else if ((!sized || !warm()) && ++tries < 40) setTimeout(boot, 250);
```

## Steps

### Step 0: Pre-flight

In the new worktree:

1. `ls $HOME/k7-rescue/release-next/rounds-42ff51c7/r4/ex/gallery.js` must print the path.
2. `pnpm install --frozen-lockfile`
3. `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check`

**Verify**: step 3 prints `in sync` and exits 0. If not, STOP.

### Step 1: Let the harness record every renderer in `pages` mode

A prerendered page may live in a second renderer process. `pages` mode keeps only the largest renderer
(`contentMB`); make it keep the sum too. In `scripts/memory/soak.mjs` there are two lines to change, both inside
`pagesMode` (lines 106 and 110 today):

- `    let peak = {}, peakMem = { contentMB: 0, gpuMB: 0 };` becomes
  `    let peak = {}, peakMem = { contentMB: 0, contentSumMB: 0, gpuMB: 0 };`
- `      for (const k of ['contentMB', 'gpuMB']) peakMem[k] = Math.max(peakMem[k], m[k]);` becomes
  `      for (const k of ['contentMB', 'contentSumMB', 'gpuMB']) peakMem[k] = Math.max(peakMem[k], m[k] ?? 0);`

**Verify**: `node --check scripts/memory/soak.mjs` exits 0, and `grep -c "contentSumMB: 0" scripts/memory/soak.mjs`
prints `1`.

### Step 2: Measure before (the unpatched build)

1. `pnpm build` (expect the guard's `all checks pass` line).
2. Start the serve in the background: `pnpm preview --port 4410 --host 127.0.0.1 > /tmp/010-preview.log 2>&1 &`
   and wait until `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4410/` prints `200`.
3. Find a Playwright: `ls -d $HOME/.npm/_npx/*/node_modules/playwright-core`. Try each path as `PLAYWRIGHT_CORE`
   until the command in item 4 launches (a wrong one fails at once with a "browser not found" or import error).
4. Run three times (the commas inside the address are written `%2C`, because the harness splits `PAGES` on commas):

   ```sh
   PAGES='/#you=katagami%2Cmailroom%2Cagent-pets&rival=bday-land%2Cpowerlifting%2Celo&seed=30' \
   PLAYWRIGHT_CORE=<path> node scripts/memory/soak.mjs http://127.0.0.1:4410 before-010 pages pixel-7
   ```

   Each run prints one line starting `pixel-7 /#you=` with a JSON object. Write down `contentMB`, `contentSumMB`,
   `gpuMB` and `glLive` from each of the three lines and take the median of each.
5. Stop the serve: `pnpm exec astro preview stop`. Confirm `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4410/`
   prints `000`.

**Verify**: three lines were printed and each has a `contentMB` above 0. If the harness cannot run (no working
`PLAYWRIGHT_CORE`, or it prints no line), STOP and report: do not ship unmeasured.

### Step 3: Add the wall's patch to `PHONE`

In `scripts/phone-memory.mjs`, inside `export const PHONE = { ... }`, add this entry directly after the
`'public/ex/ground.js'` entry (before `'public/ex/rituals.js'`):

```js
  // The wall (r4/ex gallery.js) asks the browser to prerender the whole battle the moment both teams exist
  // (speculationrules, eagerness immediate). On a touch screen or a small-memory device that boots a second heavy
  // page behind the wall before any press, so the rule is left out there; Play still navigates.
  'public/ex/gallery.js': (t) => patch('gallery.js', t, [
    ["      if (url && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {", `      // ${MARK}: no battle prerender on a touch screen or a small-memory device (scripts/phone-memory.mjs)
      if (url && !(matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4) && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')) {`],
  ]),
```

The anchor (first string) starts with exactly six spaces. The replacement is a template literal (backticks) so
`${MARK}` is filled in; the guard needs that marker text in the shipped file.

**Verify**: `node --check scripts/phone-memory.mjs` exits 0.

### Step 4: Add the two `rituals.js` pairs to `PHONE`

In the existing `'public/ex/rituals.js'` entry, append two pairs **after** the two that are there (keep those
unchanged), so the array ends:

```js
    ['    const live = () => !!(Ground && Ground.available);', "    const live = () => !!(Ground && Ground.available);\n    const LEAN = matchMedia('(pointer: coarse)').matches || navigator.deviceMemory <= 4;"],
    // the battle's opening cast (six subjects on the stage at opacity 0.001, six leads drawn into the shared canvas) is
    // built at idle once both teams exist; on a touch screen or a small-memory device only the battle's acceptance is
    // read then (probe), and the press builds the cast (pointerenter on #play and entry() call warm() themselves)
    ['own(T); idle(warm); });', 'own(T); idle(LEAN ? probe : warm); });'],
    ['        if ((!sized || !warm()) && ++tries < 40) setTimeout(boot, 250);', '        if (LEAN && sized) { if (G.S.you.length + G.S.rival.length === 6) probe(); } else if ((!sized || !warm()) && ++tries < 40) setTimeout(boot, 250);'],
  ]),
```

The second new anchor starts with exactly eight spaces.

**Verify**: `node --check scripts/phone-memory.mjs` exits 0.

### Step 5: Sync, so the synced files and the lock carry the patches

```sh
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs
```

**Verify**, all four:

- the last line is `synced from 30e69931 + 42ff51c7: 2 written, 0 removed` (a line `N problem(s); nothing was written`
  means an anchor did not match exactly once: STOP);
- `git status --short` lists exactly `scripts/phone-memory.mjs`, `scripts/memory/soak.mjs`, `public/ex/gallery.js`,
  `public/ex/rituals.js` and `sync.lock.json` as modified;
- `grep -c "kevinliu.studio phone memory" public/ex/gallery.js` prints `1`;
- `grep -c "idle(LEAN ? probe : warm)" public/ex/rituals.js` prints `1` and
  `grep -c "if (LEAN && sized)" public/ex/rituals.js` prints `1`.

### Step 6: Build, then measure after

1. `pnpm build`: the last line must be the guard's `all checks pass` line.
2. `node --check dist/ex/gallery.js && node --check dist/ex/rituals.js` exits 0.
3. Serve, run the Step 2 command three times with the label `after-010` instead of `before-010`, write down the same
   four numbers and their medians, then stop the serve and confirm the port answers `000`.
4. Desktop is unchanged: with the serve still running in item 3 (before you stop it), run

   ```sh
   export AGENT_BROWSER_SESSION=plan-010
   agent-browser open "http://127.0.0.1:4410/#you=katagami,mailroom,agent-pets&rival=bday-land,powerlifting,elo&seed=30"
   sleep 15
   agent-browser eval "JSON.stringify({coarse: matchMedia('(pointer: coarse)').matches, rule: !!document.querySelector('#prerender')})"
   agent-browser close
   ```

**Verify**:

- item 4 prints `coarse` false and `rule` true (a fine pointer still gets the prerender). If `agent-browser` is not
  installed, skip item 4 and say so in the report;
- the `after-010` medians of `contentSumMB` and `gpuMB` are not more than 15% above the `before-010` medians. If
  either is, STOP and report both sets of numbers. If the two sets are within 10% of each other, that is an accepted
  result: record "no measurable difference in this harness" (Playwright's Chromium may not run speculation-rule
  prerenders under device emulation); the patch only removes work.

### Step 7: Record it

1. `docs/sync.md`, the `PHONE` bullet (line 65). After the words
   `` `ex/rituals.js` cuts the next pack at the press there instead of holding it rastered; `` insert:
   `` `ex/gallery.js` adds no prerender of the battle there, and `ex/rituals.js` reads only the battle's acceptance at idle and builds the opening cast at the press; ``
2. `docs/performance.md`, the table under "What held the memory" (after the row that starts
   `| The next pack's three 3D card copies`). Add one row, with your measured medians in the middle cell:
   `| The battle prerendered behind the wall as soon as both teams exist (Chromium), and its opening cast built at idle | Pixel 7 profile, the wall with teams in the address, median of 3: renderers <before> to <after> MB, GPU <before> to <after> MB | No prerender and no cast ahead of a press on a touch screen or a small-memory device (`scripts/phone-memory.mjs`) |`
3. Append an entry to `memory.md` in the style of its last entries: date, type `perf`, what changed
   (`scripts/phone-memory.mjs`, the two synced files, the lock, the harness line), the before and after numbers, and
   under Open: "the rounds' room lane has the same change as a request (plans/010)".

**Verify**: `grep -c "adds no prerender of the battle" docs/sync.md` prints `1`;
`grep -c "prerendered behind the wall" docs/performance.md` prints `1`; `git diff --stat -- memory.md` shows only
insertions.

### Step 8: Commit and report

Commit by explicit path (one commit): `scripts/phone-memory.mjs scripts/memory/soak.mjs public/ex/gallery.js
public/ex/rituals.js sync.lock.json docs/sync.md docs/performance.md memory.md`. In your report include the six
medians (before and after), and the "Upstream request" section word for word.

**Verify**: `git status --short` prints nothing; `git log -1 --format=%ae` prints
`66856750+Kevin-Liu-01@users.noreply.github.com`.

## Test plan

There is no test suite in this repo. The checks are:

- the sync's own contract: every anchor matched exactly once (Step 5);
- the release guard: `pnpm build` fails if `dist/ex/gallery.js` lacks the marker (it is now a `PHONE` key);
- the memory harness before and after (Steps 2 and 6);
- the desktop browser check (Step 6, item 4).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] `node scripts/phone-memory.mjs --check` exits 0 and prints `has the phone patches` for four files
- [ ] `pnpm build` ends with `verify-build: ... all checks pass`
- [ ] `grep -c "kevinliu.studio phone memory" public/ex/gallery.js` prints `1`
- [ ] `grep -c "idle(LEAN ? probe : warm)" public/ex/rituals.js` prints `1`
- [ ] `docs/performance.md` holds the new row with measured numbers (no `<before>` or `<after>` placeholder left:
      `grep -c "<before>" docs/performance.md` prints `0`)
- [ ] `git status --short` is empty and no file outside the in-scope list is in `git diff --stat origin/main..HEAD`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync` before your
  first edit.
- The code at the locations in "Current state" does not match the excerpts.
- The sync prints `problem(s); nothing was written` (an anchor matched zero or two times). Do not loosen an anchor.
- The memory harness cannot run, or the after medians are more than 15% above the before medians.
- A fix seems to need a hand edit of a file under `public/ex/`, or any write in the rounds folder.
- `pnpm build` fails twice after a reasonable fix attempt.

## Maintenance notes

- When the rounds' room lane applies the upstream request and a release moves the `cards` pin past it, the three
  anchors stop matching, `pnpm sync` stops and names them, and the three pairs (and the `gallery.js` key, if nothing
  else is in it) are deleted in the same commit as the pin move. Do not "fix" the anchors to match the new text.
- The `LEAN` constant in `rituals.js` comes from the existing pair two lines above the new ones; if that pair is ever
  removed, the new pairs need their own definition.
- A reviewer should check that the press path is untouched: `rituals.js` still has
  `$('#play').addEventListener('pointerenter', warm);` and `entry()` still opens with `warm();`.
- Not done here, on purpose: `prefetch` instead of nothing on phones (rituals.js's `probe()` already fetches the
  battle's HTML and sheets), and a real-device measurement. Speed Insights after shipping is the real number.
