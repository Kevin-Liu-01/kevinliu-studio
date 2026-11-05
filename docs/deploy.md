# Deploy and the domain swap

Every step that publishes, pays, or touches a domain is Kevin's to approve. Nothing below has been run.

## Build

- `pnpm build` writes `dist/` and runs `scripts/verify-build.mjs`, which fails the build on a page without one h1, a
  title, a description of 50 to 170 characters, a production canonical, an existing share image and loop, parsing
  JSON-LD or a Markdown twin; on any broken local reference; on GPS in an image; and on banned names or routes.
- `node scripts/smoke.mjs <base-url>` checks a deployed copy: every route answers 200, Markdown negotiation works,
  `llms.txt`, `robots.txt` and the sitemap answer, and the share files exist.
- Vercel reads `vercel.json`: Astro, `pnpm build`, `dist`, clean URLs, no trailing slash, the Markdown rewrites for
  `Accept: text/markdown`, security headers and caching.
- No environment variables. Web Analytics and Speed Insights need their toggles on in the Vercel project.

## First deploy (needs Kevin's yes at each step)

1. Create the GitHub repository (private) and push `main`.
2. Create a Vercel project in kl01s-projects from it. Turn on Web Analytics and Speed Insights.
3. Deploy a preview. Run `node scripts/smoke.mjs <preview-url>` and look at `/`, a card, `/battle` and `/about` at
   1440 and 390 wide.

## The swap

Today `kevinliu.studio`, `www.kevinliu.studio` and `portfoliomon.kevinliu.studio` all serve the Vercel project
`kevin-portfolio` (repo PortfolioMon-Showdown). DNS is Vercel DNS with a wildcard, so no DNS record changes.

1. In `kevin-portfolio`, remove the domains `www.kevinliu.studio` and `kevinliu.studio`. Keep
   `portfoliomon.kevinliu.studio`. Keep `kevinliu.biz` and `kevin-liu.tech` redirecting to www (move them to the new
   project as redirects, or leave them; both end at www).
2. In the new project, add `www.kevinliu.studio` as primary and `kevinliu.studio` redirecting to it (308).
3. Promote the production deployment. Run `node scripts/smoke.mjs https://www.kevinliu.studio`.
4. In `~/repos/PortfolioMon-Showdown`, merge and deploy `claude/own-domain` (b6bb6d7). It moves that site's canonical,
   sitemap, robots and `llms.txt` to portfoliomon.kevinliu.studio, so the two sites never claim the same address.
5. Close the old main-site deployment `kevin-portfolio-2-eight.vercel.app`. On 2026-11-04 it still served the
   GPS-tagged curation photos. Delete that deployment, or the project it belongs to, after checking nothing else
   points at it.
6. In Google Search Console and Bing Webmaster Tools, submit `https://www.kevinliu.studio/sitemap-index.xml`.

## Rollback

Move `www.kevinliu.studio` and `kevinliu.studio` back to `kevin-portfolio`. Both projects keep their deployments, so
the swap reverses in under a minute.
