# Plan 003: Every build checks that the synced folders hold exactly what the lock records

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs package.json sync.lock.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Plans 001 and 002 edit other parts
> of `scripts/sync.mjs` and plan 001 adds a `"test"` script to `package.json`:
> those changes move line numbers but leave the excerpts below matching by
> text. That is not a mismatch.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-scan-rules-module-and-tests.md (it adds `pnpm test`, which this plan's test file needs)
- **Category**: tests
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

The cards, battle and sound in `public/ex`, `public/og`, `public/sound`, `public/battle` and `vendor/` are copied in
by `scripts/sync.mjs` and must never be edited by hand: every content check ran on the bytes the sync wrote, and
`sync.lock.json` records each file's hash. Nothing enforces that rule. The only comparison, `pnpm sync --check`,
needs the design rounds folder on Kevin's Mac, so it can never run on the host or in CI. A hand edit, a stray file
(Astro publishes everything under `public/`), or a `.tmp` file left by a sync that was killed between its write and
its rename would all build and deploy.

After this plan `pnpm build` starts with a check that needs no rounds folder: every file the lock lists is present
with the recorded bytes, and nothing else is in those folders. The sync also refuses to delete a path the lock names
outside its own folders, and writes the lock the way it already writes files, through a temp file and a rename.

## Current state

- `sync.lock.json` — written by the sync. Its shape: `{ rounds, head, pins, synced, stages: { cards, sound, battle } }`,
  and each stage is `{ files, bytes, list }` where `list` maps a destination path (for example
  `public/ex/gallery.js`) to `{ src, sha256, bytes }`. Today it lists 3,024 files, every key starts with one of
  `public/ex/`, `public/og/`, `public/sound/`, `public/battle/`, `vendor/ex/`, `vendor/battle/`, and none contains
  `..`.
- `scripts/sync.mjs` — the sync. It runs its whole job when imported. Three places matter here:

```js
// scripts/sync.mjs:19-22
import sharp from 'sharp';
import { MEDIA, hasLocation } from './location.mjs';
import { PHONE } from './phone-memory.mjs';
import { CLOSED } from '../src/lib/closed-repos.mjs';
```

(If plan 001 has landed, the second of those lines reads `import { scanBuffer } from './rules.mjs';`. Either is fine.)

```js
// scripts/sync.mjs:388-389 — removal paths come straight from the previous lock's keys
  // a file this stage shipped last time and no longer ships leaves the repo; nothing the sync never wrote is touched
  for (const dest of Object.keys(prev.stages[stage]?.list ?? {})) if (!files[dest] && fs.existsSync(path.join(REPO, dest))) removes.push(path.join(REPO, dest));
```

```js
// scripts/sync.mjs:407-411 — files go through a temp file and a rename; the lock is written in place
for (const [abs, buf] of writes) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(`${abs}.tmp`, buf); fs.renameSync(`${abs}.tmp`, abs); }
for (const abs of removes) fs.rmSync(abs);
// the lock changes only when the shipped files or the rounds' commit do, so a no-op rerun leaves no diff
const same = JSON.stringify(prev.stages) === JSON.stringify(lock.stages) && prev.head === lock.head && JSON.stringify(prev.pins) === JSON.stringify(lock.pins);
if (!same) { lock.synced = new Date().toISOString(); fs.writeFileSync(LOCK, JSON.stringify(lock, null, 1) + '\n'); }
```

- `package.json` — the build script today:

```json
// package.json:13
    "build": "astro build && node scripts/verify-build.mjs",
```

  Vercel runs `pnpm build` (`vercel.json`: `"buildCommand": "pnpm build"`), so whatever this script runs also runs on
  the host.

- `scripts/phone-memory.mjs` — the pattern for a script that exports something and also runs on its own: its work
  sits inside `if (isMain) { ... }`, where
  `const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);`. Follow it.

The advisor ran the script below read-only against this commit on 2026-11-09: it printed
`lock-check: 3024 synced files match sync.lock.json, nothing extra` in about 4 seconds. So it must pass today.

Conventions: ES modules, two-space indent, single quotes, semicolons, comments that say why in plain words.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Lock check (after step 2) | `node scripts/lock-check.mjs` | `lock-check: 3024 synced files match sync.lock.json, nothing extra` |
| Tests | `pnpm test` | `ℹ pass 10`, `ℹ fail 0` (8 from plan 001, 2 new) |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Build and release guard | `pnpm build` | first line of the check is `lock-check: ...nothing extra`; last line ends `all checks pass` |

`~/k7-rescue/release-next/rounds-42ff51c7` is the export of the design rounds the 11-09 release synced from. The sync
check reads it and writes nothing. Never run a plain `pnpm sync` (without `ROUNDS=`).

## Scope

**In scope** (the only files you should modify):
- `scripts/lock-check.mjs` (create)
- `scripts/lock-check.test.mjs` (create)
- `scripts/sync.mjs` (one import, the removal loop, the lock write)
- `package.json` (the `build` script)
- `docs/sync.md` (one paragraph under "## The lock")
- `scripts/SKILL.md` (one line)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- Anything under `public/ex`, `public/og`, `public/sound`, `public/battle`, `vendor/`, and `sync.lock.json` itself.
  If the check fails on one of them, that is a finding to report, not a file to fix.
- `scripts/phone-memory.mjs` (plan 002 changes how it writes the lock).
- `scripts/verify-build.mjs`.
- The block between `<!-- agent-docs:auto:... -->` markers in `AGENTS.md`. It lists the old `build` script; it is
  machine-maintained and is refreshed separately (see "Maintenance notes").

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/003-lock-integrity-check`, cut from the
  branch or commit where plan 001 landed (ask the operator; `origin/main` if 001 has been merged there):
  `git -C ~/repos/kevinliu-studio worktree add -b improve/003-lock-integrity-check ~/repos/kevinliu-studio-003 <start-point>`.
  Never edit the main checkout at `~/repos/kevinliu-studio`. Never use `git stash`.
- Commit by explicit path, as the GitHub noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`. For this plan:
  `feat(guard): every build checks the synced folders against the lock`.
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Set up and confirm the baseline

Create the worktree, `cd` into it, install.

**Verify**: `pnpm install --frozen-lockfile` → exit 0.
**Verify**: `pnpm test` → `ℹ pass 8`, `ℹ fail 0` (plan 001 is in place).
**Verify**: `git status --short -- public vendor sync.lock.json` → no output, and
`git ls-files --others -- public vendor | /usr/bin/grep -v '\.DS_Store$'` → no output (no stray files to begin with).

### Step 2: Create `scripts/lock-check.mjs`

Create the file with exactly this content:

```js
#!/usr/bin/env node
// The synced folders hold exactly what sync.lock.json records: every listed file is there with the recorded bytes, and
// nothing else is. It needs no rounds folder, so it runs before every build (package.json "build") and in CI.
//   node scripts/lock-check.mjs [repo-root]
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// every folder the sync owns (scripts/sync.mjs STAGES, each rule's `to`)
export const SYNCED = ['public/ex', 'public/og', 'public/sound', 'public/battle', 'vendor/ex', 'vendor/battle'];
// a lock key is a plain relative path inside one of those folders
export const safeKey = (k) => typeof k === 'string' && !k.includes('\\') && !path.isAbsolute(k)
  && !k.split('/').some((s) => s === '..' || s === '.' || s === '') && SYNCED.some((d) => k.startsWith(d + '/'));

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const REPO = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const sha = (buf) => createHash('sha256').update(buf).digest('hex');
  const walk = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)])) : []);
  const problems = [];
  const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'sync.lock.json'), 'utf8'));
  const listed = new Set();
  for (const [stage, s] of Object.entries(lock.stages ?? {})) {
    for (const [dest, rec] of Object.entries(s.list ?? {})) {
      if (!safeKey(dest)) { problems.push(`${dest}: the lock lists a path outside the synced folders (${stage})`); continue; }
      listed.add(dest);
      const abs = path.join(REPO, dest);
      if (!fs.existsSync(abs)) { problems.push(`${dest}: listed in the lock, missing on disk`); continue; }
      const buf = fs.readFileSync(abs);
      if (buf.length !== rec.bytes || sha(buf) !== rec.sha256) problems.push(`${dest}: differs from the lock (edited by hand, or a sync that stopped halfway)`);
    }
  }
  for (const dir of SYNCED) for (const f of walk(path.join(REPO, dir))) {
    if (path.basename(f) === '.DS_Store') continue; // Finder's own file: git-ignored, never deployed
    const rel = path.relative(REPO, f).split(path.sep).join('/');
    if (!listed.has(rel)) problems.push(`${rel}: in a synced folder but not in the lock (a stray file, or a .tmp a stopped sync left)`);
  }
  if (problems.length) {
    console.error(`lock-check: ${problems.length} problem(s). The synced folders change only through pnpm sync (docs/sync.md):`);
    for (const p of problems.slice(0, 60)) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`lock-check: ${listed.size} synced files match sync.lock.json, nothing extra`);
}
```

**Verify**: `node scripts/lock-check.mjs; echo "exit $?"` →
`lock-check: 3024 synced files match sync.lock.json, nothing extra` then `exit 0`.

### Step 3: Prove it fails on a stray file

```sh
touch public/ex/zz-stray.tmp
node scripts/lock-check.mjs; echo "exit $?"
rm public/ex/zz-stray.tmp
node scripts/lock-check.mjs; echo "exit $?"
```

**Verify**: the first run prints `public/ex/zz-stray.tmp: in a synced folder but not in the lock` and `exit 1`; the
second prints `nothing extra` and `exit 0`. `git status --short -- public` → no output.

(Do not test the "differs from the lock" case by changing a real synced file. The stray file is one you created and
removed, which is allowed.)

### Step 4: Add the test file

Create `scripts/lock-check.test.mjs` with exactly this content:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { safeKey, SYNCED } from './lock-check.mjs';

test('a lock key is a plain path inside a synced folder', () => {
  for (const k of ['public/ex/a.js', 'vendor/battle/mat/index.html', 'public/og/home.jpg', 'public/sound/out/x.webm']) assert.equal(safeKey(k), true, k);
  for (const k of ['public/ex/../../x', '../x', '/etc/passwd', 'src/pages/index.astro', 'public/exx/a', 'public/ex//a', 'public/ex/./a', 'public\\ex\\a', 'public/ex', '', null, 3]) assert.equal(safeKey(k), false, String(k));
});
test('the synced folders are the six the sync writes', () => {
  assert.deepEqual(SYNCED, ['public/ex', 'public/og', 'public/sound', 'public/battle', 'vendor/ex', 'vendor/battle']);
});
```

**Verify**: `pnpm test` → `ℹ tests 10`, `ℹ pass 10`, `ℹ fail 0`.

### Step 5: Run it before every build

In `package.json`, change the `build` script to:

```json
    "build": "node scripts/lock-check.mjs && astro build && node scripts/verify-build.mjs",
```

**Verify**: `pnpm build` → the output contains `lock-check: 3024 synced files match sync.lock.json, nothing extra`
before Astro's output, and the last line ends `all checks pass`.

### Step 6: Make the sync refuse unsafe lock paths and write the lock by rename

Three edits in `scripts/sync.mjs`.

1. After the line `import { PHONE } from './phone-memory.mjs';` add:

```js
import { safeKey } from './lock-check.mjs';
```

2. Replace the one-line removal loop (the `for (const dest of Object.keys(prev.stages[stage]?.list ?? {})) if (...)`
   line shown under "Current state"; keep the comment line above it) with:

```js
  for (const dest of Object.keys(prev.stages[stage]?.list ?? {})) {
    // only a plain path inside a synced folder is ever removed, whatever the previous lock says
    if (!safeKey(dest)) { problems.push(`${dest}: sync.lock.json lists a path outside the synced folders; restore the lock (git checkout sync.lock.json)`); continue; }
    if (!files[dest] && fs.existsSync(path.join(REPO, dest))) removes.push(path.join(REPO, dest));
  }
```

3. In the last `if (!same) { ... }` line, replace
   `fs.writeFileSync(LOCK, JSON.stringify(lock, null, 1) + '\n');` with:

```js
fs.writeFileSync(`${LOCK}.tmp`, JSON.stringify(lock, null, 1) + '\n'); fs.renameSync(`${LOCK}.tmp`, LOCK);
```

**Verify**: `node --check scripts/sync.mjs` → exit 0.
**Verify**: `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` → prints `in sync`,
exit 0. (The advisor ran these edits together with plans 001 and 002's against the release export: `in sync`.)
**Verify**: `git status --short -- public vendor sync.lock.json` → no output.

### Step 7: Docs, memory, commit

1. `docs/sync.md`, at the end of the `## The lock` section, add a paragraph:
   "`node scripts/lock-check.mjs` needs no rounds folder: it fails when a synced file differs from the lock, is
   missing, or is not in the lock at all (a hand edit, a stray file, a `.tmp` a stopped sync left). `pnpm build` runs
   it first, so the host and CI enforce that the synced folders change only through `pnpm sync`."
2. `scripts/SKILL.md`: after the line that starts ``- `verify-build.mjs`: a new site-wide rule goes here``, add:
   ``- `lock-check.mjs`: runs first in `pnpm build`; the synced folders must hold exactly what `sync.lock.json` records. A new synced folder goes in its `SYNCED` list and in `sync.mjs` STAGES together.``
3. Append to `memory.md` an entry dated today: type `feature`, the files changed, why (nothing enforced "never by
   hand" without the rounds folder), what was checked, and the open thread "AGENTS.md's agent-docs auto block still
   prints the old build script until `agent-docs scaffold` is rerun".
4. Commit:

```sh
git add scripts/lock-check.mjs scripts/lock-check.test.mjs
git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit \
  -m "feat(guard): every build checks the synced folders against the lock" \
  -- scripts/lock-check.mjs scripts/lock-check.test.mjs scripts/sync.mjs package.json docs/sync.md scripts/SKILL.md memory.md
```

**Verify**: `git status --short` → no output.

## Test plan

- New file `scripts/lock-check.test.mjs` (step 4), two tests: `safeKey` accepts four real-shaped keys and rejects
  twelve bad ones (`..` segments, an absolute path, a path outside the synced folders, a look-alike folder, empty
  segments, backslashes, a bare folder, an empty string, non-strings); and the `SYNCED` list is the six folders.
- Pattern: `scripts/rules.test.mjs` from plan 001 (`node:test`, `node:assert/strict`, no dependency). The test
  imports only `lock-check.mjs`, whose work is inside `if (isMain)`, so importing it does nothing.
- The script itself is exercised by steps 2 and 3 (passes on the real tree, fails on a stray file).
- Verification: `pnpm test` → `ℹ pass 10`, `ℹ fail 0`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `node scripts/lock-check.mjs` exits 0 and prints `lock-check: 3024 synced files match sync.lock.json, nothing extra`
- [ ] `pnpm test` exits 0 with `ℹ pass 10`, `ℹ fail 0`
- [ ] `pnpm build` exits 0; its output contains `lock-check:` and its last line ends `all checks pass`
- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`, exit 0
- [ ] `/usr/bin/grep -c "safeKey" scripts/sync.mjs` prints `2`
- [ ] `/usr/bin/grep -c 'fs.writeFileSync(LOCK,' scripts/sync.mjs` prints `0`
- [ ] `ls public/ex/zz-stray.tmp sync.lock.json.tmp 2>/dev/null` prints nothing
- [ ] `git status --short -- public vendor sync.lock.json` prints nothing
- [ ] `git diff --name-only <start-point>..HEAD` lists only the in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (other than line numbers).
- `pnpm test` does not exist or does not pass in step 1 (plan 001 has not landed where you branched from).
- Step 1 shows modified or stray files under `public/` or `vendor/` before you changed anything.
- `node scripts/lock-check.mjs` reports any problem on the untouched tree in step 2. Report its lines exactly. Do not
  edit a synced file, the lock, or the script to make it pass: a real mismatch is exactly what this check is for.
- The number of files is not 3,024 but the check passes: that only means a sync landed since this plan was written.
  Carry on, and use the number you see in the later checks.
- `~/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check in step 6 does not print `in sync`.
- A step's verification fails twice after a reasonable fix attempt, or the fix appears to need an out-of-scope file.

## Maintenance notes

- Vercel runs `pnpm build`, so this check now also runs on the host. It fails a deploy whose synced files do not
  match the lock, which is the point; the fix is always `ROUNDS=<export> pnpm sync` and a commit of the files with
  the lock, never an edit to the lock.
- A release that adds a new synced folder must add it to `SYNCED` in `scripts/lock-check.mjs` and to `STAGES` in
  `scripts/sync.mjs` in the same commit, or the sync will report its own new files as unsafe lock paths.
- `.DS_Store` is the one file name the check ignores (Finder writes it; git ignores it; the host never sees it).
- `AGENTS.md` has a machine-written block (between `agent-docs:auto:commands` markers) that still shows the old
  `build` script. Do not hand-edit it. Rerunning the agent-docs scaffold refreshes it; that tool also re-creates
  `src/pages/SKILL.md`, which must then be deleted (AGENTS.md says why). Leave that to whoever next runs the scaffold.
- A reviewer should check that the build script still ends with `node scripts/verify-build.mjs` and that no synced
  file or the lock appears in the diff.
- Plan 021 (CI) runs this check as its own step so a failure is named clearly.
