# Plan 025: The smoke, SEO and guard checks share one HTTP helper, one JPEG reader and one share-tag check

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Do NOT edit `plans/README.md`: the audit session
> keeps the index.
>
> **Drift check (run first)**: `git log --oneline 4025230..HEAD -- scripts/check-seo.mjs` must print nothing, and
> `git log --oneline 4025230..HEAD -- scripts/smoke.mjs scripts/verify-build.mjs` must list only plans 012 and 024
> (`perf(cache): …`, `fix(seo): llms.txt sections are link lists…`). The excerpts below show the three scripts as
> those plans left them. `python3 ~/k7-rescue/improve-audit/lane-a/p025/apply.py .` (step 4) refuses to write
> anything unless every excerpt it replaces occurs exactly once; if it refuses, that is a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (after 001, 004, 012, 024 and 021, which touch the same files or call them)
- **Category**: tech-debt
- **Planned at**: commit `4025230` (`feat/i18n`) plus the lane commits before it on `improve/p2-checks`, 2026-11-10.
  Refreshed from the `c6245d9` version by lane A: the finding is still present. The i18n work multiplied the sitemap
  minimum by the number of languages in the guard only, and plan 012 added checks to `smoke.mjs` that go through
  the same request wrapper. The shared pieces now come with tests in `pnpm test`.

## Why this matters

Three scripts check the same things in separate copies. The release guard (`scripts/verify-build.mjs`, on the built
files) and the SEO check (`scripts/check-seo.mjs`, over HTTP) each carry an identical `jpegSize` function and each
re-implement the share-tag checks; the guard asks the sitemap for 31 pages in each language while the SEO check
still asks for 31 in all. The copies have drifted in small ways that bite:

- `scripts/smoke.mjs` can reach a protected preview with either of two tokens; `scripts/check-seo.mjs` knows only
  one, so the same preview passes one script and returns sign-in pages to the other.
- `scripts/check-seo.mjs` reads `sitemap-0.xml` directly, never the index a crawler starts from.
- `scripts/check-seo.mjs` follows redirects automatically while sending the preview's access token as a custom
  header. If a site link ever redirected to another host, the token would go with it.
- `scripts/smoke.mjs` accepts any redirect whose target merely *ends with* the expected path. For `/index` and
  `/en`, expected to go to `/`, any address ending in `/` passes.

After this plan the shared pieces live in `scripts/lib/`, the three scripts import them, those gaps are closed, and
the shared pieces have their own tests. Lane A applied exactly these edits to a scratch copy on 2026-11-10: every
script still parses, and the patched smoke check printed the same 14 lines against production as the unpatched one.

## Current state

All paths are in the lane worktree `~/repos/kevinliu-studio-p2a` (branch `improve/p2-checks`).

- `scripts/verify-build.mjs`: the release guard; `pnpm build` runs it on `dist/`.
- `scripts/check-seo.mjs`: run by hand against a deployment or a local serve:
  `node scripts/check-seo.mjs <base-url> [--external]`.
- `scripts/smoke.mjs`: run by hand against a deployment: `node scripts/smoke.mjs <base-url>`. It needs the redirects
  in `vercel.json`, so it cannot pass against a local serve.
- There is no `scripts/lib/` folder yet. `pnpm test` is `node --test "scripts/**/*.test.mjs"`, so a test under
  `scripts/lib/` is found by itself.

The duplicated JPEG reader, identical in both files (in `scripts/verify-build.mjs` under the comment
`// width and height from a JPEG's start-of-frame marker`, and in `scripts/check-seo.mjs` followed by a blank line):

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
// scripts/verify-build.mjs
  if (meta('twitter:card') !== 'summary_large_image') fail(page, 'twitter:card is not summary_large_image');
  if (meta('twitter:image') !== meta('og:image')) fail(page, 'twitter:image differs from og:image');
  for (const k of ['og:image:alt', 'twitter:image:alt', 'og:title', 'og:description']) if (!meta(k)?.trim()) fail(page, `no ${k}`);
```

```js
// scripts/check-seo.mjs
  const meta = (k) => html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]*)"`))?.[1];
  const image = meta('og:image');
  if (!image) { fails.push(`${p}: no og:image`); continue; }
  for (const k of ['og:image:alt', 'twitter:image:alt']) if (!meta(k)?.trim()) fails.push(`${p}: no ${k}`);
  if (meta('twitter:card') !== 'summary_large_image') fails.push(`${p}: twitter:card ${meta('twitter:card')}`);
  if (meta('twitter:image') !== image) fails.push(`${p}: twitter:image is not og:image`);
  const ir = await fetch(local(image), { headers: bypass });
```

The sitemap count, twice and differently: `scripts/verify-build.mjs`
(`if (listed.length < 31 * LOCALES.length) fail('sitemap', …)`) and `scripts/check-seo.mjs`
(`if (pages.length < 31) fails.push(…)`). `LOCALES` comes from `src/i18n/locales.mjs` (eight languages).

How each script reaches a protected preview:

```js
// scripts/smoke.mjs
// a protected preview needs VERCEL_AUTOMATION_BYPASS_SECRET, or VERCEL_OIDC_TOKEN from `vercel project token
// kevinliu-studio` (short-lived, nothing to store); production URLs need neither
const env = process.env;
const bypass = env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': env.VERCEL_AUTOMATION_BYPASS_SECRET }
  : env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': env.VERCEL_OIDC_TOKEN } : {};
const get = async (path, headers = {}) => { const r = await fetch(base + path, { headers: { ...bypass, ...headers }, redirect: 'manual' }); return { r, text: r.status === 200 ? await r.text() : '' }; };
```

```js
// scripts/check-seo.mjs
const env = process.env;
const bypass = env.VERCEL_OIDC_TOKEN ? { 'x-vercel-trusted-oidc-idp-token': env.VERCEL_OIDC_TOKEN } : {};
```

The SEO check's link fetch (follows redirects with the token attached) and its sitemap read:

```js
// scripts/check-seo.mjs
  const ours = u.startsWith(base);
  ...
        const r = await fetch(u, { headers: { 'user-agent': UA, accept: 'text/html,*/*', ...(ours ? bypass : {}), ...headers }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
        await r.body?.cancel();
        return { code: r.status, at: r.url };
```

```js
const sitemap = await (await fetch(`${base}/sitemap-0.xml`, { headers: bypass })).text();
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].slice(SITE.length) || '/');
if (pages.length < 31) fails.push(`sitemap lists ${pages.length} pages`);
```

The smoke check's loose redirect comparison (inside the loop over `['/about/', '/about'], ['/index', '/'], …`):

```js
  if (![301, 308].includes(r.status) || !(at === to || at.endsWith(to) && to.startsWith('/'))) fails.push(`${p}: ${r.status} to ${at}, expected a redirect to ${to}`);
```

Conventions: ES modules, two-space indent, single quotes, semicolons, comments that say why in plain words. The
pattern for a small shared module is `scripts/rules.mjs` (named exports, a header comment that says who uses it);
the pattern for a test is `scripts/lock-check.test.mjs`.

## Commands you will need

Run all of them in `~/repos/kevinliu-studio-p2a`.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Syntax | `for f in scripts/*.mjs scripts/lib/*.mjs; do node --check "$f" \|\| echo "BAD $f"; done` | no output (in the table `\|\|` stands for a plain `||`) |
| Tests | `pnpm test` | `fail 0`, 4 more tests than before this plan |
| Build and release guard | `pnpm build` | last line starts `verify-build: 256 pages, 248 sitemap URLs,` and ends `all checks pass` |
| Smoke check on production | `node scripts/smoke.mjs https://www.kevinliu.studio` | see step 5: the same output as before the change |

The smoke check only reads public pages of the live site, about 100 requests. Production runs older code than this
branch, so it prints failures there; what matters is that it prints the same ones before and after. Do not start a
server or a browser: the SEO check against a local serve is your reviewer's step, before and after your commit.

## Scope

**In scope** (the only files you should modify):
- `scripts/lib/checks.mjs`, `scripts/lib/http.mjs`, `scripts/lib/checks.test.mjs` (create)
- `scripts/verify-build.mjs`, `scripts/check-seo.mjs`, `scripts/smoke.mjs`
- `scripts/SKILL.md` (one line added)
- `memory.md` (append one entry)

**Out of scope** (do NOT touch, even though they look related):
- What the scripts check: no new rule, no rule removed, no message reworded, except: the SEO check's share-tag
  messages become the guard's wording and it now also requires `og:title` and `og:description`; its sitemap minimum
  becomes 31 per language, as in the guard; the smoke check compares redirect targets exactly.
- `scripts/machine-check.mjs`, `scripts/paint-capture.mjs`, `scripts/memory/*`, `scripts/check-negotiation.mjs`,
  `scripts/check-release.mjs`: local tools with their own setups.
- `scripts/sync.mjs`, `scripts/phone-memory.mjs`, `scripts/rules.mjs`, `scripts/lock-check.mjs`.
- `vercel.json`, `.github/`, and anything under `src/`, `public/`, `vendor/`.
- Sending any request to a URL other than `https://www.kevinliu.studio`.

## Git workflow

- Work in the existing worktree `~/repos/kevinliu-studio-p2a` on branch `improve/p2-checks`. Do not create a branch
  or a worktree. Never edit another checkout. Never `git stash`.
- One commit for this plan, by explicit path, as the noreply address.
- Message: `refactor(checks): one JPEG reader, share-tag check and HTTP helper for the guard and the deployed checks`,
  a blank line, one or two sentences of body, a blank line, then `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Do NOT push, open a PR or deploy.

## Steps

The three new files and the edit script exist, byte for byte, in `~/k7-rescue/improve-audit/lane-a/p025/`
(`checks.mjs`, `http.mjs`, `checks.test.mjs`, `apply.py`). Copy them; do not retype.

### Step 1: Record the baseline

**Verify**: `git status --short` → empty. `pnpm test` → `fail 0`; note the test count.
**Verify**: `cat ~/k7-rescue/improve-audit/lane-a/p025/smoke-before.txt` shows 14 lines ending `exit 1`: the smoke
check's output against production with the script as it is now, recorded by your reviewer on 2026-11-10. Run it
again yourself: `node scripts/smoke.mjs https://www.kevinliu.studio > ~/k7-rescue/improve-audit/lane-a/p025/smoke-before-2.txt 2>&1; echo "exit $?" >> ~/k7-rescue/improve-audit/lane-a/p025/smoke-before-2.txt`.
If your run differs from the reviewer's file, production changed in between: use your own run as the baseline and
say so.

### Step 2: Create `scripts/lib/checks.mjs`

`mkdir -p scripts/lib && cp ~/k7-rescue/improve-audit/lane-a/p025/checks.mjs scripts/lib/checks.mjs`. Its content:

```js
// Checks the release guard (verify-build.mjs, on dist) and the deployed checks (check-seo.mjs, smoke.mjs, over HTTP)
// both make, kept in one place so they cannot drift.

// the least number of pages the sitemap lists in each language: home, /cards, /about, the two battle pages and the 26 cards
export const PAGES_MIN = 31;

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

### Step 3: Create `scripts/lib/http.mjs` and the tests

`cp ~/k7-rescue/improve-audit/lane-a/p025/http.mjs ~/k7-rescue/improve-audit/lane-a/p025/checks.test.mjs scripts/lib/`.
`http.mjs`:

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

`checks.test.mjs` holds four tests (read the file): the JPEG reader on `public/og/home.jpg` and on non-JPEG bytes;
the share-tag check on a complete page, an empty page and three single faults; the bypass header's precedence; and,
with `fetch` replaced by a stub, that `follow()` sends the bypass header to the site's own hops and not to a hop on
another host, that `get()` does not follow, and that a redirect loop stops after six requests.

**Verify**: `pnpm test` → 4 more tests than in step 1, `fail 0`.

### Step 4: Use them in the three scripts

Run `python3 ~/k7-rescue/improve-audit/lane-a/p025/apply.py .` from the worktree root. It prints
`applied to 3 files`, or names the first excerpt it could not find exactly once and writes nothing (STOP). What it
does, so you can read the diff against it:

In `scripts/verify-build.mjs`:
1. After `import { PHONE } from './phone-memory.mjs';` it adds
   `import { jpegSize, shareTagProblems, PAGES_MIN } from './lib/checks.mjs';`
2. It deletes the comment line `// width and height from a JPEG's start-of-frame marker` and the whole `jpegSize`
   function under it.
3. It replaces the three share-tag lines with `  for (const why of shareTagProblems(html)) fail(page, why);`
4. In `if (listed.length < 31 * LOCALES.length) fail(` it replaces `31` with `PAGES_MIN`.

In `scripts/check-seo.mjs`:
1. Above `const base = …` it adds three imports: `{ jpegSize, metaOf, shareTagProblems, PAGES_MIN }` from
   `./lib/checks.mjs`, `{ get, follow }` from `./lib/http.mjs`, `{ LOCALES }` from `../src/i18n/locales.mjs`.
2. It deletes the `const env` and `const bypass` lines, the `const ours` line in `status()`, and the `jpegSize`
   function.
3. In `status()` the fetch becomes
   `const { r, url } = await follow(base, u, { 'user-agent': UA, accept: 'text/html,*/*', ...headers }, { signal: AbortSignal.timeout(20000) });`
   and the result `{ code: r.status, at: url }`, under a comment that says why redirects are followed by hand.
4. The sitemap is read from `sitemap-index.xml` and every file it names; the minimum becomes
   `PAGES_MIN * LOCALES.length`.
5. Every other `fetch(…, { headers: bypass … })` becomes `get(base, …)`; `image` comes from `metaOf(html)('og:image')`;
   the three share-tag lines become ``for (const why of shareTagProblems(html)) fails.push(`${p}: ${why}`);``

In `scripts/smoke.mjs`:
1. Above `const base = …` it adds `import { get as request } from './lib/http.mjs';`
2. The six lines from `// a protected preview needs` through `const get = async …` become a two-line comment and
   wrapper that calls `request(base, base + path, headers)`.
3. The redirect comparison becomes exact:

```js
  // the target itself, not any address that ends the same way: "/" must be this site's home
  const same = at !== '' && new URL(at, base + '/').href === new URL(to, base + '/').href;
  if (![301, 308].includes(r.status) || !same) fails.push(`${p}: ${r.status} to ${at}, expected a redirect to ${to}`);
```

**Verify**: the syntax loop from "Commands you will need" prints nothing.
**Verify**: `/usr/bin/grep -c "function jpegSize" scripts/*.mjs scripts/lib/checks.mjs` shows `1` for
`scripts/lib/checks.mjs` and `0` for every other file.
**Verify**: `/usr/bin/grep -c "fetch(" scripts/check-seo.mjs scripts/smoke.mjs` → `0` for both.
**Verify**: `/usr/bin/grep -c "< 31" scripts/verify-build.mjs scripts/check-seo.mjs` → `0` for both.
**Verify**: read `git diff -- scripts/verify-build.mjs scripts/check-seo.mjs scripts/smoke.mjs` once in full and
confirm it holds only the changes listed above.

### Step 5: Build, and compare the smoke check with its baseline

**Verify**: `pnpm build` → last line starts `verify-build: 256 pages, 248 sitemap URLs,` and ends `all checks pass`.
**Verify**: `node scripts/smoke.mjs https://www.kevinliu.studio > ~/k7-rescue/improve-audit/lane-a/p025/smoke-after.txt 2>&1; echo "exit $?" >> ~/k7-rescue/improve-audit/lane-a/p025/smoke-after.txt; diff ~/k7-rescue/improve-audit/lane-a/p025/smoke-before-2.txt ~/k7-rescue/improve-audit/lane-a/p025/smoke-after.txt && echo same`
→ `same`.
**Verify** (the guard still reads share tags and JPEG sizes; one built file is changed and put back):

```
B=~/k7-rescue/improve-audit/lane-a/p025/about.html.bak && cp dist/about.html "$B" && sed -i '' 's/<meta name="twitter:card" content="summary_large_image"/<meta name="twitter:card" content="summary"/' dist/about.html && node scripts/verify-build.mjs 2>&1 | /usr/bin/grep -m1 "twitter:card is not summary_large_image"; cp "$B" dist/about.html && node scripts/verify-build.mjs 2>&1 | tail -1
```

→ one line naming `/about.html: twitter:card is not summary_large_image`, then a last line ending
`all checks pass`.

### Step 6: Docs, memory, commit

1. `scripts/SKILL.md`: add a line directly after the one that starts ``- `smoke.mjs` takes``:
   ``- `lib/checks.mjs` (the JPEG reader, the share-tag check, the sitemap's least page count per language) and `lib/http.mjs` (preview bypass headers, one request without following redirects, redirects followed by hand) are shared by `verify-build.mjs`, `check-seo.mjs` and `smoke.mjs`; `lib/checks.test.mjs` tests both. `check-seo.mjs` takes `VERCEL_AUTOMATION_BYPASS_SECRET` too now.``
2. Append to `memory.md` an entry (`## 2026-11-10: <title> (improve/p2-checks, plan 025)`, then `- **Type**:`,
   `- **Changed**:`, `- **Checked**:`, `- **Open**:`): type `refactor`, the files changed, why (three copies had
   drifted), what was checked (tests, build, smoke on production before and after), and under Open: "the SEO check
   against a local serve is the reviewer's step; not run against a protected preview".
3. Commit:

```sh
git add scripts/lib/checks.mjs scripts/lib/http.mjs scripts/lib/checks.test.mjs
git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit \
  -m "refactor(checks): one JPEG reader, share-tag check and HTTP helper for the guard and the deployed checks" \
  -m "<one or two sentences>" -m "Co-Authored-By: Claude <noreply@anthropic.com>" \
  -- scripts/lib/checks.mjs scripts/lib/http.mjs scripts/lib/checks.test.mjs scripts/verify-build.mjs scripts/check-seo.mjs scripts/smoke.mjs scripts/SKILL.md memory.md
```

**Verify**: `git status --short` → no output. `git show --stat --format=%ae HEAD` lists exactly those eight paths.

## Test plan

- New tests: `scripts/lib/checks.test.mjs` (four, in `pnpm test`), described in step 3. The fourth is the one that
  matters for safety: it fails if `follow()` ever sends the preview's bypass header to another host.
- Behaviour must not change for a passing site, so the rest are before-and-after runs on the same inputs: the
  guard's last line and one seeded share-tag fault (step 5), the smoke check's whole output on production (step 5),
  and the SEO check's whole output on a local serve (the reviewer: `check-seo: 249 pages, 490 links on the site:
  share images, JSON-LD, twins and links pass` before this plan).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] The syntax loop prints nothing
- [ ] `pnpm test` exits 0 with `fail 0` and 4 more tests than before
- [ ] `pnpm build` exits 0, last line ends `all checks pass`
- [ ] `/usr/bin/grep -c "function jpegSize" scripts/*.mjs scripts/lib/checks.mjs` shows `1` for `scripts/lib/checks.mjs` and `0` for every other file
- [ ] `/usr/bin/grep -c "fetch(" scripts/check-seo.mjs scripts/smoke.mjs` shows `0` for both
- [ ] `/usr/bin/grep -c "< 31" scripts/verify-build.mjs scripts/check-seo.mjs` shows `0` for both
- [ ] the smoke check's output on production is the same before and after
- [ ] `git diff --name-only HEAD~1..HEAD` lists only the eight paths in step 6

## STOP conditions

Stop and report back (do not improvise) if:

- `apply.py` refuses (an excerpt under "Current state" is not in the live file exactly once).
- The build fails after step 4.
- The smoke check after step 4 prints a line it did not print before (for example
  `/index: 308 to https://.../, expected a redirect to /`). That is the stricter comparison finding a real
  difference: report the `Location` value it printed; do not loosen the comparison.
- A step's verification fails twice after a reasonable fix attempt, or the fix appears to need an out-of-scope file.

## Maintenance notes

- A new share tag every page must carry is one line in `shareTagProblems` (`scripts/lib/checks.mjs`); both the guard
  and the SEO check then require it. The SEO check now also requires `og:title` and `og:description`, as the guard
  always did.
- `PAGES_MIN` is 31 per language (home, `/cards`, `/about`, two battle pages, 26 cards). A new page family or a 27th
  card moves it up.
- `get()` attaches the preview bypass header only to the base URL's own origin, and `follow()` re-decides on every
  hop. Keep it that way: never pass the bypass headers to `fetch` directly in a new check.
- A reviewer should read the three scripts' diffs for any check that vanished; the before-and-after files prove the
  passing path only.
- Not done on purpose: the local tools (`machine-check.mjs`, `paint-capture.mjs`) keep their own error handling.
