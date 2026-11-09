# Plan 027: Kevin answers every open logo question on one sheet, and the answers reach the cards' lane

> **Executor instructions**: This is a design plan in two parts. Part 1 builds one decision sheet for Kevin and stops.
> Part 2 runs only when the operator hands you Kevin's answers. You never edit a card file. Follow the steps in
> order, run every verification command, and confirm the expected result before moving on. If anything in "STOP
> conditions" occurs, stop and report; do not improvise. When done, update the status row for this plan in
> `plans/README.md`, unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git -C "/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30" log --oneline 868340d7..HEAD -- r4/ex/art/pop/kevin-wiki.json r4/ex/art/pop/dedalus-terminal.json r4/ex/art/pop/podium.json r4/ex/media/kevin-wiki r4/ex/media/dedalus-terminal r4/ex/media/podium r4/ex/fighters.js r4/ex/EX.md`
> If it prints commits, re-read the "Current state" excerpts against the live files; if a `decide` line quoted below is
> gone or already answered, drop that question from the sheet and say so in your report.

## Status

- **Priority**: P2 (direction; Kevin's first goal is "26 cards, each with its real logo")
- **Effort**: S for Part 1 (the sheet); M for Part 2 and the card work it requests (done by the cards' lane, not here)
- **Risk**: LOW (reads only; nothing is written in the rounds)
- **Depends on**: none; must run after the session "Fix the ex cards' below-bar items to reach 90" has finished
- **Category**: direction
- **Planned at**: commit `c6245d9` (site), rounds HEAD `868340d7`, 2026-11-09

## Why this matters

Kevin's first goal is 26 loud collectible cards, "each with its real logo". The cards' own spec says the same:
`r4/ex/EX.md:9` ends "Each card prints the product's real logo". Today two of the 26 print something that is not the
product's logo because a decision is waiting on Kevin (Kevin Wiki, 050525), one logo has no recorded origin (Podium),
one card links a stand-in address until he decides (Sevenfold), and the logo-contrast test E15 is still PENDING with
11 marks under 3:1 on their tile. The questions are written down in five different files of the design rounds. Until
Kevin sees them together, at the size the logo prints, nobody can finish the logos. This plan puts them on one page
he can answer in a minute, then files his answers where the cards' owners will act on them.

## Current state

- Rounds repo (read-only, always):
  `/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30`, called `<rounds>` below. The cards live in
  `<rounds>/r4/ex`. Another session is writing `r4/ex` on 2026-11-09 (its last commit was at 14:30 that day).
- The rounds' rule (`<rounds>/r4/ex/OWNERS.md`): each file has one owning lane; anyone else appends one line to
  `r4/ex/REQUESTS.md` in the form `from -> to: file: change, because reason`. The site's rule (its `AGENTS.md`) is
  "Never write in the rounds folder", so you write those lines into this plan's result file and Kevin or the cards'
  own session files them.
- The site (`~/repos/kevinliu-studio`) only receives the cards through `pnpm sync` at a pinned rounds commit. Nothing
  in the site repo changes in this plan except the plan's own result file.

The logo tile's size (`<rounds>/r4/ex/card.css:281-283`): 9.2% of the card's width, so about 20 px on a 215 px wall
card and 44 px on a 480 px card.

```css
.card .logo {
  left: 1.4cqw; top: 1cqw; width: 9.2cqw; height: 9.2cqw; box-sizing: border-box; padding: 1.2cqw; border-radius: 1.6cqw; display: none;
  background: linear-gradient(153deg, var(--white) 0%, var(--m1) 38%, var(--m2) 100%);
```

The tile's metal, default values (`card.css:38`): `--m1: #f2f3f5; --m2: #cdd0d4; --white: #fff`.

The open questions, each quoted from its source:

1. **Kevin Wiki** (`<rounds>/r4/ex/art/pop/kevin-wiki.json:261`). The tile shows a stand-in graph emblem because
   every mark Kevin Wiki ships is Kevin's portrait on a circuit globe.
   ```
   "decide": "Kevin decides: (1) allow his own portrait logo in the logo tile on this card only, (2) print no logo (the tile shows the card's graph emblem, media/kevin-wiki/emblem.svg, which is not the logo), or (3) a portrait-free crop of the circuit globe, which would be a new drawing."
   ```
   Files: today's tile `r4/ex/media/kevin-wiki/logo.svg` (byte for byte the emblem,
   `r4/ex/media/kevin-wiki/emblem.svg`); the real mark `~/repos/Kevin-Wiki/ui/public/logo.svg` (and `logo.png`).
   Option 3 has no file: it would be a new drawing.
   **Content rule that binds this**: the site ships no real people's photos (site `AGENTS.md`, "Rules"). Option 1 is
   Kevin's own portrait, so it needs his explicit exception, in his own words. Do not decide it and do not treat any
   earlier remark as that exception.
2. **050525 (Dedalus Terminal)** (`<rounds>/r4/ex/art/pop/dedalus-terminal.json:8`).
   ```
   "decide": "Kevin: the cursor block (now), the title tile (media/dedalus-terminal/src/logo-title.png), or the favicon wing on this card only.",
   ```
   Files: now `r4/ex/media/dedalus-terminal/logo.svg` (ground `#0a1418`); the title tile
   `r4/ex/media/dedalus-terminal/src/logo-title.png`; the favicon `r4/ex/media/dedalus-terminal/src/logo-favicon-512.png`.
   The same file's receipt says the favicon "is the Dedalus Labs wing, third-party": label it so on the sheet.
3. **Podium** (`<rounds>/r4/ex/EX.md:528`, section 22 "For Kevin to decide", item 4).
   ```
   Podium's trophy (media/podium/logo.webp, its logo and its hero) has no recorded origin: Kevin committed it on 2025-10-02 (Podium 76c9aae) as public/trophy.png and favicon.ico with no author, tool, source site or licence in the repository, the commit or the PNG's own metadata. Kevin says whether he drew it, a tool made it or a stock site licensed it
   ```
   File: `r4/ex/media/podium/logo.webp`.
4. **Sevenfold's address** (`<rounds>/r4/ex/REQUESTS.md:140` and `r4/ex/fighters.js:2217`).
   ```
   EX.md roster row 23: sevenfold.so answers 404 DEPLOYMENT_NOT_FOUND (2026-11-01), so the entry links https://sevenfold-demo.vercel.app until Kevin decides.
   ```
5. **Logo contrast, test E15** (`<rounds>/r4/ex/EX.md:488`: status PENDING; the measurements in
   `<rounds>/r4/ex/REQUESTS.md:331`).
   ```
   its mean luminance against its own light metal tile is under 3:1 on 11 cards at their worst width (050525 1.28 at 120 to 140 px, Agent Machines 1.65, Mailroom 1.68, Loop 1.99, Sevenfold 2.03, Ariadne 2.08 on its own dark ground, Sandbox Arena 2.10, Princeton TD 2.16, Agent Pets 2.18, bday.land 2.31, Podium 2.48), and the tile against the bar ring around it reads 1.00 to 3.22:1 ... A darker keyline or bevel on the tile, or a per-card tile tone, would lift the tile against the bar
   ```
   This one is not a question for Kevin unless he wants a say in the fix (a darker keyline on every tile, or a tile
   tone per card). It is follow-up work for the cards' face lane, and it comes after questions 1 and 2, because their
   answers change two of the 11 marks.

Why the sheet is an HTML page and not a Markdown table: the choice is visual. Kevin has to see each candidate at
20 px and 44 px on the tile's metal, and Markdown can set neither a size nor a ground. The rounds already use this
form for his picks (`<rounds>/r4/stage/cot2/index.html`). The page lives outside both repositories, at
`~/k7-rescue/improve-audit/logo-decisions/`, because it holds Kevin's portrait mark, which must never enter the site
repo or any published page.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| Is the cards' lane quiet | `git -C "<rounds>" status --short -- r4/ex \| wc -l` and `git -C "<rounds>" log -1 --format=%cr -- r4/ex` | `0`, and a last commit at least 2 hours old |
| Is an address alive | `curl -s -o /dev/null -w '%{http_code}\n' -I <url>` | a status code (GET or HEAD only) |
| Logo-on-bar measure (Part 2) | `PORT=44110 node tools/art/logo-bar.mjs ~/k7-rescue/improve-audit/logo-bar` then `python3 tools/art/logo-test.py --bar ~/k7-rescue/improve-audit/logo-bar --json ~/k7-rescue/improve-audit/logo-bar/bar.json`, both from `<rounds>/r4/ex` | exit 0; a table of each card's mark contrast (the tool starts and stops its own server and one headless Chromium) |
| Site build (to confirm nothing that builds changed) | `pnpm build` in the site worktree | ends `verify-build: 32 pages, 31 sitemap URLs, ... all checks pass` |

## Scope

**In scope** (the only files you create or modify):
- `~/k7-rescue/improve-audit/logo-decisions/index.html` and copies of the candidate images beside it (create).
- `plans/results/027-logo-decisions.md` in your site worktree (create): the questions in words, the sheet's path, and
  later Kevin's answers and the request block.
- `plans/README.md` in your site worktree: this plan's status row.
- Part 2 only: scratch output under `~/k7-rescue/improve-audit/logo-bar/`.

**Out of scope** (do NOT touch):
- Every other path under `<rounds>`: no logo file, `art/pop/*.json`, `card.css`, `fighters.js`, `EX.md`. The lanes
  that own them make the changes.
- The site's synced folders and `scripts/sync.mjs`. The new logos reach the site at the next cards pin move, which the
  release session does.
- The site repo must never hold the portrait mark or the sheet. Do not copy `logo-decisions/` into any repository,
  and do not publish it anywhere (no Artifact, no deploy).
- Drawing option 3 for Kevin Wiki, or any new logo. A new drawing is the art lane's work after Kevin picks it.

## Git workflow

- Site worktree: `git -C ~/repos/kevinliu-studio worktree add -b improve/027-real-logos-decisions ~/repos/kevinliu-studio-027 origin/main`.
  Never edit the main checkout. Never `git stash`.
- Commit by explicit path as the noreply address, once after Part 1 and once after Part 2:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "docs(plans): the open logo decisions, on one sheet" -- plans/results/027-logo-decisions.md plans/README.md`
- In the rounds repo you write and commit nothing.
- Do NOT push, open a PR or deploy.

## Steps

### Part 1: the sheet

### Step 1: Confirm the cards' lane is quiet

Run the two "Is the cards' lane quiet" commands.

**Verify**: the first prints `0` and the second prints an age of 2 hours or more. Otherwise STOP (see STOP conditions).

### Step 2: Collect the candidates

```sh
D=~/k7-rescue/improve-audit/logo-decisions; mkdir -p "$D"
EX="/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30/r4/ex"
cp "$EX/media/kevin-wiki/logo.svg" "$D/kevin-wiki-2-emblem.svg"
cp ~/repos/Kevin-Wiki/ui/public/logo.svg "$D/kevin-wiki-1-portrait.svg"
cp "$EX/media/dedalus-terminal/logo.svg" "$D/050525-1-cursor.svg"
cp "$EX/media/dedalus-terminal/src/logo-title.png" "$D/050525-2-title.png"
cp "$EX/media/dedalus-terminal/src/logo-favicon-512.png" "$D/050525-3-favicon.png"
cp "$EX/media/podium/logo.webp" "$D/podium-trophy.webp"
for u in https://sevenfold.so https://sevenfold-demo.vercel.app; do printf '%s ' "$u"; curl -s -o /dev/null -w '%{http_code}\n' -I "$u"; done
```

Write down the two status codes; they go on the sheet with today's date.

**Verify**: `ls "$D" | wc -l` prints `6`. Both `curl` lines print a three-digit code.

### Step 3: Write the sheet

Create `~/k7-rescue/improve-audit/logo-decisions/index.html`: one self-contained page (inline CSS, no script, no
external request, images by relative path). Requirements:

- A title "Logo decisions for Kevin" with the date, and one line: "Answer with the option number for each question."
- One section per question, in this order: Kevin Wiki, 050525, Podium, Sevenfold, then a short note on E15.
- For questions 1 and 2, one row per option. Each row shows the candidate four times: in a 20 px tile and a 44 px
  tile (the sizes on a 215 px and a 480 px card), and each of those again at 4x zoom
  (`image-rendering: auto`; scale the tile with CSS `zoom` or `transform: scale(4)` so Kevin sees the real pixels
  enlarged). The tile is a square with `border-radius: 17%`, `padding: 13%`, and the card's metal:
  `background: linear-gradient(153deg, #fff 0%, #f2f3f5 38%, #cdd0d4 100%)`. For the 050525 cursor, whose file is a
  full tile on its own ground `#0a1418`, set `padding: 0` (the card prints it edge to edge).
- Under each option, its label and source in plain words, copied from "Current state":
  - Kevin Wiki 1: "Your portrait mark (the real logo). Needs your explicit exception to the no-photos-of-people rule,
    on this card only." Kevin Wiki 2: "The graph emblem (printed today; not the logo)." Kevin Wiki 3: "A portrait-free
    crop of the circuit globe. Does not exist yet; it would be a new drawing." (Option 3 shows an empty tile.)
  - 050525 1: "The terminal's block cursor (printed today)." 2: "The title 050525 (about 3 px tall at wall size)."
    3: "The favicon wing. It is the Dedalus Labs mark, a third party's."
- Podium: the trophy in both tile sizes, and the question "Where does this trophy come from? (a) I drew it, (b) a
  tool made it (which), (c) a stock site (which, and its licence)."
- Sevenfold: the two addresses with the status codes from Step 2 and the question "Which address should the card
  link? (a) sevenfold.so once it is live again, (b) keep sevenfold-demo.vercel.app, (c) another."
- E15: three sentences. 11 marks read under 3:1 on their light tile at wall size; the fix is a darker keyline on every
  tile or a tile tone per card; "Say if you prefer one, otherwise the cards' lane picks."
- No franchise names, no other person's name or photo, no employer name anywhere on the page.

**Verify**: `grep -c "<img" ~/k7-rescue/improve-audit/logo-decisions/index.html` prints 20 or more (5 pictured options
and the trophy, at two sizes, each also zoomed);
`grep -oE '(src|href)="[^"]+"' ~/k7-rescue/improve-audit/logo-decisions/index.html | grep -v 'sevenfold' | grep -c 'http'`
prints `0` (no external request).

### Step 4: Record the questions in the site worktree and stop

Write `plans/results/027-logo-decisions.md`: the five questions in words (no images), each with its options and its
source `file:line`, the sheet's absolute path
(`/Users/kevinliu/k7-rescue/improve-audit/logo-decisions/index.html`), the Sevenfold status codes with the date, and
an empty "Kevin's answers" table (question, answer, his words, date). Commit it. Set this plan's row in
`plans/README.md` to `IN PROGRESS (waiting for Kevin's answers)`. Report the sheet's path and stop. Part 2 needs
Kevin's answers.

**Verify**: `git status --short` in the site worktree is empty after the commit;
`git show --stat HEAD | grep -c "plans/"` prints `2`.

### Part 2: file the answers (only when the operator gives you Kevin's answers)

### Step 5: Write the answers down exactly

Fill the "Kevin's answers" table in `plans/results/027-logo-decisions.md` with his words, quoted, and the date. If the
answer to Kevin Wiki is option 1, the table must quote the sentence in which he allows his portrait on that card. If
there is no such sentence, treat Kevin Wiki as unanswered.

**Verify**: every answered row has a quote in the "his words" column.

### Step 6: Measure the logo contrast as it stands

Run Step 1's quiet check again. Then, from `<rounds>/r4/ex`, run the two "Logo-on-bar measure" commands. They write
only under `~/k7-rescue/improve-audit/logo-bar/`. Copy the per-card contrast table into the result file under
"E15 today", marking each mark under 3:1.

**Verify**: `ls ~/k7-rescue/improve-audit/logo-bar/bar.json` exists, and the result file lists every card with a
contrast number. If the tools fail twice, do not debug them: quote the 11 marks from `REQUESTS.md:331` under "E15 as
last measured (round ex.4)" and say the re-measure failed, with the error.

### Step 7: Write the request block for the cards' lane

Write into `plans/results/027-logo-decisions.md`, under a heading `## Upstream request (for the rounds lane r4/ex)`,
one line per answered question, in the rounds' form. Do not write in the rounds. Use these lines, filling the
bracketed parts from the answers:

```
improve-027 -> art: art/pop/kevin-wiki.json logo, media/kevin-wiki/logo.svg: Kevin's answer to the logo decide line is option [1|2|3] ("[his words]", [date]); [option 1: print ~/repos/Kevin-Wiki ui/public/logo.svg in the tile on this card only, by his exception | option 2: keep the emblem and set logo.kind and data-logo so the card reads as printing no logo | option 3: draw the portrait-free globe crop], because EX.md 9 asks for the product's real logo and the decide line has been open since ex.4
improve-027 -> art: art/pop/dedalus-terminal.json logo, media/dedalus-terminal/logo.svg: Kevin's answer is [the cursor block (no change) | the title tile media/dedalus-terminal/src/logo-title.png | the favicon wing on this card only] ("[his words]", [date]), because EX.md 22.3 leaves it to him
improve-027 -> art: art/pop/podium.json logo.origin and the logo row's origin in media/index.json: Kevin says the trophy is [drawn by him | made with <tool> | licensed from <site>, <licence>] ("[his words]", [date]), because EX.md 22.4 records no origin
improve-027 -> face: roster/new/sevenfold.json url (then fighters.js through tools/import-roster.py): link [address] ("[his words]", [date]), because REQUESTS line 140 holds the demo address until Kevin decides
improve-027 -> face: card.css .card .logo: E15 is still PENDING; re-measured [date] with tools/art/logo-bar.mjs and logo-test.py --bar, marks under 3:1 on their tile: [list with numbers]; [Kevin prefers a keyline | Kevin prefers a per-card tile tone | no preference], because line 331's request is unanswered and questions 1 and 2 changed [which marks]
```

Leave out the line of any question Kevin did not answer. Commit the result file, repeat the block word for word in
your final report, and set the plan's row in `plans/README.md` to DONE with "requests written, to be filed in
r4/ex/REQUESTS.md by Kevin or the cards' session".

**Verify**: `grep -c "^improve-027 ->" plans/results/027-logo-decisions.md` equals the number of answered questions
(at most 5); `git -C "<rounds>" status --short -- r4/ex/REQUESTS.md` prints nothing that you caused (you wrote
nothing there).

## Test plan

No code changes, so no new tests. The checks are:

- The sheet makes no external request (Step 3's grep prints `0`).
- The site worktree holds only the result file and the index row (`git status --short`, `git show --stat`).
- The rounds repo shows exactly one modified file after Part 2, with insertions only.
- `pnpm build` in the site worktree still ends with `all checks pass` (nothing that builds changed).

## Done criteria

Machine-checkable. ALL must hold.

Part 1:
- [ ] `~/k7-rescue/improve-audit/logo-decisions/index.html` exists with 20 or more `<img` tags and no `http` in any
      `src` or `href` other than the two Sevenfold addresses.
- [ ] `plans/results/027-logo-decisions.md` exists and names the sheet's absolute path
      (`grep -c "logo-decisions/index.html" plans/results/027-logo-decisions.md` prints 1 or more).
- [ ] `git -C ~/repos/kevinliu-studio-027 status --short | grep -c -i "portrait\|logo-decisions"` prints `0` and
      `git -C ~/repos/kevinliu-studio-027 ls-files | grep -c -i "portrait"` prints `0` (the portrait mark and the
      sheet are not in the site worktree).
- [ ] `plans/README.md` status row updated.

Part 2 (when it runs):
- [ ] Every answered question has Kevin's quoted words in the result file.
- [ ] `grep -c "^improve-027 ->" plans/results/027-logo-decisions.md` equals the number of answered questions.
- [ ] You wrote nothing under `<rounds>` (the request block is in the result file and in your report).

## STOP conditions

Stop and report back (do not improvise) if:

- `git -C "<rounds>" status --short -- r4/ex` is not empty, or the last commit touching `r4/ex` is under 2 hours old:
  the session writing the cards is still at work. Report and wait; do not build the sheet from files that may change
  under you.
- A candidate file named in Step 2 does not exist (the rounds moved it): report which.
- A quoted `decide` line is no longer in its file (someone answered or reworded it).
- Kevin's answer to Kevin Wiki is option 1 but you have no sentence of his that allows his portrait. Do not file it.
- Any step seems to need a write to any rounds file.
- The logo-bar tools fail twice (Step 6 says what to do: quote the last measure, do not debug).

## Maintenance notes

- After the cards' lane acts on the requests, the changed cards' share loops need refilming (the rounds'
  `PORT=<port> node tools/og.cjs <id>`, as session k7 did for Princeton TD), and the site takes all of it at the next
  cards pin move (`PIN.cards` in `scripts/sync.mjs`, the release session).
- If Kevin allows his portrait on the Kevin Wiki card, the site's content rule ("no real people's names or photos",
  `AGENTS.md` and `docs/content.md`) needs one line recording the exception and its limit (that card's logo tile
  only), in the same release. The release guard does not detect pictures of people, so the rule is held by review.
- A reviewer should check the sheet's wording against the quoted `decide` lines (no option added or dropped) and that
  the page holds no name or photo of anyone else.
- Deferred: making E15 a gate (PENDING to PASS or FAIL) in `r4/ex/tools/etest.mjs` belongs to the cards' lane once the
  tile fix lands.
