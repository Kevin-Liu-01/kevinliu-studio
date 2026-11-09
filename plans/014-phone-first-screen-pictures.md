# Plan 014: A touch screen fetches only its first screen's card pictures with the page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- src/pages/index.astro src/lib/cards.ts src/styles/site.css docs/performance.md`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S (plus the paint captures)
- **Risk**: MED (it changes when a desktop starts fetching cards 3 to 14: from the HTML's own order to a script right
  under the wall; the paint capture decides whether it holds)
- **Depends on**: none. If plan 013 (the poster ladder) has landed, nothing here changes; both touch different lines.
- **Category**: perf
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

The wall prints its first 14 cards with eager pictures on every device, because 14 is a desktop's first screen (two
rows of up to seven). A phone's wall is one column: about a card and a half is on screen. So a phone fetches the
pictures of 14 cards with the page, measured from the built HTML at 2,353 KB (600 px subject cuts) to 2,908 KB
(1200 px cuts, what a 390 px screen at 3x picks), for about twelve screens nobody has scrolled to. Those requests
share the connection with the first card's pictures, which the page's first-paint hold waits on (1 s at most), so on
a slow connection the hold times out more often and the wall paints before its art. After this plan a touch screen
fetches two cards' pictures with the page and the rest as they come near the screen; a desktop still takes its first
14.

This is site code only (`src/pages/index.astro`).

## Current state

Files and roles:

- `src/pages/index.astro`: the home page (the wall). Prints the 26 cards, decides which pictures are lazy, and holds
  three inline scripts under the wall.
- `src/lib/cards.ts`: `card(f)` prints one card (a plain print, then its framed print in
  `<template class="framed">`); `FRAMED` is the inline script that swaps the framed print in on a desktop.
- `src/styles/site.css:10`: `[data-hold] .human { visibility: hidden; }`, the first-paint hold.
- `docs/performance.md`: the performance bar and what holds it.

Which pictures are lazy, `src/pages/index.astro:12-25`:

```astro
// The wall's first screen (two rows of up to seven, the widest the gallery sets) loads with the page and its first
// poster first; the cards below wait until the page has loaded, then fetch at idle (the script under the wall), so the
// first screen never shares the line with pictures nobody can see yet, and no lens, pack or dock ever opens on a hole.
// On a touch screen the rest stay lazy: a phone decodes only the cards it has scrolled to (docs/performance.md, Memory).
const FIRST_SCREEN = 14;
const lazy = (html: string) => html.replace(/<img (?!loading=)/g, '<img loading="lazy" ');
...
const wall = fighters.map((f, i) => {
  const c = card(f);
  const html = i === 0 ? c.replaceAll('<img class="poster" ', '<img class="poster" fetchpriority="high" ') : i < FIRST_SCREEN ? c : lazy(c);
```

The wall and the scripts under it, `src/pages/index.astro:51-55` (the two long scripts are shortened here):

```astro
  <main class="gallery" id="gallery">
    <ul class="wall" aria-label="Cards" set:html={`${wall}\n<li class="pocket tile">${deck}</li>\n<li class="pocket tile">${pack}</li>`} />
    <script is:inline set:html={FRAMED} />
    <script is:inline>/* the page shows once the pictures of the cards on screen are decoded (1 s at most) ... */(function(d){var vh=innerHeight,imgs=[],mx=d.dataset.mode==="machine";if(!mx)document.querySelectorAll(".wall > .pocket").forEach(function(p){var r=p.getBoundingClientRect();if(r.top<vh&&r.bottom>0)p.querySelectorAll("img").forEach(function(i){imgs.push(i.decode().catch(function(){}))})});Promise.race([Promise.all(imgs),new Promise(function(r){setTimeout(r,1000)})]).then(function(){delete d.dataset.hold});addEventListener("load",function(){(self.requestIdleCallback||setTimeout)(function(){if(!mx&&!matchMedia("(pointer: coarse)").matches)document.querySelectorAll('img[loading="lazy"]').forEach(function(i){i.loading="eager"}); ... })},{once:true})})(document.documentElement)</script>
    <script is:inline>/* a card more than a screen away drops its filters ... */ ... </script>
```

So today: cards 1 to 14 are eager everywhere; cards 15 to 26 are lazy; after the page has loaded, a fine pointer
turns every lazy picture eager at idle and a touch screen leaves them lazy. In the built page
(`dist/index.html` at this commit) the wall's 26 card pockets hold 0 lazy pictures in pockets 1 to 14 and only lazy
pictures in pockets 15 to 26.

`FRAMED` runs before these scripts. On a desktop it replaces each plain print with its framed print (moving the
shared picture elements across); on a touch screen it keeps the plain print and gives the front-effects poster its
address, lazy when the card's poster is lazy
(`src/lib/cards.ts:134`: `if(p&&p.loading==="lazy")i.loading="lazy";i.src=i.dataset.plainfx`). So a script placed
right after `FRAMED` sees each card's final pictures.

Repo rules that apply (from `AGENTS.md` and `docs/performance.md`):

- "Nothing pops": a page paints whole. A change that touches first paint is recorded with
  `scripts/paint-capture.mjs` before and after.
- Numbers and timings from this Mac's local server are noisy (its load average is often above 100); in a local paint
  recording only the order and the count of paints mean anything.
- Append an entry to `memory.md` after the change. Never rewrite old entries.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Build and release guard | `pnpm build` | last line `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Serve `dist/` | `pnpm preview --port 4414 --host 127.0.0.1` (in the background) | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4414/` prints `200` (may take 30 s) |
| Stop the serve | `pnpm exec astro preview stop` | prints `Stopped preview server` |
| Lazy map of the built wall | the `node -e` line in Step 2 | one line of 26 entries |

There is no test suite and no lint. `pnpm check` is broken on `main`; do not run it. This plan does not sync.

## Scope

**In scope** (the only files you should modify):

- `src/pages/index.astro`
- `docs/performance.md` (one table row's text)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):

- `src/lib/cards.ts` and `FRAMED`: they already follow the poster's `loading`.
- The hold script and the idle script on line 54: unchanged.
- Everything under `public/` and `vendor/` (synced round material).
- Card pages and `/cards`: they print one card or none.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/014-phone-first-screen-pictures` cut
  from `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin && git -C ~/repos/kevinliu-studio worktree add -b improve/014-phone-first-screen-pictures ~/repos/kevinliu-studio-014 origin/main`.
  Never edit the main checkout. Never use `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`.
- Message style, from this repo's log: `perf(cards): one copy of each card's shared markup, no unused frame code, no wasted fx posters`.
  Use `perf(wall): a touch screen fetches two cards' pictures with the page, not fourteen`.
- Do NOT push, open a PR or deploy.

## Steps

### Step 0: Pre-flight and the "before" recordings

1. `pnpm install --frozen-lockfile`, then `pnpm build` (expect the guard's `all checks pass` line).
2. Start the serve in the background: `pnpm preview --port 4414 --host 127.0.0.1 > /tmp/014-preview.log 2>&1 &`
   and wait until `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4414/` prints `200`.
3. Record the desktop cold load (the grounds are paused first so only load paints make frames):

   ```sh
   export AGENT_BROWSER_SESSION=plan-014
   agent-browser open http://127.0.0.1:4414/about
   agent-browser set viewport 1440 900
   agent-browser eval "localStorage.setItem('ill-pause','1')"
   agent-browser open about:blank
   rm -f /tmp/014-stop
   node scripts/paint-capture.mjs "$(agent-browser get cdp-url)" /tmp/014-before-1440 /tmp/014-stop 15000 &
   sleep 2
   agent-browser open http://127.0.0.1:4414/
   sleep 8
   touch /tmp/014-stop; wait
   agent-browser eval "JSON.stringify({imgs: performance.getEntriesByType('resource').filter(e=>e.initiatorType==='img').length, lazy14: document.querySelectorAll('.wall > .pocket:nth-child(-n+14) img[loading=\"lazy\"]').length})"
   ```

   The capture prints `N frames over S s -> /tmp/014-before-1440`. Write down N and the `imgs` number.
4. Record the phone cold load the same way with a fresh session and the phone profile:

   ```sh
   agent-browser close
   export AGENT_BROWSER_SESSION=plan-014-phone
   agent-browser open http://127.0.0.1:4414/about
   agent-browser set device "iPhone 14"
   agent-browser eval "localStorage.setItem('ill-pause','1')"
   agent-browser open about:blank
   rm -f /tmp/014-stop
   node scripts/paint-capture.mjs "$(agent-browser get cdp-url)" /tmp/014-before-390 /tmp/014-stop 15000 &
   sleep 2
   agent-browser open http://127.0.0.1:4414/
   sleep 8
   touch /tmp/014-stop; wait
   agent-browser eval "JSON.stringify({coarse: matchMedia('(pointer: coarse)').matches, imgs: performance.getEntriesByType('resource').filter(e=>e.initiatorType==='img').length, kb: Math.round(performance.getEntriesByType('resource').filter(e=>e.initiatorType==='img').reduce((s,e)=>s+(e.encodedBodySize||0),0)/1024)})"
   agent-browser close
   ```

   Write down N, `coarse` (it must be `true`; if it is `false` the device profile did not apply: STOP), `imgs` and
   `kb`.
5. `pnpm exec astro preview stop`; confirm the port answers `000`.

**Verify**: you have two frame counts and two `imgs` numbers written down, and `coarse` was `true` for the phone. If
`agent-browser` is not installed or `paint-capture.mjs` prints `no frames`, STOP: this plan may not ship without its
recordings.

### Step 1: Print cards 3 to 14 lazy, and let a fine pointer take them back at once

In `src/pages/index.astro`:

1. Replace the comment and constant at lines 12-16 (from `// The wall's first screen` through
   `const FIRST_SCREEN = 14;`) with:

   ```ts
   // The wall's first screen on a desktop (two rows of up to seven, the widest the gallery sets) loads with the page
   // and its first poster first; the cards below wait until the page has loaded, then fetch at idle (the script under
   // the wall), so the first screen never shares the line with pictures nobody can see yet, and no lens, pack or dock
   // ever opens on a hole. A touch screen's first screen is one column, about a card and a half: only the first
   // TOUCH_FIRST cards load with the page there, and the rest stay lazy, so a phone fetches and decodes only the cards
   // it has scrolled to (docs/performance.md, Memory). Cards TOUCH_FIRST + 1 to FIRST_SCREEN print lazy and the script
   // right under the wall (EAGER) makes them eager again on a fine pointer while the page is still parsing.
   const FIRST_SCREEN = 14;
   const TOUCH_FIRST = 2;
   const EAGER = `if(!matchMedia("(pointer: coarse)").matches)document.querySelectorAll('.wall > .pocket:nth-child(-n+${FIRST_SCREEN}) img[loading="lazy"]').forEach(function(i){i.loading="eager"})`;
   ```

2. In the `const html = ...` line (line 22) change `i < FIRST_SCREEN ? c : lazy(c)` to `i < TOUCH_FIRST ? c : lazy(c)`.
   Change nothing else on that line.

3. Directly after the line `    <script is:inline set:html={FRAMED} />` (line 53) add one line:

   ```astro
       <script is:inline set:html={EAGER} />
   ```

   It must come after `FRAMED` (so it sees each card's final pictures) and before the hold script (so the pictures
   are on their way before the hold counts them).

**Verify**: `grep -c "TOUCH_FIRST" src/pages/index.astro` prints `3` or more, and
`grep -c "set:html={EAGER}" src/pages/index.astro` prints `1`.

### Step 2: Build and check the HTML

`pnpm build`, then:

```sh
node -e '
const h=require("fs").readFileSync("dist/index.html","utf8");
const a=h.indexOf("<ul class=\"wall\""), wall=h.slice(a, h.indexOf("</ul>", a));
const ps=wall.split("<li class=\"pocket\"").slice(1);
const lazy=ps.map((p)=>{const im=[...p.matchAll(/<img [^>]*>/g)].map((m)=>m[0]);return im.filter((x)=>/loading="lazy"/.test(x)).length+"/"+im.length});
console.log(ps.length, lazy.join(" "));
const ok=ps.length===26&&ps.every((p,i)=>{const im=[...p.matchAll(/<img [^>]*>/g)].map((m)=>m[0]);const n=im.filter((x)=>/loading="lazy"/.test(x)).length;return i<2?n===0:n===im.length});
console.log(ok?"LAZY MAP OK":"LAZY MAP WRONG");process.exit(ok?0:1)'
```

**Verify**: the build ends with the guard's `all checks pass` line; the script prints `LAZY MAP OK` (pockets 1 and 2
have `0/n`, pockets 3 to 26 have `n/n`); and
`grep -c 'nth-child(-n+14) img\[loading="lazy"\]' dist/index.html` prints `1`.

### Step 3: The "after" recordings

Serve the new build and repeat Step 0 items 3 and 4 with the folders `/tmp/014-after-1440` and `/tmp/014-after-390`,
then stop the serve and confirm the port answers `000`.

**Verify**, all of:

- desktop: the `eval` prints `lazy14` equal to `0` (the script made cards 3 to 14 eager), and `imgs` is within 3 of
  the "before" desktop number;
- desktop frames: the "after" frame count is not more than the "before" count plus 2. If it is, repeat both desktop
  recordings twice more; if "after" is higher in at least two of three pairs, STOP and report all six counts;
- phone: `imgs` and `kb` are lower than the "before" phone numbers (expect roughly a third of the pictures), and the
  frame count is not more than the "before" count plus 2 (same repeat rule).

### Step 4: Record it

1. `docs/performance.md`, the table under "What holds it", the row that starts `| The wall's first paint |`: in its
   third cell, change the opening sentence
   `The first 14 cards (two rows at the widest the gallery sets) load with the page, the first poster at high priority;`
   to
   `The first 14 cards (two rows at the widest the gallery sets) load with the page on a fine pointer, and the first two on a touch screen (one column), the first poster at high priority;`
   Leave the rest of the cell as it is.
2. Append an entry to `memory.md` in the style of its last entries: date, type `perf`, the changed file, why, the
   four frame counts and the phone's `imgs` and `kb` before and after, the paths of the four capture folders, and
   under Open: "numbers are from a local serve; check Speed Insights LCP on phones after it ships".

**Verify**: `grep -c "and the first two on a touch screen" docs/performance.md` prints `1`;
`git diff --stat -- memory.md` shows only insertions.

### Step 5: Commit

One commit, by explicit path: `src/pages/index.astro docs/performance.md memory.md`.

**Verify**: `git status --short` prints nothing; `git diff --stat origin/main..HEAD` lists exactly those three files.

## Test plan

No test suite exists. The checks are: the lazy map of the built wall (Step 2, exits 1 when wrong), the release guard
(every picture address still exists), and the before and after recordings on a desktop viewport and a phone profile
(Steps 0 and 3).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` ends with `verify-build: ... all checks pass`
- [ ] the Step 2 script prints `LAZY MAP OK` and exits 0
- [ ] `grep -c "set:html={EAGER}" src/pages/index.astro` prints `1`
- [ ] the report holds four frame counts (before and after, 1440 and phone) and the phone's `imgs` and `kb` before
      and after, with "after" lower on the phone
- [ ] `git diff --stat origin/main..HEAD` lists only `src/pages/index.astro`, `docs/performance.md`, `memory.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" does not match the excerpts (for example plan 013 or another change
  has rewritten the `const html = ...` line: then re-read it and apply only the `FIRST_SCREEN` to `TOUCH_FIRST`
  change; if that is not possible, stop).
- `agent-browser` or `scripts/paint-capture.mjs` cannot record, or the phone profile does not report a coarse pointer.
- The desktop "after" recordings show more paints than "before" under the repeat rule in Step 3.
- On the desktop, `lazy14` is not `0` after the change.
- The fix seems to need a change to `FRAMED`, to the hold script, or to anything under `public/`.

## Maintenance notes

- `TOUCH_FIRST = 2` is the narrowest first screen (one column). A tablet with a touch screen shows more than two
  cards at once; its other on-screen cards are lazy, so they load at first layout instead of from the HTML's own
  order. The hold still waits for them (1 s at most). If tablets show a late first paint in Speed Insights, raise it.
- A reviewer should compare the two desktop capture folders frame by frame: the wall must still appear whole in one
  paint.
- If `FRAMED` ever stops running before this script, cards 3 to 14 on a desktop would keep lazy pictures inside
  their framed prints until idle; keep the script directly after `FRAMED`.
- Deferred: a `<link rel="preload" as="image" media="(pointer: fine)">` per desktop first-screen picture would give
  a desktop back the preload scanner's head start; not needed unless the recordings show a later desktop paint.
