# Plan 029: A card page's Moves list shows each move as the battle plays it

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected
> result before moving to the next step. If anything in "STOP conditions" occurs, stop and report; do not improvise.
> When done, update the status row for this plan in `plans/README.md`, unless a reviewer dispatched you and told you
> they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c6245d9..HEAD -- src/lib/cards.ts "src/pages/cards/[id].astro" src/styles/site.css src/styles/machine.css public/battle/previews vendor/battle/vendor/engine.js public/ex/fighters.js docs/battle.md`
> If any of these changed since this plan was written, compare the "Current state" excerpts against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2 (direction; Kevin's goals 1 and 2)
- **Effort**: S to M
- **Risk**: MED (adds pictures and a video to a deliberately light page; phone video decoders; the Machine view's
  "switching moves nothing" rule)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Each card's moves are its product's real features, and the battle already has a short loop of every fielded move:
144 files in `public/battle/previews/` (72 loops and 72 posters taken at the moment of contact). Today only the
battle's tooltips use them. The card page, the page that explains a card and the place a shared link lands, prints
each move as words and a receipt. After this plan each move that the battle fields under the same name shows its
poster, and its loop plays when the visitor hovers, focuses or taps it. The page that explains the card then shows the
card doing something, and its Battle button sits in the same column.

## Current state

The site is Astro 7, static. Card pages are `src/pages/cards/[id].astro`; build-time card data is `src/lib/cards.ts`.

**The Moves list today** (`src/pages/cards/[id].astro:65-69`):

```astro
      <div class="sw hw"><h2>Moves</h2><Fragment set:html={hd('## Moves')} /></div>
      <ol class="cp-moves sl">
        {f.moves.map((mv) => <li><p set:html={M.moveText(mv)} /><code>{mv.receipt}</code></li>)}
        <li class="mx" set:html={BX + mdHtml(tw.moves.join('\n'))} />
      </ol>
```

The last `<li class="mx">` is the Machine view's form of the list. In Machine mode the other items keep their layout
but are hidden, and the machine form is laid over the whole list (`src/styles/machine.css:53-55`):

```css
:root[data-mode='machine'] .sl { position: relative; }
:root[data-mode='machine'] .sl > li:not(.mx) { visibility: hidden; }
:root[data-mode='machine'] .sl > li.mx { display: block; position: absolute; inset: 0; padding: 16px 14px; box-sizing: border-box; overflow: hidden; list-style: none; background: none; box-shadow: none; }
```

So a move tile must have the same size in both views. Anything you add inside a tile keeps its box in Machine mode.

**The list's styles** (`src/styles/site.css:79`, `:81`, `:84`):

```css
.cardpage .cp-facts, .cardpage .cp-moves { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.cardpage .cp-facts li, .cardpage .cp-moves li, .cardpage .cp-trait { padding: 14px 16px; border-radius: 16px; background: var(--clay); box-shadow: var(--raise-s); }
.cardpage .cp-moves p, .cardpage .cp-trait p { margin: 0; }
```

Focus rings come from the card room's sheet (`public/ex/ui.css:63`:
`:focus-visible { outline: 2px solid var(--ink-1); outline-offset: 2px; }`); a new button needs no rule of its own.

**How the battle names a preview** (`public/battle/shared/hud.js:347` and `:374`; synced from the design rounds'
`r4/play/shared/hud.js`, never edit it):

```js
  const PREVIEWS = new URL('../previews/', import.meta.url).href;
...
        <video class="tp-vid" muted loop playsinline preload="none" data-src="${PREVIEWS}${att.id}.${m.id}.webm" poster="${PREVIEWS}${att.id}.${m.id}.webp"></video>
```

So a preview is `/battle/previews/<card id>.<engine move id>.webm` with a poster of the same name ending `.webp`. The
files are 480 x 270; a poster is about 10 KB and a loop about 100 KB (for example
`public/battle/previews/katagami.weight-axis.webp` 9,082 bytes and `.webm` 113,974 bytes).

**Where the engine's move ids come from.** `src/lib/cards.ts:152-157` already imports the battle engine at build, and
keeps only the budget and the costs:

```ts
export const battleRoster = await (async () => {
  const file = path.join(ROOT, 'vendor/battle/vendor/engine.js');
  if (!fs.existsSync(file)) return null;
  const b = await import(/* @vite-ignore */ file) as { RULES: any; FIGHTERS: Fighter[] };
  return { budget: b.RULES.team.budget as number, cost: Object.fromEntries(b.FIGHTERS.map((f) => [f.id, f.cost])) as Record<string, number> };
})();
```

Each engine fighter has `moves`, and each engine move has `id` and `name` (checked: keys `id, name, feature,
discipline, power, accuracy, pp, hits, receipt, note`). A card's own moves (`public/ex/fighters.js`) have `name` but
no `id`.

**What resolves** (measured on 2026-11-09 by matching a card move's name, ignoring case, to an engine move of the
same card, then checking both files exist):

- The battle fields 18 of the 26 cards. Those 18 cards have 72 card moves. 60 resolve; both their files exist.
- 12 do not resolve, because the card has since renamed the move (the engine still says "Column Fire" where the
  Claude of Tanks card says "14 v 14", and 11 more like it on glyphfield, jarhead, local-search (2), agent-machines,
  prototemplate, bday-land, powerlifting, relay (2) and princeton-td). The preview loop prints the battle's old name
  in its call-out, so these 12 print **no preview**.
- The 8 cards the battle does not field (sandbox-arena, ariadne, sigil-ui, dedalus-terminal, sevenfold, podium, ommc,
  atlas) have no previews and print none.

So after this plan: 8 cards show 4 previews, 8 cards show 3, 2 cards (local-search, relay) show 2, and 8 cards show
none. 60 in all.

**The release guard** (`scripts/verify-build.mjs:126`) already fails the build on a broken `src`, `href` or `poster`
reference. It does not read `data-*` attributes, so the loop's address (kept in `data-clip`) needs its own build-time
check; Step 1 adds it.

**Rules that apply** (from `AGENTS.md`):

- `public/battle`, `public/ex` and `vendor/` are synced round material; never edit them by hand.
- Card pages set `<base href="/ex/">`, so every address this plan writes is absolute (`/battle/previews/...`).
- Nothing pops: every picture has its space before it arrives; a change that touches first paint is recorded with
  `scripts/paint-capture.mjs` before and after (`docs/performance.md`, "Checking it").
- A phone's tab stays under its memory budget: a clip's decoder is given back when it is not on screen.
- Motion respects the site's pause: `<html>` carries `data-paused` when the visitor paused motion or asks for reduced
  motion (`src/layouts/Base.astro:50`).
- In Machine mode a page "loads nothing a card would" (`docs/performance.md`, "The Machine view").
- Append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Build and release guard | `pnpm build` | ends `verify-build: 32 pages, 31 sitemap URLs, ... all checks pass` |
| Serve the build | `pnpm preview --port 4392 --host 127.0.0.1` (wait until `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4392/` prints `200`) | serves `dist/` |
| Stop the serve | `pnpm exec astro preview stop` | `Stopped preview server (pid N)` |
| Browser checks | `agent-browser open <url>`, `agent-browser eval "<js>"`, `agent-browser click "<css selector>"`, `agent-browser close`, with `export AGENT_BROWSER_SESSION=improve-029` | the title, the value, or a tick |

There is no test command, no lint and no CI in this repo. `pnpm check` is broken; do not use it.

## Suggested executor toolkit

- The `agent-browser` skill for the browser checks (`agent-browser --help` lists `click`, `eval`, `open`, and
  `set viewport <w> <h>`).

## Scope

**In scope** (the only files you should modify):
- `src/lib/cards.ts` (the roster's move ids and a new `previewOf`)
- `src/pages/cards/[id].astro` (the list's markup and one inline script)
- `src/styles/site.css` (the tile's layout)
- `src/styles/machine.css` (one rule)
- `docs/battle.md` (one sentence)
- `memory.md` (append one entry)
- `plans/README.md` (this plan's status row)

**Out of scope** (do NOT touch, even though they look related):
- `public/battle/**`, `vendor/battle/**`, `public/ex/**`: synced. No new preview is recorded here; the rounds'
  `r4/play/tools/previews.mjs` makes them.
- The 12 renamed moves. Pairing them by position would show 12 more previews, but each loop prints the battle's old
  name. They wait for the roster rebuild (plan 026).
- The Markdown twins (`src/lib/twins.ts`), JSON-LD and the Machine view's text: a preview is a picture, and the twin
  already carries each move's words.
- The home wall, `/cards`, the battle page.
- `scripts/verify-build.mjs` and `scripts/sync.mjs`.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/029-move-previews-on-card-pages` cut
  from `origin/main`:
  `git -C ~/repos/kevinliu-studio worktree add -b improve/029-move-previews-on-card-pages ~/repos/kevinliu-studio-029 origin/main`.
  Never edit the main checkout. Never `git stash`.
- One commit, by explicit path, as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "feat(cards): a card page shows each move's battle preview" -- src/lib/cards.ts "src/pages/cards/[id].astro" src/styles/site.css src/styles/machine.css docs/battle.md memory.md plans/README.md`
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Steps

### Step 1: Give `cards.ts` the engine's move ids and a `previewOf`

In `src/lib/cards.ts`:

1. In the `battleRoster` block (`:152-157`), widen the import's type and keep each fielded card's move ids by
   lower-cased name. Replace the `const b = ...` and `return ...` lines with:
   ```ts
   const b = await import(/* @vite-ignore */ file) as { RULES: any; FIGHTERS: (Fighter & { moves: (Move & { id: string })[] })[] };
   return {
     budget: b.RULES.team.budget as number,
     cost: Object.fromEntries(b.FIGHTERS.map((f) => [f.id, f.cost])) as Record<string, number>,
     // each fielded card's engine move ids by the move's name: the key of its scene, sound cue and preview files
     moves: Object.fromEntries(b.FIGHTERS.map((f) => [f.id, Object.fromEntries(f.moves.map((m) => [m.name.toLowerCase(), m.id]))])) as Record<string, Record<string, string>>,
   };
   ```
2. After the `teamFor` function, add:
   ```ts
   // A move's battle preview for the card page's Moves list: the loop r4/play recorded of it (480 x 270) and its poster
   // at the contact, /battle/previews/<card>.<engine move id>.webm and .webp (the battle's tooltips name them the same
   // way, shared/hud.js). Only where the battle fields a move of the same name on that card: a move the card has since
   // renamed prints none, because its loop still prints the old name. A preview the sync did not ship fails the build.
   export function previewOf(f: Fighter, mv: Move): { poster: string; clip: string } | null {
     const id = battleRoster?.moves[f.id]?.[mv.name.toLowerCase()];
     if (!id) return null;
     const stem = `/battle/previews/${f.id}.${id}`;
     for (const ext of ['webp', 'webm']) {
       if (!fs.existsSync(path.join(ROOT, 'public', `${stem}.${ext}`))) throw new Error(`card ${f.id}: move "${mv.name}" has no preview at public${stem}.${ext}`);
     }
     return { poster: `${stem}.webp`, clip: `${stem}.webm` };
   }
   ```

**Verify**: `pnpm build` ends with `all checks pass` (nothing uses the function yet, and the roster's other readers,
`teamFor` and `src/pages/index.astro`, read only `budget` and `cost`).

### Step 2: Print the preview in each move's tile

In `src/pages/cards/[id].astro`:

1. Add `previewOf` to the import from `'../../lib/cards'` on line 3.
2. Replace the line that maps `f.moves` (`:67`) with:
   ```astro
        {f.moves.map((mv) => {
          const pv = previewOf(f, mv);
          return <li class:list={[pv && 'pv']}>{pv && <button type="button" class="mv" aria-pressed="false" aria-label={`Play the battle preview of ${mv.name}`} data-clip={pv.clip}><img src={pv.poster} alt="" width="480" height="270" loading="lazy" decoding="async" draggable="false" /></button>}<p set:html={M.moveText(mv)} /><code>{mv.receipt}</code></li>;
        })}
   ```
   The poster is an `<img loading="lazy">` with its size, so it has its space before it arrives and is fetched only
   near the screen. The loop's address waits in `data-clip`; nothing fetches it until the visitor asks.
3. Directly after the closing `</ol>` of the Moves list, add the script that plays a loop:
   ```astro
      <script is:inline>/* a move's battle preview: its loop plays over its poster on a mouse's hover, a keyboard's focus or a tap, one at a time; it stops, and its source is dropped so the decoder is given back, when the pointer or the focus leaves, when it leaves the screen, and when the page hides. Under Pause or reduced motion only a press plays it */(function(){var list=document.querySelector('.cardpage .cp-moves');if(!list||!list.querySelector('.mv'))return;var live=null,fine=matchMedia('(hover: hover) and (pointer: fine)');function still(){return 'paused' in document.documentElement.dataset||matchMedia('(prefers-reduced-motion: reduce)').matches}function stop(){if(!live)return;var v=live.querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load();v.remove()}live.setAttribute('aria-pressed','false');live=null}function play(b){if(!b||live===b)return;stop();var v=document.createElement('video');v.muted=true;v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('aria-hidden','true');v.addEventListener('error',function(){if(live===b)stop()});v.src=b.dataset.clip;b.appendChild(v);b.setAttribute('aria-pressed','true');live=b;var p=v.play();if(p&&p.catch)p.catch(function(){if(live===b)stop()})}list.addEventListener('click',function(e){var b=e.target.closest('.mv');if(!b)return;if(live===b)stop();else play(b)});list.addEventListener('pointerover',function(e){if(e.pointerType!=='mouse'||!fine.matches||still())return;var li=e.target.closest('li.pv');if(li)play(li.querySelector('.mv'))});list.addEventListener('pointerout',function(e){var li=e.target.closest('li.pv');if(li&&live&&li.contains(live)&&!li.contains(e.relatedTarget))stop()});list.addEventListener('focusin',function(e){var b=e.target.closest('.mv');if(b&&!still()&&b.matches(':focus-visible'))play(b)});list.addEventListener('focusout',function(e){if(live&&e.target===live)stop()});if('IntersectionObserver' in self){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(!en.isIntersecting&&live===en.target)stop()})});list.querySelectorAll('.mv').forEach(function(b){io.observe(b)})}addEventListener('pagehide',stop);document.addEventListener('visibilitychange',function(){if(document.hidden)stop()})})()</script>
   ```

**Verify**: `pnpm build` ends with `all checks pass`, then:

```sh
for c in katagami claude-of-tanks local-search ommc; do printf "%s " $c; grep -o 'class="mv"' dist/cards/$c.html | wc -l; done
cat dist/cards/*.html | grep -o 'class="mv"' | wc -l
grep -o 'data-clip="[^"]*"' dist/cards/claude-of-tanks.html
```

prints `katagami 4`, `claude-of-tanks 3`, `local-search 2`, `ommc 0`; then `60`; then three addresses
(`/battle/previews/claude-of-tanks.sabot-round.webm`, `.killcam.webm`, `.one-spec.webm`) and no `column-fire`.

### Step 3: Lay the tile out and keep the Machine view still

1. In `src/styles/site.css`, directly after the line `.cardpage .cp-moves p, .cardpage .cp-trait p { margin: 0; }`,
   add:
   ```css
   /* a move's battle preview: its poster at the contact, the loop over it while it plays (cards/[id].astro) */
   .cardpage .cp-moves li.pv { display: grid; grid-template-columns: 176px minmax(0, 1fr); column-gap: 14px; align-items: start; }
   .cardpage .cp-moves li.pv > .mv { grid-row: 1 / span 2; }
   .cardpage .cp-moves .mv { position: relative; display: block; width: 100%; aspect-ratio: 16 / 9; margin: 0; padding: 0; border: 0; border-radius: 10px; overflow: hidden; background: color-mix(in oklab, var(--ink-1) 12%, var(--clay)); cursor: pointer; }
   .cardpage .cp-moves .mv :is(img, video) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
   @media (max-width: 559px) {
     .cardpage .cp-moves li.pv { grid-template-columns: minmax(0, 1fr); }
     .cardpage .cp-moves li.pv > .mv { grid-row: auto; margin-bottom: 10px; }
   }
   ```
   The button keeps its box by `aspect-ratio`, so the tile's height never depends on a picture arriving.
2. In `src/styles/machine.css`, directly after the line that starts
   `:root[data-mode='machine'] .sl > li.mx {`, add:
   ```css
   /* a move's preview keeps its box, so the list is the same height in both views, and fetches no poster here */
   :root[data-mode='machine'] .cardpage .cp-moves .mv img { display: none; }
   ```

**Verify**: `pnpm build` ends with `all checks pass`. Then serve and measure (the serve stays up for Step 4):

```sh
pnpm preview --port 4392 --host 127.0.0.1 &     # wait for 200
export AGENT_BROWSER_SESSION=improve-029
agent-browser open http://127.0.0.1:4392/cards/katagami
agent-browser eval "JSON.stringify([...document.querySelectorAll('.cp-moves .mv')].map(b=>{var r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]}))"
agent-browser eval "(function(){var l=document.querySelector('.cp-moves'),h=l.getBoundingClientRect().height;document.documentElement.dataset.mode='machine';var m=l.getBoundingClientRect().height;document.documentElement.dataset.mode='human';return h+' '+m})()"
```

The first prints four `[176,99]` pairs at the default width. The second prints the same number twice (the list's
height in Human and in Machine mode).

### Step 4: Check the behaviour in a browser

With the serve from Step 3 still up:

```sh
agent-browser open http://127.0.0.1:4392/cards/katagami
sleep 6
agent-browser eval "performance.getEntriesByType('resource').filter(e=>/previews\/.*\.webm/.test(e.name)).length"
agent-browser eval "new Promise(function(r){var s=0;new PerformanceObserver(function(l){l.getEntries().forEach(function(e){if(!e.hadRecentInput)s+=e.value})}).observe({type:'layout-shift',buffered:true});setTimeout(function(){r(s.toFixed(4))},1500)})"
agent-browser click ".cp-moves .mv"
sleep 3
agent-browser eval "JSON.stringify({videos:document.querySelectorAll('.cp-moves video').length,pressed:document.querySelector('.cp-moves .mv').getAttribute('aria-pressed'),webm:performance.getEntriesByType('resource').filter(e=>/previews\/.*\.webm/.test(e.name)).length})"
agent-browser click ".cp-moves .mv"
agent-browser eval "JSON.stringify({videos:document.querySelectorAll('.cp-moves video').length,pressed:document.querySelector('.cp-moves .mv').getAttribute('aria-pressed')})"
agent-browser open http://127.0.0.1:4392/cards/ommc
agent-browser eval "document.querySelectorAll('.cp-moves .mv').length + ' ' + document.querySelectorAll('.cp-moves > li:not(.mx)').length"
```

Repeat the first four commands after `agent-browser set viewport 390 844` on `/cards/katagami`. Then
`agent-browser close` and `pnpm exec astro preview stop`.

**Verify**:
- No loop is fetched at load: the first `eval` prints `0`.
- No layout shift: the second prints `"0.0000"` (0.01 or less is the site's bar; expect 0).
- After one press: `{"videos":1,"pressed":"true","webm":1}`.
- After the second press: `{"videos":0,"pressed":"false"}`.
- `/cards/ommc` prints `0 4` (no previews, four move tiles as before).
- At 390 wide the same results hold.
- `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4392/` prints `000` after the stop.

### Step 5: Record the first paint, before and after

`AGENTS.md` asks for a paint recording when a change touches first paint, and on a wide screen the Moves list can be
in the first screen. Follow `docs/performance.md`, "Checking it", item 4: serve `dist/` of `origin/main` and of your
branch in turn, drive `agent-browser` to `/cards/katagami` at 1440 x 900, and record each with
`node scripts/paint-capture.mjs "$(agent-browser get cdp-url)" <dir> <stop-file>` (the script's header explains the
arguments). Keep both folders outside the repo, under `~/k7-rescue/improve-audit/paint-029/before` and `/after`, and
name them in your report. You do not judge them; the reviewer does.

**Verify**: both folders exist and hold frames (`ls ~/k7-rescue/improve-audit/paint-029/after | wc -l` prints more
than `0`). If `paint-capture.mjs` cannot be run after two attempts, say so in your report and in `memory.md`; do not
skip silently.

### Step 6: Record it

1. In `docs/battle.md`, at the end of the "Round 5" paragraph, add one sentence:
   `A card page's Moves list shows the same previews, for each move the battle fields under the card's own name (\`previewOf\` in \`src/lib/cards.ts\`; 60 of the 72 moves on the 18 fielded cards on 2026-11-09).`
2. Append an entry to `memory.md` in the file's existing form: date, type "feature", asked by improve plan 029,
   changed files, what was checked with Step 4's numbers, and open threads (the 12 renamed moves and the 8 unfielded
   cards print no preview until plan 026's roster rebuild; the new `aria-label` text needs the i18n session).

**Verify**: `grep -c "previewOf" docs/battle.md` prints `1`; `git status --short` lists exactly the seven in-scope
files.

## Test plan

The repo has no test runner (plan 001 adds one; this plan does not depend on it). The checks are:

- The build itself: `previewOf` throws when a named preview file is missing, so a build that passes proves every
  printed poster and loop exists. Prove the assertion works once: temporarily rename
  `public/battle/previews/katagami.weight-axis.webm` in your worktree, run `pnpm build`, expect a failure naming
  `katagami` and `weight-axis`, then rename it back and confirm `git status --short public/` is empty.
- Counts in `dist` (Step 2): 60 previews in all; 4, 3, 2 and 0 on the four named cards; no `column-fire`.
- Browser (Steps 3 and 4): tile size, equal list height in both views, no loop fetched at load, layout shift 0, one
  video while playing and none after, at 1280 and 390.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` exits 0 and prints `all checks pass`.
- [ ] `cat dist/cards/*.html | grep -o 'class="mv"' | wc -l` prints `60`.
- [ ] `grep -c 'column-fire' dist/cards/claude-of-tanks.html` prints `0`.
- [ ] `grep -c 'class="mv"' dist/cards/ommc.html` prints `0`.
- [ ] `grep -rc "previews/" dist/index.html dist/cards.html dist/about.html` prints `0` for each (no other page
      names a preview).
- [ ] Step 4's results held at both widths: `0` loops at load, layout shift `0.0000`, `videos:1` then `videos:0`.
- [ ] The Moves list has the same height in Human and Machine mode (Step 3).
- [ ] The renamed-file test failed the build and the file is restored (`git status --short public/` is empty).
- [ ] `git status --short` lists only the seven in-scope files.
- [ ] No serve and no browser of yours is left running.
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" does not match the excerpts.
- The count of previews in `dist` is not 60 while `git diff --stat c6245d9..HEAD -- public/battle/previews vendor/battle/vendor/engine.js public/ex/fighters.js`
  is empty. (If those did change, a pin moved: recount with Step 2's commands, report the new numbers, and continue
  only if every fielded move with a same-named engine move resolves.)
- The Moves list's height differs between Human and Machine mode after Step 3.
- A layout shift above 0.01 appears on `/cards/katagami`, twice after a fix attempt.
- A `.webm` under `/battle/previews/` is requested before any press or hover.
- The change seems to need an edit under `public/battle/`, `vendor/` or `scripts/`.
- You find yourself pairing a renamed move with a preview by position.

## Maintenance notes

- When plan 026's roster rebuild lands (the engine takes the cards' move names and fields all 26), the name match
  resolves more moves, and `previewOf` then fails the build for any move whose loop `r4/play/tools/previews.mjs` has
  not recorded yet. That is the intended alarm: record the previews in the rounds, sync, build.
- The new `aria-label` ("Play the battle preview of <move>") is a new string. The session "Internationalize
  kevinliu.studio with GT" (`feat/i18n`) needs it; tell the main portfolio session when this lands.
- The loops are VP9 WebM. A browser that cannot play one shows the poster and the button returns to "not pressed"
  (the `error` handler). The battle's own tooltips have the same limit.
- Media under `/battle/` is cached for a day with a week of stale-while-revalidate (`vercel.json`); a re-recorded
  preview under the same name can show the old loop for up to a day.
- A reviewer should check three things: no `<video>` exists in the built HTML (the script creates it), the poster
  `<img>` carries `width`, `height` and `loading="lazy"`, and the paint recordings from Step 5 show no new pop in the
  first screen at 1440.
- Deferred on purpose: previews in the Markdown twin or JSON-LD (`VideoObject`), previews on the home lens's sheet,
  and showing the 12 renamed moves.
