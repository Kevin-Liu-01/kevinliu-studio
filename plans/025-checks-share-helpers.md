# Plan 025: The guard, the smoke check and the SEO check share one JPEG reader, one share-tag check and one HTTP helper

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- scripts/verify-build.mjs scripts/check-seo.mjs scripts/smoke.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Plans 001 and 004 edit other lines
> of `scripts/verify-build.mjs` and `scripts/smoke.mjs`: line numbers may have
> moved, but every excerpt below must still be found, whole, by its text.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (it shares files with plans 001 and 004; land after them if they are queued)
- **Category**: tech-debt
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Three scripts check the same things in separate copies. The release guard (`scripts/verify-build.mjs`, on the built
files) and the SEO check (`scripts/check-seo.mjs`, over HTTP) each carry an identical `jpegSize` function, each
re-implement the share-tag checks, and each hard-code `31` as the least number of sitemap pages. The copies have
already drifted in small ways that bite:

- `scripts/smoke.mjs` can reach a protected preview with either of two tokens; `scripts/check-seo.mjs` knows only
  one, so the same preview passes one script and returns sign-in pages to the other.
- `scripts/check-seo.mjs` reads `sitemap-0.xml` directly, never the index a crawler starts from.
- `scripts/check-seo.mjs` follows redirects automatically while sending the preview's access token as a custom
  header. If a site link ever redirected to another host, the token would go with it.
- `scripts/smoke.mjs` accepts any redirect whose target merely *ends with* the expected path. For `/index` and
  `/en`, expected to go to `/`, any address ending in `/` passes.

After this plan the shared pieces live in `scripts/lib/`, the three scripts import them, and those four gaps are
closed. The advisor applied exactly these edits to scratch copies on 2026-11-09: the guard still printed
`all checks pass`, the smoke check still passed against production, and the SEO check printed the same line as before
against a local serve.

## Current state

- `scripts/verify-build.mjs` — the release guard; `pnpm build` runs it on `dist/`.
- `scripts/check-seo.mjs` — run by hand against a deployment or a local serve:
  `node scripts/check-seo.mjs <base-url> [--external]`.
- `scripts/smoke.mjs` — run by hand against a deployment: `node scripts/smoke.mjs <base-url>`. It needs the
  redirects in `vercel.json`, so it cannot pass against a local serve.
- There is no `scripts/lib/` folder yet.

The duplicated JPEG reader, identical in both files (`scripts/verify-build.mjs:46-55` under the comment
`// width and height from a JPEG's start-of-frame marker`, and `scripts/check-seo.mjs:39-48`):

```js
function jpegSize(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
}
```

The share-tag checks, once in each:

```js
// scripts/verify-build.mjs:105-107
  if (meta('twitter:card') !== 'summary_large_image') fail(page, 'twitter:card is not summary_large_image');
  if (meta('twitter:image') !== meta('og:image')) fail(page, 'twitter:image differs from og:image');
  for (const k of ['og:image:alt', 'twitter:image:alt', 'og:title', 'og:description']) if (!meta(k)?.trim()) fail(page, `no ${k}`);
```

```js
// scripts/check-seo.mjs:59-65
  const meta = (k) => html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]*)"`))?.[1];
  const image = meta('og:image');
  if (!image) { fails.push(`${p}: no og:image`); continue; }
  for (const k of ['og:image:alt', 'twitter:image:alt']) if (!meta(k)?.trim()) fails.push(`${p}: no ${k}`);
  if (meta('twitter:card') !== 'summary_large_image') fails.push(`${p}: twitter:card ${meta('twitter:card')}`);
  if (meta('twitter:image') !== image) fails.push(`${p}: twitter:image is not og:image`);
  const ir = await fetch(local(image), { headers: bypass });
```

The sitemap count, twice: `scripts/verify-build.mjs:174` (`if (listed.length < 31) fail('sitemap', ...)`) and
`scripts/check-seo.mjs:52` (`if (pages.length < 31) fails.push(...)`).

How each script reaches a protected preview:

```js
// scripts/smoke.mjs:6-11
// a protected preview needs VERCEL_AUTOMATION_BYPASS_SECRET, or VERCEL_OIDC_TOKEN from `vercel project token
// kevinliu-studio` (short-lived, nothing to store); production URLs need neither
const env = process.env;
const bypass = env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': env.VERCEL_AUTOMATION_BYPASS_SECRET }
  : env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': env.VERCEL_OIDC_TOKEN } : {};
const get = async (path, headers = {}) => { const r = await fetch(base + path, { headers: { ...bypass, ...headers }, redirect: 'manual' }); return { r, text: r.status === 200 ? await r.text() : '' }; };
```

```js
// scripts/check-seo.mjs:16-17
const env = process.env;
const bypass = env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': env.VERCEL_OIDC_TOKEN } : {};
```

The SEO check's link fetch (follows redirects with the token attached) and its sitemap read:

```js
// scripts/check-seo.mjs:23-31
async function status(u, headers = {}) {
  if (seen.has(u)) return seen.get(u);
  const ours = u.startsWith(base);
  const p = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'text/html,*/*', ...(ours ? bypass : {}), ...headers }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
        await r.body?.cancel();
        return { code: r.status, at: r.url };
```

```js
// scripts/check-seo.mjs:50-52
const sitemap = await (await fetch(`${base}/sitemap-0.xml`, { headers: bypass })).text();
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(SITE.length) || '/');
if (pages.length < 31) fails.push(`sitemap lists ${pages.length} pages`);
```

The smoke check's loose redirect comparison:

```js
// scripts/smoke.mjs:33-37
for (const [p, to] of [['/about/', '/about'], ['/index', '/'], ['/about.html', '/about'], ['/en', '/'], ['/kevin_liu_resume_25.pdf', 'https://portfoliomon.kevinliu.studio/kevin_liu_resume_25.pdf']]) {
  const { r } = await get(p);
  const at = r.headers.get('location') ?? '';
  if (![301, 308].includes(r.status) || !(at === to || at.endsWith(to) && to.startsWith('/'))) fails.push(`${p}: ${r.status} to ${at}, expected a redirect to ${to}`);
}
```

On production today those five redirects answer 308 with `Location` values `/about`, `/`, `/about`, `/` and the
full portfoliomon address, so an exact comparison passes.

Conventions: ES modules, two-space indent, single quotes, semicolons, comments that say why in plain words. The
pattern for a small shared module is `scripts/location.mjs` (named exports, a header comment that says who uses it).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Syntax | `for f in scripts/*.mjs scripts/lib/*.mjs; do node --check "$f" \|\| echo "BAD $f"; done` | no output |
| Build and release guard | `pnpm build` | last line ends `all checks pass` |
| Local serve of `dist` | `pnpm preview --port 4392 --host 127.0.0.1` (leave running in another shell) | serves `http://127.0.0.1:4392` |
| Stop the serve | `pnpm exec astro preview stop` | `Stopped preview server` |
| SEO check on the serve | `node scripts/check-seo.mjs http://127.0.0.1:4392` | `check-seo: 32 pages, 63 links on the site: share images, JSON-LD, twins and links pass` (the link count may differ) |
| Smoke check on production | `node scripts/smoke.mjs https://www.kevinliu.studio` | `smoke: https://www.kevinliu.studio passes` |

(In the table `\|\|` stands for a plain `||`.) The smoke check only reads public pages of the live site, about 40
requests. It cannot run against the local serve: the redirects it tests come from `vercel.json`.

## Scope

**In scope** (the only files you should modify):
- `scripts/lib/checks.mjs` (create)
- `scripts/lib/http.mjs` (create)
- `scripts/verify-build.mjs`
- `scripts/check-seo.mjs`
- `scripts/smoke.mjs`
- `scripts/SKILL.md` (one line)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- What the scripts check: no new rule, no rule removed, no message reworded, except the two SEO-check messages that
  become the guard's wording (step 4) and the stricter redirect comparison (step 5).
- `scripts/machine-check.mjs`, `scripts/paint-capture.mjs`, `scripts/memory/*`: local tools with their own setups.
- `scripts/sync.mjs`, `scripts/phone-memory.mjs`, `scripts/location.mjs`.
- `vercel.json` and anything under `src/`, `public/`, `vendor/`.
- Sending any request to a URL other than the local serve and `https://www.kevinliu.studio`.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/025-checks-share-helpers`, cut from
  `origin/main` (or from where plans 001 and 004 landed, if the operator says so):
  `git -C ~/repos/kevinliu-studio fetch origin && git -C ~/repos/kevinliu-studio worktree add -b improve/025-checks-share-helpers ~/repos/kevinliu-studio-025 origin/main`.
  Never edit the main checkout at `~/repos/kevinliu-studio`. Never use `git stash`.
- Commit by explicit path, as the GitHub noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`. For this plan:
  `refactor(checks): one JPEG reader, share-tag check and HTTP helper for the guard and the deployed checks`.
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Set up and record the baseline of all three scripts

Create the worktree, `cd` into it, install, build. Start the local serve in a second shell and note that you
started it (you must stop it in step 6).

**Verify**: `pnpm install --frozen-lockfile` → exit 0.
**Verify**: `pnpm build` → last line ends `all checks pass`. Save that line.
**Verify**: `node scripts/check-seo.mjs http://127.0.0.1:4392 > "$TMPDIR/seo-before.txt" 2>&1; echo "exit $?"; cat "$TMPDIR/seo-before.txt"`
→ `exit 0` and a line starting `check-seo: 32 pages,`.
**Verify**: `node scripts/smoke.mjs https://www.kevinliu.studio > "$TMPDIR/smoke-before.txt" 2>&1; echo "exit $?"; cat "$TMPDIR/smoke-before.txt"`
→ note the exit code and the output. Expected: `exit 0`, `smoke: https://www.kevinliu.studio passes`. If plan 004
has landed on your branch but is not deployed yet, this may print failures for the cases 004 added; that is allowed,
and step 5 then expects the same lines again, no more and no fewer.

### Step 2: Create `scripts/lib/checks.mjs`

Create the folder `scripts/lib/` and the file with exactly this content:

```js
// Checks the release guard (verify-build.mjs, on dist) and the deployed checks (check-seo.mjs, smoke.mjs, over HTTP)
// both make, kept in one place so they cannot drift.

// the least number of pages the sitemap lists: home, /cards, /about, the two battle pages and the 26 cards
export const SITEMAP_MIN = 31;

// width and height from a JPEG's start-of-frame marker, or null when the bytes are not a JPEG
export function jpegSize(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) return null;
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
}

// a page's <meta property|name="k" content="...">
export const metaOf = (html) => (k) => html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]*)"`))?.[1];

// what is wrong with a page's share tags: [] when nothing is
export function shareTagProblems(html) {
  const meta = metaOf(html), out = [];
  if (meta('twitter:card') !== 'summary_large_image') out.push('twitter:card is not summary_large_image');
  if (meta('twitter:image') !== meta('og:image')) out.push('twitter:image differs from og:image');
  for (const k of ['og:image:alt', 'twitter:image:alt', 'og:title', 'og:description']) if (!meta(k)?.trim()) out.push(`no ${k}`);
  return out;
}
```

**Verify**: `node -e "import('./scripts/lib/checks.mjs').then(m=>{const fs=require('fs');console.log(Object.keys(m).sort().join(','), m.jpegSize(fs.readFileSync('public/og/home.jpg')).join('x'), m.jpegSize(Buffer.from('nope')), m.shareTagProblems(fs.readFileSync('dist/about.html','utf8')).length, m.shareTagProblems('<html></html>').length)})"`
→ `SITEMAP_MIN,jpegSize,metaOf,shareTagProblems 1200x630 null 0 5`

### Step 3: Create `scripts/lib/http.mjs`

Create the file with exactly this content:

```js
// How the deployed checks ask a deployment for a page. A protected preview needs VERCEL_AUTOMATION_BYPASS_SECRET, or
// VERCEL_OIDC_TOKEN from `vercel project token kevinliu-studio` (short-lived, nothing to store); production needs neither.
export function bypassHeaders(env = process.env) {
  return env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': env.VERCEL_AUTOMATION_BYPASS_SECRET }
    : env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': env.VERCEL_OIDC_TOKEN } : {};
}

// One request, redirects not followed. The bypass headers go only to `base`'s own origin.
export function get(base, url, headers = {}, init = {}) {
  const ours = new URL(url).origin === new URL(base).origin;
  return fetch(url, { ...init, headers: { ...(ours ? bypassHeaders() : {}), ...headers }, redirect: 'manual' });
}

// Follows redirects by hand (five at most), so a redirect that leaves `base` never carries the bypass headers with it.
export async function follow(base, url, headers = {}, init = {}) {
  let r;
  for (let hop = 0; hop < 6; hop++) {
    r = await get(base, url, headers, init);
    const to = r.status >= 300 && r.status < 400 ? r.headers.get('location') : null;
    if (!to) return { r, url };
    await r.body?.cancel();
    url = new URL(to, url).href;
  }
  return { r, url };
}
```

**Verify**: `node -e "import('./scripts/lib/http.mjs').then(m=>console.log(JSON.stringify([m.bypassHeaders({}), Object.keys(m.bypassHeaders({VERCEL_OIDC_TOKEN:'t'})), Object.keys(m.bypassHeaders({VERCEL_AUTOMATION_BYPASS_SECRET:'s',VERCEL_OIDC_TOKEN:'t'}))])))"`
→ `[{},["x-vercel-trusted-oidc-idp-token"],["x-vercel-protection-bypass"]]`

### Step 4: Use them in the guard and the SEO check

In `scripts/verify-build.mjs`:

1. After the line `import { PHONE } from './phone-memory.mjs';` add:
   `import { jpegSize, shareTagProblems, SITEMAP_MIN } from './lib/checks.mjs';`
2. Delete the comment line `// width and height from a JPEG's start-of-frame marker` and the whole `jpegSize`
   function under it.
3. Replace the three share-tag lines (105-107, shown under "Current state") with one line:
   `  for (const why of shareTagProblems(html)) fail(page, why);`
4. In `if (listed.length < 31) fail('sitemap', ...)` replace `31` with `SITEMAP_MIN`.

In `scripts/check-seo.mjs`:

1. Directly above the line `const base = (process.argv[2] ?? '').replace(/\/$/, '');` add:

```js
import { jpegSize, metaOf, shareTagProblems, SITEMAP_MIN } from './lib/checks.mjs';
import { get, follow } from './lib/http.mjs';

```

2. Delete the two lines `const env = process.env;` and `const bypass = env.VERCEL_OIDC_TOKEN ? ... : {};`.
3. In `status()`, delete the line `  const ours = u.startsWith(base);` and replace the three lines from
   `const r = await fetch(u, {` through `return { code: r.status, at: r.url };` with:

```js
        // redirects are followed by hand, so one that leaves this site never carries the preview's bypass header
        const { r, url } = await follow(base, u, { 'user-agent': UA, accept: 'text/html,*/*', ...headers }, { signal: AbortSignal.timeout(20000) });
        await r.body?.cancel();
        return { code: r.status, at: url };
```

4. Delete the whole `jpegSize` function and the blank line after it.
5. Replace the line ``const sitemap = await (await fetch(`${base}/sitemap-0.xml`, { headers: bypass })).text();`` with:

```js
// the index names each sitemap file; a second file would be read too
const index = await (await get(base, `${base}/sitemap-index.xml`)).text();
const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => local(m[1]));
if (!maps.length) fails.push('sitemap-index.xml lists no sitemap');
const sitemap = (await Promise.all(maps.map(async (u) => (await get(base, u)).text()))).join('');
```

6. In `if (pages.length < 31) fails.push(...)` replace `31` with `SITEMAP_MIN`.
7. Replace `  const r = await fetch(base + p, { headers: { ...bypass, accept: 'text/html' } });` with
   `  const r = await get(base, base + p, { accept: 'text/html' });`
8. Replace the two lines `const meta = (k) => ...;` and `const image = meta('og:image');` with one:
   `  const image = metaOf(html)('og:image');`
9. Replace the three share-tag lines (the `for (const k of ['og:image:alt', 'twitter:image:alt'])` line and the two
   `if (meta('twitter:...` lines) with: ``  for (const why of shareTagProblems(html)) fails.push(`${p}: ${why}`);``
10. Replace `  const ir = await fetch(local(image), { headers: bypass });` with
    `  const ir = await get(base, local(image));`
11. Replace `    const tr = await fetch(base + twin, { headers: bypass });` with
    `    const tr = await get(base, base + twin);`

**Verify**: `/usr/bin/grep -c "function jpegSize" scripts/verify-build.mjs scripts/check-seo.mjs scripts/lib/checks.mjs`
→ `scripts/verify-build.mjs:0`, `scripts/check-seo.mjs:0`, `scripts/lib/checks.mjs:1`
**Verify**: `/usr/bin/grep -c "fetch(" scripts/check-seo.mjs` → `0`
**Verify**: `pnpm build` → the last line is the same as the one saved in step 1.
**Verify**: `node scripts/check-seo.mjs http://127.0.0.1:4392 > "$TMPDIR/seo-after.txt" 2>&1; echo "exit $?"; diff "$TMPDIR/seo-before.txt" "$TMPDIR/seo-after.txt"`
→ `exit 0` and no diff output. (Restart the local serve first if the build replaced `dist/` under it.)

### Step 5: Use the helper in the smoke check, and compare redirect targets exactly

In `scripts/smoke.mjs`:

1. Directly above the line `const base = (process.argv[2] ?? '').replace(/\/$/, '');` add:

```js
import { get as request } from './lib/http.mjs';

```

2. Replace the six lines shown under "Current state" (`scripts/smoke.mjs:6-11`, from the comment
   `// a protected preview needs` through the `const get = async ...` line) with:

```js
// one request, redirects not followed; a protected preview's bypass headers come from the environment (lib/http.mjs)
const get = async (path, headers = {}) => { const r = await request(base, base + path, headers); return { r, text: r.status === 200 ? await r.text() : '' }; };
```

3. Replace the line that starts `  if (![301, 308].includes(r.status) || !(at === to || at.endsWith(to)` with:

```js
  // the target itself, not any address that ends the same way: "/" must be this site's home
  const same = at !== '' && new URL(at, base + '/').href === new URL(to, base + '/').href;
  if (![301, 308].includes(r.status) || !same) fails.push(`${p}: ${r.status} to ${at}, expected a redirect to ${to}`);
```

**Verify**: `/usr/bin/grep -c "fetch(" scripts/smoke.mjs` → `0`
**Verify**: `node scripts/smoke.mjs https://www.kevinliu.studio > "$TMPDIR/smoke-after.txt" 2>&1; echo "exit $?"; diff "$TMPDIR/smoke-before.txt" "$TMPDIR/smoke-after.txt"`
→ the same exit code as in step 1 and no diff output.

### Step 6: Stop the serve, docs, memory, commit

1. `pnpm exec astro preview stop`.

**Verify**: `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4392/` → `000`.

2. `scripts/SKILL.md`: add a line after the one that starts ``- `smoke.mjs` takes``:
   ``- `lib/checks.mjs` (the JPEG reader, the share-tag check, the sitemap's least page count) and `lib/http.mjs` (preview bypass headers, one request without following redirects) are shared by `verify-build.mjs`, `check-seo.mjs` and `smoke.mjs`. `check-seo.mjs` takes `VERCEL_AUTOMATION_BYPASS_SECRET` too now.``
3. Append to `memory.md` an entry dated today: type `refactor`, the files changed, why (three copies had drifted),
   what was checked (build, SEO check on a local serve before and after, smoke on production before and after), open
   threads none.
4. Commit:

```sh
git add scripts/lib/checks.mjs scripts/lib/http.mjs
git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit \
  -m "refactor(checks): one JPEG reader, share-tag check and HTTP helper for the guard and the deployed checks" \
  -- scripts/lib/checks.mjs scripts/lib/http.mjs scripts/verify-build.mjs scripts/check-seo.mjs scripts/smoke.mjs scripts/SKILL.md memory.md
```

**Verify**: `git status --short` → no output.

## Test plan

- Behaviour must not change for a passing site, so the tests are before-and-after runs of the three scripts on the
  same inputs: the guard's last line, the SEO check's whole output on a local serve, the smoke check's whole output
  on production.
- If plan 001 has landed (`"test"` exists in `package.json`), add `scripts/lib/checks.test.mjs` modelled on
  `scripts/rules.test.mjs` with three cases and run `pnpm test` (`ℹ fail 0`):
  1. `jpegSize(fs.readFileSync('public/og/home.jpg'))` deep-equals `[1200, 630]`, and `jpegSize(Buffer.from('nope'))`
     is `null`.
  2. `shareTagProblems('<html></html>')` deep-equals
     `['twitter:card is not summary_large_image', 'no og:image:alt', 'no twitter:image:alt', 'no og:title', 'no og:description']`.
  3. `bypassHeaders({})` deep-equals `{}`, and with both variables set its only key is
     `x-vercel-protection-bypass`.
  If plan 001 has not landed, skip this file; do not add a test script yourself.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] The syntax loop from "Commands you will need" prints nothing
- [ ] `pnpm build` exits 0, last line ends `all checks pass`
- [ ] `/usr/bin/grep -c "function jpegSize" scripts/*.mjs scripts/lib/*.mjs` shows `1` for `scripts/lib/checks.mjs` and `0` for every other file
- [ ] `/usr/bin/grep -c "fetch(" scripts/check-seo.mjs scripts/smoke.mjs` shows `0` for both
- [ ] `/usr/bin/grep -c "< 31" scripts/verify-build.mjs scripts/check-seo.mjs` shows `0` for both
- [ ] `diff "$TMPDIR/seo-before.txt" "$TMPDIR/seo-after.txt"` and `diff "$TMPDIR/smoke-before.txt" "$TMPDIR/smoke-after.txt"` print nothing
- [ ] The local serve is stopped (`curl` to port 4392 prints `000`)
- [ ] `git diff --name-only origin/main..HEAD` lists only the in-scope files (plus `scripts/lib/checks.test.mjs` if you added it)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any excerpt under "Current state" cannot be found, whole, in the live file.
- In step 1 the SEO check fails against the local serve, or the build fails: fix nothing, report.
- After step 4 or 5 a before-and-after diff is not empty. Report the diff. Do not edit a check until it agrees.
- The smoke check after step 5 reports a redirect it accepted before (for example
  `/index: 308 to https://.../, expected a redirect to /`). That is the stricter comparison finding a real
  difference: report the `Location` value it printed; do not loosen the comparison.
- Port 4392 is already in use, or a serve you did not start answers on it. Use another free port and the same
  commands; never stop a process you did not start.
- A step's verification fails twice after a reasonable fix attempt, or the fix appears to need an out-of-scope file.

## Maintenance notes

- A new share tag every page must carry is one line in `shareTagProblems` (`scripts/lib/checks.mjs`); both the guard
  and the SEO check then require it. The SEO check now also requires `og:title` and `og:description`, as the guard
  always did.
- `SITEMAP_MIN` is 31 (home, `/cards`, `/about`, two battle pages, 26 cards). A new page family or a 27th card moves
  it up; the internationalization branch will multiply it.
- `get()` attaches the preview bypass header only to the base URL's own origin, and `follow()` re-decides on every
  hop. Keep it that way: never pass the bypass headers to `fetch` directly in a new check.
- Plan 004 adds Markdown negotiation cases to `scripts/smoke.mjs`; they go through the same `get` wrapper and need no
  change here.
- A reviewer should read the three scripts' diffs for any check that vanished; the before-and-after files prove the
  passing path only.
- Not done on purpose: the local tools (`machine-check.mjs`, `paint-capture.mjs`) keep their own error handling.
