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
- `pnpm check` runs `astro check` (TypeScript 5.9, `tsconfig.json` on Astro's base preset, `src/` only). It is not part
  of `pnpm build`; CI runs it.
- `.github/workflows/check.yml` runs on every pull request and every push to `main`: `pnpm install --frozen-lockfile`, `pnpm test`, `pnpm check`, `node scripts/check-negotiation.mjs`, `node scripts/lock-check.mjs`, `node scripts/phone-memory.mjs --check`, `node scripts/i18n-extract.mjs --check`, `pnpm build` (with the release guard) and `node scripts/check-release.mjs dist/index.html`. It needs no secret and deploys nothing; Vercel deploys as before.
- `node scripts/smoke.mjs <base-url>` checks a deployed copy: every route answers 200 with a canonical, Markdown
  negotiation works, the text files, share files and redirects answer, and a miss is a 404. Set
  `VERCEL_AUTOMATION_BYPASS_SECRET` to test a protected preview.
- `vercel.json` uses one `routes` list, because Vercel runs `rewrites` only after a static file misses, which would
  make `Accept: text/markdown` negotiation unreachable. In order: redirects (trailing slash, `.html`, `/index`, the old
  site's `/en`, and its resume and `projects.md` to portfoliomon.kevinliu.studio), headers (no other site may frame a page; the negotiated pages send `Vary: Accept`; each `.md` twin carries
  `Link: <its page>; rel="canonical"`), the Markdown negotiation (`/`, `/cards`, `/about`, the battle and each card: the
  twin is served when `text/markdown` comes before any `text/html` in `Accept` and is not `q=0`;
  `node scripts/check-negotiation.mjs` checks the rule without a deployment),
  the filesystem, clean URLs (`/x` serves `x.html`), then the 404 page.
- Caching: `_astro/` is immutable, and so is a `fonts/` file asked for with `?v=`; any `/ex/`, `/sound/` or `/battle/` stylesheet or script asked for
  with `?v=` (the content address `src/lib/assets.ts` writes) is immutable too; the `/ex/borders/` and `/ex/fx/` drawings asked for with `?v=` are immutable as well (`scripts/cache-rules.test.mjs`); media under those folders keeps a day
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

The animated signature (`feat/animated-favicon`, pushed to `main` 2026-11-18) replaced production deployment
`kevinliu-studio-26q2uftwm-kl01s-projects.vercel.app` (dpl_3TrueVi9Q2qtT88egR3hAC7hqPrX, main 04d370f). To undo it,
promote that deployment again (Instant Rollback, or `vercel promote <url> --scope kl01s-projects`), then revert the
signature commit on `main`.

The About order and logos (`feat/about-logos`, pushed to main 2026-11-18 as deployment `kevinliu-studio-26q2uftwm`,
main 04d370f) replaced production deployment `kevinliu-studio-nd8hh3j7l-kl01s-projects.vercel.app` (main 3ba6ce1). To
undo it, promote that deployment again (Instant Rollback, or `vercel promote <url> --scope kl01s-projects`), then
revert `main` to 3ba6ce1 with a revert commit.

The cards refit and round 6 battle release (`release/next`, promoted 2026-11-13 as deployment
`kevinliu-studio-19km5t6d2`, dpl_HvFKWDdDqUniAovzcmMNh8ve2fPs, main ab60dfb) replaced production deployment
`kevinliu-studio-810jiizk6-kl01s-projects.vercel.app` (dpl_HNgtUJ3tg5yxPCKA4PpX1tznUhoe, main c08f0fe). To undo it,
promote that deployment again (Instant Rollback, or `vercel promote <url> --scope kl01s-projects`), then revert `main`
to c08f0fe with a revert commit.

The translated battle release (`release/next`, promoted 2026-11-11 as deployment `kevinliu-studio-810jiizk6`,
dpl_HNgtUJ3tg5yxPCKA4PpX1tznUhoe, main c08f0fe) replaced production deployment
`kevinliu-studio-qus6l73l6-kl01s-projects.vercel.app` (dpl_4c6GLm19ffiyGVkmPJDUYezUHDLd, main 8888233). To undo it,
promote that deployment again (Instant Rollback, or `vercel promote <url> --scope kl01s-projects`), then revert `main`
to 8888233 with a revert commit.

The audit release (`release/next`, promoted 2026-11-10 as deployment `kevinliu-studio-qus6l73l6`,
dpl_4c6GLm19ffiyGVkmPJDUYezUHDLd, main 8888233) replaced production deployment
`kevinliu-studio-bpspo4ajg-kl01s-projects.vercel.app` (dpl_oa7hzrbwF1xYPd1HUtb4EZRDtLZs, main d3fc558). To undo it,
promote that deployment again (Instant Rollback, or `vercel promote <url> --scope kl01s-projects`), then revert `main`
to d3fc558 with a revert commit.

The eight-language release (`release/next`, promoted 2026-11-09 as deployment `kevinliu-studio-bpspo4ajg`,
dpl_oa7hzrbwF1xYPd1HUtb4EZRDtLZs, main d3fc558) replaced production deployment
`kevinliu-studio-5o2libd3l-kl01s-projects.vercel.app` (dpl_8iyQxnrH6giLx9yrqesqEvjTNV9r, main c6245d9). To undo it,
promote that deployment again (Instant Rollback, or `vercel promote <url> --scope kl01s-projects`), then revert `main`
to c6245d9 with a revert commit.

The 11-09 release (`release/next`, promoted 2026-11-09 as deployment `kevinliu-studio-r0tt2e1aa`, main f0feb6b)
replaced production deployment `kevinliu-studio-ai52pppxd-kl01s-projects.vercel.app`
(dpl_HNVucen2Zk6VD8HucYweuTpietdB, main cc54526). To undo it, promote that deployment again (Instant Rollback, or
`vercel promote <url> --scope kl01s-projects`), then revert `main` to cc54526 with a revert commit.

The 11-07 release (`release/11-07`, promoted 2026-11-08) replaced production deployment
`kevinliu-studio-80cvqzld0-kl01s-projects.vercel.app` (dpl_6WT67u9PqnCA8vfu3EzucqQCvTtg, main ae3cc56). To undo it,
promote that deployment again (Instant Rollback, or `vercel promote <url> --scope kl01s-projects`), then reset `main`
to ae3cc56 with a revert commit.

The phone-memory release (`fix/mobile-memory`, 2026-11-07) replaced production deployment
`kevinliu-studio-35wc6c87l-kl01s-projects.vercel.app` (main 0d8fb9d). To undo it, promote that deployment again
(Instant Rollback in the `kevinliu-studio` project, or `vercel promote <url> --scope kl01s-projects`), then revert
the merge on `main`.

Before the domain swap:

1. Move `www.kevinliu.studio` and `kevinliu.studio` back to `kevin-portfolio`.
2. If swap step 4 has run, also roll `kevin-portfolio` back (Instant Rollback) to the deployment recorded in swap
   step 1. Otherwise www would serve pages whose canonical and sitemap point at portfoliomon.
