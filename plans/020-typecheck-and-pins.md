# Plan 020: `pnpm check` type-checks the site again, and the toolchain versions are pinned

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc .nvmrc src/components/Header.astro`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Two expected differences are not
> mismatches: plan 001 adds a `"test"` script to `package.json`, and plan 003
> puts `node scripts/lock-check.mjs && ` at the front of the `build` script.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Nothing type-checks this repo. `pnpm check` runs `astro check`, which needs TypeScript's compiler API, but the repo
installs TypeScript 7, whose package has no such API (it exports only its version), and there has never been a
`tsconfig.json`. `memory.md` already records "`pnpm check` fails on main". So the one static check the repo has is
dead, and a typo in a page's props or a wrong attribute type is found only by eye.

The toolchain is also loosely pinned: `"node": ">=24"` lets the host move to a new Node major without a commit, the
`engine-strict` setting sits in a file pnpm 11 does not read, two dev dependencies use `^` ranges, and
`@astrojs/mdx` is installed but used nowhere.

The advisor tried every change in this plan in a scratch copy on 2026-11-09: with TypeScript 5.9.3 and the
`tsconfig.json` below, `astro check` reports exactly 1 error (fixed in step 6) and 3 hints; after the fix it reports
0 errors; and `pnpm build` passes with every HTML, Markdown and text output byte-identical to today's.

## Current state

```json
// package.json:5-8
  "packageManager": "pnpm@11.15.1",
  "engines": {
    "node": ">=24"
  },
```

```json
// package.json:15-29
    "check": "astro check && node scripts/verify-build.mjs"
  },
  "dependencies": {
    "@astrojs/mdx": "8.1.3",
    "@astrojs/sitemap": "3.7.4",
    "@vercel/analytics": "2.0.1",
    "@vercel/speed-insights": "2.1.0",
    "astro": "7.4.7"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.12",
    "satori": "0.63.2",
    "sharp": "0.35.5",
    "typescript": "^7.0.2"
  }
```

The checker's own requirement, from the lockfile:

```yaml
# pnpm-lock.yaml:46-50
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

`pnpm config get engine-strict` prints `undefined` today: pnpm 11 reads its settings from `pnpm-workspace.yaml`, not
from `.npmrc`. With `engineStrict: true` in `pnpm-workspace.yaml` it prints `true` (checked in the scratch copy).

`@astrojs/mdx` is not used: `astro.config.mjs` lists one integration, `sitemap(...)`, and there is no `.mdx` file
under `src/`. There is no `tsconfig.json` (`git log --all -- tsconfig.json` is empty). Astro ships a preset at
`node_modules/astro/tsconfigs/base.json`.

The one type error `astro check` finds once it can run (the attribute wants `'true' | 'false'`, the code gives a
`string`):

```astro
// src/components/Header.astro:26 (one long line; its middle is shown)
{[['Human', 'text/html'], ['Machine', 'text/markdown']].map(([v, t], i) => <button type="button" data-mode-set={v.toLowerCase()} aria-pressed={String(!i)} set:html={...} />)}
```

`String(!i)` gives `"true"` for the first button and `"false"` for the second. The fix in step 6 prints the same two
values.

Conventions: package versions are written exactly (no `^`) for runtime dependencies; this plan makes dev
dependencies match. JSON files use two-space indent.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install after editing `package.json` | `pnpm install` | exit 0; ends `Done in ...` |
| Install, lockfile unchanged | `pnpm install --frozen-lockfile` | exit 0 |
| Type check (after step 5) | `pnpm check` | ends with `- 0 errors` (after step 6), exit 0 |
| Build and release guard | `pnpm build` | last line starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass` |

## Scope

**In scope** (the only files you should modify):
- `package.json`
- `pnpm-lock.yaml` (only through `pnpm install`, never by hand)
- `pnpm-workspace.yaml`
- `.npmrc` (delete)
- `tsconfig.json` (create)
- `src/components/Header.astro` (one expression on line 26)
- `docs/deploy.md` (one bullet under "## Build")
- `AGENTS.md` (one line in the hand-written "## Commands" list only)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- The three hints `astro check` prints (`src/lib/cards.ts:87`, `src/pages/index.astro:3`, `src/pages/index.astro:54`).
  Hints do not fail the check. Leave the code as it is.
- Any other type error. If `astro check` reports more than the one error named here, that is a STOP condition, not
  an invitation to fix them.
- Making the config stricter (`astro/tsconfigs/strict`). A later change, once the base preset is green.
- `astro`, `@astrojs/sitemap`, `satori`, `sharp` and the Vercel packages: no version changes.
- The other four lines of `minimumReleaseAgeExclude`.
- The block between `<!-- agent-docs:auto:... -->` markers in `AGENTS.md` (machine-maintained).
- Anything under `public/`, `vendor/`, `scripts/`.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/020-typecheck-and-pins`, cut from
  `origin/main`:
  `git -C ~/repos/kevinliu-studio fetch origin && git -C ~/repos/kevinliu-studio worktree add -b improve/020-typecheck-and-pins ~/repos/kevinliu-studio-020 origin/main`.
  Never edit the main checkout at `~/repos/kevinliu-studio`. Never use `git stash`.
- Commit by explicit path, as the GitHub noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`,
  `docs: record the 11-09 release's promotion and rollback target`. For this plan:
  `chore(deps): TypeScript the checker supports, a tsconfig, exact pins, no unused mdx`.
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Set up and confirm the baseline

Create the worktree, `cd` into it, install, build.

**Verify**: `pnpm install --frozen-lockfile` → exit 0.
**Verify**: `pnpm build` → last line ends `all checks pass`.
**Verify**: `node -e 'console.log(Object.keys(require("typescript")).length)'` → `2` (TypeScript 7, no API).

Keep a copy of today's pages to compare against in step 7:
`rm -rf "$TMPDIR/dist-020-before" && rsync -a --include='*/' --include='*.html' --include='*.md' --include='*.txt' --exclude='*' dist/ "$TMPDIR/dist-020-before/"`

**Verify**: `find "$TMPDIR/dist-020-before" -name '*.html' | wc -l` → `32`.

### Step 2: Edit `package.json`

Make exactly these changes:

1. `"node": ">=24"` → `"node": "24.x"`
2. `"check": "astro check && node scripts/verify-build.mjs"` → `"check": "astro check"`
3. Delete the line `"@astrojs/mdx": "8.1.3",`
4. `"@astrojs/check": "^0.9.12"` → `"@astrojs/check": "0.9.12"`
5. `"typescript": "^7.0.2"` → `"typescript": "5.9.3"`

**Verify**: `node -e 'const p=require("./package.json");console.log(p.engines.node,p.scripts.check,p.dependencies["@astrojs/mdx"],p.devDependencies["@astrojs/check"],p.devDependencies.typescript)'`
→ `24.x astro check undefined 0.9.12 5.9.3`

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

**Verify**: `pnpm check; echo "exit $?"` → the output names `src/components/Header.astro:26:81` with
`Type 'string' is not assignable to type 'boolean | "false" | "mixed" | "true"'`, the summary reads `- 1 error`,
and the exit code is `1`. That is the expected state before step 6.

### Step 6: Fix the one error

In `src/components/Header.astro` line 26, replace `aria-pressed={String(!i)}` with:

```astro
aria-pressed={i === 0 ? 'true' : 'false'}
```

(It occurs once in the file. The first button, Human, is the pressed one, exactly as before.)

**Verify**: `/usr/bin/grep -c "aria-pressed={String(!i)}" src/components/Header.astro` → `0`
**Verify**: `pnpm check; echo "exit $?"` → the summary reads `- 0 errors`, then `exit 0`. (Hints are allowed; the
scratch run printed `Result (35 files): - 0 errors - 0 warnings - 3 hints`.)

### Step 7: Build and compare the pages with today's

**Verify**: `pnpm build` → last line starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass`.
**Verify**: `D="$PWD/dist"; (cd "$TMPDIR/dist-020-before" && find . -type f | while read f; do cmp -s "$f" "$D/$f" || echo "differs: $f"; done)`
→ no output (every page, twin and text file is byte-identical to the build from step 1). Then
`rm -rf "$TMPDIR/dist-020-before"`.

### Step 8: Docs, memory, commit

1. `docs/deploy.md`, under `## Build`, add a bullet: "`pnpm check` runs `astro check` (TypeScript 5.9, `tsconfig.json`
   on Astro's base preset, `src/` only). It is not part of `pnpm build`; CI runs it."
2. `AGENTS.md`, in the hand-written `## Commands` list (the one that starts ``- `pnpm sync` and `pnpm sync --check` ``),
   add: ``- `pnpm check` (`astro check`: types in `src/`)``
3. Append to `memory.md` an entry dated today: type `chore`, the files changed, why (the check could not run; loose
   pins; an unused dependency), the result line of `pnpm check`, and the open threads: "three hints left as they
   are"; "AGENTS.md's agent-docs auto block still prints the old check script until the scaffold is rerun".
4. Commit:

```sh
git add tsconfig.json
git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit \
  -m "chore(deps): TypeScript the checker supports, a tsconfig, exact pins, no unused mdx" \
  -- package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.json src/components/Header.astro docs/deploy.md AGENTS.md memory.md
```

**Verify**: `git status --short` → no output.

## Test plan

- No new test file: this plan repairs a check rather than adding logic. The checks are `pnpm check` (0 errors) and
  the byte comparison of all 32 pages and their twins in step 7.
- If plan 001 has landed (`"test"` exists in `package.json`), also run `pnpm test` → `ℹ fail 0`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm install --frozen-lockfile` exits 0
- [ ] `pnpm check` exits 0 and prints `- 0 errors`
- [ ] `pnpm build` exits 0, last line ends `all checks pass`
- [ ] `node -e 'console.log(require("typescript").version)'` prints `5.9.3`
- [ ] `/usr/bin/grep -c '\^' package.json` prints `0`
- [ ] `/usr/bin/grep -c "astrojs/mdx" package.json pnpm-lock.yaml pnpm-workspace.yaml` prints `0` for all three
- [ ] `pnpm config get engine-strict` prints `true`
- [ ] `diff <(git show origin/main:pnpm-lock.yaml | /usr/bin/grep -E "^  '?(astro|sharp|satori|@vercel/[a-z-]+|@astrojs/sitemap)@[0-9]" | sort -u) <(/usr/bin/grep -E "^  '?(astro|sharp|satori|@vercel/[a-z-]+|@astrojs/sitemap)@[0-9]" pnpm-lock.yaml | sort -u)` prints nothing (the packages the site ships with kept their versions)
- [ ] `test -f tsconfig.json && test ! -e .npmrc` exits 0
- [ ] Step 7's comparison printed nothing
- [ ] `git diff --name-only origin/main..HEAD` lists only the in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- `pnpm install` in step 4 fails, or refuses `typescript@5.9.3` (for example for its release age or because the
  registry cannot be reached). Do not pick another version on your own; report the message.
- `pnpm check` in step 5 reports any error other than the one at `src/components/Header.astro:26`, or more than one.
  Report the full list. (New pages or components may have landed since this plan was written.)
- `pnpm check` does not print a `Result (...)` summary at all.
- `pnpm build` fails after `@astrojs/mdx` is removed, or step 7 shows any page that differs. Restore nothing by
  guesswork: report the first failing line or the differing files.
- `pnpm config get engine-strict` does not print `true` after step 3.
- A step's verification fails twice after a reasonable fix attempt, or the fix appears to need an out-of-scope file.

## Maintenance notes

- `typescript` stays on the major line `@astrojs/check` supports (`^5.0.0 || ^6.0.0` today; 6.0.3 also exists). Move
  it only together with a checker release that supports the new major, and rerun `pnpm check`.
- `"node": "24.x"` is what the host reads: Vercel now stays on Node 24 until this line changes. `.nvmrc` says the
  same for local shells and CI.
- With `engineStrict: true`, `pnpm install` on another Node major fails at once with an engine message. That is
  intended.
- The lockfile diff is large (about 50 lines added, 270 removed in the scratch run): TypeScript 7's per-platform
  packages and mdx's dependency tree leave. The done criteria include a command that proves no version of `astro`,
  `sharp`, `satori`, `@astrojs/sitemap` or the Vercel packages changed; a reviewer should rerun it.
- Plan 007 also edits `src/components/Header.astro` (the brand link on line 14). The two edits are on different
  lines.
- Plan 021 (CI) adds `pnpm check` as a step only when it exits 0, which this plan makes true.
- `AGENTS.md` has a machine-written block (between `agent-docs:auto:commands` markers) that still shows the old
  `check` script. Do not hand-edit it; the agent-docs scaffold refreshes it (and re-creates `src/pages/SKILL.md`,
  which must then be deleted, as AGENTS.md says).
- Deferred: the three hints, and a move to Astro's `strict` preset. Each is a small follow-up once this is in.
