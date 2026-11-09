# Plan 021: A GitHub Action runs the tests, the lock check and the build on every pull request and push to main

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- package.json .nvmrc .github`
> This plan depends on plans 001 and 003, which change `package.json` on
> purpose. Compare the "Current state" section's *expected* `package.json`
> scripts (the ones after 001 and 003) against the live file; on a mismatch,
> treat it as a STOP condition. A `.github/` folder that already exists is
> also a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-scan-rules-module-and-tests.md, plans/003-lock-integrity-check.md
- **Category**: dx
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

The repo has no CI. There is no `.github/` folder, no git hook, and until plan 001 no test command. The only
automatic check is the release guard, which runs inside `pnpm build` on Vercel when a commit is already on its way to
a deployment. A branch gets no signal until someone builds it by hand, and the tests plans 001 and 003 add would run
only when a person remembers to run them. Several sessions work on this repo at once and hand branches to a release
session, so a check that runs on every pull request is where a broken sync rule or a hand-edited synced file should
be caught.

After this plan one workflow runs on every pull request and every push to `main`: install, the tests, the lock check
and the full build with the release guard. It needs no secret and no access to the design rounds.

## Current state

- There is no `.github/` directory at commit `c6245d9` (`ls .github` fails).
- The repository is `Kevin-Liu-01/kevinliu-studio` on GitHub, private, default branch `main`. Vercel deploys `main`
  to production on its own; this workflow does not deploy anything.
- Node and pnpm are pinned by files the workflow reads:

```
# .nvmrc
24
```

```json
// package.json:5
  "packageManager": "pnpm@11.15.1",
```

- The scripts this workflow calls. At `c6245d9` there is no `test` script and `build` has no lock check; plans 001
  and 003 add them. **This plan expects `package.json` to contain these two lines when you start** (if plan 020 has
  also landed, `check` reads `"astro check"`; that is fine):

```json
    "build": "node scripts/lock-check.mjs && astro build && node scripts/verify-build.mjs",
    "test": "node --test \"scripts/**/*.test.mjs\""
```

- What each step does, so you can judge a failure:
  - `pnpm test` runs `scripts/*.test.mjs` with Node's built-in test runner (the content rules, the location-metadata
    finder, the lock-path check). Expected today: `ℹ pass 10`, `ℹ fail 0`.
  - `node scripts/lock-check.mjs` checks that the synced folders (`public/ex`, `public/og`, `public/sound`,
    `public/battle`, `vendor/`) hold exactly the files and bytes `sync.lock.json` records. Expected:
    `lock-check: 3024 synced files match sync.lock.json, nothing extra`.
  - `pnpm build` builds the static site into `dist/` and runs the release guard. Expected last line:
    `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass` (the file count may differ).
- `pnpm check` (type checking) is broken at `c6245d9` and repaired by plan 020. Step 3 below adds it to the workflow
  only if it passes where you are.
- The build needs nothing outside the repo: the synced folders are committed, the share images are drawn from
  `src/share/*.ttf`, and `astro.config.mjs` already copes with a shallow clone (a page whose last change it cannot
  date gets no `lastmod`).

Conventions for the workflow file: two-space YAML indent, a comment at the top that says what it is for in plain
words, action versions pinned by major tag.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Tests | `pnpm test` | `ℹ fail 0` |
| Lock check | `node scripts/lock-check.mjs` | `lock-check: ... nothing extra`, exit 0 |
| Build and release guard | `pnpm build` | last line ends `all checks pass` |
| The file parses as YAML | `ruby -ryaml -e 'y=YAML.load_file(".github/workflows/check.yml"); puts y.keys.inspect; puts y["jobs"]["check"]["steps"].map{\|s\| s["run"]}.compact.inspect'` | see step 2 |

(`ruby` ships with macOS. In the table the `|` inside the Ruby block is written `\|` only so the table renders; type
a plain `|`.)

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/check.yml` (create)
- `docs/deploy.md` (one bullet under "## Build")
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- `package.json`, the scripts under `scripts/`, `vercel.json`: the workflow calls what exists; it changes nothing.
- Any deploy step, any secret, any Vercel setting. Vercel's own Git integration keeps deploying.
- `pnpm sync --check`: it needs the design rounds folder on Kevin's Mac and can never run in CI. The lock check is
  what stands in for it.
- The deployed checks (`scripts/smoke.mjs`, `scripts/check-seo.mjs`): they need a deployment URL and a protection
  token. A later plan, if wanted.
- Branch protection rules on GitHub: Kevin's to set.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/021-ci-workflow`, cut from the branch or
  commit where plans 001 and 003 landed (ask the operator; `origin/main` if they have been merged there):
  `git -C ~/repos/kevinliu-studio worktree add -b improve/021-ci-workflow ~/repos/kevinliu-studio-021 <start-point>`.
  Never edit the main checkout at `~/repos/kevinliu-studio`. Never use `git stash`.
- Commit by explicit path, as the GitHub noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`. For this plan:
  `ci: tests, the lock check and the build on every pull request and push to main`.
- Do NOT push, open a PR or deploy. Creating the workflow file locally is allowed. Pushing it is Kevin's decision:
  the first push of this branch starts the workflow on GitHub.

## Steps

### Step 1: Set up and run, by hand, exactly what the workflow will run

Create the worktree, `cd` into it, then run the four commands in order.

**Verify**: `ls .github 2>&1` → `ls: .github: No such file or directory`.
**Verify**: `pnpm install --frozen-lockfile` → exit 0.
**Verify**: `pnpm test` → `ℹ fail 0`, exit 0.
**Verify**: `node scripts/lock-check.mjs` → ends `nothing extra`, exit 0.
**Verify**: `pnpm build` → last line ends `all checks pass`.

### Step 2: Create the workflow

Create `.github/workflows/check.yml` with exactly this content:

```yaml
# Runs on every pull request and every push to main: the content rules' tests, the lock check and a full build with
# the release guard. It needs no secret and no rounds folder. Vercel builds and deploys on its own; this only reports.
name: check

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: check-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      # pnpm at the version package.json names in "packageManager"
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Tests
        run: pnpm test
      - name: Synced folders match the lock
        run: node scripts/lock-check.mjs
      - name: Build and release guard
        run: pnpm build
```

Why these choices:

- `pnpm/action-setup@v4` with no `version` input installs the pnpm that `package.json`'s `packageManager` field
  names, so CI and the host cannot disagree.
- `node-version-file: .nvmrc` does the same for Node.
- `permissions: contents: read` is all the job needs. `concurrency` cancels a run that a newer push made stale.
- The lock check is its own step, although `pnpm build` runs it again, so a hand-edited synced file fails under a
  name that says what happened.

**Verify**: the Ruby command from "Commands you will need" prints exactly:

```
["name", true, "permissions", "concurrency", "jobs"]
["pnpm install --frozen-lockfile", "pnpm test", "node scripts/lock-check.mjs", "pnpm build"]
```

(The `true` is the `on:` key: Ruby's YAML reads the word `on` as a boolean. GitHub reads it as `on`. It is correct.)

### Step 3: Add the type check only if it passes here

Run `pnpm check; echo "exit $?"`.

- If the last line is `exit 0` (plan 020 has landed), add these two lines to the workflow directly after the
  `run: pnpm test` line, at the same indent as the other steps:

```yaml
      - name: Types
        run: pnpm check
```

- If it is anything else, add nothing and note in `memory.md` (step 4) that the type check joins the workflow when
  plan 020 lands.

**Verify** (only if you added it): the Ruby command's second line now reads
`["pnpm install --frozen-lockfile", "pnpm test", "pnpm check", "node scripts/lock-check.mjs", "pnpm build"]`.

### Step 4: Docs, memory, commit

1. `docs/deploy.md`, under `## Build`, add a bullet: "`.github/workflows/check.yml` runs on every pull request and
   every push to `main`: `pnpm install --frozen-lockfile`, `pnpm test`, `node scripts/lock-check.mjs` and
   `pnpm build` (with the release guard). It needs no secret and deploys nothing; Vercel deploys as before."
2. Append to `memory.md` an entry dated today: type `feature`, the files changed, why (no check ran before a build
   on the host), what was checked (the four commands by hand, the YAML parse), and the open threads: "not pushed: the
   workflow first runs on GitHub when Kevin pushes this branch"; "GitHub Actions minutes on a private repository
   count against the account's monthly allowance"; and, if step 3 added nothing, "add `pnpm check` after plan 020".
3. Commit:

```sh
git add .github/workflows/check.yml
git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit \
  -m "ci: tests, the lock check and the build on every pull request and push to main" \
  -- .github/workflows/check.yml docs/deploy.md memory.md
```

**Verify**: `git status --short` → no output. `git log -1 --name-only --format=` lists exactly the three files.

## Test plan

- A workflow cannot be run locally. What can be checked locally is checked: every command it runs passes in step 1,
  and the file parses with the expected keys and steps in step 2.
- The first real run happens on GitHub after Kevin pushes. Tell him what to look at: the run named `check` on the
  branch should finish green in a few minutes; `gh run list --workflow check.yml --limit 1` shows it.
- No new test file.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `test -f .github/workflows/check.yml` exits 0
- [ ] The Ruby command prints `["name", true, "permissions", "concurrency", "jobs"]` and a run list that starts with `"pnpm install --frozen-lockfile", "pnpm test"` and ends with `"node scripts/lock-check.mjs", "pnpm build"`
- [ ] `/usr/bin/grep -c "secrets\.\|vercel\|deploy" .github/workflows/check.yml` prints `1` (the one comment line that says Vercel deploys on its own)
- [ ] `pnpm test`, `node scripts/lock-check.mjs` and `pnpm build` each exit 0 locally
- [ ] `git diff --name-only <start-point>..HEAD` lists only `.github/workflows/check.yml`, `docs/deploy.md`, `memory.md`
- [ ] Nothing was pushed: `git status -sb` shows no upstream for this branch, or `git log @{u}..HEAD` is not empty
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `.github/` already exists where you branched from (someone added CI since this plan was written).
- `package.json` has no `"test"` script, or its `build` script does not start with `node scripts/lock-check.mjs`
  (plans 001 or 003 have not landed where you branched from).
- Any of the four commands in step 1 fails. The workflow would fail the same way; report the failure instead of
  writing the file.
- You are asked, or tempted, to add a secret, a token, a deploy step or a call to the design rounds folder.
- A step's verification fails twice after a reasonable fix attempt, or the fix appears to need an out-of-scope file.

## Maintenance notes

- The workflow first runs on GitHub when this branch is pushed. Pushing is Kevin's call. If the first run fails on
  something that passes locally, the likely causes are, in order: pnpm's install on Linux (the lockfile carries the
  Linux builds of `sharp`; `--frozen-lockfile` must still pass), then the build's `git` calls in a shallow clone
  (`astro.config.mjs` handles a shallow clone; a failure there is a bug to report, not to work around with
  `fetch-depth: 0` without saying so).
- The repository is private, so Actions minutes come out of the account's monthly allowance. One run is an install
  and a build of about two minutes. `concurrency` keeps a burst of pushes from stacking runs.
- Action versions are pinned by major tag (`@v4`). Pinning by commit hash is safer against a compromised tag; do it
  if the repo ever takes outside contributions.
- When a new check script is added to `package.json` (plan 020's `pnpm check`, a future lint), add one step here in
  the same commit.
- Vercel still builds every push on its own. The two are independent: a red check does not stop a Vercel deploy
  unless Kevin turns on branch protection or Vercel's "require checks" setting.
- `pnpm sync --check` stays a local command by design; nothing here replaces looking at a sync's summary.
