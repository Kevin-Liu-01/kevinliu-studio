# Plan 011: Striking a fact about Kevin can no longer put the wrong answer under a question on /about

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT edit `plans/README.md`: the audit session
> keeps the index.
>
> **Drift check (run first)**: `git diff --stat 4025230..HEAD -- src/lib/site.ts src/lib/twins.ts src/i18n/source.mjs docs/seo.md src/lib/SKILL.md`
> must print nothing (this is the first plan on the lane branch). If it prints a file, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (uses `pnpm test`, which plan 001 added and which is on the base)
- **Category**: bug
- **Planned at**: commit `4025230` (`feat/i18n`), 2026-11-10. Refreshed from the `c6245d9` version by lane A: the
  finding is still present, and a second copy of it now lives in `src/i18n/source.mjs`.

## Why this matters

`/about`, its Markdown twin and `llms-full.txt` print two questions with answers ("What did he do before General
Translation?", "What else has he done?"). The answers are picked out of a list of nine public facts about Kevin by
position: the fourth and fifth facts answer the first question, everything from the sixth on answers the second. The
repo's own docs tell Kevin he may strike any fact by deleting its line. Deleting any of the first five lines shifts
every later position, so the first question would silently be answered with, for example, the internships and the
math-competition line, and the build would stay green. Since the i18n work the same positions are written out a
second time in the file that produces the English source of the translations. After this plan each fact says which
question it answers, the questions are defined once, striking a line shortens only its own answer, and a question
left with no fact stops the build with a message that says what to do.

## Current state

All paths are in the lane worktree `~/repos/kevinliu-studio-p2a` (branch `improve/p2-checks`).

- `src/lib/site.ts:15-29`, the fact list. `site.ts` imports nothing, so Node 24 imports it directly (it strips the
  types); `scripts/i18n-extract.mjs:15` already does.

```ts
// The answer to "who is Kevin Liu": the About section of llms.txt, llms-full.txt and /about.md. Each line is a public
// fact with its source beside it, so any of them can be struck. Sources: this site's /about; his previous site
// (portfoliomon.kevinliu.studio llms.txt, experience.md, awards.md, certifications.md); github.com/Kevin-Liu-01; the
// public Kevin-Wiki pages ommc, hackathon-projects and hackprinceton. Checked 2026-11-07.
export const FACTS: readonly string[] = [
  'Kevin Liu is an infra-product engineer at General Translation in San Francisco, since July 2026.', // /about; previous site experience.md
  ... (nine lines in all, each a quoted string, a comma and a source comment)
];
```

- `src/lib/twins.ts:6` (import) and `src/lib/twins.ts:23-29` (the questions, by position):

```ts
import { SITE, NAME, BIO, ABOUT, FACTS, ALSO_KNOWN_AS, DESCRIPTION, SOCIAL, EMAIL, PREVIOUS, type Run } from './site';
```

```ts
// Questions /about asks and answers below Kevin's own words: only those the words above do not already answer, from
// site.ts FACTS (prose, no FAQ markup)
export const QA: [string, string][] = [
  ['What did he do before General Translation?', `${FACTS[3].replace(/^Before General Translation he/, 'He')} ${FACTS[4]}`],
  ['What else has he done?', FACTS.slice(5).join(' ')],
];
export const qaOf = (code = DEFAULT): [string, string][] => (code === DEFAULT ? QA : L(code).c.qa.map((x) => [x.q, x.a]));
```

  `FACTS` is also read at `src/lib/twins.ts:181` (`const facts = code === DEFAULT ? FACTS : l.c.facts;`); that use
  stays. `QA` is read only by `qaOf` (same file); `src/views/About.astro:4,13` reads `qaOf`. Neither changes.

- `src/i18n/source.mjs:5` and `:20-31`, the second copy (new since the plan was first written). `source()` is called
  with `{ ...cards, ...site }` by `scripts/i18n-extract.mjs:18` and `src/i18n/index.ts:24`, so anything `site.ts`
  exports reaches it:

```js
export function source({ fighters, rules, whatOf, answerOf, moveLine, BIO, DESCRIPTION, ABOUT, FACTS }) {
```

```js
    facts: [...FACTS],
    qa: [
      { q: 'What did he do before General Translation?', a: `${FACTS[3].replace(/^Before General Translation he/, 'He')} ${FACTS[4]}` },
      { q: 'What else has he done?', a: FACTS.slice(5).join(' ') },
    ],
```

  `src/i18n/en/content.json` is what `source()` returns, written by `node scripts/i18n-extract.mjs`. The build stops
  if that file's bytes differ from the hash in `gt-lock.json` (`src/i18n/index.ts:29-33`). This plan must leave
  `content.json` byte-identical; `node scripts/i18n-extract.mjs --check` proves it.

- `docs/seo.md:27-29`:

```
`FACTS` and `ALSO_KNOWN_AS` in `src/lib/site.ts`, each line with its public source in a comment. They feed the About
section of `llms.txt` and `llms-full.txt` and the questions on `/about`. Only public sources: this site, his previous
site, his GitHub profile and Kevin-Wiki pages `kb` does not mark private. Strike a line by deleting it.
```

- `src/lib/SKILL.md:17-18`:

```
- `twins.ts`: `homeMd`, `cardsMd`, `cardMd`, `battleMd`, `aboutMd`, `llmsTxt`, `llmsFullTxt`, `QA`, and `TWINS` (path to twin).
- `site.ts`: `SITE`, `BIO`, `FACTS` (public, sourced), `ALSO_KNOWN_AS`, `SOCIAL`, `EMAIL`, `PREVIOUS`, the `person` JSON-LD node.
```

- Tests: `pnpm test` is `node --test "scripts/**/*.test.mjs"` (`package.json:18`); it finds any new
  `scripts/*.test.mjs` by itself. Existing style: `scripts/lock-check.test.mjs` (`node:test`, `node:assert/strict`).

Content rules that apply (from `AGENTS.md` and `docs/content.md`): the facts are Kevin's and public; do not reword,
reorder, add or remove any fact. General Translation is named only in Kevin's own bio and facts on `/about` and the
llms files, which is where these lines print. Append an entry to `memory.md` after the change.

## Commands you will need

Run all of them in `~/repos/kevinliu-studio-p2a`. Dependencies are already installed there.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build and release guard | `pnpm build` | last line starts `verify-build: 256 pages, 248 sitemap URLs,` and ends `all checks pass` |
| Fingerprint every page, twin and text file | `(cd dist && find . -type f \( -name '*.html' -o -name '*.md' -o -name '*.txt' \) \| LC_ALL=C sort \| xargs shasum -a 256)` | one line per file; identical before and after this plan |
| Translation source unchanged | `node scripts/i18n-extract.mjs --check` | `i18n: content.json matches the cards and site.ts` |
| Tests | `pnpm test` | `# fail 0` (or `ℹ fail 0`) |

zsh on macOS: there is no `timeout`; the shell's `grep` is ugrep, so use `/usr/bin/grep`; never name a shell variable
`path`. Do not start a server or a browser. Do not run `pnpm check` (broken until plan 020) or `pnpm i18n:translate`
(paid, needs a key).

## Scope

**In scope** (the only files you should modify):
- `src/lib/site.ts` (the `FACTS` block only)
- `src/lib/twins.ts` (the import line and the `QA` comment and definition only)
- `src/i18n/source.mjs` (the parameter list and the `qa:` entry only)
- `scripts/facts.test.mjs` (create)
- `docs/seo.md` (the sentence quoted above)
- `src/lib/SKILL.md` (lines 17 and 18 only; never its front matter)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- The words of any fact, their order, and their source comments.
- `src/i18n/en/content.json`, every other file under `src/i18n/`, and `gt-lock.json`. If the extract check says
  `content.json` is stale, that is a STOP condition, not something to regenerate.
- `src/views/About.astro`: it reads `qaOf` and needs no change.
- The About list in the llms files (`intro()` in `src/lib/twins.ts`). Plan 024 moves it; do not pre-empt it.
- `AGENTS.md` (its `agent-docs:auto` blocks are machine-written), `plans/README.md`, and anything under
  `~/repos/kevinliu-studio-improve`.

## Git workflow

- Work in the existing worktree `~/repos/kevinliu-studio-p2a` on branch `improve/p2-checks` (already cut from
  `4025230`). Do not create a branch or a worktree. Never edit another checkout. Never `git stash`.
- One commit for this plan, by explicit path, as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message: `fix(about): each fact names the question it answers, so striking one moves no other answer`, a blank line,
  one or two sentences of body, a blank line, then the trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Do NOT push, open a PR or deploy.

## Steps

The two code blocks of steps 2 and 3 also exist as files, byte for byte, in
`~/k7-rescue/improve-audit/lane-a/p011/` (`new-block.ts`, `facts.test.mjs`). Copy from those files rather than
retyping.

### Step 1: Fingerprint today's output

Run `pnpm build`, then:

```
(cd dist && find . -type f \( -name '*.html' -o -name '*.md' -o -name '*.txt' \) | LC_ALL=C sort | xargs shasum -a 256) > ~/k7-rescue/improve-audit/lane-a/p011/before.sha; wc -l < ~/k7-rescue/improve-audit/lane-a/p011/before.sha
```

**Verify**: `pnpm build` ends `all checks pass`; the count is above 500. Keep the file for step 5.

### Step 2: File each fact under its question, and define the questions once

In `src/lib/site.ts`, replace the block from `export const FACTS: readonly string[] = [` through its closing `];`
with the content of `~/k7-rescue/improve-audit/lane-a/p011/new-block.ts`, printed below. The nine texts and their
source comments are the same, in the same order; each is wrapped in `{ text: … }`, and six of them gain a `q`. Keep
the four comment lines above the block as they are.

```ts
// `q` files a fact under one of /about's questions (QA below): 'before' answers "What did he do before General
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
  if (!xs.length) throw new Error(`site.ts: no fact is filed under q: '${q}'. File one under it, or delete that question from QA in src/lib/site.ts`);
  return xs;
}
// Questions /about asks and answers below Kevin's own words: only those the words above do not already answer. Each
// answer is the facts filed under it, never a position in the list (prose, no FAQ markup). The page, its twin
// (twins.ts) and the English source of the translations (src/i18n/source.mjs) all read this one list.
export const QA: [string, string][] = [
  ['What did he do before General Translation?', factsFor('before').join(' ').replace(/^Before General Translation he/, 'He')],
  ['What else has he done?', factsFor('else').join(' ')],
];
```

Then in `src/lib/twins.ts`:

1. In the import from `./site`, add `QA` after `FACTS`:

```ts
import { SITE, NAME, BIO, ABOUT, FACTS, QA, ALSO_KNOWN_AS, DESCRIPTION, SOCIAL, EMAIL, PREVIOUS, type Run } from './site';
```

2. Replace the two comment lines and the four-line `export const QA … ];` definition (quoted in "Current state")
   with this one comment line, leaving the `export const qaOf` line directly below it unchanged:

```ts
// /about's questions in a language: English from site.ts QA (each answer is the facts filed under it), the rest translated
```

Then in `src/i18n/source.mjs`:

1. In the parameter list, add `QA` after `FACTS`:

```js
export function source({ fighters, rules, whatOf, answerOf, moveLine, BIO, DESCRIPTION, ABOUT, FACTS, QA }) {
```

2. Replace the four lines from `    qa: [` through its closing `    ],` with:

```js
    qa: QA.map(([q, a]) => ({ q, a })),
```

**Verify**: `/usr/bin/grep -c 'FACTS\[\|FACTS\.slice' src/lib/twins.ts src/i18n/source.mjs` → both files `:0`.
**Verify**: `node -e "import('./src/lib/site.ts').then((s) => console.log(s.FACTS.length, s.factsFor('before').length, s.factsFor('else').length, s.QA.length))"` → `9 2 4 2`.
**Verify**: `node scripts/i18n-extract.mjs --check` → `i18n: content.json matches the cards and site.ts`.

### Step 3: Add the strike test

Create `scripts/facts.test.mjs` as a copy of `~/k7-rescue/improve-audit/lane-a/p011/facts.test.mjs`:

```js
// Kevin may strike any fact in src/lib/site.ts by deleting its line (docs/seo.md). These tests strike lines from a
// copy of the file and read what /about's questions would then say: no other answer moves, and a question left with
// no fact stops the build. Needs Node 24, which strips the types.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FILE = path.resolve(import.meta.dirname, '../src/lib/site.ts');
const lines = fs.readFileSync(FILE, 'utf8').split('\n');
// the line of each fact, in order
const rows = lines.flatMap((l, i) => (/^\s*\{ text: '/.test(l) ? [i] : []));
let n = 0;
// site.ts without the given fact lines, imported from a copy
async function load(strike = []) {
  const gone = new Set(strike.map((k) => rows[k]));
  const f = path.join(os.tmpdir(), `site-facts-${process.pid}-${n++}.ts`);
  fs.writeFileSync(f, lines.filter((_, i) => !gone.has(i)).join('\n'));
  try { return await import(pathToFileURL(f).href); } finally { fs.rmSync(f, { force: true }); }
}
const whole = await load();
// what a question should answer once some facts are struck: the facts still filed under it, in order
const answer = (q, strike) => whole.FACT_LIST.filter((f, k) => f.q === q && !strike.includes(k)).map((f) => f.text).join(' ').replace(/^Before General Translation he/, 'He');

test('every fact is one line the test can strike, and both questions have facts', () => {
  assert.equal(rows.length, whole.FACT_LIST.length);
  assert.ok(rows.length > 0);
  assert.deepEqual(whole.QA.map(([q]) => q), ['What did he do before General Translation?', 'What else has he done?']);
  assert.deepEqual(whole.QA.map(([, a]) => a), [answer('before', []), answer('else', [])]);
  assert.ok(whole.factsFor('before').length > 0 && whole.factsFor('else').length > 0);
});
test('striking any one fact shortens only its own answer', async () => {
  for (let k = 0; k < rows.length; k++) {
    const q = whole.FACT_LIST[k].q;
    // the last fact under a question cannot be struck without stopping the build; the next test covers that
    if (q && whole.factsFor(q).length === 1) continue;
    const m = await load([k]);
    assert.equal(m.FACTS.length, whole.FACTS.length - 1, `fact ${k + 1}: the list loses one line`);
    assert.equal(m.FACTS.includes(whole.FACTS[k]), false, `fact ${k + 1}: it is gone from the list`);
    assert.deepEqual(m.QA.map(([, a]) => a), [answer('before', [k]), answer('else', [k])], `fact ${k + 1}: answers`);
  }
});
test('a question left with no fact stops the build and says what to do', async () => {
  for (const q of ['before', 'else']) {
    const all = whole.FACT_LIST.flatMap((f, k) => (f.q === q ? [k] : []));
    await assert.rejects(load(all), new RegExp(`no fact is filed under q: '${q}'`));
  }
});
```

**Verify**: `pnpm test` → the three new tests pass, `fail 0`, and the total is 13 (10 before this plan).

### Step 4: Prove the test catches the old behaviour

In a scratch copy only (never in the worktree's own `src/`):

```
S=~/k7-rescue/improve-audit/lane-a/p011/mutant && rm -rf "$S" && mkdir -p "$S/src/lib" "$S/scripts" && cp src/lib/site.ts "$S/src/lib/" && cp scripts/facts.test.mjs "$S/scripts/"
```

In `$S/src/lib/site.ts` change the two `QA` answers back to positions:
`` `${FACTS[3].replace(/^Before General Translation he/, 'He')} ${FACTS[4]}` `` and `FACTS.slice(5).join(' ')`.
Then `(cd "$S" && node --test scripts/facts.test.mjs)`.

**Verify**: the run fails (exit 1), with the "striking any one fact" test among the failures. Report its first
failing message.

### Step 5: Build and compare with the fingerprint

Run `pnpm build`, then:

```
(cd dist && find . -type f \( -name '*.html' -o -name '*.md' -o -name '*.txt' \) | LC_ALL=C sort | xargs shasum -a 256) | diff - ~/k7-rescue/improve-audit/lane-a/p011/before.sha && echo identical
```

**Verify**: `pnpm build` ends `all checks pass`.
**Verify**: the `diff` prints nothing and the command prints `identical`. This change must not alter one byte of
any page, twin or text file, in any language.

### Step 6: Keep the docs true, record and commit

In `docs/seo.md`, replace the sentence `Strike a line by deleting it.` with:

```
Strike a line by deleting it: a line's `q` files it under one of the questions on `/about`, so its answer gets
shorter and no other answer moves; a question left with no line stops the build and says so
(`scripts/facts.test.mjs`, in `pnpm test`, checks both).
```

In `src/lib/SKILL.md`: on line 17 replace `` `QA`, and `TWINS` `` with `` `qaOf`, and `TWINS` ``; on line 18 replace
`` `FACTS` (public, sourced), `` with
`` `FACT_LIST` (public, sourced; `q` files a fact under a question on /about), `FACTS`, `factsFor`, `QA`, ``.

Append an entry to the end of `memory.md` in the file's existing shape (a `## 2026-11-10: <title> (improve/p2-checks,
plan 011)` heading, then `- **Type**:`, `- **Changed**:`, `- **Checked**:`, `- **Open**:` bullets). Under Checked
write that every built page, twin and text file is byte-identical to before, that `content.json` is unchanged, and
the `pnpm test` totals. Never rewrite an older entry.

Commit `src/lib/site.ts src/lib/twins.ts src/i18n/source.mjs scripts/facts.test.mjs docs/seo.md src/lib/SKILL.md memory.md`
by explicit path with the message in "Git workflow".

**Verify**: `git status --short` → empty. `git show --stat --format=%an%n%ae HEAD` lists exactly those seven files
and the noreply address.

## Test plan

- New tests: `scripts/facts.test.mjs`, run by `pnpm test`. Cases: the whole list (the two questions and their
  answers are the facts filed under each); each of the nine lines struck in turn (the list is one shorter, the
  struck fact's own answer loses exactly that sentence, the other answer is unchanged); every line of one question
  struck (importing `site.ts` throws `no fact is filed under q: '…'`, which is what stops the build).
- Step 4 proves the middle case fails on the positional code this plan removes.
- Verification: `pnpm test` passes; every built page, twin and text file is byte-identical to before;
  `node scripts/i18n-extract.mjs --check` passes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` ends with `all checks pass`
- [ ] the step 5 `diff` prints nothing
- [ ] `node scripts/i18n-extract.mjs --check` prints `i18n: content.json matches the cards and site.ts`
- [ ] `pnpm test` → 13 tests, 0 fail
- [ ] `/usr/bin/grep -c 'FACTS\[\|FACTS\.slice' src/lib/twins.ts src/i18n/source.mjs` → `0` for both
- [ ] `git diff --name-only 4025230..HEAD` lists only the seven files in "In scope"

## STOP conditions

Stop and report back (do not improvise) if:

- `src/lib/site.ts`'s `FACTS` no longer holds exactly the nine lines in step 2's block (Kevin struck or added one
  since). Do not guess which question a new line answers: report the list you found.
- `src/lib/twins.ts` or `src/i18n/source.mjs` no longer reads `FACTS[3]`, `FACTS[4]` and `FACTS.slice(5)`.
- `node scripts/i18n-extract.mjs --check` says the file is stale, before or after your edit.
- After step 5 any file differs from the fingerprint. Show which files differ and the `diff` of `dist/about.md`
  against `git show 4025230:` built output if you have it; do not adjust the text to match.
- `node -e "import('./src/lib/site.ts')"` fails on a syntax Node cannot strip (then the test cannot run).

## Maintenance notes

- A new fact gets `q: 'before'` or `q: 'else'` only if it belongs in that answer; without `q` it appears in the llms
  files' list alone. A new question needs a new `q` value in the `Fact` type and a row in `QA` (`site.ts`); the
  twin, the page and the translation source pick it up from there. A new or changed English answer needs
  `pnpm i18n:translate` before the other languages print it (until then they print that answer in English).
- The first answer drops the words "Before General Translation he" from its first fact so it does not repeat the
  question. If that fact is struck, the answer starts with whatever `before` fact remains, unchanged.
- Striking a fact changes `src/i18n/en/content.json`'s source; the translated pages then print the changed strings
  in English until the next translation run. That is the i18n design (`src/i18n/index.ts` `merge`), not this plan's.
- Plan 024 moves the facts list inside `llms.txt`; it reads `FACTS`, which this plan keeps as an export.
- A reviewer should compare the nine texts in the diff character by character (they must be untouched) and confirm
  the `q` filing matches the old positions: old 4 and 5 are `before`, old 6 to 9 are `else`.
