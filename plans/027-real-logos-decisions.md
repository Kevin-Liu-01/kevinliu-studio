# Plan 027: Kevin answers every open logo question on one sheet, and the answers reach the cards' lane

> **Executor instructions**: This is a design plan in two parts. **Only Part 1 runs now**: it builds one decision
> sheet for Kevin and stops. Part 2 (filing his answers and the logo contrast gate) stays TODO: it needs Kevin's
> answers and a quiet cards lane, and it has neither today. You never edit a card file. Follow the steps in order, run
> every verification command, and confirm the expected result before moving on. If anything in "STOP conditions"
> occurs, stop and report; do not improvise. Do NOT edit `plans/README.md`: lane D's reviewer dispatched you and the
> audit session keeps the index. You make no commit and change no file in any site worktree.
>
> **Refreshed 2026-11-10 by lane D** against rounds HEAD `20496336` (site commit `4025230`, lane worktree
> `~/repos/kevinliu-studio-dir`). What changed since the first writing (rounds `868340d7`, 2026-11-09): the cards'
> session ("Fix the ex cards' below-bar items to reach 90") committed round ex.8 (`de54fad5`) and is **still at work**
> (63 uncommitted entries under `r4/ex` on 2026-11-10 01:30, none of them a logo file or a `decide` line). So the
> sheet is built from **committed** files only (`git show HEAD:<path>`, never the working tree), it says which answers
> may change, and Part 2 waits. The refresh also found two logo questions the first writing missed (Claude of Tanks'
> shield and the Atlas imprint), carried under "For Kevin to decide" in `r4/ex/NOTES.md`.
>
> **Drift check (run first)**:
> `git -C "/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30" log --oneline 20496336..HEAD -- r4/ex/art/pop/kevin-wiki.json r4/ex/art/pop/dedalus-terminal.json r4/ex/art/pop/podium.json r4/ex/art/pop/claude-of-tanks.json r4/ex/art/pop/atlas.json r4/ex/media/kevin-wiki r4/ex/media/dedalus-terminal r4/ex/media/podium r4/ex/media/claude-of-tanks/logo.svg r4/ex/media/atlas/logo.svg r4/ex/fighters.js r4/ex/EX.md`
> If it prints commits, the cards' session has committed again: re-read the "Current state" excerpts against the new
> HEAD with `git show HEAD:<path>`; if a `decide` line quoted below is gone or already answered, drop that question
> from the sheet and say so in your report.

## Status

- **Priority**: P2 (direction; Kevin's first goal is "26 cards, each with its real logo")
- **Effort**: S for Part 1 (the sheet); M for Part 2 and the card work it requests (done by the cards' lane, not here)
- **Risk**: LOW (reads only; nothing is written in the rounds or in any repository)
- **Depends on**: Part 1: none. Part 2: Kevin's answers, and the session "Fix the ex cards' below-bar items to reach
  90" finished and committed
- **Category**: direction
- **Planned at**: rounds HEAD `20496336`, site commit `4025230`, 2026-11-10 (first written at `868340d7` and
  `c6245d9`, 2026-11-09)

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
  `<rounds>/r4/ex`. Another session is writing `r4/ex` now: `git -C <rounds> status --short -- r4/ex` listed 63
  entries (53 modified, 10 untracked) on 2026-11-10, in `borders/`, `cards/*/index.html`, `design/`, `fx/` and
  `index.html`; its last commit of card work was `de54fad5` ("round ex.8 fixes"). None of the files this plan reads is
  among them. **Read every rounds file as committed: `git -C <rounds> show HEAD:<path>`.** Never read a candidate image
  or a quoted line from the working tree, and never write there.
- The rounds' rule (`<rounds>/r4/ex/OWNERS.md`): each file has one owning lane; anyone else appends one line to
  `r4/ex/REQUESTS.md` in the form `from -> to: file: change, because reason`. The site's rule (its `AGENTS.md`) is
  "Never write in the rounds folder", so Part 2 writes those lines into this plan's result file and Kevin or the
  cards' own session files them.
- The site only receives the cards through a sync at a pinned rounds commit. Nothing in any site worktree changes in
  this plan.
- The result file lives in the audit worktree: `~/repos/kevinliu-studio-improve/plans/results/027-logo-decisions.md`
  (you create it and commit nothing).

The logo tile's size (`r4/ex/card.css:281-283` at HEAD): 9.2% of the card's width, so about 20 px on a 215 px wall
card and 44 px on a 480 px card.

```css
.card .logo {
  left: 1.4cqw; top: 1cqw; width: 9.2cqw; height: 9.2cqw; box-sizing: border-box; padding: 1.2cqw; border-radius: 1.6cqw; display: none;
  background: linear-gradient(153deg, var(--white) 0%, var(--m1) 38%, var(--m2) 100%);
```

The tile's metal, default values: `--m1: #f2f3f5; --m2: #cdd0d4; --white: #fff`.

The open questions, each quoted from its committed source (all `file:line` are at rounds HEAD `20496336`):

1. **Kevin Wiki** (`r4/ex/art/pop/kevin-wiki.json:261`). The tile shows a stand-in graph emblem because every mark
   Kevin Wiki ships is Kevin's portrait on a circuit globe.
   ```
   "decide": "Kevin decides: (1) allow his own portrait logo in the logo tile on this card only, (2) print no logo (the tile shows the card's graph emblem, media/kevin-wiki/emblem.svg, which is not the logo), or (3) a portrait-free crop of the circuit globe, which would be a new drawing."
   ```
   Files: today's tile `r4/ex/media/kevin-wiki/logo.svg` (byte for byte the emblem,
   `r4/ex/media/kevin-wiki/emblem.svg`, both 1,133 bytes); the real mark `~/repos/Kevin-Wiki/ui/public/logo.svg`
   (146,736 bytes; Kevin's own repository, read from its working tree). Option 3 has no file: it would be a new
   drawing.
   **Content rule that binds this**: the site ships no real people's photos (site `AGENTS.md`, "Rules"). Option 1 is
   Kevin's own portrait, so it needs his explicit exception, in his own words. Do not decide it and do not treat any
   earlier remark as that exception.
2. **050525 (Dedalus Terminal)** (`r4/ex/art/pop/dedalus-terminal.json:9`; `r4/ex/EX.md:526`, section 22 item 3).
   ```
   "decide": "Kevin: the cursor block (now), the title tile (media/dedalus-terminal/src/logo-title.png), or the favicon wing on this card only.",
   ```
   Files: now `r4/ex/media/dedalus-terminal/logo.svg` (ground `#0a1418`); the title tile
   `r4/ex/media/dedalus-terminal/src/logo-title.png`; the favicon `r4/ex/media/dedalus-terminal/src/logo-favicon-512.png`.
   `EX.md:526` says the favicon "is the Dedalus Labs wings, a third-party mark": label it so on the sheet.
3. **Podium** (`r4/ex/EX.md:528`, section 22 "For Kevin to decide", item 4).
   ```
   Podium's trophy (media/podium/logo.webp, its logo and its hero) has no recorded origin: Kevin committed it on 2025-10-02 (Podium 76c9aae) as public/trophy.png and favicon.ico with no author, tool, source site or licence in the repository, the commit or the PNG's own metadata. Kevin says whether he drew it, a tool made it or a stock site licensed it
   ```
   File: `r4/ex/media/podium/logo.webp`.
4. **Claude of Tanks** (`r4/ex/NOTES.md:222`, carried at `:285` and `:352` under "For Kevin to decide"; the receipt
   is the `logo` block of `r4/ex/art/pop/claude-of-tanks.json`).
   ```
   Claude of Tanks' logo is the archived v3 shield (every current mark seats the Claude Code mascot).
   ```
   The receipt adds that the shield is "Kevin's own drawing, whose commander is a plain helmet dome" and that every
   current mark of the product seats a third party's mascot, "so none of those is used". The question for Kevin: keep
   the archived shield as this card's logo, or name another mark of his own. File: `r4/ex/media/claude-of-tanks/logo.svg`.
   Do not fetch, copy or show any of the product's current marks: they carry a third party's mascot.
5. **Atlas** (`r4/ex/NOTES.md:222`, carried at `:285` and `:352` as "the Atlas GT monogram"; `r4/ex/EX.md:272`).
   ```
   Atlas prints General Translation as small text and its PressMark carries the GT monogram (the 11-01 ruling).
   ```
   Kevin's 11-01 ruling allows the magazine's covers and its publisher's name on the Atlas card only (`EX.md`
   section 14). The tile prints the magazine's imprint, an upright book whose cover carries the publisher's monogram.
   The question for Kevin: does that ruling cover the monogram inside the logo tile, on this card only? File:
   `r4/ex/media/atlas/logo.svg`.
6. **Sevenfold's address** (`r4/ex/REQUESTS.md:140` and `r4/ex/fighters.js:2217`).
   ```
   EX.md roster row 23: sevenfold.so answers 404 DEPLOYMENT_NOT_FOUND (2026-11-01), so the entry links https://sevenfold-demo.vercel.app until Kevin decides.
   ```
   Checked again on 2026-11-10 by the reviewer with a `HEAD` request: `https://sevenfold.so` 404,
   `https://sevenfold-demo.vercel.app` 200.
7. **Logo contrast, test E15** (`r4/ex/EX.md:488`: status PENDING; the measurements in `r4/ex/REQUESTS.md:331`).
   ```
   its mean luminance against its own light metal tile is under 3:1 on 11 cards at their worst width (050525 1.28 at 120 to 140 px, Agent Machines 1.65, Mailroom 1.68, Loop 1.99, Sevenfold 2.03, Ariadne 2.08 on its own dark ground, Sandbox Arena 2.10, Princeton TD 2.16, Agent Pets 2.18, bday.land 2.31, Podium 2.48), and the tile against the bar ring around it reads 1.00 to 3.22:1 ... A darker keyline or bevel on the tile, or a per-card tile tone, would lift the tile against the bar
   ```
   This one is not a question for Kevin unless he wants a say in the fix (a darker keyline on every tile, or a tile
   tone per card). It is follow-up work for the cards' face lane, and it comes after questions 1 and 2, because their
   answers change two of the 11 marks. Its numbers are from round ex.4 and will be re-measured in Part 2.

Already settled, so not asked: Prototemplate prints its own hub mark (`r4/ex/art/pop/prototemplate.json`, `logo`:
"It is not the employer mark the hub's other routes carry"), which closes the "may be" in `EX.md:528`.

**Which answers may change while the cards' session is still at work.** None of the six questions' files is
modified in the working tree. What the session is changing around them: 050525's frame
(`r4/ex/borders/dedalus-terminal/frames/dir-a/`), the front effects of Kevin Wiki and Podium (`r4/ex/fx/*/fx.json`),
and the design plan (`r4/ex/design/`). So the look of the bar around a tile may change, and with it E15's numbers
(question 7) and how well each 050525 option reads; the candidates themselves and questions 3 to 6 do not depend on
that work. The sheet says this in one line per question.

Why the sheet is an HTML page and not a Markdown table: the choice is visual. Kevin has to see each candidate at
20 px and 44 px on the tile's metal, and Markdown can set neither a size nor a ground. The rounds already use this
form for his picks (`<rounds>/r4/stage/cot2/index.html`). The page lives outside every repository, at
`~/k7-rescue/improve-audit/logo-decisions/`, because it holds Kevin's portrait mark, which must never enter the site
repo or any published page.

## Commands you will need

| Purpose | Command | Expected on success |
| --- | --- | --- |
| The cards' lane, as it stands (recorded, not a gate in Part 1) | `git -C "<rounds>" status --short -- r4/ex \| wc -l` and `git -C "<rounds>" log -1 --format='%h %cr %s' -- r4/ex` | two lines to copy into the result file |
| A committed file out of the rounds | `git -C "<rounds>" show HEAD:<path> > <destination>` | the file, byte for byte as committed |
| Logo-on-bar measure (Part 2 only) | `PORT=44110 node tools/art/logo-bar.mjs ~/k7-rescue/improve-audit/logo-bar` then `python3 tools/art/logo-test.py --bar ~/k7-rescue/improve-audit/logo-bar --json ~/k7-rescue/improve-audit/logo-bar/bar.json`, both from `<rounds>/r4/ex` | not run in Part 1 |

Use `/usr/bin/grep` (the shell's `grep` is another tool on this Mac). Make no network request: the reviewer already
checked the two Sevenfold addresses.

## Scope

**In scope** (the only files you create or modify):
- `~/k7-rescue/improve-audit/logo-decisions/index.html` and copies of the candidate images beside it (create).
- `~/repos/kevinliu-studio-improve/plans/results/027-logo-decisions.md` (create; do not commit): the questions in
  words, the sheet's path, and an empty answers table.
- `~/k7-rescue/improve-audit/lane-d/027-memory.md` (create): the `memory.md` entry's text for the reviewer.

**Out of scope** (do NOT touch):
- Every path under `<rounds>`: no logo file, `art/pop/*.json`, `card.css`, `fighters.js`, `EX.md`. The lanes
  that own them make the changes.
- Every site worktree (`~/repos/kevinliu-studio*`), `plans/README.md`, and any commit.
- The portrait mark and the sheet must never enter a repository. Do not copy `logo-decisions/` into any repository,
  and do not publish it anywhere (no Artifact, no deploy, no upload).
- Drawing option 3 for Kevin Wiki, or any new logo. Never generate, download or redraw a logo; a third party's mark
  appears on the sheet only where the rounds already hold the file (050525's favicon) and is labelled as such.
- Part 2 (Steps 5 to 7).

## Git workflow

- You make no commit. The reviewer appends your `memory.md` text to the lane worktree
  (`~/repos/kevinliu-studio-dir`, branch `improve/direction`) and commits it; the audit session commits the result
  file. In the rounds repo nothing is written or committed.
- Do NOT push, open a PR or deploy.

## Steps

### Part 1: the sheet

### Step 1: Record the cards' lane as it stands

Run the two "cards' lane" commands and keep their output for the result file. In Part 1 a busy lane is not a STOP
condition: you read committed files only.

**Verify**: you have a count and a `<hash> <age> <subject>` line.

### Step 2: Collect the candidates from committed files

```sh
D=~/k7-rescue/improve-audit/logo-decisions; mkdir -p "$D"
R="/Users/kevinliu/Documents/ChatGPT/portfolio-design-rounds/2026-10-30"
g() { git -C "$R" show "HEAD:r4/ex/$1" > "$D/$2"; }
g media/kevin-wiki/logo.svg kevin-wiki-2-emblem.svg
cp ~/repos/Kevin-Wiki/ui/public/logo.svg "$D/kevin-wiki-1-portrait.svg"
g media/dedalus-terminal/logo.svg 050525-1-cursor.svg
g media/dedalus-terminal/src/logo-title.png 050525-2-title.png
g media/dedalus-terminal/src/logo-favicon-512.png 050525-3-favicon.png
g media/podium/logo.webp podium-trophy.webp
g media/claude-of-tanks/logo.svg claude-of-tanks-shield.svg
g media/atlas/logo.svg atlas-imprint.svg
ls -l "$D"
```

**Verify**: `ls "$D" | wc -l` prints `8`, and the sizes are 1,133 (emblem), 146,736 (portrait), 1,075 (cursor),
149,315 (title), 282,819 (favicon) and 8,760 (trophy) bytes, with two more non-empty SVGs.

### Step 3: Write the sheet

Create `~/k7-rescue/improve-audit/logo-decisions/index.html`: one self-contained page (inline CSS, no script, no
external request, images by relative path). Requirements:

- A title "Logo decisions for Kevin" with the date (2026-11-10), one line "Answer with the option number or letter
  for each question.", and one line under it: "Built from the cards as committed at rounds `20496336`. The cards'
  session is still at work; each question says whether its answer may change."
- One section per question, in this order: Kevin Wiki, 050525, Podium, Claude of Tanks, Atlas, Sevenfold, then a
  short note on E15. Number them 1 to 7 as in "Current state".
- For every pictured candidate, show it four times: in a 20 px tile and a 44 px tile (the sizes on a 215 px and a
  480 px card), and each of those again at 4x zoom (scale the whole tile with CSS `zoom: 4` or
  `transform: scale(4)` with room reserved, so Kevin sees the real pixels enlarged). The tile is a square with
  `border-radius: 17%`, `padding: 13%`, `box-sizing: border-box`, and the card's metal:
  `background: linear-gradient(153deg, #fff 0%, #f2f3f5 38%, #cdd0d4 100%)`; the image fills the padded box with
  `object-fit: contain`. For the 050525 cursor, whose file is a full tile on its own ground `#0a1418`, set
  `padding: 0` (the card prints it edge to edge). Give the Atlas imprint a dark ink (`color: #0F1113` on the tile; if
  the SVG draws in `currentColor` and shows nothing as an `<img>`, say so in your report rather than recolouring it:
  the reviewer decides).
- Questions 1 and 2: one row per option, with its label and source in plain words:
  - Kevin Wiki 1: "Your portrait mark (the real logo). Needs your explicit exception to the no-photos-of-people rule,
    on this card only." Kevin Wiki 2: "The graph emblem (printed today; not the logo)." Kevin Wiki 3: "A portrait-free
    crop of the circuit globe. Does not exist yet; it would be a new drawing." (Option 3 shows an empty tile.)
  - 050525 1: "The terminal's block cursor (printed today)." 2: "The title 050525 (about 3 px tall at wall size)."
    3: "The favicon wing. It is the Dedalus Labs mark, a third party's."
  - Under question 2: "May change: the frame around this tile is being redrawn; the three candidates are not."
- Podium (3): the trophy in both tile sizes, and the question "Where does this trophy come from? (a) I drew it, (b) a
  tool made it (which), (c) a stock site (which, and its licence)."
- Claude of Tanks (4): the shield in both tile sizes, the sentence "Printed today: your archived v3 shield. Every
  current mark of the product seats a third party's mascot, so none of those is used.", and the question "Keep the
  shield as this card's logo? (a) yes, (b) another mark of my own (which)."
- Atlas (5): the imprint in both tile sizes, the sentence "Printed today: the magazine's imprint, a book whose cover
  carries its publisher's monogram (GT). Your 11-01 ruling allows the magazine's covers and its publisher's name on
  this card only.", and the question "Does that ruling cover the monogram in the logo tile? (a) yes, on this card
  only, (b) no: print the imprint without the monogram, (c) no logo on this card."
- Sevenfold (6): the two addresses with the status codes (`sevenfold.so` 404, `sevenfold-demo.vercel.app` 200, checked
  2026-11-10) and the question "Which address should the card link? (a) sevenfold.so once it is live again, (b) keep
  sevenfold-demo.vercel.app, (c) another."
- E15 (7): three sentences. 11 marks read under 3:1 on their light tile at wall size (round ex.4's measure); the fix
  is a darker keyline on every tile or a tile tone per card; "Say if you prefer one, otherwise the cards' lane picks.
  These numbers will be measured again once the cards' session has committed."
- Questions 1 and 3 to 6 each end with the line "May change: no; this does not depend on the work in progress."
- No franchise names, no other person's name or photo anywhere on the page. The only organisation names allowed are
  the ones quoted above (the third party whose wing 050525's favicon is, and "GT" on the Atlas question).

**Verify**: `/usr/bin/grep -c "<img" ~/k7-rescue/improve-audit/logo-decisions/index.html` prints 32 or more (8
pictured candidates, each at two sizes and each of those also zoomed);
`/usr/bin/grep -oE '(src|href)="[^"]+"' ~/k7-rescue/improve-audit/logo-decisions/index.html | /usr/bin/grep -c 'http'`
prints `0` (no external request; the Sevenfold addresses are printed as text, not links);
`/usr/bin/grep -c "<script" ~/k7-rescue/improve-audit/logo-decisions/index.html` prints `0`.

### Step 4: Record the questions and stop

Write `~/repos/kevinliu-studio-improve/plans/results/027-logo-decisions.md`: a first line with the date and the rounds
HEAD; the cards' lane state from Step 1 and the sentence that Part 2 is TODO until that session has committed and
Kevin has answered; the seven questions in words (no images), each with its options, its source `file:line` at
`20496336`, and its "may change" line; the sheet's absolute path
(`/Users/kevinliu/k7-rescue/improve-audit/logo-decisions/index.html`); the Sevenfold status codes with the date; the
"already settled" line about Prototemplate; and an empty "Kevin's answers" table (question, answer, his words, date).

Then write the `memory.md` entry's text to `~/k7-rescue/improve-audit/lane-d/027-memory.md` in the form of the last
entries of `~/repos/kevinliu-studio-dir/memory.md` (read them; do not edit that file): date 2026-11-10, type
"decision sheet", asked by improve plan 027, changed: nothing that ships (the sheet is outside every repository at the
path above; the questions are in `plans/results/027-logo-decisions.md` on `improve/audit`), the seven questions in
one line, and open: Kevin's answers, then Part 2 (the request block and the E15 re-measure) once the cards' session
has committed.

Report the sheet's path and stop. Part 2 needs Kevin's answers.

**Verify**: `/usr/bin/grep -c "logo-decisions/index.html" ~/repos/kevinliu-studio-improve/plans/results/027-logo-decisions.md`
prints 1 or more; `/usr/bin/grep -c "^| [1-7] " ~/repos/kevinliu-studio-improve/plans/results/027-logo-decisions.md`
prints 7 or more (the answers table's rows);
`git -C ~/repos/kevinliu-studio-improve ls-files --others --exclude-standard | /usr/bin/grep -c -i "portrait\|logo-decisions/"`
prints `0` (the portrait mark and the sheet are in no repository);
`git -C ~/repos/kevinliu-studio-dir status --short | wc -l` prints what it printed before you started (you changed
nothing there).

### Part 2: file the answers (TODO: not in this run; only when the operator gives you Kevin's answers and the cards' session has committed)

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

- The sheet makes no external request and holds no script (Step 3's greps print `0`).
- Every candidate on the sheet is the committed file (Step 2's byte counts).
- No repository holds the sheet or the portrait mark, and no site worktree changed (Step 4's checks).

## Done criteria

Machine-checkable. ALL must hold.

Part 1:
- [ ] `~/k7-rescue/improve-audit/logo-decisions/index.html` exists with 32 or more `<img` tags, no `<script`, and no
      `http` in any `src` or `href`.
- [ ] `~/k7-rescue/improve-audit/logo-decisions/` holds the 8 candidate files with the byte counts of Step 2.
- [ ] `~/repos/kevinliu-studio-improve/plans/results/027-logo-decisions.md` exists, names the sheet's absolute path,
      lists seven questions with a "may change" line each, and has an empty answers table.
- [ ] `~/k7-rescue/improve-audit/lane-d/027-memory.md` exists.
- [ ] No file changed in any site worktree or in the rounds; nothing was committed; `plans/README.md` is untouched.

Part 2 (TODO; when it runs):
- [ ] Every answered question has Kevin's quoted words in the result file.
- [ ] `/usr/bin/grep -c "^improve-027 ->"` on the result file equals the number of answered questions.
- [ ] Nothing was written under `<rounds>` (the request block is in the result file and in the report).

## STOP conditions

Stop and report back (do not improvise) if:

- A candidate file named in Step 2 does not exist at `HEAD` (the rounds moved it): report which.
- A quoted `decide` line is no longer in its file at `HEAD` (someone answered or reworded it).
- Any step seems to need a write to any rounds file, a network request, or a logo that does not exist as a file
  named in Step 2.
- Part 2 only: `git -C "<rounds>" status --short -- r4/ex` is not empty or the last commit touching `r4/ex` is under
  2 hours old (the cards' session is still at work); Kevin's answer to Kevin Wiki is option 1 without a sentence of
  his that allows his portrait; the logo-bar tools fail twice (quote the last measure, do not debug).

## Maintenance notes

- Part 2 as written below still lists five request lines; when it runs, add one for Claude of Tanks
  (`art/pop/claude-of-tanks.json` logo) and one for Atlas (`art/pop/atlas.json` logo) in the same form.
- After the cards' lane acts on the requests, the changed cards' share loops need refilming (the rounds'
  `PORT=<port> node tools/og.cjs <id>`), and the site takes all of it at the next cards pin move (`PIN.cards` in
  `scripts/sync.mjs`, the release session).
- If Kevin allows his portrait on the Kevin Wiki card, the site's content rule ("no real people's names or photos",
  `AGENTS.md` and `docs/content.md`) needs one line recording the exception and its limit (that card's logo tile
  only), in the same release. The release guard does not detect pictures of people, so the rule is held by review.
- A reviewer should check the sheet's wording against the quoted `decide` lines (no option added or dropped) and that
  the page holds no name or photo of anyone else.
- Deferred: making E15 a gate (PENDING to PASS or FAIL) in `r4/ex/tools/etest.mjs` belongs to the cards' lane once the
  tile fix lands.
