# Plan 031: A franchise name split inside the word is caught

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4025230..HEAD -- scripts/rules.mjs scripts/rules.test.mjs`
> If either file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 001 (done)
- **Category**: security
- **Planned at**: commit `4025230` (feat/i18n, which holds the ten P1 plans), 2026-11-10

## Why this matters

Plan 001 gave the sync and the release guard one set of content rules (`scripts/rules.mjs`). The rules read a
normalized text in which every run of spaces, hyphens and underscores is one space. Two of the three banned names
allow that space in the middle (`poke mon`, `game freak`). The third does not: the name written `Nin-tendo`,
`Nin_tendo` or `Nin tendo` (also with a non-breaking space or a line break) passes both gates, in a file's text and
in its path. The review of plan 001 found this on 2026-11-09 by planting `/ex/nin_tendo/a.txt` in a copy of `dist`:
the guard passed it. The old rules missed it too, so nothing regressed; this plan closes the last spelling.

## Current state

```js
// scripts/rules.mjs:21
export const NAMES = [[/poke(mon|ball|dex)|\bpoke (mon|ball|dex)|nintendo|game ?freak/i, 'franchise name']];
```

`scripts/rules.test.mjs` holds the rules' tests (`node:test`, no dependency). Its helper and name pieces:

```js
// scripts/rules.test.mjs:6-7
const hits = (path, text) => scanBuffer(path, Buffer.from(text));
const P = 'Pok', M = 'mon', N = 'Nin' + 'tendo', GF = ['Game', 'Freak'], G = 'General', T = 'Translation';
```

The existing tests on lines 9 to 18 contain invisible characters (a soft hyphen, a decomposed accent). Do not edit or
retype those lines. This plan only adds a new test at the end of the file.

Fact the advisor checked on 2026-11-10: the new pattern `\bnin tendo`, run on the normalized text and path of all
6,686 files under `dist`, `public`, `vendor` and `src` of `improve/p1-on-next` a1ff84c, gives zero hits. So no
shipped file fails the new rule. If one does when you run the gates, that is a STOP condition.

Conventions: ES modules, two-space indent, single quotes, semicolons. The test file assembles banned names from
pieces so it never contains them whole; keep that.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Tests | `pnpm test` | `ℹ fail 0`, and `ℹ pass` one higher than before your change |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 |
| Build and release guard | `pnpm build` | last line ends `all checks pass` |

## Scope

**In scope** (the only files you should modify):
- `scripts/rules.mjs` (one pattern)
- `scripts/rules.test.mjs` (one new test, appended)
- `memory.md` (append one entry)

**Out of scope**:
- Every other pattern, the allow-list, `normalize`, and the existing tests.
- Any synced folder and `sync.lock.json`.

## Git workflow

- Work on the lane branch and worktree your dispatcher names. Never edit the main checkout. Never `git stash`.
- Commit by explicit path as `66856750+Kevin-Liu-01@users.noreply.github.com`:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "fix(scan): a franchise name split inside the word is caught" -- scripts/rules.mjs scripts/rules.test.mjs memory.md`
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Record the baseline

**Verify**: `pnpm test` → `ℹ fail 0`. Note the `ℹ pass` number.

### Step 2: Add the test first

Append exactly this to the end of `scripts/rules.test.mjs`:

```js
test('a franchise name split inside the word is caught', () => {
  const A = 'Nin', B = 'tendo';
  for (const s of [`${A}-${B}`, `${A}_${B}`, `${A} ${B}`, `${A}&nbsp;${B}`, `${A}\n${B}`]) assert.deepEqual(hits('public/ex/x.js', `a ${s} b`), ['franchise name'], s);
  for (const s of ['tannin tendons', 'melanin tends', 'a mannequin tendon']) assert.deepEqual(hits('public/ex/x.js', s), [], s);
  assert.deepEqual(hits(`public/ex/${A}_${B}/a.txt`.toLowerCase(), 'fine'), ['franchise name in the path']);
});
```

**Verify**: `pnpm test` → exactly one failure, in this new test. (It proves the gap before the fix.)

### Step 3: Close the gap

In `scripts/rules.mjs`, in the `NAMES` line, replace `|nintendo|game ?freak` with `|nintendo|\bnin tendo|game ?freak`.
The word boundary keeps "tannin tendons" from matching. Change nothing else on the line.

**Verify**: `pnpm test` → `ℹ fail 0`, `ℹ pass` one higher than step 1.
**Verify**: the sync check prints `in sync`.
**Verify**: `pnpm build` → last line ends `all checks pass`.

### Step 4: Memory and commit

Append an entry to `memory.md` in the format of the entries above it (type `fix`, files, why, what was checked).
Commit as in "Git workflow".

**Verify**: `git status --short` → no output.

## Test plan

One new test, appended to `scripts/rules.test.mjs`: five split spellings caught in text, three ordinary phrases not
caught, one split spelling caught in a path. Model: the test `a banned name in a file name is caught` in the same file.

## Done criteria

- [ ] `pnpm test` exits 0 with `ℹ fail 0` and one more passing test than before
- [ ] The sync check prints `in sync`
- [ ] `pnpm build` ends `all checks pass`
- [ ] `git diff --name-only HEAD~1..HEAD` lists only `scripts/rules.mjs`, `scripts/rules.test.mjs`, `memory.md`

## STOP conditions

- The `NAMES` line does not match the excerpt.
- After step 3 the sync check prints `problem(s)` or the build fails on `franchise name`: report the file exactly as
  printed. Do not loosen the pattern or add an exception.
- The new test fails after step 3, or step 2 shows more than one failure.

## Maintenance notes

- `NAMES` patterns are written without accents and with a single optional space, because they read normalized text.
  A new name of two parts needs the same shape: the joined form, and the spaced form behind a word boundary.
