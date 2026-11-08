# Architecture

The site is Astro 7 with static output. Every page is HTML at build time; the card gallery, the battle and the sound
player are the only scripts, and each page loads only its own.

## Why Astro

The card system the design rounds built (`r4/ex`) prints cards with plain functions (`markup.js` `card(f, opts, env)`)
that also run in Node. Astro calls them at build time, so every card's name, moves, numbers and receipts are in the
HTML a crawler or an agent reads, and the gallery script only wakes cards that are already there. Astro has no client
framework to ship, writes one file per page, and builds the sitemap, Markdown twins and `llms.txt` from the same data.
Next.js would have added a React runtime that none of the round code uses; plain HTML would have meant a second
generator for metadata.

## Layers

| Layer | Where | Owner |
| --- | --- | --- |
| Round material (cards, battle, sound) | `public/ex`, `public/battle`, `public/sound`, `public/og`, `vendor/` | `scripts/sync.mjs`, never edited by hand |
| Build-time card loader | `src/lib/cards.ts` | loads `markup.js`, `fighters.js`, `face.gen.js` and the rest in CommonJS sandboxes |
| Twins and agent files | `src/lib/twins.ts`, `src/lib/machine.ts` | every `.md` endpoint, `llms.txt`, `llms-full.txt` and the Machine view's forms |
| Page frame and SEO | `src/layouts/Base.astro`, `src/components/Seo.astro`, `src/lib/schema.ts`, `src/lib/share.ts` | title, canonical, share image (and loop), one JSON-LD graph; `docs/seo.md` |
| Pages | `src/pages/` | home (the wall), `/cards/<id>`, `/battle`, `/battle/arena`, `/about`, `/404` |
| Release guard | `scripts/verify-build.mjs` | runs after every build; see `docs/deploy.md` |

## Paths and `<base>`

The round code writes relative paths (`media/<id>/pop.webp`, `posters/<id>.webp`). A page that prints cards sets
`<base href="/ex/">`, so those paths resolve as authored. Every link the site writes is absolute (`/battle`,
`/cards/elo`). The battle page sets `<base href="/battle/mat/">` (or `arena/`) for the same reason, and a small inline
script keeps its hash-only history writes on `/battle`.

## First paint and caching

The face, the content-addressed stylesheets and scripts, the wall's held first paint, prefetch and the rest of the
performance bar are in `docs/performance.md`, with how to measure them.

## Machine view

Human and Machine show the same page. In Machine mode the page is a terminal: the dark CRT ground, Katagami Mono, boxes
drawn in box-drawing characters, controls in [ brackets ] with the one in force in inverse video. Every real region
keeps its place and its box and shows what an agent reads there, so flipping the switch lines the two up one to one:

| Region | Machine form |
| --- | --- |
| Human and Machine switch, sound, pause | `text/html` and `text/markdown`: the `Accept` each half asks for; `snd`, and `\|\|` or `>`. Every address answers `text/markdown` with its twin (`vercel.json`), so the links keep their addresses and this switch is the difference |
| Brand, nav, pager | `# Kevin Liu` (the twin's first line) on home, `/` elsewhere; each link's address |
| A wall card | a frame labelled with its number and id; its art as text in the card's colour (`src/lib/ascii.ts` reads the card's own `media/<id>/pop.webp` at build); its record: page, Markdown twin, JSON-LD `@type` and category (`workType` in `src/lib/schema.ts`, which the JSON-LD graph reads too), and its row of `/index.md` |
| Deck, pack, dock | where the deck goes; what the pack fills, its budget and seed; the ids each well holds, the gauge as `#` and `.`, Play's path and seed, live from `gallery.js`'s `__table` |
| A card page | the whole record and art on the stand; the card's twin block by block where the page shows each block: its headings, lead line and links, then one framed panel each for its numbers, trait, moves and related cards |
| About, `/cards`, 404 | each paragraph, list item, question and index row holds its twin's source |
| Footer | its links as addresses, `/llms.txt`, `/llms-full.txt`, the sitemap; one line (status, type, size) opens the curl commands and the page's whole twin |

How it holds:

- Each machine form (`.mx`) is built at build time from `twins.ts`, `cards.ts` and `site.ts` (`src/lib/machine.ts`) and
  nested in the element it describes, so it keys to `.pocket`, `.card` and the card's id, never to the art, and a card
  redesign moves it with the card.
- A region that swaps text (`.sw`) keeps its human form (`.hx`) laid out exactly as in Human mode, only hidden
  (`display: contents`, `visibility: hidden`), and lays the machine form over the same box. Base.astro's `fit()` lets
  the form use the empty room below the box, up to the next element, then shrinks its text half a pixel at a time
  (10 px at the least) until it fits; what still does not fit scrolls inside its box. It runs on a switch, on a Machine
  load once the face is ready, and after a resize. So no box changes size and switching moves nothing.
- Each region shows the twin lines about it: a card page's link row its Live, Source and Battle lines (the inks and
  numbers are on the stand's record), About's "Find me on" its four addresses. A twin line with no place of its own on
  the page is in the footer's whole twin.
- In Human mode the forms are `display: none !important` and the wrappers `display: contents !important`: the human view
  paints as if they were not there.
- In Machine mode a card is `display: none` and its record takes the card's size from the card's own rules: nothing in
  it loads, paints or decodes. The pack's fan paints no posters. The wall's first-paint hold waits on no picture and
  fetches none ahead. The world canvas, stage and lens are hidden.
- Headings keep one text: a heading's twin line is laid over the heading's own box (`.hw`), so every page still has
  one h1 and crawlers read one title. A card page's lists are one framed panel each (`.sl`), so their lines share the
  room their tiles take.
- Frames are characters, not borders: a `.bx` element's top and bottom are long rows of `─` cut to the box, its sides
  columns of `│` under their corners. Nothing is measured; the box sets the frame.
- Katagami Mono (`public/fonts/katagami-mono-site.woff2`, 21.7 KB) is fetched at idle after a Human page loads and
  preloaded when a page opens in Machine mode; it blocks rather than swaps, so no text reflows when it lands.
- On a phone the header has no room for the switch, so the footer holds it, and a skip link for the other view is the
  second Tab stop.
- The battle pages have no Machine view: their switch would be a new key in r4/play's rail. The engine's state is
  readable without `?debug` through `window.showdown` (`parseHash`, `replay`, `Match`) and the address, which holds
  the team, rival, seed and move log after every turn.

Check a change with `scripts/machine-check.mjs`: WebKit compares the human view pixel for pixel with another build and
every region's box between the modes; `ENGINE=chromium` adds layout shifts while switching (WebKit reports none).

## Routes

| Path | What | Twin |
| --- | --- | --- |
| `/` | the 26-card wall, the pack, the dock (Pick Three), the face-down deck to the previous site | `/index.md` |
| `/cards` | every card as a plain index with live sites and public sources | `/cards.md` |
| `/cards/<id>` | one card at full size with its numbers, trait, moves and receipts | `/cards/<id>.md` |
| `/battle`, `/battle/arena` | the Mat and Arena battle (r4/play) | `/battle.md` |
| `/about` | the bio, every project and links | `/about.md` |
| `/llms.txt`, `/llms-full.txt` | agent indexes | |

The home page's lens writes `/cards/<id>` to the address bar, so a shared lens opens that card's own page.
