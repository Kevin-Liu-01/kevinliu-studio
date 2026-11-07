# Deploy and the domain swap

Kevin approved the first deploy and the swap on 2026-11-05, and both ran that day:

- GitHub `Kevin-Liu-01/kevinliu-studio` (private); Vercel project `kevinliu-studio` (prj_F68SqUnxzK9bpIQyMMHooFLFY2QV) in
  kl01s-projects, deploying `main` to production.
- Swap step 1's rollback target: `kevin-portfolio-iv0ewmkqn-kl01s-projects.vercel.app` (dpl_vwKrHwfeEe7BtdgXdmGUhcJD6HCd).
- Moving `www.kevinliu.studio` (`POST /v1/projects/kevin-portfolio/domains/www.kevinliu.studio/move`) also moved every
  domain that redirects to it: `kevinliu.studio`, `kevinliu.biz`, `www.kevinliu.biz`, `kevin-liu.tech` and
  `www.kevin-liu.tech`, each still redirecting to www.
- PortfolioMon-Showdown `main` 8822911 merges `claude/own-domain` and rewords its copy; portfoliomon.kevinliu.studio
  now claims its own canonical, sitemap and `llms.txt`.
- Not run: swap step 5 (Kevin's) and step 6.

## Build

- `pnpm build` writes `dist/` and runs `scripts/verify-build.mjs`, which fails the build on a page without one h1, a
  title, a description of 50 to 170 characters, a production canonical (the 404 page is noindex instead), an existing
  share image and loop, parsing JSON-LD or a Markdown twin; on any broken local reference or a link that `<base>`
  would misroute; on location metadata in any image, video or audio file; and on banned names or routes.
- `node scripts/smoke.mjs <base-url>` checks a deployed copy: every route answers 200 with a canonical, Markdown
  negotiation works, the text files, share files and redirects answer, and a miss is a 404. Set
  `VERCEL_AUTOMATION_BYPASS_SECRET` to test a protected preview.
- `vercel.json` uses one `routes` list, because Vercel runs `rewrites` only after a static file misses, which would
  make `Accept: text/markdown` negotiation unreachable. In order: redirects (trailing slash, `.html`, `/index`, the old
  site's `/en`, and its resume and `projects.md` to portfoliomon.kevinliu.studio), headers (each `.md` twin carries
  `Link: <its page>; rel="canonical"`), the Markdown negotiation (`/`, `/cards`, `/about`, the battle and each card),
  the filesystem, clean URLs (`/x` serves `x.html`), then the 404 page.
- Caching: `_astro/` and `fonts/` are immutable; any `/ex/`, `/sound/` or `/battle/` stylesheet or script asked for
  with `?v=` (the content address `src/lib/assets.ts` writes) is immutable too; media under those folders keeps a day
  with a week of stale-while-revalidate; pages revalidate.
- A protected preview: `VERCEL_OIDC_TOKEN="$(vercel project token kevinliu-studio --scope kl01s-projects)" node
  scripts/smoke.mjs <url>`; agent-browser takes the same token as the `x-vercel-trusted-oidc-idp-token` header.
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

The phone-memory release (`fix/mobile-memory`, 2026-11-07) replaced production deployment
`kevinliu-studio-35wc6c87l-kl01s-projects.vercel.app` (main 0d8fb9d). To undo it, promote that deployment again
(Instant Rollback in the `kevinliu-studio` project, or `vercel promote <url> --scope kl01s-projects`), then revert
the merge on `main`.

Before the domain swap:

1. Move `www.kevinliu.studio` and `kevinliu.studio` back to `kevin-portfolio`.
2. If swap step 4 has run, also roll `kevin-portfolio` back (Instant Rollback) to the deployment recorded in swap
   step 1. Otherwise www would serve pages whose canonical and sitemap point at portfoliomon.
