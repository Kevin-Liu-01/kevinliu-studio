# Plan 024: `llms.txt` follows its convention, the sitemap dates a page by everything it prints, and the doc lines are true again

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT edit `plans/README.md`: the audit session
> keeps the index.
>
> **Drift check (run first)**: `git log --oneline 4025230..HEAD` must list exactly two commits, plan 011
> (`fix(about): each fact names the question it answers…`) and plan 012 (`perf(cache): the faces by content
> address…`). Both changed files this plan edits (`src/lib/twins.ts`, `docs/seo.md`, `src/lib/SKILL.md`,
> `scripts/verify-build.mjs`, `docs/performance.md`); the excerpts below already show those files as the two plans
> left them. If an excerpt does not match the live file, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 004 (on the base), 011 and 012 (the two commits before this one on the lane branch)
- **Category**: docs
- **Planned at**: commit `4025230` (`feat/i18n`) plus lane commits 011 and 012, 2026-11-10. Refreshed from the
  `c6245d9` version by lane A: all three findings are still present; `intro()` now takes a language, the pages moved
  to `src/views/`, and the llms.txt shape becomes a build check instead of a one-off command. No English string in
  `src/i18n/en/ui.json` changes, so nothing here waits for a translation.

## Why this matters

Three small things mislead a machine or an agent reading the site and its repo.

1. `/llms.txt` is the file answer engines start from. The llms.txt convention reserves `##` sections for lists of
   links (`- [name](url): note`); free text belongs above the first `##`. Here the facts about Kevin sit under
   `## About` and the contact addresses under `## Contact` as plain bullets, in English and in the seven other
   languages, so a tool that reads sections as link lists (the reference `llms_txt2ctx` does) skips or misreads
   exactly the part Kevin asked to be there ("include more about myself in the llms.txt", `docs/seo.md`).
2. The sitemap's `lastmod` is meant to be the date of the last commit that changed what a page prints
   (`docs/seo.md`). Card pages print a Battle link that depends on the battle's roster
   (`vendor/battle/vendor/engine.js`), the home page prints that roster and Kevin's description
   (`src/lib/site.ts`), and `/about` prints every project's line (`public/ex/fighters.js`); none of those files is
   counted for those pages.
3. Several doc lines no longer match the code, and the docs call the build's loader a "sandbox" although it isolates
   nothing. Agents working in this repo read these docs first (`AGENTS.md` tells them to).

After this plan `llms.txt` parses as the convention expects with the same facts in it, in every language, and the
build fails if it stops doing so; card pages, the home page and `/about` carry a `lastmod` that moves when their
content does; and the docs say what the code does.

## Current state

All paths are in the lane worktree `~/repos/kevinliu-studio-p2a` (branch `improve/p2-checks`).

- `src/lib/twins.ts`, the top of `llms.txt` and `llms-full.txt` in a language (the function `intro`, about line 173):

```ts
// who he is and how to reach him: the top of llms.txt and llms-full.txt
const intro = (code: string) => {
  const l = L(code), t = l.t;
  const facts = code === DEFAULT ? FACTS : l.c.facts;
  return `# ${NAME}

> ${bioIn(code)} ${descriptionIn(code)}

${edition(code, '/llms.txt')}${t('twin.everyPageTwin', { home: twinPath(lp(code, '/')), accept: '`Accept: text/markdown`' })}

## ${t('frame.about')}

${facts.map((f) => `- ${f}`).join('\n')}
- ${t('twin.aka', { names: code === DEFAULT ? and(ALSO_KNOWN_AS) : l.and(ALSO_KNOWN_AS) })}

## ${t('twin.contact')}

- ${t('twin.linkEmail')}: ${EMAIL}
${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
`;
};
```

  `llmsTxt()` appends three sections that are already link lists (`## ${t('twin.pages')}`, `## ${t('twin.projects')}`,
  `## ${t('twin.optional')}`). The built English file has `## About` (10 plain bullets), `## Contact` (5 plain
  bullets), `## Pages`, `## Projects`, `## Optional`; 46 list lines in all. `/es/llms.txt` and the other six have
  the same shape with translated headings. `t('frame.about')` is also the header's About link, so the string stays
  in use.

- `scripts/verify-build.mjs`, the release guard. Its "every page and text file in every language" loop (about line
  40), after which this plan adds a check; `OTHER` (the seven language codes), `DIST`, `fail`, `fs` and `path` are
  already defined above it:

```js
// every page and text file in every language (src/i18n/locales.mjs)
for (const c of OTHER) for (const need of [`/${c}.html`, `/${c}/index.md`, … ]) {
  if (!exists(need)) fail(need, 'missing');
}
const is404 = (page) => page === '/404.html' || new RegExp(`^/(${OTHER.join('|')})/404\\.html$`).test(page);
```

- `astro.config.mjs:19-25`, which files date which page:

```js
const SOURCES = [
  [/^\/$/, () => ['public/ex/fighters.js', 'src/views/Home.astro']],
  [/^\/cards$/, () => ['public/ex/fighters.js', 'src/views/Cards.astro']],
  [/^\/cards\/([\w-]+)$/, (id) => ['public/ex/fighters.js', `public/og/${id}.jpg`, `public/ex/media/${id}`, 'src/views/Card.astro']],
  [/^\/about$/, () => ['src/lib/site.ts', 'src/views/About.astro']],
  [/^\/battle(\/arena)?$/, () => ['vendor/battle', 'public/battle', 'src/components/BattlePage.astro']],
];
```

  `lastmod` for a page is `git log -1 --format=%cI -- <those paths>` (plus `src/i18n/<language>` for a translated
  page); in a shallow clone a page whose files are older than the clone gets none. What each page prints from
  elsewhere: a card page's Battle link comes from `teamFor()` (`src/lib/cards.ts:185`), which reads the roster in
  `vendor/battle/vendor/engine.js` (`cards.ts:151-153`); the home page prints that roster in
  `<meta name="battle-roster">` (`src/views/Home.astro:58`) and the description from `src/lib/site.ts`
  (`Home.astro:4,11,17`); `/about` prints every card's line (`src/views/About.astro:48`, from
  `public/ex/fighters.js`). The questions on `/about` are worded in `src/lib/site.ts` since plan 011, which the
  `/about` list already names.

- The doc lines:
  - `docs/architecture.md:20`: `| Build-time card loader | `src/lib/cards.ts` | loads `markup.js`, `fighters.js`, `face.gen.js` and the rest in CommonJS sandboxes |`
  - `docs/architecture.md:96` says the Arena's twin is `/battle.md`. It is `/battle/arena.md` too (`twinsOf` in
    `src/lib/twins.ts` maps `/battle/arena` to the same text):

```
| `/battle`, `/battle/arena` | the Mat and Arena battle (r4/play) | `/battle.md` |
```

  - `docs/seo.md:22` says the footer links the sitemap. Only the Machine view's footer does
    (`src/components/Footer.astro:36-38`); the human footer links profiles, email, `/cards`, the twin and `llms.txt`:

```
- Footer: profiles, email, `/cards`, the page's twin, `llms.txt`, the sitemap.
```

  - `docs/seo.md:27-28` calls the facts "the About section of `llms.txt`" (step 1 removes that heading):

```
`FACTS` and `ALSO_KNOWN_AS` in `src/lib/site.ts`, each line with its public source in a comment. They feed the About
section of `llms.txt` and `llms-full.txt` and the questions on `/about`. Only public sources: this site, his previous
```

  - `docs/battle.md:22-27`, written on 2026-11-05, contradicted by the section above it ("Round 5 … prints the
    wall's own card") and by the rounds' own record (`r4/play/REQUESTS.md`, "battle-r4b, left in place (2026-11-08,
    at the round 5 merge)": that run "died after the 11-05 restart and was retired"):

```
## State on 2026-11-05

- The battle holds 18 of the 26 cards. The eight added on 11-01 have staged scenes in
  `r3/battle/broadcast/scenes/next/`; registering them (adopting `roster/battle-roster.json`, moving the scenes up,
  rebuilding the engine and kit) is merge work that waits for battle-r4b to finish writing r3/battle.
- The battle prints the round-3 card face. Swapping in the ex card needs the kit's card environment rebuilt from r4/ex
  (face data, pop-out cuts, frames and borders), with the same wait.
```

  - `docs/performance.md:187-189` gives the home page's HTML as 50.6 KB gzip. Measured on the lane branch at plan
    011 with `gzip -9 -c dist/index.html | wc -c`: 55,468 bytes (341,580 raw); a card page
    (`dist/cards/turboslide.html`) 17,202; About 15,845:

```
The terminal (2026-11-08) adds Katagami Mono, 21.7 KB, fetched at idle after a Human page has loaded (cached a year,
like the site face), and each card's art as text: home HTML 43.5 to 50.6 KB gzip, a card page 15.1 to 16.6, About
14.0 to 15.2. The art is built from the cards' own pictures at build, so no picture is decoded for it.
```

  - `src/lib/SKILL.md:14-16`, `AGENTS.md:11` and `docs/sync.md` ("Pins", lines 88-99): the loader.
    `src/lib/cards.ts` runs the rounds' scripts with `vm.runInNewContext` and hands them the real `console` and a
    `require`, and loads `tools/wall-rule.mjs` and the battle's `engine.js` with a plain `import()`. Node's
    documentation says `node:vm` is not a security mechanism. So round code runs with the build's own rights, on
    this Mac and on Vercel; what protects the build is the review that happens when a pin moves.

```
- `cards.ts`: runs `public/ex/{fighters,markup,art,media.gen}.js` and `vendor/ex/face.gen.js` in `vm` sandboxes with a
  CommonJS shim, because this repo is ESM and the round files are classic scripts with CommonJS exports. Mirrors r4/ex
  `build.mjs`'s `env`, so `card(f)` prints exactly what the rounds print.
```
```
| `src/lib/cards.ts` | loads the round card code at build in CommonJS sandboxes; `card()`, `fighters`, `whatOf()`, `factLines()`, the battle roster | yes |
```

Repo rules that apply (from `AGENTS.md`): the facts about Kevin are his, public and sourced: do not reword, add or
remove one; General Translation appears only in his bio and facts (these lines); never hand-edit `AGENTS.md`'s
`agent-docs:auto` blocks (they start at line 69; line 11 is hand-written) or a `SKILL.md` front matter; append an
entry to `memory.md`.

## Commands you will need

Run all of them in `~/repos/kevinliu-studio-p2a`. Dependencies are already installed there.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build and release guard | `pnpm build` | last line starts `verify-build: 256 pages, 248 sitemap URLs,` and ends `all checks pass` |
| Tests | `pnpm test` | `fail 0` |
| Full history present | `git rev-parse --is-shallow-repository` | `false` |
| `lastmod` against git | `node ~/k7-rescue/improve-audit/lane-a/p024/lastmod-check.mjs` | `lastmod: 7 pages match the last commit that changed what they print` |
| Page sizes | `for f in dist/index.html dist/cards/turboslide.html dist/about.html; do echo "$f $(wc -c < $f) $(gzip -9 -c $f \| wc -c)"; done` | three lines: path, raw bytes, gzip bytes (in the table `\|` stands for a plain `|`) |

zsh on macOS: no `timeout`; use `/usr/bin/grep`; never name a shell variable `path`. Do not start a server or a
browser. Do not run `pnpm check` (broken until plan 020) or `pnpm i18n:translate`.

## Scope

**In scope** (the only files you should modify):
- `src/lib/twins.ts` (the `intro` function only, and only the lines named in step 1)
- `scripts/verify-build.mjs` (one new check and one sentence in the header comment)
- `astro.config.mjs` (the `SOURCES` list and a comment above it)
- `docs/architecture.md` (lines 20 and 96), `docs/seo.md` (lines 22 and 27-28), `docs/battle.md` (the "State on
  2026-11-05" heading and its first two bullets), `docs/performance.md` (one paragraph added), `docs/sync.md` (end
  of "Pins"), `src/lib/SKILL.md` (the `cards.ts` bullet of the body), `AGENTS.md` (line 11 only)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- `src/i18n/` (every file) and `gt-lock.json`. The sentence `twin.everyPageTwin` and every other string stay as they
  are. If you find you need a new or changed English string, STOP.
- `FACTS`, `ALSO_KNOWN_AS`, `SOCIAL`, `EMAIL` in `src/lib/site.ts`.
- `llmsTxt()`'s Pages, Projects and Optional sections, and `llmsFullTxt()`.
- `src/lib/cards.ts`: this plan documents the loader, it does not change it.
- `AGENTS.md` beyond line 11 (line 88 repeats "sandboxes" inside a machine-written block: leave it) and the front
  matter of `src/lib/SKILL.md` (its `description:` line also says "sandboxes": leave it).
- Any other line of the docs, however stale it looks. Report it instead.

## Git workflow

- Work in the existing worktree `~/repos/kevinliu-studio-p2a` on branch `improve/p2-checks`. Do not create a branch
  or a worktree. Never edit another checkout. Never `git stash`.
- One commit for this plan, by explicit path, as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message: `fix(seo): llms.txt sections are link lists, lastmod counts what a page prints, the docs say what the code does`,
  a blank line, one or two sentences of body, a blank line, then `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Put the facts above the first `##` and make Contact a link list

In `src/lib/twins.ts`, inside `intro`:

1. Delete the line `## ${t('frame.about')}` and the empty line that follows it. The facts list then follows the
   `twin.everyPageTwin` sentence after one empty line.
2. Replace the two Contact lines

```ts
- ${t('twin.linkEmail')}: ${EMAIL}
${SOCIAL.map((s) => `- ${s.name}: ${s.url}`).join('\n')}
```

   with

```ts
- [${t('twin.linkEmail')}](mailto:${EMAIL})
${SOCIAL.map((s) => `- [${s.name}](${s.url})`).join('\n')}
```

The template then reads:

```ts
  return `# ${NAME}

> ${bioIn(code)} ${descriptionIn(code)}

${edition(code, '/llms.txt')}${t('twin.everyPageTwin', { home: twinPath(lp(code, '/')), accept: '`Accept: text/markdown`' })}

${facts.map((f) => `- ${f}`).join('\n')}
- ${t('twin.aka', { names: code === DEFAULT ? and(ALSO_KNOWN_AS) : l.and(ALSO_KNOWN_AS) })}

## ${t('twin.contact')}

- [${t('twin.linkEmail')}](mailto:${EMAIL})
${SOCIAL.map((s) => `- [${s.name}](${s.url})`).join('\n')}
`;
```

Change the comment line above `intro` to:
`// who he is and how to reach him: the top of llms.txt and llms-full.txt. The facts are free text above the first ##;`
`// every ## section is a list of links, as the llms.txt convention asks (the guard checks it)`

**Verify**: `/usr/bin/grep -c "## \${t('frame.about')}" src/lib/twins.ts` → `0`, and
`/usr/bin/grep -c "frame.about" src/lib/twins.ts` → at least `1` (the Pages section still links About).

### Step 2: Make the guard hold `llms.txt` to its convention

In `scripts/verify-build.mjs`, directly after the "every page and text file in every language" loop (after its
closing `}`) and before the line `const is404 = …`, add the content of
`~/k7-rescue/improve-audit/lane-a/p024/guard-llms.js.txt` (copy the file; do not retype):

```js
// llms.txt follows its convention (llmstxt.org): an H1, a blockquote summary, free text, then `##` sections that hold
// only lists of links, so a reader that takes each section as a link list (llms_txt2ctx) loses nothing
for (const c of ['', ...OTHER]) {
  const name = `${c && `/${c}`}/llms.txt`, f = path.join(DIST, name);
  if (!fs.existsSync(f)) continue;
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  if (!/^# \S/.test(lines[0])) fail(name, 'line 1 is not an H1');
  if (!lines.some((l) => l.startsWith('> '))) fail(name, 'no blockquote summary');
  let h2 = null;
  lines.forEach((l, i) => {
    if (/^## /.test(l)) { h2 = l; return; }
    if (i > 0 && /^#/.test(l)) fail(name, `line ${i + 1} is a heading that is not an H2: ${l}`);
    if (h2 && l.trim() && !/^- \[[^\]]+\]\([^)\s]+\)(: .+)?$/.test(l)) fail(name, `line ${i + 1} under "${h2}" is not a link item: ${l.slice(0, 70)}`);
  });
  if (!h2) fail(name, 'no ## section');
}
```

Add one sentence to the end of the comment block at the top of the file: `Each llms.txt keeps the llms.txt shape:
an H1, a summary, and ## sections that are lists of links.` Keep the `//` line style and line length.

**Verify**: `node --check scripts/verify-build.mjs` → exit 0.
**Verify** (the check sees today's shape; `dist/` still holds the build from before this plan):
`node scripts/verify-build.mjs | /usr/bin/grep -c 'is not a link item'` → `120` (15 lines in each of 8 files). If
`dist/` is missing, skip this and say so.

### Step 3: Count everything a page prints in its `lastmod`

In `astro.config.mjs`, replace the `SOURCES` list with:

```js
// a file belongs in a page's list when a change to it changes what the page shows a reader: the cards' data, the
// battle's roster (a card page's Battle link, the home page's dock), and site.ts (Kevin's description, facts and
// the questions on /about)
const SOURCES = [
  [/^\/$/, () => ['public/ex/fighters.js', 'vendor/battle/vendor/engine.js', 'src/lib/site.ts', 'src/views/Home.astro']],
  [/^\/cards$/, () => ['public/ex/fighters.js', 'src/views/Cards.astro']],
  [/^\/cards\/([\w-]+)$/, (id) => ['public/ex/fighters.js', 'vendor/battle/vendor/engine.js', `public/og/${id}.jpg`, `public/ex/media/${id}`, 'src/views/Card.astro']],
  [/^\/about$/, () => ['public/ex/fighters.js', 'src/lib/site.ts', 'src/views/About.astro']],
  [/^\/battle(\/arena)?$/, () => ['vendor/battle', 'public/battle', 'src/components/BattlePage.astro']],
];
```

**Verify**: `node --check astro.config.mjs` → exit 0.

### Step 4: Build and check both

Run `pnpm test`, then `pnpm build`.

**Verify**: `pnpm test` → `fail 0`. `pnpm build` → the last line ends `all checks pass` (the guard's new llms check
is part of it).
**Verify** (no line was lost): `/usr/bin/grep -c '^- ' dist/llms.txt` → `46`; and for the Spanish file
`/usr/bin/grep -c '^- ' dist/es/llms.txt` → `46`.
**Verify**: `/usr/bin/grep -c 'He is also known as Kevin B. Liu and Kevin Bowen Liu.' dist/llms.txt dist/llms-full.txt` →
`1` for each file; `/usr/bin/grep -c '^- \[GitHub\](https://github.com/Kevin-Liu-01)$' dist/llms.txt` → `1`;
`/usr/bin/grep -c '^- \[Email\](mailto:hello@kevinliu.studio)$' dist/llms.txt` → `1`;
`/usr/bin/grep -c '^## ' dist/llms.txt` → `4`.
**Verify** (every fact is still there, word for word):

```
node -e "import('./src/lib/site.ts').then((s) => { const t = require('fs').readFileSync('dist/llms.txt', 'utf8'); const lost = s.FACTS.filter((f) => !t.includes('- ' + f + '\n')); console.log(lost.length ? 'LOST ' + JSON.stringify(lost) : 'facts: all ' + s.FACTS.length + ' printed above the first ##: ' + (t.indexOf('- ' + s.FACTS.at(-1)) < t.indexOf('\n## '))); })"
```

→ `facts: all 9 printed above the first ##: true`.
**Verify**: `node ~/k7-rescue/improve-audit/lane-a/p024/lastmod-check.mjs` →
`lastmod: 7 pages match the last commit that changed what they print`.

### Step 5: Correct the docs

Make each replacement exactly. Do not reflow other lines.

1. `docs/architecture.md:20`: replace `and the rest in CommonJS sandboxes |` with
   ``and the rest through a CommonJS shim (`node:vm` contexts, which are not isolation) |``
2. `docs/architecture.md:96`: replace the last cell `` `/battle.md` `` so the row reads:

```
| `/battle`, `/battle/arena` | the Mat and Arena battle (r4/play) | `/battle.md`, `/battle/arena.md` (the same text) |
```

3. `docs/seo.md:22`: replace the line with:

```
- Footer: profiles, email, `/cards`, the page's twin and `llms.txt`; the Machine view's footer adds `llms-full.txt` and the sitemap.
```

4. `docs/seo.md:27-28`: replace these two whole lines (the paragraph's first two; leave the lines after them, which
   begin "site, his GitHub profile", untouched) with the three lines below:

```
`FACTS` and `ALSO_KNOWN_AS` in `src/lib/site.ts`, each line with its public source in a comment. They feed the list
at the top of `llms.txt` and `llms-full.txt` (above the first `##`, where the llms.txt convention puts free text; its
`##` sections are link lists, and the guard fails the build otherwise) and the questions on `/about`. Only public sources: this site, his previous
```

5. `docs/battle.md`: replace the heading `## State on 2026-11-05` and its first two bullets (quoted in "Current
   state"; keep the two bullets after them, about Claude of Tanks' videos and the dock) with:

```
## Open work (written 2026-11-05, corrected 2026-11-10)

- The battle holds 18 of the 26 cards. The eight added on 11-01 have staged scenes in
  `r3/battle/broadcast/scenes/next/`; registering them (adopting `roster/battle-roster.json`, moving the scenes up,
  rebuilding the engine and kit) waits on a kit rebuild from r3/battle. The run that was writing r3/battle
  (battle-r4b) was retired on 2026-11-08 with its work left in place there, so that work has to be accepted or set
  aside first (rounds `r4/play/REQUESTS.md`, "battle-r4b, left in place").
- Since round 5 the board prints the wall's own card (above). The Broadcast kit's cutscenes still carry the round-3
  card sprite and art masks (`public/battle/vendor/cards/`); the same kit rebuild replaces them.
```

6. `docs/performance.md`: directly after the paragraph that ends "so no picture is decoded for it.", add an empty
   line and this paragraph, with the three gzip numbers and the raw home size from the "Page sizes" command in the
   table, run on your build from step 4:

```
Measured again on 2026-11-10 (`gzip -9 -c dist/<page>.html | wc -c`, after the framed templates, round 5 and the
language key): home HTML <home gzip> bytes gzip (<home raw> raw), a card page (`cards/turboslide`) <card gzip>,
About <about gzip>.
```

7. `docs/sync.md`: at the end of the "Pins" section (after the paragraph that ends "The pins are read from the
   rounds' own checkout either way.", before `## The lock`), add an empty line and:

```
Moving a pin is a code review, not only a content review. The build runs round code with the build's own rights, here
and on Vercel: `src/lib/cards.ts` loads `fighters.js`, `markup.js`, `art.js`, `media.gen.js`, `face.gen.js` and the
ground recipes through `node:vm` only to give classic scripts a CommonJS `module` (Node's documentation says `vm` is
not a security boundary), and it imports `tools/wall-rule.mjs` and the battle's `engine.js` directly. The scan looks
for banned strings and location metadata, never for what a script does.
```

8. `src/lib/SKILL.md`, the `cards.ts` bullet: replace `` in `vm` sandboxes with a `` with
   `` in `vm` contexts with a `` and add one sentence at the end of the bullet (after "prints exactly what the
   rounds print."), as a new indented line:

```
  The `vm` contexts are a module shim, not isolation: round code runs with the build's rights (docs/sync.md, Pins).
```

9. `AGENTS.md:11`: replace `loads the round card code at build in CommonJS sandboxes;` with
   `loads the round card code at build through a CommonJS shim (not isolation);`. Touch nothing else in the file.

**Verify**:

```
/usr/bin/grep -c '/battle/arena.md` (the same text)' docs/architecture.md; /usr/bin/grep -c "the Machine view's footer adds" docs/seo.md; /usr/bin/grep -c '^## Open work (written 2026-11-05, corrected 2026-11-10)$' docs/battle.md; /usr/bin/grep -c 'waits for battle-r4b to finish' docs/battle.md; /usr/bin/grep -c 'Measured again on 2026-11-10' docs/performance.md; /usr/bin/grep -c 'Moving a pin is a code review' docs/sync.md; /usr/bin/grep -c 'a module shim, not isolation' src/lib/SKILL.md; /usr/bin/grep -c 'CommonJS sandboxes' docs/architecture.md; /usr/bin/grep -c 'About$' docs/seo.md
```

→ `1`, `1`, `1`, `0`, `1`, `1`, `1`, `0`, `0`, in that order.
**Verify**: `/usr/bin/grep -c '<home gzip>\|<card gzip>\|<about gzip>\|<home raw>' docs/performance.md` → `0` (you
filled the numbers in).
**Verify**: `git diff -- AGENTS.md | /usr/bin/grep -c '^[-+][^-+]'` → `2` (one line out, one in), and
`git diff -- src/lib/SKILL.md | /usr/bin/grep -c '^[-+]description:'` → `0`.

### Step 6: Record and commit

Append an entry to the end of `memory.md` in the file's existing shape (a `## 2026-11-10: <title>
(improve/p2-checks, plan 024)` heading, then `- **Type**:`, `- **Changed**:`, `- **Checked**:`, `- **Open**:`
bullets). Under Open write: "the loader is documented, not isolated; `AGENTS.md:88` (a machine-written block) and
the front matter of `src/lib/SKILL.md` still say 'sandboxes' until agent-docs is rerun; Kevin may prefer the
`## About` heading back in `llms.txt` (a one-line revert in `intro`, which the guard's check would then refuse)".

Commit the twelve files (`src/lib/twins.ts scripts/verify-build.mjs astro.config.mjs docs/architecture.md docs/seo.md
docs/battle.md docs/performance.md docs/sync.md src/lib/SKILL.md AGENTS.md memory.md`; that is eleven paths, the
twelfth name in "In scope" being a second line of one of them) by explicit path with the message in "Git workflow".

**Verify**: `git status --short` → empty. `git show --stat --format=%ae HEAD` lists exactly those eleven paths.

## Test plan

- The llms.txt shape is a new check in the release guard (`scripts/verify-build.mjs`), so every build tests it, in
  all eight languages. Step 2 shows it failing on the old output (120 lines under `## About` and `## Contact`);
  step 4 shows the build passing with it.
- `lastmod` is checked against git for seven pages by `p024/lastmod-check.mjs` (a reviewer's script, not part of the
  repo, because it needs full history, which Vercel's clone does not have).
- Fact preservation is checked by counting list lines and by an exact-text check of all nine facts.
- Docs are checked by the grep list in step 5.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` ends with `all checks pass`; `pnpm test` → `fail 0`
- [ ] `/usr/bin/grep -c '^## ' dist/llms.txt` → `4`, and `/usr/bin/grep -c '^- ' dist/llms.txt` → `46`
- [ ] step 4's facts command prints `facts: all 9 printed above the first ##: true`
- [ ] `node ~/k7-rescue/improve-audit/lane-a/p024/lastmod-check.mjs` prints `lastmod: 7 pages match the last commit that changed what they print`
- [ ] step 5's grep list prints `1 1 1 0 1 1 1 0 0`
- [ ] `git diff --name-only HEAD~1..HEAD -- public vendor src/i18n gt-lock.json` prints nothing
- [ ] `git diff --name-only HEAD~1..HEAD` lists only the eleven paths in step 6

## STOP conditions

Stop and report back (do not improvise) if:

- `intro` in `src/lib/twins.ts` does not have the About and Contact blocks shown in "Current state", or `SOURCES` in
  `astro.config.mjs` differs from the excerpt.
- After step 1 any fact line that is in `src/lib/site.ts` `FACTS` is missing from `dist/llms.txt`.
- The build prints `[i18n] … changed since it was translated` or stops on an untranslated English change: you have
  touched a translated string; undo it and report.
- `git rev-parse --is-shallow-repository` prints `true` (the `lastmod` check cannot run; report it as not run).
- A doc line you are told to replace is not there word for word. Report the line you found; do not paraphrase a
  replacement.

## Maintenance notes

- Kevin may prefer the `## About` heading for human readers. It is a one-line revert in `intro`; the guard's check
  would then fail, by design, so the check would have to allow that one section. Say so when the branch is handed
  over so he can choose.
- A new page route, or a new file that changes what a page shows, needs a line in `SOURCES`. Listing a file too
  widely makes `lastmod` move when nothing a reader sees changed, which teaches crawlers to ignore it.
- When the 26-card battle lands, rewrite `docs/battle.md`'s "Open work" section; do not append to it.
- The loader paragraph in `docs/sync.md` is the place to record any future isolation (for example running round
  scripts in a worker with Node's `--permission`).
- Deferred, recorded elsewhere: hiding the Machine forms from HTML-to-text readers, and a `Link: rel="alternate"`
  header for the twins.
