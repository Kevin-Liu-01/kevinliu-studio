# memory.md

Append-only log of agent sessions in this repo. Newest last. Never rewrite earlier entries.

## 2026-11-05: the repo is created (merge run, Claude Code)

- **Type**: build
- **Asked**: Kevin, 2026-11-05: "a new dedicated repo that ill swap into kevinliu.studio ... with all better
  seo/geo/aeo, conntext, docs, and analytics integrations. a nnew codebase with new look and everything, in one repo".
- **Goals as stated back**: 26 ex-quality cards with real logos and real-feature moves; one battle engine with Mat
  and Arena; ElevenLabs sound only for the visitor's own actions; Claude of Tanks with the A-wedge hero tank.
- **Changed**: everything (new repo). Astro 7 static site; `scripts/sync.mjs` pulls r4/ex, r4/sound, r4/play with r3
  media; `src/lib/cards.ts` prints cards with the rounds' own markup.js at build; twins, llms files, JSON-LD,
  sitemap, robots; Vercel Analytics and Speed Insights behind DNT/GPC; `scripts/verify-build.mjs` release guard;
  docs/.
- **Decisions** (reversible): Astro over Next.js (no client framework needed); gallery music loop off; the battle's
  card swap and the eight new cards' registration wait for battle-r4b; essays not ported; bio line from the previous
  site's llms.txt.
- **Open**: PostHog (ask Kevin); battle card swap and 26-card battle; battle sound (battle-r4b); k4 art and variety
  runs still writing r4/ex (rerun `pnpm sync`); GitHub repo, Vercel project and the swap need Kevin's yes.

## 2026-11-05: review fixes, Kevin's answers (merge run, Claude Code)

- **Type**: fix + content
- **Asked**: Kevin, 2026-11-05: "1. just vercel 2. [his bio] 3. lets fix the email yeah to use kevinliu.studio.
  4. approved" (4 approves the first deploy and the swap).
- **Review**: five-lens adversarial review (wf_90550a5f-71b), each finding checked by a skeptic. Fixed every confirmed
  finding except the 320px Arena rail and the home wall's lack of `<a>` links to card pages (both low; open below).
- **Changed**: `src/pages/SKILL.md` moved to `src/SKILL.md` (Astro published it and the build failed); `vercel.json`
  rewritten as one `routes` list so `Accept: text/markdown` runs before the filesystem, plus redirects for the old
  site's `/en`, resume and `projects.md`; `scripts/sync.mjs` now plans, scans and only then writes, removes only files
  the last lock listed, fails on missing named files, drops two captures (Elo sign-in, Turboslide credit), paints out
  the General Translation line in two Elo captures, fixes the Prototemplate clip path, the probe's `<base>`, the
  reduced-motion pack reveal, battle tab titles and the phone h1; `scripts/location.mjs` checks WebP/PNG EXIF, XMP
  and video location atoms in both the sync and the guard; `/battle/arena.md`; 404 noindex; Person node on card and
  battle pages; per-card schema types; `sameAs` only for a card's own repo; skip link, focus after a mode switch,
  footer Machine button on phones, dock scroll padding; the card font inlined only on room pages.
- **Content**: `/about` is Kevin's bio word for word (`ABOUT` in `src/lib/site.ts`); `BIO` is a third-person line
  without the employer; email `hello@kevinliu.studio` (the domain has no MX record yet); analytics stay Vercel only.
- **Open**: Arena rail at 320px; wall cards as real links; agent-docs kit should learn Astro's routed `src/pages`;
  mail for kevinliu.studio.

## 2026-11-05: first deploy and the swap (merge run, Claude Code)

- **Type**: deploy
- **Ran**: private GitHub repo `Kevin-Liu-01/kevinliu-studio`; Vercel project `kevinliu-studio` in kl01s-projects;
  smoke test and browser check on `kevinliu-studio.vercel.app`; moved `www.kevinliu.studio` (and with it the apex,
  kevinliu.biz and kevin-liu.tech, which redirect to www) from `kevin-portfolio`; smoke test on www passes;
  PortfolioMon-Showdown `main` 8822911 (own-domain merge plus copy) deployed to portfoliomon.kevinliu.studio.
- **Rollback**: docs/deploy.md, target `kevin-portfolio-iv0ewmkqn`.
- **Open**: Kevin retires `kevin-portfolio-2-eight.vercel.app` (project `kevin-portfolio-2`, still 200 on 2026-11-05);
  Search Console and Bing sitemap submission; mail for kevinliu.studio; battle-r4b merge; Arena rail at 320px; wall
  cards as links; agent-docs kit and Astro `src/pages`.

## 2026-11-05: performance and pops (perf/no-pops, Claude Code)

- **Type**: perf + fix
- **Asked**: Kevin, 2026-11-05: "also make the website a lot more performant and better using guillermo rauches
  website improver" (the `ui-recording-timeline` skill, rauchg/skills 40f2a05, now in `~/.claude/skills`).
- **Measured**: previews `kevinliu-studio-ompzcprnp` (main 9c6dcba) and `kevinliu-studio-ayb2lpyyy` (52617e8; eaaa07e only adds
  the header spacers, smoke-tested at `kevinliu-studio-bdtg9om9u`), 3 runs
  per page at 1440 and 390; paint timelines of local runs. Load average 300 to 500 throughout: timings are inflated,
  order and counts are not. Table in `docs/performance.md`.
- **Pops removed**: the wall painting in six waves (posters, subjects and logos arriving after the cards; 131 eager
  images) now paints whole once its first screen decodes; the pale View Transition crossfade on every card-to-home
  return (`rituals.css` on card pages); the header's links jumping about 90 px between `/` and every other page;
  the sound icon flipping after the kit booted; a header-only shell before the wall on return to `/`.
- **INP**: the first card press spent 5.5 s inside the sound kit's first `AudioContext` (the browser waits on its
  audio service starting); a silent context at idle moves that off the press: pointerdown 5,680 ms to 48 ms at 1440.
  At 390 the remaining 600 to 800 ms is presentation delay at DPR 3 on this Mac's GPU, not script; check Speed
  Insights after shipping.
- **Bytes**: card pages 38.7 to 13.1 KB of HTML (gzip), home 63.9 to 38.4 KB; one 27.5 KB face instead of 45 KB plus
  41 KB inline; every named stylesheet and script immutable by content address.
- **Also**: Arena rail fits 320 px; wall cards link to their pages; battle keys transition only transform;
  `scripts/paint-capture.mjs` (agent-browser `record` stops when its encoder lags on a loaded Mac); smoke takes
  `VERCEL_OIDC_TOKEN`; `sync --check` names files.
- **Open**: battle round (r4/play, other session): the 627 KB `kit.js` bundle boots the board 2.7 s before the deal,
  a 1.9 s blank behind its font gate, the interface vanishing after each cutscene, Arena pads shown then removed, the
  move list sliding over the cards at 390; the lens's Escape drops its action bar a frame before the dissolve;
  `vendor/ex/fonts/katagami-sans-cards.woff2` is now unused (drop it at a sync only after the Portfolio
  redesign session reports the k6 `r4/ex` install done; no `pnpm sync` before then); not shipped: needs Kevin's yes to
  merge to `main`, which deploys production.
- **Shipped** (2026-11-06): Kevin said "Yes, ship it". `main` was pushed to 0d8fb9d at 10:02; production deployment
  `kevinliu-studio-35wc6c87l` is Ready on www.kevinliu.studio, www.kevinliu.biz and www.kevin-liu.tech, and
  `node scripts/smoke.mjs https://www.kevinliu.studio` passes (the face and `ui.css?v=` serve immutable). Next: read
  Speed Insights for real-device INP and LCP once traffic arrives.

## 2026-11-06: phones' memory (fix/mobile-memory, Claude Code)

- **Type**: fix (perf)
- **Asked**: Kevin, 2026-11-06: "and then deploying it! also it crashes on mobile a lot".
- **Base**: production `kevinliu-studio-35wc6c87l` serves exactly a build of `origin/main` 0d8fb9d (home HTML
  byte-identical, same 13 `?v=` addresses); `perf/no-pops` is the same code plus a memory.md note.
- **Found** (WebKit at iPhone 14): 189 MB of canvas on the wall (a 4096 shared WebGL canvas plus 52 card canvases kept
  off screen), about 190 MB of WebContent in filter buffers (the cracks' glow covers each card), the next pack rastered
  in 3D on the stage, all pictures decoded at idle, the battle's preloaded clips never released, and the wall and the
  battle kept alive in the back-forward cache.
- **Changed**: `scripts/phone-memory.mjs` (`PHONE` patches to ground.js, rituals.js, kit.js, applied by the sync after
  `TRANSFORMS` or on their own, with the lock updated; the guard fails a build without them); `index.astro` (lazy
  pictures on touch, `data-far` filters); `site.css`; `Release.astro` on the wall and battle; `scripts/memory/` (the
  soak harness); docs/performance.md Memory, docs/sync.md, AGENTS.md.
- **Measured**: docs/performance.md, Memory. iPhone 14 WebContent peak 739 → 471 MB, GPU peak 1,208 → 882 MB, canvas
  187 → 43 MB; settled wall GPU 820 → 540, WebContent 345 → 180 MB. No crash in any soak.
- **Open**: the Arena holds about 400 MB of WebContent and two WebGL contexts (r4/play board and kit); `pnpm check`
  fails on main already (astro check does not support TypeScript 7); not pushed or deployed: Kevin's call.
- **Checked** (2026-11-07, preview `kevinliu-studio-7lpwp37lc` and local dists of 4df1e39 and 0d8fb9d side by side):
  memory, layout, cards, battle and code review, each failure adversarially verified; nothing blocking. CLS 0 at 1440
  and 390; all card interactions and both battles pass with no new console errors; every lock hash and patch
  reproduces. Same-run 820 s soak: wall WebContent fix 307 → 864 vs before 538 → 1,272 MB, GPU peak 1,046 vs 2,012 MB;
  the low-memory warning released both, so "levels off" in docs/performance.md now reads "rises more slowly".
  Known, not blocking: on touch a fast jump shows a card's art up to about 1 s late (lazy pictures); on desktop a
  long jump can paint one or two frames without card filters (`data-far`). Not covered: real Safari's
  back-forward cache (Chromium's real cache path passes). Harness: Relay's playwright-core is now 1.63 (needs
  webkit-2359, not installed); use Prototemplate's 1.62.1, and soak.mjs counts other agents' WebKit processes.
- **Shipped** (2026-11-07): Kevin said "approved all". Rollback target `kevinliu-studio-35wc6c87l` (docs/deploy.md).

## 2026-11-07: search, answers and share cards (seo/aeo, Claude Code)

- **Type**: feature (SEO, AEO, GEO)
- **Asked**: Kevin, 2026-11-07 02:28: "massively improve my seo and geo and aeo and include more about myself in the
  llms.txt. also use og:images in all my links. and make more links!"
- **Changed**: `src/lib/schema.ts` (one JSON-LD `@graph` per page: WebSite, Person, the page, BreadcrumbList, the
  card's project with SoftwareSourceCode for public repos, the battle's VideoGame); `src/lib/share.ts` and
  `pages/share/[name].jpg.ts` (share images for /about, /cards, /battle, /battle/arena and the 404, built from the
  cards' own share images and Katagami Sans via satori and sharp; `src/share/*.ttf` instanced from the site face);
  `/cards` (a plain index; its old redirect to `/` is gone); card pages open with "<Card> is ...", link the battle
  with that card leading and three related cards, and link only repositories a visitor can open (`CLOSED` in
  `cards.ts`); `site.ts` `FACTS` and `ALSO_KNOWN_AS` with sources for llms.txt's About section; `/about` asks two
  questions its own words do not answer; footer links `/cards`, the page's twin and llms.txt; `.md` twins carry a
  canonical `Link` header; sitemap `lastmod` from git, left out where a shallow clone cannot date a page;
  `scripts/check-seo.mjs`; the guard checks share image size and alt and the graph. `docs/seo.md`.
- **Checked**: build and guard; `smoke.mjs` and `check-seo.mjs --external` against a local serve of dist that applies
  vercel.json's routes; Lighthouse SEO 100 on `/`, `/about`, `/cards/claude-of-tanks`, `/cards/atlas`, `/cards`;
  a card's battle link starts that team; an eight-agent adversarial review (wf_aacfd7cb-5f4), every confirmed finding
  fixed.
- **Open**: seven card repositories are private (Agent Pets, bday.land, Powerlifting, Elo, Kevin Wiki, Sandbox
  Arena, 050525) and the card face (r4/ex markup.js `NOLINK`) still links their commits, a 404 for visitors: fix in
  the rounds; Kevin to strike any `FACTS` line; Search Console and Bing submission; set `VERCEL_DEEP_CLONE` if every
  page should carry a `lastmod`.
