# Plan 028: A card page plays its card's own sound when the visitor presses the card

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected
> result before moving to the next step. If anything in "STOP conditions" occurs, stop and report; do not improvise.
> Do NOT edit `plans/README.md`: lane D's reviewer dispatched you and the audit session keeps the index.
>
> **Refreshed 2026-11-10 by lane D** against site commit `4025230` (branch `improve/direction`, worktree
> `~/repos/kevinliu-studio-dir`). The first writing (at `c6245d9`) is out of date in three ways, all folded in below:
> the card page's markup moved to `src/views/Card.astro` (one view for eight languages), the header reads its strings
> from `src/i18n` and tests the path with the language taken off, and plan 005 is in (the player's `unlock()` does
> nothing without a gesture).
>
> **Drift check (run first)**, in `~/repos/kevinliu-studio-dir`:
> `git diff --stat 4025230..HEAD -- src/components/Header.astro src/views/Card.astro src/styles/site.css src/lib/assets.ts public/sound/sound.js public/sound/manifest.gallery.json docs/sound.md`
> It must print nothing. If it prints a file, compare the "Current state" excerpts against the live code before
> proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2 (direction; Kevin's goals 3 and 1)
- **Effort**: M
- **Risk**: MED (a new script on the site's lightest pages; must fetch nothing before a gesture and move nothing)
- **Depends on**: none (plan 005 is already in the base)
- **Category**: direction
- **Planned at**: commit `4025230`, 2026-11-10 (first written at `c6245d9`, 2026-11-09)

## Why this matters

Kevin's third goal is ElevenLabs sound, and the sound kit's own brief says "each card sounds like its own product".
Every one of the 26 cards has its own signature sound, but it plays only when a card is lifted on the home wall.
`/cards/<id>` is where a shared link lands (the home lens writes that address), and there the card is a silent, still
print: the page loads no sound code and its header shows an empty space where the wall has its sound key. After this
plan a visitor who presses the card on its own page hears the card lift and that card's signature, the header's sound
key works there, and the page still fetches nothing under `/sound/` until the visitor's first gesture. It holds in all
eight languages, because they share one view.

## Current state

The site is Astro 7, static, in eight languages. A card page is `src/views/Card.astro`, used by
`src/pages/cards/[id].astro` (English) and `src/pages/[lang]/cards/[id].astro` (the other seven), inside
`src/layouts/Base.astro`. The built pages are `dist/cards/<id>.html` and `dist/<lang>/cards/<id>.html`.

**The header renders the sound key only on the home page** (`src/components/Header.astro:9-11`, `:33-36`; the SVG
paths are cut here):

```astro
const l = of(path);
const { path: base } = split(path);
const home = base === '/';
...
  {home && <button type="button" class="press icon" id="sound" aria-pressed="false" aria-label={l.t('frame.sound')}><span class="swapi"><svg class="i off" ...>...</svg><svg class="i on" ...>...</svg></span><span class="mx" aria-hidden="true">snd</span></button>}
  {home && <button type="button" class="press icon" id="pause" aria-pressed="false" aria-label={l.t('frame.pause')}>...</button>}
  {/* the wall's sound and pause keys keep their room on every other page, so the links and the view switch never move between pages */}
  {!home && <span class="press icon spacer" aria-hidden="true"></span><span class="press icon spacer" aria-hidden="true"></span>}
```

`base` is the page's path with its language taken off (`/es/cards/katagami` gives `/cards/katagami`). The key's label
is `frame.sound` ("Sound"), which every language already has, so this plan adds no string.

The two spacers hold the keys' room (`src/styles/site.css:32`:
`header.top .spacer { visibility: hidden; pointer-events: none; }`), so a real key in the first spacer's place moves
nothing. Measured on the base build at 1280 wide on `/cards/katagami`: the two spacers sit at x 1104 and 1160, y 12,
40 by 40; at 390 wide, at x 266.7 and 312.7, y 8.

**The header's inline script already sets the key's state before paint, wherever a `#sound` exists**
(`src/components/Header.astro:38`, the part that matters):

```js
var s=document.getElementById('sound'),p=document.getElementById('pause');if(s){var on=false;try{var k=localStorage.getItem('kevin-liu-studio:sound');on=k==='on'||k===null&&!matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}s.setAttribute('aria-pressed',String(on));d.dataset.sound=on?'on':'off'}
```

So `aria-pressed="true"` on `#sound` means "sound is wanted": the saved choice, or the default (on, unless the visitor
asks for reduced motion).

**The card page prints the card with no script of its own** (`src/views/Card.astro:46-50`):

```astro
  html={{ 'data-card': f.id }}
>
  <main class="cardpage" id="main" style={`--hue-e:${hue.energy ?? '#c9c2b8'};--hue-d:${hue.deep ?? '#3a332c'}`}>
    <div class="stand"><Fragment set:html={roomIn(card(f, { id: `c-${f.id}`, focusable: false }), code)} /><Fragment set:html={recordHtml(f.title, cardRecord(f, { full: true, code }), { label: cardLabel(f), art, cols: 48, color: hue.energy })} /></div>
    <script is:inline set:html={FRAMED} />
```

`html={{ 'data-card': f.id }}` puts the card's id on `<html>`, so a script reads it as
`document.documentElement.dataset.card`. In the Machine view the stand's card is `display: none`
(`src/styles/machine.css:193`), so it cannot be pressed there.

**How the home page starts the player** (`public/sound/boot.gallery.js`, synced from the design rounds'
`r4/sound/boot.gallery.js`; never edit it):

```js
import Sound from './sound.js';

globalThis.Sound = Sound;
Sound.init({ manifest: new URL('manifest.gallery.json', import.meta.url).href, page: 'gallery', groups: ['gallery'], first: {...} });
Sound.bindToggle(document.getElementById('sound'));
```

**The player's contract** (`public/sound/sound.js`, synced from `r4/sound/sound.js`; never edit it):

- `init` (`:1219`, its comment above it): "Bind the first gesture and read the preference. Creates no context and
  fetches nothing ... Options: manifest (a URL ...), ... page ('gallery' or 'battle' ...), groups (loaded after the
  first gesture)". It returns a promise that resolves to the player.
- `unlock(e)` (`:273-279`): a trusted event marks the gesture and starts the audio context when sound is enabled:
  ```js
  function unlock(e) {
    if (e && e.isTrusted === false) return;
    if (!e && !S.gestured && !(S.ctx && S.ctx.state === 'running')) return; // kevinliu.studio: no gesture, no fetch (scripts/sync.mjs)
    S.gestured = true;
    // only a real gesture brings a frozen context back (a call from play() on a page with no gesture yet does not)
    if (e) S.resumeAskedAt = performance.now();
    if (!S.enabled || !S.opts.ready) return;
  ```
- `play('lift', { card: id })` resolves to `sig.<id>.lift` (`:12` and `:338`).
- `setEnabled(on)` saves the choice under `localStorage['kevin-liu-studio:sound']` and tells listeners (`:1176-1197`);
  `on('change', fn)` calls `fn(on)` with a boolean (`:1277`); the getter `enabled` is the current choice.
- `bindToggle(button)` (`:1198-1205`) turns sound on with `feedback: true`, which also loads the whole `gallery`
  group (73 files, 193 KB), and sets the button's label to the English word. A card page must not use `bindToggle`; it
  wires the key itself (Step 2).
- The player exports `default` (the `Sound` object) (`:1290`). `Sound.stats().files` counts the sound files it has
  fetched; the home page puts the player on `globalThis.Sound`, and the card page does the same once it has loaded it,
  so the same check works on both.

**The cues exist for all 26 cards** (checked with node on `public/sound/manifest.gallery.json` at `4025230`):
`card.lift` (group `gallery`, files `gallery/card.lift-1`, `gallery/card.lift-2`), `ui.sound.on`, and `sig.<id>.lift`
for every card id, each in its own group `sig:<id>` (one file of 7 to 8 KB, for example
`cards-1/sig.katagami.entrance-1`).

**Addresses by content** (`src/lib/assets.ts`): `versioned('/sound/sound.js')` returns `/sound/sound.js?v=<hash>`,
which `vercel.json` serves as immutable. `src/views/Home.astro:9` and `:59` show the pattern:
`<script is:inline type="module" src={versioned('/sound/boot.gallery.js')}></script>`.

**The sound policy this must keep** (`docs/sound.md:9-11`, `:16-17`):

```
- Sound answers the visitor's own actions: a press, a hover, a tilt, a flip, adding or removing a card, tearing a pack,
  and the battle they start.
- Nothing but the player and its manifest is fetched before the first gesture. The player unlocks audio on that gesture.
...
- Under `prefers-reduced-motion` sound defaults to off. A saved choice (`localStorage['kevin-liu-studio:sound']`)
  always wins and syncs across tabs. The header's speaker button toggles it.
```

This plan is stricter than the policy on card pages: not even the player or its manifest is fetched before the first
gesture, because a card page is the site's lightest page.

Repo rules that apply: pages that print cards set `<base href="/ex/">`, so every address this plan writes is absolute
(`/sound/...`). `public/sound` is synced material and is never edited by hand. Nothing pops: the header must not move.
A new or changed string in `src/i18n/en/ui.json` stops the build until a paid translation run; this plan needs none.
Append an entry to `memory.md` after the change.

Other lanes are editing nearby at the same time (lane B: `src/views/Card.astro`, `src/layouts/Base.astro` and the
card pages' styles; lane A: `src/components/Header.astro` for plan 020). Change only the lines this plan names, so
the merges stay small.

## Commands you will need

Run all of them in `~/repos/kevinliu-studio-dir`. Use `/usr/bin/grep` (the shell's `grep` is another tool on this
Mac).

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Build and release guard | `pnpm build` | ends `verify-build: 256 pages, 248 sitemap URLs, 3565 files: all checks pass` (about 5 minutes on this Mac) |
| Tests | `pnpm test` | `pass 10`, `fail 0` |

You start no server and no browser. The lane's reviewer runs the browser checks (listed under "Reviewer's browser
checks") after your commit; the "before" measurements are already recorded
(`~/k7-rescue/improve-audit/lane-d/hdr-before.json`, `~/k7-rescue/improve-audit/lane-d/paint/base-1440` and
`base-390`).

## Scope

**In scope** (the only files you should modify):
- `src/components/Header.astro`
- `src/views/Card.astro`
- `docs/sound.md` (one paragraph under "Where it is wired")
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- `public/sound/**`, `public/ex/**` and every other synced folder: round material, changed only through
  `scripts/sync.mjs`. This plan needs no sync.
- `src/views/Home.astro` and the home page's sound: unchanged.
- `src/i18n/**` and `gt-lock.json`: no string is added or changed.
- The wall's tilt, live ground or lens on the card page (`ground.js`, `gallery.js`, `rituals.js`): they cost a WebGL
  context and phone memory. Sound only.
- A press animation on the card. If it seems needed, note it in your report; do not add it.
- `/about`, `/cards` and the 404 page: no sound key there (their two spacers stay).
- `plans/README.md`, and everything in `~/repos/kevinliu-studio-improve`.

## Git workflow

- Work in the lane worktree that already exists: `~/repos/kevinliu-studio-dir`, branch `improve/direction`. Do not
  create a branch or a worktree. Never edit `~/repos/kevinliu-studio` or another worktree. Never `git stash`.
- One commit, by explicit path, as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "feat(sound): a card page plays its card's sound on the visitor's press" -m "Improve plan 028." -m "Co-Authored-By: Claude <noreply@anthropic.com>" -- src/components/Header.astro src/views/Card.astro docs/sound.md memory.md`
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Show the sound key on card pages

In `src/components/Header.astro`:

1. After the line `const home = base === '/';` add:
   ```ts
   // a card page has the sound key too: pressing its card plays the card's own sound (src/views/Card.astro)
   const card = /^\/cards\/[\w-]+$/.test(base);
   ```
2. Change the sound button's condition from `{home && <button type="button" class="press icon" id="sound"` to
   `{(home || card) && <button type="button" class="press icon" id="sound"`. Change nothing else in that line.
3. Replace the spacer line (the one that starts `{!home && <span class="press icon spacer"`) with two lines, so a
   card page keeps one spacer (the pause key's room) and the other pages keep two:
   ```astro
   {card && <span class="press icon spacer" aria-hidden="true"></span>}
   {!home && !card && <span class="press icon spacer" aria-hidden="true"></span><span class="press icon spacer" aria-hidden="true"></span>}
   ```
4. Leave both inline scripts as they are: the second already sets `#sound`'s state when the key exists.

**Verify**: `pnpm build` ends with `all checks pass`, then (each command on its own line):

```sh
for f in dist/cards/katagami.html dist/es/cards/katagami.html dist/ja/cards/ommc.html; do printf '%s ' $f; /usr/bin/grep -o 'id="sound"' $f | wc -l; /usr/bin/grep -o 'class="press icon spacer"' $f | wc -l; done
for f in dist/about.html dist/cards.html dist/404.html dist/es/about.html; do printf '%s ' $f; /usr/bin/grep -o 'id="sound"' $f | wc -l; /usr/bin/grep -o 'class="press icon spacer"' $f | wc -l; done
/usr/bin/grep -o 'id="sound"' dist/index.html | wc -l
```

The first loop prints `1` then `1` for each card page; the second prints `0` then `2` for each; the last prints `1`.
(If you build once after Step 2 instead of here, run these checks then; one build is enough.)

### Step 2: Wire the press and the key on the card page

In `src/views/Card.astro`:

1. Add to the imports at the top, after the line that imports `SITE`: `import { versioned } from '../lib/assets';`
2. Directly after the line `<script is:inline set:html={FRAMED} />`, add this script, with the same indentation, as
   one line. Copy it byte for byte (extract it from this file with a script rather than retyping it). It is plain
   ES5-style code, like the site's other inline scripts, and it fetches nothing until a trusted gesture:

```astro
    <script is:inline data-player={versioned('/sound/sound.js')}>/* the card's own sound, on the visitor's press (docs/sound.md): the player, its manifest and this card's cues are fetched at the first press of the card while sound is wanted, or when the header's key turns sound on, never before; in the Machine view the card is not shown, so only the key works */(function(){var d=document.documentElement,id=d.dataset.card,key=document.getElementById('sound'),card=document.querySelector('.cardpage .stand .card'),src=document.currentScript.dataset.player,K='kevin-liu-studio:sound',S=null,loading=null;if(!key||!card||!id)return;function pref(){try{var k=localStorage.getItem(K);return k==='on'||k===null&&!matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}function show(on){key.setAttribute('aria-pressed',String(on));d.dataset.sound=on?'on':'off'}function boot(ev){if(!loading)loading=import(src).then(function(m){return m.default.init({manifest:new URL('/sound/manifest.gallery.json',location.origin).href,page:'gallery',groups:['sig:'+id]})}).then(function(p){S=self.Sound=p;show(S.enabled);S.on('change',show);S.unlock(ev);return S}).catch(function(){loading=null;return null});return loading}function lift(){S.play('card.lift',{waitMs:900});S.play('lift',{card:id,waitMs:900})}card.addEventListener('pointerdown',function(e){if(e.button)return;if(S)lift();else if(pref())boot(e).then(function(s){if(s)lift()})});key.addEventListener('click',function(e){var on=!(S?S.enabled:pref());if(S)S.setEnabled(on);else{show(on);try{localStorage.setItem(K,on?'on':'off')}catch(x){}}if(on)boot(e).then(function(s){if(s)s.play('ui.sound.on',{force:true,waitMs:900})})});function fresh(){if(!S)show(pref())}addEventListener('storage',function(e){if(e.key===K)fresh()});addEventListener('pageshow',function(e){if(e.persisted)fresh()})})()</script>
```

What it does, so you can check it against the player's contract in "Current state":
- Nothing runs at load except attaching four listeners. No `import(`, `fetch(` or audio call runs outside a handler
  for a trusted `pointerdown` or `click`.
- `pref()` is the visitor's choice read fresh: the saved value, or on unless they ask for reduced motion (the same
  rule as the header's script and the player's own `preference()`).
- A press on the stand's card (`pointerdown`, main button or touch) while sound is wanted and the player is not there
  yet: import the player by its content address, `init` it with the gallery manifest and this card's `sig:<id>` group,
  put it on `self.Sound` (as the home page does), pass the same trusted event to `unlock`, then play `card.lift` and
  `sig.<id>.lift`. On a cold load that first press may be silent if the files take longer than the player's wait (or,
  in Safari, because the audio context starts only inside a gesture); the player has bound the next gesture, so every
  later press sounds. That is accepted.
- A press when sound is off does nothing and fetches nothing.
- The key: before the player is there, it flips its own state and saves the choice under the site's key; turning
  sound on boots the player (the click is the gesture) and plays the confirmation `ui.sound.on`. Once the player is
  there, the key calls `setEnabled`, and the player's `change` event keeps the key's state (also across tabs).
- Before the player is there, a change of the saved choice in another tab (`storage`) or a return from the
  back-forward cache (`pageshow`) re-reads the choice into the key.
- If the import or the manifest fails, the page stays silent and the next gesture tries again.

**Verify**: `pnpm build` ends with `all checks pass`, and `pnpm test` passes. Then:

```sh
/usr/bin/grep -c 'data-player="/sound/sound.js?v=' dist/cards/katagami.html dist/es/cards/katagami.html dist/ko/cards/atlas.html
/usr/bin/grep -c 'sound.js' dist/about.html dist/cards.html dist/404.html
/usr/bin/grep -c 'boot.gallery.js' dist/cards/katagami.html
node -e 'const h=require("fs").readFileSync("dist/cards/katagami.html","utf8");const m=h.match(/<script data-player="[^"]+">([\s\S]*?)<\/script>/);if(!m)throw new Error("no card sound script");new Function(m[1]);const body=m[1].replace(/^\/\*[\s\S]*?\*\//,"");const top=body.replace(/function\s*\([^)]*\)\s*\{/g,"{");console.log("parses;",m[1].length,"bytes; import( count",(m[1].match(/import\(/g)||[]).length,"; fetch( count",(m[1].match(/fetch\(/g)||[]).length)'
/usr/bin/grep -o '<link[^>]*sound[^>]*>' dist/cards/katagami.html | wc -l
```

The first prints `1` for each of the three pages; the second prints `0` for each; the third prints `0`; the node line
prints `parses;` with `import( count 1 ; fetch( count 0`; the last prints `0` (no preload or prefetch link names a
sound file).

### Step 3: Record it

1. In `docs/sound.md`, under "## Where it is wired", add after the "Home:" paragraph (before the "Battle:" one):
   ```
   - A card page (`/cards/<id>`, in every language): the header's speaker key is there too, and a press on the card
     plays `card.lift` and that card's `sig.<id>.lift`. Nothing under `/sound/` is fetched before the visitor's first
     press of the card (or of the key, turning sound on): the page's inline script (`src/views/Card.astro`) then
     imports the player by its content address with `manifest.gallery.json` and the card's own `sig:<id>` group, and
     sets `globalThis.Sound` as the home page does. It does not use `bindToggle`, which would load the gallery's whole
     kit. In the Machine view the card is not shown, so only the key works.
   ```
2. Append an entry to `memory.md` in the file's existing form (look at its last two entries): date 2026-11-10, type
   "feature", what was asked: improve plan 028; changed files; what you checked, with the outputs of Steps 1 and 2;
   open: the reviewer's browser checks (no sound file before a gesture, the header's positions, the paint recording),
   that the first press can be silent on a cold load, and that a keyboard cannot press the card (it is not a control).

**Verify**: ``/usr/bin/grep -c 'A card page (`/cards/<id>`' docs/sound.md`` prints `1`;
`git status --short` lists exactly `src/components/Header.astro`, `src/views/Card.astro`, `docs/sound.md` and
`memory.md`. Then commit as "Git workflow" says, and confirm `git status --short` is empty and
`git show --stat HEAD` lists those four files only.

## Reviewer's browser checks (lane D's reviewer runs these after the commit; the executor does not)

With `dist/` served on port 4441 and Playwright Chromium (`~/k7-rescue/improve-audit/lane-d/`), real mouse presses:

- `/cards/katagami`, fresh profile, 8 s with no input: no request under `/sound/`, `typeof Sound` is `undefined`, the
  key's `aria-pressed` is `true`.
- Two presses of the stand's card: the requests under `/sound/` are the player, `manifest.gallery.json`, a
  `sig.katagami` file, at least one `card.lift` file, and the player's first-press cues; no `music/` file; no more
  than 14 files; `Sound.stats().files` agrees.
- With sound saved off: two presses, still no request under `/sound/`.
- The key: off then on boots the player; on then off before any press fetches nothing.
- The same on `/es/cards/katagami`, and with the iPhone 14 descriptor (`(pointer: coarse)` asserted) by tap.
- The header's parts sit where `hdr-before.json` has them at 1280 and 390, the first spacer's row now the key.
- A paint recording of `/cards/katagami` at 1440 x 900 and 390 x 844 against `paint/base-1440` and `base-390`: no new
  pop, layout shift 0.

## Test plan

The automatic checks are the build's release guard, `pnpm test` (unchanged, 10 tests) and Step 2's static checks
(the script parses, holds one `import(` and no `fetch(`, and no page but a card page names the player). The behaviour
(no fetch before a gesture; what a press fetches; the header does not move) needs a browser and is the reviewer's
list above.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` exits 0 and prints `all checks pass`; `pnpm test` passes.
- [ ] `id="sound"` appears once in `dist/cards/katagami.html`, `dist/es/cards/katagami.html` and `dist/index.html`,
      and not in `dist/about.html`, `dist/cards.html` or `dist/404.html`.
- [ ] `dist/cards/katagami.html` holds one `data-player="/sound/sound.js?v=` and no `boot.gallery.js`.
- [ ] Step 2's node line printed `parses;` with `import( count 1` and `fetch( count 0`.
- [ ] `git show --stat HEAD` lists only `src/components/Header.astro`, `src/views/Card.astro`, `docs/sound.md` and
      `memory.md`; `git diff HEAD~1 --stat -- src/i18n gt-lock.json public` prints nothing.
- [ ] The reviewer's browser checks hold (the reviewer marks this one).

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" does not match the excerpts (for example the header's sound line or
  the spacer line has changed, or `sound.js` no longer exports `default` with `init`, `unlock`, `play`, `on`,
  `setEnabled`, `enabled`).
- `node -e 'const m=JSON.parse(require("fs").readFileSync("public/sound/manifest.gallery.json","utf8"));console.log(!!m.cues["card.lift"],!!m.cues["ui.sound.on"],Object.keys(m.cues).filter(k=>/^sig\..*\.lift$/.test(k)).length)'`
  does not print `true true 26`.
- The build stops with an `i18n:` error (you changed a string file; this plan changes none).
- The fix seems to need an edit under `public/sound/` or `public/ex/`, or a change to `scripts/sync.mjs`.
- A new visible string seems necessary.

## Maintenance notes

- If plan 019 or 022 (lane C) changes how `unlock()` or the manifest load behaves in `sound.js` (through a sync
  transform), re-run the reviewer's browser checks: this page relies on `unlock(e)` accepting a trusted event after an
  awaited import, on `init()` resolving to the player, and on `enabled`.
- If the design rounds change the gallery manifest's cue names (`card.lift`, `sig.<id>.lift`, `ui.sound.on`) or group
  names (`sig:<id>`), the card page goes quiet without failing the build. The STOP check above is the guard; consider
  adding it to `scripts/verify-build.mjs` in a follow-up.
- Shared files: `src/components/Header.astro` (plan 020, lane A, another line) and `src/views/Card.astro` (plans 013
  and 015, lane B, and plan 029 in this lane, other lines).
- A reviewer should read the inline script for one thing above all: no `import(`, `fetch(` or `new Audio` runs outside
  a handler for a trusted `pointerdown` or `click`.
- Deferred on purpose: a press animation for the card, a keyboard press for the card (it is not a control on this
  page), the wall's tilt and live ground on the card page (phone memory), and sound on `/cards` rows. Real numbers for
  the first press's delay come from Speed Insights after it ships.
