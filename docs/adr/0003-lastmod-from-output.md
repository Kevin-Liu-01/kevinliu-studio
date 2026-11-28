# 0003: a page's lastmod is the day what it prints changed

2026-11-28. Accepted (Kevin approved L1, 2026-11-28).

## Context

`astro.config.mjs` dated each sitemap page by the last commit to a hand-kept list of its source files: the cards' data,
the battle's engine, `site.ts`, the page's view file, a card's art. A pure refactor of a view file re-dated every page
it renders (232 of 248 after the twins' English branch was deleted), and IndexNow would resend them as changed. A
change outside the list (a translation string read through `twins.ts`, a shared component) dated nothing. A shallow
clone could not date a path untouched since its oldest commit, so those pages had no lastmod.

## Decision

`scripts/lastmod.mjs` runs in `pnpm build` after the minifier. It fingerprints each sitemap page from the built
output: the HTML without scripts (JSON-LD kept), stylesheets, `<link>`s, comments and `?v=` content addresses, plus
the bytes of every picture it shows (`img`, `source`, `video` poster, `og:image`), resolved against the page's
`<base>`. `lastmod.json` (checked in) holds each page's fingerprint and date. A page whose fingerprint differs from the
ledger takes the date of HEAD's commit, or now in a tree with uncommitted changes; the script rewrites the ledger and
writes every `<lastmod>` in the sitemap, and the index's from its newest page. The git dating in `astro.config.mjs`
is deleted. `scripts/lastmod.test.mjs` holds the fingerprint's contract.

The ledger was seeded from production (main ba959ef): a page whose fingerprint matched production's build kept
production's date; the 52 Japanese and Korean card pages, whose Machine view gained the pinned line on this branch,
were dated at the seed.

## Consequences

- Commit `lastmod.json` with any change that moves a page's output; the build prints how many pages moved.
- A build on Vercel with a stale ledger dates the moved pages by the deploy's commit, so production stays correct even
  when the ledger was not committed, and the next local build records it.
- A change only to how a page looks (CSS, a script) dates nothing. That is the point: search engines read content.
- Against production's dates, the branch's build re-dated 232 pages under the old rule and 52 under this one.
