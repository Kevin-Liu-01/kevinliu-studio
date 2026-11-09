# Plan 024: `llms.txt` follows its convention, the sitemap dates a page by everything it prints, and five doc lines are true again

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- src/lib/twins.ts astro.config.mjs docs/architecture.md docs/seo.md docs/battle.md docs/performance.md docs/sync.md src/lib/SKILL.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. One change is expected and is not a mismatch: if plan 004 has landed, the
> sentence at `src/lib/twins.ts:149` reads differently (see "Current state").

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/004-markdown-negotiation-and-headers.md (it edits the line next to the ones this plan edits
  in `src/lib/twins.ts`; land this plan after it to avoid a merge conflict)
- **Category**: docs
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Three small things mislead a machine or an agent reading the site and its repo.

1. `/llms.txt` is the file answer engines start from. The llms.txt convention reserves `##` sections for lists of
   links (`- [name](url): note`); free text belongs above the first `##`. Here the facts about Kevin sit under
   `## About` and the contact addresses under `## Contact` as plain bullets, so a tool that reads sections as link
   lists (the reference `llms_txt2ctx` does) skips or misreads exactly the part Kevin asked to be there ("include
   more about myself in the llms.txt", `docs/seo.md`).
2. The sitemap's `lastmod` is meant to be the date of the last commit that changed what a page prints
   (`docs/seo.md`). Card pages print a Battle link that depends on the battle's roster
   (`vendor/battle/vendor/engine.js`), and `/about` prints every project's line (`public/ex/fighters.js`) and the
   questions' wording (`src/lib/twins.ts`); none of those files is counted. On the build of `c6245d9` every card
   page says `2026-11-08T20:16:10Z` although the roster file changed on `2026-11-09T17:51:39Z`.
3. Five doc lines no longer match the code, and one doc calls the build's loader a "sandbox" although it isolates
   nothing. Agents working in this repo read these docs first (`AGENTS.md` tells them to).

After this plan `llms.txt` parses as the convention expects with the same facts in it, card pages and `/about` carry
a `lastmod` that moves when their content does, and the docs say what the code does.

## Current state

- `src/lib/twins.ts:144-160` — the top of `llms.txt` and `llms-full.txt`:

```ts
// who he is and how to reach him: the top of llms.txt and llms-full.txt
const intro = () => `# ${NAME}

> ${BIO} ${DESCRIPTION}

Every page has a Markdown twin: add .md to its path, or send \`Accept: text/markdown\`.

## About

${FACTS.map((f) => `- ${f}`).join('\n')}
- He is also known as ${and(ALSO_KNOWN_AS)}.

## Contact

- Email: ${EMAIL}
${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
`;
```

  If plan 004 has landed, the sentence that begins "Every page has a Markdown twin" is longer (it names `/index.md`
  and says "first in the header"). Leave that sentence exactly as you find it, in either form.

  The built file today (`dist/llms.txt`) has the sections `## About`, `## Contact`, `## Pages`, `## Projects`,
  `## Optional`. The last three are already link lists, for example:

```
- [Cards](https://www.kevinliu.studio/cards.md): all 26 cards in one table, with live sites and sources
```

- `astro.config.mjs:18-24` — which files date which page:

```js
const SOURCES = [
  [/^\/$/, () => ['public/ex/fighters.js', 'src/pages/index.astro']],
  [/^\/cards$/, () => ['public/ex/fighters.js', 'src/pages/cards.astro']],
  [/^\/cards\/([\w-]+)$/, (id) => ['public/ex/fighters.js', `public/og/${id}.jpg`, `public/ex/media/${id}`, 'src/pages/cards/[id].astro']],
  [/^\/about$/, () => ['src/lib/site.ts', 'src/pages/about.astro']],
  [/^\/battle(\/arena)?$/, () => ['vendor/battle', 'public/battle', 'src/components/BattlePage.astro']],
];
```

  `lastmod` for a page is `git log -1 --format=%cI -- <those paths>`; in a shallow clone (Vercel's) a page whose
  files are older than the clone gets no `lastmod` at all (`astro.config.mjs:9-17`). What each page prints from
  elsewhere: a card page's Battle link comes from `teamFor()` (`src/lib/cards.ts:185-193`), which reads the roster in
  `vendor/battle/vendor/engine.js`; the home page prints that roster in `<meta name="battle-roster">`
  (`src/pages/index.astro:34,47`) and Kevin's line from `src/lib/site.ts`; `/about` prints every card's line
  (`src/pages/about.astro:31`, from `public/ex/fighters.js`) and the questions (`src/pages/about.astro:36`, worded in
  `src/lib/twins.ts`).

- The doc lines:
  - `docs/architecture.md:95` — says the Arena's twin is `/battle.md`. It is `/battle/arena.md`
    (`src/pages/battle/arena.md.ts` exists; `src/lib/twins.ts:190` maps `/battle/arena` to the same text):

```
| `/battle`, `/battle/arena` | the Mat and Arena battle (r4/play) | `/battle.md` |
```

  - `docs/seo.md:22` — says the footer links the sitemap. Only the Machine view's footer does
    (`src/components/Footer.astro:34`); the human footer (`Footer.astro:18-25`) links profiles, email, `/cards`, the
    twin and `llms.txt`:

```
- Footer: profiles, email, `/cards`, the page's twin, `llms.txt`, the sitemap.
```

  - `docs/seo.md:27-28` — calls the facts "the About section of `llms.txt`" (step 1 removes that heading).
  - `docs/battle.md:20-26` — written on 2026-11-05, contradicted by the section above it (`docs/battle.md:11-18`,
    round 5: the battle "prints the wall's own card") and by the rounds' own record (`r4/play/REQUESTS.md`,
    "battle-r4b, left in place (2026-11-08)": that run "died after the 11-05 restart and was retired"):

```
## State on 2026-11-05

- The battle holds 18 of the 26 cards. The eight added on 11-01 have staged scenes in
  `r3/battle/broadcast/scenes/next/`; registering them (adopting `roster/battle-roster.json`, moving the scenes up,
  rebuilding the engine and kit) is merge work that waits for battle-r4b to finish writing r3/battle.
- The battle prints the round-3 card face. Swapping in the ex card needs the kit's card environment rebuilt from r4/ex
  (face data, pop-out cuts, frames and borders), with the same wait.
```

  - `docs/performance.md:172-174` — gives the home page's HTML as 50.6 KB gzip. Measured on the build of `c6245d9`
    with `gzip -9 -c dist/index.html | wc -c`: 54,468 bytes (338,427 raw); a card page (`dist/cards/turboslide.html`)
    16,493; About 15,160:

```
The terminal (2026-11-08) adds Katagami Mono, 21.7 KB, fetched at idle after a Human page has loaded (cached a year,
like the site face), and each card's art as text: home HTML 43.5 to 50.6 KB gzip, a card page 15.1 to 16.6, About
14.0 to 15.2. The art is built from the cards' own pictures at build, so no picture is decoded for it.
```

  - `src/lib/SKILL.md:14-16` and `docs/sync.md` ("Pins", lines 81-93) — the loader. `src/lib/cards.ts:15-25` runs the
    rounds' scripts with `vm.runInNewContext` and hands them the real `console` and a `require`; `cards.ts:59` and
    `:155` load `tools/wall-rule.mjs` and the battle's `engine.js` with a plain `import()`. Node's documentation
    says `node:vm` is not a security mechanism. So round code runs with the build's own rights, on this Mac and on
    Vercel; what protects the build is the review that happens when a pin moves.

```
- `cards.ts`: runs `public/ex/{fighters,markup,art,media.gen}.js` and `vendor/ex/face.gen.js` in `vm` sandboxes with a
  CommonJS shim, because this repo is ESM and the round files are classic scripts with CommonJS exports. Mirrors r4/ex
  `build.mjs`'s `env`, so `card(f)` prints exactly what the rounds print.
```

Repo rules that apply (from `AGENTS.md`): the facts about Kevin are his, public and sourced: do not reword, add or
remove one; General Translation appears only in his bio and facts (these lines); never hand-edit `AGENTS.md`'s
`agent-docs:auto` blocks or a `SKILL.md` front matter (they are machine-maintained); append an entry to `memory.md`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Build and release guard | `pnpm build` | last line starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass` |
| Full history present | `git rev-parse --is-shallow-repository` | `false` |
| Page sizes | `for f in dist/index.html dist/cards/turboslide.html dist/about.html; do echo "$f $(wc -c < $f) $(gzip -9 -c $f \| wc -c)"; done` | three lines: path, raw bytes, gzip bytes |

There is no test runner, linter or CI in this repo. Do not run `pnpm check` (it is broken on `main`).

## Scope

**In scope** (the only files you should modify):
- `src/lib/twins.ts` (the `intro` function only, and only the lines named in step 1)
- `astro.config.mjs` (the `SOURCES` list and the comment above it)
- `docs/architecture.md` (line 95), `docs/seo.md` (lines 22 and 27-28), `docs/battle.md` (lines 20-26),
  `docs/performance.md` (after line 174), `docs/sync.md` (end of "Pins"), `src/lib/SKILL.md` (lines 14-16 of the body)
- `memory.md` (append one entry)
- `plans/README.md` (your status row)

**Out of scope** (do NOT touch, even though they look related):
- The sentence "Every page has a Markdown twin: …" in `intro` (plan 004 owns it).
- `FACTS`, `ALSO_KNOWN_AS`, `SOCIAL`, `EMAIL` in `src/lib/site.ts` (plan 011 restructures `FACTS`; this plan only
  reads it).
- `llmsTxt()`'s `## Pages`, `## Projects` and `## Optional` sections, and `llmsFullTxt()`.
- `src/lib/cards.ts`: this plan documents the loader, it does not change it. Real isolation (a worker under Node's
  permission model) was judged not worth its cost.
- `AGENTS.md` (its "sandboxes" wording sits beside machine-maintained blocks; leave the file alone) and the front
  matter of `src/lib/SKILL.md`.
- Any other line of the docs, however stale it looks. Report it instead.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/024-agent-files-and-docs-drift` cut
  from `origin/main` (or from the branch that carries plan 004, if it has not reached `main`). Never edit the main
  checkout (other sessions use it). Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `docs: record the 11-09 release's promotion and rollback target`. Make two commits:
  `fix(seo): llms.txt sections are link lists; lastmod counts everything a page prints` (steps 1-3) and
  `docs: the Arena's twin, the footer's links, the battle's open work, page sizes, what the loader is` (step 4).
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Put the facts above the first `##` and make Contact a link list

In `src/lib/twins.ts`, inside `intro`:

1. Delete the line `## About` and the empty line that follows it. The facts list then follows the "Every page has a
   Markdown twin" sentence after one empty line.
2. Replace the two Contact lines

```ts
- Email: ${EMAIL}
${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
```

   with

```ts
- [Email](mailto:${EMAIL})
${SOCIAL.map((s) => `- [${s.name}](${s.url})`).join('\n')}
```

The function then reads (the twin sentence is whatever you found there):

```ts
const intro = () => `# ${NAME}

> ${BIO} ${DESCRIPTION}

Every page has a Markdown twin: add .md to its path, or send \`Accept: text/markdown\`.

${FACTS.map((f) => `- ${f}`).join('\n')}
- He is also known as ${and(ALSO_KNOWN_AS)}.

## Contact

- [Email](mailto:${EMAIL})
${SOCIAL.map((s) => `- [${s.name}](${s.url})`).join('\n')}
`;
```

**Verify**: `grep -c '^## About$' src/lib/twins.ts` → `0`. (`aboutMd` uses `# About ${NAME}`, one `#`, which this
does not match.)

### Step 2: Count everything a page prints in its `lastmod`

In `astro.config.mjs`, replace the `SOURCES` list (lines 18-24) with:

```js
// a file belongs in a page's list when a change to it changes what the page shows a reader: the cards' data, the
// battle's roster (a card page's Battle link, the home page's dock), Kevin's facts and the questions' wording
const SOURCES = [
  [/^\/$/, () => ['public/ex/fighters.js', 'vendor/battle/vendor/engine.js', 'src/lib/site.ts', 'src/pages/index.astro']],
  [/^\/cards$/, () => ['public/ex/fighters.js', 'src/pages/cards.astro']],
  [/^\/cards\/([\w-]+)$/, (id) => ['public/ex/fighters.js', 'vendor/battle/vendor/engine.js', `public/og/${id}.jpg`, `public/ex/media/${id}`, 'src/pages/cards/[id].astro']],
  [/^\/about$/, () => ['public/ex/fighters.js', 'src/lib/site.ts', 'src/lib/twins.ts', 'src/pages/about.astro']],
  [/^\/battle(\/arena)?$/, () => ['vendor/battle', 'public/battle', 'src/components/BattlePage.astro']],
];
```

**Verify**: `node --check astro.config.mjs` → exit 0.

### Step 3: Build, check both, commit

Run `pnpm install --frozen-lockfile`, commit steps 1 and 2 by explicit path (`src/lib/twins.ts astro.config.mjs`,
first message in "Git workflow"; `lastmod` is read from committed history, so commit before you build), then
`pnpm build`.

**Verify**: the last line ends `all checks pass`.

**Verify** (`llms.txt` has an H1, a blockquote, and only link items under every `##`):

```
node -e '
const t = require("fs").readFileSync("dist/llms.txt", "utf8").split("\n");
const fails = [];
if (!/^# \S/.test(t[0])) fails.push("line 1 is not an H1");
if (!t.some((l) => l.startsWith("> "))) fails.push("no blockquote summary");
let h2 = null, sections = 0;
t.forEach((l, i) => {
  if (/^## /.test(l)) { h2 = l; sections++; return; }
  if (/^#/.test(l) && i > 0) fails.push(`line ${i + 1}: a heading that is not an H2: ${l}`);
  if (h2 && l.trim() && !/^- \[[^\]]+\]\([^)\s]+\)(: .+)?$/.test(l)) fails.push(`line ${i + 1} under "${h2}" is not a link item: ${l.slice(0, 70)}`);
});
console.log(fails.length ? "FAIL\n" + fails.join("\n") : `llms.txt: ${sections} link sections, every item a link`);
process.exit(fails.length ? 1 : 0);'
```

→ `llms.txt: 4 link sections, every item a link`.

**Verify** (no line was lost): `grep -c '^- ' dist/llms.txt` → `46` (10 fact lines, 5 contact lines, 4 pages, 26
projects and 1 optional link; the same count as before this plan, unless Kevin has struck or added a fact since).
**Verify**: `grep -c 'He is also known as Kevin B. Liu and Kevin Bowen Liu.' dist/llms.txt dist/llms-full.txt` →
`1` for each file, and `grep -c '^- \[GitHub\](https://github.com/Kevin-Liu-01)$' dist/llms.txt` → `1`.

**Verify** (`lastmod` equals the last commit that touched each page's files; needs full history, see the table):

```
node -e '
const fs = require("fs"), { execFileSync } = require("child_process");
const xml = fs.readFileSync("dist/sitemap-0.xml", "utf8");
const mod = (p) => new RegExp(`<loc>https://www\\.kevinliu\\.studio${p}</loc><lastmod>([^<]+)</lastmod>`).exec(xml)?.[1];
const git = (...paths) => new Date(execFileSync("git", ["log", "-1", "--format=%cI", "--", ...paths], { encoding: "utf8" }).trim()).toISOString();
const want = [
  ["/", ["public/ex/fighters.js", "vendor/battle/vendor/engine.js", "src/lib/site.ts", "src/pages/index.astro"]],
  ["/about", ["public/ex/fighters.js", "src/lib/site.ts", "src/lib/twins.ts", "src/pages/about.astro"]],
  ["/cards/atlas", ["public/ex/fighters.js", "vendor/battle/vendor/engine.js", "public/og/atlas.jpg", "public/ex/media/atlas", "src/pages/cards/[id].astro"]],
];
const bad = want.filter(([p, paths]) => mod(p) !== git(...paths)).map(([p, paths]) => `${p}: sitemap ${mod(p)}, git ${git(...paths)}`);
console.log(bad.length ? "FAIL\n" + bad.join("\n") : `lastmod: ${want.length} pages match the last commit that changed what they print`);
process.exit(bad.length ? 1 : 0);'
```

→ `lastmod: 3 pages match the last commit that changed what they print`. (Before step 2 this command fails on
`/cards/atlas`: sitemap `2026-11-08T20:16:10.000Z`, git `2026-11-09T17:51:39.000Z`.)

### Step 4: Correct the docs

Make each replacement exactly. Do not reflow other lines.

1. `docs/architecture.md:95` — replace the last cell `` `/battle.md` `` so the row reads:

```
| `/battle`, `/battle/arena` | the Mat and Arena battle (r4/play) | `/battle.md`, `/battle/arena.md` (the same text) |
```

2. `docs/seo.md:22` — replace the line with:

```
- Footer: profiles, email, `/cards`, the page's twin and `llms.txt`; the Machine view's footer adds `llms-full.txt` and the sitemap.
```

3. `docs/seo.md:27-28` — replace these two whole lines (the paragraph's first two; leave its third line, which
   begins "site, his GitHub profile", untouched) with the three lines below:

```
`FACTS` and `ALSO_KNOWN_AS` in `src/lib/site.ts`, each line with its public source in a comment. They feed the list
at the top of `llms.txt` and `llms-full.txt` (above the first `##`, where the llms.txt convention puts free text; its
`##` sections are link lists) and the questions on `/about`. Only public sources: this site, his previous
```

   (Plan 011 edits the last sentence of the same paragraph, "Strike a line by deleting it."; if it has landed, that
   sentence is longer. Leave it as you find it.)

4. `docs/battle.md:20-26` — replace the heading and its first two bullets (keep the two bullets after them, about
   Claude of Tanks' videos and the dock) with:

```
## Open work (written 2026-11-05, corrected 2026-11-09)

- The battle holds 18 of the 26 cards. The eight added on 11-01 have staged scenes in
  `r3/battle/broadcast/scenes/next/`; registering them (adopting `roster/battle-roster.json`, moving the scenes up,
  rebuilding the engine and kit) waits on a kit rebuild from r3/battle. The run that was writing r3/battle
  (battle-r4b) was retired on 2026-11-08 with its work left uncommitted there, so that work has to be accepted or set
  aside first (rounds `r4/play/REQUESTS.md`, "battle-r4b, left in place").
- Since round 5 the board prints the wall's own card (above). The Broadcast kit's cutscenes still carry the round-3
  card sprite and art masks (`public/battle/vendor/cards/`); the same kit rebuild replaces them.
```

5. `docs/performance.md` — directly after the paragraph that ends "so no picture is decoded for it." (line 174), add
   an empty line and this paragraph, with the three gzip numbers and the raw home size from the "Page sizes" command
   in the table, run on your build (at `c6245d9` they were 54,468, 16,493 and 15,160 gzip bytes, and 338,427 raw):

```
Measured again on 2026-11-09 (`gzip -9 -c dist/<page>.html | wc -c`, after the framed templates and round 5): home
HTML <home gzip> bytes gzip (<home raw> raw), a card page <card gzip>, About <about gzip>.
```

6. `docs/sync.md` — at the end of the "Pins" section (after the paragraph that ends "The pins are read from the
   rounds' own checkout either way.", before `## The lock`), add an empty line and:

```
Moving a pin is a code review, not only a content review. The build runs round code with the build's own rights, here
and on Vercel: `src/lib/cards.ts` loads `fighters.js`, `markup.js`, `art.js`, `media.gen.js`, `face.gen.js` and the
ground recipes through `node:vm` only to give classic scripts a CommonJS `module` (Node's documentation says `vm` is
not a security boundary), and it imports `tools/wall-rule.mjs` and the battle's `engine.js` directly. The scan looks
for banned strings and location metadata, never for what a script does.
```

7. `src/lib/SKILL.md:14-16` — in the `cards.ts` bullet, replace `` in `vm` sandboxes with a `` with
   `` in `vm` contexts with a `` and add one sentence at the end of the bullet (after "prints exactly what the
   rounds print."):

```
  The `vm` contexts are a module shim, not isolation: round code runs with the build's rights (docs/sync.md, Pins).
```

**Verify**:

```
grep -c '/battle/arena.md` (the same text)' docs/architecture.md; grep -c "the Machine view's footer adds" docs/seo.md; grep -c '^## Open work (written 2026-11-05, corrected 2026-11-09)$' docs/battle.md; grep -c 'waits for battle-r4b to finish' docs/battle.md; grep -c 'Measured again on 2026-11-09' docs/performance.md; grep -c 'Moving a pin is a code review' docs/sync.md; grep -c 'a module shim, not isolation' src/lib/SKILL.md
```

→ `1`, `1`, `1`, `0`, `1`, `1`, `1`, in that order.
**Verify**: `grep -c '<home gzip>\|<card gzip>\|<about gzip>\|<home raw>' docs/performance.md` → `0` (you filled the
numbers in).
**Verify**: `git diff --stat -- AGENTS.md` → empty, and `git diff -- src/lib/SKILL.md | grep -c '^[-+]description:'` → `0`.

### Step 5: Record and commit

Append an entry to the end of `memory.md` in the file's existing shape (a `## 2026-MM-DD: <title> (<branch>, <agent>)`
heading, then `- **Type**:`, `- **Changed**:`, `- **Checked**:`, `- **Open**:` bullets). Under Open write: "the
loader is documented, not isolated; `AGENTS.md` and `docs/architecture.md:20` still say 'sandboxes'".

Commit the docs, `src/lib/SKILL.md` and `memory.md` by explicit path with the second message in "Git workflow".

**Verify**: `git status --short` → empty. `pnpm build` once more → ends `all checks pass` (a `.md` under `docs/` is
not a page; this only confirms nothing else moved).

## Test plan

- No test runner exists in this repo; the checks are the two `node -e` commands in step 3. The first is a small
  reader of the llms.txt shape (H1, blockquote, link items under every `##`); it fails on `main` with "under
  `## About` is not a link item". The second compares three pages' `lastmod` with git; it fails on `main` for
  `/cards/atlas`.
- Fact preservation is checked by counting list lines and by grepping two exact lines.
- Docs are checked by the grep list in step 4.
- Verification: `pnpm build` ends `all checks pass` and both `node -e` commands print their pass line.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` ends with `all checks pass`
- [ ] step 3's first command prints `llms.txt: 4 link sections, every item a link`
- [ ] step 3's second command prints `lastmod: 3 pages match the last commit that changed what they print`
- [ ] `grep -c 'He is also known as Kevin B. Liu and Kevin Bowen Liu.' dist/llms.txt` → `1`
- [ ] step 4's grep list prints `1 1 1 0 1 1 1`
- [ ] `git diff --name-only origin/main...HEAD -- AGENTS.md public vendor scripts` prints nothing
- [ ] `git diff --name-only origin/main...HEAD` lists only the files in "In scope" (plus plan 004's, if you built on it)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `intro` in `src/lib/twins.ts` does not have the `## About` and `## Contact` blocks shown in "Current state"
  (apart from the twin sentence), or `SOURCES` in `astro.config.mjs` differs from the excerpt.
- After step 1 any fact line that is in `src/lib/site.ts` `FACTS` is missing from `dist/llms.txt`.
- `git rev-parse --is-shallow-repository` prints `true` (the `lastmod` check cannot run; report it as not run).
- A doc line you are told to replace is not there word for word (another session edited the doc). Report the line
  you found; do not paraphrase a replacement.
- The i18n branch's files appear in your worktree (you are on the wrong base).

## Maintenance notes

- Kevin may prefer the `## About` heading for human readers. It is a one-line revert in `intro`; the convention
  check in step 3 would then fail, by design. Say so in the PR description so he can choose.
- A new page route, or a new file that changes what a page shows, needs a line in `SOURCES`. Listing a file too
  widely makes `lastmod` move when nothing a reader sees changed, which teaches crawlers to ignore it; that is why
  `src/lib/twins.ts` is listed only for `/about`.
- When the 26-card battle lands, rewrite `docs/battle.md`'s "Open work" section; do not append to it.
- The loader paragraph in `docs/sync.md` is the place to record any future isolation (for example running round
  scripts in a worker with Node's `--permission`).
- Deferred, recorded elsewhere: hiding the Machine forms from HTML-to-text readers, and a `Link: rel="alternate"`
  header for the twins.
