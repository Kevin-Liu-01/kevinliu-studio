# Plan 007: The Machine view keeps its headings and its home link for screen readers, and one-way view buttons stop claiming a pressed state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- src/styles/machine.css src/layouts/Base.astro src/components/Header.astro src/components/Footer.astro src/pages/about.astro src/pages/cards.astro src/pages/404.astro 'src/pages/cards/[id].astro' docs/architecture.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Every page has two views, switched in the header: Human, and Machine (a terminal-styled view that shows what an
agent reads). In the Machine view each heading is hidden with `visibility: hidden` and a paragraph of Markdown text
(`# About Kevin Liu`) is laid over its box. `visibility: hidden` removes an element from the accessibility tree, so a
screen-reader user who switches to the Machine view finds no headings on any page, and on the home page the brand
link (whose only name is the hidden `h1`) has no name at all. This was confirmed on production on 2026-11-09 with an
accessibility snapshot: `/about` exposes 3 headings in the Human view and 0 in the Machine view, and the home page's
first header link is a bare `link` with no name. That fails WCAG 1.3.1 and 4.1.2. Separately, three buttons that only
ever switch one way ("Machine view", "Human view", the footer's phone switch) carry `aria-pressed`, so a screen
reader announces "toggle button, not pressed" for a button that is never shown pressed. After this plan the headings
stay in the accessibility tree in both views, the home link is named, and the one-way buttons are plain buttons.

## Current state

- `src/styles/machine.css` — the Machine view's sheet. The rule that hides headings (`src/styles/machine.css:51`):

```css
:root[data-mode='machine'] .hw > :not(.mx) { visibility: hidden; }
```

  `.hw` is the wrapper around a heading and its Machine twin line; `.mx` marks a Machine-view form. The skip buttons'
  rule (`src/styles/machine.css:21`):

```css
:root:not([data-mode='machine']) .skipmode[data-mode-set='human'], :root[data-mode='machine'] .skipmode[data-mode-set='machine'] { display: none; }
```

- The heading wrappers, each a heading followed by its twin line in a `<p class="mx">` with no `aria-hidden`:
  - `src/pages/about.astro:24`, `:29`, `:33`:

```astro
    <div class="sw hw"><h1>About {NAME}</h1><p class="mx" set:html={mdHtml(tw[0])} /></div>
    <div class="sw hw"><h2>Projects</h2><p class="mx" set:html={mdHtml('## Projects')} /></div>
    <div class="sw hw"><h2>Questions</h2><p class="mx" set:html={mdHtml('## Questions')} /></div>
```

  - `src/pages/cards.astro:15`:

```astro
    <div class="sw hw"><h1>Cards</h1><p class="mx" set:html={mdHtml('# Cards')} /></div>
```

  - `src/pages/404.astro:7`:

```astro
    <div class="sw hw"><h1>Not found</h1><p class="mx"># Not found</p></div>
```

  - `src/pages/cards/[id].astro:36`, the helper that all five headings of a card page use (lines 48, 59, 64, 65, 70):

```astro
const hd = (md: string) => `<p class="mx">${mdHtml(md)}</p>`;
```

- `src/components/Header.astro:14` and `:18` — the brand link. On the home page it has no `aria-label`, and its twin
  is already `aria-hidden`:

```astro
  <a class="brand" href="/" aria-label={home ? undefined : 'Kevin Liu, every card'} data-astro-prefetch={home ? undefined : 'viewport'}>
```
```astro
    <div class="sw hw nm">{home ? <h1>Kevin Liu</h1> : <span class="name">Kevin Liu</span>}<span class="mx" aria-hidden="true">Kevin Liu</span></div>
```

- The one-way buttons. `src/layouts/Base.astro:69-70`:

```astro
<button type="button" class="skip skipmode" data-mode-set="machine" aria-pressed="false">Machine view</button>
<button type="button" class="skip skipmode" data-mode-set="human" aria-pressed="false">Human view</button>
```

  `src/components/Footer.astro:24` and `:35`:

```astro
    <button type="button" class="tomachine" data-mode-set="machine" aria-pressed="false">Machine</button>
```
```astro
      <button type="button" class="tohuman" data-mode-set="human" aria-pressed="false">Human</button>
```

  The real toggle is the header pair, `src/components/Header.astro:26` (two buttons inside `<div class="seg">`, each
  with `data-mode-set` and `aria-pressed`). It is correct and stays as it is.

- `src/layouts/Base.astro:81` — one long inline script on one line that handles every `[data-mode-set]` click. The
  two pieces this plan changes, each occurring exactly once in the line:

```js
var b=e.target.closest&&e.target.closest('[data-mode-set]');if(!b)return;var m=b.dataset.modeSet,
```
```js
var v=[].filter.call(document.querySelectorAll('[data-mode-set]'),
```

  The same line writes `aria-pressed` on every `[data-mode-set]` button in two places
  (`document.querySelectorAll('[data-mode-set]').forEach(function(x){x.setAttribute('aria-pressed',...`). Those stay.

- `public/ex/gallery.js:83` (synced round code that runs on the home page only; NEVER edit it) does the same:

```js
    $$('[data-mode-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.modeSet === mode)));
```

  That is why removing `aria-pressed` from the one-way buttons' markup is not enough: these two scripts would put it
  back. The fix is to give the one-way buttons a different attribute, `data-mode-go`, which neither script's
  `aria-pressed` code selects. `Base.astro`'s click handler is taught to switch on it.

- `docs/architecture.md:72-74`, the bullet that describes headings in the Machine view:

```
- Headings keep one text: a heading's twin line is laid over the heading's own box (`.hw`), so every page still has
  one h1 and crawlers read one title. A card page's lists are one framed panel each (`.sl`), so their lines share the
  room their tiles take.
```

Repo rules that apply (from `AGENTS.md`): `public/ex` and the other synced folders are never edited by hand; every
page keeps exactly one `h1` (`pnpm build` fails otherwise); switching views must move nothing on screen
(`docs/architecture.md`, Machine view); append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Build and release guard | `pnpm build` | last line starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass` |
| Serve `dist/` | `pnpm preview --port 4397 --host 127.0.0.1 &` | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4397/` prints `200` (wait until it does) |
| Stop that server | `pnpm exec astro preview stop` | prints `Stopped preview server` |
| Accessibility tree of the open page | `agent-browser snapshot` | a text tree with lines like `- heading "About Kevin Liu" [level=1, ref=e4]` |
| Machine view layout check | see step 6 | a `report.json` that passes the command in step 6 |

There is no test runner, linter or CI in this repo. Do not run `pnpm check` (it is broken on `main`).

## Scope

**In scope** (the only files you should modify):
- `src/styles/machine.css` (lines 21 and 51 only)
- `src/pages/about.astro`, `src/pages/cards.astro`, `src/pages/404.astro`, `src/pages/cards/[id].astro` (the twin
  lines quoted above only)
- `src/components/Header.astro` (line 14 only)
- `src/components/Footer.astro` (lines 24 and 35 only)
- `src/layouts/Base.astro` (lines 69, 70 and the two pieces of line 81 quoted above)
- `docs/architecture.md` (the one bullet quoted above)
- `memory.md` (append one entry)
- `plans/README.md` (your status row)

**Out of scope** (do NOT touch, even though they look related):
- `public/ex/gallery.js` and everything else under `public/` and `vendor/`. No sync and no `scripts/sync.mjs` change
  is needed.
- The header's Human and Machine pair (`Header.astro:26`) and the script at `Header.astro:32`.
- The rule `:root[data-mode='machine'] .sw > .hx { display: contents; visibility: hidden; }` (`machine.css:47`) and
  the `.sl` rule (`machine.css:54`). They hide a region's human text while its Machine form, which stays readable,
  takes its place; only headings lose their role.
- `scripts/machine-check.mjs`. Use it; do not change it.
- The battle pages (they have no Machine view).
- Making the Machine view's overflowing boxes keyboard-scrollable, or hiding Machine forms from HTML-to-text
  readers: recorded as separate, lower-confidence findings.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/007-machine-view-headings` cut from
  `origin/main`. Never edit the main checkout (other sessions use it). Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(cards): size the card's rows and foot so Safari lays them out as Chromium does`.
  For this plan: `fix(machine): headings and the home link keep their names for screen readers in the Machine view`
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Keep headings in the accessibility tree

In `src/styles/machine.css`, replace line 51

```css
:root[data-mode='machine'] .hw > :not(.mx) { visibility: hidden; }
```

with

```css
/* a heading keeps its role and its name for a screen reader: its text is cleared, not hidden, and its twin line
   (aria-hidden) is laid over it */
:root[data-mode='machine'] .hw > :not(.mx) { color: transparent; text-shadow: none; -webkit-user-select: none; user-select: none; forced-color-adjust: none; }
```

**Verify**: `grep -c ".hw > :not(.mx) { visibility: hidden" src/styles/machine.css` → `0`.

### Step 2: Hide each heading's twin line from the accessibility tree

Add `aria-hidden="true"` directly after `class="mx"` in each of these, and change nothing else on the lines:

- `src/pages/about.astro:24`, `:29`, `:33` — `<p class="mx" set:html=` becomes `<p class="mx" aria-hidden="true" set:html=`
  (three lines; only the `<p class="mx"` that directly follows `</h1>` or `</h2>`).
- `src/pages/cards.astro:15` — the same change, once.
- `src/pages/404.astro:7` — `<p class="mx"># Not found</p>` becomes `<p class="mx" aria-hidden="true"># Not found</p>`.
- `src/pages/cards/[id].astro:36` — the helper becomes:

```astro
const hd = (md: string) => `<p class="mx" aria-hidden="true">${mdHtml(md)}</p>`;
```

Do not add `aria-hidden` to any other `.mx` element: the others replace text that is hidden, and must stay readable.

**Verify**: `grep -c '</h[12]><p class="mx" aria-hidden="true"' src/pages/about.astro src/pages/cards.astro src/pages/404.astro`
→ `src/pages/about.astro:3`, `src/pages/cards.astro:1`, `src/pages/404.astro:1`.

### Step 3: Name the home page's brand link

In `src/components/Header.astro:14`, replace

```astro
aria-label={home ? undefined : 'Kevin Liu, every card'}
```

with

```astro
aria-label={home ? 'Kevin Liu' : 'Kevin Liu, every card'}
```

**Verify**: `grep -c "home ? 'Kevin Liu' : 'Kevin Liu, every card'" src/components/Header.astro` → `1`.

### Step 4: Make the one-way buttons plain buttons

1. `src/layouts/Base.astro:69-70` become:

```astro
<button type="button" class="skip skipmode" data-mode-go="machine">Machine view</button>
<button type="button" class="skip skipmode" data-mode-go="human">Human view</button>
```

2. `src/components/Footer.astro:24` becomes:

```astro
    <button type="button" class="tomachine" data-mode-go="machine">Machine</button>
```

   and `src/components/Footer.astro:35` becomes:

```astro
      <button type="button" class="tohuman" data-mode-go="human">Human</button>
```

3. In `src/styles/machine.css:21`, replace both `data-mode-set` with `data-mode-go`, so the line reads:

```css
:root:not([data-mode='machine']) .skipmode[data-mode-go='human'], :root[data-mode='machine'] .skipmode[data-mode-go='machine'] { display: none; }
```

4. In the long script on `src/layouts/Base.astro:81`, make exactly two replacements. Each "find" text occurs once.

   Find:

```js
var b=e.target.closest&&e.target.closest('[data-mode-set]');if(!b)return;var m=b.dataset.modeSet,
```

   Replace with:

```js
var b=e.target.closest&&e.target.closest('[data-mode-set],[data-mode-go]');if(!b)return;var m=b.dataset.modeSet||b.dataset.modeGo,
```

   Find:

```js
var v=[].filter.call(document.querySelectorAll('[data-mode-set]'),
```

   Replace with:

```js
var v=[].filter.call(document.querySelectorAll('[data-mode-set],[data-mode-go]'),
```

   Leave the two `document.querySelectorAll('[data-mode-set]').forEach(function(x){x.setAttribute('aria-pressed',`
   pieces as they are: after the rename they reach only the header pair, which is what is wanted.

**Verify**: `grep -c 'data-mode-set' src/components/Footer.astro` → `0`.
**Verify**: `grep -o "data-mode-go" src/layouts/Base.astro | wc -l` → `4` (two buttons, two script selectors).
**Verify**: `grep -rn 'aria-pressed="false"' src/components/Footer.astro src/layouts/Base.astro | wc -l` → `0`.

### Step 5: Build and check the pages

Run `pnpm install --frozen-lockfile`, then `pnpm build`.

**Verify**: the last line ends `all checks pass` (the guard still finds exactly one `h1` on every page).
**Verify** (twin lines are hidden from the tree, on four kinds of page):

```
for f in dist/about.html dist/cards.html dist/404.html dist/cards/atlas.html; do echo "$f $(grep -o '</h[12]><p class="mx">' $f | wc -l | tr -d ' ') $(grep -o '</h[12]><p class="mx" aria-hidden="true">' $f | wc -l | tr -d ' ')"; done
```

→ `dist/about.html 0 3`, `dist/cards.html 0 1`, `dist/404.html 0 1`, `dist/cards/atlas.html 0 5`.

**Verify**: `grep -c '<a class="brand" href="/" aria-label="Kevin Liu">' dist/index.html` → `1`.
**Verify**: `grep -o '<button[^>]*data-mode-go="[a-z]*"[^>]*>' dist/about.html | wc -l` → `4`, and
`grep -o '<button[^>]*data-mode-go[^>]*>' dist/about.html | grep -c aria-pressed` → `0`.
**Verify**: `grep -o '<button[^>]*data-mode-set="[a-z]*"[^>]*>' dist/about.html | wc -l` → `2` (the header pair).

### Step 6: Check the accessibility tree and the layout in a browser

Serve the build (`pnpm preview --port 4397 --host 127.0.0.1 &`, wait for `200`). Stop it by
`pnpm exec astro preview stop` when this step ends. Never stop a server or browser you did not start.

**6a. The accessibility tree (needs `agent-browser`; run `which agent-browser`).**

```
export AGENT_BROWSER_SESSION=plan-007
agent-browser open http://127.0.0.1:4397/about
agent-browser eval "localStorage.setItem('ill-mode','machine'); location.reload(); 'ok'"
agent-browser wait 4000
agent-browser eval "document.documentElement.dataset.mode"
agent-browser snapshot | grep -c 'heading'
agent-browser snapshot | grep -c 'StaticText "# About Kevin Liu"'
agent-browser open http://127.0.0.1:4397/
agent-browser wait 6000
agent-browser snapshot | grep -c 'heading "Kevin Liu" \[level=1'
agent-browser snapshot | grep -c 'link "Kevin Liu"'
agent-browser open http://127.0.0.1:4397/cards/atlas
agent-browser wait 4000
agent-browser snapshot | grep -c 'heading'
agent-browser snapshot | grep -c 'pressed'
agent-browser close
```

**Verify**, in order: `"machine"`; `3` (was `0` before this plan); `0` (the twin line is no longer read as text);
`1`; `1` (was a nameless `link` before); `5`; and the last count is at most `1` (only the header's pressed Machine
button may say `pressed`; before this plan the hidden footer and skip buttons carried the state too).

The home page's two counts depend on how the snapshot prints a heading inside a named link. If either is not `1`,
print the top of the tree (`agent-browser snapshot | sed -n '1,8p'`): the check passes when the banner's first link
reads `link "Kevin Liu"`, and fails when it is a bare `link` with no name.

If `agent-browser` is missing, record "accessibility snapshot not run" in your report and in `memory.md`, and go on.

**6b. Layout: switching still moves nothing (`scripts/machine-check.mjs`).** It needs a `playwright-core` folder
whose browsers are installed; this Mac has several, for example the first line of
`ls -d ~/repos/*/node_modules/playwright-core`. It takes two URLs (a build to compare against, and this build). Pass
this build for both: the comparison of the Human view against another build is then empty, and the checks that
matter here (every region's box in both views, the switch by keyboard, focus, no sideways scroll) run in full.

```
PW=$(ls -d ~/repos/*/node_modules/playwright-core | head -1)
ENGINE=chromium PLAYWRIGHT_CORE=$PW node scripts/machine-check.mjs http://127.0.0.1:4397 http://127.0.0.1:4397 "$TMPDIR/plan-007-mc"
node -e '
const r = JSON.parse(require("fs").readFileSync(process.argv[1] + "/report.json", "utf8"));
const bad = [...(r.failed ?? []),
  ...r.toggle.filter((t) => t.mode !== "machine" || t.keptAfterReload !== "machine" || t.backTo !== "human" || t.movedCount !== 0 || t.hscroll > 0).map((t) => t.page + " " + JSON.stringify({ mode: t.mode, kept: t.keptAfterReload, back: t.backTo, moved: t.movedCount, hscroll: t.hscroll }))];
console.log(bad.length ? "FAIL\n" + bad.join("\n") : "machine-check: " + r.toggle.length + " page and width pairs pass");
process.exit(bad.length ? 1 : 0);' "$TMPDIR/plan-007-mc"
```

**Verify**: the last command prints `machine-check: 16 page and width pairs pass` and exits 0. (16 = 4 pages at 4
widths. The run takes several minutes on a busy machine.)

If the browser will not launch (`PLAYWRIGHT_CORE` has no matching browser build), try the next folder that
`ls -d ~/repos/*/node_modules/playwright-core` lists, once. If that fails too, record "machine-check not run" with
the error line and go on; do not install anything.

To also compare the Human view pixel by pixel with production's code (optional, for a reviewer): build `origin/main`
in a second worktree (`git -C ~/repos/kevinliu-studio worktree add --detach ~/repos/kevinliu-studio-007-before origin/main`,
then `pnpm install --frozen-lockfile && pnpm build && pnpm preview --port 4398 --host 127.0.0.1 &` inside it), pass
`http://127.0.0.1:4398` as the first URL, and remove that worktree afterwards. It needs about 1 GB of disk; run
`df -h /System/Volumes/Data` first and skip it under 32 GB free.

### Step 7: Keep the doc true, record and commit

In `docs/architecture.md`, in the bullet quoted in "Current state" (lines 72-74), insert one sentence after
"crawlers read one title." so it reads:

```
- Headings keep one text: a heading's twin line is laid over the heading's own box (`.hw`), so every page still has
  one h1 and crawlers read one title. In the Machine view the heading's text is cleared, not hidden, and its twin
  line is `aria-hidden`, so a screen reader finds the same headings in both views. A card page's lists are one framed
  panel each (`.sl`), so their lines share the room their tiles take.
```

Append an entry to the end of `memory.md` in the file's existing shape (a `## 2026-MM-DD: <title> (<branch>, <agent>)`
heading, then `- **Type**:`, `- **Changed**:`, `- **Checked**:`, `- **Open**:` bullets). Under Checked give the
numbers from steps 5 and 6 and say which of 6a and 6b ran. Under Open write: "the footer's and the skip links' view
buttons are now `data-mode-go`; on the home page they play the plain tap sound (gallery.js's mode sound is bound to
`data-mode-set`); not checked with VoiceOver".

Commit by explicit path (every file in "In scope" that changed) with the message in "Git workflow".

**Verify**: `git status --short` → empty.

## Test plan

- No test runner exists in this repo, so the checks are commands: the `dist` greps in step 5 (four kinds of page),
  the accessibility snapshot counts in step 6a (headings 0 → 3 on `/about`, 0 → 5 on a card page, the home link
  named) and `scripts/machine-check.mjs` in step 6b (16 page and width pairs: nothing moves when the view switches,
  the stored view survives a reload, the switch back works, no sideways scroll).
- The regression this plan fixes is the snapshot count in 6a; it is `0` on production today.
- Verification: `pnpm build` ends `all checks pass`, and the step 5 loop prints the four expected lines.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` ends with `all checks pass`
- [ ] `grep -c ".hw > :not(.mx) { visibility: hidden" src/styles/machine.css` → `0`
- [ ] the step 5 loop prints `dist/about.html 0 3`, `dist/cards.html 0 1`, `dist/404.html 0 1`, `dist/cards/atlas.html 0 5`
- [ ] `grep -c '<a class="brand" href="/" aria-label="Kevin Liu">' dist/index.html` → `1`
- [ ] `grep -o '<button[^>]*data-mode-go[^>]*>' dist/about.html | grep -c aria-pressed` → `0`
- [ ] step 6a's `/about` heading count is `3` in the Machine view, or the step is recorded as not run
- [ ] step 6b prints `machine-check: 16 page and width pairs pass`, or the step is recorded as not run
- [ ] `git diff --name-only origin/main...HEAD -- public vendor scripts` prints nothing
- [ ] `git diff --name-only origin/main...HEAD` lists only the files in "In scope"
- [ ] `plans/README.md` status row updated (name any check that was not run)

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt in "Current state" does not match the file (for example the Machine view was reworked, or the i18n
  branch changed these pages).
- Either "find" text in step 4 occurs zero times or more than once on `Base.astro:81`.
- `pnpm build` reports a page with a number of `h1` elements other than one.
- Step 6a shows the heading text painted on screen in the Machine view (take `agent-browser screenshot` of `/about`
  in the Machine view and look: the title must appear once, in the terminal face, not doubled).
- Step 6b reports `movedCount` above 0 for any pair: the change moved a box, which the Machine view forbids.
- The fix appears to need an edit under `public/` or to `scripts/sync.mjs`.

## Maintenance notes

- A new heading on any page must follow the same pattern: `<div class="sw hw"><hN>…</hN><p class="mx" aria-hidden="true">…</p></div>`.
  A twin line without `aria-hidden` would be read twice in the Machine view.
- `color: transparent` leaves the heading findable by the browser's find-in-page while invisible. `forced-color-adjust:
  none` keeps it invisible in Windows high-contrast mode; if the Machine view ever gets its own forced-colors styling,
  check that the heading does not show through.
- New view buttons that only switch one way use `data-mode-go`; a real two-state toggle uses `data-mode-set` with
  `aria-pressed`. `public/ex/gallery.js` (round code) knows only `data-mode-set`, so on the home page a
  `data-mode-go` button plays the ordinary tap sound, not the mode sound. If Kevin wants the mode sound there, the
  rounds' `r4/ex/gallery.js` click handler is the place.
- `scripts/machine-check.mjs` reports `pressed` for `[data-mode-set]` buttons only; that now means the header pair.
- A reviewer should look at `/about` and a card page in the Machine view at 1440 and 390 wide, and run VoiceOver
  once over the header. Deferred: keyboard access to Machine boxes that scroll (`[data-over]`), and the tripled text
  an HTML-to-text reader gets from the Human and Machine forms.
