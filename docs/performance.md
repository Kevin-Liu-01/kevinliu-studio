# Performance and first paint

The bar (Kevin, 2026-11-05, from `less-is-more-web` section 7): the first paint is static and complete, no navigation
waits on a fetch, every image and island has its space before it arrives, the face is preloaded with a metric-matched
fallback, motion uses only `transform` and `opacity`, canvases and loops cost nothing idle or off screen, and CLS is
0.01 or less. How each part is held, and how to check it.

## What holds it

| Part | Where | What it does |
| --- | --- | --- |
| The face | `public/fonts/katagami-sans-site.woff2`, `src/layouts/Base.astro` | One 27.5 KB subset of Katagami Sans (every character the site prints), preloaded first on every page, named by content address (`?v=`) and cached for a year. `font-display: block`, because the cards' titles are fitted to its advances at build (`markup.js` ADV). The fallback is Arial cut to its width and line (106.9% up to weight 600, Arial Bold at 102% above), so a page that ever paints before it lands keeps every line where it was. No page inlines a face; the guard fails on one. |
| Content addresses | `src/lib/assets.ts`, `vercel.json` | Every stylesheet and script a page names (`/ex/`, `/sound/`, `/battle/`) and every face under `/fonts/` carries `?v=<hash>` and is `immutable` for a year; so are the frame and effect drawings under `/ex/borders/` and `/ex/fx/`, whose `?v=` the rounds write as the file's own sha-256. A face or drawing asked for without `?v=`, the `design/` drawings (their `?v=` is another file's hash), every plain picture address and the files the rounds' own scripts load revalidate or keep a day. The guard fails on an unversioned `/ex/` or `/fonts/` reference and on a face or drawing whose `?v=` is not its hash; `scripts/cache-rules.test.mjs` reads the rules in `vercel.json`; the smoke test checks the headers. |
| The wall's first paint | `src/views/Home.astro`, `src/styles/site.css` | The first 14 cards (two rows at the widest the gallery sets) load with the page on a fine pointer, and the first two on a touch screen (one column), the first poster at high priority; the rest are `loading="lazy"` until the page has loaded, then fetch at idle, so no lens, pack or dock ever opens on a missing picture. A card more than a screen away is neither styled nor laid out (`content-visibility`, at its exact box), and the deck's and pack's background posters wait until their tile is a screen away (2026-11-13, `docs/speed-usability-2026-11-13.md`). The page is held (`data-hold`, nothing contentful) until the pictures of the cards on screen decode, at most 1 s, so it paints whole in one frame, and a visitor arriving from another page keeps seeing that page until then. |
| Poster sizes | `scripts/sync.mjs`, `src/lib/cards.ts` | The wall prints each poster and front-effects poster with its half beside it (`srcset`, the rounds' `posters/posters.json`), so a card drawn under 252 px wide at 1x fetches the half; a card page prints the whole poster (`ladder: false`). |
| Key states | `src/components/Header.astro` | The Human and Machine switch, sound and pause keys take the state their scripts give them after load as the header parses, so no icon flips on screen. |
| View Transitions | `src/layouts/Base.astro` | `rituals.css` (which declares `@view-transition`) loads only where `rituals.js` runs. On card pages it made every return to the wall a default root crossfade through a pale frame. |
| Prefetch | `Header.astro`, `views/Card.astro` | The header's links and the card pager (`data-prefetch-later`) prefetch their page when in view, so the next HTML is in hand when the visitor clicks, but only once this page has loaded, at idle: Astro's own viewport strategy started as its module ran, and on the throttled phone a card page's poster landed about 0.2 s later for it (2026-11-26). |
| The first press | `src/pages/index.astro`, `docs/sound.md` | A silent `AudioContext` at idle starts the browser's audio service; the sound kit's first press no longer waits on it. |
| Idle cost | `public/ex/ground.js`, `gallery.js` (rounds) | The living grounds draw only on screen (`IntersectionObserver`), stop in a hidden tab and under Pause or reduced motion. |
| The signature | `src/components/Signature.astro`, `src/lib/pen.ts` | The tab icon starts whole, undraws the kl mark in its stroke order, redraws it and holds: one added SVG `<link>` whose `href` changes every 90 ms only while the ink moves (0.3 ms a frame at most, about 8 ms of script in 10 s, measured 2026-11-18), the whole mark in a hidden tab, nothing under Pause or reduced motion. It starts at idle after load, so first paint never waits on it. The header's mark undraws and redraws in one seamless loop while the mouse or keyboard focus is on it, and finishes its pass whole on leave, with Web Animations on the mask's dash offsets; its mask is built on the first hover, so pages carry no extra markup. Chrome never shows a sizeless PNG next to `favicon.svg` and the 32 px `.ico`, so the frames are SVG. Safari keeps the static icon. |
| Battle keys | `scripts/sync.mjs` transforms | A key's raise and colour change at once; only its press moves. |
| Minified round code | `scripts/minify-dist.mjs` (in `pnpm build`) | Every script and stylesheet under `dist/` except `_astro` is rewritten with whitespace and syntax minified and every name kept (`scripts/minify-dist.test.mjs`); `public/` keeps the rounds' bytes. On the wire: round scripts 953 to 755 KB, round stylesheets 103 to 57 KB, the wall's render-blocking CSS 57 to 26 KB (2026-11-26). |
| The battle's board pictures | `scripts/sync.mjs` transform on `kit.js` | A board card prints with `sizes` (0.53 of the width standing, 0.37 of the height lying down, the widest a board card is drawn), so `markup.js` takes the smallest subject cut at least as wide as its device pixels. Scene cards print the full cut as before. |
| A phone's memory | `scripts/phone-memory.mjs`, `index.astro`, `site.css`, `Release.astro` | On a touch screen the shared WebGL canvas stops at 2048 and the density at 1.5, an off-screen card gives its canvases back, the next pack is cut at the press, wall pictures stay lazy, a card more than a screen away paints no filters, and the wall and the battle give back their GPU memory and pictures when they leave. See Memory below. |

## Checking it

Numbers come from a Vercel preview, never this Mac's local server (its load average sits in the hundreds). Paint
recordings come from local runs, where only the order and count of paints are meaningful.

1. `vercel deploy` from a clean `git archive` of the commit (so `dist/` and caches are not uploaded), without `--prod`.
2. `VERCEL_OIDC_TOKEN="$(vercel project token kevinliu-studio --scope kl01s-projects)" node scripts/smoke.mjs <url>`.
3. Metrics: agent-browser with the header `x-vercel-trusted-oidc-idp-token` (the same token), a `PerformanceObserver`
   init script for LCP, layout shifts and event timing, and `performance.getEntriesByType('resource')` for bytes. A
   fresh browser per page and width (1440 x 900, and `set device "iPhone 14"`), three runs, the median.
4. Paint timelines: `pnpm build`, serve `dist/` locally, drive agent-browser, and record with
   `node scripts/paint-capture.mjs "$(agent-browser get cdp-url)" <dir> <stop-file>`. Turn the frames into a video with
   the ffmpeg line in that script's header, then run the `ui-recording-timeline` skill (rauchg/skills) on it. Look at
   the sheets: the living grounds' 1 to 3% shimmer after the wall is complete is ambient, not a paint.

## 2026-11-05 round

Previews: before `kevinliu-studio-ompzcprnp` (main 9c6dcba), after `kevinliu-studio-bdtg9om9u` (eaaa07e), both
measured in the same window, three runs each, the median (CLS the worst). This Mac's load average ran from 7 to over
300 during the runs, so LCP and INP carry its noise; bytes, CLS and paint counts do not.

| Page | Width | LCP ms | CLS | INP ms (first-press script ms) | JS KB | Font KB | HTML KB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 1440 | 5,988 → 4,904 | 0 → 0 | 664 (630) → 136 (5) | 200 → 200 | 85.0 → 27.2 | 62.4 → 38.9 |
| `/` | 390 | 4,108 → 3,668 | 0 → 0 | 1,572 (1,531) → 488 (6) | 200 → 200 | 85.0 → 27.2 | 62.4 → 38.9 |
| `/about` | 1440 | 752 → 1,216 | 0 → 0 | 32 → 40 | 3 → 3 | 44.2 → 27.2 | 12.3 → 12.8 |
| `/about` | 390 | 1,648 → 1,232 | 0 → 0 | 32 → 24 | 3 → 3 | 44.2 → 27.2 | 12.3 → 12.8 |
| `/cards/turboslide` | 1440 | 3,096 → 912 | 0 → 0 | 32 → 32 | 3 → 3 | 85.0 → 27.2 | 38.6 → 14.0 |
| `/cards/turboslide` | 390 | 2,468 → 1,576 | 0 → 0 | 24 → 24 | 3 → 3 | 85.0 → 27.2 | 38.6 → 14.0 |
| `/battle` | 1440 | 3,896 → 1,920 | 0 → 0 | 64 → 0 | 470 → 474 | 28.8 → 28.8 | 3.4 → 3.6 |
| `/battle` | 390 | 2,252 → 1,300 | 0 → 0 | 136 → 0 | 470 → 474 | 28.8 → 28.8 | 3.4 → 3.6 |
| `/battle/arena` | 1440 | 3,988 → 1,624 | 0 → 0 | 72 → 0 | 490 → 493 | 53.2 → 53.2 | 3.5 → 3.6 |
| `/battle/arena` | 390 | 4,036 → 3,476 | 0 → 0 | 0 → 40 | 490 → 493 | 53.2 → 53.2 | 3.5 → 3.6 |

Font KB counts the inline base64 face the room pages carried. HTML is the compressed transfer. Every card's images
still load on `/` (about 2.9 MB at 1440, 5 MB at 390 at DPR 3); the change is their order: the first screen first,
the rest once the page has loaded. A second visit fetches no stylesheet, script or face again (immutable by content
address), where before each revalidated. `/about` at 1440 and the battle numbers move with the machine's load; the
battle's pages are unchanged apart from cached script addresses. The raw runs are in the session notes folder
(`perf/before.jsonl`, `perf/after.jsonl`).

Paints from first paint to visually complete, and pops among them (local paint timelines; the battle's own
choreography, which this site only hosts, is listed but was not changed):

| Recording | 1440 before | 1440 after | 390 before | 390 after |
| --- | --- | --- | --- | --- |
| Cold load of `/` | 6 paints, 5 pops | 1, 0 | 1, 0 | 1, 0 |
| `/` → `/about` → `/cards/turboslide` → `/` | 5, 4 | 3, 0 | 4, 3 | 4, 1 (a 440 ms dark hold at load ~450) |
| Lens open and close | 6, 0 (840 ms frozen) | 5, 0 | 5, 1 | 6, 1 |
| `/` → `/battle` (Mat) | 7, 2 | not changed | 16, 5 | 22, 4 |
| Cold `/battle/arena` | 8, 2 | not changed | 17, 5 | 20, 3 |

Pops removed, with their causes:

1. The wall painted in six waves over 640 ms: card frames and text on flat colour, then posters, subjects, logos and
   front effects card by card. 131 eager images competed for the line. Now the first screen loads first and the page
   holds until it decodes.
2. Returning to `/` from a card crossfaded through a pale, then almost white frame (200 ms): `rituals.css` declares
   `@view-transition { navigation: auto }` and was loaded on card pages too.
3. Battle, About and the view switch jumped about 90 px on every navigation between `/` and any other page: only `/`
   rendered the sound and pause keys.
4. The sound key flipped from muted to on when the sound kit booted; the pause key and the Human and Machine switch
   could do the same.
5. A header-only shell painted 120 ms before the wall on return to `/` (from the first version of the hold, which hid
   only the wall).

Interaction: the first press on a card spent 5.5 s (on this Mac under load) inside the sound kit's first
`AudioContext`, whose constructor waits on the browser's audio service starting. A CPU profile of the same press
after the change: pointerdown 48 ms in all, 7 ms of script. At 390 (DPR 3) the remaining 600 to 800 ms is
presentation delay on this Mac's GPU, with the main thread idle; Speed Insights after shipping is the real number.

### The battle's pops and their causes (2026-11-10)

The four things the battle still did against "nothing pops", each with its cause in the round's code (r4/play; line
numbers are the site copies'). One is fixed here; three are requests to the play lane (plan 023 and its result in
the audit's `plans/results/`). Evidence: paint captures and a frame-by-frame reading of the page, before and after,
kept in `~/k7-rescue/improve-audit/lane-c/023/`. Local numbers show order only; a Vercel preview is needed for times.

1. **The Arena's pads faded out at the reveal. Fixed by a sync transform.** On a deal the Arena created its pads
   visible (`battle/arena/board.js:221`), laid the board out, and only then marked them hidden (`drawSides`, `:792`),
   so the page was revealed with both pads on an empty floor, they faded to nothing over 0.2 s (`arena.css:110-111`)
   and came back with each side's first card. Before: the first Arena frame shows both pads, the next frames none,
   then the player's again with its card. After: the first Arena frame has no pad, and each pad arrives once, with
   its card. The pads start hidden only on a deal: creating them hidden always was tried and made a switch from Mat
   to Arena fade them in, which the shipped pair does not (the first Arena frame after the switch has both pads, as
   before). The flags are created and marked in the same order but were never seen on a visible page before their
   card, so they are left alone.
2. **The interface hides and returns around every shot, not around the turn.** `battle/shared/battle.js:507` sets
   `data-scene` at each shot's start and `:547` removes it at each shot's end; the rail and console fade out under it
   (`mat.css:202`, `arena.css:251`) and back in after 0.25 s without it (`mat.css:56`), and the plates, the log and
   the turn tab flip `visibility` after 0.12 s (`battle/shared/hud.css:366`, `:427`). In the opening, between the two
   leads' entrances, the rail and console went from opacity 0 back to 1, stood for about 0.7 s and dropped to 0
   again. Left to the round: hide for the batch, not for each shot.
3. **The first paint waits on about a megabyte of blocking scripts, then on the whole boot.** Twelve classic scripts
   stand before the page's module (`vendor/battle/mat/index.html:96-107`, 1,064 KB uncompressed, `kit.js` 627 KB of
   it, holding all 18 battle cards' scenes for a hand that uses six), `battle.js:53` registers every scene at module
   top level, and `html[data-boot] #app { visibility: hidden }` (`battle/shared/battle.css:58`) hides the page, the
   static rail included, until a start has laid the board out. Locally the Arena's first frame came 2.3 s after the
   navigation, after one black frame; the Mat's came at 1.4 s with the board already in it. Left to the round: a kit
   per card, and a boot gate that lets the rail paint first.
4. **The font gate was not what held the page.** `html[data-fonts] body { visibility: hidden }`
   (`vendor/battle/mat/index.html:15`, 2 s cap) lifts when the 28.8 KB preloaded face arrives: 190 ms on the Arena
   against a first contentful paint at 2328 ms (kit.js at 236 ms), and 102 ms against 1160 ms on the Mat (kit.js at
   148 ms). It can only add blank time when the face arrives after the scripts and the boot.

Not looked at by this spike, as recorded before: the Arena's team rail shows flat squares before the card art; at
390 the move list slides up over the active cards. The lens's Escape drops its action bar a frame before the
dissolve (`gallery.js`).

## Memory (phones)

Kevin, 2026-11-06: "it crashes on mobile a lot". Safari kills a tab whose WebContent or GPU process passes its limit
(and shows "A problem repeatedly occurred"), and fails canvases past its canvas budget. Production (0d8fb9d) was
measured on three phone profiles and fixed on `fix/mobile-memory`.

The budget, per phone profile: canvas backing 64 MB or less, one WebGL context for the grounds (the battle has two),
nothing rastered ahead of a press, WebContent under 500 MB at its peak, and no growth across a three-minute soak
beyond the page mix.

What held the memory, measured in WebKit at iPhone 14 (390 x 844 at 3x):

| Cause | Held | Fix |
| --- | --- | --- |
| The grounds' shared WebGL canvas grew to 4096 x 4096 to print all 26 cards' first frames at once | 128 MB (two buffers) | 2048 on a touch screen or a small-memory device; a frame that does not fit copies out and reuses it (ground.js already did). Density 1.5 there. |
| Every card's ground and front-effects canvases kept their backing store while scrolled away | 55 MB | A held print's canvas is 0 x 0 until the frame that draws it; a print is held as it leaves the screen |
| A device-size filter buffer for every painted card (the cracks' glow covers the whole card) | about 190 MB of WebContent | A wall card more than a screen away paints no filters (`data-far`, `site.css`) |
| The next pack's three 3D card copies and packet, rastered on the stage at opacity 0.001, plus their well cards | GPU layers | Cut at the press on a touch screen, as under reduced motion |
| The battle prerendered behind the wall as soon as both teams exist (Chromium), and its opening cast built at idle | Pixel 7 profile, the wall with teams in the address, median of 3: renderers 179 to 171 MB (largest 155 to 147), GPU 535 to 430 MB (measured on a Mac at load average 340+, so noisy) | No prerender and no cast ahead of a press on a touch screen or a small-memory device (`scripts/phone-memory.mjs`) |
| All 26 cards' pictures fetched and decoded at idle | about 30 MB decoded before any scroll | Stay lazy on a touch screen |
| The battle's media preload kept a detached `<video preload="auto">` per clip | a decoder per clip until a collection | Drops its source once its first frame loads |
| Safari's back-forward cache keeps the wall and the battle alive behind the page in view | the whole page | On a touch screen they lose their WebGL contexts and drop canvases, clips and pictures as they enter it; a return loads them again, and the wall writes the dock's team into its address first so the reload keeps it (`node scripts/check-release.mjs dist/index.html`) |
| The battle's stage kept every card's cutscene world (a WebGL2 canvas each) once linked | a context per card with a world, up to 12 across a visit | On a touch screen or a small-memory device only the world going out and the one coming in are kept |
| The battle's media warm-up kept every fetched clip and picture as a Blob | the bytes of every warmed file, up to 111 MB of scene media | The Blob is dropped once it arrives |
| The cards' live prints drew behind the result and under the Log | a frame loop with nothing to show | They pause there |

### How it was measured

`scripts/memory/soak.mjs` (Playwright: WebKit for the iPhone profiles, Chromium on the Metal GPU for Pixel 7) serves
the same two builds (production's bytes, and this branch) and, per profile, scrolls and navigates every page for at
least three minutes: the wall (scrolled through, a card's lens opened and closed), two card pages, About, the Mat and
Arena battles (two presses each), two Back steps and the 404, sampling every 2 s. Process numbers are macOS
`phys_footprint`, the number iOS counts; canvas, WebGL, picture and video numbers come from an init script
(`scripts/memory/probe.js`). Run WebKit profiles one at a time. This Mac's load average sat between 110 and 155, so
times are slow; memory is not timing.

Desktop WebKit keeps more in its caches and surface pools than a phone, so the absolute process numbers are high for
an iPhone and the before and after difference is what counts. Canvas, WebGL and picture numbers are exact.

### Results

Three-minute soaks, before (production, 0d8fb9d) and after (this branch). Peaks over the whole soak; home medians over
every sample on the wall. No profile crashed in either build.

| Profile | WebContent or renderer peak | GPU process peak | Wall median, WebContent | Wall median, GPU | Canvas peak | Pictures decoded on the wall, peak |
| --- | --- | --- | --- | --- | --- | --- |
| iPhone 14, WebKit, 390 x 844 at 3x | 739 → 471 MB | 1,208 → 882 MB | 577 → 362 MB | 931 → 538 MB | 187 → 43 MB | 116 → 86 MB |
| iPhone SE, WebKit, 375 x 667 at 2x | 379 → 386 MB | 829 → 622 MB | 266 → 284 MB | 667 → 428 MB | 186 → 41 MB | 114 → 82 MB |
| Pixel 7, Chromium (Metal), 412 x 915 at 2.625x | 505 → 405 MB | 1,064 → 970 MB | 158 → 142 MB | 558 → 436 MB | 188 → 43 MB | 117 → 86 MB |

The shared WebGL canvas: 4096 x 4096 (128 MB with its two buffers) → 2048 x 2048 (32 MB) on every phone profile; live
card canvases on the wall: 52 → the 2 to 6 on screen. The before iPhone SE soak covered five pages in one loop (no
404); the after soak covered all six in two, so its WebContent peak is the Arena's, not the wall's. On the Pixel 7
each soak took about 15 minutes to reach every page on this loaded Mac; its first and last minutes show no growth
(renderer 155 → 127 MB before, 138 → 98 MB after).

Settled, the wall scrolled halfway and still for 3 s, iPhone 14, medians of 2 to 3 runs: GPU process 820 to 540 MB,
WebContent 345 to 180 MB.

On the iPhone 14 the wall's WebContent rose with every visit before (368, then 550 to 640, then 540 to 680 MB) and
rises more slowly after (130 to 180, then 430 to 470 just after the Arena, then 335 to 395 MB). Desktop WebKit keeps
that memory as cache while nothing asks for it back, in both builds. In an 820 s same-run soak (2026-11-07) the wall
rose 307 → 864 MB on the fix and 538 → 1,272 MB before; WebKit's low-memory warning
(`notifyutil -p org.WebKit.lowMemory`, the kind iOS sends before killing a tab) dropped both to about 60 to 120 MB
within 5 s. So a rising soak on desktop WebKit is not a leak by itself: send the warning and see what stays. The Arena itself holds about
400 MB of WebContent and two WebGL contexts (the battle round's board and broadcast kit); that is the next place to
look, in r4/play.


2026-11-09, the battle on a phone (plan 009). Before and after, one 150 s Auto battle (`?auto=1`, seed 30, three against
three), Chromium with Playwright's iPhone 14 descriptor (touch, mobile; `(pointer: coarse)` true): world canvases on the
stage 3 → 2, phase `result` in both. The soak's WebKit iPhone 14 profile (`/battle`, `/battle/arena` at rest, no battle
played, so the cap and the Blobs are not exercised): live GL contexts 2 → 2 on both pages; WebContent 231 → 213 MB and
203 → 229 MB; GPU process 686 → 903 MB and 599 → 731 MB. Those last four moved with the load of this Mac (load average
above 400, other builds running) and are not a result of the change. The pause check (Chromium, same descriptor): the
prints were running at rest (`paused` false), `paused` true with the Log open and false after it closed. The Blob
saving was not measured separately.

### The Machine view (2026-11-07)

The Machine view keeps the page laid out and shows each region's machine form in its box (docs/architecture.md). It
holds its cost down by loading nothing a card would: in Machine mode the wall's cards are `display: none` (a hidden
card kept its layout box, so its lazy pictures loaded as the wall scrolled) and the pack's fan paints no posters (its
hidden backgrounds fetched them, and the wall's lazy posters completed from that cache). iPhone 14, same run, two
rounds against the view it replaced: pictures 48.5 MB both, canvas equal or lower, WebContent 64 and 68 against 52 and
56 MB on the wall (the old view hid the whole page). Human mode is unchanged.

The terminal (2026-11-08) adds Katagami Mono, 21.7 KB, fetched at idle after a Human page has loaded (cached a year,
like the site face), and each card's art as text: home HTML 43.5 to 50.6 KB gzip, a card page 15.1 to 16.6, About
14.0 to 15.2. The art is built from the cards' own pictures at build, so no picture is decoded for it.

Measured again on 2026-11-10 (`gzip -9 -c dist/<page>.html | wc -c`, after the framed templates, round 5 and the
language key): home HTML 55,500 bytes gzip (341,792 raw), a card page (`cards/turboslide`) 17,239,
About 15,882.
### Decoded audio across hands (2026-11-10)

Method: Playwright Chromium with the iPhone 14 descriptor (coarse pointer true), three Auto hands at double speed with New Rival after each result, reading the player's own `Sound.stats().pcm` (decoded bytes). Before (build of `7245c52`; every New Rival hand kept its three new rival cards' kits for the rest of the visit):

| Moment | One-shots MB | Music MB | Total MB |
| --- | --- | --- | --- |
| hand 1, kit loaded | 26.2 | 0 | 26.2 |
| hand 1, result | 26.2 | 0 | 26.2 |
| hand 2, kit loaded | 32.5 | 28.5 | 60.9 |
| hand 2, result | 32.5 | 2.3 | 34.8 |
| hand 3, kit loaded | 39.3 | 28.5 | 67.7 |
| hand 3, result | 39.3 | 1.8 | 41.1 |

After (a new hand unloads the card kits it does not hold; the same three hands were dealt):

| Moment | One-shots MB | Music MB | Total MB |
| --- | --- | --- | --- |
| hand 1, kit loaded | 26.2 | 0 | 26.2 |
| hand 1, result | 26.2 | 0 | 26.2 |
| hand 2, kit loaded | 27.1 | 28.5 | 55.6 |
| hand 2, result | 27.1 | 2.0 | 29.1 |
| hand 3, kit loaded | 27.6 | 28.5 | 56.1 |
| hand 3, result | 27.6 | 1.8 | 29.4 |

`d` (one-shots at hand 3 loaded minus hand 1 loaded) was 13.1 MB before and is 1.4 MB after; at the third hand the page holds 11.7 MB less decoded audio (39.3 to 27.6). A group unloaded and loaded again through the player's own face gave its bytes back and took them again (`card:katagami`: 27.6, 26.1 after unload, 27.6 after load). An emulated phone on a loaded Mac is not a real phone: the decoded sizes are exact, the process totals on an iPhone were not measured. Themes are still decoded whole on every iPhone (28.5 MB while a hand plays), because the player's low-memory path tests `navigator.deviceMemory`, which Safari does not have; that is Kevin's decision.

## 2026-11-13 round

The speed and usability audit: `docs/speed-usability-2026-11-13.md` (measurements, fixes, what is left).

## 2026-11-26 round

Kevin asked for the site to be "much more performant" without losing the cards, the battle, the sound or the Claude
of Tanks hero. Branch `perf/fast-site`, from main fc3f955. Field numbers were not readable: the Speed Insights query
API (`vercel metrics vercel.speed_insights.*`) needs the paid Speed Insights Plus add-on. Everything below is lab.

How it was measured: Playwright Chromium with a real GPU, the throttled phone of 11-13 (412 x 823 at 1.75x, touch, 4x
CPU, 1.6 Mbps, 150 ms RTT) and 1440 x 900 at 1x; the gesture-required autoplay policy, and the battle's sound files
blocked until a press (Playwright counts a navigation as a user activation, so the battle's `resumeAtLoad` would
otherwise fetch about 200 sound files before the reveal, which a cold phone visit never does). Production first, then
the base build and this branch served from `dist/` over HTTP/2 (a self-signed local server; HTTP/1.1 misstates how a
low-priority prefetch competes with a high-priority poster), runs interleaved A, B, A, B, median of 3. This Mac's
load average sat at 30 to 45 from other work, so times carry its noise; bytes do not. "Reveal" is when the battle
lifts `data-boot`. Tools and raw runs: `~/k7-rescue/speed-2026-11-26/`.

Production, median of 3 (the battle rows with sound blocked):

| Page | Phone FCP | Phone LCP | 1440 FCP | 1440 LCP | 1440 TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 3.18 s | 4.34 s | 0.99 s | 1.94 s | 375 ms | 0 |
| `/cards/claude-of-tanks` | 1.92 s | 2.45 s | 0.51 s | 0.64 s | 0 | 0 |
| `/cards/turboslide` | 1.58 s | 1.98 s | 0.24 s | 0.31 s | 0 | 0 |
| `/about` | 1.11 s | 1.11 s | 0.26 s | 0.26 s | 0 | 0 |
| `/cards` | 0.72 s | 0.72 s | 0.16 s | 0.16 s | 0 | 0 |
| `/battle` | 9.90 s | 10.62 s | 0.82 s | 0.84 s | 0 | 0 |
| `/battle/arena` | 11.18 s | 11.18 s | 1.09 s | 2.13 s | 0 | 0 |

The costs, largest first:

1. **The battle on a phone.** Everything before the reveal is bandwidth: about 600 KB of scripts (`kit.js` 221 KB
   alone, as Vercel compresses it), then the six board cards' pictures, each card's subject at its full cut (941 to
   1200 px wide, 87 to 200 KB) for a card drawn 46 to 220 px wide. The Mat's reveal waits on the two leaders'
   atlases, which queue behind those pictures. The Arena's is a serial chain: scripts, the 281 KB floor map, the
   layout solve, the six figures, the card prints.
2. **The round code ships with its comments.** `public/` holds the rounds' bytes as the lock records them and Astro
   copied them out verbatim: the wall's render-blocking CSS was 57 KB on the wire (`card.css` 32 KB of it), the round
   scripts 953 KB in all.
3. **The wall's first second after load on a desktop** (r4/ex): `Ground.init()` 480 to 540 ms in one task, the first
   frame that draws the grounds 400 to 620 ms, the rituals' prewarm 180 to 1,010 ms. Field INP is 48 ms, so this
   went upstream.

Fixed:

- 5b1217b, the battle's board pictures (`kit.js` sync transform): a board card prints with `sizes`, so `markup.js`
  takes the smallest subject cut at least as wide as its device pixels. The sizes are the widest a board card is
  ever drawn, measured through Auto battles in both modes at 320, 390, 412, 730, 844 x 390 and 1440 wide: 0.52 of
  the width standing and 0.36 of the height lying down, which includes the phone Mat's enlarged turn and Auto's
  lunges. So a 3x phone keeps the full cuts and a 1x desktop or a 1.75x phone takes the half. At 1440 x 900 the
  board's screenshot differs from the previous build in 0.008% of its pixels by more than 16 levels (max 41).
- 8891de5, the next pages prefetch after this page has loaded (the Prefetch row above): a card page's poster had
  landed 0.2 s later under Astro's viewport timing once the CSS shrank.
- 15e9043, byte budgets in the build (`scripts/budgets.json`, `scripts/budgets.mjs`): the guard fails a page whose
  HTML, render-blocking CSS or scripts outgrow its kind's budget, about 10% over today's largest; main fails it on
  272 page checks.
- 7c54797, 47fda96, the build minifies the round code (`scripts/minify-dist.mjs`, tested): whitespace and syntax
  only, every name kept, nothing removed, nothing lowered, written only when smaller. Brotli at Vercel's level: round
  scripts 953 to 755 KB, round stylesheets 103 to 57 KB, the wall's render-blocking CSS 57 to 26 KB, a card page's
  47 to 24 KB. Every main route at 1440 and 390 loads with no error; four Auto battles (Mat and Arena, 1440 and 390)
  reach their result with no error; the wall's press, sound unlock, pack, Escape and Machine view behave as before;
  screenshots of the wall, `/cards`, two card pages, `/about` and `/ja/cards/katagami` at 1440, 730 and 390 match the
  previous build pixel for pixel.

Base (fc3f955) against this branch, throttled phone, local HTTP/2, interleaved, median of 3:

| Page | FCP | LCP | Battle reveal | Scripts | Render-blocking CSS | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 2.78 -> 2.24 s | 4.35 -> 4.75 s | | 190 -> 134 KB | 61 -> 31 KB | 0 -> 0 |
| `/cards/claude-of-tanks` | 1.63 -> 1.14 s | 2.31 -> 2.21 s | | 4 -> 5 KB | 47 -> 24 KB | 0 -> 0 |
| `/cards/turboslide` | 1.40 -> 1.02 s | 1.82 -> 1.82 s | | 4 -> 5 KB | 47 -> 24 KB | 0 -> 0 |
| `/battle` (Mat) | 9.06 -> 8.33 s | 9.78 -> 8.91 s | 8.96 -> 8.23 s | 559 -> 448 KB | 69 -> 38 KB | 0 -> 0 |
| `/battle/arena` | 10.18 -> 9.19 s | 10.18 -> 9.19 s | 10.02 -> 9.03 s | 631 -> 479 KB | 67 -> 37 KB | 0 -> 0 |

At 1440 x 900 (unthrottled, same server) every page moves by less than 0.1 s either way, inside this Mac's noise, with
the same byte savings. Over HTTP/1.1 the Mat's reveal moved 13.7 -> 10.4 s, because six connections queue the full
subject cuts behind each other.

Under DevTools throttling the wall's LCP read 0.4 s later while its first paint came 0.55 s sooner. That is the
throttling, not the page: DevTools shares the line evenly across requests and ignores priority, so the first card's
poster (65 KB, `fetchpriority="high"`) finished only once the low-priority requests the sooner CSS starts (the frost
tile, cards 3 and 4 inside Chrome's lazy-load distance, `sound.js`) had their share. The preview settled it (next
section): on one shaped link, where Vercel's HTTP/2 priorities decide what arrives first, the wall paints whole
0.1 s sooner.

### The preview (perf/fast-site b4b86da)

Production (main fc3f955's content) against the preview `kevinliu-studio-ghzgiomin`, throttled phone (4x CPU),
interleaved, one warm-up each, median of 5 on `/` and 3 elsewhere. Two network models: DevTools throttling (even
share per request), and `~/k7-rescue/speed-2026-11-26/tools/shape-proxy.mjs`, a CONNECT proxy that sends every tunnel
through one 1.6 Mbps, 150 ms link in the order the server sends, with TCP backpressure, as a phone's radio does
(`measure3.mjs --proxy=<port>`). The shaped link is the truer of the two for priority.

| Page | LCP, DevTools | LCP, shaped link | Battle reveal, shaped link | Scripts | Render-blocking CSS | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 4.34 -> 4.90 s | 2.98 -> 2.89 s | | 228 -> 150 KB | 69 -> 36 KB | 0 -> 0 |
| `/cards/claude-of-tanks` | 2.42 -> 2.28 s | 3.17 -> 1.56 s | | 17 -> 6 KB | 54 -> 28 KB | 0 -> 0 |
| `/battle` (Mat) | 10.36 -> 9.23 s | 16.06 -> 11.93 s | 15.78 -> 11.59 s | 594 -> 465 KB | 79 -> 45 KB | 0 -> 0 |
| `/battle/arena` | 10.47 -> 9.19 s | 11.74 -> 10.76 s | 11.64 -> 10.62 s | 728 -> 540 KB | 77 -> 44 KB | 0 -> 0 |

On the shaped link the wall's poster paints with its first paint on both, so its LCP is its FCP. The Mat gains most
there because its full subject cuts queued behind each other on the one link. The smoke check and `check-seo.mjs`
(249 pages) pass on the preview, and its versioned files are the local build's bytes with a year's cache. Raw runs:
`~/k7-rescue/speed-2026-11-26/preview/`.

Left for the rounds (`~/k7-rescue/speed-2026-11-26/UPSTREAM.md`; the r4/play ones went to the battle-026 session, which
owns r4/play and is rebuilding `kit.js`, so the site's `kit.js` patch stops the sync there until the kit carries it): carry the
board `sizes` in the kit; a reveal that awaits the board's pictures on purpose (the Arena reveals before Katagami's
subject lands on a slow phone, and the Mat's wait on them is an accident of request order); the Arena's serial chain
and its one map size; `kit.js` per card; content addresses for the battle's module graph; and splitting the
grounds' first second into idle tasks.

## 2026-11-28 round: what a visitor feels

Kevin, 2026-11-28: "the website interactions and loading and other stuff is still very bad". Every route and every
interaction measured on production's code (main ba959ef) served locally over HTTP/2, the throttled phone of 11-13 on
the one shaped link (`shape-proxy.mjs`) and 1440 x 900, three runs, the median. Tool: `~/k7-rescue/arch-2026-11-28/
tools/felt.mjs` (raw runs beside it). This Mac's load average sat at 30 to 77 from other work.

Production itself was measured once at 1440 and then left alone: about 2,000 requests in a few minutes from one
address made Vercel's firewall answer 403 and show its Security Checkpoint ("We're verifying your browser") to every
browser on that network, Kevin's included, for a few seconds. Measure local builds or previews, never production in
bulk. Two harness traps found on the way: Playwright turns the HTTP cache off while any request is routed (block files
with CDP `Network.setBlockedURLs` instead), and any DevTools session stops Chromium prerendering
(`PrerenderingDisabledByDevTools`), so a prerender's gain is read in a real browser.

Ranked by what a visitor waits for, phone first:

| # | What | Phone | 1440 | Owner |
| --- | --- | --- | --- | --- |
| 1 | Battle load (reveal) | Mat 11.3 s, Arena 9.7 s; one 3.1 to 7.0 s main-thread frame in `kit.js` | 0.58 s, Arena LCP 1.5 s | battle-026 (r4/play) |
| 2 | The wall, cold | FCP = LCP 2.7 s (held until the first screen decodes); the second card's art arrives 1.5 to 2 s later and pops in | FCP 0.89 s, LCP 1.67 s, TBT 138 ms | site and r4/ex |
| 3 | Back to the wall / the brand to the wall | 1.1 s / 1.7 s with the old page frozen meanwhile | 0.48 s / 0.51 s FCP, 1.0 to 1.1 s LCP | site |
| 4 | Battle Auto, Log, Mat and Arena | Auto INP 216 ms, frames up to 167 ms; Log 120 ms; a switch runs 250 to 380 ms of script | under 60 ms | battle-026 |
| 5 | Open Pack | INP 192 ms (`rituals.js`) | 56 ms | r4/ex |
| 6 | A card's lens / Escape | shown 252 ms / 386 ms | 88 ms / 382 ms | r4/ex (`gallery.js` timing) |
| 7 | Human view after Machine | | INP 192 ms, all presentation | site and r4/ex |
| 8 | Card page to card page, About, /cards | 0.37 to 0.83 s | under 0.11 s | fine |

Scroll, the sound and pause keys, and every page's CLS were fine (CLS 0 everywhere; no frame over 50 ms scrolling the
wall on the phone).

What the phone's wall waits on (cold, shaped link, priorities from CDP): the font and four sheets by 1.6 s, then the
first card (poster 65 KB, subject 67 KB) shares the line with the second card (poster 120 KB, full subject 136 KB,
since the phone draws it wider than the half cut), the frost tile at 2x (`icons/frost@2x.webp`, 89 KB, High, from
`ui.css`'s `image-set`), `sound.js` (15 KB, High) and the deferred round scripts (about 80 KB). The hold lifts at its
1 s cap before the second card has decoded.

Fixed here: the header's links and the card pager prerender from the press on a desktop (a88f95f, then on press
rather than hover after the branch's review: a hover prerender read the visitor's Human or Machine, Pause and sound
choices once, so a choice made between the hover and the click landed on a stale page, and the wall's gallery.js could
save the stale mode back), and analytics waits for a prerendered page to be opened. Not fixable here without a visual or timing call (pending in
docs/entropy.md): the frost tile at 1x on phones (89 to 23 KB), and loading the sound kit after the first screen.
Sent to battle-026 with these numbers: items 1 and 4.
