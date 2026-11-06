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
