# Plan 015: Card pages stop loading a style sheet they do not print, and `card.css` drops its unused 30 KB inline tile

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- src/layouts/Base.astro "src/pages/cards/[id].astro" src/components/BattlePage.astro scripts/sync.mjs scripts/verify-build.mjs public/ex/card.css public/ex/ui.css sync.lock.json docs/sync.md`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW for Part A. LOW to MED for Part B (the battle's cards take their frost tile from a file instead of
  from the sheet; a browser check covers it)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Two render-blocking stylesheets carry bytes most pages never use:

- **Part A.** Every page that prints a card links `/ex/styles/breakout/breakout.css` (66 KB, 8.3 KB gzipped). Only
  one card, Princeton TD, is printed in the Breakout style. So 25 of the 26 card pages wait on a sheet none of their
  rules can match.
- **Part B.** `/ex/card.css` holds the frosted slips' noise tile as a base64 data URL, one line of 30,597 characters.
  It is only the fallback of `var(--frost, ...)`. The wall and the card pages always set `--frost` (in `ui.css`), so
  there the tile is never painted, yet it is 46% of the sheet on the wire: 55,045 bytes gzipped with it, 29,569
  without. Only the battle page uses the fallback, because it loads `card.css` without `ui.css`.

After this plan a card page links `breakout.css` only if its card prints in that style, and `card.css` is about 25 KB
smaller for every page, with the battle told where the tile file is.

Part A is site code. Part B's tile is in round code (`r4/ex/card.css`, the rounds' face lane), but there it is a
**recorded decision**, not a bug (see "Current state"), so there is no upstream request: the site takes the tile out
on the way in, with an anchored patch in `TRANSFORMS`, and keeps that patch.

## Current state

Files and roles:

- `src/layouts/Base.astro`: the page frame; links the card system's sheets.
- `src/pages/cards/[id].astro`: a card page.
- `src/components/BattlePage.astro`: the battle's page frame (`/battle` and `/battle/arena`).
- `scripts/sync.mjs`: copies round files into this repo; `TRANSFORMS` holds the only edits made to them, as anchored
  text patches (`patch(file, text, pairs)`: each `[find, replace]` pair's `find` must occur exactly once).
- `public/ex/card.css`, `public/ex/ui.css`: **synced from the rounds (`r4/ex/`). Never edit them by hand.**
- `scripts/verify-build.mjs`: the release guard that `pnpm build` runs.

### Part A

`src/layouts/Base.astro:58-59` links every round sheet on every `room` page (a page that prints cards):

```astro
{/* the round page's other sheets (a card style's, Breakout), so a card printed in that style paints in it */}
{room && roundSheets.filter((s) => !['ui.css', 'card.css', 'rituals.css'].includes(s.href)).map((s) => <link rel="stylesheet" href={versioned(`/ex/${s.href}`)} data-card-style-sheet={s.style ? '' : undefined} />)}
```

`roundSheets` (`src/lib/cards.ts:162`) is read from `vendor/ex/index.html`, whose only style sheet line is
`<link rel="stylesheet" href="styles/breakout/breakout.css" data-card-style-sheet>`; so the list's one entry beyond
the three named sheets is `{ href: 'styles/breakout/breakout.css', style: true }`.

Base's props, `src/layouts/Base.astro:15-24`:

```astro
interface Props {
  seo: Parameters<typeof Seo>[0];
  room?: boolean;
  scripts?: string[]; // classic scripts under /ex/, in order (defer)
  html?: Record<string, string | boolean>;
  twinPath?: string;
  main?: string; // the id the skip link lands on
  heavy?: boolean; // gives back its GPU memory and pictures when it leaves on a touch screen (Release.astro)
}
const { seo, room = false, scripts = [], html = {}, twinPath = seo.path, main = 'main', heavy = false } = Astro.props;
```

A card page calls it like this, `src/pages/cards/[id].astro:39-43`:

```astro
<Base
  seo={{ title: f.title, description, path: cardPath(f), og: f.id, imageAlt: `The ${f.title} card: ${answer}`, jsonld }}
  room
  html={{ 'data-card': f.id }}
>
```

A card printed in a style carries `data-card-style="<style>"` on its root (in the built site only
`dist/cards/princeton-td.html` and `dist/index.html` contain `data-card-style="breakout"`). The guard already fails a
page that prints one without the sheet, `scripts/verify-build.mjs:151`:

```js
  if (/\sdata-card-style="breakout"/.test(html) && !/href="\/ex\/styles\/breakout\/breakout\.css\?v=/.test(html)) fail(page, 'a Breakout card without breakout.css');
```

The home page must keep every style's sheet: its `gallery.js` can restyle cards after load
(`public/ex/gallery.js:1076-1080`, the `cardstyle` event). Card pages run no round scripts.

### Part B

`public/ex/card.css:237-242` (the comment is the rounds' own; line 242 is 30,597 characters long, shortened here):

```css
/* Round ex.5 (engineer, the swap rehearsal): the tile is part of this sheet, as a data URL of icons/frost.webp byte for
   byte, so it resolves wherever the sheet is served from. A relative url() resolved against the sheet's own address, and
   the battle serves this file scoped as broadcast/card.gen.css, where icons/frost@2x.webp 404s. A page that ships the
   2x raster beside itself may set --frost (the gallery's ui.css: image-set of icons/frost.webp 1x and
   icons/frost@2x.webp 2x); a page that sets nothing (the battle) prints this 1x tile */
.card { --frost-tile: var(--frost, url("data:image/webp;base64,UklGRmZZAABXRUJQVlA4WAoAAAAQ ... ")); }
```

The data URL decodes to exactly the bytes of `public/ex/icons/frost.webp` (22,894 bytes; checked). `--frost-tile` is
used four times in `card.css` as `background: var(--frost-tile) 0 0 / 180px 180px, ...` (lines 249, 257, 620, 865).

Who sets `--frost`:

- `public/ex/ui.css:14-16`, linked by `Base.astro` on **every** page it frames (line 53, no condition):

  ```css
  :root {
    --sans: 'Katagami Sans';
    /* the frosted slips' tile at the screen's density (card.css prints its 1x tile, a data URL, where a page sets none) */
    --frost: image-set(url("icons/frost.webp") 1x, url("icons/frost@2x.webp") 2x);
  ```

- The battle page does **not** use `Base.astro` and does not link `ui.css`: its sheets are `room.css`, `/ex/card.css`,
  `stage.css`, `battle.css`, `hud.css` (`vendor/battle/mat/index.html`, rewritten by `src/lib/battle.ts`). Nothing
  under `public/battle/`, `vendor/battle/` or `src/` sets `--frost`. **So the battle depends on the fallback today.**
  Its head, `src/components/BattlePage.astro:29-32`:

  ```astro
  <script is:inline>/* the page writes its state as a bare "#..." address ... */ ... </script>
  <Release />
  <Fragment set:html={battlePage.head} />
  <Analytics />
  ```

The existing `card.css` patches, `scripts/sync.mjs:252-257`:

```js
  'public/ex/card.css': (t) => patch('card.css', t, [
    ['background: linear-gradient(color-mix(in oklab, var(--k) 82%, transparent), color-mix(in oklab, var(--k) 82%, transparent)) 2.4cqw 4.9cqw / calc(100% - 4.8cqw) 0.3cqw no-repeat,\n    linear-gradient(', 'background: linear-gradient('],
    ['.card .trait { grid-template-columns: auto auto 1fr; grid-template-rows: 4.9cqw auto;', '.card .trait { grid-template-columns: auto auto 1fr; grid-template-rows: auto auto;'],
    ['.card .move { grid-template-columns: auto 1fr auto; grid-template-rows: 4.9cqw auto;', '.card .move { grid-template-columns: auto 1fr auto; grid-template-rows: auto auto;'],
    ['  display: none; grid-template-columns: 31cqw 28cqw 1fr; align-items: center; }', '  display: none; grid-template-columns: calc(31 / 86.4 * 100%) calc(28 / 86.4 * 100%) 1fr; align-items: center; }'],
  ]),
```

A pair's `find` may be computed from the text. The file already does this for another patch, `scripts/sync.mjs:185`:

```js
const nolink = (t) => [/  const NOLINK = new Set\(\[[^\]]*\]\);/.exec(t)?.[0] ?? '<none>', `  const NOLINK = new Set(${JSON.stringify(CLOSED)});`];
```

(`'<none>'` never occurs in the text, so `patch` stops the sync when the anchor is gone.)

Checked on 2026-11-09: the prefix `.card { --frost-tile: var(--frost, url("data:image/webp;base64,` occurs exactly
once in the pinned source (`git show 30e69931:r4/ex/card.css`), in the shipped copy and at rounds HEAD `868340d7`;
the text `"))` occurs exactly once in the file (the end of that data URL); none of the four existing pairs touches
that line.

Repo rules that apply (from `AGENTS.md`): synced folders (`public/ex`, `public/battle`, `public/sound`, `public/og`,
`vendor/`) are never edited by hand; a fix to round code is an anchored patch in `TRANSFORMS`, then the sync command
rewrites the synced file and `sync.lock.json`, and they are committed together; every link the site writes is
absolute; append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | last line `synced from 30e69931 + 42ff51c7: 1 written, 0 removed` |
| Build and release guard | `pnpm build` | last line `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Serve `dist/` | `pnpm preview --port 4415 --host 127.0.0.1` (in the background) | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4415/` prints `200` (may take 30 s) |
| Stop the serve | `pnpm exec astro preview stop` | prints `Stopped preview server` |

There is no test suite and no lint. `pnpm check` is broken on `main`; do not run it. A plain `pnpm sync` fails by
design; always use the `ROUNDS=` form.

## Scope

**In scope** (the only files you should modify):

- Part A: `src/layouts/Base.astro`, `src/pages/cards/[id].astro`
- Part B: `src/components/BattlePage.astro`, `scripts/sync.mjs`, `docs/sync.md`; and `public/ex/card.css` with
  `sync.lock.json` **only through the sync command**
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):

- `public/ex/ui.css` and its `--frost` line: the wall keeps choosing the 1x or 2x tile.
- `public/ex/icons/frost.webp` and `frost@2x.webp`: already shipped; do not move or rename them.
- The battle's own sheets under `public/battle/` and `src/lib/battle.ts`.
- `src/pages/index.astro`: the home page keeps every style's sheet.
- `scripts/verify-build.mjs`: its Breakout check already covers Part A.
- Anything in the rounds folder. There is no upstream request for this plan.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/015-render-blocking-css-diet` cut from
  `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin && git -C ~/repos/kevinliu-studio worktree add -b improve/015-render-blocking-css-diet ~/repos/kevinliu-studio-015 origin/main`.
  Never edit the main checkout. Never use `git stash`.
- Two commits, one per part, each by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`.
- Message style, from this repo's log: `perf(cards): one copy of each card's shared markup, no unused frame code, no wasted fx posters`.
  Use `perf(cards): a card page links a card style's sheet only when its card prints in it` and
  `perf(cards): card.css without its unused inline frost tile; the battle names the tile's file`.
- Do NOT push, open a PR or deploy.

## Steps

### Step 0: Pre-flight

1. `pnpm install --frozen-lockfile`
2. `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check`
3. `gzip -9 -c public/ex/card.css | wc -c`

**Verify**: step 2 prints `in sync` (if not, STOP); step 3 prints `55045`.

### Step 1 (Part A): Base links a card style's sheet only where it can be used

In `src/layouts/Base.astro`:

1. Add one line to `interface Props`, after the `heavy?: boolean; ...` line:

   ```ts
     cardStyle?: string | null; // the one card style this page prints (data-card-style), null for none; left out, the page takes every style's sheet (the wall, whose cards can change style)
   ```

2. Change the destructuring line to read `cardStyle` too:

   ```ts
   const { seo, room = false, scripts = [], html = {}, twinPath = seo.path, main = 'main', heavy = false, cardStyle } = Astro.props;
   ```

3. Replace the comment and the line under it (lines 58-59) with:

   ```astro
   {/* the round page's other sheets (a card style's, Breakout), so a card printed in that style paints in it: every
      style's on the wall, and on a page that names its card's style (a card page) only that one's */}
   {room && roundSheets.filter((s) => !['ui.css', 'card.css', 'rituals.css'].includes(s.href) && (!s.style || cardStyle === undefined || (!!cardStyle && s.href.startsWith(`styles/${cardStyle}/`)))).map((s) => <link rel="stylesheet" href={versioned(`/ex/${s.href}`)} data-card-style-sheet={s.style ? '' : undefined} />)}
   ```

**Verify**: `grep -c "cardStyle" src/layouts/Base.astro` prints `3` or more.

### Step 2 (Part A): A card page names its card's style

In `src/pages/cards/[id].astro`:

1. In the frontmatter, after the line `const facts = factLines(f);` add:

   ```ts
   // the card style this card prints in (markup.js writes data-card-style on a styled card), so Base links that
   // style's sheet and no other
   const cardStyle = (card(f).match(/\sdata-card-style="([\w-]+)"/) ?? [])[1] ?? null;
   ```

2. In the `<Base` opening tag add the prop on its own line after `room`:

   ```astro
     cardStyle={cardStyle}
   ```

Do not change the line that prints the card (`<div class="stand">...`).

**Verify**: `grep -c "cardStyle" "src/pages/cards/[id].astro"` prints `2` (the `const` line and the prop line).

### Step 3 (Part A): Build and check

`pnpm build`, then:

```sh
grep -l 'href="/ex/styles/breakout/breakout.css?v=' dist/cards/*.html
grep -c 'href="/ex/styles/breakout/breakout.css?v=' dist/index.html
```

**Verify**: the build ends with the guard's `all checks pass` line; the first command prints exactly one line,
`dist/cards/princeton-td.html`; the second prints `1`.

Commit Part A: `src/layouts/Base.astro "src/pages/cards/[id].astro"`.

### Step 4 (Part B): The battle names the frost tile's file

In `src/components/BattlePage.astro`, add one line directly **before** `<Fragment set:html={battlePage.head} />`:

```astro
<style is:inline>/* the frosted slips' tile: card.css no longer carries it inline (scripts/sync.mjs), so this page names the file, as ui.css does for the wall. It is the same 1x tile the sheet's fallback printed */:root{--frost:url("/ex/icons/frost.webp")}</style>
```

Do this step before Step 5, so the battle never has a build without its tile.

**Verify**: `ls public/ex/icons/frost.webp` prints the path; `grep -c 'frost.webp' src/components/BattlePage.astro`
prints `1`.

### Step 5 (Part B): Take the inline tile out of `card.css` on the way in

In `scripts/sync.mjs`:

1. Directly after the `nolink` line (line 185, `const nolink = (t) => [...]`), add:

   ```js
   // card.css carries the frosted slips' 1x tile as a 30 KB base64 data URL, the fallback of var(--frost, ...), so the
   // sheet paints wherever the rounds serve it (r4/ex card.css, round ex.5). Every page here sets --frost (ui.css on the
   // pages Base.astro frames, BattlePage.astro on the battle), so the fallback is never painted and it leaves the
   // render-blocking sheet: about 25 KB less gzipped on every page that prints a card
   const FROST = '.card { --frost-tile: var(--frost, url("data:image/webp;base64,';
   const frost = (t) => { const a = t.indexOf(FROST), e = a < 0 ? -1 : t.indexOf('"))', a); return [e < 0 ? '<none>' : t.slice(a, e + 3), '.card { --frost-tile: var(--frost, none)']; };
   ```

2. In the `'public/ex/card.css'` entry (lines 252-257), add `frost(t),` as a fifth element of the array, after the
   pair that starts `['  display: none; grid-template-columns: 31cqw 28cqw 1fr;` and before the closing `]),`:

   ```js
       ['  display: none; grid-template-columns: 31cqw 28cqw 1fr; align-items: center; }', '  display: none; grid-template-columns: calc(31 / 86.4 * 100%) calc(28 / 86.4 * 100%) 1fr; align-items: center; }'],
       frost(t),
     ]),
   ```

3. Run the sync: `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs`

**Verify**, all of:

- the sync's last line is `synced from 30e69931 + 42ff51c7: 1 written, 0 removed`;
- `grep -c "base64" public/ex/card.css` prints `0`;
- `grep -c -- "--frost-tile: var(--frost, none); }" public/ex/card.css` prints `1`;
- `gzip -9 -c public/ex/card.css | wc -c` prints a number between 29000 and 30500;
- `git status --short` shows only `scripts/sync.mjs`, `src/components/BattlePage.astro`, `public/ex/card.css` and
  `sync.lock.json` modified.

### Step 6 (Part B): Build and check the battle in a browser

`pnpm build` (expect the guard's `all checks pass` line), start the serve in the background
(`pnpm preview --port 4415 --host 127.0.0.1 > /tmp/015-preview.log 2>&1 &`), wait for `200`, then:

```sh
export AGENT_BROWSER_SESSION=plan-015
for p in /battle /battle/arena /cards/katagami; do
  agent-browser open http://127.0.0.1:4415$p
  sleep 20
  agent-browser eval "JSON.stringify({page: location.pathname, cards: document.querySelectorAll('.card').length, tile: (document.querySelector('.card') ? getComputedStyle(document.querySelector('.card')).getPropertyValue('--frost-tile') : '').slice(0, 90), fetched: performance.getEntriesByType('resource').filter(e => /\/ex\/icons\/frost/.test(e.name)).map(e => e.name.replace(/.*\//, ''))})"
done
agent-browser close
pnpm exec astro preview stop
```

**Verify**:

- `/battle` and `/battle/arena`: `cards` is 1 or more, `tile` contains `/ex/icons/frost.webp`, and `fetched` lists
  `frost.webp`;
- `/cards/katagami`: `tile` contains `image-set(` and `fetched` lists `frost.webp` or `frost@2x.webp`;
- after the stop, `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4415/` prints `000`.

If `cards` is `0` on a battle page, wait 20 s more and run the `eval` again (the battle deals its cards after it
boots; this machine is often slow). If `agent-browser` is not installed, STOP after the build: Part B may not ship
without this check. In your report ask the operator to look at one battle card's trait and move slips in both modes:
they must still show their fine noise.

### Step 7 (Part B): Record it and commit

1. `docs/sync.md`, the "Transforms" list: after the bullet that starts
   `` - `ex/markup.js`: the lens's Visit link carries no placeholder `` add a bullet:
   `` - `ex/card.css`: the frosted slips' inline 1x tile (a 30 KB data URL, the fallback of `--frost`) is left out; every page sets `--frost` itself (`ui.css`, and `BattlePage.astro` for the battle). ``
2. Append an entry to `memory.md` in the style of its last entries: date, type `perf`, both parts' changed files, the
   `card.css` gzip size before and after, and under Open: "the operator's look at the battle's slips".

Commit Part B: `src/components/BattlePage.astro scripts/sync.mjs public/ex/card.css sync.lock.json docs/sync.md memory.md`.

**Verify**: `git status --short` prints nothing;
`ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`.

## Test plan

No test suite exists. The checks are: the guard's Breakout rule (a page that prints a Breakout card without the sheet
fails the build), the guard's reference check (the battle's `url("/ex/icons/frost.webp")` must exist in `dist/`), the
sync's anchor contract (the sync stops if the tile's line is not found exactly once), the `grep` and `gzip` gates in
Steps 3 and 5, and the browser check in Step 6.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` ends with `verify-build: ... all checks pass`
- [ ] `grep -l 'href="/ex/styles/breakout/breakout.css?v=' dist/cards/*.html | wc -l` prints `1`
- [ ] `grep -c 'href="/ex/styles/breakout/breakout.css?v=' dist/index.html` prints `1`
- [ ] `grep -c "base64" public/ex/card.css` prints `0`
- [ ] `gzip -9 -c public/ex/card.css | wc -c` prints a number under 30500
- [ ] `grep -c 'frost.webp' dist/battle.html` and `grep -c 'frost.webp' dist/battle/arena.html` each print `1`
- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] `git diff --stat origin/main..HEAD` lists only the in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, the sync check does not print `in sync` before your
  first edit, or the sync prints `problem(s); nothing was written`.
- The code at the locations in "Current state" does not match the excerpts.
- `public/ex/icons/frost.webp` is missing, or anything under `src/`, `public/battle/` or `vendor/battle/` already
  sets `--frost` (`grep -rn -e "--frost:" src public/battle vendor/battle` prints a line): the premise changed.
- In Step 6 a battle page's `tile` does not contain `/ex/icons/frost.webp`, or `fetched` is empty there.
- A page other than the two battle pages loads `/ex/card.css` without `/ex/ui.css`
  (`for f in $(grep -rl '/ex/card.css' dist --include='*.html'); do grep -L '/ex/ui.css' "$f"; done` prints anything
  besides `dist/battle.html` and `dist/battle/arena.html`).

## Maintenance notes

- The `card.css` patch is permanent, not an interim one: the rounds keep the inline tile on purpose (their own page
  and scoped copies need it). If the rounds ever drop it themselves, the anchor stops matching, the sync stops and
  names it, and `frost(t)` with its two constants is deleted.
- Any new page that loads `/ex/card.css` without `Base.astro` must set `--frost` itself, or its frosted slips lose
  their noise (they still paint: the fallback is `none`).
- A new card style adds its own sheet to the rounds' page head; `Base.astro` picks it up by folder name
  (`styles/<style>/`), and a card page links it when its card prints `data-card-style="<style>"`.
- A reviewer should open `/cards/princeton-td` and one other card page: the first must look as before (Breakout),
  the second must show no change.
