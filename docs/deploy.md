# Deploy and the domain swap

Kevin approved the first deploy and the swap on 2026-11-05. memory.md records what ran and when.

## Build

- `pnpm build` writes `dist/` and runs `scripts/verify-build.mjs`, which fails the build on a page without one h1, a
  title, a description of 50 to 170 characters, a production canonical (the 404 page is noindex instead), an existing
  share image and loop, parsing JSON-LD or a Markdown twin; on any broken local reference or a link that `<base>`
  would misroute; on location metadata in any image, video or audio file; and on banned names or routes.
- `node scripts/smoke.mjs <base-url>` checks a deployed copy: every route answers 200 with a canonical, Markdown
  negotiation works, the text files, share files and redirects answer, and a miss is a 404. Set
  `VERCEL_AUTOMATION_BYPASS_SECRET` to test a protected preview.
- `vercel.json` uses one `routes` list, because Vercel runs `rewrites` only after a static file misses, which would
  make `Accept: text/markdown` negotiation unreachable. In order: redirects (trailing slash, `.html`, `/index`,
  `/cards`, the old site's `/en`, and its resume and `projects.md` to portfoliomon.kevinliu.studio), headers, the
  Markdown negotiation, the filesystem, clean URLs (`/x` serves `x.html`), then the 404 page.
- No environment variables. Web Analytics and Speed Insights need their toggles on in the Vercel project.

## First deploy

1. Create the private GitHub repository `Kevin-Liu-01/kevinliu-studio` and push `main`.
2. Create the Vercel project `kevinliu-studio` in kl01s-projects, connected to that repository. Turn on Web Analytics
   and Speed Insights.
3. Let the push deploy production. It gets only its `*.vercel.app` address, since no domain points at it yet. Run
   `node scripts/smoke.mjs <that address>` and look at `/`, a card, `/battle` and `/about` at 1440 and 390 wide.

## The swap

Today `kevinliu.studio`, `www.kevinliu.studio` and `portfoliomon.kevinliu.studio` all serve the Vercel project
`kevin-portfolio` (repo PortfolioMon-Showdown). DNS is Vercel DNS with a wildcard, so no DNS record changes.

1. Record `kevin-portfolio`'s current production deployment URL for the rollback.
2. Only after the first deploy's smoke test passes: move `www.kevinliu.studio` and `kevinliu.studio` to
   `kevinliu-studio` in one step each (a move, never remove-then-add, so neither name is ever unassigned).
   `www` is primary; the apex redirects to it with a 308. `portfoliomon.kevinliu.studio` stays on `kevin-portfolio`.
3. Run `node scripts/smoke.mjs https://www.kevinliu.studio`.
4. In `~/repos/PortfolioMon-Showdown`, fetch, merge `claude/own-domain` onto the current `origin/main`, reword the
   lines that still place PortfolioMon or the resume on www, and push. `kevin-portfolio` deploys it, which moves that
   site's canonical, sitemap, robots and `llms.txt` to portfoliomon.kevinliu.studio, so the two sites never claim the
   same address.
5. Retire `kevin-portfolio-2-eight.vercel.app` (project `kevin-portfolio-2`, the Personal Website). On 2026-11-04 it
   still served the GPS-tagged curation photos. Deleting a deployment or project cannot be undone, so Kevin does it.
6. In Google Search Console and Bing Webmaster Tools, submit `https://www.kevinliu.studio/sitemap-index.xml`.

## Rollback

1. Move `www.kevinliu.studio` and `kevinliu.studio` back to `kevin-portfolio`.
2. If swap step 4 has run, also roll `kevin-portfolio` back (Instant Rollback) to the deployment recorded in swap
   step 1. Otherwise www would serve pages whose canonical and sitemap point at portfoliomon.
