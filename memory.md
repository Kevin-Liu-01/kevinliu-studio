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
