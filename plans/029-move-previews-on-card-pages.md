# Plan 029: A card page's Moves list shows each move as the battle plays it

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected
> result before moving to the next step. If anything in "STOP conditions" occurs, stop and report; do not improvise.
> Do NOT edit `plans/README.md`: lane D's reviewer dispatched you and the audit session keeps the index. You do NOT
> commit and you do NOT edit `memory.md` in this plan: the reviewer commits after the browser checks (see "Git
> workflow").
>
> **Refreshed 2026-11-10 by lane D** against site commit `4025230` (branch `improve/direction`, worktree
> `~/repos/kevinliu-studio-dir`, with plans 026 and 028 stacked on it). What changed since the first writing (at
> `c6245d9`): the card page's markup is `src/views/Card.astro`, one view for eight languages; its words come from
> `src/i18n`; the new `aria-label` is therefore a new English string, which stops the build until a paid translation
> run that only Kevin may start. So this plan ends **BLOCKED on translation** by design: everything is built, checked
> with a scratch lock, and left for the reviewer to commit.
>
> **Drift check (run first)**, in `~/repos/kevinliu-studio-dir`:
> `git diff --stat 4025230..HEAD -- src/lib/cards.ts src/styles/site.css src/styles/machine.css public/battle/previews vendor/battle/vendor/engine.js public/ex/fighters.js docs/battle.md src/i18n gt-lock.json`
> must print nothing, and `git diff --stat 4025230..HEAD -- src/views/Card.astro` may print only plan 028's change
> (one import line and one `<script is:inline data-player=...>` line after the `FRAMED` script). Anything else: compare
> the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2 (direction; Kevin's goals 1 and 2)
- **Effort**: S to M
- **Risk**: MED (adds pictures and a video to a deliberately light page; phone video decoders; the Machine view's
  "switching moves nothing" rule; one new string for eight languages)
- **Depends on**: none (plan 028 edits the same view on other lines)
- **Category**: direction
- **Planned at**: commit `4025230`, 2026-11-10 (first written at `c6245d9`, 2026-11-09)

## Why this matters

Each card's moves are its product's real features, and the battle already has a short loop of every fielded move:
144 files in `public/battle/previews/` (72 loops and 72 posters taken at the moment of contact). Today only the
battle's tooltips use them. The card page, the page that explains a card and the place a shared link lands, prints
each move as words and a receipt. After this plan each move that the battle fields under the same name shows its
poster, and its loop plays when the visitor hovers or presses it. The page that explains the card then shows the
card doing something, and its Battle button sits in the same column. It holds in all eight languages.

## Current state

The site is Astro 7, static, in eight languages. A card page is `src/views/Card.astro` (used by
`src/pages/cards/[id].astro` and `src/pages/[lang]/cards/[id].astro`); build-time card data is `src/lib/cards.ts`.

**The Moves list today** (`src/views/Card.astro`, find it by text; near line 73):

```astro
      <div class="sw hw"><h2>{l.t('card.moves')}</h2><Fragment set:html={hd(`## ${l.t('card.moves')}`)} /></div>
      <ol class="cp-moves sl">
        {f.moves.map((mv, j) => <li><p set:html={moveHtml(f, j, code)} /><code>{mv.receipt}</code></li>)}
        <li class="mx" set:html={BX + mdHtml(tw.moves.join('\n'))} />
      </ol>
```

`l` is the page's language (`const l = L(code);`), and `l.t('card.moves')` reads `src/i18n/en/ui.json` (or its
translation). `moveHtml` prints the move's line with its name untranslated: move names never enter the translated
files, so a label that names a move takes it as a `{move}` placeholder.

The last `<li class="mx">` is the Machine view's form of the list. In Machine mode the other items keep their layout
but are hidden, and the machine form is laid over the whole list (`src/styles/machine.css:54-57`):

```css
/* a list (.sl) keeps its items laid out, hidden, and lays one framed panel of its twin lines over the whole list */
:root[data-mode='machine'] .sl { position: relative; }
:root[data-mode='machine'] .sl > li:not(.mx) { visibility: hidden; }
:root[data-mode='machine'] .sl > li.mx { display: block; position: absolute; inset: 0; padding: 16px 14px; box-sizing: border-box; overflow: hidden; list-style: none; background: none; box-shadow: none; }
```

So a move tile must have the same size in both views. Anything you add inside a tile keeps its box in Machine mode.

**The list's styles** (`src/styles/site.css:115`, `:117`, `:120`):

```css
.cardpage .cp-facts, .cardpage .cp-moves { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.cardpage .cp-facts li, .cardpage .cp-moves li, .cardpage .cp-trait { padding: 14px 16px; border-radius: 16px; background: var(--clay); box-shadow: var(--raise-s); }
.cardpage .cp-moves p, .cardpage .cp-trait p { margin: 0; }
```

Focus rings come from the card room's sheet (`public/ex/ui.css`:
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

`ROOT` is `process.cwd()` (`cards.ts:9`). Each engine fighter has `moves`, and each engine move has `id` and `name`.
A card's own moves (`public/ex/fighters.js`) have `name` but no `id`. `teamFor` follows at `cards.ts:185`.

**What resolves** (measured on 2026-11-09 by matching a card move's name, ignoring case, to an engine move of the
same card, then checking both files exist; the previews, the engine and `fighters.js` have not changed since):

- The battle fields 18 of the 26 cards. Those 18 cards have 72 card moves. 60 resolve; both their files exist.
- 12 do not resolve, because the card has since renamed the move (the engine still says "Column Fire" where the
  Claude of Tanks card says "14 v 14", and 11 more like it on glyphfield, jarhead, local-search (2), agent-machines,
  prototemplate, bday-land, powerlifting, relay (2) and princeton-td). The preview loop prints the battle's old name
  in its call-out, so these 12 print **no preview**.
- The 8 cards the battle does not field (sandbox-arena, ariadne, sigil-ui, dedalus-terminal, sevenfold, podium, ommc,
  atlas) have no previews and print none.

So after this plan: 8 cards show 4 previews, 8 cards show 3, 2 cards (local-search, relay) show 2, and 8 cards show
none. 60 in each language.

**The release guard** (`scripts/verify-build.mjs:154`) already fails the build on a broken `src`, `href` or `poster`
reference. It does not read `data-*` attributes other than `data-plainfx`, so the loop's address (kept in `data-clip`)
needs its own build-time check; Step 1 adds it, and Step 4 adds a test of it.

**The translation gate** (`src/i18n/index.ts`): the build compares the bytes of `src/i18n/en/ui.json` with the hash
`gt-lock.json` recorded when the file was last translated, and stops otherwise:

```ts
  if (entry?.versionId !== hash) throw new Error(`i18n: src/i18n/en/${name}.json changed after its translations were made (gt-lock.json); run pnpm i18n:translate, or restore the file`);
```

`pnpm i18n:translate` is paid and needs Kevin's key: never run it. A string a language lacks prints in English with
a build warning (`[i18n] es: ui.card.playPreview is not translated`); that is the i18n module's own rule.

**Rules that apply** (from `AGENTS.md`):

- `public/battle`, `public/ex` and `vendor/` are synced round material; never edit them by hand.
- Card pages set `<base href="/ex/">`, so every address this plan writes is absolute (`/battle/previews/...`).
- Nothing pops: every picture has its space before it arrives; the reviewer records the first paint before and after.
- A phone's tab stays under its memory budget: a clip's decoder is given back when it is not on screen.
- Motion respects the site's pause: `<html>` carries `data-paused` when the visitor paused motion or asks for reduced
  motion.
- In Machine mode a page "loads nothing a card would" (`docs/performance.md`, "The Machine view").

Other lanes edit nearby at the same time (lane B: the card pages' styles and `src/views/Card.astro` on other lines).
Change only the lines this plan names.

## Commands you will need

Run all of them in `~/repos/kevinliu-studio-dir`. Use `/usr/bin/grep`.

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Tests | `pnpm test` | `fail 0` (10 tests before this plan, 13 after) |
| Scratch lock for checking (never committed) | see Step 5 | `gt-lock.json` modified in the working tree only |
| Build and release guard, under the scratch lock | `pnpm build` | ends `verify-build: 256 pages, 248 sitemap URLs, <n> files: all checks pass`, with seven `[i18n] <code>: ui.card.playPreview is not translated` warnings (about 5 minutes on this Mac) |
| Restore the lock | `git checkout -- gt-lock.json` | `git status --short gt-lock.json` prints nothing |

You start no server and no browser. The lane's reviewer runs the browser checks and the paint recordings.

## Scope

**In scope** (the only files you should modify):
- `src/lib/cards.ts` (the roster's move ids and a new `previewOf`)
- `src/views/Card.astro` (the list's markup and one inline script)
- `src/i18n/en/ui.json` (one new key, `card.playPreview`)
- `src/styles/site.css` (the tile's layout)
- `src/styles/machine.css` (one rule)
- `scripts/previews.test.mjs` (create)
- `docs/battle.md` (one sentence)
- `~/k7-rescue/improve-audit/lane-d/029-memory.md` (create, outside the repo: the `memory.md` entry's text for the
  reviewer to append)
- `gt-lock.json`: modified only during Step 5 and restored there. It must not be modified when you finish.

**Out of scope** (do NOT touch, even though they look related):
- `public/battle/**`, `vendor/battle/**`, `public/ex/**`: synced. No new preview is recorded here; the rounds'
  `r4/play/tools/previews.mjs` makes them.
- The other languages' files (`src/i18n/<lang>/*.json`) and running any translation.
- The 12 renamed moves. Pairing them by position would show 12 more previews, but each loop prints the battle's old
  name. They wait for the roster rebuild (plan 026).
- The Markdown twins (`src/lib/twins.ts`), JSON-LD and the Machine view's text: a preview is a picture, and the twin
  already carries each move's words.
- The home wall, `/cards`, the battle page, `scripts/verify-build.mjs`, `scripts/sync.mjs`.
- `memory.md`, `plans/README.md`, and any `git commit`.

## Git workflow

- Work in the lane worktree that already exists: `~/repos/kevinliu-studio-dir`, branch `improve/direction`. Do not
  create a branch or a worktree. Never `git stash`.
- **Do not commit.** Leave your changes in the working tree. The reviewer runs the browser checks under a scratch
  lock, then commits by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "feat(cards): a card page shows each move's battle preview" -m "Improve plan 029. The new string card.playPreview stops the build until pnpm i18n:translate runs." -m "Co-Authored-By: Claude <noreply@anthropic.com>" -- src/lib/cards.ts src/views/Card.astro src/i18n/en/ui.json src/styles/site.css src/styles/machine.css scripts/previews.test.mjs docs/battle.md memory.md`
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Give `cards.ts` the engine's move ids and a `previewOf`

In `src/lib/cards.ts`:

1. In the `battleRoster` block, widen the import's type and keep each fielded card's move ids by lower-cased name.
   Replace the `const b = ...` and `return ...` lines with:
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

Keep the file free of TypeScript that Node cannot strip (no enums, no parameter properties): `scripts/i18n-extract.mjs`
and Step 4's test import it with plain `node`.

**Verify**: `node -e 'process.chdir(".");import("./src/lib/cards.ts").then((m)=>{const f=m.fighters.find((x)=>x.id==="katagami");console.log(JSON.stringify(f.moves.map((mv)=>m.previewOf(f,mv))));const g=m.fighters.find((x)=>x.id==="claude-of-tanks");console.log(g.moves.map((mv)=>m.previewOf(g,mv)?1:0).join(""));const o=m.fighters.find((x)=>x.id==="ommc");console.log(o.moves.map((mv)=>m.previewOf(o,mv)?1:0).join(""))})'`
prints four `{"poster":"/battle/previews/katagami.<id>.webp","clip":"/battle/previews/katagami.<id>.webm"}` objects,
then `1110`, then `0000`.

### Step 2: Add the string, and print the preview in each move's tile

1. In `src/i18n/en/ui.json`, in the `"card"` object, add one line directly after `"moves": "Moves",`:
   ```json
       "playPreview": "Play the battle preview of {move}",
   ```
   Change nothing else in the file (same indentation, two spaces deeper than `"card"`; the file must stay valid JSON
   and end with one newline as it does now).
2. In `src/views/Card.astro`, add `previewOf` to the import from `'../lib/cards'` (the line that imports `fighters,
   card, FRAMED, ...`).
3. Replace the line that maps `f.moves` with:
   ```astro
           {f.moves.map((mv, j) => {
             const pv = previewOf(f, mv);
             return <li class:list={[pv && 'pv']}>{pv && <button type="button" class="mv" aria-pressed="false" aria-label={l.t('card.playPreview', { move: mv.name })} data-clip={pv.clip}><img src={pv.poster} alt="" width="480" height="270" loading="lazy" decoding="async" draggable="false" /></button>}<p set:html={moveHtml(f, j, code)} /><code>{mv.receipt}</code></li>;
           })}
   ```
   The poster is an `<img loading="lazy">` with its size, so it has its space before it arrives and is fetched only
   near the screen. The loop's address waits in `data-clip`; nothing fetches it until the visitor asks.
4. Directly after the closing `</ol>` of the Moves list, add this script as one line, copied byte for byte (extract it
   from this file with a script rather than retyping it):
   ```astro
         <script is:inline>/* a move's battle preview: its loop plays over its poster while a mouse is over the move, and a press (mouse, key or tap) holds it playing until the next press, one at a time; it stops, and its source is dropped so the decoder is given back, when the pointer leaves one that is not held, when it leaves the screen, when the view switches, and when the page hides. Under Pause or reduced motion only a press plays it */(function(){var list=document.querySelector('.cardpage .cp-moves');if(!list||!list.querySelector('.mv'))return;var live=null,held=false,fine=matchMedia('(hover: hover) and (pointer: fine)');function still(){return 'paused' in document.documentElement.dataset||matchMedia('(prefers-reduced-motion: reduce)').matches}function stop(){if(!live)return;var v=live.querySelector('video');if(v){v.pause();v.removeAttribute('src');v.load();v.remove()}live.setAttribute('aria-pressed','false');live=null;held=false}function play(b){if(!b||live===b)return;stop();var v=document.createElement('video');v.muted=true;v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('aria-hidden','true');v.addEventListener('error',function(){if(live===b)stop()});v.src=b.dataset.clip;b.appendChild(v);live=b;var p=v.play();if(p&&p.catch)p.catch(function(){if(live===b)stop()})}list.addEventListener('click',function(e){var b=e.target.closest('.mv');if(!b)return;if(live===b&&held){stop();return}play(b);if(live===b){held=true;b.setAttribute('aria-pressed','true')}});list.addEventListener('pointerover',function(e){if(held||e.pointerType!=='mouse'||!fine.matches||still())return;var li=e.target.closest('li.pv');if(li)play(li.querySelector('.mv'))});list.addEventListener('pointerout',function(e){var li=e.target.closest('li.pv');if(li&&live&&!held&&li.contains(live)&&!li.contains(e.relatedTarget))stop()});if('IntersectionObserver' in self){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(!en.isIntersecting&&live===en.target)stop()})});list.querySelectorAll('.mv').forEach(function(b){io.observe(b)})}addEventListener('pagehide',stop);document.addEventListener('visibilitychange',function(){if(document.hidden)stop()});document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-mode-set],[data-mode-go]'))stop()})})()</script>
   ```

What the script does: a mouse over a move plays its loop and leaving stops it; a press holds it (and sets
`aria-pressed="true"`) until the next press; while one is held, hovering another does nothing; only one `<video>`
exists at a time, created on demand and removed (with its source dropped) when it stops; a keyboard's focus alone
plays nothing (Enter or Space presses the button).

**Verify** (static, no build yet): `node -e 'JSON.parse(require("fs").readFileSync("src/i18n/en/ui.json","utf8")).card.playPreview==="Play the battle preview of {move}"||process.exit(1)'`
exits 0, and `git diff --stat -- src/i18n/en/ui.json` shows `1 insertion(+)` and no deletion.

### Step 3: Lay the tile out and keep the Machine view still

1. In `src/styles/site.css`, directly after the line `.cardpage .cp-moves p, .cardpage .cp-trait p { margin: 0; }`,
   add:
   ```css
   /* a move's battle preview: its poster at the contact, the loop over it while it plays (views/Card.astro) */
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

### Step 4: Test the rule without a build

Create `scripts/previews.test.mjs` with exactly this content:

```js
// A card page's move previews (previewOf in src/lib/cards.ts): a preview only where the battle fields a move of the
// card's own name, never the move that merely sits at the same place in the list, and only files the sync shipped.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
process.chdir(ROOT);
const { fighters, battleRoster, previewOf } = await import('../src/lib/cards.ts');
const engine = await import('../vendor/battle/vendor/engine.js');

test('a move has a preview exactly when the battle fields a move of the same name on that card', () => {
  let shown = 0;
  for (const f of fighters) {
    const fielded = engine.FIGHTERS.find((e) => e.id === f.id);
    for (const mv of f.moves) {
      const same = fielded?.moves.find((m) => m.name.toLowerCase() === mv.name.toLowerCase());
      const pv = previewOf(f, mv);
      if (!same) { assert.equal(pv, null, `${f.id}: "${mv.name}" is not a battle move's name, so it prints no preview`); continue; }
      shown++;
      assert.deepEqual(pv, { poster: `/battle/previews/${f.id}.${same.id}.webp`, clip: `/battle/previews/${f.id}.${same.id}.webm` });
      for (const file of [pv.poster, pv.clip]) assert.ok(fs.existsSync(path.join(ROOT, 'public', file)), file);
    }
  }
  assert.ok(shown > 0, 'no card move resolved to a preview');
});

test('a move the card renamed never shows the loop of the battle move at the same place in the list', () => {
  for (const e of engine.FIGHTERS) {
    const f = fighters.find((x) => x.id === e.id);
    e.moves.forEach((m, i) => {
      if (f.moves.some((mv) => mv.name.toLowerCase() === m.name.toLowerCase())) return;
      assert.equal(previewOf(f, f.moves[i]), null, `${f.id}: "${f.moves[i].name}" must not show the loop of "${m.name}"`);
    });
  }
});

test('a preview the sync did not ship stops the build', () => {
  const f = fighters.find((x) => battleRoster.moves[x.id]);
  const name = Object.keys(battleRoster.moves[f.id])[0];
  const id = battleRoster.moves[f.id][name];
  battleRoster.moves[f.id][name] = `${id}-not-shipped`;
  try { assert.throws(() => previewOf(f, { name, receipt: '' }), /has no preview/); } finally { battleRoster.moves[f.id][name] = id; }
});
```

**Verify**: `pnpm test` ends with `pass 13` and `fail 0` (the 10 earlier tests and these three).

### Step 5: Build under a scratch lock, check the pages, restore the lock, and record the stop

The committed `gt-lock.json` must stop the build now (that is the gate working). To check everything else, point the
lock at the new English file in the working tree only, build, then restore it:

```sh
node -e 'const fs=require("fs"),c=require("crypto");const h=c.createHash("sha256").update(fs.readFileSync("src/i18n/en/ui.json")).digest("hex");const L=JSON.parse(fs.readFileSync("gt-lock.json","utf8"));const e=L.entries.find((e)=>Object.values(e.translations).some((x)=>x.fileName.endsWith("/ui.json")));e.versionId=h;fs.writeFileSync("gt-lock.json",JSON.stringify(L,null,2)+"\n")'
pnpm build > ~/k7-rescue/improve-audit/lane-d/029-build-scratch-lock.log 2>&1; echo "exit $?"
tail -2 ~/k7-rescue/improve-audit/lane-d/029-build-scratch-lock.log
/usr/bin/grep -c "ui.card.playPreview is not translated" ~/k7-rescue/improve-audit/lane-d/029-build-scratch-lock.log
```

**Verify** (the build's last line holds `all checks pass`; the warning count is `7`), then:

```sh
for c in katagami claude-of-tanks local-search ommc; do printf "%s " $c; /usr/bin/grep -o 'class="mv"' dist/cards/$c.html | wc -l; done
cat dist/cards/*.html | /usr/bin/grep -o 'class="mv"' | wc -l
cat dist/es/cards/*.html | /usr/bin/grep -o 'class="mv"' | wc -l
/usr/bin/grep -o 'data-clip="[^"]*"' dist/cards/claude-of-tanks.html
/usr/bin/grep -o 'aria-label="Play the battle preview of [^"]*"' dist/cards/katagami.html | head -2
/usr/bin/grep -o 'aria-label="Play the battle preview of [^"]*"' dist/ja/cards/katagami.html | wc -l
/usr/bin/grep -c "<video" dist/cards/katagami.html
/usr/bin/grep -c "previews/" dist/index.html dist/cards.html dist/about.html
```

These print `katagami 4`, `claude-of-tanks 3`, `local-search 2`, `ommc 0`; then `60`; then `60`; then three addresses
(`/battle/previews/claude-of-tanks.sabot-round.webm`, `.killcam.webm`, `.one-spec.webm`) and no `column-fire`; then two
labels naming Katagami's moves; then `4` (the Japanese page prints the English label until the translation run); then
`0` (no `<video>` in the built HTML; the script creates it); then `0` for each of the three other pages.

Then restore the lock and record the stop:

```sh
git checkout -- gt-lock.json
git status --short gt-lock.json          # prints nothing
pnpm build > ~/k7-rescue/improve-audit/lane-d/029-build-real-lock.log 2>&1; echo "exit $?"
/usr/bin/grep -m1 "i18n: src/i18n/en/ui.json changed" ~/k7-rescue/improve-audit/lane-d/029-build-real-lock.log
```

**Verify**: the last build exits non-zero and the grep prints the `i18n: src/i18n/en/ui.json changed after its
translations were made` line. That line is this plan's BLOCKED evidence. (The failed build may leave `dist/` partly
written; the reviewer rebuilds under the scratch lock for the browser checks.)

### Step 6: Record it

1. In `docs/battle.md`, at the end of the "Round 5" paragraph (after the sentence that ends
   "(`vendor/battle/vendor/engine.js`)."), add one sentence:
   `A card page's Moves list shows the same previews, for each move the battle fields under the card's own name (\`previewOf\` in \`src/lib/cards.ts\`; 60 of the 72 moves on the 18 fielded cards on 2026-11-10).`
2. Write the `memory.md` entry's text (not into `memory.md`) to `~/k7-rescue/improve-audit/lane-d/029-memory.md`, in
   the form of the file's last entries: date 2026-11-10, type "feature", asked by improve plan 029, changed files,
   what you checked with Step 5's numbers, and open threads: BLOCKED on translation (`src/i18n/en/ui.json` gained
   `card.playPreview`, "Play the battle preview of {move}"; the build stops until `pnpm i18n:translate` runs); the 12
   renamed moves and the 8 unfielded cards print no preview until plan 026's roster rebuild; the reviewer's browser
   checks and paint recordings.

**Verify**: `/usr/bin/grep -c "previewOf" docs/battle.md` prints `1`; `git status --short` lists exactly:
` M docs/battle.md`, ` M src/i18n/en/ui.json`, ` M src/lib/cards.ts`, ` M src/styles/machine.css`,
` M src/styles/site.css`, ` M src/views/Card.astro`, `?? scripts/previews.test.mjs` (and nothing for `gt-lock.json`,
`memory.md`, `public/` or `vendor/`).

## Reviewer's browser checks (lane D's reviewer runs these; the executor does not)

Under the scratch lock, with `dist/` served on port 4441 and Playwright Chromium:

- `/cards/katagami` at 1280: four `.mv` buttons of 176 by 99; the Moves list has the same height in Human and Machine
  mode; no `.webm` under `/battle/previews/` is requested at load; layout shift 0.
- A real mouse over a move plays its loop (one `<video>`), leaving stops it (none); a press holds it
  (`aria-pressed="true"`), a second press stops it; one `.webm` request per played move.
- In Machine mode no poster and no loop is requested.
- With reduced motion, hover plays nothing and a press does.
- iPhone 14 descriptor (coarse pointer): a tap plays, a second tap stops; the tile stacks; scrolling the playing one
  off screen removes its `<video>`.
- `/cards/ommc`: no `.mv`, four move tiles as before. `/es/cards/katagami`: the same four previews.
- Paint recordings of `/cards/katagami` at 1440 x 900 and 390 x 844 against the recordings taken after plan 028: no
  new pop in the first screen.

## Test plan

- `pnpm test`: `scripts/previews.test.mjs` proves, without a build, that a preview exists exactly where the battle
  fields a move of the card's own name, that a renamed move is never paired by position, that every named file is on
  disk, and that a missing file throws (which stops a build).
- Counts in `dist` under the scratch lock (Step 5): 60 previews in English and in Spanish; 4, 3, 2 and 0 on the four
  named cards; no `column-fire`; no `<video>` in the HTML.
- Browser: the reviewer's list above.

## Done criteria

Machine-checkable. ALL must hold for the plan to be handed to the reviewer (it then stays BLOCKED on translation):

- [ ] `pnpm test` prints `pass 13`, `fail 0`.
- [ ] Under the scratch lock `pnpm build` printed `all checks pass` with exactly seven `ui.card.playPreview is not
      translated` warnings, and Step 5's counts held (60, 60, 4, 3, 2, 0; no `column-fire`; no `<video>`).
- [ ] With the lock restored, `pnpm build` stops with the `i18n: src/i18n/en/ui.json changed` line, and
      `git status --short gt-lock.json` prints nothing.
- [ ] `git status --short` lists only the six modified files and the new test named in Step 6; nothing is committed
      (`git log -1 --format=%s` still shows plan 028's commit or a `docs(memory)` commit).
- [ ] `~/k7-rescue/improve-audit/lane-d/029-memory.md` exists and names the blocked string.

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" does not match the excerpts.
- The count of previews in `dist` is not 60 in English.
- Under the scratch lock the build fails for any reason other than this plan's own code (report the error).
- The build passes with the lock restored (the gate did not stop it: report, do not commit anything).
- The change seems to need an edit under `public/battle/`, `vendor/` or `scripts/` (other than the new test), or a
  second new string.
- You find yourself pairing a renamed move with a preview by position.
- Anything asks for a translation run or a key.

## Strings for the translation run (for the lane's report)

| Key | English | What it is for |
| --- | --- | --- |
| `card.playPreview` | `Play the battle preview of {move}` | The accessible name (`aria-label`) of a button in the Moves list of a card's page (`/cards/<id>` and its seven language twins). Pressing it plays a short, silent video loop of that move as the card battle shows it. `{move}` is the move's name, which stays as written (for example "Weight Axis"). "Play" means play a video, not play a game; "battle" is the site's card battle, the same word as `frame.battle` and `card.battle`. It is read by screen readers only; nothing on screen prints it. |

## Maintenance notes

- When plan 026's roster rebuild lands (the engine takes the cards' move names and fields all 26), the name match
  resolves more moves, and `previewOf` then fails the build for any move whose loop `r4/play/tools/previews.mjs` has
  not recorded yet. That is the intended alarm: record the previews in the rounds, sync, build.
- The loops are VP9 WebM. A browser that cannot play one shows the poster and the button returns to "not pressed"
  (the `error` handler). The battle's own tooltips have the same limit.
- Media under `/battle/` is cached for a day with a week of stale-while-revalidate (`vercel.json`); a re-recorded
  preview under the same name can show the old loop for up to a day.
- Shared files with other lanes: `src/views/Card.astro` (lane B's 013 and 015, other lines; plan 028, the line after
  `FRAMED`), `src/styles/site.css` and `src/styles/machine.css` (lane B, other rules).
- A reviewer should check three things: no `<video>` exists in the built HTML (the script creates it), the poster
  `<img>` carries `width`, `height` and `loading="lazy"`, and the paint recordings show no new pop in the first screen
  at 1440.
- Deferred on purpose: previews in the Markdown twin or JSON-LD (`VideoObject`), previews on the home lens's sheet,
  and showing the 12 renamed moves.
