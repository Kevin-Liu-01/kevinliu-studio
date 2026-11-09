# Plan 028: A card page plays its card's own sound when the visitor presses the card

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected
> result before moving to the next step. If anything in "STOP conditions" occurs, stop and report; do not improvise.
> When done, update the status row for this plan in `plans/README.md`, unless a reviewer dispatched you and told you
> they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat c6245d9..HEAD -- src/components/Header.astro "src/pages/cards/[id].astro" src/styles/site.css src/lib/assets.ts public/sound/sound.js public/sound/manifest.gallery.json docs/sound.md`
> If any of these changed since this plan was written, compare the "Current state" excerpts against the live code
> before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2 (direction; Kevin's goals 3 and 1)
- **Effort**: M
- **Risk**: MED (a new script on the site's lightest pages; must fetch nothing before a gesture and move nothing)
- **Depends on**: none. If plan 005 (`plans/005-battle-no-sound-fetch-before-gesture.md`) has landed, re-run this
  plan's drift check: both read `public/sound/sound.js`.
- **Category**: direction
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Kevin's third goal is ElevenLabs sound, and the sound kit's own brief says "each card sounds like its own product".
Every one of the 26 cards has its own signature sound, but it plays only when a card is lifted on the home wall.
`/cards/<id>` is where a shared link lands (the home lens writes that address), and there the card is a silent, still
print: the page loads no sound code and its header shows an empty space where the wall has its sound key. After this
plan a visitor who presses the card on its own page hears the card lift and that card's signature, the header's sound
key works there, and the page still fetches nothing under `/sound/` until the visitor's first gesture.

## Current state

The site is Astro 7, static. Card pages are `src/pages/cards/[id].astro` inside `src/layouts/Base.astro`.

**The header renders the sound key only on the home page** (`src/components/Header.astro:7`, `:28-31`; the SVG paths
are cut here):

```astro
const home = path === '/';
...
  {home && <button type="button" class="press icon" id="sound" aria-pressed="false" aria-label="Sound"><span class="swapi"><svg class="i off" ...>...</svg><svg class="i on" ...>...</svg></span><span class="mx" aria-hidden="true">snd</span></button>}
  {home && <button type="button" class="press icon" id="pause" aria-pressed="false" aria-label="Pause Motion">...</button>}
  {/* the wall's sound and pause keys keep their room on every other page, so the links and the view switch never move between pages */}
  {!home && <span class="press icon spacer" aria-hidden="true"></span><span class="press icon spacer" aria-hidden="true"></span>}
```

The two spacers hold the keys' room (`src/styles/site.css:32`: `header.top .spacer { visibility: hidden; pointer-events: none; }`),
so a real key in the first spacer's place moves nothing.

**The header's inline script already sets the key's state before paint, wherever a `#sound` exists**
(`src/components/Header.astro:32`, the part that matters):

```js
var s=document.getElementById('sound'),p=document.getElementById('pause');if(s){var on=false;try{var k=localStorage.getItem('kevin-liu-studio:sound');on=k==='on'||k===null&&!matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}s.setAttribute('aria-pressed',String(on));d.dataset.sound=on?'on':'off'}
```

So `aria-pressed="true"` on `#sound` means "sound is wanted": the saved choice, or the default (on, unless the visitor
asks for reduced motion).

**The card page prints the card with no script of its own** (`src/pages/cards/[id].astro:42-46`):

```astro
  html={{ 'data-card': f.id }}
>
  <main class="cardpage" id="main" style={`--hue-e:${hue.energy ?? '#c9c2b8'};--hue-d:${hue.deep ?? '#3a332c'}`}>
    <div class="stand"><Fragment set:html={card(f, { id: `c-${f.id}`, focusable: false })} /><Fragment set:html={recordHtml(f.title, cardRecord(f, { full: true }), { label: cardLabel(f), art, cols: 48, color: hue.energy })} /></div>
    <script is:inline set:html={FRAMED} />
```

`html={{ 'data-card': f.id }}` puts the card's id on `<html>`, so a script reads it as
`document.documentElement.dataset.card`. The built page (`dist/cards/katagami.html`) loads only Analytics and Astro's
prefetch script. In the Machine view the stand's card is `display: none` (`src/styles/machine.css:189`), so it cannot
be pressed there.

**How the home page starts the player** (`public/sound/boot.gallery.js:6-10`, synced from the design rounds'
`r4/sound/boot.gallery.js`; never edit it):

```js
import Sound from './sound.js';

globalThis.Sound = Sound;
Sound.init({ manifest: new URL('manifest.gallery.json', import.meta.url).href, page: 'gallery', groups: ['gallery'], first: {...} });
Sound.bindToggle(document.getElementById('sound'));
```

**The player's contract** (`public/sound/sound.js`, synced from `r4/sound/sound.js`; never edit it):

- `init` (`:1225-1230`): "Bind the first gesture and read the preference. Creates no context and fetches nothing ...
  Options: manifest (a URL ...), ... page ('gallery' or 'battle' ...), groups (loaded after the first gesture)".
  It returns a promise that resolves to the player.
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
- `setEnabled(on)` saves the choice under `localStorage['kevin-liu-studio:sound']` and tells listeners (`:1175-1196`);
  `on('change', fn)` calls `fn(on)` with a boolean (`:1277`).
- `bindToggle(button)` (`:1198-1205`) turns sound on with `feedback: true`, which also loads the whole `gallery`
  group (73 files, 193 KB). A card page must not use `bindToggle`; it wires the key itself (Step 2).
- The player exports `default` (the `Sound` object) (`:1290`).

**The cues exist for all 26 cards** (checked with node on `public/sound/manifest.gallery.json`): `card.lift`
(group `gallery`, files `gallery/card.lift-1`, `gallery/card.lift-2`) and `sig.<id>.lift` for every card id, each in
its own group `sig:<id>` (one file of 7 to 8 KB, for example `cards-1/sig.katagami.entrance-1`).

**Addresses by content** (`src/lib/assets.ts`): `versioned('/sound/sound.js')` returns `/sound/sound.js?v=<hash>`,
which `vercel.json` serves as immutable. `src/pages/index.astro:7` and `:48` show the pattern:
`<script is:inline type="module" src={versioned('/sound/boot.gallery.js')}></script>`.

**The sound policy this must keep** (`docs/sound.md:7-9`, `:13-14`):

```
- Sound answers the visitor's own actions: a press, a hover, a tilt, a flip, adding or removing a card, tearing a pack,
  and the battle they start.
- Nothing but the player and its manifest is fetched before the first gesture. The player unlocks audio on that gesture.
...
- Under `prefers-reduced-motion` sound defaults to off. A saved choice (`localStorage['kevin-liu-studio:sound']`)
  always wins and syncs across tabs. The header's speaker button toggles it.
```

This plan is stricter than the policy on card pages: not even the player or its manifest is fetched before the first
gesture, because a card page is the site's lightest page (about 16 KB of HTML, 2 KB of script).

Repo rules that apply: pages that print cards set `<base href="/ex/">`, so every address this plan writes is absolute
(`/sound/...`). `public/sound` is synced material and is never edited by hand. Nothing pops: the header must not move.
Append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Build and release guard | `pnpm build` | ends `verify-build: 32 pages, 31 sitemap URLs, ... all checks pass` |
| Serve the build | `pnpm preview --port 4391 --host 127.0.0.1` (it stays up; wait until `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4391/` prints `200`) | serves `dist/` |
| Stop the serve | `pnpm exec astro preview stop` | `Stopped preview server (pid N)` |
| Browser checks | `agent-browser open <url>`, `agent-browser eval "<js>"`, `agent-browser click "<css selector>"`, `agent-browser close` with `export AGENT_BROWSER_SESSION=improve-028` | prints the page title, the value, or a tick |

There is no test command, no lint and no CI in this repo. `pnpm check` is broken; do not use it.

## Suggested executor toolkit

- The `agent-browser` skill for the browser checks. Run `agent-browser --help` once to confirm the `click` command's
  form before Step 4.

## Scope

**In scope** (the only files you should modify):
- `src/components/Header.astro`
- `src/pages/cards/[id].astro`
- `docs/sound.md` (one paragraph under "Where it is wired")
- `memory.md` (append one entry)
- `plans/README.md` (this plan's status row)

**Out of scope** (do NOT touch, even though they look related):
- `public/sound/**`, `public/ex/**` and every other synced folder: round material, changed only through
  `scripts/sync.mjs`. This plan needs no sync.
- `src/pages/index.astro` and the home page's sound: unchanged.
- The wall's tilt, live ground or lens on the card page (`ground.js`, `gallery.js`, `rituals.js`): they cost a WebGL
  context and phone memory. Sound only.
- A press animation on the card. If it seems needed, note it in your report; do not add it.
- `/about`, `/cards` and the 404 page: no sound key there (their two spacers stay).
- Any new visible text. This plan adds none (the key's label "Sound" and its Machine form "snd" already exist). If you
  find you need a new string, stop: the session "Internationalize kevinliu.studio with GT" must be told.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/028-card-page-sound` cut from
  `origin/main`: `git -C ~/repos/kevinliu-studio worktree add -b improve/028-card-page-sound ~/repos/kevinliu-studio-028 origin/main`.
  Never edit the main checkout. Never `git stash`.
- Commit by explicit path as the noreply address, one commit:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "feat(sound): a card page plays its card's sound on the visitor's press" -- src/components/Header.astro "src/pages/cards/[id].astro" docs/sound.md memory.md plans/README.md`
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Steps

### Step 1: Record the header's positions before the change

Build, serve, and record where the header's parts sit on a card page, at two widths:

```sh
pnpm install --frozen-lockfile && pnpm build
pnpm preview --port 4391 --host 127.0.0.1 &
# wait for 200 on http://127.0.0.1:4391/
export AGENT_BROWSER_SESSION=improve-028
agent-browser open http://127.0.0.1:4391/cards/katagami
agent-browser eval "JSON.stringify([...document.querySelectorAll('header.top .brand, header.top nav.links a, header.top .seg, header.top .press')].map(e=>{var r=e.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]}))"
```

Save the printed array as "before-1280". Repeat after `agent-browser set viewport 390 844` (or the form
`agent-browser --help` shows for setting the viewport) as "before-390". Keep the serve running or stop it; you rebuild
in Step 4.

**Verify**: both arrays hold six rows at 1280 (brand, two links, the view switch, two spacers). At 390 some rows may
have zero width (the phone header hides the switch); record what it prints.

### Step 2: Show the sound key on card pages

In `src/components/Header.astro`:

1. After `const home = path === '/';` add:
   ```ts
   // a card page has the sound key too: pressing its card plays the card's own sound (src/pages/cards/[id].astro)
   const card = /^\/cards\/[\w-]+$/.test(path);
   ```
2. Change the sound button's condition from `{home && <button ... id="sound" ...>` to
   `{(home || card) && <button ... id="sound" ...>`. Change nothing else in that line.
3. Replace the spacer line with two lines, so a card page keeps one spacer (the pause key's room) and the other pages
   keep two:
   ```astro
   {card && <span class="press icon spacer" aria-hidden="true"></span>}
   {!home && !card && <span class="press icon spacer" aria-hidden="true"></span><span class="press icon spacer" aria-hidden="true"></span>}
   ```
4. Leave the inline script on line 32 as it is: it already sets `#sound`'s state when the key exists.

**Verify**: `pnpm build` ends with `all checks pass`;
`grep -c 'id="sound"' dist/cards/katagami.html` prints `1`;
`grep -c 'id="sound"' dist/about.html` prints `0`;
`grep -o 'class="press icon spacer"' dist/cards/katagami.html | wc -l` prints `1`;
`grep -o 'class="press icon spacer"' dist/about.html | wc -l` prints `2`.

### Step 3: Wire the press and the key on the card page

In `src/pages/cards/[id].astro`:

1. Add to the imports at the top: `import { versioned } from '../../lib/assets';`
2. Directly after the line `<script is:inline set:html={FRAMED} />`, add this script. It is plain ES5-style code, like
   the site's other inline scripts, and it fetches nothing until a trusted gesture:

```astro
    <script is:inline data-player={versioned('/sound/sound.js')}>/* the card's own sound, on the visitor's press (docs/sound.md): the player, its manifest and this card's two cues are fetched at the first press of the card, or when the header's key turns sound on, never before; in the Machine view the card is not shown, so only the key works */(function(){var d=document.documentElement,id=d.dataset.card,key=document.getElementById('sound'),card=document.querySelector('.cardpage .stand .card'),src=document.currentScript.dataset.player,S=null,loading=null;if(!key||!card||!id)return;function wanted(){return key.getAttribute('aria-pressed')==='true'}function boot(ev){if(loading)return loading;loading=import(src).then(function(m){S=m.default;return S.init({manifest:new URL('/sound/manifest.gallery.json',location.origin).href,page:'gallery',groups:['sig:'+id]})}).then(function(){S.on('change',function(on){key.setAttribute('aria-pressed',String(on));d.dataset.sound=on?'on':'off'});S.unlock(ev);return S}).catch(function(){S=null;loading=null;return null});return loading}function lift(){if(!S)return;S.play('card.lift',{waitMs:900});S.play('lift',{card:id,waitMs:900})}card.addEventListener('pointerdown',function(e){if(e.button)return;if(S)lift();else if(wanted())boot(e).then(function(s){if(s)lift()})});key.addEventListener('click',function(e){var on=!wanted();if(S){S.setEnabled(on);return}key.setAttribute('aria-pressed',String(on));d.dataset.sound=on?'on':'off';try{localStorage.setItem('kevin-liu-studio:sound',on?'on':'off')}catch(x){}if(on)boot(e).then(function(s){if(s)s.play('ui.sound.on',{force:true,waitMs:900})})})})()</script>
```

What it does, so you can check it against the player's contract in "Current state":
- Nothing runs at load except attaching two listeners.
- A press on the stand's card (`pointerdown`, main button or touch) when sound is wanted and the player is not there
  yet: import the player by its content address, `init` it with the gallery manifest and this card's `sig:<id>` group,
  pass the same trusted event to `unlock`, then play `card.lift` and `sig.<id>.lift`. On a cold load that first press
  may be silent if the files take longer than the player's wait; every later press sounds. That is accepted.
- A press when sound is off does nothing and fetches nothing.
- The key: before the player is there, it flips its own state and saves the choice under the site's key; turning
  sound on boots the player (the click is the gesture) and plays the confirmation `ui.sound.on`. Once the player is
  there, the key calls `setEnabled`, and the player's `change` event keeps the key's state (also across tabs).
- If the import or the manifest fails, the page stays silent and the next gesture tries again.

**Verify**: `pnpm build` ends with `all checks pass`;
`grep -c "data-player=\"/sound/sound.js?v=" dist/cards/katagami.html` prints `1`;
`grep -c "sound.js" dist/about.html` prints `0`;
`grep -c "boot.gallery.js" dist/cards/katagami.html` prints `0`.

### Step 4: Check it in a browser

Serve the new build (`pnpm preview --port 4391 --host 127.0.0.1 &`, wait for 200), then:

```sh
export AGENT_BROWSER_SESSION=improve-028
agent-browser open http://127.0.0.1:4391/cards/katagami
sleep 8
agent-browser eval "performance.getEntriesByType('resource').filter(e=>/\/sound\//.test(e.name)).length"
agent-browser eval "document.getElementById('sound').getAttribute('aria-pressed')"
agent-browser click ".cardpage .stand .card"
sleep 5
agent-browser click ".cardpage .stand .card"
sleep 3
agent-browser eval "JSON.stringify(performance.getEntriesByType('resource').filter(e=>/\/sound\//.test(e.name)).map(e=>e.name.replace(/.*\/sound\//,'').replace(/\?.*/,'')))"
```

Then repeat Step 1's position command at 1280 and at 390 as "after-1280" and "after-390". Then:
`agent-browser close` and `pnpm exec astro preview stop`.

**Verify**:
- The first `eval` prints `0` (nothing under `/sound/` before a gesture).
- The second prints `"true"` (a fresh browser has no saved choice and no reduced motion).
- The last `eval`'s list contains `sound.js`, `manifest.gallery.json`, `out/cards-1/sig.katagami.entrance-1.webm`
  (or its `.m4a`) and at least one `out/gallery/card.lift-` file. It contains no `out/music/` file, and no more than
  14 files in all (the player also fetches its four first-press cues).
- "after-1280" equals "before-1280" row for row, and "after-390" equals "before-390", except that the first spacer's
  row is now the sound key at the same x, y, width and height.
- `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4391/` prints `000` after the stop (the serve is down).

### Step 5: Record it

1. In `docs/sound.md`, under "## Where it is wired", add after the "Home:" paragraph:
   ```
   - A card page (`/cards/<id>`): the header's speaker key is there too, and a press on the card plays `card.lift` and
     that card's `sig.<id>.lift`. Nothing under `/sound/` is fetched before the visitor's first press of the card (or
     of the key, turning sound on): the page's inline script then imports the player by its content address with
     `manifest.gallery.json` and the card's own `sig:<id>` group. It does not use `bindToggle`, which would load the
     gallery's whole kit. In the Machine view the card is not shown, so only the key works.
   ```
2. Append an entry to `memory.md` in the file's existing form (date, type "feature", what was asked: improve plan 028;
   changed files; what was checked, with the numbers from Step 4; open: the first press can be silent on a cold load).

**Verify**: `grep -c "A card page (\`/cards/<id>\`)" docs/sound.md` prints `1`; `git diff --stat` lists exactly the
five in-scope files.

## Test plan

The repo has no test runner (plan 001 adds one; this plan does not depend on it). The checks are the build's release
guard and the browser run in Step 4:

- Nothing under `/sound/` is requested before a gesture on a card page (first `eval` prints `0`).
- After two presses, the player, the gallery manifest, `card.lift` and the card's signature file were requested, and
  no music.
- The header does not move (before and after arrays equal at 1280 and 390).
- Repeat Step 4's first three commands on `http://127.0.0.1:4391/cards/claude-of-tanks` before stopping the serve;
  expect `0`, then `"true"`.
- With sound saved off: `agent-browser eval "localStorage.setItem('kevin-liu-studio:sound','off')"`, reload the page
  (`agent-browser open` the same address), click the card twice, and expect the `/sound/` resource count to stay `0`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` exits 0 and prints `all checks pass`.
- [ ] `grep -c 'id="sound"' dist/cards/katagami.html` prints `1`; the same on `dist/about.html`, `dist/cards.html` and
      `dist/404.html` prints `0`.
- [ ] `grep -c "boot.gallery.js" dist/cards/katagami.html` prints `0` and
      `grep -c "data-player=\"/sound/sound.js?v=" dist/cards/katagami.html` prints `1`.
- [ ] Step 4's first `eval` printed `0` and its last list held `sound.js`, `manifest.gallery.json`, a
      `sig.katagami` file and a `card.lift` file.
- [ ] With sound saved off, two presses left the `/sound/` request count at `0`.
- [ ] The header position arrays are equal before and after at both widths.
- [ ] `git status --short` lists only `src/components/Header.astro`, `src/pages/cards/[id].astro`, `docs/sound.md`,
      `memory.md` and `plans/README.md`.
- [ ] No serve and no browser of yours is left running (`pnpm exec astro preview stop` done, `agent-browser close` done).
- [ ] `plans/README.md` status row updated.

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" does not match the excerpts (for example the header's sound line or
  the spacer line has changed, or `sound.js` no longer exports `default` with `init`, `unlock`, `play`, `on`,
  `setEnabled`).
- `node -e 'const m=JSON.parse(require("fs").readFileSync("public/sound/manifest.gallery.json","utf8"));console.log(!!m.cues["card.lift"],Object.keys(m.cues).filter(k=>/^sig\..*\.lift$/.test(k)).length)'`
  does not print `true 26`.
- Any `/sound/` request appears before a gesture in Step 4, twice after a fix attempt.
- The header's positions differ after the change at either width.
- The fix seems to need an edit under `public/sound/` or `public/ex/`, or a change to `scripts/sync.mjs`.
- A new visible string seems necessary.
- `agent-browser click` cannot be made to press the card (the check needs a trusted click; a synthetic
  `dispatchEvent` does not count as a gesture). Report rather than replacing the check with one that cannot fail.

## Maintenance notes

- If plan 005 or plan 019 changes how `unlock()` or the manifest load behaves in `sound.js` (through a sync
  transform), re-run Step 4: this page relies on `unlock(e)` accepting a trusted event after an awaited import.
- If the design rounds change the gallery manifest's cue names (`card.lift`, `sig.<id>.lift`) or group names
  (`sig:<id>`), the card page goes quiet without failing the build. The STOP check above is the guard; consider adding
  it to `scripts/verify-build.mjs` in a follow-up.
- The i18n session (`feat/i18n`) will see `#sound` on card pages; its label "Sound" is the home page's own string.
- A reviewer should read the inline script for one thing above all: no `import(`, `fetch(` or `new Audio` runs outside
  a handler for a trusted `pointerdown` or `click`.
- Deferred on purpose: a press animation for the card, the wall's tilt and live ground on the card page (phone
  memory), and sound on `/cards` rows. Real numbers for the first press's delay come from Speed Insights after it
  ships.
