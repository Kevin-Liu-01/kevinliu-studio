# Plan 013: The wall's posters choose their file by width again (the poster ladder the site build lost)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs scripts/verify-build.mjs src/lib/cards.ts "src/pages/cards/[id].astro" src/pages/index.astro public/ex/markup.js sync.lock.json docs/performance.md`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (only which poster file a 1x screen fetches changes; 2x screens and phones keep the whole poster)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Each card on the wall prints a 504 x 704 poster (its ground at rest) and a 576 x 312 front-effects poster. The design
rounds bake a half-size copy of each (`posters/<id>@0.5x.avif`, `posters/<id>-fx@0.5x.webp`) and their card printer,
`markup.js`, prints `srcset` so a card drawn about 244 px wide on a 1x screen fetches the half. This site ships all 52
half files but never names them: its build does not give `markup.js` the list that says which halves exist
(`posters/posters.json`), so every poster prints without `srcset` and a 1x desktop fetches the whole poster for all 26
cards (posters 1,630 KB against 567 KB for the halves; front-effects posters 267 KB against 130 KB). The rounds' own
page prints the ladder. After this plan the wall prints it too, and the 52 files that are already deployed are used.

This is a site-code gap (`scripts/sync.mjs` and `src/lib/cards.ts`), not a round bug. No round file changes.

## Current state

Files and roles:

- `public/ex/markup.js`: the rounds' card printer. **Synced from the rounds (`r4/ex/markup.js`). Never edit it by
  hand.** This plan does not change it.
- `scripts/sync.mjs`: copies round files into this repo by allow-list. `STAGES.cards` lists what comes from `r4/ex`.
- `src/lib/cards.ts`: loads the round card code at build and prints every card (`card()`); holds `FRAMED`, the inline
  script that swaps a card's framed print in on desktop.
- `src/pages/index.astro`: the wall (prints `card(f)` for 26 cards).
- `src/pages/cards/[id].astro`: one card page (prints `card(f, { id, focusable: false })`).
- `scripts/verify-build.mjs`: the release guard that `pnpm build` runs.
- `vendor/ex/`: build-only synced files (not served). `public/ex/posters/`: the 104 poster files (26 whole posters,
  26 whole fx posters, 26 `@0.5x.avif`, 26 `-fx@0.5x.webp`).

How `markup.js` decides, `public/ex/markup.js:264-275`:

```js
  // without sizes (the battle, the components sheet) or a card without a half prints src alone. env.posters (posters.json)
  // wins; else node reads the file beside this one, and a page or a bundle (no require) reads nothing.
  const postersFile = () => { ... try { if (typeof require === 'function') { const name = './posters/' + 'posters.json'; required.POSTERS = require(name); } } catch (e) {} ... };
  const halfOf = (f, env, kind) => { const P = (env && env.posters) || postersFile(); const h = P && P.half; return !!(h && h[kind] && h[kind][f.id]); };
  const posterSet = (f, env, sz) => (sz && halfOf(f, env, 'bytes') ? ` srcset="posters/${esc(f.id)}@0.5x.avif 252w, posters/${esc(f.id)}.webp 504w" sizes="${esc(sizesOf(sz, 1))}"` : '');
  const fxSet = (f, env, sz) => (sz && halfOf(f, env, 'fx') ? ` srcset="posters/${esc(f.id)}-fx@0.5x.webp 288w, posters/${esc(f.id)}-fx.webp 576w" sizes="${esc(sizesOf(sz, 576 / 504))}"` : '');
  const fx = (f, lz = '', set = '') => `<span class="fx" aria-hidden="true"><img src="posters/${f.id}-fx.webp"${set} alt="" width="576" height="312"${lz} draggable="false"><canvas width="576" height="312"></canvas></span>`;
```

So the ladder prints only when the caller passes `sizes` AND `env.posters.half.bytes[id]` (or `.fx[id]`) exists.

Today `posters.json` is not synced (`ls public/ex/posters/posters.json vendor/ex/posters/posters.json` finds neither)
and the build's `env` has no `posters` key, `src/lib/cards.ts:70`:

```ts
export const env = { recipes: RECIPES, bands: BANDS, media: MEDIA, art: ART, size: webpSize, face: FACE, order: FIGHTERS.map((f) => f.id), set: FIGHTERS.length };
```

The build-only sync rule, `scripts/sync.mjs:74`:

```js
    { from: EX, to: 'vendor/ex', files: only('face.gen.js', 'bands.json', 'fonts/OFL.txt', 'vendor/neu-tokens.css', 'icons/icons.svg', 'icons/card-symbols.svg', 'icons/icons.js', 'tools/wall-rule.mjs', 'roster/battle-roster.json', 'copy/overrides.json') },
```

`r4/ex/posters/posters.json` exists at the pinned rounds commit `30e69931` and in the export this repo syncs from
(`~/k7-rescue/release-next/rounds-42ff51c7/r4/ex/posters/posters.json`, identical bytes, 4.5 KB). Its `half` key holds
`bytes` and `fx`, each with all 26 card ids.

How a card is printed, `src/lib/cards.ts:78` and `:127-133`:

```ts
const framedCard = (f: Fighter, opts: Record<string, unknown> = {}) => M.card(f, { sizes: GALLERY_SIZES, ...opts }, env) as string;
...
export const card = (f: Fighter, opts: Record<string, unknown> = {}) => {
  const plain = (M.baseCard(f, { sizes: GALLERY_SIZES, ...opts }, env) as string).replace(/(<span class="fx"[^>]*><img )src="(posters\/[\w-]+-fx\.webp)"/, '$1data-plainfx="$2"');
  const framed = framedCard(f, opts);
  const d = delta(plain, framed);
  if (undelta(plain, d) !== framed) throw new Error(`card ${f.id}: the framed print's delta does not rebuild it`);
  return `${plain}<template class="framed">${d}</template>`;
};
```

The `.replace` moves the plain print's front-effects poster address from `src` to `data-plainfx`, so a desktop (which
swaps the plain print for the framed one) never fetches it. `FRAMED` (`src/lib/cards.ts:134`, one long line) gives it
back where the plain print stays (phones). The part of `FRAMED` that does so:

```js
else c.querySelectorAll("img[data-plainfx]").forEach(function(i){var p=c.querySelector("img.poster");if(p&&p.loading==="lazy")i.loading="lazy";i.src=i.dataset.plainfx;i.removeAttribute("data-plainfx")});
```

Three things follow, and the steps handle each:

1. Once the ladder prints, the plain print's fx `<img>` also gets `srcset="..."` right after `src`. An `<img>` with a
   `srcset` and no `src` still fetches, so the `srcset` must move to a data attribute too, and `FRAMED` must restore it.
2. **Card pages must not get the ladder.** `card()` passes the wall's `sizes` (`GALLERY_SIZES`, about 244 px a card at
   1440 wide) on every page, but a card page draws its card up to 440 px wide (`src/styles/site.css:71`,
   `.cardpage .stand .card { --card: min(440px, 100cqw - 8px); ... }`) and has no `gallery.js` to correct `sizes`
   (on the wall `public/ex/gallery.js:180-190` keeps each picture's `sizes` at its drawn width). With the ladder, a 1x
   card page would draw the 252 px half poster at 440 px. So `[id].astro` asks for no ladder.
3. The guard checks every `srcset` address exists (`scripts/verify-build.mjs:152`,
   `for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) {`); the new data attribute should be checked the same way.

On the wall nothing else needs to change: `gallery.js` already watches `.en > img.poster[srcset]` and
`.fx > img[srcset]` (`public/ex/gallery.js:189`), `index.astro`'s `lazy()` and `fetchpriority` rewrites only add
attributes after `<img `, and the pack and the dock print cards without `sizes`, so they print no `srcset`.

Repo rules that apply (from `AGENTS.md`): `public/ex` and `vendor/` are synced, never edited by hand (the sync command
writes them and `sync.lock.json`); every link the site writes is absolute, but pictures inside a card are relative to
`<base href="/ex/">` and stay as `markup.js` writes them; append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | last line `synced from 30e69931 + 42ff51c7: 1 written, 0 removed` |
| Build and release guard | `pnpm build` | last line `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Serve `dist/` | `pnpm preview --port 4413 --host 127.0.0.1` (in the background) | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4413/` prints `200` (may take 30 s) |
| Stop the serve | `pnpm exec astro preview stop` | prints `Stopped preview server` |

There is no test suite and no lint. `pnpm check` is broken on `main`; do not run it. A plain `pnpm sync` fails by
design (the live rounds folder is past the pinned commits); always use the `ROUNDS=` form above.

## Scope

**In scope** (the only files you should modify):

- `scripts/sync.mjs` (one name added to one list)
- `vendor/ex/posters/posters.json` and `sync.lock.json` (**written by the sync command, never by hand**)
- `src/lib/cards.ts`
- `src/pages/cards/[id].astro` (one option)
- `scripts/verify-build.mjs` (one regex)
- `docs/performance.md` (one table row)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):

- `public/ex/markup.js`, `public/ex/gallery.js` and every other file under `public/` and `vendor/` (synced).
- The subject pictures' own ladder (`<span class="pop"> <img srcset=...>`), which already prints.
- `src/pages/index.astro`: its `lazy()` and `fetchpriority` rewrites work unchanged.
- Card pages' picture sizes in general (see "Maintenance notes": a separate finding).
- Anything in the rounds folder.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/013-restore-poster-ladder` cut from
  `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin && git -C ~/repos/kevinliu-studio worktree add -b improve/013-restore-poster-ladder ~/repos/kevinliu-studio-013 origin/main`.
  Never edit the main checkout. Never use `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`.
- Message style, from this repo's log: `perf(cards): one copy of each card's shared markup, no unused frame code, no wasted fx posters`.
  Use `perf(cards): the wall's posters take their half on a 1x screen (the rounds' poster ladder)`.
- Do NOT push, open a PR or deploy.

## Steps

### Step 0: Pre-flight

1. `ls $HOME/k7-rescue/release-next/rounds-42ff51c7/r4/ex/posters/posters.json` prints the path.
2. `pnpm install --frozen-lockfile`
3. `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check`

4. Record the "before" paint capture now, while the tree is still `origin/main`: `pnpm build`, start the serve
   (`pnpm preview --port 4413 --host 127.0.0.1 > /tmp/013-preview.log 2>&1 &`, wait for `200`), run the capture block
   in Step 7 with the folder `/tmp/013-before`, then `pnpm exec astro preview stop`. If `agent-browser` is not
   installed, skip this item and Step 7's capture, and say so in the report.

**Verify**: step 3 prints `in sync` (if not, STOP), and item 4 printed a line `N frames over S s -> /tmp/013-before`.

### Step 1: Sync `posters.json` as build-only data

In `scripts/sync.mjs:74`, add `'posters/posters.json'` to the end of the `only(...)` list of the rule whose `to` is
`'vendor/ex'` and whose list starts with `'face.gen.js', 'bands.json'`:

```js
    { from: EX, to: 'vendor/ex', files: only('face.gen.js', 'bands.json', 'fonts/OFL.txt', 'vendor/neu-tokens.css', 'icons/icons.svg', 'icons/card-symbols.svg', 'icons/icons.js', 'tools/wall-rule.mjs', 'roster/battle-roster.json', 'copy/overrides.json', 'posters/posters.json') },
```

Then run the sync:

```sh
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs
```

**Verify**: the last line is `synced from 30e69931 + 42ff51c7: 1 written, 0 removed`;
`node -e "const p=JSON.parse(require('fs').readFileSync('vendor/ex/posters/posters.json','utf8'));console.log(Object.keys(p.half.bytes).length, Object.keys(p.half.fx).length)"`
prints `26 26`; `git status --short` shows `scripts/sync.mjs` and `sync.lock.json` modified and
`vendor/ex/posters/` untracked, nothing else.

### Step 2: Give the card printer the ladder, except where asked not to

In `src/lib/cards.ts`:

1. Replace line 70 (the `export const env = ...` line) with:

   ```ts
   // The poster ladder (r4/ex tools/posters.cjs): each poster's half beside it, recorded in posters.json (synced to
   // vendor/ex, build-only). markup.js prints a poster's srcset by width when its card is printed with sizes and
   // env.posters names a half for it.
   const POSTERS = JSON.parse(fs.readFileSync(path.join(VX, 'posters/posters.json'), 'utf8'));
   export const env = { recipes: RECIPES, bands: BANDS, media: MEDIA, art: ART, size: webpSize, face: FACE, order: FIGHTERS.map((f) => f.id), set: FIGHTERS.length, posters: POSTERS };
   // A card page draws its card up to 440 px wide and has no gallery.js to keep `sizes` at the drawn width, so a
   // caller may ask for the whole posters only (opts.ladder === false).
   const NO_LADDER = { ...env, posters: { half: {} } };
   ```

2. Replace line 78 (`const framedCard = ...`) with:

   ```ts
   const framedCard = (f: Fighter, opts: Record<string, unknown> = {}, e: typeof env = env) => M.card(f, { sizes: GALLERY_SIZES, ...opts }, e) as string;
   ```

3. In `export const card = ...` (lines 127-133) replace its first three lines (down to and including
   `const framed = framedCard(f, opts);`) with:

   ```ts
   export const card = (f: Fighter, opts: Record<string, unknown> = {}) => {
     const { ladder = true, ...o } = opts;
     const e = ladder ? env : NO_LADDER;
     // the plain print's front-effects poster waits in data attributes (its src, and its srcset when the ladder prints
     // one: an <img> with a srcset and no src still fetches), so a desktop never fetches it; FRAMED gives both back
     const plain = (M.baseCard(f, { sizes: GALLERY_SIZES, ...o }, e) as string).replace(/(<span class="fx"[^>]*><img )src="(posters\/[\w-]+-fx\.webp)"(?: srcset="([^"]*)")?/, (_m: string, a: string, src: string, set?: string) => `${a}data-plainfx="${src}"${set ? ` data-plainfxset="${set}"` : ''}`);
     const framed = framedCard(f, o, e);
   ```

   The remaining three lines of the function (`const d = delta(...)`, the `undelta` check, the `return`) stay.

4. In `FRAMED` (line 134), change exactly this piece of the string:

   `i.src=i.dataset.plainfx;i.removeAttribute("data-plainfx")`

   to:

   `if(i.dataset.plainfxset){i.srcset=i.dataset.plainfxset;i.removeAttribute("data-plainfxset")}i.src=i.dataset.plainfx;i.removeAttribute("data-plainfx")`

**Verify**: `grep -o 'plainfxset' src/lib/cards.ts | wc -l` prints `4` (one in `card()`, three in `FRAMED`);
`grep -c "posters: POSTERS" src/lib/cards.ts` prints `1`.

### Step 3: Card pages ask for no ladder

In `src/pages/cards/[id].astro:45`, change `card(f, { id: `c-${f.id}`, focusable: false })` to
`card(f, { id: `c-${f.id}`, focusable: false, ladder: false })`. Change nothing else on the line.

**Verify**: `grep -c "ladder: false" "src/pages/cards/[id].astro"` prints `1`.

### Step 4: The guard checks the held `srcset` too

In `scripts/verify-build.mjs:152`, change

```js
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) {
```

to

```js
  for (const m of html.matchAll(/\s(?:srcset|data-plainfxset)="([^"]+)"/g)) {
```

**Verify**: `node --check scripts/verify-build.mjs` exits 0.

### Step 5: Build and check the HTML

`pnpm build`

**Verify**, all of:

- the last line is the guard's `all checks pass` line (a `card <id>: the framed print's delta does not rebuild it`
  error, or any `broken srcset` line, is a STOP);
- `grep -o 'srcset="posters/[a-z0-9-]*@0.5x.avif 252w, posters/[a-z0-9-]*.webp 504w"' dist/index.html | wc -l` prints `26`;
- `grep -o 'data-plainfxset="posters/[a-z0-9-]*-fx@0.5x.webp 288w, posters/[a-z0-9-]*-fx.webp 576w"' dist/index.html | wc -l` prints `26`;
- no fx poster can load before `FRAMED` runs:
  `grep -o '<span class="fx"[^>]*><img [^>]*>' dist/index.html | grep -c ' srcset="'` prints `0`, and the same pipe
  with `grep -c ' src="'` prints `0`;
- card pages are unchanged: `grep -c 'srcset="posters/' dist/cards/katagami.html` prints `0` and
  `grep -c 'plainfxset' dist/cards/katagami.html` prints `0`.

### Step 6: Check it in a browser

Start the serve in the background (`pnpm preview --port 4413 --host 127.0.0.1 > /tmp/013-preview.log 2>&1 &`), wait
for `200`, then:

```sh
export AGENT_BROWSER_SESSION=plan-013
agent-browser open http://127.0.0.1:4413/
sleep 12
agent-browser eval "JSON.stringify([...document.querySelectorAll('.wall .card .en > img.poster')].filter(i=>{const r=i.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).map(i=>({f:i.currentSrc.replace(/.*\//,''),nat:i.naturalWidth,drawn:Math.round(i.getBoundingClientRect().width*devicePixelRatio)})))"
agent-browser open http://127.0.0.1:4413/cards/katagami
sleep 6
agent-browser eval "JSON.stringify({set:document.querySelector('.stand img.poster').hasAttribute('srcset'),f:document.querySelector('.stand img.poster').currentSrc.replace(/.*\//,'')})"
agent-browser close
pnpm exec astro preview stop
```

**Verify**:

- in the first result every entry has `nat` greater than or equal to `drawn` minus 1 (no poster is drawn larger than
  its file), and at agent-browser's default window (1280 wide, 1x) at least one `f` ends in `@0.5x.avif`;
- the second result is `{"set":false,"f":"katagami.webp"}`;
- after the stop, `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4413/` prints `000`.

If `agent-browser` is not installed, skip this step and say so in the report (the build checks in Step 5 still hold).

### Step 7: Record a paint capture, then write it down

The repo's rule (`AGENTS.md`): a change that touches first paint is recorded with `scripts/paint-capture.mjs` before
and after. The "before" was recorded in Step 0. For the "after", serve this branch's build
(`pnpm preview --port 4413 --host 127.0.0.1 > /tmp/013-preview.log 2>&1 &`, wait for `200`) and run this block with
the folder `/tmp/013-after`, then `pnpm exec astro preview stop`:

```sh
export AGENT_BROWSER_SESSION=plan-013-paint
agent-browser open about:blank
rm -f /tmp/013-stop
node scripts/paint-capture.mjs "$(agent-browser get cdp-url)" /tmp/013-<before|after> /tmp/013-stop 15000 &
sleep 2
agent-browser open http://127.0.0.1:4413/
sleep 8
touch /tmp/013-stop; wait
agent-browser close
```

The script prints `N frames over S s`. Put both lines in your report with the folder paths; a reviewer reads the
frames. Then:

1. `docs/performance.md`, the table under "What holds it": add a row after the row that starts
   `| The wall's first paint |`:
   `| Poster sizes | `scripts/sync.mjs`, `src/lib/cards.ts` | The wall prints each poster and front-effects poster with its half beside it (`srcset`, the rounds' `posters/posters.json`), so a card drawn under 252 px wide at 1x fetches the half; a card page prints the whole poster (`ladder: false`). |`
2. Append an entry to `memory.md` in the style of its last entries (date, type `perf`, changed files, why, the two
   paint capture lines, open threads: the card page finding in this plan's "Maintenance notes").

**Verify**: `grep -c "| Poster sizes |" docs/performance.md` prints `1`; `git diff --stat -- memory.md` shows only
insertions.

### Step 8: Commit

One commit, by explicit path: `scripts/sync.mjs vendor/ex/posters/posters.json sync.lock.json src/lib/cards.ts
"src/pages/cards/[id].astro" scripts/verify-build.mjs docs/performance.md memory.md`.

**Verify**: `git status --short` prints nothing.

## Test plan

No test suite exists. The checks are the build-time ones this plan relies on:

- `card()` already throws at build if a framed print cannot be rebuilt from its plain print (`undelta`), for all 26
  cards on the wall and on each card page;
- the guard checks that every `srcset` and `data-plainfxset` address exists in `dist/`;
- the `grep` counts in Step 5 and the browser check in Step 6.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] `pnpm build` ends with `verify-build: ... all checks pass`
- [ ] `grep -o 'srcset="posters/[a-z0-9-]*@0.5x.avif 252w' dist/index.html | wc -l` prints `26`
- [ ] `grep -o '<span class="fx"[^>]*><img [^>]*>' dist/index.html | grep -c ' srcset="'` prints `0`
- [ ] `grep -c 'srcset="posters/' dist/cards/katagami.html` prints `0`
- [ ] `git diff --stat origin/main..HEAD` lists only the in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync` before your
  first edit, or the sync prints `problem(s); nothing was written`.
- The code at the locations in "Current state" does not match the excerpts (in particular if `FRAMED` no longer
  contains `i.src=i.dataset.plainfx;i.removeAttribute("data-plainfx")` exactly once).
- `pnpm build` fails with `the framed print's delta does not rebuild it` or `broken srcset`.
- In Step 6 any on-screen wall poster has `nat` more than 1 below `drawn` (a poster drawn larger than its file).
- The fix seems to need an edit under `public/` or `vendor/` other than through the sync command.

## Maintenance notes

- The half posters are AVIF. Every browser this site's other code needs (container query units, `image-set`)
  decodes AVIF; a browser that does not would show no poster on a 1x screen. The rounds' own page makes the same
  choice.
- If the rounds stop writing `posters/posters.json`, the sync stops (`missing named files`). Remove the name and the
  `posters` key together.
- A reviewer should look at one phone: there the plain print stays, so `FRAMED` sets the fx poster's `srcset` and
  `src` itself; the poster should appear exactly as before.
- **A separate finding, not fixed here**: card pages choose every card picture by the wall's width. `card()` passes
  `GALLERY_SIZES` on card pages too, so the subject (`<span class="pop"><img srcset>`) takes the cut for a card about
  244 px wide while the card page draws it up to 440 px wide (about 1.8 times larger than its file, at 1x and at 2x).
  It was read from the code and the built HTML, not checked in a browser. The fix would be a `sizes` of the card
  page's own width for that page; it raises the bytes of a desktop card page, so it wants its own decision.
