# Plan 020: `pnpm check` type-checks the site again, and the toolchain versions are pinned

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT edit `plans/README.md`: the audit session
> keeps the index.
>
> **Drift check (run first)**: `git diff --stat 4025230..HEAD -- package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .nvmrc tsconfig.json src/components/Header.astro`
> must print nothing (plans 011, 012 and 024, the commits before this one on the lane branch, touch none of these
> files). If it prints a file, compare the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `4025230` (`feat/i18n`), 2026-11-10. Refreshed from the `c6245d9` version by lane A: the
  finding is still present; the one type error moved to line 31, the i18n work added `gt` (already pinned exactly)
  and 26 more checked files, and the hints went from 3 to 5.

## Why this matters

Nothing type-checks this repo. `pnpm check` runs `astro check`, which needs TypeScript's compiler API, but the repo
installs TypeScript 7, whose package has no such API (it exports only its version), and there has never been a
`tsconfig.json`. `memory.md` already records "`pnpm check` fails on main". So the one static check the repo has is
dead, and a typo in a page's props or a wrong attribute type is found only by eye.

The toolchain is also loosely pinned: `"node": ">=24"` lets the host move to a new Node major without a commit, the
`engine-strict` setting sits in a file pnpm 11 does not read, two dev dependencies use `^` ranges, and
`@astrojs/mdx` is installed but used nowhere.

Lane A tried every change in this plan in a scratch copy of `4025230` on 2026-11-10
(`~/k7-rescue/improve-audit/lane-a/p020/`): `pnpm install` took TypeScript 5.9.3 without complaint, and with the
`tsconfig.json` below `astro check` reports `Result (61 files): - 1 error - 0 warnings - 5 hints`, the one error
being the line fixed in step 6. No version of a package the site ships with changed in the lockfile.

## Current state

All paths are in the lane worktree `~/repos/kevinliu-studio-p2a` (branch `improve/p2-checks`).

```json
// package.json:5-8
  "packageManager": "pnpm@11.15.1",
  "engines": {
    "node": ">=24"
  },
```

```json
// package.json:9-33 (the parts this plan touches)
    "build": "node scripts/lock-check.mjs && astro build && node scripts/verify-build.mjs",
    "check": "astro check && node scripts/verify-build.mjs",
  ...
  "dependencies": {
    "@astrojs/mdx": "8.1.3",
    "@astrojs/sitemap": "3.7.4",
    "@vercel/analytics": "2.0.1",
    "@vercel/speed-insights": "2.1.0",
    "astro": "7.4.7"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.12",
    "gt": "2.27.3",
    "satori": "0.63.2",
    "sharp": "0.35.5",
    "typescript": "^7.0.2"
  }
```

The checker's own requirement, from the lockfile:

```yaml
# pnpm-lock.yaml:49-53
  '@astrojs/check@0.9.12':
    resolution: {integrity: sha512-hazpqxIfZWj2VhyPyR0pOEQ/IhFDM/2nIApL96zMXABdD8NrUKYDmhxTy7h+drTDl9MQG/Sd1ET/4amadVJUUA==}
    hasBin: true
    peerDependencies:
      typescript: ^5.0.0 || ^6.0.0
```

What the installed TypeScript 7 exports: `node -e 'console.log(Object.keys(require("typescript")))'` prints
`[ 'version', 'versionMajorMinor' ]`.

The other pin files, whole:

```
# .nvmrc
24
```

```
# .npmrc
engine-strict=true
```

```yaml
# pnpm-workspace.yaml
minimumReleaseAgeExclude:
  - '@astrojs/internal-helpers@0.13.1'
  - '@astrojs/markdown-satteri@0.4.7'
  - '@astrojs/mdx@8.1.3'
  - '@vercel/speed-insights@2.1.0'
  - astro@7.4.7
```

pnpm 11 reads its settings from `pnpm-workspace.yaml`, not from `.npmrc`. With `engineStrict: true` in
`pnpm-workspace.yaml`, `pnpm config get engine-strict` prints `true` (checked in the scratch copy; this Mac runs
Node v24.22.1, which `24.x` accepts).

`@astrojs/mdx` is not used: `astro.config.mjs` lists one integration, `sitemap(...)`, and there is no `.mdx` file
under `src/`. There is no `tsconfig.json`. Astro ships a preset at `node_modules/astro/tsconfigs/base.json`.

The one type error `astro check` finds once it can run (the attribute wants `'true' | 'false'`, the code gives a
`string`):

```astro
// src/components/Header.astro:31 (one long line; its start is shown)
    {[['human', 'text/html'], ['machine', 'text/markdown']].map(([v, t], i) => <button type="button" data-mode-set={v} aria-pressed={String(!i)} set:html={...} />)}
```

`String(!i)` gives `"true"` for the first button and `"false"` for the second. The fix in step 6 prints the same two
values. (Lines 33 and 34 of the same file carry `aria-pressed="false"` as plain text; they are not the error.)

The five hints the scratch run printed, which stay as they are: `src/lib/cards.ts:87:12` (ts 7043),
`src/views/About.astro:23:58` and `:3:20` (ts 6133), `src/views/Home.astro:3:55` (ts 6133) and `:65:1451` (ts 2568).

`AGENTS.md` has a hand-written `## Commands` list (lines 56-63) and, below it, blocks between
`<!-- agent-docs:auto:… -->` markers that a tool writes. `docs/deploy.md` has a `## Build` section whose first bullet
begins ``- `pnpm build` writes `dist/` ``.

Conventions: package versions are written exactly (no `^`) for runtime dependencies; this plan makes dev
dependencies match. JSON files use two-space indent.

## Commands you will need

Run all of them in `~/repos/kevinliu-studio-p2a`.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install after editing `package.json` | `pnpm install` | exit 0; ends `Done in ...` |
| Install, lockfile unchanged | `pnpm install --frozen-lockfile` | exit 0 |
| Type check (after step 5) | `pnpm check` | ends with `- 0 errors` (after step 6), exit 0 |
| Tests | `pnpm test` | `fail 0` |
| Build and release guard | `pnpm build` | last line starts `verify-build: 256 pages, 248 sitemap URLs,` and ends `all checks pass` |
| Fingerprint every page, twin and text file | `(cd dist && find . -type f \( -name '*.html' -o -name '*.md' -o -name '*.txt' \) \| LC_ALL=C sort \| xargs shasum -a 256)` | one line per file (in the table `\|` stands for a plain `|`) |

zsh on macOS: no `timeout`; use `/usr/bin/grep`; never name a shell variable `path`. Do not start a server or a
browser.

## Scope

**In scope** (the only files you should modify):
- `package.json`
- `pnpm-lock.yaml` (only through `pnpm install`, never by hand)
- `pnpm-workspace.yaml`
- `.npmrc` (delete)
- `tsconfig.json` (create)
- `src/components/Header.astro` (one expression on line 31)
- `docs/deploy.md` (one bullet under "## Build")
- `AGENTS.md` (one line in the hand-written "## Commands" list only)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- The five hints. Hints do not fail the check. Leave the code as it is.
- Any other type error. If `astro check` reports more than the one error named here, that is a STOP condition, not
  an invitation to fix them.
- Making the config stricter (`astro/tsconfigs/strict`). A later change, once the base preset is green.
- `astro`, `@astrojs/sitemap`, `gt`, `satori`, `sharp` and the Vercel packages: no version changes.
- The other four lines of `minimumReleaseAgeExclude`.
- The blocks between `<!-- agent-docs:auto:... -->` markers in `AGENTS.md` (machine-written; the `commands` block
  there is already out of date and stays so).
- Anything under `public/`, `vendor/`, `scripts/`, `src/i18n/`.

## Git workflow

- Work in the existing worktree `~/repos/kevinliu-studio-p2a` on branch `improve/p2-checks`. Do not create a branch
  or a worktree (ignore the older worktree `~/repos/kevinliu-studio-020`; it is not yours). Never `git stash`.
- One commit for this plan, by explicit path, as the noreply address.
- Message: `chore(deps): TypeScript the checker supports, a tsconfig, exact pins, no unused mdx`, a blank line, one
  or two sentences of body, a blank line, then `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Confirm the baseline

**Verify**: `git status --short` → empty.
**Verify**: `node -e 'console.log(Object.keys(require("typescript")).length)'` → `2` (TypeScript 7, no API).
**Verify**: `wc -l < ~/k7-rescue/improve-audit/lane-a/p020/before.sha` → above 500. Your reviewer built the lane
branch as it stood before this plan and saved that fingerprint; you do not need a build before step 7. If the file
is missing, run `pnpm build` and the fingerprint command from the table into that file yourself, before any edit.

### Step 2: Edit `package.json`

Make exactly these changes:

1. `"node": ">=24"` → `"node": "24.x"`
2. `"check": "astro check && node scripts/verify-build.mjs"` → `"check": "astro check"`
3. Delete the line `"@astrojs/mdx": "8.1.3",`
4. `"@astrojs/check": "^0.9.12"` → `"@astrojs/check": "0.9.12"`
5. `"typescript": "^7.0.2"` → `"typescript": "5.9.3"`

**Verify**: `node -e 'const p=require("./package.json");console.log(p.engines.node,p.scripts.check,p.dependencies["@astrojs/mdx"],p.devDependencies["@astrojs/check"],p.devDependencies.typescript,p.devDependencies.gt)'`
→ `24.x astro check undefined 0.9.12 5.9.3 2.27.3`

### Step 3: Edit `pnpm-workspace.yaml`, delete `.npmrc`

1. In `pnpm-workspace.yaml`, delete the line `  - '@astrojs/mdx@8.1.3'` and add a last line `engineStrict: true`.
   The file becomes:

```yaml
minimumReleaseAgeExclude:
  - '@astrojs/internal-helpers@0.13.1'
  - '@astrojs/markdown-satteri@0.4.7'
  - '@vercel/speed-insights@2.1.0'
  - astro@7.4.7
engineStrict: true
```

2. `git rm .npmrc` (its one setting now lives in `pnpm-workspace.yaml`, where pnpm 11 reads it).

**Verify**: `pnpm config get engine-strict` → `true`

### Step 4: Install

Run `pnpm install` (not frozen: the lockfile must change).

**Verify**: exit 0, and the output lists `typescript 5.9.3` under devDependencies.
**Verify**: `node -e 'const t=require("typescript");console.log(t.version, Object.keys(t).length > 100)'` → `5.9.3 true`
**Verify**: `/usr/bin/grep -c "astrojs/mdx" pnpm-lock.yaml` → `0`
**Verify**: `pnpm install --frozen-lockfile` → exit 0.

### Step 5: Create `tsconfig.json`

Create `tsconfig.json` in the repo root with exactly this content:

```json
{
  "extends": "astro/tsconfigs/base",
  "include": [".astro/types.d.ts", "src/**/*"],
  "exclude": ["dist", "public", "vendor", "node_modules"]
}
```

(`public/` and `vendor/` hold the synced round code, thousands of files that are not this repo's to type-check.)

**Verify**: `pnpm check; echo "exit $?"` → the output names `src/components/Header.astro:31:81` with
`is not assignable to type 'ButtonHTMLAttributes'`, the summary reads `- 1 error`, and the exit code is `1`. That is
the expected state before step 6.

### Step 6: Fix the one error

In `src/components/Header.astro` line 31, replace `aria-pressed={String(!i)}` with:

```astro
aria-pressed={i === 0 ? 'true' : 'false'}
```

(It occurs once in the file. The first button, Human, is the pressed one, exactly as before.)

**Verify**: `/usr/bin/grep -c "aria-pressed={String(!i)}" src/components/Header.astro` → `0`
**Verify**: `pnpm check; echo "exit $?"` → the summary reads `- 0 errors`, then `exit 0`. (Hints are allowed; expect
`Result (61 files): - 0 errors - 0 warnings - 5 hints`, or a file count one or two higher if an earlier plan on this
branch added a file under `src/`.)

### Step 7: Test, build and compare the pages with the fingerprint

**Verify**: `pnpm test` → `fail 0`.
**Verify**: `pnpm build` → last line starts `verify-build: 256 pages, 248 sitemap URLs,` and ends `all checks pass`.
**Verify**:

```
(cd dist && find . -type f \( -name '*.html' -o -name '*.md' -o -name '*.txt' \) | LC_ALL=C sort | xargs shasum -a 256) | diff - ~/k7-rescue/improve-audit/lane-a/p020/before.sha && echo identical
```

→ prints `identical` and nothing else (every page, twin and text file is byte-identical to the build before this
plan).

### Step 8: Docs, memory, commit

1. `docs/deploy.md`, under `## Build`, add a bullet directly after the first one (the `pnpm build` bullet, which
   ends `and on banned names or routes.`): ``- `pnpm check` runs `astro check` (TypeScript 5.9, `tsconfig.json` on
   Astro's base preset, `src/` only). It is not part of `pnpm build`.``
2. `AGENTS.md`, in the hand-written `## Commands` list, add a line directly after the ``- `pnpm test` `` line:
   ``- `pnpm check` (`astro check`: types in `src/`)``
3. Append to `memory.md` an entry (`## 2026-11-10: <title> (improve/p2-checks, plan 020)`, then `- **Type**:`,
   `- **Changed**:`, `- **Checked**:`, `- **Open**:`): type `chore`, the files changed, why (the check could not
   run; loose pins; an unused dependency), the result line of `pnpm check`, and the open threads: "five hints left
   as they are"; "AGENTS.md's agent-docs auto block still prints old scripts until the scaffold is rerun"; "Vercel
   now stays on Node 24 until `engines.node` changes".
4. Commit:

```sh
git add tsconfig.json
git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit \
  -m "chore(deps): TypeScript the checker supports, a tsconfig, exact pins, no unused mdx" \
  -m "<one or two sentences>" -m "Co-Authored-By: Claude <noreply@anthropic.com>" \
  -- package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json src/components/Header.astro docs/deploy.md AGENTS.md memory.md
```

**Verify**: `git status --short` → no output. `git show --stat --format=%ae HEAD` lists exactly those nine paths.

## Test plan

- No new test file: this plan repairs a check rather than adding logic. The checks are `pnpm check` (0 errors),
  `pnpm test`, and the byte comparison of every page, twin and text file in step 7.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm install --frozen-lockfile` exits 0
- [ ] `pnpm check` exits 0 and prints `- 0 errors`
- [ ] `pnpm test` exits 0 with `fail 0`
- [ ] `pnpm build` exits 0, last line ends `all checks pass`
- [ ] `node -e 'console.log(require("typescript").version)'` prints `5.9.3`
- [ ] `/usr/bin/grep -c '\^' package.json` prints `0`
- [ ] `/usr/bin/grep -c "astrojs/mdx" package.json pnpm-lock.yaml pnpm-workspace.yaml` prints `0` for all three
- [ ] `pnpm config get engine-strict` prints `true`
- [ ] `diff <(git show HEAD~1:pnpm-lock.yaml | /usr/bin/grep -E "^  '?(astro|sharp|satori|gt|@vercel/[a-z-]+|@astrojs/sitemap)@[0-9]" | sort -u) <(/usr/bin/grep -E "^  '?(astro|sharp|satori|gt|@vercel/[a-z-]+|@astrojs/sitemap)@[0-9]" pnpm-lock.yaml | sort -u)` prints nothing (the packages the site ships with kept their versions)
- [ ] `test -f tsconfig.json && test ! -e .npmrc` exits 0
- [ ] Step 7's comparison printed `identical`
- [ ] `git diff --name-only HEAD~1..HEAD` lists only the nine in-scope files

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- `pnpm install` in step 4 fails, or refuses `typescript@5.9.3` (for example for its release age or because the
  registry cannot be reached). Do not pick another version on your own; report the message.
- `pnpm check` in step 5 reports any error other than the one at `src/components/Header.astro:31`, or more than one.
  Report the full list.
- `pnpm check` does not print a `Result (...)` summary at all.
- `pnpm build` fails after `@astrojs/mdx` is removed, or step 7 shows any file that differs. Restore nothing by
  guesswork: report the first failing line or the differing files.
- `pnpm config get engine-strict` does not print `true` after step 3.
- A step's verification fails twice after a reasonable fix attempt, or the fix appears to need an out-of-scope file.

## Maintenance notes

- `typescript` stays on the major line `@astrojs/check` supports (`^5.0.0 || ^6.0.0` today). Move it only together
  with a checker release that supports the new major, and rerun `pnpm check`.
- `"node": "24.x"` is what the host reads: Vercel stays on Node 24 until this line changes. `.nvmrc` says the same
  for local shells and CI.
- With `engineStrict: true`, `pnpm install` on another Node major fails at once with an engine message. That is
  intended.
- The lockfile diff is large (about 50 lines added, 270 removed in the scratch run): TypeScript 7's per-platform
  packages and mdx's dependency tree leave. The done criteria include a command that proves no version of `astro`,
  `sharp`, `satori`, `gt`, `@astrojs/sitemap` or the Vercel packages changed; a reviewer should rerun it.
- Plan 021 (CI) adds `pnpm check` as a step only when it exits 0, which this plan makes true.
- `AGENTS.md` has a machine-written block (between `agent-docs:auto:commands` markers) that shows old scripts. Do
  not hand-edit it; the agent-docs scaffold refreshes it (and re-creates `src/pages/SKILL.md`, which must then be
  deleted, as AGENTS.md says).
- Deferred: the five hints, and a move to Astro's `strict` preset. Each is a small follow-up once this is in.
