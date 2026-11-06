# Performance and first paint

The bar (Kevin, 2026-11-05, from `less-is-more-web` section 7): the first paint is static and complete, no navigation
waits on a fetch, every image and island has its space before it arrives, the face is preloaded with a metric-matched
fallback, motion uses only `transform` and `opacity`, canvases and loops cost nothing idle or off screen, and CLS is
0.01 or less. How each part is held, and how to check it.

## What holds it

| Part | Where | What it does |
| --- | --- | --- |
| The face | `public/fonts/katagami-sans-site.woff2`, `src/layouts/Base.astro` | One 27.5 KB subset of Katagami Sans (every character the site prints), preloaded first on every page, cached for a year. `font-display: block`, because the cards' titles are fitted to its advances at build (`markup.js` ADV). The fallback is Arial cut to its width and line (106.9% up to weight 600, Arial Bold at 102% above), so a page that ever paints before it lands keeps every line where it was. No page inlines a face; the guard fails on one. |
| Content addresses | `src/lib/assets.ts`, `vercel.json` | Every stylesheet and script a page names (`/ex/`, `/sound/`, `/battle/`) carries `?v=<hash>` and is `immutable` for a year; the files the rounds' own scripts load keep plain addresses and revalidate. The guard fails on an unversioned `/ex/` reference; the smoke test checks the header. |
| The wall's first paint | `src/pages/index.astro`, `src/styles/site.css` | The first 14 cards (two rows at the widest the gallery sets) load with the page, the first poster at high priority; the rest are `loading="lazy"` until the page has loaded, then fetch at idle, so no lens, pack or dock ever opens on a missing picture. The page is held (`data-hold`, nothing contentful) until the pictures of the cards on screen decode, at most 1 s, so it paints whole in one frame, and a visitor arriving from another page keeps seeing that page until then. |
| Key states | `src/components/Header.astro` | The Human and Machine switch, sound and pause keys take the state their scripts give them after load as the header parses, so no icon flips on screen. |
| View Transitions | `src/layouts/Base.astro` | `rituals.css` (which declares `@view-transition`) loads only where `rituals.js` runs. On card pages it made every return to the wall a default root crossfade through a pale frame. |
| Prefetch | `Header.astro`, `cards/[id].astro` | The header's links and the card pager prefetch their page when in view, so the next HTML is in hand when the visitor clicks. |
| The first press | `src/pages/index.astro`, `docs/sound.md` | A silent `AudioContext` at idle starts the browser's audio service; the sound kit's first press no longer waits on it. |
| Idle cost | `public/ex/ground.js`, `gallery.js` (rounds) | The living grounds draw only on screen (`IntersectionObserver`), stop in a hidden tab and under Pause or reduced motion. |
| Battle keys | `scripts/sync.mjs` transforms | A key's raise and colour change at once; only its press moves. |

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
