# Plan 001: The sync and the release guard scan with one set of content rules, and the first tests run

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/sync.mjs scripts/verify-build.mjs scripts/location.mjs package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

The site has content rules it must never break: nothing from the game franchise the cards are inspired by, the
employer's name (General Translation) only on the Atlas card and in Kevin's own bio, no OMMC participant routes, no
ElevenLabs key. Two scripts enforce them: `scripts/sync.mjs` scans every file it pulls from the design rounds, and
`scripts/verify-build.mjs` (the release guard) scans every built file. Today each script has its own copy of the
rules, and the copies have drifted: they read different file types, the guard never looks inside binaries for key
shapes, and one route rule is case-sensitive in one and not the other. Both copies also miss common spellings: a name
written with an HTML entity, a JavaScript escape, a decomposed accent, a hyphen, an underscore, two spaces or a
non-breaking space passes both gates, and so does the franchise's "dex" word. File names are never read at all.

After this plan there is one rules module, both scripts call it, it reads every spelling and every path, and a test
file proves it. The repo gets its first test command (`pnpm test`), which later plans build on.

## Current state

There is no test command, no lint and no CI in this repo. `package.json` scripts today:

```json
// package.json:9-16
  "scripts": {
    "sync": "node scripts/sync.mjs",
    "sync:check": "node scripts/sync.mjs --check",
    "dev": "astro dev",
    "build": "astro build && node scripts/verify-build.mjs",
    "preview": "astro preview",
    "check": "astro check && node scripts/verify-build.mjs"
  },
```

Files and their roles:

- `scripts/sync.mjs` — pulls round material into `public/ex`, `public/og`, `public/sound`, `public/battle`, `vendor/`.
  It runs when imported (it has no `main` guard), so a test must never import it. Its scan:

```js
// scripts/sync.mjs:19-22
import sharp from 'sharp';
import { MEDIA, hasLocation } from './location.mjs';
import { PHONE } from './phone-memory.mjs';
import { CLOSED } from '../src/lib/closed-repos.mjs';
```

```js
// scripts/sync.mjs:323-348
// ---------- the scan ----------
const TEXT = /\.(js|mjs|css|html|json|md|txt|svg)$/;
const BANNED = [
  [/pok[eé]\s?(mon|ball)|nintendo|game\s?freak/i, 'franchise name'],
  [/\/api\/(submissions|emails)\b/, 'OMMC participant route'],
  [/xi-api-key/i, 'ElevenLabs header'],
  [/\bsk_[a-f0-9]{40,}\b/, 'API key shape'],
];
// General Translation appears only in the Atlas card's own records: the shared card data files print every card.
const GT = /general\s?translation|generaltranslation/i;
const GT_OK = new Set(['public/ex/fighters.js', 'public/ex/media.gen.js', 'public/ex/face.gen.js', 'vendor/ex/face.gen.js', 'vendor/ex/roster/battle-roster.json', 'vendor/ex/copy/overrides.json']);

function scan(dest, buf) {
  const hits = [];
  if (TEXT.test(dest)) {
    const t = buf.toString('utf8');
    for (const [re, why] of BANNED) if (re.test(t)) hits.push(why);
    if (GT.test(t) && !GT_OK.has(dest) && !/\/atlas[./]/.test(dest)) hits.push('General Translation outside the Atlas card');
  } else {
    const t = buf.toString('latin1');
    if (/xi-api-key/i.test(t) || /sk_[a-f0-9]{40,}/.test(t)) hits.push('key shape in binary');
    const where = MEDIA.test(dest) && hasLocation(buf);
    if (where) hits.push(where);
  }
  return hits;
}
```

  The scan's one call site:

```js
// scripts/sync.mjs:381
      for (const h of scan(dest, buf)) problems.push(`${dest}: ${h}`);
```

- `scripts/verify-build.mjs` — the release guard, run after `astro build` on `dist/`. Its copy of the rules:

```js
// scripts/verify-build.mjs:9-12
import fs from 'node:fs';
import path from 'node:path';
import { MEDIA, hasLocation } from './location.mjs';
import { PHONE } from './phone-memory.mjs';
```

```js
// scripts/verify-build.mjs:40-43 (lines 42 and 43 are long; their starts are shown)
const GT = /general\s?translation|generaltranslation/i;
// the wall and the cards index print every card, Atlas's line among them
const GT_PAGES = new Set(['/index.html', '/cards.html', '/cards.md', '/404.html', '/about.html', '/cards/atlas.html', '/index.md', '/about.md', '/cards/atlas.md', '/llms.txt', '/llms-full.txt', '/ex/fighters.js', '/ex/media.gen.js', '/ex/face.gen.js']);
const BANNED = [[/pok[eé]\s?(mon|ball)|nintendo|game\s?freak/i, 'franchise name'], [/\/api\/(submissions|emails)\b/, 'OMMC participant route'], [/xi-api-key|\bsk_[a-f0-9]{40,}\b/i, 'key shape']];
```

```js
// scripts/verify-build.mjs:160-170
for (const f of files) {
  const p = rel(f);
  if (/\.(html|md|txt|js|css|json|svg|xml)$/.test(f)) {
    const t = fs.readFileSync(f, 'utf8');
    for (const [re, why] of BANNED) if (re.test(t)) fail(p, why);
    if (GT.test(t) && !GT_PAGES.has(p) && !/\/atlas[./]/.test(p)) fail(p, 'General Translation outside the Atlas card');
  } else if (MEDIA.test(f)) {
    const where = hasLocation(fs.readFileSync(f));
    if (where) fail(p, where);
  }
}
```

- `scripts/location.mjs` — already shared by both scripts, and the pattern to follow: a small module with named
  exports and a comment that says who uses it. It exports `MEDIA` (a file-type pattern) and `hasLocation(buf)`, which
  returns `'GPS in EXIF'`, `'GPS in XMP'`, `'location atom'` or `null`. This plan does not change it.

Facts the advisor verified on 2026-11-09 by running the new module (below) read-only over the repo: all 3,024 files
in `sync.lock.json` and all 3,099 files in a fresh `dist/` give zero hits. So the new rules must not fail any file
that ships today. If they do when you run them, something else changed: that is a STOP condition, not a reason to
loosen a rule.

Conventions: ES modules (`.mjs`), two-space indent, single quotes, semicolons, lines up to about 120 characters,
comments that say why in plain words. Match `scripts/location.mjs`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Sync check | `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` | prints `in sync`, exit 0 (about 40 s) |
| Build and release guard | `pnpm build` | last line starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass` |
| Tests (after step 3) | `pnpm test` | `ℹ pass 8` and `ℹ fail 0` |

`~/k7-rescue/release-next/rounds-42ff51c7` is the export of the design rounds that the 11-09 release synced from. The
sync check reads it and writes nothing. A plain `pnpm sync` without `ROUNDS=` fails by design; do not run it.

## Scope

**In scope** (the only files you should modify):
- `scripts/rules.mjs` (create)
- `scripts/rules.test.mjs` (create)
- `scripts/sync.mjs` (the scan section and one import only)
- `scripts/verify-build.mjs` (the rule constants, the final scan loop and one import only)
- `package.json` (add one script)
- `docs/sync.md` (the paragraph under "## The scan")
- `scripts/SKILL.md` (one line)
- `AGENTS.md` (one line in the hand-written "## Commands" list only)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- `scripts/location.mjs` — shared and correct; its tests are written here but the file stays as it is.
- Anything under `public/ex`, `public/og`, `public/sound`, `public/battle`, `vendor/` — synced folders, never edited
  by hand, and this plan must not need to.
- `sync.lock.json` — this plan changes no synced bytes, so the lock must not change.
- The rest of `scripts/sync.mjs` (rules, transforms, pins) and the per-page checks in `scripts/verify-build.mjs`.
- The block between `<!-- agent-docs:auto:... -->` markers in `AGENTS.md` — machine-maintained.
- Adding more allowed paths for General Translation, or loosening any pattern, to make a check pass.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/001-scan-rules-module-and-tests`, cut
  from `origin/main`:
  `git -C ~/repos/kevinliu-studio fetch origin && git -C ~/repos/kevinliu-studio worktree add -b improve/001-scan-rules-module-and-tests ~/repos/kevinliu-studio-001 origin/main`.
  Never edit the main checkout at `~/repos/kevinliu-studio` (other sessions use it). Never use `git stash`.
- Commit by explicit path, as the GitHub noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`. For this plan:
  `fix(scan): one set of content rules for the sync and the guard, every spelling and path read`.
- Do NOT push, open a PR or deploy. The release session owns `main`.

## Steps

### Step 1: Set up and confirm the baseline

Create the worktree (Git workflow above), `cd` into it and install.

**Verify**: `pnpm install --frozen-lockfile` → exit 0.
**Verify**: `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` → prints `in sync`.
**Verify**: `pnpm build` → last line ends `all checks pass`.

### Step 2: Create `scripts/rules.mjs`

Create the file with exactly this content:

```js
// The content rules, one copy for the sync's scan (scripts/sync.mjs) and the release guard (scripts/verify-build.mjs).
import { MEDIA, hasLocation } from './location.mjs';

export const TEXT = /\.(js|mjs|css|html|json|md|txt|svg|xml|webmanifest)$/i;

const ENTITY = { eacute: 'é', Eacute: 'É', egrave: 'è', Egrave: 'È', nbsp: ' ', shy: '­', amp: '&', hyphen: '-', dash: '-', ndash: '-', mdash: '-', ensp: ' ', emsp: ' ', thinsp: ' ', zwnj: '', zwj: '' };
// One spelling for every way a name can be written: escapes and entities decoded, accents off, invisible characters
// out, and every run of spaces, hyphens and underscores one space.
export function normalize(text) {
  return text
    .replace(/\\u\{([0-9a-f]{1,6})\}|\\u([0-9a-f]{4})|\\x([0-9a-f]{2})/gi, (m, a, b, c) => { const n = parseInt(a ?? b ?? c, 16); return n <= 0x10ffff ? String.fromCodePoint(n) : m; })
    .replace(/&#x([0-9a-f]{1,6});|&#(\d{1,7});|&([a-z]+);/gi, (m, h, d, name) => { if (name) return ENTITY[name] ?? m; const n = h ? parseInt(h, 16) : Number(d); return n <= 0x10ffff ? String.fromCodePoint(n) : m; })
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .replace(/[­​-‍⁠﻿]/g, '')
    .replace(/[\s_\-‐-―]+/g, ' ');
}

// read on normalize(text) and on normalize(path)
export const NAMES = [[/poke(mon|ball|dex)|\bpoke (mon|ball|dex)|nintendo|game ?freak/i, 'franchise name']];
// read on the text as written (normalizing would break these shapes)
export const RAW = [
  [/\/api\/(submissions|emails)\b/i, 'OMMC participant route'],
  [/xi-api-key/i, 'ElevenLabs header'],
  [/\bsk_[a-f0-9]{40,}\b/i, 'API key shape'],
];
export const GT = /general ?translation/i;
// General Translation appears only in the Atlas card's own records, the pages that print every card's line, and
// Kevin's own bio and facts (docs/content.md). Paths are site paths: a repo path under public/ loses that prefix.
const GT_ALLOWED = new Set([
  '/ex/fighters.js', '/ex/media.gen.js', '/ex/face.gen.js',
  '/vendor/ex/face.gen.js', '/vendor/ex/roster/battle-roster.json', '/vendor/ex/copy/overrides.json',
  '/index.html', '/cards.html', '/cards.md', '/404.html', '/about.html', '/cards/atlas.html',
  '/index.md', '/about.md', '/cards/atlas.md', '/llms.txt', '/llms-full.txt',
]);
export const sitePath = (p) => '/' + p.replace(/^\/+/, '').replace(/^public\//, '');
export const gtAllowed = (p) => GT_ALLOWED.has(sitePath(p)) || /\/atlas[./]/.test(sitePath(p));

// every reason a shipped file may not ship: [] when it may
export function scanBuffer(p, buf) {
  const hits = [];
  const name = normalize(p);
  for (const [re, why] of NAMES) if (re.test(name)) hits.push(`${why} in the path`);
  if (GT.test(name) && !gtAllowed(p)) hits.push('General Translation in the path');
  if (TEXT.test(p)) {
    const raw = buf.toString('utf8'), t = normalize(raw);
    for (const [re, why] of RAW) if (re.test(raw)) hits.push(why);
    for (const [re, why] of NAMES) if (re.test(t)) hits.push(why);
    if (GT.test(t) && !gtAllowed(p)) hits.push('General Translation outside the Atlas card');
  } else {
    const t = buf.toString('latin1');
    if (/xi-api-key/i.test(t) || /sk_[a-f0-9]{40,}/i.test(t)) hits.push('key shape in binary');
    const where = MEDIA.test(p) && hasLocation(buf);
    if (where) hits.push(where);
  }
  return hits;
}
```

Why it is shaped this way (do not change these choices):

- Names are matched on `normalize(text)`, where accents are off and every run of spaces, hyphens and underscores is
  one space. So the patterns are written without accents and with a single optional space.
- The spaced form of the first name needs a word boundary before it (`\bpoke (mon|ball|dex)`), so "bespoke
  monogram" and "spoke monthly" do not match. The joined form needs none.
- Routes and key shapes are matched on the text as written, because normalizing would turn `xi-api-key` into
  `xi api key`.
- `gtAllowed` takes a repo path (`public/ex/fighters.js`) or a site path (`/ex/fighters.js`): the sync passes the
  first kind, the guard the second.

**Verify**: `node -e "import('./scripts/rules.mjs').then(m=>console.log(Object.keys(m).sort().join(',')))"` →
`GT,NAMES,RAW,TEXT,gtAllowed,normalize,scanBuffer,sitePath`

### Step 3: Create the tests and the test command

Create `scripts/rules.test.mjs` with exactly this content. The banned names are assembled from pieces on purpose, so
this file never contains them whole:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, scanBuffer, gtAllowed, sitePath } from './rules.mjs';
import { hasLocation } from './location.mjs';

const hits = (path, text) => scanBuffer(path, Buffer.from(text));
const P = 'Pok', M = 'mon', N = 'Nin' + 'tendo', GF = ['Game', 'Freak'], G = 'General', T = 'Translation';

test('franchise names are caught however they are written', () => {
  for (const s of [`${P}e${M}`, `${P}é${M}`, `${P}é${M}`, `${P}&eacute;${M}`, `${P}&#233;${M}`, `${P}&#xe9;${M}`, `${P}\\u00e9${M}`, `${P}édex`, `${P}e ball`, `${P}e-${M}`, `${P}e_${M}`, N, `Nin­tendo`, GF.join(' '), GF.join('-'), GF.join('')]) {
    assert.deepEqual(hits('public/ex/x.js', `a ${s} b`), ['franchise name'], s);
  }
});
test('ordinary words are not franchise names', () => {
  for (const s of ['bespoke monogram', 'spoke monthly', 'a bespoke-mono face', 'poker', 'poke the ball', 'the endgame', 'karaoke model']) {
    assert.deepEqual(hits('public/ex/x.js', s), [], s);
  }
});
test('General Translation is caught in every spelling, and allowed only where it belongs', () => {
  for (const s of [`${G} ${T}`, `${G}  ${T}`, `${G}\n${T}`, `${G}-${T}`, `${G}_${T}`, `${G}&nbsp;${T}`, `${G} ${T}`, `${G}${T}`.toLowerCase(), `${G.toUpperCase()} ${T.toUpperCase()}`]) {
    assert.deepEqual(hits('public/ex/gallery.js', s), ['General Translation outside the Atlas card'], s);
    assert.deepEqual(hits('public/ex/fighters.js', s), [], s);
  }
  assert.deepEqual(hits('public/ex/x.js', 'a general purpose translation layer'), []);
});
test('the allow-list reads repo paths and site paths alike', () => {
  assert.equal(sitePath('public/ex/fighters.js'), '/ex/fighters.js');
  assert.equal(sitePath('/ex/fighters.js'), '/ex/fighters.js');
  assert.equal(sitePath('vendor/ex/face.gen.js'), '/vendor/ex/face.gen.js');
  for (const p of ['public/ex/fighters.js', '/ex/fighters.js', 'vendor/ex/copy/overrides.json', '/about.html', '/cards/atlas.md', 'public/ex/media/atlas/pop.webp', 'public/og/atlas.jpg']) assert.equal(gtAllowed(p), true, p);
  for (const p of ['public/ex/gallery.js', '/battle.html', '/cards/elo.html', 'public/battle/shared/battle.js']) assert.equal(gtAllowed(p), false, p);
});
test('a banned name in a file name is caught', () => {
  assert.deepEqual(hits(`public/ex/media/${P}e-${M}/pop.txt`, 'fine'), ['franchise name in the path']);
  assert.deepEqual(hits(`public/ex/${G}-${T}.txt`.toLowerCase(), 'fine'), ['General Translation in the path']);
});
test('routes and key shapes are read as written', () => {
  assert.deepEqual(hits('public/ex/x.js', 'fetch("/api/submissions")'), ['OMMC participant route']);
  assert.deepEqual(hits('public/ex/x.js', 'fetch("/API/Emails?x")'), ['OMMC participant route']);
  assert.deepEqual(hits('public/ex/x.js', 'headers: { "Xi-Api-Key": k }'), ['ElevenLabs header']);
  assert.deepEqual(hits('public/ex/x.js', 'k = "sk_' + 'a1'.repeat(24) + '"'), ['API key shape']);
  assert.deepEqual(hits('public/ex/x.js', 'fetch("/api/submit")  // task_0123'), []);
  assert.deepEqual(hits('public/sound/out/a.webm', 'xx sk_' + 'A1'.repeat(24) + ' xx'), ['key shape in binary']);
});
test('normalize keeps ordinary text readable', () => {
  assert.equal(normalize('a  b\n-c__d'), 'a b c d');
  assert.equal(normalize('café &amp; &lt;'), 'cafe & &lt;');
});

// EXIF: a TIFF header, then one IFD with one 12-byte entry and the next-IFD offset
const tiff = (le, tag) => {
  const b = Buffer.alloc(26);
  b.write(le ? 'II*\0' : 'MM\0*', 0, 'latin1');
  if (le) { b.writeUInt32LE(8, 4); b.writeUInt16LE(1, 8); b.writeUInt16LE(tag, 10); } else { b.writeUInt32BE(8, 4); b.writeUInt16BE(1, 8); b.writeUInt16BE(tag, 10); }
  return b;
};
test('location metadata is found in EXIF, XMP and the video atoms, and nowhere else', () => {
  assert.equal(hasLocation(Buffer.concat([Buffer.from('junk'), tiff(true, 0x8825)])), 'GPS in EXIF');
  assert.equal(hasLocation(tiff(false, 0x8825)), 'GPS in EXIF');
  assert.equal(hasLocation(tiff(true, 0x010f)), null);
  assert.equal(hasLocation(tiff(false, 0x010f)), null);
  assert.equal(hasLocation(Buffer.from('<x:xmpmeta exif:GPSLatitude="1,2N"/>')), 'GPS in XMP');
  assert.equal(hasLocation(Buffer.from('moov\xa9xyz+37.77-122.41/', 'latin1')), 'location atom');
  assert.equal(hasLocation(Buffer.from('com.apple.quicktime.location.ISO6709')), 'location atom');
  assert.equal(hasLocation(Buffer.from('RIFF....WEBPVP8 plain picture bytes')), null);
  assert.deepEqual(scanBuffer('public/ex/media/elo/pop.webp', Buffer.concat([Buffer.from('RIFF'), tiff(true, 0x8825)])), ['GPS in EXIF']);
});
```

In `package.json`, add one line to `"scripts"` after the `"check"` line (add a comma to the `"check"` line):

```json
    "check": "astro check && node scripts/verify-build.mjs",
    "test": "node --test \"scripts/**/*.test.mjs\""
```

**Verify**: `pnpm test` → output contains `ℹ tests 8`, `ℹ pass 8`, `ℹ fail 0`; exit 0.

### Step 4: Make `scripts/sync.mjs` use the module

1. Replace the import on line 20 (`import { MEDIA, hasLocation } from './location.mjs';`) with:
   `import { scanBuffer } from './rules.mjs';`
   (`MEDIA` and `hasLocation` are used nowhere else in this file.)
2. Delete the whole scan section shown under "Current state" (`// ---------- the scan ----------` through the closing
   `}` of `function scan`, lines 323 to 348) and put this in its place:

```js
// ---------- the scan: scripts/rules.mjs, the same rules the release guard reads dist with ----------
```

3. Change the call site (line 381) to:

```js
      for (const h of scanBuffer(dest, buf)) problems.push(`${dest}: ${h}`);
```

**Verify**: `/usr/bin/grep -c "BANNED\|GT_OK\|function scan" scripts/sync.mjs` → `0`
**Verify**: `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` → prints `in sync`,
exit 0. (The scan runs before the check reports; a file that newly fails would print
`N problem(s); nothing was written` and exit 1.)
**Verify**: `git status --short -- public vendor sync.lock.json` → no output.

### Step 5: Make `scripts/verify-build.mjs` use the module

1. Replace the import on line 11 (`import { MEDIA, hasLocation } from './location.mjs';`) with:
   `import { scanBuffer } from './rules.mjs';`
2. Delete lines 40 to 43 shown under "Current state" (`const GT = ...`, the comment, `const GT_PAGES = ...`,
   `const BANNED = ...`).
3. Replace the loop at lines 160 to 170 with:

```js
// the content rules (scripts/rules.mjs), on every built file and its path: the same scan the sync runs on the way in
for (const f of files) {
  const p = rel(f);
  for (const why of scanBuffer(p, fs.readFileSync(f))) fail(p, why);
}
```

**Verify**: `/usr/bin/grep -c "GT_PAGES\|BANNED\|hasLocation" scripts/verify-build.mjs` → `0`
**Verify**: `pnpm build` → last line starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass`.

### Step 6: Prove the guard now fails on a spelling it used to miss

This uses a copy of `dist`, so nothing real is changed. `$TMPDIR` is your own temporary folder.

```sh
rm -rf "$TMPDIR/dist-001" && cp -Rc dist "$TMPDIR/dist-001"   # -c clones on APFS, so the copy takes no disk space
printf 'General&nbsp;Translation' > "$TMPDIR/dist-001/zz-probe.txt"
node scripts/verify-build.mjs "$TMPDIR/dist-001"; echo "exit $?"
rm -rf "$TMPDIR/dist-001"
```

**Verify**: the output contains `/zz-probe.txt: General Translation outside the Atlas card` and `exit 1`.
(Other lines may appear because the copy sits outside the repo; only that line and the exit code matter.)

### Step 7: Docs, memory, commit

1. `docs/sync.md`, under `## The scan`: replace the last sentence, "The release guard runs the same check on
   `dist`.", with: "The rules live in `scripts/rules.mjs`, and the release guard reads `dist` with the same function
   (`scanBuffer`), so the two cannot drift. Names are matched on a normalized text: entities and escapes decoded,
   accents off, and every run of spaces, hyphens and underscores read as one space. Each file's path is read too.
   `pnpm test` runs the rules' tests (`scripts/rules.test.mjs`)."
2. `scripts/SKILL.md`: after the line that starts ``- `verify-build.mjs`: a new site-wide rule goes here``, add:
   ``- `rules.mjs`: the content rules, read by `sync.mjs` and `verify-build.mjs` alike. A new banned name or allowed path goes here, with a case in `rules.test.mjs` (`pnpm test`).``
3. `AGENTS.md`, in the hand-written `## Commands` list (the one that starts ``- `pnpm sync` and `pnpm sync --check` ``),
   add: ``- `pnpm test` (the content rules' tests, `scripts/*.test.mjs`)``
4. Append to `memory.md` (at the end, never editing older entries) an entry dated today with: type `fix`, the files
   changed, why (the two scans had drifted and missed spellings), what was checked (the commands above and their
   results), and the open thread "plans 002 and 003 also edit scripts/sync.mjs".
5. Commit:

```sh
git add scripts/rules.mjs scripts/rules.test.mjs
git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit \
  -m "fix(scan): one set of content rules for the sync and the guard, every spelling and path read" \
  -- scripts/rules.mjs scripts/rules.test.mjs scripts/sync.mjs scripts/verify-build.mjs package.json docs/sync.md scripts/SKILL.md AGENTS.md memory.md
```

**Verify**: `git status --short` → no output. `git log -1 --format=%ae` → `66856750+Kevin-Liu-01@users.noreply.github.com`

## Test plan

- New file `scripts/rules.test.mjs` (step 3), eight tests: the franchise names in 16 spellings; seven ordinary
  phrases that must not match; General Translation in nine spellings, failing in an ordinary file and allowed in
  `fighters.js`; the allow-list for both path shapes; banned names in a path; routes and key shapes; `normalize`
  itself; and `hasLocation` on hand-built EXIF (both byte orders, with and without the GPS tag), XMP and video-atom
  buffers.
- There is no existing test to model on: this is the repo's first. It uses only `node:test` and
  `node:assert/strict`, no dependency.
- The tests import only `rules.mjs` and `location.mjs`. Never import `sync.mjs` or `verify-build.mjs` in a test:
  both run their whole job when imported.
- Verification: `pnpm test` → `ℹ pass 8`, `ℹ fail 0`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm test` exits 0 and prints `ℹ pass 8` and `ℹ fail 0`
- [ ] `ROUNDS=$HOME/k7-rescue/release-next/rounds-42ff51c7 node scripts/sync.mjs --check` prints `in sync`, exit 0
- [ ] `pnpm build` exits 0 and its last line ends `all checks pass`
- [ ] `/usr/bin/grep -c "BANNED\|GT_OK\|GT_PAGES" scripts/sync.mjs scripts/verify-build.mjs` prints `0` for both files
- [ ] `/usr/bin/grep -c "scanBuffer" scripts/sync.mjs scripts/verify-build.mjs` prints `2` for both files (one import, one call)
- [ ] `git status --short -- public vendor sync.lock.json` prints nothing
- [ ] `git diff --name-only origin/main..HEAD` lists only the in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- `~/k7-rescue/release-next/rounds-42ff51c7` is missing, or the sync check does not print `in sync` in step 1.
- After step 4 the sync check prints `problem(s)`, or after step 5 the build fails on a scan line
  (`franchise name`, `General Translation ...`, `OMMC participant route`, `key shape ...`, `GPS ...`,
  `location atom`). Report the file and the reason exactly as printed. Do not add the file to the allow-list and do
  not change a pattern.
- `pnpm test` reports fewer or more than 8 tests, or any failure, after the files were created exactly as given.
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- A new banned name, a new allowed place for General Translation, or a new text file type is one edit in
  `scripts/rules.mjs` plus one case in `scripts/rules.test.mjs`. Reviewers should refuse a rule change without a
  test case.
- `normalize` knows a short list of named entities (`ENTITY`). If round code starts using another one inside a name,
  add it there.
- The guard now reads every built file, binaries included, for key shapes; before, it read only text types. It adds a
  few seconds to a build.
- `pok[eé]`-style patterns are gone on purpose: the accent is removed before matching. Do not put accents back into a
  pattern in `NAMES`.
- Plans 002 and 003 edit other parts of `scripts/sync.mjs`. Their line numbers shift by about 25 after this plan;
  they match by text.
- Deferred, on purpose: the OMMC rule still names only two routes (`/api/submissions`, `/api/emails`). Whether the
  portal has more participant routes is an open question for Kevin, not for this plan.
- Not covered: text inside pictures (the sync paints out two captures by pixel rows) and metadata fields other than
  location. Plan 002 makes the sync fail when a paint-out no longer finds its file.
