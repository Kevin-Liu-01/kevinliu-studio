# Plan 012: The two site faces are named by content address, and only content-addressed files are cached for a year

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT edit `plans/README.md`: the audit session
> keeps the index.
>
> **Drift check (run first)**: `git diff --stat 4025230..HEAD -- src/layouts/Base.astro src/styles/machine.css vercel.json scripts/smoke.mjs scripts/verify-build.mjs docs/performance.md docs/deploy.md`
> must print nothing (plan 011, the commit before this one on the lane branch, touches none of these files). If it
> prints a file, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat
> it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (after 004, which is on the base; uses `pnpm test` from 001)
- **Category**: perf
- **Planned at**: commit `4025230` (`feat/i18n`), 2026-11-10. Refreshed from the `c6245d9` version by lane A: the
  finding is still present for the two site faces; the i18n faces (`katagami-sans-ext`, `katagami-cjk-*`) already
  carry `?v=`. The cache rules are now written so no answer depends on route order, and they get a test.

## Why this matters

The site's rule (`docs/performance.md`, "Content addresses") is that a file may be cached for a year (`immutable`)
only when its address contains its content, so a changed file always gets a new address. The two site faces break
that rule: `/fonts/katagami-sans-site.woff2` and `/fonts/katagami-mono-site.woff2` have plain addresses and are
served `immutable` for a year. The Sans file is a subset holding only the characters the site prints today. The next
time a card title or a line of copy needs a new character, the subset is rebuilt under the same address, and every
returning visitor keeps the old file for up to a year: the new character falls back to Arial inside card titles that
were fitted to Katagami's widths. After this plan both faces carry `?v=<hash of the file>`, only a font address with
`?v=` is cached for a year, the build fails if a page names a face without it, and the same year-long cache is
extended to the frame and effect drawings whose address already holds their own hash, with a build check that keeps
that true.

## Current state

All paths are in the lane worktree `~/repos/kevinliu-studio-p2a` (branch `improve/p2-checks`).

- `src/lib/assets.ts`: `versioned(file)` returns a public file's address with `?v=<first 10 hex of its sha-256>`.
  It reads `public/<file>`, so it works for `/fonts/…`; the i18n faces already use it.

- `src/layouts/Base.astro`, the page frame of every page except the battle. It imports `versioned` (`:11`) and
  `'../styles/machine.css'` (`:16`). The Sans face (`:32-37`):

```astro
const FONT = '/fonts/katagami-sans-site.woff2';
const fontFace = [
  `@font-face{font-family:"Katagami Sans";src:url(${FONT}) format("woff2");font-weight:100 900;font-display:block}`,
  '@font-face{font-family:"Katagami Sans Fallback";src:local("Arial"),local("ArialMT");font-weight:100 600;size-adjust:106.9%;ascent-override:90.6%;descent-override:22.6%;line-gap-override:0%}',
  '@font-face{font-family:"Katagami Sans Fallback";src:local("Arial Bold"),local("Arial-BoldMT");font-weight:601 900;size-adjust:102%;ascent-override:95%;descent-override:23.6%;line-gap-override:0%}',
].join('');
```

  The translated faces, already by content address (`:43-44`):

```astro
const extFaces = faces.map((f) => `@font-face{font-family:"Katagami Sans";src:url(${versioned(f.file)}) format("woff2");font-weight:100 900;font-display:block;unicode-range:${f.range}}`).join('');
const preloads = faces.filter((f) => f.locales.includes(l.code)).map((f) => versioned(f.file));
```

  The root element (`:47`), the preload (`:51`) and the inline style (`:64`):

```astro
<html lang={l.lang} data-mode="human" {...html}>
```
```astro
<link rel="preload" href={FONT} as="font" type="font/woff2" crossorigin />
```
```astro
<style is:inline id="kface" set:html={`${fontFace}${extFaces}\n${neuTokens}:root{--mask-win:${masks.win}}`}></style>
```

  The Mono face (the Machine view's) is preloaded by an inline script when a page opens in the Machine view. The
  script is one long line (`:62`); `d` in it is `document.documentElement`. The piece that names the file occurs
  once in the file:

```js
l.href='/fonts/katagami-mono-site.woff2';
```

  The same script later calls `document.fonts.load('700 1em "Katagami Mono"')` at idle; that goes through the
  `@font-face` rule, so it follows whatever address the rule names.

- `src/styles/machine.css:14`, the Mono face's rule, in a stylesheet Astro bundles (so `versioned()` cannot be
  called there). `machine.css` is imported only by `Base.astro`, so a rule moved into `Base.astro`'s inline style
  reaches the same pages:

```css
@font-face { font-family: 'Katagami Mono'; src: url(/fonts/katagami-mono-site.woff2) format('woff2'); font-weight: 100 700; font-display: block; }
```

- `vercel.json`, the cache rules (`"continue": true` routes only add headers). Four lines in a row:

```json
    { "src": "^/(?:_astro|fonts)/.*$", "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "src": "^/(?:ex|sound|battle)/.*\\.(?:css|js)$", "has": [{ "type": "query", "key": "v" }], "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "src": "^/(?:es|fr|de|pt|ja|ko|zh)/gallery\\.js$", "has": [{ "type": "query", "key": "v" }], "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "src": "^/(?:ex|battle|sound|og|share)/.*\\.(?:webp|avif|png|jpg|svg|mp4|webm|m4a|woff2)$", "continue": true, "headers": { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
```

  Vercel's route schema (`https://openapi.vercel.sh/vercel.json`, read 2026-11-10) accepts both `has` and `missing`
  on a route.

- `scripts/smoke.mjs`, the deployed-copy check of those headers (the block under the comment that begins `// the
  stylesheets, scripts and face a page names`):

```js
// the stylesheets, scripts and face a page names by content address are kept for a year (vercel.json)
const { text: home } = await get('/');
for (const u of [home.match(/\/ex\/ui\.css\?v=[0-9a-f]+/)?.[0], home.match(/\/fonts\/[\w-]+\.woff2/)?.[0]]) {
  if (!u) { fails.push('/: no versioned /ex/ui.css or preloaded face'); continue; }
  const { r } = await get(u);
  if (!/immutable/.test(r.headers.get('cache-control') ?? '')) fails.push(`${u}: cache-control ${r.headers.get('cache-control')}`);
}
```

  Further down, a block about `/es` already checks `katagami-sans-ext.woff2?v=`, and another asks for
  `/fonts/katagami-sans-site.woff2` without `?v=` to check its `Vary` header. Leave both as they are.

- `scripts/verify-build.mjs`, the release guard that `pnpm build` runs. Its imports (`:9-13`), its error list and
  `exists` helper (`:17-26`), the `/ex/` content-address check (`:145-146`) and the loop that resolves every local
  reference of a page (`:154-160`):

```js
import fs from 'node:fs';
import path from 'node:path';
import { scanBuffer } from './rules.mjs';
import { PHONE } from './phone-memory.mjs';
import { LOCALES, OTHER } from '../src/i18n/locales.mjs';
```
```js
const exists = (p) => {
  const clean = decodeURIComponent(p.split(/[?#]/)[0]);
  const f = path.join(DIST, clean);
  return fs.existsSync(f) && fs.statSync(f).isFile() || fs.existsSync(f + '.html') || fs.existsSync(path.join(f, 'index.html'));
};
```
```js
  // each stylesheet and deferred script a page names under /ex/ carries its content address (vercel.json caches it)
  for (const m of html.matchAll(/\s(?:href|src)="(\/ex\/[^"]+\.(?:css|js))"/g)) fail(page, `${m[1]} has no ?v= content address`);
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

- The card markup (round code under `public/ex`, never edited here) already names some drawings with `?v=`.
  Measured on the build of `4025230`, over `/`, `/es`, `/battle`, two card pages and `/ja/cards/atlas`:
  - `borders/<id>/…/*.svg?v=` and `fx/<id>/fx.svg?v=`: the token IS the first 8 hex of the served file's sha-256
    (163 of 163 and 15 of 15 references match). Example: `fx/turboslide/fx.svg?v=d238c1ac`.
  - `design/…/*.svg?v=`: the token is NOT the file's hash (0 of 198 match; it is the hash of another file the
    drawing was made from). These must NOT be cached for a year.
  - Every other picture (`posters/`, `media/`) has a plain address.

- The battle page's own faces live under `/battle/vendor/fonts/` and are not part of this plan
  (`src/components/BattlePage.astro` names the translated `/fonts/` faces through `versioned()` already).

- `docs/performance.md:12-13` (the rows "The face" and "Content addresses") and `docs/deploy.md:31-33` (the
  "Caching" bullet) describe these rules and must stay true.

Repo rules that apply (from `AGENTS.md`): `public/ex`, `public/battle`, `public/sound`, `public/og` and `vendor/` are
synced and never edited by hand (this plan edits none of them); nothing pops (the face still blocks and is still
preloaded first, so first paint does not change; your reviewer records the paint before and after, you do not);
append an entry to `memory.md`; never deploy.

## Commands you will need

Run all of them in `~/repos/kevinliu-studio-p2a`. Dependencies are already installed there.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build and release guard | `pnpm build` | last line starts `verify-build: 256 pages, 248 sitemap URLs,` and ends `all checks pass` |
| Tests | `pnpm test` | `fail 0` |
| The faces' hashes | `for f in sans mono; do shasum -a 256 public/fonts/katagami-$f-site.woff2 \| cut -c1-10; done` | `8254e26517` and `9fade4c28f` (in the table `\|` stands for a plain `|`) |
| JSON is valid | `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` | exit 0, no output |
| The negotiation rules still hold | `node scripts/check-negotiation.mjs` | exit 0 |

zsh on macOS: no `timeout`; use `/usr/bin/grep`; never name a shell variable `path`. Do not start a server or a
browser, do not run `scripts/smoke.mjs` (it needs a deployment) and do not run `pnpm check` (broken until plan 020).

## Scope

**In scope** (the only files you should modify):
- `src/layouts/Base.astro` (the four places named in step 1)
- `src/styles/machine.css` (the `@font-face` line and the comment above it)
- `vercel.json` (two of the four cache lines quoted above)
- `scripts/cache-rules.test.mjs` (create)
- `scripts/smoke.mjs` (the one block quoted above)
- `scripts/verify-build.mjs` (one import, one helper, two checks, one sentence in the header comment)
- `docs/performance.md` (rows "The face" and "Content addresses"), `docs/deploy.md` (the "Caching" bullet)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- Anything under `public/` or `vendor/`, `scripts/sync.mjs`, `scripts/i18n-fonts.py`, `src/i18n/`. The fonts
  themselves are not rebuilt or renamed.
- Hashing the plain picture addresses (`posters/…`, `media/…/cast.webp`). They are also built at runtime by round
  code; hashing them is deferred. They keep one day of cache.
- `design/` drawings: their `?v=` is not their own hash, so they keep one day of cache.
- The battle page's faces (`/battle/vendor/fonts/`), `src/components/BattlePage.astro`.
- `font-display: block`, the preload order and the Arial fallback metrics: decided (`docs/performance.md`).
- Every other route in `vercel.json`, and `scripts/check-negotiation.mjs`.

## Git workflow

- Work in the existing worktree `~/repos/kevinliu-studio-p2a` on branch `improve/p2-checks`. Do not create a branch
  or a worktree. Never edit another checkout. Never `git stash`.
- One commit for this plan, by explicit path, as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message: `perf(cache): the faces by content address; a year only for addresses that hold their content`, a blank
  line, one or two sentences of body, a blank line, then `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Do NOT push, open a PR or deploy.

## Steps

Every code block of steps 3 to 5 also exists as a file, byte for byte, in
`~/k7-rescue/improve-audit/lane-a/p012/`. Copy from those files rather than retyping.

### Step 1: Give both faces their content address in `Base.astro`

1. Replace the line `const FONT = '/fonts/katagami-sans-site.woff2';` with two lines:

```astro
const FONT = versioned('/fonts/katagami-sans-site.woff2');
const MONO = versioned('/fonts/katagami-mono-site.woff2');
```

2. Add the Mono face to the `fontFace` list, as a fourth entry after the two fallback entries and before `].join('')`:

```astro
  `@font-face{font-family:"Katagami Mono";src:url(${MONO}) format("woff2");font-weight:100 700;font-display:block}`,
```

3. Put the Mono address on the root element so the inline script can read it. The `<html` line becomes:

```astro
<html lang={l.lang} data-mode="human" data-mono={MONO} {...html}>
```

4. In the one-line inline script that begins `<script is:inline>(function(){var d=document.documentElement,q=new URLSearchParams`,
   replace the one occurrence of

```js
l.href='/fonts/katagami-mono-site.woff2';
```

   with

```js
l.href=d.dataset.mono;
```

   (`d` is already `document.documentElement` in that script. A preload must name exactly the address the
   `@font-face` rule names, or the browser fetches the file twice.) Change nothing else on that line.

The preload line (`<link rel="preload" href={FONT} …>`) and the `kface` style line need no edit: they print `FONT`
and `fontFace`.

**Verify**: `/usr/bin/grep -c "katagami-mono-site.woff2" src/layouts/Base.astro` → `1` (only the `versioned(...)` call).
**Verify**: `/usr/bin/grep -c "l.href=d.dataset.mono" src/layouts/Base.astro` → `1`.

### Step 2: Remove the Mono rule from the bundled stylesheet

In `src/styles/machine.css`, delete the whole `@font-face { font-family: 'Katagami Mono'; … }` line. Keep the
`:root { --mono: … }` line below it. In the comment block right above (it ends `… so no text reflows when it
lands. */`), insert this sentence before the closing `*/`, on the comment's last line:
`Its @font-face rule is in Base.astro's inline style, where the file is named by content address.`

**Verify**: `/usr/bin/grep -c '@font-face' src/styles/machine.css` → `1` (the word inside the comment only), and
`/usr/bin/grep -c 'fonts/' src/styles/machine.css` → `0`.

### Step 3: Cache rules: a year only for an address that holds its content

In `vercel.json`:

1. Replace the line that begins `{ "src": "^/(?:_astro|fonts)/.*$"` with these two lines
   (`p012/routes-fonts.json.txt`):

```json
    { "src": "^/_astro/.*$", "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
    { "src": "^/fonts/.*$", "has": [{ "type": "query", "key": "v" }], "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
```

2. Replace the media line (the one that begins `{ "src": "^/(?:ex|battle|sound|og|share)/.*\\.(?:webp|avif|` and
   sets `max-age=86400`) with these three lines (`p012/routes-media.json.txt`). The first is the old rule minus the
   frame and effect drawings; the other two give those drawings a day without `?v=` and a year with it, so every
   address meets exactly one cache rule and nothing depends on the order of the routes:

```json
    { "src": "^/(?!ex/(?:borders|fx)/.*\\.svg$)(?:ex|battle|sound|og|share)/.*\\.(?:webp|avif|png|jpg|svg|mp4|webm|m4a|woff2)$", "continue": true, "headers": { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
    { "src": "^/ex/(?:borders|fx)/.*\\.svg$", "missing": [{ "type": "query", "key": "v" }], "continue": true, "headers": { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
    { "src": "^/ex/(?:borders|fx)/.*\\.svg$", "has": [{ "type": "query", "key": "v" }], "continue": true, "headers": { "Cache-Control": "public, max-age=31536000, immutable" } },
```

   `~/k7-rescue/improve-audit/lane-a/p012/vercel.json` is the whole file after both edits; your `vercel.json` must
   be byte-identical to it (`cmp vercel.json ~/k7-rescue/improve-audit/lane-a/p012/vercel.json`).

3. Create `scripts/cache-rules.test.mjs` as a copy of `p012/cache-rules.test.mjs`:

```js
// vercel.json's cache rules, read without a deployment: a file is kept for a year only when its address holds its
// content (docs/performance.md, Content addresses). Each address below must meet exactly one cache rule, so the
// answer never depends on the order of the routes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const { routes } = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../vercel.json'), 'utf8'));
const YEAR = 'public, max-age=31536000, immutable', DAY = 'public, max-age=86400, stale-while-revalidate=604800';
const isV = (c) => c.type === 'query' && c.key === 'v';
// every Cache-Control a request for `p` meets, with or without ?v=
function cache(p, v) {
  return routes.filter((r) => {
    if (!r.continue || !r.headers?.['Cache-Control'] || !new RegExp(r.src).test(p)) return false;
    for (const c of [...(r.has ?? []), ...(r.missing ?? [])]) assert.ok(isV(c), `${r.src}: this test only reads conditions on the query key v`);
    return (r.has ?? []).every(() => v) && (r.missing ?? []).every(() => !v);
  }).map((r) => r.headers['Cache-Control']);
}

test('a year only for an address that holds its content', () => {
  const cases = [
    ['/_astro/Base.Jy14gAa_.css', false, YEAR],
    ['/fonts/katagami-sans-site.woff2', true, YEAR],
    ['/fonts/katagami-mono-site.woff2', true, YEAR],
    ['/fonts/katagami-cjk-ja.woff2', true, YEAR],
    ['/ex/ui.css', true, YEAR],
    ['/battle/shared/battle.js', true, YEAR],
    ['/es/gallery.js', true, YEAR],
    ['/ex/fx/turboslide/fx.svg', true, YEAR],
    ['/ex/borders/turboslide/frames/dir-a/border.svg', true, YEAR],
    ['/ex/fx/turboslide/fx.svg', false, DAY],
    ['/ex/borders/turboslide/frames/dir-a/border.svg', false, DAY],
    // a design drawing's ?v= is another file's hash, so it never gets the year
    ['/ex/design/lit/katagami.svg', true, DAY],
    ['/ex/design/lit/katagami.svg', false, DAY],
    ['/ex/posters/elo.webp', false, DAY],
    ['/ex/fx/turboslide/fx.webp', true, DAY],
    ['/og/home.jpg', false, DAY],
    ['/battle/vendor/fonts/katagami-sans-battle.woff2', false, DAY],
    ['/sound/out/card.flip.webm', false, DAY],
  ];
  for (const [p, v, want] of cases) assert.deepEqual(cache(p, v), [want], `${p}${v ? '?v=…' : ''}`);
});
test('a face, stylesheet or script asked for without its content address is not kept', () => {
  for (const p of ['/fonts/katagami-sans-site.woff2', '/fonts/katagami-mono-site.woff2', '/ex/ui.css', '/battle/shared/battle.js', '/es/gallery.js']) assert.deepEqual(cache(p, false), [], p);
  for (const p of ['/', '/about', '/cards/elo', '/about.md', '/llms.txt', '/sitemap-index.xml']) assert.deepEqual(cache(p, false), [], p);
});
```

**Verify**: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` → exit 0, and the `cmp` above
prints nothing.
**Verify**: `pnpm test` → 2 more passing tests than before this plan (15 if plan 011 is the commit before), `fail 0`.
**Verify** (the test fails on the old rules): `git show 4025230:vercel.json > ~/k7-rescue/improve-audit/lane-a/p012/old/vercel.json`
after `mkdir -p ~/k7-rescue/improve-audit/lane-a/p012/old/scripts && cp scripts/cache-rules.test.mjs ~/k7-rescue/improve-audit/lane-a/p012/old/scripts/`,
then `(cd ~/k7-rescue/improve-audit/lane-a/p012/old && node --test scripts/cache-rules.test.mjs)` → both tests fail.
**Verify**: `node scripts/check-negotiation.mjs` → exit 0 (the negotiation routes were not touched).

### Step 4: Make the guard hold faces and drawings to their content addresses

In `scripts/verify-build.mjs`:

1. Add the import above the existing `import fs from 'node:fs';` line:

```js
import { createHash } from 'node:crypto';
```

2. Directly after the `exists` helper (after its closing `};`), add (`p012/guard-helper.js.txt`):

```js
// sha-256 of a dist file, read once
const hashes = new Map();
const sha256 = (f) => hashes.get(f) ?? hashes.set(f, createHash('sha256').update(fs.readFileSync(f)).digest('hex')).get(f);
```

3. Directly after the line that ends ``fail(page, `${m[1]} has no ?v= content address`);`` (the `/ex/` check quoted
   in "Current state"), add (`p012/guard-face.js.txt`):

```js
  // a face under /fonts is kept for a year only when it is named with its ?v= content address (vercel.json); named
  // without it, it would be fetched again on every visit, and the face blocks text
  for (const m of html.matchAll(/(?<![\w.-])\/fonts\/[\w-]+\.woff2(?!\?v=[0-9a-f])/g)) fail(page, `${m[0]} is named without its ?v= content address`);
```

4. In the reference loop, directly after the line
   ``if (!exists(abs)) fail(page, `broken reference ${u} (resolves to ${abs})`);`` and before the loop's closing `}`,
   add (`p012/guard-hash.js.txt`):

```js
    // a face under /fonts, and a frame or effect drawing under /ex/borders or /ex/fx, named with ?v= is kept for a
    // year (vercel.json), so the token must be the served file's own sha-256: a changed file then always gets a new address
    const v = /^\/fonts\/|^\/ex\/(?:borders|fx)\/.*\.svg$/.test(abs) ? /[?&]v=([0-9a-f]+)/.exec(u)?.[1] : null;
    if (v && exists(abs) && !sha256(path.join(DIST, abs)).startsWith(v)) fail(page, `${abs}?v=${v} is not the file's sha-256, and it is kept for a year`);
```

5. Extend the comment block at the top of the file with one sentence at its end (after `(a phone's tab stays under
   its memory limit).`): `A face under /fonts is named with ?v=, and that token, like a /ex/borders or /ex/fx
   drawing's, is the file's own sha-256 (they are kept for a year).` Keep the comment's `//` line style and line
   length.

**Verify**: `node --check scripts/verify-build.mjs` → exit 0.
**Verify** (the new face check sees today's unversioned faces): if `dist/` still holds a build from before step 1,
`node scripts/verify-build.mjs | /usr/bin/grep -c 'named without its ?v= content address'` → a number above 0. If
`dist/` is missing or already rebuilt, skip this check and say so.

### Step 5: Update the smoke check

In `scripts/smoke.mjs`, replace the seven-line block quoted in "Current state" (from the comment `// the
stylesheets, scripts and face a page names by content address are kept for a year (vercel.json)` through the closing
`}` of its `for` loop) with (`p012/smoke-block.js.txt`):

```js
// what a page names by content address is kept for a year (vercel.json): its stylesheets and scripts, both faces, and
// the frame and effect drawings whose ?v= is their own hash; the same face or drawing asked for without ?v= is not
const { text: home } = await get('/');
const border = home.match(/borders\/[\w/-]+\.svg\?v=[0-9a-f]+/)?.[0];
for (const u of [home.match(/\/ex\/ui\.css\?v=[0-9a-f]+/)?.[0], home.match(/\/fonts\/katagami-sans-site\.woff2\?v=[0-9a-f]+/)?.[0], home.match(/\/fonts\/katagami-mono-site\.woff2\?v=[0-9a-f]+/)?.[0], border && `/ex/${border}`]) {
  if (!u) { fails.push('/: no versioned /ex/ui.css, face, Machine face or border drawing'); continue; }
  const { r } = await get(u);
  if (r.status !== 200 || !/immutable/.test(r.headers.get('cache-control') ?? '')) fails.push(`${u}: ${r.status} cache-control ${r.headers.get('cache-control')}`);
}
for (const u of ['/fonts/katagami-sans-site.woff2', border && `/ex/${border.split('?')[0]}`]) {
  if (!u) continue;
  const { r } = await get(u);
  if (r.status !== 200 || /immutable/.test(r.headers.get('cache-control') ?? '')) fails.push(`${u} without ?v=: ${r.status} cache-control ${r.headers.get('cache-control')}, expected 200 and no immutable`);
}
```

**Verify**: `node --check scripts/smoke.mjs` → exit 0.

### Step 6: Build and check the pages

Run `pnpm build`.

**Verify**: the last line ends `all checks pass`.
**Verify** (both faces carry their hash, on a room page, a prose page, a translated page and the 404):

```
for f in dist/index.html dist/about.html dist/es/about.html dist/404.html; do echo "$f: $(/usr/bin/grep -o 'katagami-[a-z]*-site\.woff2[^")<> ]\{0,13\}' $f | sort -u | tr '\n' ' ')"; done
```

→ each line lists exactly `katagami-mono-site.woff2?v=9fade4c28f katagami-sans-site.woff2?v=8254e26517`.

**Verify**: `/usr/bin/grep -c 'fonts/' dist/_astro/*.css` → `0` for every stylesheet listed (the Mono rule left the bundle).
**Verify**: `/usr/bin/grep -o '<link rel="preload"[^>]*>' dist/about.html` → one line whose `href` is the Sans address with `?v=`.
**Verify**: `/usr/bin/grep -c 'l.href=d.dataset.mono' dist/about.html` → `1`, and
`/usr/bin/grep -o '<html[^>]*>' dist/about.html` contains `data-mono="/fonts/katagami-mono-site.woff2?v=9fade4c28f"`.
**Verify** (the guard's hash check fails when a token is wrong; one built file is changed and put back):

```
B=~/k7-rescue/improve-audit/lane-a/p012/index.html.bak && cp dist/index.html "$B" && sed -i '' 's/fx\.svg?v=\([0-9a-f]\)/fx.svg?v=0\1/' dist/index.html && node scripts/verify-build.mjs | /usr/bin/grep -m2 "is not the file's sha-256"; cp "$B" dist/index.html && node scripts/verify-build.mjs | tail -1
```

→ at least one line naming `is not the file's sha-256`, then, after the file is put back, a last line ending
`all checks pass`.

### Step 7: Keep the docs true, record and commit

1. In `docs/performance.md`, row "The face": replace `preloaded first on every page, cached for a year.` with
   `preloaded first on every page, named by content address (`?v=`) and cached for a year.`

2. In `docs/performance.md`, row "Content addresses": replace its last cell

```
Every stylesheet and script a page names (`/ex/`, `/sound/`, `/battle/`) carries `?v=<hash>` and is `immutable` for a year; the files the rounds' own scripts load keep plain addresses and revalidate. The guard fails on an unversioned `/ex/` reference; the smoke test checks the header. |
```

   with

```
Every stylesheet and script a page names (`/ex/`, `/sound/`, `/battle/`) and every face under `/fonts/` carries `?v=<hash>` and is `immutable` for a year; so are the frame and effect drawings under `/ex/borders/` and `/ex/fx/`, whose `?v=` the rounds write as the file's own sha-256. A face or drawing asked for without `?v=`, the `design/` drawings (their `?v=` is another file's hash), every plain picture address and the files the rounds' own scripts load revalidate or keep a day. The guard fails on an unversioned `/ex/` or `/fonts/` reference and on a face or drawing whose `?v=` is not its hash; `scripts/cache-rules.test.mjs` reads the rules in `vercel.json`; the smoke test checks the headers. |
```

3. In `docs/deploy.md`, the "Caching" bullet: replace `` `_astro/` and `fonts/` are immutable; `` with
   `` `_astro/` is immutable, and so is a `fonts/` file asked for with `?v=`; `` and, directly after
   `` is immutable too; ``, insert `` the `/ex/borders/` and `/ex/fx/` drawings asked for with `?v=` are immutable as well (`scripts/cache-rules.test.mjs`); ``.

4. Append an entry to the end of `memory.md` in the file's existing shape (a `## 2026-11-10: <title>
   (improve/p2-checks, plan 012)` heading, then `- **Type**:`, `- **Changed**:`, `- **Checked**:`, `- **Open**:`
   bullets). Under Open write: "not deployed: the smoke check of the cache headers
   (`node scripts/smoke.mjs <preview>`) has not run, so Vercel's handling of the `missing` condition is unproven on
   a deployment; the plain picture addresses (`posters/`, `media/`) still keep a day and are not hashed; `design/`
   drawings carry a `?v=` that is not their own hash (a rounds matter); returning visitors fetch each face once
   more after this ships".

Commit by explicit path (the nine files in "In scope") with the message in "Git workflow".

**Verify**: `git status --short` → empty. `git show --stat --format=%ae HEAD` lists exactly the nine files.

### Operator step (not yours): the preview check

A Vercel preview needs Kevin's yes. Whoever deploys the branch runs `node scripts/smoke.mjs <preview-url>` as
`docs/deploy.md` describes. If it reports a border drawing or a face with the wrong `cache-control`, the route
conditions did not behave on Vercel as the schema says: report the header it printed before changing anything.

## Test plan

- New tests: `scripts/cache-rules.test.mjs`, in `pnpm test`. It evaluates `vercel.json`'s cache routes for 18
  addresses with and without `?v=` and requires exactly one matching rule each (a year, or a day), then requires
  that a face, stylesheet or script without `?v=`, and a page, meet no cache rule at all. Step 3 shows it fails on
  the old rules.
- The guard (`scripts/verify-build.mjs`) gains two checks: a face named without `?v=` (seen failing on the old
  build in step 4), and a `?v=` that is not the file's hash (seen failing on a changed copy in step 6).
- `scripts/smoke.mjs` checks the real headers on a deployment (operator step).
- Verification: `pnpm test` and `pnpm build` pass; the step 6 loop shows both faces with `?v=` on four pages.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm build` ends with `all checks pass`
- [ ] `pnpm test` → 0 fail, with the 2 new cache-rule tests
- [ ] the step 6 loop prints both `katagami-mono-site.woff2?v=9fade4c28f` and `katagami-sans-site.woff2?v=8254e26517` for all four pages, and no address without `?v=`
- [ ] `/usr/bin/grep -c 'fonts/' dist/_astro/*.css` reports `0` for every file
- [ ] `/usr/bin/grep -c 'fonts/' src/styles/machine.css` → `0`
- [ ] `cmp vercel.json ~/k7-rescue/improve-audit/lane-a/p012/vercel.json` prints nothing
- [ ] the step 6 negative check names `is not the file's sha-256`, and the guard passes again once the file is back
- [ ] `node --check scripts/smoke.mjs` and `node scripts/check-negotiation.mjs` exit 0
- [ ] `git diff --name-only HEAD~1..HEAD -- public vendor` prints nothing
- [ ] `git diff --name-only HEAD~1..HEAD` lists only the nine files in "In scope"

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt in "Current state" does not match the live file.
- After the build, a page still names a face without `?v=`, or names the Mono face with two different addresses.
- `pnpm build` fails with `is not the file's sha-256` on the real build: a `borders/` or `fx/` token no longer
  matches its file. Do not weaken the check; report the files it names.
- `pnpm build` fails with `named without its ?v= content address` on a page this plan did not expect (for example
  a battle page): report the page and the address; do not loosen the pattern.
- You have reason to think first paint changed (for example the build prints a face in a different order in
  `<head>`). Report it; your reviewer records the paint.
- You are asked to deploy or push.

## Maintenance notes

- After the Sans or Mono subset is rebuilt, nothing else is needed: the build recomputes the hash and every page
  names the new address.
- Returning visitors fetch each face once more after this ships (their cached copy is under the old plain address).
- `data-mono` on `<html>` exists only so the head script can preload the Machine face under the same address the
  `@font-face` rule names. If the script is ever rewritten, keep those two addresses identical.
- A new cache route in `vercel.json` needs a case in `scripts/cache-rules.test.mjs`; the test requires that each
  address meets exactly one cache rule, so two rules that overlap fail it.
- If the rounds start writing content hashes on `design/` drawings or on pictures, widen the `vercel.json` routes
  and the guard's pattern together, never one without the other.
- Deferred: hashing `posters/` and `media/` addresses (they are also built at runtime by `gallery.js` and
  `rituals.js`, so it needs a sync transform as well as a build step). Until then a re-cut picture can sit behind
  yesterday's cached file for up to a day.
- A reviewer should check that no page names a face twice with different addresses, and should read the preview
  smoke output before the branch reaches `main`.
