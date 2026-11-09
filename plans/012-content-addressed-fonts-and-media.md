# Plan 012: The two site faces are named by content address, and only content-addressed files are cached for a year

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- src/layouts/Base.astro src/styles/machine.css vercel.json scripts/smoke.mjs scripts/verify-build.mjs docs/performance.md docs/deploy.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

The site's rule (`docs/performance.md`, "Content addresses") is that a file may be cached for a year (`immutable`)
only when its address contains its content, so a changed file always gets a new address. The two site faces break
that rule: `/fonts/katagami-sans-site.woff2` and `/fonts/katagami-mono-site.woff2` have plain addresses and are
served `immutable` for a year. The Sans file is a subset holding only the characters the site prints today. The next
time a card title or a line of copy needs a new character, the subset is rebuilt under the same address, and every
returning visitor keeps the old file for up to a year: the new character falls back to Arial inside card titles that
were fitted to Katagami's widths. After this plan both faces carry `?v=<hash of the file>`, only a font address with
`?v=` is cached for a year, and the same year-long cache is extended to the frame and effect drawings whose address
already holds their own hash, with a build check that keeps that true.

## Current state

- `src/lib/assets.ts` — `versioned(file)` returns a public file's address with `?v=<first 10 hex of its sha-256>`
  (for example `/ex/ui.css?v=…`). It reads `public/<file>`, so it works for `/fonts/…` too:

```ts
export function versioned(file: string) {
  let u = seen.get(file);
  if (!u) {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(process.cwd(), 'public', file))).digest('hex').slice(0, 10);
    seen.set(file, (u = `${file}?v=${hash}`));
  }
  return u;
}
```

- `src/layouts/Base.astro` — the page frame of every page except the battle. It already imports `versioned`
  (`Base.astro:11`). The Sans face (`Base.astro:28-33`):

```astro
const FONT = '/fonts/katagami-sans-site.woff2';
const fontFace = [
  `@font-face{font-family:"Katagami Sans";src:url(${FONT}) format("woff2");font-weight:100 900;font-display:block}`,
  '@font-face{font-family:"Katagami Sans Fallback";src:local("Arial"),local("ArialMT");font-weight:100 600;size-adjust:106.9%;ascent-override:90.6%;descent-override:22.6%;line-gap-override:0%}',
  '@font-face{font-family:"Katagami Sans Fallback";src:local("Arial Bold"),local("Arial-BoldMT");font-weight:601 900;size-adjust:102%;ascent-override:95%;descent-override:23.6%;line-gap-override:0%}',
].join('');
```

  It is preloaded (`Base.astro:40`) and printed in an inline style (`Base.astro:52`):

```astro
<link rel="preload" href={FONT} as="font" type="font/woff2" crossorigin />
```
```astro
<style is:inline id="kface" set:html={`${fontFace}\n${neuTokens}:root{--mask-win:${masks.win}}`}></style>
```

  The root element (`Base.astro:36`):

```astro
<html lang="en" data-mode="human" {...html}>
```

  The Mono face (the Machine view's) is preloaded by an inline script when a page opens in the Machine view. The
  script is one line (`Base.astro:50`); `d` in it is `document.documentElement`. The piece that names the file occurs
  once:

```js
l.href='/fonts/katagami-mono-site.woff2';
```

- `src/styles/machine.css:14` — the Mono face's rule, in a stylesheet Astro bundles (so `versioned()` cannot be
  called there):

```css
@font-face { font-family: 'Katagami Mono'; src: url(/fonts/katagami-mono-site.woff2) format('woff2'); font-weight: 100 700; font-display: block; }
```

  `machine.css` is imported only by `Base.astro`, so a rule moved into `Base.astro`'s inline style reaches the same
  pages.

- `vercel.json:24-26` — the cache rules (`"continue": true` routes only add headers):

```json
    { "src": "^/(?:_astro|fonts)/.*$", "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "src": "^/(?:ex|sound|battle)/.*\\.(?:css|js)$", "has": [{ "type": "query", "key": "v" }], "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "src": "^/(?:ex|battle|sound|og|share)/.*\\.(?:webp|avif|png|jpg|svg|mp4|webm|m4a|woff2)$", "continue": true, "headers": { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
```

- `scripts/smoke.mjs:24-30` — the deployed-copy check of those headers:

```js
// the stylesheets, scripts and face a page names by content address are kept for a year (vercel.json)
const { text: home } = await get('/');
for (const u of [home.match(/\/ex\/ui\.css\?v=[0-9a-f]+/)?.[0], home.match(/\/fonts\/[\w-]+\.woff2/)?.[0]]) {
  if (!u) { fails.push('/: no versioned /ex/ui.css or preloaded face'); continue; }
  const { r } = await get(u);
  if (!/immutable/.test(r.headers.get('cache-control') ?? '')) fails.push(`${u}: cache-control ${r.headers.get('cache-control')}`);
}
```

- `scripts/verify-build.mjs` — the release guard that `pnpm build` runs. Its imports (`verify-build.mjs:9-12`), its
  error list (`:16`) and the loop that resolves every local reference of a page (`:126-132`):

```js
import fs from 'node:fs';
import path from 'node:path';
import { MEDIA, hasLocation } from './location.mjs';
import { PHONE } from './phone-memory.mjs';
```
```js
const errors = [];
```
```js
  for (const m of html.replace(/<base [^>]*>/, '').matchAll(/\s(?:src|href|poster|data-plainfx)="([^"]+)"|url\(["']?([^"')]+)["']?\)/g)) {
    const u = m[1] ?? m[2];
    // %23 is an encoded fragment inside an inline SVG data URI (a filter or gradient id), not a file
    if (!u || /^(https?:|mailto:|data:|#|%23|javascript:|blob:)/.test(u) || u.includes('${')) continue;
    const abs = new URL(u, `https://x${base}`).pathname;
    if (!exists(abs)) fail(page, `broken reference ${u} (resolves to ${abs})`);
  }
```

- The card markup (round code under `public/ex`, never edited here) already names some drawings with `?v=`. Measured
  on the build of `c6245d9`, over the home page and two card pages (101 addresses):
  - `borders/<id>/…/*.svg?v=` and `fx/<id>/fx.svg?v=`: the token IS the first 8 hex of the served file's sha-256
    (37 of 37 match). Example: `fx/turboslide/fx.svg?v=d238c1ac`.
  - `design/frames/*.svg?v=` and `design/lit/*.svg?v=`: the token is NOT the file's hash (0 of 64 match; it is the
    hash of another file the drawing was made from). These must NOT be cached for a year.
  - Every other picture (`posters/`, `media/`) has a plain address.

- The battle page's own faces live under `/battle/vendor/fonts/` and are not part of this plan.

- `docs/performance.md:13` (the "Content addresses" row) and `docs/deploy.md:29-31` (the "Caching" bullet) describe
  these rules and must stay true.

Repo rules that apply (from `AGENTS.md`): `public/ex`, `public/battle`, `public/sound`, `public/og` and `vendor/` are
synced and never edited by hand (this plan edits none of them); nothing pops (the face still blocks and is still
preloaded first, so first paint does not change); append an entry to `memory.md`; ask Kevin before deploying.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Build and release guard | `pnpm build` | last line starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass` |
| The faces' hashes | `for f in sans mono; do shasum -a 256 public/fonts/katagami-$f-site.woff2 \| cut -c1-10; done` | two 10-character hashes (`8254e26517` and `9fade4c28f` at `c6245d9`) |
| JSON is valid | `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` | exit 0, no output |
| Deployed copy (operator step only) | `node scripts/smoke.mjs <preview-url>` | `smoke: <preview-url> passes` |

There is no test runner, linter or CI in this repo. Do not run `pnpm check` (it is broken on `main`).

## Scope

**In scope** (the only files you should modify):
- `src/layouts/Base.astro` (lines 28-33, 36, 50 as described)
- `src/styles/machine.css` (line 14 only)
- `vercel.json` (line 24, and one new route after line 26)
- `scripts/smoke.mjs` (lines 24-30)
- `scripts/verify-build.mjs` (one import, one helper, one check)
- `docs/performance.md` (the "Content addresses" row), `docs/deploy.md` (the "Caching" bullet)
- `memory.md` (append one entry)
- `plans/README.md` (your status row)

**Out of scope** (do NOT touch, even though they look related):
- Anything under `public/` or `vendor/`, and `scripts/sync.mjs`. The fonts themselves are not rebuilt or renamed.
- Hashing the plain picture addresses (`posters/…`, `media/…/cast.webp`). They are also built at runtime by round
  code (`gallery.js`, `rituals.js`); hashing them is a larger change and is deferred. They keep one day of cache.
- `design/frames/` and `design/lit/` drawings: their `?v=` is not their own hash, so they keep one day of cache.
- The battle page's faces (`/battle/vendor/fonts/`), `src/components/BattlePage.astro`.
- `font-display: block`, the preload order and the Arial fallback metrics: decided (`docs/performance.md`).
- The other routes in `vercel.json`. Plan 004 changes lines 13-20 and 28-29; leave them.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/012-content-addressed-fonts` cut from
  `origin/main`. Never edit the main checkout (other sessions use it). Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `perf(cards): one copy of each card's shared markup, no unused frame code, no wasted fx posters`.
  For this plan: `perf(cache): the faces by content address; a year only for addresses that hold their content`
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Give both faces their content address in `Base.astro`

1. Replace line 28 (`const FONT = '/fonts/katagami-sans-site.woff2';`) with two lines:

```astro
const FONT = versioned('/fonts/katagami-sans-site.woff2');
const MONO = versioned('/fonts/katagami-mono-site.woff2');
```

2. Add the Mono face to the `fontFace` list, as a fourth entry after the two fallback entries and before `].join('')`:

```astro
  `@font-face{font-family:"Katagami Mono";src:url(${MONO}) format("woff2");font-weight:100 700;font-display:block}`,
```

3. Put the Mono address on the root element so the inline script can read it. Line 36 becomes:

```astro
<html lang="en" data-mode="human" data-mono={MONO} {...html}>
```

4. In the inline script on line 50, replace the one occurrence of

```js
l.href='/fonts/katagami-mono-site.woff2';
```

   with

```js
l.href=d.dataset.mono;
```

   (`d` is already `document.documentElement` in that script. A preload must name exactly the address the
   `@font-face` rule names, or the browser fetches the file twice.)

Line 40 (`<link rel="preload" href={FONT} …>`) and line 52 need no edit: they print `FONT` and `fontFace`.

**Verify**: `grep -c "katagami-mono-site.woff2'" src/layouts/Base.astro` → `1` (only the `versioned(...)` call).
**Verify**: `grep -c "l.href=d.dataset.mono" src/layouts/Base.astro` → `1`.

### Step 2: Remove the Mono rule from the bundled stylesheet

In `src/styles/machine.css`, delete line 14 (the whole `@font-face { font-family: 'Katagami Mono'; … }` line). Keep
line 15 (`:root { --mono: … }`) and everything else.

**Verify**: `grep -c '@font-face' src/styles/machine.css` → `0`.

### Step 3: Cache a font for a year only when its address holds its content; extend the year to hashed drawings

In `vercel.json`:

1. Replace line 24 with these two routes:

```json
    { "src": "^/_astro/.*$", "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "src": "^/fonts/.*$", "has": [{ "type": "query", "key": "v" }], "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
```

2. Directly AFTER the media route (the line that begins `{ "src": "^/(?:ex|battle|sound|og|share)/.*\\.(?:webp|avif|…`
   and sets `max-age=86400`), add this route. It must come after that route, because both match these files and the
   later header is the one that is sent:

```json
    { "src": "^/ex/(?:borders|fx)/.*\\.svg$", "has": [{ "type": "query", "key": "v" }], "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
```

**Verify**: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` → exit 0.
**Verify**: `grep -c '_astro|fonts' vercel.json` → `0`.
**Verify**:

```
node -e '
const { routes } = JSON.parse(require("fs").readFileSync("vercel.json", "utf8"));
const year = (p, q) => routes.filter((r) => r.continue && /immutable/.test(r.headers?.["Cache-Control"] ?? "") && new RegExp(r.src).test(p) && (!r.has || (q && r.has.every((h) => h.type === "query" && h.key === "v")))).length > 0;
const want = [["/fonts/katagami-sans-site.woff2", true, true], ["/fonts/katagami-sans-site.woff2", false, false], ["/_astro/Base.x.css", false, true], ["/ex/fx/turboslide/fx.svg", true, true], ["/ex/fx/turboslide/fx.svg", false, false], ["/ex/borders/katagami/border.svg", true, true], ["/ex/design/lit/katagami.svg", true, false], ["/ex/posters/elo.webp", false, false], ["/ex/ui.css", true, true], ["/ex/ui.css", false, false]];
const bad = want.filter(([p, q, w]) => year(p, q) !== w);
console.log(bad.length ? "FAIL " + JSON.stringify(bad) : "cache rules: " + want.length + " cases pass");
process.exit(bad.length ? 1 : 0);'
```

→ `cache rules: 10 cases pass`.

### Step 4: Make the guard hold the drawings to their hashes

In `scripts/verify-build.mjs`:

1. Add the import above the existing `import fs from 'node:fs';` line:

```js
import { createHash } from 'node:crypto';
```

2. Directly after the line `const errors = [];` add:

```js
// sha-256 of a dist file, read once
const hashes = new Map();
const sha256 = (f) => hashes.get(f) ?? hashes.set(f, createHash('sha256').update(fs.readFileSync(f)).digest('hex')).get(f);
```

3. In the reference loop quoted in "Current state", directly after the line
   ``if (!exists(abs)) fail(page, `broken reference ${u} (resolves to ${abs})`);`` and before the loop's closing `}`,
   add:

```js
    // a frame or effect drawing under /ex/borders or /ex/fx named with ?v= is cached for a year (vercel.json), so the
    // token must be the served file's own sha-256: a changed drawing then always gets a new address
    const v = /^\/ex\/(?:borders|fx)\/.*\.svg$/.test(abs) ? /[?&]v=([0-9a-f]+)/.exec(u)?.[1] : null;
    if (v && exists(abs) && !sha256(path.join(DIST, abs)).startsWith(v)) fail(page, `${abs}?v=${v} is not the file's sha-256, and it is cached as immutable`);
```

Also extend the comment block at the top of the file (lines 2-8) with one sentence at its end: `A drawing under
/ex/borders or /ex/fx named with ?v= carries its own sha-256 (it is cached for a year).`

**Verify**: `node --check scripts/verify-build.mjs` → exit 0.

### Step 5: Update the smoke check

In `scripts/smoke.mjs`, replace lines 24-30 (quoted in "Current state") with:

```js
// what a page names by content address is kept for a year (vercel.json): its stylesheets and scripts, both faces, and
// the frame and effect drawings whose ?v= is their own hash; a font asked for without ?v= is not
const { text: home } = await get('/');
const border = home.match(/borders\/[\w-]+\/border\.svg\?v=[0-9a-f]+/)?.[0];
for (const u of [home.match(/\/ex\/ui\.css\?v=[0-9a-f]+/)?.[0], home.match(/\/fonts\/katagami-sans-site\.woff2\?v=[0-9a-f]+/)?.[0], home.match(/\/fonts\/katagami-mono-site\.woff2\?v=[0-9a-f]+/)?.[0], border && `/ex/${border}`]) {
  if (!u) { fails.push('/: no versioned /ex/ui.css, face, Machine face or border drawing'); continue; }
  const { r } = await get(u);
  if (r.status !== 200 || !/immutable/.test(r.headers.get('cache-control') ?? '')) fails.push(`${u}: ${r.status} cache-control ${r.headers.get('cache-control')}`);
}
{
  const { r } = await get('/fonts/katagami-sans-site.woff2');
  if (/immutable/.test(r.headers.get('cache-control') ?? '')) fails.push(`/fonts/katagami-sans-site.woff2 without ?v=: cache-control ${r.headers.get('cache-control')}, expected no immutable`);
}
```

**Verify**: `node --check scripts/smoke.mjs` → exit 0.

### Step 6: Build and check the pages

Run `pnpm install --frozen-lockfile`, then `pnpm build`.

**Verify**: the last line ends `all checks pass`.
**Verify** (both faces carry their hash, on a room page, a prose page and the 404):

```
for f in dist/index.html dist/about.html dist/404.html; do echo "$f: $(grep -o 'katagami-[a-z]*-site\.woff2[^")]\{0,13\}' $f | sort -u | tr '\n' ' ')"; done
```

→ each line lists exactly `katagami-mono-site.woff2?v=<10 hex> katagami-sans-site.woff2?v=<10 hex>`, and the two
hashes equal the output of the "faces' hashes" command in the table.

**Verify**: `grep -c 'fonts/' dist/_astro/*.css` → `0` for every stylesheet listed (the Mono rule left the bundle).
**Verify**: `grep -o '<link rel="preload"[^>]*>' dist/about.html` → one line whose `href` is the Sans address with `?v=`.
**Verify**: `grep -c 'l.href=d.dataset.mono' dist/about.html` → `1`, and
`grep -o '<html[^>]*>' dist/about.html` contains `data-mono="/fonts/katagami-mono-site.woff2?v=`.
**Verify** (the guard's new check works: it must fail when a token is wrong):

```
cp -R dist "$TMPDIR/plan-012-dist" && sed -i '' 's/fx\.svg?v=\([0-9a-f]\)/fx.svg?v=0\1/' "$TMPDIR/plan-012-dist/index.html" && node scripts/verify-build.mjs "$TMPDIR/plan-012-dist" | head -3; rm -rf "$TMPDIR/plan-012-dist"
```

→ the output starts `verify-build:` with a number of problems and names `is not the file's sha-256`.

### Step 7: Keep the docs true, record and commit

1. In `docs/performance.md`, the "Content addresses" row (line 13): replace its last cell

```
Every stylesheet and script a page names (`/ex/`, `/sound/`, `/battle/`) carries `?v=<hash>` and is `immutable` for a year; the files the rounds' own scripts load keep plain addresses and revalidate. The guard fails on an unversioned `/ex/` reference; the smoke test checks the header. |
```

   with

```
Every stylesheet and script a page names (`/ex/`, `/sound/`, `/battle/`) and both site faces (`/fonts/`) carry `?v=<hash>` and are `immutable` for a year; so are the frame and effect drawings under `/ex/borders/` and `/ex/fx/`, whose `?v=` the rounds write as the file's own sha-256 (the guard fails when it is not). A font asked for without `?v=`, the `design/` drawings (their `?v=` is another file's hash), every plain picture address and the files the rounds' own scripts load revalidate or keep a day. The guard fails on an unversioned `/ex/` reference; the smoke test checks the headers. |
```

2. In `docs/deploy.md`, the "Caching" bullet (lines 29-31): replace `` `_astro/` and `fonts/` are immutable; `` with
   `` `_astro/` is immutable, and so is a `fonts/` file asked for with `?v=`; `` and, after
   `` is immutable too; ``, insert `` the `/ex/borders/` and `/ex/fx/` drawings asked for with `?v=` are immutable as well; ``.

3. Append an entry to the end of `memory.md` in the file's existing shape (a `## 2026-MM-DD: <title> (<branch>, <agent>)`
   heading, then `- **Type**:`, `- **Changed**:`, `- **Checked**:`, `- **Open**:` bullets). Under Open write: "not
   deployed: the smoke check of the cache headers (`node scripts/smoke.mjs <preview>`) has not run; the plain picture
   addresses (`posters/`, `media/`) still keep a day and are not hashed; `design/` drawings carry a `?v=` that is not
   their own hash (a rounds matter, `r4/ex/tools/design.mjs`)".

Commit by explicit path (every file in "In scope" that changed) with the message in "Git workflow".

**Verify**: `git status --short` → empty.

### Operator step (not yours): the preview check

A Vercel preview needs Kevin's yes. Whoever deploys the branch runs `node scripts/smoke.mjs <preview-url>` as
`docs/deploy.md` describes. If it reports the border drawing's `cache-control` as `max-age=86400` (the earlier media
route won instead of the later one), remove the `^/ex/(?:borders|fx)/` route from `vercel.json`, the border entry
from the list in `scripts/smoke.mjs`, and the two doc phrases about the drawings; the fonts are unaffected.

## Test plan

- The guard (`scripts/verify-build.mjs`) gains one check, exercised twice in step 6: it passes on the real build and
  fails on a copy with one wrong `?v=`.
- The cache rules in `vercel.json` are checked without a deployment by the `node -e` table in step 3 (10 cases,
  including the two that must NOT be cached for a year: a font without `?v=` and a `design/` drawing with one).
- `scripts/smoke.mjs` checks the real headers on a deployment (operator step).
- No test runner exists in this repo; these are commands, in the style of the existing scripts.
- Verification: `pnpm build` ends `all checks pass`; the step 6 loop shows both faces with `?v=` on three pages.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` ends with `all checks pass`
- [ ] the step 6 loop prints both `katagami-mono-site.woff2?v=` and `katagami-sans-site.woff2?v=` for all three pages, and no address without `?v=`
- [ ] `grep -c 'fonts/' dist/_astro/*.css` reports `0` for every file
- [ ] `grep -c '@font-face' src/styles/machine.css` → `0`
- [ ] the step 3 `node -e` table prints `cache rules: 10 cases pass`
- [ ] the step 6 negative check names `is not the file's sha-256`
- [ ] `node --check scripts/smoke.mjs` and `node --check scripts/verify-build.mjs` exit 0
- [ ] `git diff --name-only origin/main...HEAD -- public vendor` prints nothing
- [ ] `git diff --name-only origin/main...HEAD` lists only the files in "In scope"
- [ ] `plans/README.md` status row updated (DONE, with the note "preview smoke not run")

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt in "Current state" does not match (for example plan 004 or the i18n branch reshaped `vercel.json`
  line 24, or `Base.astro`'s head changed).
- After the build, a page still names a face without `?v=`, or names the Mono face with two different addresses.
- `pnpm build` fails with `is not the file's sha-256` on the real build: a `borders/` or `fx/` token no longer
  matches its file. Do not weaken the check; report the files it names (the rounds changed how they write `?v=`).
- The page paints differently at first load. This plan must not change first paint; if you have reason to think it
  did (for example the Machine view flashes a fallback face), record it with `scripts/paint-capture.mjs` as
  `docs/performance.md` describes, and report.
- You are asked to deploy or push.

## Maintenance notes

- After the Sans or Mono subset is rebuilt, nothing else is needed: the build recomputes the hash and every page
  names the new address.
- Returning visitors fetch each face once more after this ships (their cached copy is under the old plain address).
- `data-mono` on `<html>` exists only so the head script can preload the Machine face under the same address the
  `@font-face` rule names. If the script is ever rewritten, keep those two addresses identical.
- If the rounds start writing content hashes on `design/` drawings or on pictures, widen both the `vercel.json`
  route and the guard's pattern together, never one without the other.
- Deferred: hashing `posters/` and `media/` addresses (they are also built at runtime by `gallery.js` and
  `rituals.js`, so it needs a sync transform as well as a build step). Until then a re-cut picture can sit behind
  yesterday's cached file for up to a day.
- A reviewer should check that no page names a face twice with different addresses, and should read the preview
  smoke output before the branch reaches `main`.
