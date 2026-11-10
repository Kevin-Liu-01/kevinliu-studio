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
| The wall's first paint | `src/pages/index.astro`, `src/styles/site.css` | The first 14 cards (two rows at the widest the gallery sets) load with the page, the first poster at high priority; the rest are `loading="lazy"` until the page has loaded, then fetch at idle, so no lens, pack or dock ever opens on a missing picture. The page is held (`data-hold`, nothing contentful) until the pictures of the cards on screen decode, at most 1 s, so it paints whole in one frame, and a visitor arriving from another page keeps seeing that page until then. |
| Key states | `src/components/Header.astro` | The Human and Machine switch, sound and pause keys take the state their scripts give them after load as the header parses, so no icon flips on screen. |
| View Transitions | `src/layouts/Base.astro` | `rituals.css` (which declares `@view-transition`) loads only where `rituals.js` runs. On card pages it made every return to the wall a default root crossfade through a pale frame. |
| Prefetch | `Header.astro`, `cards/[id].astro` | The header's links and the card pager prefetch their page when in view, so the next HTML is in hand when the visitor clicks. |
| The first press | `src/pages/index.astro`, `docs/sound.md` | A silent `AudioContext` at idle starts the browser's audio service; the sound kit's first press no longer waits on it. |
| Idle cost | `public/ex/ground.js`, `gallery.js` (rounds) | The living grounds draw only on screen (`IntersectionObserver`), stop in a hidden tab and under Pause or reduced motion. |
| Battle keys | `scripts/sync.mjs` transforms | A key's raise and colour change at once; only its press moves. |
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

Left for the battle round (r4/play): the 627 KB `kit.js` bundle keeps the board empty for about 2.7 s before the
deal; the page is blank behind its font gate for up to 2 s on entry; the interface disappears after each cutscene
and snaps back; the Arena shows both pads and labels for one frame, removes them and adds them back; its team rail
shows flat squares before the card art; at 390 the move list slides up over the active cards. The lens's Escape drops
its action bar a frame before the dissolve (`gallery.js`).

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
