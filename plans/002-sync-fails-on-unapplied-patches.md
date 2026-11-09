# Plan 002: The sync stops when a patch never met its file, and the phone patches are written all or nothing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs scripts/phone-memory.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Plans 001 and 003 edit other parts
> of `scripts/sync.mjs`: if one of them has landed, line numbers have moved
> but the excerpts below still match by text. That is not a mismatch.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (it shares `scripts/sync.mjs` with plans 001 and 003; land them one at a time)
- **Category**: bug
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

`scripts/sync.mjs` copies the finished cards, battle and sound from the design rounds into this repo and edits a few
of those files on the way in. Each edit is keyed by the file's destination path. If the rounds rename or move one of
those files, its edit is skipped without a word: the sync still passes. Two of the edits paint a paragraph that names
the employer's email domain out of two screenshots; no text scan can see inside a picture, so a renamed screenshot
would ship unpainted and every check would stay green. The same goes for the three phone-memory patches that keep a
phone's tab from crashing.

Two smaller holes sit beside it. The script that applies the phone patches on their own writes each file as it goes,
so a failure on the second file leaves the first one changed and the lock wrong for good. And the code that reads
which stylesheets and scripts the round's page loads quietly drops any tag it cannot read, which is how the wall lost
its card families once before (docs/sync.md, 11-07).

After this plan the sync fails loudly in all three cases.

## Current state

- `scripts/sync.mjs` — the sync. It reads, transforms and scans every file first, collects `problems`, and writes
  only when there are none. It runs its whole job when imported, so nothing may import it.
- `scripts/phone-memory.mjs` — exports `PHONE` (three patches the sync applies after `TRANSFORMS`) and, when run
  directly, applies them to the synced files in place and updates `sync.lock.json`.
- `sync.lock.json` — every synced file's source path, sha-256 and size.

Where the patches are applied (only when a rule happened to pick that exact destination):

```js
// scripts/sync.mjs:367-380
    for (const f of picked) {
      const src = path.join(r.from, f), dest = `${r.to}/${f}`;
      if (files[dest]) continue; // two rules may pick the same file
      let buf = fs.readFileSync(src);
      // the file as it was at the stage's pin. A file the pin does not have (the frame SVGs were generated and committed
      // only after 30e69931) cannot be checked against it, so it ships only as the last lock recorded it
      const at = pinned.get(rel(ROUNDS, src));
      if (at === undefined) unpinned++;
      else if (at !== blobSha(buf)) { problems.push(`${dest}: ${rel(ROUNDS, src)} differs from the ${stage} pin ${PIN[stage]}`); continue; }
      try {
        if (TRANSFORMS[dest]) buf = Buffer.from(TRANSFORMS[dest](buf.toString('utf8')));
        if (PHONE[dest]) buf = Buffer.from(PHONE[dest](buf.toString('utf8')));
        if (BINARY[dest]) buf = await BINARY[dest](buf);
      } catch (e) { problems.push(`${dest}: ${e.message}`); continue; }
```

Nothing checks afterwards that every key of `TRANSFORMS`, `PHONE` and `BINARY` was met. Today all 18 keys are met
(the advisor checked each against `sync.lock.json`). The state the loop starts from, and the line after the stages:

```js
// scripts/sync.mjs:353-356
const lock = { rounds: ROUNDS_GIT, head: null, pins: PIN, synced: null, stages: {} };
const problems = [];
const writes = [], removes = [];
let unpinned = 0;
```

```js
// scripts/sync.mjs:392-393
// the rounds' commits: one per stage, every tracked file checked against it above
lock.head = [...new Set(Object.values(PIN))].join(' + ');
```

The two picture edits (`BINARY`), whose files are picked by a pattern, not by name:

```js
// scripts/sync.mjs:318-321
const BINARY = {
  'public/battle/r3/media/elo/llms-txt.png': paintOut(760, 830),
  'public/battle/r3/media-moves/elo/mcp-server.webp': paintOut(760, 830),
};
```

The round page's head reader:

```js
// scripts/sync.mjs:110-113
function pageHead(html) {
  const head = html.slice(0, html.indexOf('</head>'));
  return [...head.matchAll(/<link rel="stylesheet" href="([^"]+)"[^>]*>|<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map((m) => m[1] ?? m[2]);
}
```

Without a `</head>`, `indexOf` gives -1 and the slice takes the whole document but its last character. A sheet
written `<link href="x.css" rel="stylesheet">` is not matched and is neither shipped nor loaded. On the round page
the release shipped, the head has 4 stylesheet links and 12 script tags, and the pattern matches all 16.

The standalone phone-memory run (it writes inside the loop, and the lock only after it):

```js
// scripts/phone-memory.mjs:73-90
  let missing = 0, changed = 0;
  for (const [dest, fn] of Object.entries(PHONE)) {
    const abs = path.join(REPO, dest);
    const text = fs.readFileSync(abs, 'utf8');
    if (text.includes(MARK)) { console.log(`${dest}: has the phone patches`); continue; }
    if (CHECK) { console.log(`${dest}: missing the phone patches`); missing++; continue; }
    const stage = Object.values(lock.stages).find((s) => s.list[dest]);
    const rec = stage && stage.list[dest];
    if (!rec || rec.sha256 !== sha(Buffer.from(text))) throw new Error(`${dest}: not the bytes sync.lock.json records; run pnpm sync instead`);
    const out = Buffer.from(fn(text));
    fs.writeFileSync(abs, out);
    stage.bytes += out.length - rec.bytes;
    Object.assign(rec, { sha256: sha(out), bytes: out.length });
    changed++;
    console.log(`${dest}: patched (${rec.bytes} bytes)`);
  }
  if (changed) fs.writeFileSync(LOCK, JSON.stringify(lock, null, 1) + '\n');
  process.exit(missing ? 1 : 0);
```

If the second file's anchor has moved, `fn(text)` throws after the first file is already on disk and before the lock
is written. On the next run the first file has the marker and is skipped, so its lock entry stays wrong.

Conventions: ES modules, two-space indent, single quotes, semicolons, comments that say why in plain words. The
sync's own contract, which this plan extends, is in its header and in `docs/sync.md` ("Read first, write last").

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Syntax | `node --check scripts/sync.mjs && node --check scripts/phone-memory.mjs` | exit 0, no output |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Phone patches present | `node scripts/phone-memory.mjs --check` | three lines ending `has the phone patches`, exit 0 |
| Build and release guard | `pnpm build` | last line ends `all checks pass` |

`~/k7-rescue/release-next/rounds-42ff51c7` is the export of the design rounds that the 11-09 release synced from. The
sync check reads it and writes nothing. Never run a plain `pnpm sync` (without `ROUNDS=`): it fails by design.

## Scope

**In scope** (the only files you should modify):
- `scripts/sync.mjs` (`pageHead`, the three additions around the stage loop)
- `scripts/phone-memory.mjs` (the standalone block at the bottom and two header comment lines)
- `docs/sync.md` (one sentence under "## Transforms")
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- The `TRANSFORMS`, `PHONE` and `BINARY` entries themselves and their anchors.
- Anything under `public/ex`, `public/og`, `public/sound`, `public/battle`, `vendor/`, and `sync.lock.json`: this plan
  changes no synced bytes, so none of them may change.
- `scripts/verify-build.mjs` (its phone-marker check stays).
- The scan section of `scripts/sync.mjs` (plan 001) and the lock write at its end (plan 003).

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/002-sync-fails-on-unapplied-patches`,
  cut from `origin/main`:
  `git -C ~/repos/kevinliu-studio fetch origin && git -C ~/repos/kevinliu-studio worktree add -b improve/002-sync-fails-on-unapplied-patches ~/repos/kevinliu-studio-002 origin/main`.
  Never edit the main checkout at `~/repos/kevinliu-studio`. Never use `git stash`.
- Commit by explicit path, as the GitHub noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`. For this plan:
  `fix(sync): stop when a patch never met its file; phone patches written all or nothing`.
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Set up and confirm the baseline

Create the worktree, `cd` into it, install.

**Verify**: `pnpm install --frozen-lockfile` → exit 0.
**Verify**: `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` → prints `in sync`.

### Step 2: Make `pageHead` fail loudly

Replace the whole `pageHead` function (shown under "Current state") with:

```js
function pageHead(html) {
  const end = html.indexOf('</head>');
  if (end < 0) throw new Error('the round page has no </head>');
  const head = html.slice(0, end);
  const found = [...head.matchAll(/<link rel="stylesheet" href="([^"]+)"[^>]*>|<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)].map((m) => m[1] ?? m[2]);
  // every sheet and script the head loads, however its tag is written: one the pattern above cannot read would neither
  // ship nor load, and the wall would print without it
  const tags = (head.match(/<link\b[^>]*\brel=["']?stylesheet/gi) ?? []).length + (head.match(/<script\b[^>]*\bsrc=/gi) ?? []).length;
  if (found.length !== tags) throw new Error(`the round page's head loads ${tags} sheets and scripts, but ${found.length} are written the way the sync reads them (<link rel="stylesheet" href="..."> and <script src="..."></script>)`);
  return found;
}
```

Both callers already turn a throw into a line in `problems` (`pageFiles` runs inside the rule's `try`, and the
`vendor/ex/index.html` transform runs inside the patch `try`), so nothing else changes.

**Verify**: `node --check scripts/sync.mjs` → exit 0.

### Step 3: Record which patched files a rule shipped, and fail on the rest

Three small edits in `scripts/sync.mjs`.

1. After the line `const writes = [], removes = [];` add:

```js
// every file a TRANSFORMS, PHONE or BINARY patch names must be one a rule ships (checked after the stages)
const PATCHED = new Set([...Object.keys(TRANSFORMS), ...Object.keys(PHONE), ...Object.keys(BINARY)]);
const shipped = new Set();
```

2. After the line `      if (files[dest]) continue; // two rules may pick the same file` add:

```js
      if (PATCHED.has(dest)) shipped.add(dest);
```

3. Immediately before the comment line
   `// the rounds' commits: one per stage, every tracked file checked against it above` add:

```js
// a patch whose file no rule shipped was never applied: the round renamed or dropped the file, and the fix it carried
// (or the paint-out of a capture, which no text scan can see) would be lost without a word
for (const key of PATCHED) if (!shipped.has(key)) problems.push(`${key}: a TRANSFORMS, PHONE or BINARY patch names this file, but no rule shipped it (renamed or dropped in the rounds?)`);
```

**Verify**: `node --check scripts/sync.mjs` → exit 0.
**Verify**: `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` → prints `in sync`,
exit 0. (The advisor ran exactly these edits against the release export: `in sync`.)

### Step 4: Prove the new check fires, then take the proof out

1. Temporarily add one line directly after `const TRANSFORMS = {`:

```js
  'public/ex/no-such-file.js': (t) => t,
```

2. Run `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check; echo "exit $?"`.

**Verify**: the output contains
`public/ex/no-such-file.js: a TRANSFORMS, PHONE or BINARY patch names this file, but no rule shipped it`
and `1 problem(s); nothing was written`, and ends `exit 1`.

3. Delete that temporary line again.

**Verify**: `/usr/bin/grep -c "no-such-file" scripts/sync.mjs` → `0`
**Verify**: `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` → `in sync`.

### Step 5: Make the standalone phone-memory run all or nothing

In `scripts/phone-memory.mjs`, replace everything from the line `  let missing = 0, changed = 0;` up to (not
including) the line `  process.exit(missing ? 1 : 0);` with:

```js
  // Read and patch everything first; write only when every file's patches applied. A patch that throws (its anchor
  // moved) leaves every file and the lock as they were.
  const todo = [];
  let missing = 0;
  for (const [dest, fn] of Object.entries(PHONE)) {
    const abs = path.join(REPO, dest);
    const text = fs.readFileSync(abs, 'utf8');
    if (text.includes(MARK)) { console.log(`${dest}: has the phone patches`); continue; }
    if (CHECK) { console.log(`${dest}: missing the phone patches`); missing++; continue; }
    const stage = Object.values(lock.stages).find((s) => s.list[dest]);
    const rec = stage && stage.list[dest];
    if (!rec || rec.sha256 !== sha(Buffer.from(text))) throw new Error(`${dest}: not the bytes sync.lock.json records; run pnpm sync instead`);
    todo.push({ dest, abs, stage, rec, out: Buffer.from(fn(text)) });
  }
  // each file, then the lock, by a temp file and a rename: a stop halfway never leaves a half-written file
  const put = (file, data) => { fs.writeFileSync(`${file}.tmp`, data); fs.renameSync(`${file}.tmp`, file); };
  for (const { dest, abs, stage, rec, out } of todo) {
    put(abs, out);
    stage.bytes += out.length - rec.bytes;
    Object.assign(rec, { sha256: sha(out), bytes: out.length });
    console.log(`${dest}: patched (${rec.bytes} bytes)`);
  }
  if (todo.length) put(LOCK, JSON.stringify(lock, null, 1) + '\n');
```

In the header comment of the same file, after the line that ends `(only to a file whose bytes are still the lock's)`,
add these two comment lines:

```js
//                                           A file that already carries the marker is skipped, so a NEW patch for it
//                                           needs the full sync (ROUNDS=<export> pnpm sync), not this command.
```

(The advisor ran this block on scratch copies of the three round files: all three were patched to the bytes the
site ships, and with the third file's anchor broken, the first two files and the lock stayed byte-identical.)

**Verify**: `node --check scripts/phone-memory.mjs` → exit 0.
**Verify**: `node scripts/phone-memory.mjs --check; echo "exit $?"` → three lines ending `has the phone patches`,
then `exit 0`.
**Verify**: `node scripts/phone-memory.mjs; echo "exit $?"` → the same three lines, `exit 0`, and
`git status --short -- public vendor sync.lock.json` prints nothing (nothing needed patching, so nothing was written).

### Step 6: Build, docs, memory, commit

1. `pnpm build`.

**Verify**: last line ends `all checks pass`.

2. `docs/sync.md`, under `## Transforms`, after the sentence that ends "or the sync stops and says which anchor
   moved.", add: "A patch whose file no rule shipped also stops the sync: a file the rounds renamed never loses its
   patch quietly. `node scripts/phone-memory.mjs` on its own patches every file in memory before it writes any."
3. Append to `memory.md` an entry dated today: type `fix`, the files changed, why (a renamed file dropped its patch
   silently; the standalone phone run could leave the lock wrong), what was checked, open threads none.
4. Commit:

```sh
git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit \
  -m "fix(sync): stop when a patch never met its file; phone patches written all or nothing" \
  -- scripts/sync.mjs scripts/phone-memory.mjs docs/sync.md memory.md
```

**Verify**: `git status --short` → no output.

## Test plan

- `scripts/sync.mjs` runs when imported, so it has no unit tests; the checks are the runs in steps 3 and 4 (the real
  export passes; a patch for a file that does not exist fails with the new message).
- The phone-memory block is checked by step 5's three runs. Do not try to exercise its write path on the real synced
  files: that would mean editing a synced file by hand, which the repo forbids.
- If plan 001 has landed (`pnpm test` exists in `package.json`), also run `pnpm test` → `ℹ fail 0`. This plan adds no
  test file.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `node --check scripts/sync.mjs && node --check scripts/phone-memory.mjs` exits 0
- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`, exit 0
- [ ] `/usr/bin/grep -c "PATCHED" scripts/sync.mjs` prints `3`
- [ ] `/usr/bin/grep -c "no-such-file" scripts/sync.mjs` prints `0`
- [ ] `/usr/bin/grep -c "the round page has no </head>" scripts/sync.mjs` prints `1`
- [ ] `/usr/bin/grep -c "fs.writeFileSync(abs, out)" scripts/phone-memory.mjs` prints `0`
- [ ] `node scripts/phone-memory.mjs --check` exits 0
- [ ] `pnpm build` exits 0, last line ends `all checks pass`
- [ ] `git status --short -- public vendor sync.lock.json` prints nothing
- [ ] `git diff --name-only origin/main..HEAD` lists only `scripts/sync.mjs`, `scripts/phone-memory.mjs`, `docs/sync.md`, `memory.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (other than line numbers moved by plans
  001 or 003).
- `~/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync` in step 1.
- After step 2 or 3 the sync check reports a problem. In particular
  `the round page's head loads N sheets and scripts, but M are written the way the sync reads them` means the round
  page really has a tag the sync cannot read: report N and M. Do not loosen the count.
- In step 4 the message does not appear, or the check still prints `in sync` with the temporary line in place.
- `node scripts/phone-memory.mjs` (without `--check`) prints `patched` for any file or changes any file: the synced
  files were not in the state this plan expects.
- A step's verification fails twice after a reasonable fix attempt, or the fix appears to need an out-of-scope file.

## Maintenance notes

- When a pin moves and the rounds have renamed or dropped a patched file, the sync now stops with
  `...a TRANSFORMS, PHONE or BINARY patch names this file, but no rule shipped it`. The answer is to move the patch to
  the new path or delete it on purpose, never to delete the check. For the two `BINARY` paint-outs, look at the new
  picture before deciding.
- A stage that cannot read its pinned commit or its source folder skips all its files, so its patch keys are
  reported too. Fix the first problem in the list first.
- The standalone `phone-memory.mjs` still decides by the marker text, so it cannot add a new patch to a file that
  already has one. That is now written in its header; the full sync is the way.
- A reviewer should check that the temporary `no-such-file` line is not in the diff.
- Plan 003 adds a check that the synced folders match the lock exactly; it would also catch a `.tmp` file left by a
  run that was killed between the write and the rename.
