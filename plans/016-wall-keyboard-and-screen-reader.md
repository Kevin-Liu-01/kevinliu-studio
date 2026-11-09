# Plan 016: The wall's Play shortcut, status messages, rival team and lens close work for keyboard and screen-reader users

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report: do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs public/ex/gallery.js public/ex/markup.js sync.lock.json docs/sync.md`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (four one-line patches; Play still works by Tab and Enter, and by P while focus is in the dock)
- **Depends on**: none
- **Category**: bug (accessibility)
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Four defects on the home page (the wall) for people who use a keyboard, speech input or a screen reader:

1. **A bare "P" anywhere on the page starts the battle.** Once both teams exist, pressing P with focus anywhere
   (outside a text field) leaves for `/battle`. A single-character shortcut that cannot be turned off and is not tied
   to focus fails WCAG 2.1.4 (Level A): a dictated word or a stray key navigates away.
2. **The rival team is never announced after a pack.** The page's status line is cleared and rewritten on every
   message; opening a pack sends "Rival: ..." and then "Pack: ..." in the same instant, so the first is replaced
   before a screen reader speaks it.
3. **The dock never exposes the rival team.** The rival's three wells hold card copies marked `aria-hidden`, and
   their container's `aria-label="Rival"` sits on a plain `<div>` with no role, which assistive technology ignores.
4. **Focus can land off screen when the lens closes.** In the lens (the enlarged card) the arrow keys step through
   all 26 cards without scrolling the wall; on Escape the card flies back to its pocket and takes focus with
   `preventScroll`, so a keyboard user's focus ring is somewhere they cannot see (WCAG 2.4.7 in practice).

All four are in round code: `r4/ex/gallery.js` (the rounds' **room** lane) and `r4/ex/markup.js` (the **face** lane).
This site may not edit synced round files or write in the rounds, so the fixes ship here as anchored patches in
`TRANSFORMS` (`scripts/sync.mjs`), and the same changes go to the rounds as requests (section "Upstream request").

## Current state

Files and roles:

- `public/ex/gallery.js`: the wall's state and wiring. **Synced from the rounds (`r4/ex/gallery.js`, pinned at rounds
  commit `30e69931`). Never edit it by hand.**
- `public/ex/markup.js`: the rounds' card and dock printer; the site runs it at build to print the wall's HTML.
  **Synced (`r4/ex/markup.js`). Never edit it by hand.**
- `scripts/sync.mjs`: copies round files in; `TRANSFORMS` holds the only edits, as anchored text patches. `patch(file,
  text, pairs)` (`scripts/sync.mjs:148-155`) applies each `[find, replace]` pair in order and throws unless `find`
  occurs **exactly once**. The helper `after(add)` returns a function that appends `add` to the anchor.
- `sync.lock.json`: every synced file's sha-256; the sync rewrites it.

The four places, in the shipped copies (line numbers at rounds HEAD `868340d7` in brackets; the text is identical
there and in the pinned source):

1. The shortcut, `public/ex/gallery.js:966-972` [`r4/ex/gallery.js:1026`]:

   ```js
     document.addEventListener('keydown', (e) => {
       if (e.key === 'Escape') {
         ...
       } else if ((e.key === 'p' || e.key === 'P') && !e.target.closest('input, textarea') && !I.id && !e.metaKey && !e.ctrlKey) { play(); }
     });
   ```

   The Play button advertises it, `public/ex/markup.js:582`: `... aria-label="${ready ? 'Play' : 'Play, Pick Three'}" aria-keyshortcuts="P">`.
   That attribute stays: it will be true whenever focus is on the button.

2. The status line, `public/ex/gallery.js:57-59` [`r4/ex/gallery.js:55`]:

   ```js
     // one status line for the page and one inside the inspect dialog (aria-modal): a message goes where focus is
     const status = $('#status'), insStatus = $('#ins-status');
     const say = (text) => { const s = insStatus && root.classList.contains('inspecting') ? insStatus : status; status.textContent = ''; if (insStatus) insStatus.textContent = ''; setTimeout(() => (s.textContent = text), 30); };
   ```

   A pack calls it twice at once: `formRival()` says `Rival: ...` (`public/ex/gallery.js:534`) and the pack then says
   `Pack: ...` (`public/ex/rituals.js:958`, and `:825` under reduced motion).

3. The rival side. `public/ex/markup.js:600` [`r4/ex/markup.js:617`]:

   ```js
   <div class="side rival" aria-label="Rival">${wells('rival')}</div>
   ```

   and the loop that fills the rival's wells, `public/ex/gallery.js:470-486` [`r4/ex/gallery.js:503-519`]; its last
   lines are:

   ```js
         w.classList.toggle('full', !!id);
       });
       const g = $('.gauge');
   ```

   (The loop for your own wells, just above, ends differently: it sets `aria-label`, `tabIndex` and `disabled`.) A
   well's card copy is hidden from assistive technology by `copyOf()` (`public/ex/gallery.js:111-117`,
   `el.setAttribute('aria-hidden', 'true')`). `titleOf(id)` gives a card's title.

4. The lens close, `public/ex/gallery.js:926-930` [`r4/ex/gallery.js:984`]:

   ```js
       closed(id) {
         setInert(false, id);
         for (const n of [behind, cards[id].pocket]) if (n.inert) { n.inert = false; inertTodo = inertTodo.filter((x) => x !== n); }
         focusSoon(() => { if (!I.id) cards[id].el.focus({ preventScroll: true }); });
       },
   ```

The existing patches for these two files: the `'public/ex/gallery.js'` entry starts at `scripts/sync.mjs:265` and its
array ends (lines 287-288) with

```js
    ['    frs.hidden = !F || F.length < 2;', '    frs.hidden = true;'],
  ]),
```

and the `'public/ex/markup.js'` entry is `scripts/sync.mjs:237-240`:

```js
  'public/ex/markup.js': (t) => patch('markup.js', t, [
    ['<a class="press visit" target="_blank" rel="noopener" href="#">', '<a class="press visit" target="_blank" rel="noopener">'],
    nolink(t),
  ]),
```

Checked on 2026-11-09: each of the five anchors used below occurs exactly once in the pinned source
(`git show 30e69931:r4/ex/gallery.js` and `.../markup.js`), in the shipped copy and at rounds HEAD, and no existing
pair rewrites them.

Repo rules that apply (from `AGENTS.md`): synced folders (`public/ex`, `public/battle`, `public/sound`, `public/og`,
`vendor/`) are never edited by hand; a fix to round code is an anchored patch in `TRANSFORMS`, then the sync command
rewrites the synced file and `sync.lock.json`, and they are committed together; never write in the rounds folder;
append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Sync | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs` | last line `synced from 30e69931 + 42ff51c7: 2 written, 0 removed` |
| Build and release guard | `pnpm build` | last line `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` |
| Serve `dist/` | `pnpm preview --port 4416 --host 127.0.0.1` (in the background) | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4416/` prints `200` (may take 30 s) |
| Stop the serve | `pnpm exec astro preview stop` | prints `Stopped preview server` |

There is no test suite and no lint. `pnpm check` is broken on `main`; do not run it. A plain `pnpm sync` fails by
design; always use the `ROUNDS=` form.

## Scope

**In scope** (the only files you should modify):

- `scripts/sync.mjs` (pairs added to two existing `TRANSFORMS` entries)
- `public/ex/gallery.js`, `public/ex/markup.js`, `sync.lock.json` (**only through the sync command**)
- `docs/sync.md` (one bullet)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):

- Anything in the rounds folder.
- The lens's own keys (A, F, arrows): they act only while the lens has focus, which WCAG 2.1.4 allows.
- `aria-keyshortcuts="P"` in `markup.js`: it stays.
- `public/ex/rituals.js` and its `say(...)` calls.
- The battle page's keys (`public/battle/shared/battle.js`): a separate plan.
- The pause key, the lens's history and the page title: plan 017.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/016-wall-keyboard-and-screen-reader`
  cut from `origin/main`: `git -C ~/repos/kevinliu-studio fetch origin && git -C ~/repos/kevinliu-studio worktree add -b improve/016-wall-keyboard-and-screen-reader ~/repos/kevinliu-studio-016 origin/main`.
  Never edit the main checkout. Never use `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`.
- Message style, from this repo's log: `fix(sound): no sound fetched before the first gesture on the battle`. Use
  `fix(wall): Play's key only from the dock, every status message spoken, the rival named, focus in view after the lens`.
- Do NOT push, open a PR or deploy.

## Upstream request (for the rounds lane)

The executor does not apply this. Copy this whole section, word for word, into your final report so Kevin or the
rounds' lanes can apply it. When a later pinned commit carries these changes, the site's patches stop matching and are
deleted (see "Maintenance notes").

Lanes: **r4/ex room** (`gallery.js`) and **r4/ex face** (`markup.js`), `r4/ex/OWNERS.md`. Request lines, in the rounds'
format (`r4/ex/REQUESTS.md`):

```
site -> room: gallery.js: the document keydown's P shortcut runs play() only when e.target is inside .dock, because a bare single-key shortcut from anywhere on the page fails WCAG 2.1.4 (a dictated word leaves for the battle)
site -> room: gallery.js: say() joins the messages that arrive inside its 30 ms window into one line, because a pack's "Rival: ..." is replaced by "Pack: ..." in the same instant and is never spoken
site -> room: gallery.js: teamChanged() gives each filled rival well role="img" and aria-label=<the card's title> (and removes both when it empties), because the wells' copies are aria-hidden and the rival team is not exposed anywhere in the dock
site -> room: gallery.js: closed(id) scrolls the card into view (block: nearest) before focusing it when it is off screen, because the lens's arrow keys step to cards the wall has not scrolled to; better still, scroll the wall in stepped() so the close flight lands on screen
site -> face: markup.js: the dock's rival side is <div class="side rival" role="group" aria-label="Rival">, because aria-label on a div without a role is ignored
```

Source edits at rounds HEAD `868340d7`:

- `r4/ex/gallery.js:1026`: `(e.key === 'p' || e.key === 'P') && !e.target.closest('input, textarea')` becomes
  `(e.key === 'p' || e.key === 'P') && e.target.closest && e.target.closest('.dock')`.
- `r4/ex/gallery.js:55`: the `const say = ...` line becomes the two lines given in Step 2 below.
- `r4/ex/gallery.js:517` (the last statement of the `wells.rival.forEach` loop, `w.classList.toggle('full', !!id);`):
  add after it the line given in Step 3 below.
- `r4/ex/gallery.js:984`: the `focusSoon(...)` line becomes the line given in Step 4 below.
- `r4/ex/markup.js:617`: `<div class="side rival" aria-label="Rival">` becomes
  `<div class="side rival" role="group" aria-label="Rival">`.

## Steps

### Step 0: Pre-flight

1. `ls $HOME/k7-rescue/release-next/rounds-42ff51c7/r4/ex/gallery.js` prints the path.
2. `pnpm install --frozen-lockfile`
3. `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check`

**Verify**: step 3 prints `in sync`. If not, STOP.

All four `gallery.js` pairs below go into the existing `'public/ex/gallery.js'` array in `scripts/sync.mjs`, **after**
the pair `['    frs.hidden = !F || F.length < 2;', '    frs.hidden = true;'],` and before the array's closing `]),`.
Add a comment line above each pair as shown.

### Step 1: Play's key acts only from the dock

Add:

```js
    // the bare P key played from anywhere on the page (WCAG 2.1.4); it plays while focus is in the dock, where the Play
    // button announces it (aria-keyshortcuts)
    ["(e.key === 'p' || e.key === 'P') && !e.target.closest('input, textarea')", "(e.key === 'p' || e.key === 'P') && e.target.closest && e.target.closest('.dock')"],
```

**Verify**: `node --check scripts/sync.mjs` exits 0.

### Step 2: Messages that arrive together are spoken together

Add:

```js
    // a pack says "Rival: ..." and "Pack: ..." in the same instant, and each say() cleared the line the other had asked
    // for; the messages of one 30 ms window now go out as one line
    ["  const say = (text) => { const s = insStatus && root.classList.contains('inspecting') ? insStatus : status; status.textContent = ''; if (insStatus) insStatus.textContent = ''; setTimeout(() => (s.textContent = text), 30); };", "  let sayQ = [], sayT = 0;\n  const say = (text) => { const s = insStatus && root.classList.contains('inspecting') ? insStatus : status; status.textContent = ''; if (insStatus) insStatus.textContent = ''; sayQ.push(text); clearTimeout(sayT); sayT = setTimeout(() => { s.textContent = sayQ.join('. '); sayQ = []; }, 30); };"],
```

Both strings start with exactly two spaces. Inside the replacement, `\n` is the two characters backslash and n (the
strings are in double quotes, so JavaScript turns it into a line break).

**Verify**: `node --check scripts/sync.mjs` exits 0.

### Step 3: The rival's wells name their cards

Add:

```js
    // the rival's wells hold copies hidden from assistive technology (copyOf), so each filled well names its card
    ["      w.classList.toggle('full', !!id);\n    });\n    const g = $('.gauge');", "      w.classList.toggle('full', !!id);\n      if (id) { w.setAttribute('role', 'img'); w.setAttribute('aria-label', titleOf(id)); } else { w.removeAttribute('role'); w.removeAttribute('aria-label'); }\n    });\n    const g = $('.gauge');"],
```

The anchor is three lines (six spaces, then four, then four); it is unique because only the rival's loop ends with
`toggle('full', !!id);` directly before `});`.

Then, in the `'public/ex/markup.js'` entry, add a pair between the first pair and `nolink(t),`:

```js
    // aria-label on a div without a role is ignored: the rival's side is a group
    ['<div class="side rival" aria-label="Rival">', '<div class="side rival" role="group" aria-label="Rival">'],
```

**Verify**: `node --check scripts/sync.mjs` exits 0.

### Step 4: The card is in view when it takes focus back

Add to the `gallery.js` array:

```js
    // the lens's arrow keys step to cards the wall has not scrolled to; the card that takes focus back comes into view
    ["      focusSoon(() => { if (!I.id) cards[id].el.focus({ preventScroll: true }); });", "      focusSoon(() => { if (!I.id) { const el = cards[id].el, r = el.getBoundingClientRect(); if (r.bottom <= 0 || r.top >= innerHeight) el.scrollIntoView({ block: 'nearest' }); el.focus({ preventScroll: true }); } });"],
```

Both strings start with exactly six spaces.

**Verify**: `node --check scripts/sync.mjs` exits 0.

### Step 5: Sync

```sh
ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs
```

**Verify**, all of:

- the last line is `synced from 30e69931 + 42ff51c7: 2 written, 0 removed` (a line `N problem(s); nothing was written`
  names an anchor that did not match exactly once: STOP, do not loosen it);
- `node --check public/ex/gallery.js && node --check public/ex/markup.js` exits 0;
- `grep -c "e.target.closest('.dock')" public/ex/gallery.js` prints `1`;
- `grep -c "sayQ.join" public/ex/gallery.js` prints `1`;
- `grep -c "w.setAttribute('role', 'img')" public/ex/gallery.js` prints `1`;
- `grep -c "scrollIntoView({ block: 'nearest' }); el.focus" public/ex/gallery.js` prints `1`;
- `grep -c 'class="side rival" role="group" aria-label="Rival"' public/ex/markup.js` prints `1`;
- this exits 0 and prints `Rival: A. Pack: B`:

  ```sh
  node -e '
  const src=require("fs").readFileSync("public/ex/gallery.js","utf8");
  const lines=src.split("\n").filter((l)=>/^  (let sayQ = |const say = )/.test(l)).join("\n");
  const status={textContent:""}, insStatus={textContent:""}, root={classList:{contains:()=>false}};
  const say=new Function("status","insStatus","root", lines+"\nreturn say;")(status,insStatus,root);
  say("Rival: A"); say("Pack: B");
  setTimeout(()=>{console.log(status.textContent);process.exit(status.textContent==="Rival: A. Pack: B"?0:1)},100);'
  ```

### Step 6: Build and check in a browser

`pnpm build` (expect the guard's `all checks pass` line), then
`grep -c 'class="side rival" role="group" aria-label="Rival"' dist/index.html` must print `1`.

Start the serve in the background (`pnpm preview --port 4416 --host 127.0.0.1 > /tmp/016-preview.log 2>&1 &`), wait
for `200`, then:

```sh
export AGENT_BROWSER_SESSION=plan-016
agent-browser open "http://127.0.0.1:4416/#you=katagami,mailroom,agent-pets&rival=bday-land,powerlifting,elo&seed=30"
sleep 12
# (a) the rival is exposed
agent-browser eval "JSON.stringify({side: document.querySelector('.dock .side.rival').getAttribute('role'), wells: [...document.querySelectorAll('.dock .rival .well')].map(w => w.getAttribute('role') + ':' + w.getAttribute('aria-label')), play: document.querySelector('#play').getAttribute('aria-label')})"
# (b) P from the page does nothing
agent-browser eval "document.activeElement.blur(); document.body.focus(); 1"
agent-browser press p
sleep 4
agent-browser get url
# (c) P from the dock plays
agent-browser focus "#play"
agent-browser press p
sleep 8
agent-browser get url
agent-browser close
pnpm exec astro preview stop
```

**Verify**:

- (a) prints `side` `group`, three `wells` entries of the form `img:<a card's title>`, and `play` `Play`. If `play`
  is `Play, Pick Three` the teams in the address were not accepted: STOP and report what (a) printed;
- (b) the address still ends `/#you=katagami,mailroom,agent-pets&rival=bday-land,powerlifting,elo&seed=30` (the path
  is still `/`);
- (c) the address now contains `/battle#team=katagami,mailroom,agent-pets`;
- after the stop, `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4416/` prints `000`.

The lens's focus fix (Step 4) has no reliable headless check (the lens's flight needs the GPU path). In your report
ask the operator to try it: on the wall, Tab to the first card, Enter, press the right arrow twenty times, Escape; the
card that takes focus must be on screen.

If `agent-browser` is not installed, skip the browser block, say so in the report, and rely on Step 5's checks.

### Step 7: Record it and commit

1. `docs/sync.md`, the "Transforms" list: after the bullet that starts
   `` - `gallery.js`, `rituals.js`: the sound hooks `` (and its continuation line) add:
   `` - `gallery.js`, `ex/markup.js`: Play's P key acts only from the dock, messages sent together are spoken as one line, the rival's side is a group whose wells name their cards, and the card that takes focus back from the lens scrolls into view. ``
2. Append an entry to `memory.md` in the style of its last entries: date, type `fix`, the changed files, the four
   defects in one line each, and under Open: "the same changes are requested upstream (plans/016); the lens's focus
   check needs a person".
3. Commit by explicit path: `scripts/sync.mjs public/ex/gallery.js public/ex/markup.js sync.lock.json docs/sync.md memory.md`.

**Verify**: `git status --short` prints nothing;
`ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`. Put the
"Upstream request" section, word for word, in your report.

## Test plan

No test suite exists. The checks are: the sync's anchor contract (five anchors, each exactly once), `node --check` on
both patched files, the `say()` simulation in Step 5 (exits 1 when two messages are not joined), the built dock's
`role="group"`, and the browser checks (a) to (c) in Step 6. The lens's focus fix is checked by a person.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`
- [ ] `pnpm build` ends with `verify-build: ... all checks pass`
- [ ] the five `grep -c` checks in Step 5 each print `1`
- [ ] the `say()` simulation in Step 5 exits 0
- [ ] `grep -c 'class="side rival" role="group" aria-label="Rival"' dist/index.html` prints `1`
- [ ] `grep -c 'aria-keyshortcuts="P"' public/ex/markup.js` prints `1` (unchanged)
- [ ] `git diff --stat origin/main..HEAD` lists only the in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `$HOME/k7-rescue/release-next/rounds-42ff51c7` is missing, the sync check does not print `in sync` before your
  first edit, or the sync prints `problem(s); nothing was written`.
- The code at the locations in "Current state" does not match the excerpts.
- In Step 6, (b) leaves the wall (P still plays from the page) or (c) does not reach `/battle`.
- A fix seems to need a hand edit under `public/ex/`, or any write in the rounds folder.
- `pnpm build` fails twice after a reasonable fix attempt.

## Maintenance notes

- These five pairs are interim. When the rounds apply the upstream request and a release moves the `cards` pin past
  it, each anchor stops matching, `pnpm sync` stops and names it, and the pair is deleted in the same commit as the
  pin move. Do not rewrite an anchor to match the new text.
- The home page's dock is printed at build by `markup.js`, so the `role="group"` change shows up in `dist/index.html`
  only after a build.
- The Machine view fills the same wells with its own text (`src/pages/index.astro`, the `data-live="slot"` spans); a
  reviewer should switch to it once and see the rival's ids still print.
- Plan 017 adds more pairs to the same `gallery.js` array; land this plan first, or expect a small merge conflict at
  the end of that array.
- Deferred: scrolling the wall as the lens steps (so the close flight lands on screen) is the better fix and belongs
  to the rounds' room lane; it is in the upstream request.
