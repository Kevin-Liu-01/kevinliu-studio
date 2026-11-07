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
| Page frame and SEO | `src/layouts/Base.astro`, `src/components/Seo.astro` | title, canonical, Open Graph image and loop, JSON-LD |
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

Human and Machine show the same page. In Machine mode every real region keeps its place and its box and shows what an
agent reads there, so flipping the switch lines the two up one to one:

| Region | Machine form |
| --- | --- |
| Human and Machine switch | `text/html` and `text/markdown`: the `Accept` each half asks for. Every address answers `text/markdown` with its twin (`vercel.json`), so the links keep their addresses and this switch is the difference |
| Brand, nav, pager | `# Kevin Liu` (the twin's first line) on home, `/` elsewhere; each link's address |
| A wall card | its record: number, id, page, Markdown twin, JSON-LD `@type` and category (`src/lib/schema.ts`, shared with the card page's JSON-LD), and its row of `/index.md` |
| Deck, pack, dock | where the deck goes; what the pack fills, its budget and seed; the ids each well holds, the gauge's words, Play's path and seed, live from `gallery.js`'s `__table` |
| A card page | the whole record on the stand; the card's twin block by block where the page shows each block, headings marked `#` and `##` |
| About, 404 | each paragraph and list item holds its twin's source |
| Footer | its links as addresses, `/llms.txt`, `/llms-full.txt`, the sitemap; one line (status, type, size) opens the curl commands and the page's whole twin |

How it holds:

- Each machine form (`.mx`) is built at build time from `twins.ts`, `cards.ts` and `site.ts` (`src/lib/machine.ts`) and
  nested in the element it describes, or stacked with the human form (`.hx`) in one grid cell (`.sw`). Nothing is
  measured, so it keeps the real grid at every width, and the cards' redesigns move it with them (it keys to
  `.pocket`, `.card` and the card's id, never to the art).
- In Human mode the forms are `display: none !important` and the wrappers `display: contents !important`: the human view
  paints as if they were not there (`check.mjs` in the session notes compares it pixel for pixel with the build before).
- In Machine mode a card is `content-visibility: hidden`: it keeps its box and paints, decodes and fetches nothing. The
  wall's first-paint hold waits on no picture and fetches none ahead. The world canvas, stage and lens are hidden.
- Headings keep one text: `#` and `##` come from CSS, so every page still has one h1 and crawlers read one title.
- The battle pages have no Machine view: their switch would be a new key in r4/play's rail, and the engine's state is
  only readable under `?debug` there. Both are changes for the battle round.

## Routes

| Path | What | Twin |
| --- | --- | --- |
| `/` | the 26-card wall, the pack, the dock (Pick Three), the face-down deck to the previous site | `/index.md` |
| `/cards/<id>` | one card at full size with its numbers, trait, moves and receipts | `/cards/<id>.md` |
| `/battle`, `/battle/arena` | the Mat and Arena battle (r4/play) | `/battle.md` |
| `/about` | the bio, every project and links | `/about.md` |
| `/llms.txt`, `/llms-full.txt` | agent indexes | |

The home page's lens writes `/cards/<id>` to the address bar, so a shared lens opens that card's own page.
