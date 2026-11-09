# Plan 017: The wall saves only choices the visitor made, keeps its history straight, names the tab, and works as links without scripts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs public/ex/gallery.js sync.lock.json src/pages/index.astro src/styles/site.css docs/sync.md`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (If plan 016 has landed, `scripts/sync.mjs` and `public/ex/gallery.js` will
> show changes: that is expected as long as the excerpts below still match.)

## Status

- **Priority**: P2
- **Effort**: S to M (ten small patch edits and one page change)
- **Risk**: LOW (each change is one line; the lens's Back behaviour is the one to look at in review)
- **Depends on**: none. If plan 016 is also being executed, land 016 first: both add pairs to the same array in
  `scripts/sync.mjs`.
- **Category**: bug
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Five small defects in how the home page (the wall) keeps state:

1. **Reduced motion is saved as if the visitor had pressed Pause.** With the system's reduced-motion setting on, the
   page starts paused (correct), and `gallery.js` then writes `ill-pause = '1'` to `localStorage` on every load. A
   visitor who later turns reduced motion off stays paused on every visit until they find the Pause key.
2. **Closing a lens that Forward reopened overwrites a history entry.** Open a card's lens, press Back, press Forward,
   press Escape: the `/cards/<id>` entry is rewritten to `/`, leaving two identical entries, so the next Back appears
   to do nothing.
3. **Forward can open an invisible lens in the Machine view.** The Machine view hides the lens; a Forward to a card
   entry still opens it and makes the page behind it inert, with nothing on screen.
4. **The tab keeps the home title at a card's address.** While a lens holds `/cards/<id>`, the tab, the history entry
   and a bookmark all read "Kevin Liu" instead of the card page's title.
5. **Without scripts the wall is 26 dead buttons.** Each card is a `role="button"` that only works once `gallery.js`
   has booted; the plain link to the card's page beside it is hidden from keyboards and screen readers
   (`tabindex="-1" aria-hidden="true"`), although its comment says it is there for pages without scripts.

Items 1 to 4 are round code: `r4/ex/gallery.js`, owned by the rounds' **room** lane. This site may not edit synced
round files or write in the rounds, so they ship here as anchored patches in `TRANSFORMS` (`scripts/sync.mjs`), and
the same changes go to the rounds as requests (section "Upstream request"). Item 5 is site code
(`src/pages/index.astro`).

## Current state

Files and roles:

- `public/ex/gallery.js`: the wall's state and wiring. **Synced from the rounds (`r4/ex/gallery.js`, pinned at rounds
  commit `30e69931`). Never edit it by hand.**
- `scripts/sync.mjs`: copies round files in; `TRANSFORMS` holds the only edits, as anchored text patches. `patch(file,
  text, pairs)` (`scripts/sync.mjs:148-155`) applies each `[find, replace]` pair in order and throws unless `find`
  occurs **exactly once** in the text at that moment. `after(add)` (`:175`) returns a function that appends `add` to
  the anchor.
- `src/pages/index.astro`: the wall's page. `src/styles/site.css`: the site's own styles.
- `src/layouts/Base.astro:50` (inline script): sets `data-paused` on `<html>` when `localStorage['ill-pause'] === '1'`
  **or** the system asks for reduced motion.

The shipped `gallery.js` (line numbers at rounds HEAD `868340d7` in brackets; apart from the site's own patches
noted below, the text is identical there and in the pinned source):

1. Pause, `public/ex/gallery.js:88-96` [`r4/ex/gallery.js:85-92`]:

   ```js
     const pauseBtn = $('#pause');
     function setPaused(on) {
       const p = on || RM();
       pauseBtn.setAttribute('aria-pressed', String(p));
       Ground.paused = p;
       try { localStorage.setItem('ill-pause', on ? '1' : '0'); } catch (e) {}
     }
     pauseBtn.addEventListener('click', () => { snd('ui.toggle'); setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true'); });
     setPaused('paused' in root.dataset);
   ```

   The last line runs at every load and saves. (The click line already carries a site patch, the `snd('ui.toggle')`
   call; in the rounds it is `pauseBtn.addEventListener('click', () => setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true'));`.)

2. The lens's history, `public/ex/gallery.js:906-921` [`r4/ex/gallery.js:961-978`]:

   ```js
       opened(id, push) {
         if (push) { history.pushState({ card: id }, '', `/cards/${id}`); I.pushed = true; }
         ...
       },
       stepped(id) {
         history.replaceState({ card: id }, '', `/cards/${id}`);
         ...
       },
       leaving(fromPop) {
         if (!fromPop) {
           if (I.pushed && history.state && history.state.card) history.back();
           else history.replaceState(null, '', '/' + location.search + location.hash);
         }
         I.pushed = false;
       },
   ```

   The three address lines are already rewritten by the site (the rounds write `cards/${id}/` and
   `document.baseURI...`). `I.pushed` is true only for a lens this press pushed; a lens that Forward reopened has it
   false, so its close takes the `replaceState` branch.

3. Back and Forward, `public/ex/gallery.js:935-939` [`r4/ex/gallery.js:990-994`]:

   ```js
     addEventListener('popstate', (e) => {
       const id = e.state && e.state.card;
       if (id && cards[id]) openInspect(id, { push: false });
       else if (I.id) closeInspect(true);
     });
   ```

   `root` is `document.documentElement` (`public/ex/gallery.js:15`); the Machine view is `root.dataset.mode === 'machine'`.

4. Titles: `public/ex/gallery.js:75` is `  const titleOf = (id) => F[id].title;` (`F` maps a card's id to its record).
   A card page's `<title>` is `<card title> | Kevin Liu` and the home page's is `Kevin Liu`
   (`src/components/Seo.astro:23`: `` path === '/' ? title : `${title} | ${NAME}` ``).

The site's existing pairs that this plan edits, `scripts/sync.mjs:268` and `:280-282` (inside the
`'public/ex/gallery.js'` array, which starts at line 265 and ends at line 288 with the `frs.hidden` pair):

```js
    ["pauseBtn.addEventListener('click', () => setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true'));", "pauseBtn.addEventListener('click', () => { snd('ui.toggle'); setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true'); });"],
    ...
    ["if (push) { history.pushState({ card: id }, '', `cards/${id}/`); I.pushed = true; }", "if (push) { history.pushState({ card: id }, '', `/cards/${id}`); I.pushed = true; }"],
    ["history.replaceState({ card: id }, '', `cards/${id}/`);", "history.replaceState({ card: id }, '', `/cards/${id}`);"],
    ["else history.replaceState(null, '', document.baseURI.replace(location.origin, '') + location.search + location.hash);", "else history.replaceState(null, '', '/' + location.search + location.hash);"],
```

5. The wall's link, `src/pages/index.astro:23-24`:

   ```astro
     // the card is the lens's button; its page is a plain link beside it, for crawlers, agents and pages without scripts
     return `<li class="pocket" style="--n:${i}">${html}<a class="sr" href="${cardPath(f)}" tabindex="-1" aria-hidden="true">${f.title}</a>${recordHtml(...)}</li>`;
   ```

   `.sr` hides an element visually (`public/ex/ui.css:59`:
   `.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }`),
   `.pocket` is `position: relative` (`public/ex/ui.css:197-199`), and a booted gallery sets `globalThis.Gallery`
   (`public/ex/gallery.js:1082`). The round scripts are `defer`, so they have all run (or failed) by
   `DOMContentLoaded`.

Checked on 2026-11-09: every anchor used below occurs exactly once in the pinned source
(`git show 30e69931:r4/ex/gallery.js`) and at rounds HEAD, no other pair rewrites them, and the ten changes applied to
a copy of the shipped file pass `node --check`.

Repo rules that apply (from `AGENTS.md`): synced folders (`public/ex`, `public/battle`, `public/sound`, `public/og`,
`vendor/`) are never edited by hand; a fix to round code is an anchored patch in `TRANSFORMS`, then the sync command
rewrites the synced file and `sync.lock.json`, and they are committed together; never write in the rounds folder;
every link the site writes is absolute; append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | last line `synced from 30e69931 + 42ff51c7: 1 written, 0 removed` |
| Build and release guard | `pnpm build` | last line `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Serve `dist/` | `pnpm preview --port 4417 --host 127.0.0.1` (in the background) | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4417/` prints `200` (may take 30 s) |
| Stop the serve | `pnpm exec astro preview stop` | prints `Stopped preview server` |

There is no test suite and no lint. `pnpm check` is broken on `main`; do not run it. A plain `pnpm sync` fails by
design; always use the `ROUNDS=` form.

## Scope

**In scope** (the only files you should modify):

- `scripts/sync.mjs` (the `'public/ex/gallery.js'` array only)
- `public/ex/gallery.js`, `sync.lock.json` (**only through the sync command**)
- `src/pages/index.astro`, `src/styles/site.css` (Step 6)
- `docs/sync.md` (one bullet)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):

- Anything in the rounds folder.
- `src/layouts/Base.astro` and `src/components/Header.astro`: they read `ill-pause`; reading is right.
- `go()` in `gallery.js` (the address written when Play is pressed) and `restore()`.
- Card pages (`/cards/<id>`): real pages with their own titles.
- The P shortcut, the status line and the dock's labels: plan 016.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/017-wall-saved-state-and-history` cut
  from `origin/main` (or from plan 016's branch if that plan is done and not yet merged):
  `git -C ~/repos/kevinliu-studio fetch origin && git -C ~/repos/kevinliu-studio worktree add -b improve/017-wall-saved-state-and-history ~/repos/kevinliu-studio-017 origin/main`.
  Never edit the main checkout. Never use `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`.
- Message style, from this repo's log: `fix(sound): no sound fetched before the first gesture on the battle`. Use
  `fix(wall): save Pause only when pressed, one history entry a lens, the card's title on its address` and
  `fix(wall): each card's page link works before the gallery's scripts boot`.
- Do NOT push, open a PR or deploy.

## Upstream request (for the rounds lane)

The executor does not apply this. Copy this whole section, word for word, into your final report so Kevin or the
rounds' room lane can apply it. When a later pinned commit carries these changes, the site's patches stop matching
and are adjusted (see "Maintenance notes").

Lane: **r4/ex room** (owns `gallery.js`, `r4/ex/OWNERS.md`). Request lines, in the rounds' format
(`r4/ex/REQUESTS.md`):

```
site -> room: gallery.js: setPaused(on, save) writes ill-pause only when save is true, and only the Pause key's click passes it, because the boot call setPaused('paused' in root.dataset) saved '1' whenever reduced motion was on, so a visitor who turns reduced motion off stays paused
site -> room: gallery.js: leaving() calls history.back() whenever history.state.card is set (not only when this lens pushed), because a lens reopened by Forward closed with replaceState and left two identical entries
site -> room: gallery.js: the popstate handler does not open the lens when root.dataset.mode is 'machine', because the Machine view hides the lens and the page behind went inert with nothing on screen
site -> room: gallery.js: while the lens holds a card's address, document.title is that card's page title, and the page's own title again when it leaves, because history entries and bookmarks made at a card's address read as the home page
```

Source edits at rounds HEAD `868340d7`, `r4/ex/gallery.js`:

- line 85: `function setPaused(on) {` becomes `function setPaused(on, save) {`
- line 89: `try { localStorage.setItem('ill-pause', on ? '1' : '0'); } catch (e) {}` becomes
  `if (save) try { localStorage.setItem('ill-pause', on ? '1' : '0'); } catch (e) {}`
- line 91: `setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true')` becomes
  `setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true', true)`
- line 973: `if (I.pushed && history.state && history.state.card) history.back();` becomes
  `if (history.state && history.state.card) history.back();`
- line 992: `if (id && cards[id]) openInspect(id, { push: false });` becomes
  `if (id && cards[id] && root.dataset.mode !== 'machine') openInspect(id, { push: false });`
- titles: a `retitle()` as in Step 4 below, called after the `pushState` in `opened()`, after the `replaceState` in
  `stepped()`, after the `replaceState` in `leaving()` and first in the `popstate` handler. The rounds' card pages
  have their own title format; use theirs.

## Steps

### Step 0: Pre-flight

1. `ls $HOME/k7-rescue/release-next/rounds-42ff51c7/r4/ex/gallery.js` prints the path.
2. `pnpm install --frozen-lockfile`
3. `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check`

**Verify**: step 3 prints `in sync`. If not, STOP.

All edits in Steps 1 to 4 are inside the `'public/ex/gallery.js'` array in `scripts/sync.mjs`. "Add" means: add the
pair **after** the pair `['    frs.hidden = !F || F.length < 2;', '    frs.hidden = true;'],` (and after plan 016's
pairs if they are there), before the array's closing `]),`. "Edit" means: change only the **second** string (the
replacement) of the existing pair named; leave its first string (the anchor) exactly as it is.

### Step 1: Pause is saved only when the visitor presses it

1. Edit the pair at line 268 (its anchor starts `pauseBtn.addEventListener('click', () => setPaused(`). In its
   replacement, change `setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true'); });` to
   `setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true', true); });` so the whole replacement reads:

   ```js
   "pauseBtn.addEventListener('click', () => { snd('ui.toggle'); setPaused(pauseBtn.getAttribute('aria-pressed') !== 'true', true); });"
   ```

2. Add:

   ```js
       // reduced motion starts the page paused (Base.astro), and the boot call saved that as the visitor's own choice; only
       // the Pause key's press saves now
       ["  function setPaused(on) {", "  function setPaused(on, save) {"],
       ["    try { localStorage.setItem('ill-pause', on ? '1' : '0'); } catch (e) {}", "    if (save) try { localStorage.setItem('ill-pause', on ? '1' : '0'); } catch (e) {}"],
   ```

**Verify**: `node --check scripts/sync.mjs` exits 0.

### Step 2: Closing a lens always steps back out of its own entry

Add:

```js
    // a lens that Forward reopened is on its own history entry too: leaving it steps back, as a pushed lens does, where
    // replaceState left two identical entries
    ["        if (I.pushed && history.state && history.state.card) history.back();", "        if (history.state && history.state.card) history.back();"],
```

(The anchor starts with exactly eight spaces.) The existing pair on the next source line (the `else
history.replaceState(null, ...)` one, `scripts/sync.mjs:282`) stays; Step 4 edits its replacement.

**Verify**: `node --check scripts/sync.mjs` exits 0.

### Step 3: Forward does not open a hidden lens in the Machine view

Add:

```js
    // the Machine view hides the lens (machine.css), so a card's history entry opens nothing there
    ["    if (id && cards[id]) openInspect(id, { push: false });", "    if (id && cards[id] && root.dataset.mode !== 'machine') openInspect(id, { push: false });"],
```

(The anchor starts with exactly four spaces.)

**Verify**: `node --check scripts/sync.mjs` exits 0.

### Step 4: The tab names the card while the lens holds its address

1. Add (note `after(...)`, and that the long string is in double quotes so its `${...}` reach the page unchanged):

   ```js
       // while the lens holds /cards/<id> the tab, the history entry and a bookmark carry that card page's own title
       // (Seo.astro: "<card> | Kevin Liu"); the wall's own title comes back when the address does
       ["  const titleOf = (id) => F[id].title;", after("\n  const TITLE0 = document.title;\n  const retitle = () => { const c = history.state && history.state.card; document.title = c && F[c] ? `${F[c].title} | ${TITLE0}` : TITLE0; };")],
       ["  addEventListener('popstate', (e) => {\n    const id = e.state && e.state.card;", "  addEventListener('popstate', (e) => {\n    retitle();\n    const id = e.state && e.state.card;"],
   ```

2. Edit the three existing address pairs (lines 280-282) so each replacement also calls `retitle()`:

   - the `pushState` pair's replacement becomes
     ``"if (push) { history.pushState({ card: id }, '', `/cards/${id}`); I.pushed = true; } retitle();"``
   - the `replaceState({ card: id }` pair's replacement becomes
     ``"history.replaceState({ card: id }, '', `/cards/${id}`); retitle();"``
   - the `else history.replaceState(null` pair's replacement becomes
     `"else { history.replaceState(null, '', '/' + location.search + location.hash); retitle(); }"`

**Verify**: `node --check scripts/sync.mjs` exits 0, and `grep -c "retitle" scripts/sync.mjs` prints `5`.

### Step 5: Sync and check the patched file

```sh
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs
```

**Verify**, all of:

- the last line is `synced from 30e69931 + 42ff51c7: 1 written, 0 removed` (a line `N problem(s); nothing was written`
  names an anchor that did not match exactly once: STOP, do not loosen it);
- `node --check public/ex/gallery.js` exits 0;
- `grep -c "retitle();" public/ex/gallery.js` prints `4`, `grep -c "const retitle = " public/ex/gallery.js` prints `1`;
- `grep -c "if (history.state && history.state.card) history.back();" public/ex/gallery.js` prints `1`;
- `grep -c "root.dataset.mode !== 'machine') openInspect" public/ex/gallery.js` prints `1`;
- this exits 0 and prints `PAUSE OK`:

  ```sh
  node -e '
  const src=require("fs").readFileSync("public/ex/gallery.js","utf8");
  const fn=src.match(/  function setPaused\(on, save\) \{[\s\S]*?\n  \}/)[0];
  const store={};
  const setPaused=new Function("pauseBtn","Ground","RM","localStorage", fn+"\nreturn setPaused;")({setAttribute(){}},{},()=>true,{setItem:(k,v)=>{store[k]=v}});
  setPaused(true);
  const boot=!("ill-pause" in store);
  setPaused(false,true);
  const click=store["ill-pause"]==="0";
  console.log(boot&&click?"PAUSE OK":"PAUSE WRONG");process.exit(boot&&click?0:1)'
  ```

Commit the first commit now, by explicit path: `scripts/sync.mjs public/ex/gallery.js sync.lock.json`.

### Step 6: Each card's page link is a real link until the gallery has booted

1. `src/pages/index.astro:24`: in the template string, change
   `<a class="sr" href="${cardPath(f)}" tabindex="-1" aria-hidden="true">${f.title}</a>` to
   `<a class="sr golink" href="${cardPath(f)}">${f.title}</a>`. Change the comment on line 23 to:

   ```astro
     // the card is the lens's button once gallery.js has booted; until then (no scripts, or a round script that failed to
     // load) its page is a plain link beside it, which the script under the wall takes out of the tab order afterwards
   ```

2. In the same file, directly after the line `    <script is:inline set:html={FRAMED} />` add:

   ```astro
       <script is:inline>/* each card's plain link to its page stays a real link until the gallery's scripts have booted; once the card is the lens's button the link leaves the tab order and the accessibility tree, so no card is announced twice */addEventListener("DOMContentLoaded",function(){if(self.Gallery)document.querySelectorAll(".wall a.golink").forEach(function(a){a.tabIndex=-1;a.setAttribute("aria-hidden","true")})})</script>
   ```

3. `src/styles/site.css`: after the line
   `html:has(.dock) { scroll-padding-bottom: calc(var(--dock) + 24px); }` add:

   ```css
   /* a card's plain link to its page (index.astro) is hidden like .sr; where it can take focus (no scripts) it shows
      while focused, as a label at the foot of its pocket */
   .wall > .pocket > a.golink:focus-visible { left: 10px; bottom: 10px; width: auto; height: auto; overflow: visible; clip-path: none; z-index: 7; padding: 6px 10px; border-radius: 8px; background: var(--clay); color: var(--ink-1); font: 600 14px/20px var(--sans); }
   ```

**Verify**: `pnpm build` ends with the guard's `all checks pass` line;
`grep -o '<a class="sr golink" href="/cards/[a-z0-9-]*">' dist/index.html | wc -l` prints `26`;
`grep -c 'class="sr" href="/cards/' dist/index.html` prints `0`.

### Step 7: Check in a browser

Start the serve in the background (`pnpm preview --port 4417 --host 127.0.0.1 > /tmp/017-preview.log 2>&1 &`), wait
for `200`, then:

```sh
export AGENT_BROWSER_SESSION=plan-017
agent-browser open http://127.0.0.1:4417/
sleep 12
# (a) the links are out of the way once the gallery has booted
agent-browser eval "JSON.stringify({booted: !!self.Gallery, hidden: document.querySelectorAll('.wall a.golink[tabindex=\"-1\"][aria-hidden=\"true\"]').length})"
# (b) open a lens: its address and title
agent-browser click ".wall .pocket .card"
sleep 4
agent-browser get url; agent-browser get title
# (c) close: back on the wall
agent-browser press Escape
sleep 3
agent-browser get url; agent-browser get title
# (d) Forward reopens; close again; Forward must still have the card's entry to go to
agent-browser forward
sleep 4
agent-browser get url; agent-browser get title
agent-browser press Escape
sleep 3
agent-browser get url
agent-browser forward
sleep 4
agent-browser get url
agent-browser close
pnpm exec astro preview stop
```

**Verify**:

- (a) `booted` true and `hidden` 26;
- (b) the address ends `/cards/turboslide` and the title is `Turboslide | Kevin Liu`;
- (c) the address is `http://127.0.0.1:4417/` and the title is `Kevin Liu`;
- (d) after the first Forward: `/cards/turboslide` and `Turboslide | Kevin Liu`; after Escape: `/`; after the second
  Forward: `/cards/turboslide` again (before this plan the second Forward had nowhere to go and the address stayed
  `/`);
- after the stop, `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4417/` prints `000`.

If in (b) the address stays `/` (the headless browser's click did not open the lens), try
`agent-browser focus ".wall .pocket .card"` then `agent-browser press Enter` instead of the click. If the lens still
does not open, do not fail the plan on (b) to (d): say so in the report and ask the operator to run them by hand. If
`agent-browser` is not installed, skip this step and say so.

### Step 8: Record it and commit

1. `docs/sync.md`, the "Transforms" list: after the bullet that starts
   `` - `gallery.js`, `rituals.js`: the sound hooks `` (and its continuation line, and plan 016's bullet if present) add:
   `` - `gallery.js`: Pause is saved only when pressed (reduced motion is not the visitor's choice), a lens always steps back out of its own history entry, a card's history entry opens nothing in the Machine view, and the tab carries the card page's title while the lens holds its address. ``
2. Append an entry to `memory.md` in the style of its last entries: date, type `fix`, the changed files, the five
   defects in one line each, what the browser check showed, and under Open: "the same four changes are requested
   upstream (plans/017); a visitor who already has `ill-pause = '1'` saved from reduced motion stays paused until they
   press Pause".
3. Second commit, by explicit path: `src/pages/index.astro src/styles/site.css docs/sync.md memory.md`.

**Verify**: `git status --short` prints nothing;
`ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`. Put the
"Upstream request" section, word for word, in your report.

## Test plan

No test suite exists. The checks are: the sync's anchor contract (every anchor exactly once), `node --check` on the
patched file, the `setPaused` simulation in Step 5 (exits 1 if the boot call saves or the click does not), the built
page's 26 links (Step 6), and the browser walk through open, close, Forward, close, Forward (Step 7).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] `pnpm build` ends with `verify-build: ... all checks pass`
- [ ] the `setPaused` simulation in Step 5 prints `PAUSE OK`
- [ ] `grep -c "retitle();" public/ex/gallery.js` prints `4`
- [ ] `grep -c "if (history.state && history.state.card) history.back();" public/ex/gallery.js` prints `1`
- [ ] `grep -o '<a class="sr golink" href="/cards/[a-z0-9-]*">' dist/index.html | wc -l` prints `26`
- [ ] `git diff --stat origin/main..HEAD` lists only the in-scope files (plus plan 016's, if you branched from it)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, the sync check does not print `in sync` before your
  first edit, or the sync prints `problem(s); nothing was written`.
- The code at the locations in "Current state" does not match the excerpts, or the four existing pairs named there
  are not in `scripts/sync.mjs` as quoted.
- In Step 7 (a), `booted` is false or `hidden` is not 26.
- In Step 7 the lens opens but (c) does not return to `/`, or the second Forward in (d) stays on `/`.
- A fix seems to need a hand edit under `public/ex/`, or any write in the rounds folder.

## Maintenance notes

- The new pairs and the edits to the four existing pairs are interim. When the rounds apply the upstream request and
  a release moves the `cards` pin past it, the anchors stop matching and `pnpm sync` stops and names them. Then: delete
  the new pairs; and since the rounds' lines will already call `retitle()` and `setPaused(..., true)`, re-read the four
  edited pairs against the new source (their anchors, which quote the rounds' old lines, will need the rounds' new
  text).
- `TITLE0` is the wall's own title when `gallery.js` boots (`Kevin Liu`). If the home page's title ever changes, card
  titles in the lens follow it automatically; if a card page's title format changes in `Seo.astro`, change the
  `retitle` string to match.
- In the Machine view a Forward to a card's entry now changes only the address and the tab's title; the wall stays.
  A reviewer may prefer it to step straight back; that is a design choice for the rounds' lane.
- A visitor whose browser already stores `ill-pause = '1'` from the old behaviour is not repaired; nothing can tell
  that value from a real press.
- A reviewer should check Back from a lens on a phone as well: `Release.astro` reloads the wall when it returns from
  the back-forward cache, which is a separate path from the lens's own history.
