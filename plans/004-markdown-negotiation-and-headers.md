# Plan 004: Markdown is served only to a client that prefers it, a missing `.md` is a plain 404, and no other site can frame the pages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6245d9..HEAD -- vercel.json scripts/smoke.mjs src/lib/twins.ts docs/deploy.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `c6245d9`, 2026-11-09

## Why this matters

Every page of www.kevinliu.studio answers `Accept: text/markdown` with its Markdown twin. The rule that decides this
matches any `Accept` header that merely mentions `text/markdown`, so a client that lists Markdown last
(`text/html, text/markdown;q=0.1`) or refuses it (`text/markdown;q=0`) still gets Markdown. Both were reproduced on
production on 2026-11-09. A second rule labels every address ending in `.md` as `text/markdown` before the file is
looked up, so a missing twin (`/nope.md`, or `/.md`, which is what the site's own `llms.txt` advice "add .md to its
path" produces for the home page) returns the HTML 404 page labelled as Markdown. Third, `Vary: Accept` is sent on
every file, fonts and pictures included, although only six page routes negotiate. Fourth, no header stops another
site from framing the pages. After this plan a client gets Markdown only when it prefers it, a missing `.md` is an
ordinary 404, `Vary: Accept` sits only on the negotiated pages, and the pages refuse to be framed by other origins.

## Current state

The site is Astro 7, static output, hosted on Vercel. All routing lives in one `routes` list in `vercel.json`
(Vercel's legacy `routes` syntax; a route with `"continue": true` only adds headers and lets matching go on).

- `vercel.json` — the whole routing table. The lines this plan changes (`vercel.json:13-29`):

```json
    { "src": "^/.*$", "continue": true, "headers": {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "Vary": "Accept"
    } },
    { "src": "^/.*\\.md$", "continue": true, "headers": { "Content-Type": "text/markdown; charset=utf-8" } },
    { "src": "^/index\\.md$", "continue": true, "headers": { "Link": "<https://www.kevinliu.studio/>; rel=\"canonical\"" } },
```

  and (`vercel.json:28-29`):

```json
    { "src": "^/$", "has": [{ "type": "header", "key": "accept", "value": "(.*)text/markdown(.*)" }], "dest": "/index.md" },
    { "src": "^/(about|cards|battle|battle/arena|cards/[\\w-]+)$", "has": [{ "type": "header", "key": "accept", "value": "(.*)text/markdown(.*)" }], "dest": "/$1.md" },
```

  A `has` header `value` is a regular expression matched against the whole header value (that is why the current one
  is wrapped in `(.*)`).

- `scripts/smoke.mjs` — checks a deployed copy. It only tests that a bare `Accept: text/markdown` gets Markdown
  (`scripts/smoke.mjs:17-18`):

```js
  const md = await get(p, { Accept: 'text/markdown' });
  if (md.r.status !== 200 || !/^# /.test(md.text)) fails.push(`${p}: Accept text/markdown gave ${md.r.status}`);
```

  and that a miss is a 404 (`scripts/smoke.mjs:31-32`):

```js
const { r: nf } = await get('/no-such-page');
if (nf.status !== 404) fails.push(`/no-such-page: ${nf.status}, expected 404`);
```

- `src/lib/twins.ts` — writes every Markdown twin and `llms.txt`. The sentence that sends agents to `/.md`
  (`src/lib/twins.ts:149`, inside a template literal, so the backticks are escaped):

```ts
Every page has a Markdown twin: add .md to its path, or send \`Accept: text/markdown\`.
```

- `docs/deploy.md:24-31` — describes the routing order and caching. It must stay true.

Facts established on production (2026-11-09) that this plan relies on:

- A negotiated request for `/cards` returned `content-type: text/markdown; charset=utf-8` although its path does not
  end in `.md`, so the `^/.*\.md$` route (`vercel.json:20`) cannot have set it: Vercel infers the type from the
  `.md` file it serves. That route is therefore not needed for real twins.
- `curl -sI https://www.kevinliu.studio/nope.md` returned `HTTP/2 404` with `content-type: text/markdown; charset=utf-8`.
- The pages set `<base href="/ex/">` (home, card pages) or `<base href="/battle/mat/">` / `<base href="/battle/arena/">`
  (battle). All are same-origin paths, so `base-uri 'self'` allows them. No page uses `<object>`, `<embed>` or
  `<iframe>`.

Repo rules that apply (from `AGENTS.md`): never edit `public/ex`, `public/battle`, `public/sound`, `public/og` or
`vendor/` by hand (this plan does not touch them); append an entry to `memory.md` after the change; ask Kevin before
pushing or deploying.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install --frozen-lockfile` | exit 0 |
| Build and release guard | `pnpm build` | last line starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass` |
| Negotiation table (created in step 1) | `node scripts/check-negotiation.mjs` | `negotiation: 2 routes, 16 cases pass`, exit 0 |
| JSON is valid | `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` | exit 0, no output |
| Deployed copy (operator step only) | `node scripts/smoke.mjs <preview-url>` | `smoke: <preview-url> passes` |

There is no test runner, linter or CI in this repo. Do not run `pnpm check` (it is broken on `main`).

## Scope

**In scope** (the only files you should modify):
- `vercel.json`
- `scripts/check-negotiation.mjs` (create)
- `scripts/smoke.mjs`
- `src/lib/twins.ts` (line 149 only)
- `docs/deploy.md` (the "Build" list only)
- `memory.md` (append one entry)
- `plans/README.md` (your status row)

**Out of scope** (do NOT touch, even though they look related):
- The redirect routes at `vercel.json:7-11`, the `Link` canonical routes at `:21-22`, the cache routes at `:24-26` and
  the last three routes at `:31-33`. Plan 012 changes the cache routes; do not pre-empt it.
- `vercel.json:23` (`Content-Type` for `llms*.txt`): leave it.
- Anything else in `src/lib/twins.ts`. Plan 024 restructures the lines after 149; change only the one sentence.
- A script `Content-Security-Policy` (`script-src`, `default-src`). The pages run many inline scripts; a script policy
  is a separate piece of work.
- `Strict-Transport-Security` `preload`: a domain decision that is Kevin's.
- Deploying. A Vercel preview needs Kevin's yes.

## Git workflow

- Work in a new git worktree of `~/repos/kevinliu-studio` on branch `improve/004-markdown-negotiation-and-headers`
  cut from `origin/main`. Never edit the main checkout (other sessions use it). Never `git stash`.
- Commit by explicit path as the noreply address:
  `git -c user.name=Kevin -c user.email=66856750+Kevin-Liu-01@users.noreply.github.com commit -m "<message>" -- <paths>`
- Message style, from `git log`: `fix(sound): no sound fetched before the first gesture on the battle`. For this plan:
  `fix(routes): Markdown only for a client that prefers it; a missing .md is a plain 404; no framing by other sites`
- Do NOT push, open a PR or deploy.

## Steps

### Step 1: Add the local check for the negotiation rule

Create `scripts/check-negotiation.mjs` with exactly this content:

```js
#!/usr/bin/env node
// Checks vercel.json's Markdown negotiation without a deployment: the Accept header rule on the two routes that
// rewrite a page to its twin, the route that sends Vary: Accept, and that no route labels a missing .md as Markdown.
import fs from 'node:fs';
const { routes } = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const fails = [];
const md = routes.filter((r) => typeof r.dest === 'string' && r.dest.endsWith('.md') && r.has?.some((h) => h.type === 'header' && h.key === 'accept'));
if (md.length !== 2) fails.push(`expected 2 routes that rewrite to a twin on Accept, found ${md.length}`);
// [Accept header, whether the twin is served]
const CASES = [
  ['text/markdown', true],
  ['text/markdown, text/html;q=0.9', true],
  ['text/markdown;q=0.9, text/html;q=0.8', true],
  ['text/markdown;charset=utf-8, text/html;q=0.5', true],
  ['text/plain, text/markdown;q=0.8, text/html;q=0.7', true],
  ['application/json, text/markdown', true],
  ['text/markdown;q=0.5', true],
  ['text/markdown;q=0.01', true],
  ['text/html, text/markdown;q=0.1', false],
  ['text/html,text/markdown', false],
  ['text/markdown;q=0, text/html', false],
  ['text/markdown;q=0.0', false],
  ['text/markdown; q=0', false],
  ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', false],
  ['*/*', false],
  ['', false],
];
let cases = 0;
for (const r of md) {
  const value = r.has.find((h) => h.key === 'accept').value;
  const re = new RegExp(`^(?:${value})$`); // Vercel matches the value against the whole header
  for (const [accept, want] of CASES) {
    if (re.test(accept) !== want) fails.push(`${r.src}: Accept "${accept}" ${want ? 'must' : 'must not'} get Markdown`);
  }
  cases = CASES.length;
}
const vary = routes.filter((r) => r.headers && Object.keys(r.headers).some((k) => k.toLowerCase() === 'vary'));
if (vary.length !== 1) fails.push(`expected 1 route that sends Vary, found ${vary.length}`);
for (const r of vary) {
  const re = new RegExp(r.src);
  for (const p of ['/', '/about', '/cards', '/cards/atlas', '/battle', '/battle/arena']) if (!re.test(p)) fails.push(`Vary route does not match ${p}`);
  for (const p of ['/fonts/katagami-sans-site.woff2', '/ex/ui.css', '/cards.md', '/og/home.jpg', '/llms.txt']) if (re.test(p)) fails.push(`Vary route matches ${p}`);
}
for (const r of routes) {
  if (r.headers?.['Content-Type']?.startsWith('text/markdown')) fails.push(`${r.src} sets Content-Type text/markdown before the file is found, so a missing .md is labelled Markdown`);
}
const csp = routes.find((r) => r.src === '^/.*$' && r.continue)?.headers?.['Content-Security-Policy'] ?? '';
for (const d of ["frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'"]) if (!csp.includes(d)) fails.push(`Content-Security-Policy lacks ${d}`);
if (/script-src|default-src/.test(csp)) fails.push('Content-Security-Policy must not set script-src or default-src (the pages run inline scripts)');
if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`negotiation: ${md.length} routes, ${cases} cases pass`);
```

**Verify**: `node scripts/check-negotiation.mjs; echo "exit $?"` → prints failures (the current rule fails at least
`Accept "text/html, text/markdown;q=0.1" must not get Markdown`, the Vary route and the Content-Security-Policy
lines) and `exit 1`. That failure is the expected starting point.

### Step 2: Change the routes in `vercel.json`

Make exactly these four edits.

1. In the first header route (`vercel.json:13-19`), replace the line `"Vary": "Accept"` with the framing policy, so
   the route reads:

```json
    { "src": "^/.*$", "continue": true, "headers": {
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "Content-Security-Policy": "frame-ancestors 'self'; base-uri 'self'; object-src 'none'"
    } },
```

2. Replace the whole next route (`vercel.json:20`, the `"^/.*\\.md$"` Content-Type route) with the route that sends
   `Vary: Accept` on the negotiated pages only:

```json
    { "src": "^/(?:|about|cards|battle|battle/arena|cards/[\\w-]+)$", "continue": true, "headers": { "Vary": "Accept" } },
```

3. and 4. In both negotiation routes (`vercel.json:28-29`), replace the `"value": "(.*)text/markdown(.*)"` with the
   rule below. It reads: `text/markdown` appears with no `text/html` before it, and is not followed by `;q=0`.

```json
"value": "^(?:(?!text/html).)*text/markdown(?!\\s*;\\s*q=0(?:\\.0*)?\\s*(?:,|$)).*$"
```

   The two routes then read:

```json
    { "src": "^/$", "has": [{ "type": "header", "key": "accept", "value": "^(?:(?!text/html).)*text/markdown(?!\\s*;\\s*q=0(?:\\.0*)?\\s*(?:,|$)).*$" }], "dest": "/index.md" },
    { "src": "^/(about|cards|battle|battle/arena|cards/[\\w-]+)$", "has": [{ "type": "header", "key": "accept", "value": "^(?:(?!text/html).)*text/markdown(?!\\s*;\\s*q=0(?:\\.0*)?\\s*(?:,|$)).*$" }], "dest": "/$1.md" },
```

Change nothing else in the file.

**Verify**: `node scripts/check-negotiation.mjs` → `negotiation: 2 routes, 16 cases pass`, exit 0.
**Verify**: `git diff --stat -- vercel.json` → `1 file changed, 4 insertions(+), 4 deletions(-)`.

### Step 3: Fix the sentence in `llms.txt`

In `src/lib/twins.ts`, line 149, replace

```ts
Every page has a Markdown twin: add .md to its path, or send \`Accept: text/markdown\`.
```

with

```ts
Every page has a Markdown twin: add .md to its path (the home page's is /index.md), or send \`Accept: text/markdown\` first in the header.
```

**Verify**: `grep -c "the home page's is /index.md" src/lib/twins.ts` → `1`.

### Step 4: Add the cases to the smoke check

In `scripts/smoke.mjs`, directly after the two lines quoted above that test `/no-such-page` (lines 31-32), insert:

```js
// a client that prefers HTML, or refuses Markdown, gets HTML; one that prefers Markdown gets the twin
for (const [accept, want] of [['text/html, text/markdown;q=0.1', 'text/html'], ['text/markdown;q=0, text/html', 'text/html'], ['text/markdown, text/html;q=0.9', 'text/markdown'], ['application/json, text/markdown', 'text/markdown']]) {
  const { r } = await get('/cards', { Accept: accept });
  const type = r.headers.get('content-type') ?? '';
  if (r.status !== 200 || !type.startsWith(want)) fails.push(`/cards with Accept "${accept}": ${r.status} ${type}, expected ${want}`);
}
// a missing .md address is a 404 that does not claim to be Markdown
for (const p of ['/no-such-page.md', '/.md']) {
  const { r } = await get(p);
  if (r.status !== 404 || /^text\/markdown/.test(r.headers.get('content-type') ?? '')) fails.push(`${p}: ${r.status} ${r.headers.get('content-type')}, expected a 404 that is not text/markdown`);
}
// only the negotiated pages vary on Accept, and no other site may frame a page
{
  const { r: page } = await get('/about');
  if (!/accept/i.test(page.headers.get('vary') ?? '')) fails.push(`/about: vary ${page.headers.get('vary')}, expected Accept`);
  if (!/frame-ancestors 'self'/.test(page.headers.get('content-security-policy') ?? '')) fails.push(`/about: content-security-policy ${page.headers.get('content-security-policy')}`);
  const { r: face } = await get('/fonts/katagami-sans-site.woff2');
  if (/accept(?!-encoding)/i.test(face.headers.get('vary') ?? '')) fails.push(`/fonts/katagami-sans-site.woff2: vary ${face.headers.get('vary')}, expected no Accept`);
}
```

**Verify**: `node --check scripts/smoke.mjs` → exit 0, no output.

### Step 5: Keep `docs/deploy.md` true

In `docs/deploy.md`, in the bullet that begins `` - `vercel.json` uses one `routes` list `` (lines 24-28), replace the
words

```
headers (each `.md` twin carries
  `Link: <its page>; rel="canonical"`), the Markdown negotiation (`/`, `/cards`, `/about`, the battle and each card),
```

with

```
headers (no other site may frame a page; the negotiated pages send `Vary: Accept`; each `.md` twin carries
  `Link: <its page>; rel="canonical"`), the Markdown negotiation (`/`, `/cards`, `/about`, the battle and each card: the
  twin is served when `text/markdown` comes before any `text/html` in `Accept` and is not `q=0`;
  `node scripts/check-negotiation.mjs` checks the rule without a deployment),
```

**Verify**: `grep -c "check-negotiation.mjs" docs/deploy.md` → `1`.

### Step 6: Build

Run `pnpm install --frozen-lockfile` (a fresh worktree has no `node_modules`), then `pnpm build`.

**Verify**: the last line of `pnpm build` starts `verify-build: 32 pages, 31 sitemap URLs,` and ends `all checks pass`.
**Verify**: `grep -c "the home page's is /index.md" dist/llms.txt dist/llms-full.txt` → each file reports `1`.

### Step 7: Record and commit

Append an entry to the end of `memory.md` in the file's existing shape (a `## 2026-MM-DD: <title> (<branch>, <agent>)`
heading, then `- **Type**:`, `- **Changed**:`, `- **Checked**:`, `- **Open**:` bullets). Under Open write: "not
deployed; the preview smoke (`node scripts/smoke.mjs <preview>`) has not run, so the Accept rule, the 404 type of a
missing `.md`, `Vary` and the framing header are checked only by `scripts/check-negotiation.mjs`".

Commit `vercel.json scripts/check-negotiation.mjs scripts/smoke.mjs src/lib/twins.ts docs/deploy.md memory.md` by
explicit path with the message in "Git workflow".

**Verify**: `git status --short` → empty.

### Operator step (not yours): the preview check

A Vercel preview needs Kevin's yes. Whoever deploys the branch runs, as `docs/deploy.md` describes:

```
VERCEL_OIDC_TOKEN="$(vercel project token kevinliu-studio --scope kl01s-projects)" node scripts/smoke.mjs <preview-url>
```

Expected: `smoke: <preview-url> passes`. If it reports any of the new cases, apply the matching fallback and deploy
again:

- **The Accept cases fail, or Vercel rejects the `value`** (its regex engine refuses the `(?!` lookahead). Restore
  `"value": "(.*)text/markdown(.*)"` on both negotiation routes and put these four routes directly before them. They
  send a header that prefers HTML to the page's HTML file, using only features the file already uses:

```json
    { "src": "^/$", "has": [{ "type": "header", "key": "accept", "value": ".*text/html.*text/markdown.*" }], "dest": "/index.html" },
    { "src": "^/(about|cards|battle|battle/arena|cards/[\\w-]+)$", "has": [{ "type": "header", "key": "accept", "value": ".*text/html.*text/markdown.*" }], "dest": "/$1.html" },
    { "src": "^/$", "has": [{ "type": "header", "key": "accept", "value": ".*text/markdown\\s*;\\s*q=0(\\.0*)?\\s*(,.*)?" }], "dest": "/index.html" },
    { "src": "^/(about|cards|battle|battle/arena|cards/[\\w-]+)$", "has": [{ "type": "header", "key": "accept", "value": ".*text/markdown\\s*;\\s*q=0(\\.0*)?\\s*(,.*)?" }], "dest": "/$1.html" },
```

  `scripts/check-negotiation.mjs` must then be taught these routes (it expects the rule on the `.md` routes), so
  report back instead of editing it blind.

- **A real twin (`/about.md`) no longer answers `text/markdown`** (the existing `/about.md` content-type check in
  `scripts/smoke.mjs` reports it). Put the route `{ "src": "^/.*\\.md$", "continue": true, "headers": { "Content-Type": "text/markdown; charset=utf-8" } }`
  back where it was, and add `"headers": { "Content-Type": "text/html; charset=utf-8" }` to the last route
  (`{ "src": "^/.*$", "status": 404, "dest": "/404.html" }`) so the 404 page states its own type. Remove the
  `Content-Type` check from `scripts/check-negotiation.mjs` in the same commit.

## Test plan

- New check: `scripts/check-negotiation.mjs` (step 1), 16 Accept cases against both negotiation routes, the Vary
  route against 6 page paths and 5 file paths, the absence of a `.md` Content-Type route, and the three policy
  directives. It needs no network.
- New smoke cases (step 4): four Accept headers on `/cards`, two missing `.md` addresses, `Vary` on a page and on a
  font, the framing header. They run only against a deployment.
- No existing test file to model on: the repo has no test runner. The two scripts follow `scripts/smoke.mjs`'s own
  style (collect `fails`, print them, exit 1).
- Verification: `node scripts/check-negotiation.mjs` → `negotiation: 2 routes, 16 cases pass`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `node scripts/check-negotiation.mjs` prints `negotiation: 2 routes, 16 cases pass` and exits 0
- [ ] `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"` exits 0
- [ ] `grep -c '"Vary"' vercel.json` → `1`
- [ ] `grep -c 'text/markdown; charset=utf-8' vercel.json` → `0`
- [ ] `grep -c "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" vercel.json` → `1`
- [ ] `node --check scripts/smoke.mjs` exits 0 and `grep -c "no-such-page.md" scripts/smoke.mjs` → `1`
- [ ] `pnpm build` ends with `all checks pass`
- [ ] `grep -c "the home page's is /index.md" dist/llms.txt` → `1`
- [ ] `git diff --name-only origin/main...HEAD` lists only the files in "In scope"
- [ ] `plans/README.md` status row updated (DONE, with the note "preview smoke not run")

## STOP conditions

Stop and report back (do not improvise) if:

- `vercel.json:13-29` does not match the excerpts in "Current state" (another session changed the routes; the
  i18n branch adds locale routes).
- `node scripts/check-negotiation.mjs` still fails after step 2 and you have re-typed the `value` once. Do not edit
  the cases to make it pass.
- `pnpm build` fails for a reason unrelated to the files you changed.
- You find a page in `dist/` whose `<base href>` is not a same-origin path, or that contains `<iframe`, `<object` or
  `<embed` (then `base-uri 'self'` or `object-src 'none'` would break it): `grep -l '<iframe\|<object\|<embed' dist/*.html dist/**/*.html`.
- You are asked to deploy, push or promote. That is Kevin's decision.

## Maintenance notes

- A new page route (for example the i18n branch's locale paths) must be added in three places in `vercel.json`: the
  Vary route, the negotiation route and the `Link` canonical route. `scripts/check-negotiation.mjs` lists the six
  page paths it expects; extend it with the route.
- The rule is order-based, not a full q-value parser: `text/markdown;q=0.2, text/html;q=0.9` gets Markdown because
  Markdown comes first. Real q-parsing needs Vercel Routing Middleware (a function call per request); judged not
  worth it for a static site. Say so if a client is found that depends on it.
- `frame-ancestors 'self'` stops every other origin from framing the site. If Kevin wants a page embedded elsewhere
  (for example on portfoliomon.kevinliu.studio), add that origin to the directive.
- A reviewer should check the JSON escaping of the regular expression (`\\s`, `\\.`) and that the preview smoke ran
  before the branch reaches `main`.
- Deferred on purpose: a script policy (`script-src`), `Strict-Transport-Security` `preload`, and a `Link: <twin>;
  rel="alternate"` header on HTML pages.
