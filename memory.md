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

## 2026-11-07: the Machine view aligned to the page (machine/aligned, Claude Code)

- **Type**: feature
- **Asked**: Kevin, 2026-11-07 02:28: "make a whole new custom machine view with aligned ui to actual ui areas like the
  human | machine button".
- **Designed**: three directions built and screenshotted, then scored by three independent judges (wf_1c1252f9-c2b):
  Source in place (the room written out) won 2 of 3 over Wireframe CRT and Response mapped; grafts from both.
- **Changed**: `src/lib/machine.ts` (records and twin blocks, from twins.ts, cards.ts and site.ts), `src/styles/
  machine.css`, `workType` in `src/lib/schema.ts` (the records and the JSON-LD read one type and category), the
  header, footer, home, card, about, cards and 404 pages; `Machine.astro` removed. docs/architecture.md, Machine view.
- **How**: each machine form is nested in the element it describes and built at build time, so it keeps the real grid
  at every width with nothing measured. Human mode hides the forms with `!important`, so its first paint is unchanged.
  Links keep their addresses; the switch shows the `Accept` each half asks for.
- **Checked** (WebKit, local serves, origin/main ae3cc56 against this branch; the merge also against seo/aeo 8a068df):
  the human view is pixel-identical at 1440, 730, 390 and 320 on home, a card, about and 404 (a card's own sparkles
  differ between runs at most); switching shifts nothing (CLS 0, input shifts included), no horizontal scroll; the
  header, seg, pockets, dock and footer keep their boxes on home at every width; keyboard switch, aria-pressed and the
  stored mode work; screen readers read each record as text. build, guard, check-seo pass; smoke differs only on
  Vercel's own headers and redirects, as origin/main does on the same server.
- **Memory** (iPhone 14, WebKit, same run, two rounds): Human mode equal (wall WebContent 215 to 224 against 217 to
  243 MB, pictures 85.7 MB both). Machine mode: pictures equal (48.5 MB) after two fixes (cards out of layout, the
  pack's fan paints no posters; before them 64.7 MB), canvas equal or lower, WebContent 64 and 68 against 52 and 56 MB
  on the wall and 23 against 18 on a card page: the old Machine view hid the whole page.
- **Open**: the battle pages have no Machine view (needs a key in r4/play's rail and engine state outside `?debug`);
  text blocks on card and about pages grow where their Markdown is longer, so blocks below them move; the footer's
  addresses take more rows on phones; on phones the way back to Human is the footer's button; the Machine view's
  12 MB of WebContent over the old one.

## 2026-11-07: the 11-07 release held at the ship checks (release/11-07, Claude Code)

- **Type**: release (not shipped)
- **Asked**: Kevin, 2026-11-07 02:28: "get all our work assembled and get it out tomorrow morning". Approval to push
  `main` was conditional on no ship check finding a blocking problem.
- **Assembled** on release/11-07 from origin/main ae3cc56: b4f6ac5 (the sync ships the round page's whole closure, so
  the wall prints every card in its family frame; the guard fails a card without data-fam), the seo/aeo merge 71ff418,
  card syncs e20dac4 (rounds a2fbdac5) and d08e221 (Breakout, rounds 30e69931), the machine/aligned merges 5062ab2 and
  d75be4a, e553832 (the lock's head is marked dirty only for shipped files). Battle and sound unchanged: battle-r4b
  stalled, so the 26-card battle goes to the next release.
- **Checks on d08e221** (wf_fb58adf9-a39): battle, review, SEO pass; Machine minor only. Blocking: iPhone 14 wall
  memory (GPU grew each visit and stayed held, lit frame SVGs), the lens's frame row ran off a phone and showed
  design-lane working names, and family K's rule struck through power text in WebKit.
- **Fixed** in the sync config: ae535dd (phones print unlit borders via data-unlit, phone-memory.mjs and the wall's
  boot; the frame row hidden; the K rule dropped), 8ea1bfb (the phone tray caps at the screen and its art row wraps).
- **Recheck on 8ea1bfb** (wf_858f2a41-0a3): GPU is given back again and every tray control is whole at 320 to 1440.
  Still blocking: (1) iPhone 14 wall WebContent stays about 250 MB over production and passes 600 MB by the 2nd visit
  (release 682 against 405 at the 3rd); the blank-frames diagnostic puts it on the unlit border and fxcut frame SVGs,
  the frames themselves. (2) In WebKit the five family B cards (Claude of Tanks, Glyphfield, Princeton TD,
  Prototemplate, Ariadne) clip the bottom of their power names on the wall (5.35 px overlap against production's 2.02);
  it came in with the card sync and is a rounds card.css matter.
- **Open**: production stays ae3cc56 (deployment kevinliu-studio-80cvqzld0). Kevin decides how phones print frames
  (desktop-only frames, frames baked to display-size WebP in the rounds, or accept the memory), and the rounds fix
  family B's names in Safari. Minor: phones still fetch 14 lit SVGs before the swap; card pages keep lit frames on
  phones; the phone tray sits 4 px from the edge, not 8. Previews: ogc2ob923 (d08e221), 3pfmvpkrz (8ea1bfb).
  Evidence under ~/k7-rescue/release-11-07/checks/.

## 2026-11-08 · fix · Private-repo commit links on the card faces, and a comma inside a Machine link

- **Changed**: `src/lib/closed-repos.mjs` (new), `src/lib/cards.ts`, `scripts/sync.mjs`, `public/ex/markup.js`,
  `public/battle/vendor/cards/markup.js`, `sync.lock.json`, `src/lib/machine.ts`, `docs/seo.md`.
- **Why**: the card faces' pinned-commit links pointed into 7 repositories GitHub answers 404 for without a sign-in
  (Agent Pets, bday.land, Princeton Powerlifting, Elo, Kevin Wiki, Sandbox Arena, 050525); the rounds' `NOLINK` named
  only loop, bday-land and kevin-wiki. Loop's repository and pinned commit are public now (200, checked 2026-11-08).
  The Machine view's address linker also took a following comma into the Atlas receipt's live URL, a 404.
- **Decisions**: one list, `CLOSED` in `src/lib/closed-repos.mjs`, read by `repoOf` and by a sync transform that
  rewrites each synced `markup.js` `NOLINK`. The two synced files were patched once by that same rewrite with their
  sync.lock.json records updated (the rounds had moved on, so a full `pnpm sync` would have pulled unrelated changes);
  `pnpm sync --check` does not list either markup.js. The linker now ends an address before trailing `.,;:!?`.
- **Checked**: `pnpm build`, verify-build (32 pages), smoke and `check-seo.mjs --external` (134 links) against a local
  serve of dist.
- **Open**: when a private repository goes public, remove it from `CLOSED` and run the sync.

## 2026-11-08: the 11-07 release promoted (release/11-07, Claude Code)

- **Type**: release
- **Decisions**: Kevin, 2026-11-08: "Desktop-only frames" (phones keep plain cards; fix family B names in Safari,
  recheck, promote if it passes). Kevin, 2026-11-08, on the Agent Pets art: "optimus prime and kratos stay, they are
  great"; it is not a release issue.
- **Since the hold**: 018faee prints each card plain with its framed print in an inert `<template class="framed">`;
  the inline FRAMED script swaps it in on a fine pointer with deviceMemory above 4 and drops it elsewhere (the
  data-unlit path is gone). 768a8b3 fixes the Safari text crowding at its cause: WebKit resolves cqw inside grid track
  sizes against half the card, so trait and move rows are `auto auto` and the foot's columns are percentages of the
  86.4 cqw foot (production's Safari foot overflowed 13 to 48 px and drew "×1.5" over the resist icons). 907a0c8 merges
  243f448 (no commit links into private repositories). The card syncs came from an export of rounds 30e69931 with
  `ROUNDS=`, because a plain `pnpm sync` pulled 102 post-cutoff rounds files; those went to Trash unreviewed.
- **Recheck3 on 907a0c8** (wf_de5811d0-356, preview nnslah504): memory, layout, cards and review pass with nothing
  blocking. iPhone 14 wall WebContent peaks below production (324 against 392 MB); phones print 26 plain cards with no
  frame SVG requests.
- **Rollback**: production deployment kevinliu-studio-80cvqzld0 (main ae3cc56), docs/deploy.md.
- **Open (next release)**: phones still load frames.gen.js, frames.js and printings.js (77 KB, unused there); desktop
  fetches the plain -fx.webp posters before the swap; the HTML carries every card twice (49 KB gzipped against 40);
  Glyphfield's "Motion Study" y loses about 1 px under its band in Chromium; family Y's last move panel touches the
  foot by 0.6 px; the guard's framed-twin check is page-wide, not per card; sync should pin a rounds commit; the
  card page's hidden .tohuman has aria-pressed=false. The 26-card battle and new sound still wait on battle-r4b.

## 2026-11-08: the Machine view as a terminal (machine/next, Claude Code)

- **Type**: fix + feature
- **Asked**: Kevin, 2026-11-08: "continue everything", then "nno the machine view should literally look like a terminal
  where everything is ascii ified".
- **Correction** to the 2026-11-07 entry: "switching shifts nothing (CLS 0, input shifts included)" was measured in
  WebKit, which reports no layout-shift entries, so it was never measured. The release check (wf_fb58adf9-a39) measured
  it in Chromium: 0.01 to 0.18 on desktop and 0.12 to 0.97 on phones on card, About and /cards pages, all of it
  input-flagged. `scripts/machine-check.mjs` now measures shifts only in Chromium (`ENGINE=chromium`, without WebGL)
  and prints "not measured" in WebKit.
- **Changed** (9bf3dea): a swapped region keeps its human layout, hidden, and lays its machine form over the same box;
  `fit()` in Base.astro uses the room below up to the next element and shrinks the text (10 px, 9 under 640) until it
  fits, siblings of one kind sharing the smallest size. An address stops before a comma (the Atlas 404, the same regex
  as seo's 243f448). A skip link to the other view on phones. The check script's stored-mode and fixed-dock mistakes.
- **Changed** (ac86230): the terminal. Katagami Mono subset (21.7 KB, from ~/repos/Katagami 0fae3a0, OFL), fetched at
  idle after a Human page loads and preloaded on a Machine load, `font-display: block`; frames in box-drawing
  characters (`.bx`); bracketed controls and inverse video; each card's art as text in its colour from
  `media/<id>/pop.webp` at build (`src/lib/ascii.ts`, sharp); headings, lead lines and the brand laid over their own
  boxes (`.hw`); a card page's lists as one framed panel each (`.sl`).
- **Checked** against the released build 4071fa6, local serves: Chromium layout shift 0 while switching on home, a card,
  About, /cards and 404 at 1440, 730, 390 and 320, no box moving, nothing overflowing or scrolling sideways; the human
  view pixel-identical in WebKit and Chromium on all 20 pairs; build, guard, check-seo pass. iPhone 14 memory, same
  run, two rounds: wall WebContent Human 244/244 against 247/218 MB, Machine 68/71 against 69/61; card page Human
  38/37 against 36/34, Machine 26/26 against 22/22; pictures and canvas equal. HTML: home 43.5 to 50.6 KB gzip.
- **Open**: the battle pages' Machine view (a switch in r4/play's rail; engine state is readable without `?debug`
  through `window.showdown` and the address); Kevin to look at the terminal; not merged into a release.

## 2026-11-09: the next release assembled and checked (release/next, Claude Code)

- **Type**: release (candidate, not pushed)
- **Asked**: the release session (from Kevin's 11-08 queue): battle round 5 with sound, the Machine view as a terminal
  (Kevin, 11-09, on the look: "Looks right"), the cleanups listed under "Open (next release)" above.
- **Assembled** on release/next from origin/main cc54526: aa2fa26 (machine/next, a fast-forward), 0a225f9 (battle round 5
  from rounds 42ff51c7, r4/play only; sync pins per stage; the guard pairs each card with its own template), 9308b05
  (card cleanups), 84ccb1c and 1eb1c0f (ship-check fixes). Synced from ~/k7-rescue/release-next/rounds-42ff51c7 (the
  11-07 export of 30e69931 with r4/play from git archive 42ff51c7); the lock records the checkout, head and pins.
- **Cleanups**: the framed template now holds only what the framed print adds and points at the rest (`<b data-same>`
  paths, rebuilt and compared at build; home 455 to 338 KB raw, about 2 KB less gzipped, 117 KB less HTML parsed on a
  phone); frames.gen.js and frames.js no longer load anywhere (the frame row is hidden on every device; printings.js
  stays, phones' art row uses it, so the 11-08 note's 77 KB was 70); desktop fetches no -fx.webp (data-plainfx; lazy
  alone did not stop Chromium); the guard's template check is per card; the sync pins a rounds commit per stage and a
  file the pin lacks ships only as the lock records it (`--admit-unpinned`).
- **Ship-check fixes**: the battle rail under 360 px (Leave ran 15 px off at 320); sound.js's unlock() before any gesture
  no longer fetches the kit (~240 files, 2.3 MB on /battle, a round bug the round's own page shares); FRAMED keeps the
  plain print if a path fails; fit()'s checkVisibility guard.
- **Checked** (Agent checks, every finding adversarially verified; evidence ~/k7-rescue/release-next/checks/, log
  STATUS.md there): memory, layout, cards, battle, review on 9308b05, then a recheck and a memory recheck on 1eb1c0f.
  Nothing blocking. Desktop framed and phone walls 0 px from production; CLS 0; the Machine switch moves nothing; all
  26 lenses whole at 320 to 1440; auto matches finish in Mat and Arena at 1440 and 390; iPhone 14 wall WebContent within
  1.5% of production, GPU spikes noise (5 pairs, p 0.62); battle WebContent -1% to +20% of production with no tap, about
  +100 to 150 MB once a tap loads the sound kit (under 600 MB), GPU at or below production. Not real: "the speed setting
  does nothing" (the harness timed with pace.js's patched performance.now; 2x is 1.9x faster in real time).
- **Preview**: kevinliu-studio-doha0b2ro (dpl_Hb8Nt8pWpz2puvDdkKLYh8rFvdzt), git archive of 1eb1c0f; smoke and
  check-seo pass. Rollback target: kevinliu-studio-ai52pppxd (cc54526).
- **Open**: pushing main needs Kevin's yes. Minor, not blocking: the battle defines 17 icon ids twice (identical
  copies); with ?auto=1 and no gesture the battle still fetches each scene's cues (34 files, 216 KB in 20 s); the
  rounds should take the sound.js and 320 px rail fixes upstream; the 26-card battle still waits on the kit rebuild.
- **Shipped** (2026-11-09): Kevin said "Yes, push main". main fast-forwarded cc54526 to f0feb6b; production deployment
  kevinliu-studio-r0tt2e1aa is Ready on www.kevinliu.studio, www.kevinliu.biz and www.kevin-liu.tech; smoke passes on
  www, and live / and /battle are byte-identical to the checked build of 1eb1c0f. Rollback target
  kevinliu-studio-ai52pppxd (cc54526).

## 2026-11-09: the site in eight languages with General Translation (feat/i18n, Claude Code)

- **Type**: feature (branch, not pushed or deployed)
- **Asked**: Kevin, 2026-11-09: "i also want my website to be internationalized with GT" and "you have api keys just use
  em with a new project using gt cli".
- **GT project**: a new project, **kevinliu.studio** (prj_i3sf0ks7nnj2gtm95aexc481), created with the gt CLI's API in
  Kevin's "Random Projects" organization (his "Kevin-GT" organization was at its plan's project limit). Its project key
  is only in the worktree's gitignored `.env.local`; no gt-cloud project or key was touched. The build needs no key, so
  Vercel has none and needs none.
- **Languages**: English at the root, unchanged; es, fr, de, pt (pt-BR), ja, ko and zh (zh-Hans) under their codes.
  `src/i18n/locales.mjs` is the list. docs/i18n.md is the procedure and the reasons.
- **Translated**: every page (home, /cards, 26 card pages, About, 404, battle Mat and Arena), metadata and JSON-LD,
  hreflang and og:locale alternates, the sitemap's xhtml alternates, html lang, header, footer, Machine view, every
  Markdown twin, llms.txt and llms-full.txt per language, the wall's lens sheet, dock, pack and runtime labels
  (`/<code>/gallery.js`), and the battle page's own frame.
- **English on purpose**: names (Kevin's, products, companies, cards, moves, traits), receipts and code, the card
  faces (fitted to Katagami's Latin advances at build), the game inside the battle (r4/play builds its HUD, tooltips,
  narration and cutscenes in English inside ~850 KB of round code: string tables belong in the rounds), credits.
- **Faces**: accented Latin 10 KB and Katagami CJK subsets (ja 260, ko 63, zh 237 KB) cut by `scripts/i18n-fonts.py`
  from ~/repos/Katagami b648dbb; unicode-range, preloaded, content-addressed. English pages declare none.
- **Checked**: `pnpm build` (256 pages, 248 sitemap URLs; the guard now checks every language, hreflang, html lang and
  that a translated page prints only characters its faces hold), check-seo on the local build (249 pages, 490 links),
  English twins and llms files byte-identical to the base build, English HTML differing only by the alternates and the
  language key. Browser (built-in, local serve): es, fr, de, ja at 1440, 390 and 320: CLS 0 on the wall, card pages,
  About and the Machine switch; no page wider than its screen; lens address, labels and status lines in the language;
  battle rail fits at 390 and 320 in every language. iPhone 14 probe (WebKit, pages mode): translated pages' WebContent
  within English's (wall 197 to 208 against 222 MB, card 34/33, About 20 to 22/19, battle 176/201), canvas, WebGL and
  pictures identical; CJK faces add 2 to 3 MB.
- **Found on the way**: the header at 640 to 680 px with touch-size keys was already a few px too wide in English; the
  language key therefore sits in the header from 800 px and in the footer below. `astro check` refuses TypeScript 7.
- **Open**: the battle's in-game text needs string tables in r4/play; a `pnpm sync` that changes card words needs
  `pnpm i18n:translate` and `python3 scripts/i18n-fonts.py` (the changed strings print in English until then).
## 2026-11-09: one set of content rules for the sync and the guard (improve/001-scan-rules-module-and-tests, Claude Code)

- **Type**: fix
- **Files**: scripts/rules.mjs, scripts/rules.test.mjs (new); scripts/sync.mjs, scripts/verify-build.mjs, package.json,
  docs/sync.md, scripts/SKILL.md, AGENTS.md, memory.md.
- **Why**: the sync's scan and the release guard each had their own copy of the rules and the copies had drifted; names
  written with entities, escapes, accents, hyphens, underscores, odd spaces or "dex" passed, and file names were never read.
- **Checked**: `pnpm test` 8 pass, 0 fail; `sync.mjs --check` against rounds-42ff51c7 prints `in sync`; `pnpm build` ends
  `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass`; a probe file holding `General&nbsp;Translation`
  in a copy of dist fails with exit 1; no change under public, vendor or sync.lock.json.
- **Open**: plans 002 and 003 also edit scripts/sync.mjs.

## 2026-11-09: the sync stops when a patch never met its file (improve/002-sync-fails-on-unapplied-patches, Claude Code)

- **Type**: fix
- **Files**: scripts/sync.mjs, scripts/phone-memory.mjs, docs/sync.md, memory.md.
- **Why**: a renamed file dropped its TRANSFORMS, PHONE or BINARY patch silently (the two picture paint-outs are invisible to any text scan); the standalone phone-memory run could leave a file patched and the lock wrong; pageHead dropped tags it could not read.
- **Checked**: `sync.mjs --check` against rounds-42ff51c7 prints `in sync`; a temporary patch key for a missing file fails with exit 1 and the new message, then removed; `phone-memory.mjs` and `--check` exit 0 with no file changed.
- **Open**: none.

## 2026-11-09: every build checks the synced folders against the lock (improve/003-lock-integrity-check, Claude Code)

- **Type**: feature
- **Files**: scripts/lock-check.mjs, scripts/lock-check.test.mjs (new); scripts/sync.mjs, package.json, docs/sync.md, scripts/SKILL.md, memory.md.
- **Why**: nothing enforced "never edit the synced folders by hand" without the rounds folder; a hand edit, a stray file or a stopped sync's .tmp would build and deploy. The sync also removed any path the previous lock named, and wrote the lock in place.
- **Checked**: `node scripts/lock-check.mjs` passes on 3024 files and fails on a stray file in public/ex (removed after); `pnpm test` 10 pass, 0 fail; `sync.mjs --check` against rounds-42ff51c7 prints `in sync`; `pnpm build` runs lock-check first.
- **Open**: AGENTS.md's agent-docs auto block still prints the old build script until `agent-docs scaffold` is rerun.
## 2026-11-09: a cue before the context is unlocked fetches nothing (plan 005, Claude Code)

- **Type**: fix
- **Changed**: `scripts/sync.mjs` (two pairs on the sound.js entry), `public/sound/sound.js` and `sync.lock.json`
  (rewritten by the sync), `docs/sound.md`, `docs/sync.md`.
- **Why**: on /battle the player makes its context at load (resumeAtLoad), so cues played before any gesture (the deal,
  the leads' entrances) passed playCue's check, fetched and decoded files, and were dropped by the suspended context.
  playCue and stinger now return unless the context is unlocked.
- **Measured** (production build, local preview): /battle with no input, 25 s: 0 files under /sound/out/ (plan baseline:
  10); after one click on #app: 127. Home page, a real mouse down/up on the first card (two presses, 8 s): 69 files
  loaded on the unpatched sound.js and 69 on the patched one, 0 before the press.
- **Check note**: the plan's home-page check (`agent-browser click ".wall .card"`, then count resource-timing entries
  under /sound/out/) cannot tell fixed from broken: that click did not reach a card press, and the home page's many
  images fill the 250-entry resource-timing buffer, so late sound requests never appear in it. The check that works is a
  real mouse move/down/up at (196, 250) (`agent-browser mouse move|down|up`) and `Object.keys(Sound.stats().files).length`.
  The /battle counts are unaffected (127 after the click shows the buffer was not full there).
- **Open**: the rounds should take this upstream (the request in plan 005).
## 2026-11-09: Markdown negotiation and framing headers (improve/004-markdown-negotiation-and-headers, Claude)
- **Type**: fix
- **Changed**: vercel.json (Accept rule on the two negotiation routes: Markdown only when `text/markdown` precedes any `text/html` and is not `q=0`; dropped the `.md` Content-Type route so a missing `.md` is a plain 404; `Vary: Accept` moved to the six negotiated page routes; `Content-Security-Policy: frame-ancestors 'self'; base-uri 'self'; object-src 'none'`), scripts/check-negotiation.mjs (new), scripts/smoke.mjs (new cases), src/lib/twins.ts (llms.txt sentence), docs/deploy.md.
- **Checked**: `node scripts/check-negotiation.mjs` prints `negotiation: 2 routes, 16 cases pass`; `pnpm build` ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass`; dist/llms.txt and llms-full.txt carry the new sentence; no dist page has iframe/object/embed, and every `<base href>` is a same-origin path.
- **Open**: not deployed; the preview smoke (`node scripts/smoke.mjs <preview>`) has not run, so the Accept rule, the 404 type of a missing `.md`, `Vary` and the framing header are checked only by `scripts/check-negotiation.mjs`.
## 2026-11-09 · perf · No battle prerender and no opening cast ahead of a press on a phone (improve/010-wall-phone-no-prerender, Claude Code)

- **Changed**: `scripts/phone-memory.mjs` gains a `PHONE` entry for `public/ex/gallery.js` (no speculationrules prerender of
  the battle on a touch screen or `deviceMemory <= 4`) and two pairs for `public/ex/rituals.js` (the two idle `warm()`
  callers only `probe()` there; the press path, `pointerenter`/`focus` on `#play` and `entry()`, is untouched). Synced
  files `public/ex/gallery.js`, `public/ex/rituals.js` and `sync.lock.json` came from the sync, not by hand.
  `scripts/memory/soak.mjs` pages mode now also records `contentSumMB`. docs/sync.md and docs/performance.md updated.
- **Measured** (Pixel 7 profile, wall with teams in the address, median of 3, Mac at load average 340+): renderers sum
  179 to 171 MB, largest renderer 155 to 147 MB, GPU 535 to 430 MB, glLive 1 both. Desktop (fine pointer) still gets
  the `#prerender` rule (agent-browser: coarse false, rule true).
- **Open**: the rounds' room lane has the same change as a request (plans/010).
## 2026-11-09, fix: a battle link that cannot start says why and never leaves the page hidden (plan 008)
- **Files**: scripts/sync.mjs (six pairs on battle.js, one board.js entry), public/battle/shared/battle.js, public/battle/arena/board.js, sync.lock.json, src/components/BattlePage.astro (8 s backstop script), docs/battle.md, docs/sync.md.
- **Why**: a bad address (unknown card, old log) started the default hand with the alert erased in the same task; `#mode=constructor` / `#map=constructor` passed the own-key-less checks and left the page hidden; any boot-path rejection left a blank page.
- **Checked** (preview on port 43850, built dist): mode=constructor -> visible, entrance, no error, mode=mat in hash; Arena map=constructor -> visible, live, no error; team=nope,nope,nope -> visible, live, error ends "Playing the default hand.", default team in hash; ?fixture=9 -> visible, error starts "The battle could not start"; plain /battle -> visible, no error; simulated late error -> visible, "The battle could not start. Reload the page, or Leave." after 9 s. pnpm build: all checks pass.
- **Open**: the upstream request to the rounds' play lane (r4/play shared/battle.js and arena/board.js); the i18n branch needs keys for the three new sentences.

## 2026-11-09: Machine view keeps headings and the home link for screen readers (improve/007-machine-view-headings, Claude)
- **Type**: fix (accessibility), plan 007, cut from feat/i18n cac5d2b
- **Changed**: `src/styles/machine.css` (headings cleared with `color: transparent`, not `visibility: hidden`; skip-button rule uses `data-mode-go`), twin `<p class="mx">` after each heading `aria-hidden` in `src/views/{About,Cards,NotFound,Card}.astro`, brand link always labelled `frame.brand` in `Header.astro`, one-way view buttons in `Footer.astro` and `Base.astro` are `data-mode-go` without `aria-pressed` (the click script and its view picker accept both attributes), `docs/architecture.md` bullet.
- **Checked**: `pnpm build` 256 pages, 248 sitemap URLs, all checks pass, no untranslated strings. Twin-line greps on English and es pages: about 0/3, cards 0/1, 404 0/1, cards/atlas 0/5. Buttons on about (en and es): 4 `data-mode-go`, 0 with aria-pressed, 2 `data-mode-set`. Accessibility snapshot, Machine view: /about 3 headings (0 twin text), /es/about 3, /cards/atlas 5, home link named "Kevin Liu, every card", 0 `pressed` on the card page; /es/about screenshot shows the title once. machine-check (chromium, playwright-core from Prototemplate-wt-jaw-1103): layout shifts 0 and 0 differing pixels everywhere; 8 pairs report movedCount above 0 (home 390/320, about 390/320, card 1440/730/390/320), all identical in selector and count to a baseline run on cac5d2b, so they are pre-existing (header .seg buttons at 390/320; .card, .cp-facts li[4], .cp-moves li[4] on the card page). Baseline home-730 timed out on reload (load); 007's home-730 moved 0.
- **Open**: the footer's and the skip links' view buttons are now `data-mode-go`; on the home page they play the plain tap sound (gallery.js's mode sound is bound to `data-mode-set`); not checked with VoiceOver; the plan's strict movedCount gate fails on cac5d2b itself (pre-existing, to be looked at separately).
## 2026-11-09: A phone keeps the Pick Three team when it comes back to the wall (improve/006-phone-keeps-team-after-back, executor agent)

- **Type**: fix
- **Changed**: `src/components/Release.astro` (on a return from the back-forward cache the wall writes the dock's team into its address, then reloads as before; gallery.js restore() reads it), `scripts/check-release.mjs` (new, runs the built inline script under node:vm), `docs/performance.md` (Memory table row).
- **Checked**: `pnpm build` ends `verify-build: 32 pages, 31 sitemap URLs, 3099 files: all checks pass`; `node scripts/check-release.mjs` prints `release: 5 cases pass` on dist/index.html, dist/battle.html and dist/battle/arena.html. The check fails (2 cases, exit 1) against the old script. Browser check ran (playwright-core Chromium, iPhone 14 context, matchMedia coarse true, pageshow persisted sent by hand; agent-browser not used because its device mode gives no coarse pointer): after Gallery.toggle of katagami and mailroom the hash was empty; after the event the page reloaded to `/#you=katagami,mailroom&rival=&seed=N` with __table.you = katagami, mailroom.
- **Open**: not checked on a real iPhone or in a real back-forward cache; a lens left open (`/cards/<id>` in the address) still returns to that card's page.
## 2026-11-09: the battle gives back shader worlds and warm-up bytes on a phone (improve/009-battle-phone-memory, Claude Code)

- **Type**: perf
- **Changed**: `scripts/phone-memory.mjs` (two `PHONE` entries), `public/battle/shared/runtime.js` and
  `public/battle/shared/battle.js` (by the sync), `sync.lock.json`, `docs/performance.md`, `docs/sync.md`.
- **Rationale**: a visit kept one WebGL2 context per card with a world and every warmed clip's Blob, and the cards' live
  prints ran behind the result and the Log. A touch screen or small-memory device now keeps two worlds, the warm-up keeps no
  bytes, the prints pause at the result and under the Log.
- **Measured**: 150 s Auto battle, Chromium with the iPhone 14 descriptor (coarse pointer true): stage canvases 3 → 2.
  WebKit soak (pages only): glLive 2 → 2; contentMB and gpuMB moved with machine load. Pause check: true under the Log,
  false after.
- **Open**: the upstream request to the play lane (r4/play/REQUESTS.md): cap kept grounds, `fetchOnce` resolves to true,
  `groundG.paused` at the result and Log; the reviewer appends it.


## 2026-11-09 — the eight-language release candidate (ship check)
- **Type**: release (release/next, not pushed)
- **Asked**: Kevin, 2026-11-09: "Ship-check it" (the i18n branch); "Next release" for the ten P1 audit fixes, asked
  again directly after other sessions relayed "yes" — so this release is i18n only; improve/p1-on-next a1ff84c (and
  feat/i18n 4025230 on top of it) is the next release's base.
- **Candidate**: c6245d9 + feat/i18n (cac5d2b) + 01f51d4 + 0d3af36 + b1bf077 (the i18n session's layout fixes,
  cherry-picked from f2ff841, tree equal to its 2ba20de on 0d3af36) + the mid-width header spacing.
- **Found and fixed**: on Vercel /es etc. served es/index.md (a language home's twin sits in a folder named like the
  page; vercel.json routes /<code> to /<code>.html ahead of the filesystem step); es and pt froze the tab after the
  first Open Pack (the shim's "Rival: {list}" rule matched its own output: nodes now remember what the shim wrote);
  battle pages lost their favicon; ja/ko twin links swallowed the next words (<url>); edited English sources shipped
  old translations (the build now stops when en/{ui,content}.json differ from gt-lock.json's versionId); the footer
  language list ran off phones; CJK overflowed 640 to 875 px; battle console labels overflowed at 320; French é fell
  back on battle pages; iOS taps outside did not close the list; nowrap nav words then overflowed translated headers
  at 640 to 700 and 800 px (translated headers tighten gap and key padding from 640 to 879 px).
- **Checked**: build guard, preview smoke.mjs and check-seo.mjs, iPhone 14 memory (translated pages within English
  production's numbers; each page fetches only its own face), layout in Chromium and WebKit (English unchanged except
  the language key; every language clean from 600 to 1100 px and at 390 and 320), the wall's pack flow in six languages
  (no hang, 20/20 pings), card framing 26/26, translated battles to their result, sound gate 10 files before a tap.
  Evidence: ~/k7-rescue/release-next/checks/i18n-*, final-widths.
- **Shipped** (2026-11-09): Kevin said "Yes, push main". main fast-forwarded c6245d9 to d3fc558; production deployment
  `kevinliu-studio-bpspo4ajg` (dpl_oa7hzrbwF1xYPd1HUtb4EZRDtLZs) Ready on www.kevinliu.studio, .biz and kevin-liu.tech;
  smoke.mjs passes on www; live /, /es, /ja, /ja/about, /de/battle, /fr/cards/katagami and /battle byte-identical to
  the checked build. Rollback: `kevinliu-studio-5o2libd3l` (c6245d9), docs/deploy.md. This record is committed on
  release/next and not pushed (a push would redeploy the same site); it ships with the next release.

## 2026-11-10: Striking a fact no longer puts the wrong answer under a question on /about (improve/p2-checks, plan 011)

- **Type**: fix
- **Changed**: `src/lib/site.ts` (`FACT_LIST` with a `q` per fact, `factsFor`, the one `QA`), `src/lib/twins.ts` (reads `QA`),
  `src/i18n/source.mjs` (reads `QA`), `scripts/facts.test.mjs` (new), `docs/seo.md`, `src/lib/SKILL.md`.
- **Rationale**: the two answers were picked from `FACTS` by position (`FACTS[3]`, `FACTS[4]`, `FACTS.slice(5)`), in two files, so
  deleting an early line moved every later answer. Each fact now names its question; a question left empty stops the build.
- **Checked**: every built page, twin and text file (523) is byte-identical to before; `node scripts/i18n-extract.mjs --check`
  passes, `content.json` unchanged; `pnpm test` 13 tests, 0 fail (10 before); a positional mutant fails the strike test.
- **Open**: none.

## 2026-11-10: The two site faces are named by content address; a year only where the address holds the content (improve/p2-checks, plan 012)

- **Type**: perf
- **Changed**: `src/layouts/Base.astro` (both faces through `versioned()`, the Mono `@font-face` rule moved into the inline style, `data-mono` on `<html>` for the head script's preload), `src/styles/machine.css` (Mono rule removed), `vercel.json` (`/fonts/` immutable only with `?v=`; `/ex/borders` and `/ex/fx` drawings a year with `?v=`, a day without), `scripts/cache-rules.test.mjs` (new), `scripts/verify-build.mjs` (face without `?v=` fails; a `?v=` on a face or border/fx drawing must be the file's sha-256), `scripts/smoke.mjs`, `docs/performance.md`, `docs/deploy.md`.
- **Rationale**: a subset rebuilt under a plain address would sit in returning visitors' caches for a year; a year is now earned only by an address that holds its content.
- **Checked**: `pnpm build` ends `verify-build: 256 pages, 248 sitemap URLs, 3565 files: all checks pass`; all four sampled pages name `katagami-mono-site.woff2?v=9fade4c28f` and `katagami-sans-site.woff2?v=8254e26517`; no `fonts/` in `dist/_astro/*.css`; `pnpm test` 15 tests, 0 fail (the new test fails 2 of 2 on the old `vercel.json`); a corrupted `fx.svg?v=` token made the guard name `is not the file's sha-256`, and the guard passed again once the file was restored; `node scripts/check-negotiation.mjs` exit 0.
- **Open**: not deployed: the smoke check of the cache headers (`node scripts/smoke.mjs <preview>`) has not run, so Vercel's handling of the `missing` condition is unproven on a deployment; the plain picture addresses (`posters/`, `media/`) still keep a day and are not hashed; `design/` drawings carry a `?v=` that is not their own hash (a rounds matter); returning visitors fetch each face once more after this ships.

## 2026-11-10: llms.txt sections are link lists, lastmod counts what a page prints, the docs say what the code does (improve/p2-checks, plan 024)

- **Type**: fix
- **Changed**: `src/lib/twins.ts` (`intro`: facts above the first `##`, Contact as links), `scripts/verify-build.mjs` (llms.txt shape check in all eight languages), `astro.config.mjs` (`SOURCES`: battle roster and `site.ts` counted for the home page, card pages and `/about`), `docs/architecture.md`, `docs/seo.md`, `docs/battle.md`, `docs/performance.md`, `docs/sync.md`, `src/lib/SKILL.md`, `AGENTS.md` (line 11), `memory.md`.
- **Checked**: the new guard check reported 120 problem(s) (60 listed) on the old `dist/`; `pnpm test` 15 tests, 0 fail; `pnpm build` ends `verify-build: 256 pages, 248 sitemap URLs, 3565 files: all checks pass`; `dist/llms.txt` and `dist/es/llms.txt` keep 46 list lines, 4 `##` sections, all 9 facts above the first `##`; `lastmod-check.mjs` reports 7 pages match.
- **Open**: the loader is documented, not isolated; `AGENTS.md:88` (a machine-written block) and the front matter of `src/lib/SKILL.md` still say 'sandboxes' until agent-docs is rerun; Kevin may prefer the `## About` heading back in `llms.txt` (a one-line revert in `intro`, which the guard's check would then refuse).

## 2026-11-10: `pnpm check` type-checks `src/` again; toolchain pins made exact (improve/020-typecheck-and-pins, Claude Code)

- **Type**: chore, plan 020, cut from feat/i18n 4025230
- **Changed**: `package.json` (engines `24.x`, `check` is `astro check` alone, `@astrojs/mdx` removed, `@astrojs/check` 0.9.12 and `typescript` 5.9.3 exact), `pnpm-lock.yaml` (by `pnpm install`), `pnpm-workspace.yaml` (`engineStrict: true`, mdx release-age exclusion removed), `.npmrc` deleted, `tsconfig.json` (new, Astro base preset, `src/` only), `src/components/Header.astro` (`aria-pressed={i === 0 ? 'true' : 'false'}`, same two values as `String(!i)`), `docs/deploy.md`, `AGENTS.md`.
- **Why**: `astro check` could not run on TypeScript 7 (no compiler API) and there was no tsconfig; `node >=24` and `^` ranges let the toolchain move without a commit; `@astrojs/mdx` was used nowhere.
- **Checked**: `pnpm check` ends `Result (61 files): - 0 errors - 0 warnings - 5 hints` (before the fix: 1 error at Header.astro:31:81, the one the plan names). `pnpm build` 256 pages, all checks pass; built HTML, Markdown and text files compared with the pre-change build.
- **Open**: five hints left as they are (cards.ts:87, About.astro x2, Home.astro x2); AGENTS.md's agent-docs auto block still prints the old check script until the scaffold is rerun.


## 2026-11-10: a GitHub workflow runs the checks on every pull request and push to main (improve/021-ci-workflow, executor agent)

- **Type**: feature, plan 021, cut from cce834f (improve/020) with improve/011 merged in
- **Changed**: `.github/workflows/check.yml` (new), `docs/deploy.md` (one bullet under Build), `memory.md`.
- **Why**: no check ran before a build on the host. The workflow uses the pinned Node (`.nvmrc`, 24) and pnpm 11.15.1 (`packageManager`), no secret, no deploy.
- **Steps**: install, `pnpm test`, `pnpm check`, `check-facts.mjs`, `check-negotiation.mjs`, `lock-check.mjs`, `pnpm build`, then `check-release.mjs dist/index.html` (needs the built page).
- **Checked**: each command by hand in the worktree (test 10 of 10, check 0 errors, facts, negotiation 4 routes 16 cases, lock-check 3024 files, build 256 pages all checks pass, check-release 7 cases on dist/index.html and dist/de.html); the YAML parses with the expected keys and steps.
- **Open**: not pushed, so the workflow first runs on GitHub when Kevin pushes this branch; Actions minutes on a private repository count against the monthly allowance; check-facts, check-negotiation and check-release run as workflow steps, not from `pnpm test` (no test file in this plan's scope).

## 2026-11-10: the workflow calls the checks this branch has (improve/p2-checks, plan 021 follow-up)

- **Type**: fix
- **Changed**: `.github/workflows/check.yml`, `docs/deploy.md`, `memory.md`.
- **Why**: the workflow ran `scripts/check-facts.mjs`, which exists only on another branch; here plan 011's check is `scripts/facts.test.mjs`, run by `pnpm test`, so that step would have failed on GitHub.
- **Checked**: `pnpm test` 15 pass, 0 fail; `pnpm check` 0 errors; `check-negotiation.mjs` 4 routes 16 cases; `lock-check.mjs` 3024 files; `phone-memory.mjs --check` and `i18n-extract.mjs --check` exit 0; `check-release.mjs dist/index.html` 7 cases pass; the YAML parses with the expected keys and nine run steps.
- **Open**: not pushed, so the workflow has never run on GitHub; the action majors (checkout v7, setup-node v7, pnpm/action-setup v6) were read from GitHub's releases API and are untested until the first run.

## 2026-11-10: one JPEG reader, share-tag check and HTTP helper for the guard and the deployed checks (improve/p2-checks, plan 025)

- **Type**: refactor
- **Changed**: `scripts/lib/checks.mjs`, `scripts/lib/http.mjs`, `scripts/lib/checks.test.mjs` (new); `scripts/verify-build.mjs`, `scripts/check-seo.mjs`, `scripts/smoke.mjs`, `scripts/SKILL.md`, `memory.md`.
- **Why**: three copies of the same checks had drifted: only one script knew both preview tokens, the SEO check read `sitemap-0.xml` not the index and followed redirects with the token attached, and the smoke check matched redirect targets by suffix.
- **Checked**: `pnpm test` 19 pass, 0 fail (15 before); `pnpm build` 256 pages, 248 sitemap URLs, all checks pass; the smoke check on production prints the same output before and after; a seeded `twitter:card` fault in `dist/about.html` is caught by the guard, then restored.
- **Open**: the SEO check against a local serve is the reviewer's step; not run against a protected preview.

## 2026-11-10: the franchise name split inside the word is caught (improve/p2-checks, plan 031)

- **Type**: fix
- **Changed**: `scripts/rules.mjs` (one pattern), `scripts/rules.test.mjs` (one test appended), `memory.md`.
- **Why**: the shared content rules let a space, hyphen or underscore sit inside two of the three banned names but not the third, so that name written with a split in the middle passed both the sync and the release guard, in text and in paths.
- **Checked**: the new test failed alone before the fix (19 pass, 1 fail); after it `pnpm test` 20 pass, 0 fail; the sync check prints `in sync`; `pnpm build` 256 pages, all checks pass.
- **Open**: not pushed.
## 2026-11-10: the wall's posters take their half on a 1x screen (improve/013-restore-poster-ladder, executor agent)

- **Type**: perf
- **Changed**: `scripts/sync.mjs` (`posters/posters.json` joins the build-only list), `vendor/ex/posters/posters.json` and `sync.lock.json` (by the sync), `src/lib/cards.ts` (env.posters, `ladder` option, `data-plainfxset` held and restored by FRAMED), `src/views/Card.astro` (`ladder: false`), `scripts/verify-build.mjs` (guard also reads `data-plainfxset`), `docs/performance.md`.
- **Why**: the build never gave markup.js `posters.json`, so no poster printed a `srcset` and a 1x desktop fetched all 26 whole posters and fx posters although the 52 halves were deployed.
- **Checked**: `pnpm build` 256 pages, 248 sitemap URLs, 3565 files, all checks pass. dist/index.html and dist/de.html: 26 poster srcsets, 26 `data-plainfxset`, no fx `<img>` with `src` or `srcset`. Card pages (en, de): no `srcset="posters/` and no `data-plainfxset` attribute. Browser, 1280 wide 1x: visible wall posters `@0.5x.avif`, nat 250 = drawn 250; card page poster has no srcset and loads `katagami.webp`.
- **Paint capture**: before 50 frames over 14.75 s -> /private/tmp/013-before; after 153 frames over 13.39 s -> /private/tmp/013-after (different machine load; a reviewer reads the frames).
- **Open**: card pages still choose every card picture by the wall's width (the subject picture draws about 1.8 times larger than its file); wants its own decision. A phone (plain print stays, FRAMED restores the fx srcset) was not checked in a browser.

## 2026-11-10: card pages link a card style's sheet only when they print in it; card.css leaves its inline frost tile (improve/015-render-blocking-css-diet, Claude Code)

- **Type**: perf
- **Changed**: Part A: `src/layouts/Base.astro` (new `cardStyle` prop), `src/views/Card.astro` (names its card's style;
  the plan's `src/pages/cards/[id].astro` is now a wrapper). Part B: `src/components/BattlePage.astro` (sets `--frost` to
  `/ex/icons/frost.webp`), `scripts/sync.mjs` (`frost(t)` pair in the `card.css` entry), `public/ex/card.css` and
  `sync.lock.json` (by the sync), `docs/sync.md`.
- **Rationale**: 25 of 26 card pages (and their language copies) waited on `breakout.css` for one Breakout card, and
  every page carried a 30 KB base64 frost tile in `card.css` that only the battle ever painted.
- **Measured**: `breakout.css` linked on 1 of 26 English card pages (princeton-td) and on the home page; same one card
  in each of the 7 other languages. `card.css` gzip -9: 55045 -> 29561 bytes. Browser: both battle pages and `/de/battle`
  compute `--frost-tile` as `url("/ex/icons/frost.webp")` and fetch it; card pages keep `image-set(...)`.
- **Open**: the operator's look at the battle's slips (trait and move slips, both modes, still show their fine noise).

## 2026-11-10: the wall works for keyboard and screen-reader users (improve/016-wall-keyboard-and-screen-reader, Claude Code)

- **Type**: fix
- **Changed**: `scripts/sync.mjs` (four pairs in the gallery.js entry, one in markup.js), `public/ex/gallery.js` and `public/ex/markup.js` (by the sync), `sync.lock.json`, `docs/sync.md`.
- **Rationale**: (1) a bare P anywhere on the page left for the battle (WCAG 2.1.4); it now plays only from the dock. (2) A pack's "Rival: ..." was replaced by "Pack: ..." before a screen reader spoke it; messages inside one 30 ms window now go out as one line. (3) The rival's wells were aria-hidden copies under a role-less labelled div; the side is now a group and each filled well is an img named by its card. (4) The lens's arrow keys step past the wall's scroll, so Escape focused an off-screen card; the card now scrolls into view first.
- **Measured**: say() simulation prints "Rival: A. Pack: B"; built dist/index.html has the rival group once (dist/de.html too, labelled Gegner); browser: wells img:bday.land / img:Princeton Powerlifting / img:Elo, P from the page stays on /, P from #play reaches /battle#team=katagami,mailroom,agent-pets.
- **Open**: the same changes are requested upstream (plans/016); the lens's focus check needs a person.

## 2026-11-10: the wall saves only the visitor's choices and keeps its history straight (improve/017-wall-saved-state-and-history, Claude Code)

- **Type**: fix
- **Changed**: `scripts/sync.mjs` (six new pairs and four edited pairs in the gallery.js entry), `public/ex/gallery.js` (by the sync), `sync.lock.json`, `src/views/Home.astro` (the plan's `src/pages/index.astro` moved here with the i18n work; every language's home uses it), `src/styles/site.css`, `docs/sync.md`.
- **Rationale**: (1) reduced motion was saved as `ill-pause = '1'` on every load; only the Pause key saves now. (2) A lens that Forward reopened closed with replaceState and left two identical entries; it steps back now. (3) Forward opened an invisible, inert lens in the Machine view; it opens nothing there. (4) The tab kept the home title at a card's address; it reads "<card> | Kevin Liu" while the lens holds the address. (5) Without scripts the wall was 26 dead buttons with the page links hidden from keyboards; the links are real links until gallery.js has booted, then a small script takes them out of the tab order.
- **Checked**: build ends `verify-build: 256 pages, 248 sitemap URLs, 3565 files: all checks pass`; 26 `sr golink` links in dist/index.html and dist/de.html, none of the old form; browser (agent-browser, /): booted true, 26 links hidden; lens at /cards/turboslide titled "Turboslide | Kevin Liu"; Escape back to / and "Kevin Liu"; Forward reopens, Escape returns to /, second Forward reopens. Same on /de (address /de/cards/turboslide).
- **Open**: the same four changes are requested upstream (plans/017); a visitor who already has `ill-pause = '1'` saved from reduced motion stays paused until they press Pause.


## 2026-11-10: a touch screen fetches two cards' pictures with the page, not fourteen (improve/014-phone-first-screen-pictures, executor agent)

- **Type**: perf
- **Changed**: `src/views/Home.astro` (the plan names `src/pages/index.astro`; the home markup now lives here), `docs/performance.md` (one table row's text).
- **Rationale**: a phone's wall is one column, about a card and a half, yet 14 cards printed eager pictures. Cards 3 to 14 now print lazy; `TOUCH_FIRST = 2` stays eager everywhere, and a script right after `FRAMED` (`EAGER`) makes cards 3 to 14 eager again on a fine pointer while the page is still parsing.
- **Measured**: Playwright Chromium, local serve, grounds paused, 8 s cold load of `/`. Desktop 1440x900, first three pairs (noisy, one build at a time): frames before 8, 16, 18 and after 36, 17, 13. Settling run, two baselines served together on 43142 and this branch on 43141, 5 interleaved pairs: frames before 21, 25, 10, 13, 25 (median 21) and after 21, 27, 19, 18, 15 (median 19); desktop `lazy14` 0 in every after run. Phone (devices['iPhone 14'], `(pointer: coarse)` true) frames before 5, 6 and after 6, 6; phone images before 83 / 3789 KB, after 59 / 2890 KB. Built wall lazy map: pockets 1 and 2 are 0/n, 3 to 26 are n/n (English `dist/index.html` and `dist/fr.html`). Captures: `/private/tmp/claude-501/s/{b1440,b1440b,b1440c,a1440,a1440b,a1440c,b390,b390b,a390}` (scratch, lost on reboot).
- **Open**: numbers are from a local serve; check Speed Insights LCP on phones after it ships. Frame counts swing with machine load (the first desktop pair, 8 to 36, was the only one above before + 2).

## 2026-11-10: lane B merges plans 013, 015, 016, 017 and 014 and reviews them together (improve/p2-wall, Claude Code)

- **Type**: merge and review
- **Changed**: five plan branches and one fix branch merged with `--no-ff`; no code written here beyond merge resolution. `memory.md` kept every entry; `sync.lock.json` took the lane's side and was rewritten by a full sync from `rounds-42ff51c7` after 015, 016 and 017; `src/views/Home.astro` and `docs/performance.md` keep both 017's and 014's edits (014's `EAGER` script directly after `FRAMED`, 017's link script after it).
- **Gates** after every merge: sync `in sync`, `pnpm test` 10 of 10, `verify-build: 256 pages, 248 sitemap URLs, 3565 files: all checks pass`. The 016 fix merge and the 014 merge share one gate run.
- **Found**: 016 joined the pack's two status lines into one, and the language shim translated the joined line as if it were one (`/es`: "Rival: Loop, Mailroom, bday.land. Pack: CoTFly, Relay y Kevin Wiki"). Sent back; fixed by `improve/016-shim-split` (17419cd, `said()` translates each line); a real pack press under reduced motion now reads right on `/`, `/es` and `/ja`.
- **Checked on the merged build** (Playwright, full Chromium with the GPU, `/`, `/es`, part on `/ja`): P plays only from the dock; the rival side is a group whose wells name their cards; lens open, Escape, Forward twice, arrow steps and titles; Machine view opens no lens on Forward; Pause is not saved under reduced motion and is saved on a press; scripts-off card links focusable and visible; phone Back and Forward through a lens; the poster ladder (26 halves at 1440 and 1x, whole posters on a phone and on card pages); `breakout.css` on 8 of 208 card pages; the battle's frost tile fetched from its file.
- **First paint**: captures with `scripts/paint-capture.mjs` at 4025230, before 014 and at the tip are in `~/k7-rescue/improve-audit/lane-b/cap/`. Phone wall with the page: 85 pictures and 3,922 KB before, 61 and 3,024 KB after. Six interleaved desktop pairs against a build without 014 show no steady difference in what is missing when the hold lets go; this Mac ran at a load above 100 throughout.
- **Open**: with scripts off each card shows an empty picture box (the plain print's front-effects `<img>` has no `src` until `FRAMED` runs; so at 4025230 too). On the Arena the frost tile is asked for about 150 ms before the page shows, and the first card about 1.3 s later; a `<link rel="preload" as="image">` beside the battle's `--frost` line would take the timing out of it. Chromium's lazy loading still fetches about 34 posters on a phone that has not scrolled.
## 2026-11-10: the battle announces every outcome, the Mat's reduced-motion rule is whole, one h1, a guarded replay (improve/018-battle-screen-reader-and-reduced-motion, executor agent)

- **Type**: fix (accessibility), plan 018, cut from 4025230 (feat/i18n)
- **Changed**: `scripts/sync.mjs` (five pairs on the battle.js entry after plan 008's; the mat.css and arena.css entries rename `.result h1 {` to `.result h2 {`, and the Mat's reduced-motion rule is restored), `public/battle/shared/battle.js`, `public/battle/mat/mat.css`, `public/battle/arena/arena.css` and `sync.lock.json` (by the sync), `docs/sync.md`.
- **Checked**: sync --check `in sync` before and after; step 1 anchor counts 1,1,1,1,1,1,2,2; step 5 counts ok, 2, 0, 0/0, 2/2, 1, 0; phone-memory --check passes; `pnpm test` 10 of 10; `pnpm build` ends `verify-build: 256 pages, 248 sitemap URLs, 3565 files: all checks pass`.
- **Open**: the browser gate (plan step 6: one h1 while playing, non-empty live region, h2 at the result, Mat rail transition 0s under reduced motion) was not run by the executor; the plan hands it to the lane reviewer. The upstream request to the play lane and the single-key shortcut decision (WCAG 2.1.4) remain.

## 2026-11-10: The sound player keeps the choice after Back, the battle's key answers, waits keep real time, a failed manifest retries (improve/019-sound-player-robustness, executor agent)

- **Type**: fix
- **Changed**: `scripts/sync.mjs` (four groups of anchored pairs on the `public/sound/sound.js` entry, after plan 005's), `public/sound/sound.js` and `sync.lock.json` (by the sync), `docs/sound.md`, `docs/sync.md`.
- **Rationale**: pageshow reads the saved choice after a back-forward restore; the battle's speaker key plays `bt.ui.toggle` and skips the gallery group; the player's timers use `battlePace.realTimeout`; a failed manifest clears its cached promise and re-arms the gestures.
- **Checked**: sync check `in sync`; marker counts ok, 1, 1, 1, 4; `pnpm build` 256 pages, 248 sitemap URLs, 3565 files, all checks pass. Browser (preview, agent-browser): (a) true then false on / and on /es; (b) true offline, then true after the second press online; (c) pressed "true", toggled true, files 128.
- **Open**: the upstream request to the sound lane (four lines in the plan); the reviewer appends it.

## 2026-11-10: a new hand lets the last hand's card kits go (improve/022-sound-memory-on-phones, executor agent)

- **Type**: perf, plan 022, stacked on 7245c52
- **Changed**: `scripts/sync.mjs` (two pairs on the sound.js entry: `unload(group)` and its export; two on the battle.js entry: a new hand unloads the card kits it does not hold), `public/sound/sound.js` and `public/battle/shared/battle.js` (by the sync), `sync.lock.json`, `docs/performance.md`, `docs/sync.md`.
- **Rationale**: nothing but a faded theme was ever released, so each New Rival hand added its three new rival cards' decoded kits (about 2.2 MB a card) for the rest of the visit.
- **Measured**: Chromium, iPhone 14 descriptor (coarse pointer true), three Auto hands, New Rival after each; `Sound.stats().pcm`. One-shots at hand 1, 2, 3 loaded: 26.2, 32.5, 39.3 MB before; 26.2, 27.1, 27.6 MB after. `d` 13.1 MB before, 1.4 MB after; hand 3 total 67.7 to 56.1 MB loaded, 41.1 to 29.4 MB at the result. An unloaded group loads again (`card:katagami` 27.6, 26.1, 27.6).
- **Checked**: sync check `in sync`; marker counts 1, 1, 1, 1; phone-memory check six lines; `pnpm test` pass 10, fail 0; `pnpm build` 256 pages, 248 sitemap URLs, 3565 files, all checks pass.
- **Open**: the upstream request to the sound lane (add and export `unload(group)` in `r4/sound/sound.js`, after `evict` and in the `Sound` object) and to the play lane (`r4/play/shared/battle.js` `start()` unloads the previous hand's card groups the new hand does not hold, before loading the new hand's; log `r4/play/REQUESTS.md`); the theme question for Kevin: themes are decoded whole on every iPhone (28.5 MB while a hand plays) because `navigator.deviceMemory` is absent in Safari, and streaming them on a coarse pointer would lose loop points, lap changes and the Final Turns layer there; not checked on a real iPhone.

## 2026-11-10: on a deal the Arena's pads start hidden instead of fading out at the reveal (improve/p2-battle, executor agent)

- **Type**: fix, plan 023, stacked on 4e42cd5
- **Changed**: `scripts/sync.mjs` (one pair on the `board.js` entry: pads created with `data-on="false"` when `ctx.dealing`), `public/battle/arena/board.js` (by the sync), `sync.lock.json`, `docs/performance.md` ("The battle's pops and their causes"), `docs/sync.md`.
- **Rationale**: on a deal the Arena created its pads visible, laid the board out, and only then marked them hidden, so they faded out in front of the visitor and came back with the first cards. Creating them hidden always was tried and rejected: a Mat-to-Arena switch then faded the pads in over 0.2 s.
- **Before**: the Arena's first frame showed both pads on an empty floor, gone in the next frames, back with the first card.
- **After**: no pad before its side's first card; a Mat-to-Arena switch still shows both pads in its first Arena frame; both pads and both flags are there once the first cards have arrived.
- **Checked**: anchor count 1 and 1; sync ended `1 written, 0 removed`; marker counts 1 (new pair) and 1 (plan 008's pair); sync check `in sync`; phone-memory check six lines; `pnpm test` pass 10, fail 0; `pnpm build` 256 pages, 248 sitemap URLs, 3565 files, all checks pass.
- **Open**: four upstream requests to the play lane (pads and flags created hidden on a deal; hide the interface per batch, not per shot; per-card kit and `data-boot` scope; the font gate), as in the plan's "Upstream request" section; a reload in the middle of a hand was not reached in a browser.
## 2026-11-10: the 26-card battle routes, measured (spike, asked by improve plan 026, Claude Code)

- **Type**: spike
- **Changed**: nothing that ships. The result document is `plans/results/026-battle-26-cards.md` on `improve/audit`.
- **Recommendation**: field all 26 cards by rebuilding only `engine.js` first, because the 572 uncommitted battle-r4b
  entries touch nothing under `engine/` or `runtime/`, while every open flash failure and the 27 to 48 hour check
  estimate sit on the scene path; the eight then play default scenes until a scene route follows.
- **Measured**: a committed-scene export plus the dry run's three engine files validates 104/104, 26/26, 26/26, 0 problems;
  none of the eight has a shader world, so fielding them adds no WebGL context under plan 009's two-world cap.
- **Open**: 6 questions for Kevin (battle-r4b's work, machine time, default scenes, the 12 move names, who builds, the
  four trait hooks).
## 2026-11-10: a card page plays its card's own sound on the visitor's press (improve plan 028, Claude Code)

- **Type**: feature
- **Asked**: improve plan 028.
- **Changed**: `src/components/Header.astro` (the sound key shows on `/cards/<id>`, one spacer stays for the pause key's room), `src/views/Card.astro` (one inline script: nothing is fetched until a trusted press of the card or of the key; then the player by content address, `manifest.gallery.json` and the card's `sig:<id>` group), `docs/sound.md` (one paragraph under "Where it is wired"), `memory.md`.
- **Checked**: `pnpm build` ends `verify-build: 256 pages, 248 sitemap URLs, 3565 files: all checks pass`; `pnpm test` pass 10, fail 0. Built pages: `id="sound"` once and one spacer on the three card pages checked, none and two spacers on about, cards, 404 and es/about, once on index. `data-player="/sound/sound.js?v=` once on three card pages; no `boot.gallery.js` on the card page; no sound `<link>`; the script parses, one `import(`, no `fetch(`. Note: `grep -c 'sound.js'` prints 1 on about, cards and 404 because the header's existing script comment names sound.js; no player is loaded there.
- **Open**: the reviewer's browser checks (no sound file before a gesture, the header's positions, the paint recording); the first press can be silent on a cold load; a keyboard cannot press the card (it is not a control).
## 2026-11-10: the 26-card battle routes, corrected (spike, improve plan 026, Claude Code)

- **Type**: spike (correction of the entry "the 26-card battle routes, measured")
- **Changed**: nothing that ships. The result document `plans/results/026-battle-26-cards.md` on `improve/audit` is rewritten in place (Revision 1).
- **What the first entry got wrong**: it said to rebuild only `engine.js`. The battle page's engine is inside `kit.js`
  (`window.showdown`; `vendor/battle/mat/index.html` loads `media.js` and `kit.js`, never `engine.js`). `engine.js` is
  build-only on the site (the roster for `cards.ts`), so an engine-only rebuild would open Battle buttons for teams the page
  refuses. Every route needs a rebuilt kit, with `engine.js` rebuilt in the same step.
- **Recommendation**: Route C redefined: a kit rebuilt from the committed tree with the 26-card engine, the eight on default
  scenes until their own scenes pass the page flash scan; its first gate is the page flash scan over the 18 fielded cards.
- **Measured**: of the 186 files the shipped kit was built from (`r4/play/vendor/SOURCES.md`), 116 differ in the committed
  tree (93 of 133 scenes, 7 of 10 broadcast/src, 7 of 8 engine, 5 of 16 runtime, 4 of 19 other). Last page flash readings:
  next-a (committed = working tree, 2026-11-04) sandbox-arena 86 of 104 variants over the limit, sigil-ui 85 of 99,
  dedalus-terminal 67 of 109, ariadne 252 margin rows in an older run; next-b committed scenes have no reading, the fixed
  working-tree copies 40 open rows. Kit builds in scratch from copies of `.work/mat/build.mjs` and `.work/study/bundle.mjs`
  (entry files re-pointed to the export): (a) eight unregistered 730,959 bytes, `"ommc"` 1, `"katagami"` 14, phone-patch
  anchor 1, `FIGHTERS.length` 26; (b) eight registered 811,308 bytes, `"ommc"` 13, anchor 1, validator 104/104, 26/26, 26/26,
  0 problems. Both `media.js` hold 18 cards. Arena: the eight are in `r4/stage` under `roster.next` and need adding to
  `roster.fields` before `build.mjs` puts them in the Arena manifest.
- **Open**: 7 questions for Kevin (battle-r4b's scene work, default scenes, machine time for the 18-card re-check, the 12 move names,
  the four hooks, who builds and when the pin moves, saved replays). Built kits are in `~/k7-rescue/improve-audit/lane-d/kit-026/a/` and `b/`.
- **Run by the reviewer** (kit (a) swapped into a copy of the build, Playwright Chromium, Auto): a Mat battle between six staged
  cards plays to its result with no page error (404s: the eight's gallery grounds and move thumbnails); in the Arena a staged
  lead has no figure and the battle never leaves its entrance (150 s), while fielded cards play; the same teams and seed give
  a different battle than today's kit (Defeat in 9 turns, Victory in 12), so saved replays change with any kit rebuild.
## 2026-11-10: Claude of Tanks' October footage in the battle's moves, tested in a scratch export (spike, asked by improve plan 030, Claude Code)

- **Type**: spike
- **Changed**: nothing that ships. The result document is `plans/results/030-claude-of-tanks-footage.md` on `improve/audit`.
- **Verdicts**: Sabot Round, One Spec and 14 v 14 GO now (data only: the manifest entry plus the nine files); Killcam GO with the kit (its scene holds a point in the clip's own pixels, `ENTRY` at `claude-of-tanks.killcam.ts:22`, and scene files change only when `kit.js` is rebuilt).
- **Measured**: the data build needs git-ignored media, so a committed-only export fails (357 ignored entries in `r1/study-roster18` and `r2/plates`); with those cloned in, the footage changes exactly one card (`data/media.js: claude-of-tanks`), the splice leaves the other 17 cards equal and the three sync anchors match once each; the new clips are 1600 x 900 and 9,373,541 bytes in all.
- **Run by the reviewer** (the new clips and the entry's `moves` put into a copy of the build, today's kit, Playwright Chromium, the four moves by key on the Mat): all four new clips play with no page error or failed request; Killcam's ring draws at the old clip's point, so it waits for the kit as the scene check says.
- **Open**: 3 questions for Kevin (three clips now or all four with the kit, drop the old `*-clean.mp4` files, the optional trait clip).
## 2026-11-10: the logo decision sheet (improve plan 027, Part 1, Claude Code)

- **Type**: decision sheet
- **Asked**: improve plan 027.
- **Changed**: nothing that ships. The sheet is outside every repository, at `/Users/kevinliu/k7-rescue/improve-audit/logo-decisions/index.html` (it holds Kevin's portrait mark, so it is never copied into a repository or published). The questions are in `plans/results/027-logo-decisions.md` on `improve/audit`.
- **Questions**: Kevin Wiki's logo (portrait, emblem or a new crop), 050525's logo (cursor, title or favicon wing), Podium trophy's origin, Claude of Tanks' archived shield, the Atlas monogram under the 11-01 ruling, Sevenfold's address, and the logo-contrast fix (E15).
- **Checked**: candidates read from rounds `20496336` with `git show HEAD:` only (8 files, byte counts match the plan); the sheet has 32 `<img` lines, no `<script`, no `http` in any `src` or `href`.
- **Open**: Kevin's answers, then Part 2 (the request block and the E15 re-measure) once the cards' session has committed.
- **Looked at by the reviewer**: the sheet rendered locally from `file://` with no request off the disk; all eight candidates show at 20 and 44 px and enlarged.

## 2026-11-10: ship check of the audit release candidate 259ae60 (release/next, Claude Code)

- **Type**: release check
- **Candidate**: be85bbf + improve/p2-on-i18n a95d4f5 (audit plans 011 to 028, 030, 031; merge 08324f0) + the AGENTS.md command
  block refreshed by agent-docs (259ae60). The scaffold also proposed four new SKILL.md files; none were added (a
  `src/pages/SKILL.md` would publish as a page). Plan 029 stays out until `pnpm i18n:translate` runs.
- **Gates**: sync in sync; `pnpm test` 20/20; `pnpm check` 0 errors; negotiation 16 cases; phone-memory; i18n-extract;
  build `256 pages, 248 sitemap URLs, 3565 files`; check-release 7 cases.
- **Preview** `kevinliu-studio-gdb07hq62`: Vercel took Node 24 from `engines` (the project setting says 26.x; the build cache
  was skipped once) and installed from the frozen lockfile; smoke and check-seo (249 pages, 490 links) pass; `?v=`
  addresses get a year and the same file without it max-age=0; fx SVGs a day without `?v=` and a year with it, so `has`
  and `missing` work; eight files byte-identical to the local build. GitHub action tags checkout v7, setup-node v7 and
  pnpm/action-setup v6 exist; the workflow first runs on push.
- **Browser checks against production** (~/k7-rescue/release-next/checks/p2-*):
  - Function: 9 of 9 pass, including plan 018's gate (one h1, h2 at the result, 28 live writes, reduced-motion rail 0s), and 016 (P only from the dock; rival group; both status halves translated; no hang on /es and /pt).
  - Layout: 6 of 6 pass in Chromium and WebKit. Mat slips are 0-pixel different; card headers have no overflow at 320 to 1440 in four languages.
  - Memory: 5 of 5 pass on the iPhone 14 profile:
    - Home loads 61 pictures and 3.0 MB, against 85 and 3.9 MB.
    - Battle sound kits after three hands: 26.2/27.1/27.6 MB, against 26.2/32.5/39.3 MB.
    - Arena and the five-minute soak are within noise.
- **Open**: plan 019's back-forward restore could only be simulated (headless browsers never restore from that cache); no
  real phone, Safari or screen reader; negotiated Markdown has no canonical Link header (also on production).
- **Shipped** (2026-11-10): Kevin said "Yes, push main". main fast-forwarded d3fc558 to 8888233; production deployment
  `kevinliu-studio-qus6l73l6` (dpl_4c6GLm19ffiyGVkmPJDUYezUHDLd) Ready on www.kevinliu.studio, .biz and kevin-liu.tech, built on
  Node 24 with the guard passing; smoke.mjs passes on www; nine live pages and files byte-identical to the checked build;
  /es/no-such-page 404. Rollback: `kevinliu-studio-bpspo4ajg` (d3fc558), docs/deploy.md. The first GitHub Actions run of
  check.yml did not start: the account is locked for a billing issue (the same annotation on turboslide), not a workflow
  error. This record is committed on release/next and not pushed.

## 2026-11-10: the battle's own words in every language (feat/i18n, Claude Code)

- **Type**: feature (branch, not pushed). Kevin: "CONTINUE EVERYTRHING" after choosing the strings-only backport.
- **Rounds**: a session in the rounds repo gave round 5's battle one table of its words, branch
  `play/strings-on-42ff51c7` (481a02cd: shared/strings.js, 271 keys plus 56 trainer lines; 0a919baa: the HUD reads
  `card.<id>.move.<name>.feature` and `card.<id>.trait.rule` before the card's English). No round 6. English is
  byte-identical to 42ff51c7 in both modes (its check). Keep that branch: the battle pin names its commit.
- **Site**: battle pin 42ff51c7 -> 0a919baa (synced from an export: the 11-09 export of 30e69931 + 42ff51c7 with the
  branch's changed files laid over it; no file deleted). `src/i18n/en/battle.json` (325 keys) is extracted from the
  synced table, translated by GT; `/<code>/battle-strings.js` sets `BATTLE_STRINGS` before the modules, with the card
  features (now in content.json) and trait rules. `scripts/i18n-polish.mjs` writes decimal commas and
  `pnpm i18n:translate` saves the result to GT.
- **Checked**: lock-check, build (256 pages) and the guard pass. Headless Chromium auto-matches to the result: es Mat
  at 1440, ja Arena and de Mat on iPhone 14: translated turn tab, move panel descriptions, log, result keys and trainer
  quotes, Leave to `/<code>#you=...`, tab title in the language, page width = viewport, no page errors.
- **Open**: still English by design: card faces, move and trait names, the tooltip's move rule line (it carries
  in-battle accuracy edits). GT wrote HP as both "PV" and "PS" in Spanish. The rounds worktree
  `~/Documents/ChatGPT/portfolio-design-rounds/2026-10-30-strings` can go once its branch is kept elsewhere.

## 2026-11-11: ship check of the translated battle release, candidate 6f7fac9 (release/next, Claude Code)

- **Type**: release check
- **Candidate**: fb2d27d (shipped audit release + its record) + merge of feat/i18n c21d5f2 (8d93bfb) + the i18n session's
  layout fixes 34e0bf8, 4320309, 318e2b0 and 6f7fac9 (fast-forwards).
  - Battle pin 0a919baa, re-synced from `~/k7-rescue/release-next/rounds-0a919baa`: rounds-42ff51c7 with the 12 files of `git diff 42ff51c7 0a919baa` laid over it. c21d5f2 reads in sync against it.
  - Plan 018's h2 patch now anchors on the `txt('result.*')` line.
  - vercel.json adds battle-strings.js to the `?v=` year rule.
- **Gates**: sync in sync; `pnpm test` 20/20; `pnpm check` 0 errors; negotiation 16; i18n-extract (battle.json matches the
  synced table); build `256 pages, 248 sitemap URLs, 3573 files`; check-release 7.
- **Preview** `kevinliu-studio-b676ywgpv` (Kevin: "Yes, deploy a preview"):
  - The Vercel guard passes; smoke and check-seo (249 pages, 490 links) pass.
  - `/<code>/battle-strings.js?v=` gets a year, immutable; the plain address gets max-age=0.
  - Five pages are byte-identical to the local build.
- **Browser checks** (~/k7-rescue/release-next/checks/bs-*):
  - Function on 8d93bfb, 4 of 4:
    - English battle text and results are identical to production.
    - All seven languages play to the result, translated, with no placeholders or raw keys.
    - The audit battle fixes (018, 019, 023) hold; the /es dock battle plays in Spanish.
  - Memory on 8d93bfb:
    - The plan 022 kits are unchanged (26.2/27.1/27.6 MB); the Arena is within noise.
    - Every battle page's heap is +0.2 to 0.3 MB from the new 19 KB shared/strings.js.
    - /<code>/battle-strings.js is about 15 KB gzipped.
  - Layout failed on 8d93bfb, 4320309 and 318e2b0: the move tooltip at 320; the result summary, turn tab and plates at 1280; the ja/ko bench label; then the trait-name ellipsis and the de result key at 320.
  - Layout passes 6 of 6 on 6f7fac9 in Chromium and WebKit, in all seven languages at 320, SE, 390, 1100, 1280 and 1440. English is 0px against production.
- **Open**: at 1280 the Mat's turn tab shows the round's short labels (the pace stays in its tooltip) up to 1439 px on
  translated pages; the move tooltip's rule line and card/move/trait names stay English by design; Spanish HP reads
  both "PV" and "PS".
- **Shipped** (2026-11-11): Kevin said "Yes, push main". main fast-forwarded 8888233 to c08f0fe; production deployment
  `kevinliu-studio-810jiizk6` (dpl_HNgtUJ3tg5yxPCKA4PpX1tznUhoe) Ready on www.kevinliu.studio, .biz and kevin-liu.tech, guard
  passing on Vercel; smoke.mjs passes on www; nine live pages and files byte-identical to the checked build
  (dist-release-6f7fac9); /ja/battle-strings.js?v= serves a year, immutable; /es/no-such-page 404. Rollback:
  `kevinliu-studio-qus6l73l6` (8888233), docs/deploy.md. This record is committed on release/next and not pushed.

## 2026-11-12 — i18n on round 6 (feat/i18n on release/next 6ca803d)

- **Type**: translation + layout fixes for translated battle pages.
- **Rebase**: the two held i18n commits now sit on 6ca803d (the release's own pin move to f28393ef); sync files and
  public/battle are release/next's, byte-identical to the earlier pin move.
- **Changed**: `src/i18n/source.mjs` and `scripts/i18n-extract.mjs` (battle.json takes engine trait rules, moves
  the cards lack by name, and forms.js tower moves: 488 keys); `src/i18n/*/battle.json`, `gt-lock.json`, fonts;
  `src/components/BattlePage.astro` (plate fixes below); `docs/i18n.md`.
- **Fixes found by probing against an English baseline** (same probe and team at /battle):
  - The trait name lost a sub-pixel to the flex shrink and ellipsized ("Waves Are D…") on 20 of 64 desktop plates:
    its shrink weight is now 0.001.
  - The phone turn tab ran off-screen (fr every phone width, de/es/pt 320, ko rival 320): the `.pace` labels and
    fr/es/ko "your move" were shortened by hand and saved to GT with save-local.
  - The rival's strip at 320 cut its last Seen chip (translated plates keep 64 px for the HP; English instead shrinks
    the HP bar to 14 px): only whole chips show now, the rest wrap to a hidden line.
- **Round 6's own (same in English, left to the rounds)**: at 320 the Switch panel is 150 px tall, so its second bench
  row sits under the move console; the tower's `×0.67` chip spills its move key by 10 px at 1440; clamped tower
  move descriptions on the keys (full text in the tooltip).
- **Checks**: extract --check, sync --check, build + guard pass; probes (tower, desk, moves a/b) in Chromium and WebKit
  on all seven languages: 0 English card descriptions in 672 tooltips per engine, desk clean, tooltips clean.

## 2026-11-13: ship check of the cards refit and round 6 battle, candidate 0757628 (release/next, Claude Code)

- **Type**: release check
- **Candidate**: shipped c08f0fe + its record 95ddae5, then:
  - cards pin 30e69931 → c2b17715 (the ex refit through ex.12, Kevin's wall order, the canvas race and lens tray fixes, the darker logo keylines, og refilmed); design/bake/ no longer ships;
  - battle pin 0a919baa → f28393ef (round 6 3bc364c1, the bench-key fix 67842bc9, the card-text hook port);
  - the i18n session's round 6 translations (488 battle keys, translated-plate CSS);
  - two phone-memory patches (ptd-figure.js liveAllowed and runtime.js drawForm: a touch screen takes Princeton TD's stills, so no worker or sprite).
- **Dropped site patches**: the phone tray wrap and ground.js's phone memory (now in r4/ex); 13 battle pairs round 6 landed, plus plan 008's two companions (keptError and bootFailed are upstream); both board.js pairs.
- **Added sync rules**: arena/ptd-ink.json, r4/ex grounds/matter.js.
- **Gates**: sync in sync; `pnpm test` 20/20; `pnpm check` 0 errors; negotiation 16; phone-memory; i18n-extract; build `256 pages, 248 sitemap URLs, 3733 files`; check-release 7.
- **Preview** `kevinliu-studio-n1hco9eyl`: Vercel guard passes; smoke and check-seo (249 pages, 490 links) pass; 14 files byte-identical to dist-release-0757628; battle-strings `?v=` a year; ptd files and the new CoT clips 200.
- **Browser checks against production** (~/k7-rescue/release-next/checks/ex-*, r6-*):
  - Cards:
    - Phone canvas 0 of 32 loads over 64 MB (production 11 of 32).
    - The lens tray stays pinned.
    - Wall order matches; DOM, tab order and twins keep Kevin's order.
    - Keylines on all 52 tiles, no name covered.
    - og 54 files OK.
  - Battle function 7/7:
    - every battle reaches the result with 0 errors or 404s;
    - the Princeton TD worker only when held;
    - CoT One Spec and 14 v 14 clips play;
    - the site's fixes hold (pcm 26.2/27.1/27.6 MB).
  - Battle layout passes at ≥375 and in translations.
  - Battle memory: a phone Arena with Princeton TD is 492 vs 455 MB renderer, after the two phone patches (it was 624).
- **Open**:
  - Round 6 at 320 px:
    - Switch/Kit panels 110–150 px tall, with rows under the console;
    - tower chips 14–29 px past their tiles;
    - a tower chip spills 6 px at 1440.
  - Desktop with Princeton TD is about +440 MB process total (the live sprite).
  - Desktop 1x is about +40–50 MB from the fxcut masks.
  - The pack's status is split (plan 016's 30 ms join no longer covers rituals.js's timing).
  - ptd-figure.js (13 KB) is still imported on phones.
  - Plan 029 waits for pnpm i18n:translate.
  - Killcam and Sabot Round keep their old clips.
- **Shipped** (2026-11-13): Kevin said "Yes, push main". main fast-forwarded c08f0fe to ab60dfb; production deployment
  `kevinliu-studio-19km5t6d2` (dpl_HvFKWDdDqUniAovzcmMNh8ve2fPs) Ready on www.kevinliu.studio, .biz and kevin-liu.tech, guard
  passing on Vercel; smoke.mjs passes on www; 14 live pages and files byte-identical to the checked build
  (dist-release-0757628, same site as ab60dfb); battle-strings `?v=` a year; the new CoT clips 200; /es/no-such-page 404.
  Rollback: `kevinliu-studio-810jiizk6` (c08f0fe), docs/deploy.md. This record is committed on release/next, not pushed.

## 2026-11-13: speed and usability audit, with the SEO audit's site items (perf/speed-usability, Claude Code)

- **Asked**: Kevin, "do a speed and usability audit", with Speed Insights (mobile p75: FCP 6.73 s, LCP 15.63 s, TTFB 1.49 s, INP 48 ms, CLS 0) and an SEO and answer-engine audit (2026-11-12).
- **Found**: TTFB is network and redirects, not the server (static CDN files, HIT 70 ms, MISS 190 to 290 ms, `Vary: Accept` does not split the cache). The home's first paint waited on 1.5 MB of pack and deck background posters and on 3.4 s of main-thread style and layout for all 26 cards (throttled phone, real GPU; Lighthouse's SwiftShader numbers set aside). The battle's reveal waits on its board's desktop-size pictures (r4/play).
- **Changed**: `src/views/Home.astro`, `src/styles/site.css` (pockets start `data-far`; far cards take `content-visibility: auto` at their exact box; tile backgrounds wait); `src/views/Card.astro` (poster priority); `src/lib/battle.ts`, `src/components/BattlePage.astro` (modulepreloads; the h1 and rules section); `src/lib/site.ts`, `src/lib/twins.ts`, `src/views/About.astro`, `scripts/rules.mjs`, `scripts/rules.test.mjs` (home title and description, `worksFor` on every page, age 20); `src/lib/cards.ts` (poster alt); `vercel.json`, `scripts/smoke.mjs`, `src/pages/robots.txt.ts`; `scripts/sync.mjs` transforms on fighters.js (links), hud.css, battle.js, gallery.js, with `sync.lock.json` (synced from a pin export in `~/k7-rescue/speed-audit/rounds-export`); `src/components/Lang.astro`; docs.
- **Measured** (throttled phone, base ab60dfb vs branch, median of 3): home FCP/LCP 3.78 → 2.99 s, /es 3.84 → 3.02 s, bytes 2.56 → 1.31 MB, load 14.9 → 7.9 s, CLS 0; Arena 12.8 → 11.7 s; Mat 14.9 → 14.2 s (noise).
- **Gates**: build 256 pages pass; test 20/20; check 0 errors; negotiation, lock-check, phone-memory, check-release, sync --check pass; check-seo 249 pages, 498 links pass; Auto battles reach the result on Mat (1440, 320) and Arena (390).
- **Open**: `pnpm i18n:translate` (Kevin's key) before release: CI's `i18n-extract --check` fails until then and translated About pages print the age paragraph in English. Kevin to pick the canonical role (title says design engineer; `jobTitle`, BIO and facts say infra-product engineer). r4/play requests listed in the report. Not deployed.

## 2026-11-13 — i18n for the next release (feat/i18n on release/next 3224f65)

- **Type**: translation (Kevin's "Yes, translate" for this release, relayed by the release session).
- **Changed**: `src/i18n/source.mjs` (`homeParts`: the home title, lead and description from `src/lib/site.ts` as
  `{name}`/`{projects}` templates), `src/lib/twins.ts` (`homeTitleIn`, `homeLeadIn`, `homeDescriptionIn`; the twins
  open on the lead), `src/views/Home.astro`, every `content.json`, `gt-lock.json`, fonts, `docs/i18n.md`.
- **Decisions**: translated descriptions keep Seo's 160-character sentence fit, so Latin languages and ko print the lead
  alone; fr "ingénieur design" by hand (GT's "ingénieur en conception" names a mechanical engineer), saved to GT.
- **Checks**: extract --check, gt-lock and the build pass with no [i18n] warning; homes, /about and /battle in 8
  languages at 320, 390, 1280 and 1440, human and Machine views (twin opened), Chromium and WebKit: no overflow, header
  in one row, twin wraps. The battle's flags at those widths all appear in English too (mark x rail keys by 1 px at
  320/390, console tray overlap, clamped move text), except the translated strip's intended name truncation.

## 2026-11-14: ship check of the speed and usability release, candidate e82fc5d (release/next, Claude Code)

- **Type**: release check (Kevin: "Ship-check it")
- **Candidate**: shipped ab60dfb + its record, then:
  - perf/speed-usability a40e98d (merged at 402ec90);
  - Kevin's "Design engineer everywhere" (3224f65; the same strings as the speed session's 72aedc3);
  - the i18n session's GT run 6a2107c under Kevin's "Yes, translate" (the home title, lead and description as templates, design engineer, age 20, fr "ingénieur design");
  - the speed session's late-subject fix e611e03 (merged at e82fc5d).
- **Gates**: sync in sync; `pnpm test` 20/20; `pnpm check` 0 errors; negotiation 16; phone-memory; i18n-extract both; build `256 pages, 248 sitemap URLs, 3733 files`; check-release 7.
- **Preview** `kevinliu-studio-9kzsrml24`:
  - The Vercel guard passes; smoke passes and check-seo passes (249 pages, 498 links).
  - 14 files are byte-identical to the local build.
  - /sitemap.xml returns 308 to /sitemap-index.xml; robots.txt serves as text/plain.
  - The en, es and ja home titles are the new ones.
- **Browser checks against production** (~/k7-rescue/release-next/checks/su-*):
  - Usability passes:
    - at 320 the Switch and Kit sheets show every row and the chips sit inside their tiles;
    - the speed key keeps focus; the move ring holds;
    - the pack status is one line in 20 of 20 runs (production 7 of 20);
    - the language key's name; poster alt text; layout at 4 widths; SEO.
  - Speed passes items 2–5:
    - phone FCP 3.32 → 2.88 s, load 19.3 → 13.3 s, bytes at load 3.29 → 2.24 MB;
    - memory equal or lower; Save-Data skips the poster warm-up; the soak plateaus.
- **Open**:
  - On a throttled phone scrolled 3 s after load, Princeton TD's subject arrives 1.1–1.6 s after its card (production 0; none at a 20 s start). Judged non-blocking.
  - The Tower sheet still scrolls at 320 (also on production).
  - The 1440 Tesla Zapper chip spills 6 px (also on production).
  - Arena tower tiles visible without scrolling at 320 drop 5 → 3.

## 2026-11-18: /about's project order and logos (feat/about-logos, Claude Code)

- **Type**: feature. Kevin: "in my about section add logos to the left of underlined text and make the order: (from top) Claude of Tanks, Katagami, Glyphfield, Jarhead, Turboslide, Agent Machines, then everything else".
- **Changed**: `src/lib/site.ts` (`ABOUT_FIRST`, `ABOUT_NO_LOGO`), `src/lib/twins.ts` (`aboutProjects`, read by `aboutMd`), `src/lib/cards.ts` (`logoOf`: the card's media.gen.js logo and its deep), `src/views/About.astro`, `src/styles/site.css` (`.projects`, `.plogo`).
- **Decisions**:
  - Only /about and its twins (all eight languages, llms-full.txt's About) take the new order; the wall, /cards, /cards.md, llms.txt and the battle keep the roster's order.
  - The logo is the card's own file in a light metal tile ringed by the card's deep at 55% toward black (card.css `.logo`, Kevin 11-11), the mark one cap height tall, the tile centred on the caps and hung in a fixed column, so every name starts at the same x. The underline is on the name only.
  - Kevin Wiki and Atlas print no logo (11-11). The paragraph links (General Translation, Princeton University) and X, GitHub and LinkedIn get none: the repo has no checked-in mark for them, and General Translation may appear only on the Atlas card. The home page has no About section.
- **Checks**: build and guard pass (256 pages); `pnpm test` 20/20; `pnpm check` 0 errors; i18n-extract --check; negotiation 16; check-seo 249 pages, 498 links. /about at 1440, 730 and 390, light and dark: CLS 0, all 24 logos load, one title x per width, no overflow. Screens in `~/k7-rescue/about-logos/`.
- **Open**: `pnpm sync:check` fails on `public/battle/shared/{hud,strings}.js` against the battle pin f28393ef; the comparison reads the rounds checkout, and this branch changes no synced file. Not pushed or deployed.
- **Shipped** (2026-11-18): Kevin said "Push and merge". main fast-forwarded 3ba6ce1 to 04d370f; production deployment
  `kevinliu-studio-26q2uftwm` Ready; smoke.mjs passes on www; live /about and /es/about print the new order and 24 logos,
  /about.md lists the six first. Rollback: `kevinliu-studio-nd8hh3j7l` (3ba6ce1), docs/deploy.md. This record is
  committed on feat/about-logos, not pushed.
- **Follow-up** (2026-11-18): Kevin, "remove the borders around logos". The tiles keep the card's light metal (a dark-ground mark its own ground) with no keyline ring, highlight or metal edge; `logoOf` no longer carries the card's deep. Build and guard pass; /about at 1440 and 390 in both themes: CLS 0, one title x. Committed on feat/about-logos, not pushed.
- **Follow-up** (2026-11-18): Kevin, "add logos by general translation, princeton, and replace x with x logo as text (𝕏), then logo by github and linkedin. use ONLY svgs for all and use thesvg.org for anything".
  - Marks, each an SVG in `src/assets/about/` with its source and licence, inlined by `src/lib/brands.ts` through `src/components/BrandLink.astro` on the same light tile:
    - Princeton, GitHub and LinkedIn are thesvg.org's `default` files (CC0, CC0, MIT).
    - thesvg.org has no General Translation mark (none in its 7,941-icon registry), so it is the GT monogram from `~/repos/Prototemplate/motion/kit/brand/gt-mark.svg`. Inlined, it ships no file of its own and appears only on the /about pages `gtAllowed` already admits (docs/content.md).
  - X prints as 𝕏 in a `span.sym` in the system's symbol face (Apple Symbols on this Mac; no Katagami face holds U+1D54F), named "X" for screen readers. `verify-build.mjs` leaves `span.sym` out of the translated pages' face check, as it does the language list. The twins keep "X".
  - A mark and its name's first word are one unbreakable run (`.nw`), so a mark never ends a line alone (Spanish at 390 did).
  - Project logos are unchanged: Jarhead, OMMC and Podium are still the cards' webp files.
  - Checks: build and guard pass; `pnpm check` 0 errors; test 20/20; i18n-extract --check; check-seo 249 pages, 498 links. /about, /es/about and /ja/about at 1440, 730, 390 and 320, light and dark: CLS 0, no mark parted from its word, one title x, no overflow. Not pushed.
- **Follow-up** (2026-11-18): Kevin, "wait gt has a new logo now". `src/assets/about/gt.svg` is now the refined globe (`refined-1112`; its path's sha256 matches `public/brand/gt-globe-logo.json`), copied unedited from Prototemplate origin/main `public/marks/production/gt-mark.svg`, the one-color master; the doubled-line monogram is GT's previous logo (BRAND.md section 4). `brands.ts` drops each file's role and aria-label, since the mark is decorative. Build and guard pass; CLS 0 in both themes. Not pushed.
- **Follow-up** (2026-11-18): Kevin, "push all our logo updates, but dont let them be on the weird white square".
  - Every /about mark now sits straight on the page, with no tile.
  - A mark drawn in dark ink alone (`src/lib/ink.mjs`) follows the text's colour on the dark theme, so it reads in both themes. That covers Elo, Glyphfield, Katagami, Mailroom, Turboslide, GitHub and GT: an inverted image for a card file, currentColor for an inlined brand mark.
  - Sigil UI and Sevenfold (`ABOUT_INK_FIGURE`) draw inline with their pure black as currentColor, since their black is figure, not ground. Powerlifting's black is its ground, so it stays as printed.
  - Marks on their own dark ground (Local Search, Ariadne, 050525) keep that ground.
  - `ink` is `.mjs` because `scripts/i18n-extract.mjs` runs `cards.ts` in Node.
  - Checks: build and guard pass; check 0 errors; test 20/20; i18n-extract --check; negotiation 16. /about and /es/about at 1440, 730, 390 and 320, light and dark: CLS 0, 28 marks, none split, none blank, no tile, one title x, no overflow.
- **Shipped** (2026-11-18): Kevin, "also push all our logo updates". Rebased on main f3987f1 (the animated signature; memory.md and docs/deploy.md conflicts were appends, both kept); main fast-forwarded f3987f1 to 1ede34f; production deployment `kevinliu-studio-d9zprutnh` Ready; smoke.mjs passes on www. Live /about and /es/about: 28 marks, 5 ink, 𝕏, the globe, no tile; dark 1440 CLS 0. Rollback: `kevinliu-studio-1szylydqm` (f3987f1), docs/deploy.md. This record is committed on feat/about-logos, not pushed.
- **Follow-up** (2026-11-18): Kevin, "use the correct new logo for claude of tanks, the claude soldier on a tank". /about now draws Claude of Tanks' commander mark from `~/claude-of-tanks` origin/main 407b1714 (`public/brand/mark-paper.svg` on the light theme, `mark.svg` on the dark), unedited and inlined from `src/assets/about/claude-of-tanks-{light,dark}.svg` (`ABOUT_LOGO_PAIR`, `markPair`). The tank is wide, so its mark takes the column less 0.3em (`.plogo.wide`). The card still prints the v3 shield from the rounds. Build and guard pass; /about at 1440, 390 and 320, light and dark: CLS 0, the right mark per theme, one title x. Not pushed.
- **Shipped** (2026-11-18): Kevin, "yeah" to pushing the Claude of Tanks mark. Rebased on main c6e5b71 (the signature loop; docs/deploy.md conflict kept both); main fast-forwarded c6e5b71 to 2502d1b; production deployment `kevinliu-studio-d91k0tbsq` Ready; smoke.mjs passes on www; live /about has the commander mark pair. Rollback: `kevinliu-studio-ksfvk7o7x` (c6e5b71). This record is committed on feat/about-logos, not pushed.

## 2026-11-18: the kl signature writes itself (feat/animated-favicon, Claude Code)

- **Type**: feature
- **Asked**: Kevin wanted an animated favicon like www.arlan.me has, "a cool animation", of his own mark (no orbiting dot). Mid-task he added: "the lines drawing themselves in the actual draw order, and should be hoverable in the actual website".
- **Changed**:
  - `src/lib/pen.ts` derives the pen line from the mark's one outline. Its points run in writing order out to the end of the l's tail and back along the other edge. A ray cast across the stroke at each step gives its middle and width, with a median of seven so the k's junction reads true.
  - `src/components/Signature.astro`, mounted in `Base.astro`:
    - The tab icon writes for 1.8 s, holds for 3.2 s, lifts in writing order and writes again.
    - The header's `svg.kl` draws itself in 900 ms on mouse hover or keyboard focus.
    - The static `favicon.svg`, `.ico` and touch icon links are unchanged.
- **Decisions**:
  - SVG frames, not arlan's canvas PNG. In real Chrome a sizeless PNG link never beats `favicon.svg` or the `.ico` with `sizes="32x32"`; this was tested in a headed browser, where the PNG loop ran and the tab kept the static icon. An appended SVG link ties with `favicon.svg` and wins as the later one. The frames are vector, so they stay crisp at any DPR, and they reuse `favicon.svg`'s light and dark style.
  - No faint ghost under the ink, per Kevin's draw-order note.
  - A hidden tab gets the whole mark inline (no fetch), because a `/favicon.svg` href left the tab partly written for about 0.6 s.
- **Verified** (local `astro preview`; this Mac's load average was 15 to 60):
  - `pnpm build` passes the guard; `pnpm check` gives 0 errors; `pnpm test` passes 20 of 20.
  - CLS is 0 on `/` at 1440, 730 and 390, and on `/about` and `/cards/turboslide`, hover included.
  - The tick cost at most 0.3 ms, about 8 ms of script in 10 s. The pen line is computed once in about 2 ms at idle. The module is 2.2 KB gzip.
  - With a real tab switch (agent-browser, headed), `visibilitychange` stopped the frames and the loop restarted on return.
  - Reduced motion leaves only the static links; Pause holds the icon still and resumes it.
  - WebKit and Firefox (Playwright) load with no errors. The header draw works in Chromium and WebKit on `<base href="/ex/">` card pages.
- **Shipped** (2026-11-18): Kevin said "just deploy it fully with the animated logo too". The commit was rebased onto `main` 04d370f (the About logos) and pushed as 313ddbd after the CI gates passed locally. Production deployment `kevinliu-studio-nvrnrfopd` (dpl_EFkFunyd4MNKAv6M2Dpj9Zzh37Ct) is Ready on www.kevinliu.studio. `node scripts/smoke.mjs https://www.kevinliu.studio` passes. On www, the icon link's frames change and the header hover draws with no console errors. The rollback target is in `docs/deploy.md`.

## 2026-11-18: the signature loops without a blank start (feat/signature-loop, Claude Code)

- **Type**: fix
- **Asked**: Kevin: "when we hover over the icon it shouldnt disappear then come back. it should perfectly loop and start from a part of the loop where it undraws itself. same with favicon, undraw the redraw".
- **Changed** (`src/components/Signature.astro`, `src/lib/pen.ts`):
  - On hover or focus the header mark starts whole. It undraws in writing order for 0.7 s and redraws for 0.9 s, and repeats with no pause. On leave it finishes the pass it is in, so it always settles whole.
  - Each mask run's dash moves one way, from offset 0 to -3 with dasharray `1 2` on pathLength 1, so every pass ends where the next begins.
  - The tab icon starts whole, undraws for 1.2 s, redraws for 1.8 s and holds for 3 s. The 0.3 s blank rest is gone.
  - Runs shorter than 4 units merge into the next run, which takes the wider width. On a 0.15-unit run at the k's loop tip, WebKit drew a round-cap dot, and the merge also cuts the mask from 57 paths to 37. Runs waiting to redraw sit at offset -1.02 to -1.98, clear of both dash ends.
  - Cumulative run fractions are clamped to 1, because summed floats broke the keyframe order.
- **Verified** (local preview):
  - The hover loop was frame-checked at 15 fixed times in Chromium and WebKit with no dots. After leave it settled whole, with no animations left running.
  - The tab icon order is whole, then undraw, then redraw, then hold, and the next undraw starts at 6.0 s.
  - The CI gates pass. Each tick costs at most 0.3 ms, about 8 ms in 10 s. CLS is 0 with hover included.
- **Shipped** (2026-11-18): Kevin said "Yes, deploy it". The commit was rebased onto `main` 1ede34f (the About logos) and pushed as ed26467 after the CI gates passed. Production deployment `kevinliu-studio-nvvjx8fz6` (dpl_4biVJGikZzFh9BSnDoYh3NP85KJn) is serving www. The smoke test passes. On www, the hover loop and tab icon order were frame-checked in Chromium and WebKit with no errors. The rollback target is in `docs/deploy.md`.


## 2026-11-18: Claude of Tanks' card shows the commander mark (feat/about-logos, Claude Code)

- **Type**: content
- **Asked**: Kevin: "make sure our claude of tanks card also uses the right logo", after "use the correct new logo for claude of tanks, the claude soldier on a tank". This replaces his 11-11 "Keep the v3 shield" for the card.
- **Changed**:
  - Rounds commit cfc4c9fc (`r4/ex`): `media/claude-of-tanks/logo.svg` is claude-of-tanks@250ce46a92 `public/brand/favicon-mark.svg` byte for byte. The receipts in `art/pop/claude-of-tanks.json` and its two alt printings now name it. `og/claude-of-tanks` and `og/home` (the triptych it leads) were re-filmed with `tools/og.cjs`; both loops are seamless.
  - Here: `PIN.cards` moved from c2b17715 to cfc4c9fc. Since c2b17715, `r4/ex` changed only in docs plus this commit. `ROUNDS=<export> pnpm sync` wrote five files: the logo and the four share files.
- **Verified** (local preview): `pnpm build` and its guard pass. `/cards/claude-of-tanks` shows the commander tile in both themes at 1440, 730 and 390 px, the image loads, and CLS is 0.
- **Open**: not pushed or deployed.
