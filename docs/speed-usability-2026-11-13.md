# Speed and usability audit (2026-11-13)

Kevin asked for a speed and usability audit with two inputs: Vercel Speed Insights (production, mobile, last 7 days:
Real Experience Score 55, FCP 6.73 s, LCP 15.63 s, INP 48 ms, CLS 0, TTFB 1.49 s) and an SEO and answer-engine audit
of www.kevinliu.studio dated 2026-11-12. Branch `perf/speed-usability`, cut from `origin/main` ab60dfb (production
deployment `kevinliu-studio-19km5t6d2`). Nothing is pushed or deployed.

## How it was measured

- Server: `curl` against production for every page kind: cache status, age, `Cache-Control`, `Vary`, timings.
- Throttled phone: Playwright Chromium with a real GPU (ANGLE Metal), 412 x 823 at 1.75x, touch, CPU slowed 4x, slow
  4G (150 ms RTT, 1.6 Mbps down). Lighthouse's default would have used SwiftShader, which makes `ground.js` compile its
  shader for 10 s and reports home LCP 20.8 s and TBT 6 s; a real phone has a GPU, so those numbers were set aside.
  Recorded: FCP, LCP and its element, the hold's set and lift times, long animation frames with script attribution,
  resource waterfalls, bytes, CLS.
- Before and after: the base build (ab60dfb) and this branch served side by side from `dist/` by a small server with
  Vercel's clean URLs and brotli, runs interleaved A, B, A, B, median of 3. This Mac's load average ran 80 to 240, so
  the absolute times carry its noise; the before and after pairs share it.
- Traces: a Chrome trace of one load to split main-thread time before the first paint by event.
- Usability: code reading by four audit lanes (home speed, battle, SEO, usability), each finding checked by a skeptic
  that tried to refute it; then browser checks of the items fixed.

Tools and raw runs: `~/k7-rescue/speed-audit/` (`tools/measure.mjs`, `compare.sh`, `trace.mjs`, `visual.mjs`,
`panels.mjs`, `tower.mjs`, `a11y.mjs`, `pagediff.py`; `baseline-prod.jsonl`, `cmp-*.jsonl`, `audit-summary.txt`).

## What the numbers said

**TTFB is not the server.** Every page is a static file on Vercel's CDN: `x-vercel-cache: HIT` answers in about 70 ms
from SFO, a cold region's `MISS` in 190 to 290 ms, and `Vary: Accept` (the Markdown negotiation) does not split the
cache (two different browser `Accept` strings both hit after the first). Pages carry `public, max-age=0,
must-revalidate`, so a repeat visit revalidates with a 304. The field's 1.49 s is a phone's connection setup on a
cellular network plus redirects counted into navigation timing: links that land on `kevinliu.studio` take a 308 to
`www`, and in-app browsers (X's `t.co`, LinkedIn) add their own hop. Nothing on the site makes a page dynamic.

**FCP and LCP were the home page's first paint and the battle's boot.** Production on the throttled phone, median of 3:

| Page | FCP | LCP | Bytes | Load |
| --- | --- | --- | --- | --- |
| `/` | 4.44 s | 5.68 s | 2,611 KB | 15.3 s |
| `/es` | 4.52 s | 5.88 s | 2,649 KB | 15.5 s |
| `/cards/turboslide` | 1.46 s | 1.91 s | 466 KB | 2.8 s |
| `/ja/cards/katagami` | 1.85 s | 2.58 s | 801 KB | 4.9 s |
| `/about` | 0.85 s | 0.85 s | 161 KB | 0.7 s |
| `/battle` (Mat) | 10.73 s | 11.16 s | 1,428 KB | 4.9 s |
| `/battle/arena` | no paint within 13 s | | 1,362 KB | 5.1 s |

The home page's LCP element is the first card's poster. Its timeline: the hold is set at 1.8 s (after 68 KB of
render-blocking CSS), the hold script's 1 s cap lifts it at 3.7 to 3.8 s because the first card's pictures were still
downloading, then a 600 ms frame paints the page. Two causes underneath:

1. **1.5 MB of posters with the page.** The Open Pack tile's fan prints every card's poster as an inline CSS
   background, twice, and the deck prints the previous site's face the same way. A background is never lazy, so a
   phone fetched all 26 full posters at 2.6 s, ahead of the first card's own pictures and the deferred scripts.
2. **Style and layout of all 26 cards before the first paint.** A trace before the first paint: 1,562 ms of Layout,
   541 ms of style, 322 ms of parsing, 3.4 s of main-thread work in all. While the parser streamed the wall, the grid
   re-laid out the whole growing wall at every yield (frames of 177, 96, 92, 69, 164, 156, 452 and 325 ms, each a full
   layout of up to 5,000 boxes), all under the hold, so none of it was seen.

The 421 KB of home HTML is mostly repetition that compresses away (59 KB gzip; the 78 `sizes` attributes alone are
99 KB raw, 3.6 KB on the wire). Its cost was never the transfer; it was the style and layout above.

**The battle** loads its scripts by 4.9 s, then keeps the page hidden (`html[data-boot] #app`) until the board is laid
out with every card's pictures, at desktop size: full posters, subject cuts, casts, trainer art and grounds, about
1 to 1.4 MB, which arrive on slow 4G at 10 to 12 s. That gate is r4/play's code (see Upstream). Its ES modules also
loaded as a 3 to 4 level waterfall after the twelve classic scripts.

## Fixes made

Throttled phone, base (ab60dfb) against this branch, interleaved, median of 3:

| Page | FCP | LCP | Bytes | Load | CLS |
| --- | --- | --- | --- | --- | --- |
| `/` | 3.78 → 2.99 s | 3.78 → 2.99 s | 2,558 → 1,308 KB | 14.9 → 7.9 s | 0 → 0 |
| `/es` | 3.84 → 3.02 s | 3.84 → 3.05 s | 2,593 → 1,343 KB | 15.2 → 8.2 s | 0 → 0 |
| `/cards/turboslide` | 1.23 → 1.20 s | 1.78 → 1.79 s | 434 → 436 KB | 2.6 → 2.6 s | 0 → 0 |
| `/ja/cards/katagami` | 1.80 → 1.72 s | 2.40 → 2.44 s | 767 → 769 KB | 4.6 → 4.6 s | 0 → 0 |
| `/about` | 0.71 → 0.72 s | 0.71 → 0.72 s | 137 → 138 KB | 0.6 → 0.6 s | 0 → 0 |
| `/battle/arena` | 12.8 → 11.7 s | 12.8 → 11.7 s | | | 0 → 0 |
| `/battle` (Mat) | 14.9 → 14.2 s | 14.9 → 14.2 s | | | 0 → 0 |

Locally the base home paints at 3.8 s against production's 4.4 s (no real network latency per request); the gain is
the difference. Main-thread work before the home's first paint: 3.4 → 1.0 s (trace).

| Commit | What |
| --- | --- |
| c03cce0 | The deck and pack tiles start `data-far` in the HTML, so their background posters wait until the wall's observer finds them a screen away (where the wall's own posters, the same files, are usually cached). Without scripts they show (`@media (scripting: enabled)`). |
| e2ed93f | Every wall pocket starts far; the hold lets the on-screen ones near before the first frame, the observer does the rest a screen ahead. A far card takes `content-visibility: auto` at its exact box (`contain-intrinsic-size` from `--card` and 63/88; far and near sizes differ by 0 px at 412, 700, 1440 and 2200 wide); a near card has no containment, so a dragged, lifted or on-screen card is never clipped. Chromium and Firefox only (`@supports (overflow-clip-margin)`), human view only. Full-wall screenshots match the previous build at 412 and 1440 (worst 0.016%, animation noise), and scrolling the whole wall records no layout shift. The card page's poster asks for high priority (no measurable change, kept). |
| 693b04d | The battle prints one `modulepreload` per module of its static graph and the mode's board graph, walked from the synced files at build (13 on the Mat, 17 on the Arena). |
| 5f111f4 | `/sitemap.xml` answers 308 to `/sitemap-index.xml` (`vercel.json`, checked by `smoke.mjs`); `robots.txt` names GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended and CCBot under `Allow: /`. |
| e8d2b6f | The English home's title is "Kevin Liu — Design engineer at General Translation"; its description is Kevin's first sentence word for word and "Open source: Claude of Tanks, Jarhead, Glyphfield, Katagami, Sigil UI." (169 characters: his text was 186 and the guard allows 170); the same first sentence opens `/index.md` and `llms.txt`. The Person node (`@id` `/#kevin`, `alternateName` Kevin B. Liu and Kevin Bowen Liu, on every page) carries `worksFor` General Translation and his GT author page in `sameAs` beside GitHub, X, LinkedIn and Devpost. The guard (`scripts/rules.mjs`) now allows the employer's name in every built page. /about says "I am 20". |
| 1733d1b | Local Search links to https://localsearch.kevinliu.studio/ and Kevin Wiki to https://wiki.kevinliu.studio/ (a sync transform on `fighters.js`, synced from an export of the three pins), on the cards, their pages, the lens, `/cards`, the twins and the llms files. Each card's poster carries the card's name as its alt; subjects, casts, logos (beside the printed name) and effects stay decorative. |
| 314f472, 3a607bf | `/battle`'s h1 is the page's title ("Battle", localized; the Arena's "Battle, Arena") in a server-printed section outside `#app` with the battle twin's rules, roster links and play line, about 1,200 characters (was 111). Visually hidden for screen readers and crawlers; shown when scripts are off. The wordmark is a paragraph again and looks the same. |
| dc73dd9 | Round 6 at 320 px: the Switch, Send In and Kit sheets take the console's room on a short phone as the Tower sheet does (at 320 x 568 the Kit sheet was 150 px with 2 of 4 items hidden behind an inner scroll; now 313 px, all shown, no inner scroll; Switch 275 px, all shown). A tower tile's chip wraps inside its pill (five chips ran 2 to 24 px past their tiles at 320; none now, none at 1440). On a phone the speed key that hides itself moves focus to the key it shows (was dropped to the page). A keyboard-focused move keeps its ring under a resting mouse. The header language key's accessible name starts with the code it shows ("EN, Language: English"). The pack's line waits for the rival's deal so both are spoken as one; this split did not reproduce here at 6x CPU in either build, so it is a guard. |

## Verified

- `pnpm build`: 256 pages, 248 sitemap URLs, 3,733 files, all checks pass. `pnpm test` 20 of 20. `pnpm check` 0 errors.
  `check-negotiation` 16 cases, `lock-check` 3,186 files, `phone-memory --check`, `check-release` 7 cases, and
  `sync --check` against the pin export all pass.
- `check-seo` on a local serve of the final build: 249 pages, 498 links, share images, JSON-LD, twins and links pass
  (it found a CJK autolink bug in the new battle section, fixed in 3a607bf).
- Every page and twin diffed against the base build after taking out the intended changes: the only other changes are
  the hold script on the eight language homes and the About age line.
- The battle boots and deals on the Mat at 320, 375 and 390 wide with no page error and no failed request.
  A whole Auto battle (`?auto=1`, seed 30) plays to its result ("Victory") on the Mat at 1440 and at 320 x 568 and in
  the Arena at 390, with no page error and no failed request.
- Phone memory (Chromium, 390 x 844 at 3x, touch; the wall at load, scrolled to the bottom, and back): canvas backing
  7.2 MB and one WebGL context in both builds; decoded pictures at load 26.2 → 13.1 MB (26 pictures instead of 47);
  after the whole wall has been scrolled both builds hold the same 64.4 MB. The budget in `docs/performance.md` holds.
  No WebKit soak was run.

## Not done, and why

- **`pnpm i18n:translate` has not run.** It needs General Translation's key (`.env.local`), so it is Kevin's step.
  Until it runs, the seven translated About pages print the age paragraph in English, translated homes keep their own
  title and description, and CI's `node scripts/i18n-extract.mjs --check` fails (`en/content.json is stale`). Run it
  before this ships, then `python3 scripts/i18n-fonts.py`, and commit both.
- **The role** is settled: Kevin chose "design engineer" as canonical (2026-11-13), and `BIO`, his /about sentence, the
  first fact and the Person node's `jobTitle` say it too. Their translations follow at `pnpm i18n:translate`.
- **No deployment.** `scripts/smoke.mjs` (the `/sitemap.xml` 308, headers) and field numbers need a preview or
  production; that is a push and a deploy, which wait for Kevin.
- **The battle's reveal.** The Mat's first paint stays about 14 s on the throttled phone (10.7 s on production's
  network) until r4/play reveals the board before every picture arrives and prints phone-sized pictures. A site-side
  sync transform was possible but r4/play is being rebuilt on battle-026, so it is an upstream request.
- **Field LCP 15.6 s** mixes pages. Speed Insights' per-route view (not readable here without signing in to Vercel)
  will show how much of it is `/battle`; after the home fixes ship, the home page should fall to about its FCP.
- Smaller items the audit found and left: the deferred ground engine and sound module (about 75 KB gzip moved out of
  the first window, each needs a timing decision), `breakout.css` non-blocking (9 KB), card.css's framed-family rules
  on phones (14 KB, upstream), `frost@2x.webp` on phones (a visual call), battle muted text contrast (about 3:1, a
  design call), the battle's half-size posters on phones (upstream), and 9.5 px plate labels on phones.

## Upstream requests

r4/ex (filed in `r4/ex/REQUESTS.md`):

- fighters.js: Local Search's url is https://localsearch.kevinliu.studio/ and Kevin Wiki's https://wiki.kevinliu.studio/ (the site patches both).
- markup.js: the poster's alt is the card's title.
- markup.js / rituals.css: the pack fan and the deck's face are inline CSS backgrounds and load with the page; print them so they load when the tile nears (the site does this with `data-far`).
- gallery.js: say() holds a pack's line until the rival's deal (the site's patch).
- art: a 900w subject cut for 3x phones, and the full poster as AVIF beside the 504w WebP.

r4/play (owned by the battle-026 session; listed here, not written there):

- The boot reveals the board once it is laid out, not after every picture decodes, or reveals the rail first.
- A phone's board prints the 252w poster half and the half subject (excard.js PLAIN: `sizes` and `env.posters`).
- kit.js per card: the page loads six cards' scenes, not all of them (627 KB raw).
- Adopt the site's hud.css and battle.js patches in dc73dd9 (sheets, tower chips, focus ring, speed key focus).

## Left for Kevin outside this site (not changed)

From the SEO audit, out of scope here: Sigil UI's author URLs, Jarhead and Relay's `llms.txt`, the GitHub profile's
website fields, and `kevin-liu.tech`'s 307 (a Vercel domain setting; it should be a 308 to www). The audit's
unconfirmed claims (a Designers & Machines talk, Ghostty docs) appear nowhere on the site and were not added. The
General Translation Series A is public (Kevin, 2026-11-13): one fact in the llms files' list states it from GT's own
post (2026-11-10, $27m across Seed and Series A, a16z and Upfront leading) and links it. What "we launched" refers to
is not in that post, so it waits for Kevin.

## Follow-up: subjects late on a scrolling phone (e611e03)

The release ship check (release/next 402ec90, its `wall-scroll.mjs`: iPhone 14, 4x CPU, 1.6 Mbps, scrolling 0.8 of a
screen a second from 3 s after load) found 4 to 6 of 26 cards fully on screen before their subject cut arrived
(0.6 to 1.7 s; production's slowest 0.39 s). Two causes: a card skipped by `content-visibility` never starts its lazy
pictures, and the skip was lifted only a screen ahead; and the pack's fan no longer fetched every poster before the
first paint, so as the visitor scrolled each card's poster shared the line with its subject (at 1.6 Mbps a card's
poster, subject, effects and glow, up to 380 KB, take longer than a quick scroll gives them).

The render skip is now its own attribute (`data-skip`), lifted eight screens ahead once the page shows (four screens
left two late cards, eight with nothing else left the same two). On a touch screen, after the load event and at idle,
never under Save-Data, the wall's posters load into the page's image cache in wall order, two at a time, as detached
pictures that are never drawn or decoded. Warming only the cards within eight screens still left two late subjects.

Results on the harness: no card arrives before its pictures (fill at most 53 ms, and 51 ms with the scroll started at
the base's moment), scroll CLS 0. Two earlier runs of the same code at the harness's start each had one late subject
(Princeton TD, 216 KB, up to 1.7 s). The harness starts scrolling 3 s after the load event, which comes 7 s earlier on
this branch, so it scrolls while more is still downloading; with both builds scrolling from 22.5 s, none is late. Home,
base -> this: FCP 3.54 -> 2.85 s, LCP 2.96 s, load 14.9 -> 7.7 s. Bytes by the load event stay about half (1.3 MB);
after it, a phone fetches the 26 posters production's fan fetched before its first paint.

The harness servers here and in release-next send `max-age=0, must-revalidate` for media, where production sends a day
(`vercel.json`); a `fetch()` warm-up is never reused under that header, which is why the warm-up uses detached images.
