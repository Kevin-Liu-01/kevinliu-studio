# Plan 011: Striking a fact about Kevin can no longer put the wrong answer under a question on /about

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- src/lib/site.ts src/lib/twins.ts docs/seo.md src/lib/SKILL.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

`/about`, its Markdown twin and `llms-full.txt` print two questions with answers ("What did he do before General
Translation?", "What else has he done?"). The answers are picked out of a list of nine public facts about Kevin by
position: the fourth and fifth facts answer the first question, everything from the sixth on answers the second. The
repo's own docs tell Kevin he may strike any fact by deleting its line. Deleting any of the first five lines shifts
every later position, so the first question would silently be answered with, for example, the internships and the
math-competition line, and the build would stay green. After this plan each fact says which question it answers,
striking a line shortens only its own answer, and a question left with no fact stops the build with a message that
says what to do.

## Current state

- `src/lib/site.ts` — who the site is about. The fact list (`src/lib/site.ts:15-29`):

```ts
// The answer to "who is Kevin Liu": the About section of llms.txt, llms-full.txt and /about.md. Each line is a public
// fact with its source beside it, so any of them can be struck. Sources: this site's /about; his previous site
// (portfoliomon.kevinliu.studio llms.txt, experience.md, awards.md, certifications.md); github.com/Kevin-Liu-01; the
// public Kevin-Wiki pages ommc, hackathon-projects and hackprinceton. Checked 2026-11-07.
export const FACTS: readonly string[] = [
  'Kevin Liu is an infra-product engineer at General Translation in San Francisco, since July 2026.', // /about; previous site experience.md
  'He studies computer science at Princeton University (B.S.E., class of 2028).', // previous site experience.md; GitHub bio "cs @princeton"
  'He has been coding and designing since he was 12.', // /about
  'Before General Translation he was a founding engineer at Dedalus Labs (January to July 2026), where he built agent infrastructure, and at Sevenfold AI (June to November 2025).', // previous site llms.txt
  'He interned at Amazon (2025), Bloomberg (2023 and 2024) and AT&T Labs Research (2023).', // previous site llms.txt
  'He co-founded the Online Monmouth Math Competition (OMMC), a 501(c)(3) nonprofit math contest, and leads its technology.', // previous site experience.md; wiki ommc
  'He was lead developer of HackPrinceton\'s websites and built Podium, its judging tool.', // previous site experience.md; wiki hackprinceton
  'He won 13 hackathons in a row; his team\'s RecyclAIble took first place in hardware at PennApps XXIII (2022).', // wiki hackathon-projects; previous site awards.md
  'He is the author of a paper on speech transcription for Huntington\'s disease (IYRC 2023), which won a Sigma Xi award, and a co-author of a paper on heat flow in lithium-ion polymer batteries (IEEE MIT URTC 2024).', // previous site awards.md, certifications.md; doi.org/10.1109/URTC65039.2024.10937635
];
```

  `site.ts` imports nothing, so Node 24 can import it directly (it strips the types).

- `src/lib/twins.ts` — writes every Markdown twin and the llms files. The questions (`src/lib/twins.ts:17-22`):

```ts
// Questions /about asks and answers below Kevin's own words: only those the words above do not already answer, from
// site.ts FACTS (prose, no FAQ markup)
export const QA: [string, string][] = [
  ['What did he do before General Translation?', `${FACTS[3].replace(/^Before General Translation he/, 'He')} ${FACTS[4]}`],
  ['What else has he done?', FACTS.slice(5).join(' ')],
];
```

  Its import line (`src/lib/twins.ts:5`):

```ts
import { SITE, NAME, BIO, ABOUT, FACTS, ALSO_KNOWN_AS, DESCRIPTION, SOCIAL, EMAIL, PREVIOUS, type Run } from './site';
```

  `FACTS` is also printed whole at `src/lib/twins.ts:153` (`${FACTS.map((f) => `- ${f}`).join('\n')}`); that use
  stays.

- `QA` is read by `src/pages/about.astro:36` (the page) and `src/lib/twins.ts:134` (the twin). Neither changes.

- `docs/seo.md:27-29`:

```
`FACTS` and `ALSO_KNOWN_AS` in `src/lib/site.ts`, each line with its public source in a comment. They feed the About
section of `llms.txt` and `llms-full.txt` and the questions on `/about`. Only public sources: this site, his previous
site, his GitHub profile and Kevin-Wiki pages `kb` does not mark private. Strike a line by deleting it.
```

- `src/lib/SKILL.md:18`:

```
- `site.ts`: `SITE`, `BIO`, `FACTS` (public, sourced), `ALSO_KNOWN_AS`, `SOCIAL`, `EMAIL`, `PREVIOUS`, the `person` JSON-LD node.
```

Content rules that apply (from `AGENTS.md` and `docs/content.md`): the facts are Kevin's and public; do not reword,
reorder, add or remove any fact. General Translation is named only in Kevin's own bio and facts on `/about` and the
llms files, which is where these lines print. Append an entry to `memory.md` after the change.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Build and release guard | `pnpm build` | last line starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass` |
| Fingerprint what the facts print | `shasum -a 256 dist/about.html dist/about.md dist/llms.txt dist/llms-full.txt` | four lines; identical before and after this plan |
| The strike check (created in step 3) | `node scripts/check-facts.mjs` | `facts: striking a line moves no other answer; an emptied question stops the build`, exit 0 |

There is no test runner, linter or CI in this repo. Do not run `pnpm check` (it is broken on `main`).

## Scope

**In scope** (the only files you should modify):
- `src/lib/site.ts` (the `FACTS` block only)
- `src/lib/twins.ts` (the import line and lines 17-22 only)
- `scripts/check-facts.mjs` (create)
- `docs/seo.md` (the paragraph quoted above)
- `src/lib/SKILL.md` (line 18 only; never its front matter)
- `memory.md` (append one entry)
- `plans/README.md` (your status row)

**Out of scope** (do NOT touch, even though they look related):
- The words of any fact, their order, and their source comments.
- `src/pages/about.astro`: it reads `QA` and needs no change.
- The `## About` list in the llms files (`src/lib/twins.ts:151-154`). Plan 024 moves it; do not pre-empt it.
- `AGENTS.md`'s `agent-docs:auto` blocks (machine-maintained).
- Adding a test runner. Plan 001 adds one; this plan's check is a plain script.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/011-about-questions-by-key` cut from
  `origin/main`. Never edit the main checkout (other sessions use it). Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`. For this plan:
  `fix(about): each fact names the question it answers, so striking one moves no other answer`
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Fingerprint today's output

Run `pnpm install --frozen-lockfile`, then `pnpm build`, then:

```
shasum -a 256 dist/about.html dist/about.md dist/llms.txt dist/llms-full.txt > "$TMPDIR/plan-011-before.txt"; cat "$TMPDIR/plan-011-before.txt"
```

**Verify**: four lines, one per file. Keep the file for step 4.

### Step 2: File each fact under its question

In `src/lib/site.ts`, replace the block from `export const FACTS: readonly string[] = [` through its closing `];`
(lines 19-29) with the block below. The nine texts and their source comments are the same, in the same order; each
is wrapped in `{ text: … }`, and six of them gain a `q`. Keep the four comment lines above the block (lines 15-18)
as they are.

```ts
// `q` files a fact under one of /about's questions (twins.ts QA): 'before' answers "What did he do before General
// Translation?", 'else' answers "What else has he done?". A fact without `q` appears only in the llms files' list.
// Striking a line removes it from its question and nothing else moves.
export type Fact = { text: string; q?: 'before' | 'else' };
export const FACT_LIST: readonly Fact[] = [
  { text: 'Kevin Liu is an infra-product engineer at General Translation in San Francisco, since July 2026.' }, // /about; previous site experience.md
  { text: 'He studies computer science at Princeton University (B.S.E., class of 2028).' }, // previous site experience.md; GitHub bio "cs @princeton"
  { text: 'He has been coding and designing since he was 12.' }, // /about
  { text: 'Before General Translation he was a founding engineer at Dedalus Labs (January to July 2026), where he built agent infrastructure, and at Sevenfold AI (June to November 2025).', q: 'before' }, // previous site llms.txt
  { text: 'He interned at Amazon (2025), Bloomberg (2023 and 2024) and AT&T Labs Research (2023).', q: 'before' }, // previous site llms.txt
  { text: 'He co-founded the Online Monmouth Math Competition (OMMC), a 501(c)(3) nonprofit math contest, and leads its technology.', q: 'else' }, // previous site experience.md; wiki ommc
  { text: 'He was lead developer of HackPrinceton\'s websites and built Podium, its judging tool.', q: 'else' }, // previous site experience.md; wiki hackprinceton
  { text: 'He won 13 hackathons in a row; his team\'s RecyclAIble took first place in hardware at PennApps XXIII (2022).', q: 'else' }, // wiki hackathon-projects; previous site awards.md
  { text: 'He is the author of a paper on speech transcription for Huntington\'s disease (IYRC 2023), which won a Sigma Xi award, and a co-author of a paper on heat flow in lithium-ion polymer batteries (IEEE MIT URTC 2024).', q: 'else' }, // previous site awards.md, certifications.md; doi.org/10.1109/URTC65039.2024.10937635
];
export const FACTS: readonly string[] = FACT_LIST.map((f) => f.text);
// the facts filed under one question, in order; the build stops when a question has none left
export function factsFor(q: NonNullable<Fact['q']>): string[] {
  const xs = FACT_LIST.filter((f) => f.q === q).map((f) => f.text);
  if (!xs.length) throw new Error(`site.ts: no fact is filed under q: '${q}'. File one under it, or delete that question from QA in src/lib/twins.ts`);
  return xs;
}
```

Then in `src/lib/twins.ts`:

1. In the import line (line 5), add `factsFor` after `FACTS`:

```ts
import { SITE, NAME, BIO, ABOUT, FACTS, factsFor, ALSO_KNOWN_AS, DESCRIPTION, SOCIAL, EMAIL, PREVIOUS, type Run } from './site';
```

2. Replace lines 17-22 (the comment and `QA`) with:

```ts
// Questions /about asks and answers below Kevin's own words: only those the words above do not already answer. Each
// answer is the facts filed under it in site.ts (FACT_LIST `q`), never a position in the list (prose, no FAQ markup)
export const QA: [string, string][] = [
  ['What did he do before General Translation?', factsFor('before').join(' ').replace(/^Before General Translation he/, 'He')],
  ['What else has he done?', factsFor('else').join(' ')],
];
```

**Verify**: `grep -c 'FACTS\[' src/lib/twins.ts` → `0`, and `grep -c 'FACTS.slice' src/lib/twins.ts` → `0`.
**Verify**: `node -e "import('./src/lib/site.ts').then((s) => console.log(s.FACTS.length, s.factsFor('before').length, s.factsFor('else').length))"` → `9 2 4`.

### Step 3: Add the strike check

Create `scripts/check-facts.mjs` with exactly this content:

```js
#!/usr/bin/env node
// Strikes facts from a copy of src/lib/site.ts (Kevin may delete any line, docs/seo.md) and checks what /about's
// questions would then say: no other answer moves, and a question left with no fact stops the build.
//   node scripts/check-facts.mjs        (run from the repo root; needs Node 24, which strips the types)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const src = fs.readFileSync('src/lib/site.ts', 'utf8');
const load = async (drop, name) => {
  const kept = src.split('\n').filter((l) => !drop.some((d) => l.includes(d))).join('\n');
  const f = path.join(os.tmpdir(), `site-${name}-${process.pid}.ts`);
  fs.writeFileSync(f, kept);
  try { return await import(f); } finally { fs.rmSync(f); }
};
const BEFORE = 'Before General Translation he was', INTERNED = 'He interned at';
const whole = await load([], 'whole');
const one = await load([BEFORE], 'one');
const none = await load([BEFORE, INTERNED], 'none');
const fails = [];
if (whole.factsFor('before').length !== 2 || whole.factsFor('else').length !== 4) fails.push('whole: expected 2 facts under before and 4 under else');
if (one.factsFor('before').length !== 1 || !one.factsFor('before')[0].startsWith(INTERNED)) fails.push('one struck: the before answer is not the internships line alone');
if (one.factsFor('else').join('|') !== whole.factsFor('else').join('|')) fails.push('one struck: the else answer moved');
if (one.FACTS.length !== whole.FACTS.length - 1) fails.push('one struck: the list did not lose exactly one line');
let threw = false;
try { none.factsFor('before'); } catch { threw = true; }
if (!threw) fails.push('both struck: factsFor("before") must throw, so the build stops');
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log('facts: striking a line moves no other answer; an emptied question stops the build');
```

**Verify**: `node scripts/check-facts.mjs` → `facts: striking a line moves no other answer; an emptied question stops the build`, exit 0.

### Step 4: Build and compare with the fingerprint

Run `pnpm build`, then:

```
shasum -a 256 dist/about.html dist/about.md dist/llms.txt dist/llms-full.txt | diff - "$TMPDIR/plan-011-before.txt" && echo identical
```

**Verify**: `pnpm build` ends `all checks pass`.
**Verify**: the `diff` prints nothing and the command prints `identical`. This change must not alter one byte of
what the site prints.

### Step 5: Keep the docs true, record and commit

In `docs/seo.md`, replace the sentence `Strike a line by deleting it.` (end of line 29) with:

```
Strike a line by deleting it: a line's `q` files it under one of the questions on `/about`, so its answer gets
shorter and no other answer moves; a question left with no line stops the build and says so
(`node scripts/check-facts.mjs` checks both).
```

In `src/lib/SKILL.md`, line 18, replace `` `FACTS` (public, sourced), `` with
`` `FACT_LIST` (public, sourced; `q` files a fact under a question on /about), `FACTS`, `factsFor`, ``.

Append an entry to the end of `memory.md` in the file's existing shape (a `## 2026-MM-DD: <title> (<branch>, <agent>)`
heading, then `- **Type**:`, `- **Changed**:`, `- **Checked**:`, `- **Open**:` bullets). Under Checked write that
the four built files are byte-identical to before and give the output of `node scripts/check-facts.mjs`.

Commit `src/lib/site.ts src/lib/twins.ts scripts/check-facts.mjs docs/seo.md src/lib/SKILL.md memory.md` by explicit
path with the message in "Git workflow".

**Verify**: `git status --short` → empty.

## Test plan

- New check: `scripts/check-facts.mjs`. Cases: the whole list (2 facts under `before`, 4 under `else`); the "Before
  General Translation" line struck (the first answer is the internships line alone, the second answer is unchanged,
  the list is one shorter); both `before` lines struck (`factsFor('before')` throws). The first two are the
  regression this plan fixes: on `main`, striking that line would answer the first question with the internships
  and the OMMC line.
- No test runner exists in this repo; the script follows `scripts/smoke.mjs`'s style (collect failures, print them,
  exit 1). When plan 001's `pnpm test` exists, this script can be called from it.
- Verification: `node scripts/check-facts.mjs` passes, and the four built files are byte-identical to before.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` ends with `all checks pass`
- [ ] `shasum -a 256 dist/about.html dist/about.md dist/llms.txt dist/llms-full.txt | diff - "$TMPDIR/plan-011-before.txt"` prints nothing
- [ ] `node scripts/check-facts.mjs` exits 0
- [ ] `grep -c 'FACTS\[\|FACTS.slice' src/lib/twins.ts` → `0`
- [ ] `git diff --name-only origin/main...HEAD` lists only the files in "In scope"
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `src/lib/site.ts`'s `FACTS` no longer holds exactly the nine lines quoted in "Current state" (Kevin struck or
  added one since). Do not guess which question a new line answers: report the list you found.
- `src/lib/twins.ts:19-22` no longer reads `FACTS[3]`, `FACTS[4]` and `FACTS.slice(5)`.
- After step 4 any of the four files differs from the fingerprint. Show the `diff` of `dist/about.md` against a build
  of `origin/main`; do not adjust the text to match.
- `node -e "import('./src/lib/site.ts')"` fails on a syntax Node cannot strip (then the check script cannot run).

## Maintenance notes

- A new fact gets `q: 'before'` or `q: 'else'` only if it belongs in that answer; without `q` it appears in the llms
  files' list alone. A new question needs a new `q` value in the `Fact` type and a row in `QA`.
- The first answer drops the words "Before General Translation he" from its first fact so it does not repeat the
  question. If that fact is struck, the answer starts with whatever `before` fact remains, unchanged.
- Plan 024 moves the facts list inside `llms.txt`; it reads `FACTS`, which this plan keeps as an export.
- A reviewer should compare the nine texts in the diff character by character (they must be untouched) and confirm
  the `q` filing matches the old positions: old 4 and 5 are `before`, old 6 to 9 are `else`.
