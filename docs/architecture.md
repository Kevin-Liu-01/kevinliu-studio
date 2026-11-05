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
| Twins and agent files | `src/lib/twins.ts` | every `.md` endpoint, `llms.txt`, `llms-full.txt` and the Machine view |
| Page frame and SEO | `src/layouts/Base.astro`, `src/components/Seo.astro` | title, canonical, Open Graph image and loop, JSON-LD |
| Pages | `src/pages/` | home (the wall), `/cards/<id>`, `/battle`, `/battle/arena`, `/about`, `/404` |
| Release guard | `scripts/verify-build.mjs` | runs after every build; see `docs/deploy.md` |

## Paths and `<base>`

The round code writes relative paths (`media/<id>/pop.webp`, `posters/<id>.webp`). A page that prints cards sets
`<base href="/ex/">`, so those paths resolve as authored. Every link the site writes is absolute (`/battle`,
`/cards/elo`). The battle page sets `<base href="/battle/mat/">` (or `arena/`) for the same reason, and a small inline
script keeps its hash-only history writes on `/battle`.

## Routes

| Path | What | Twin |
| --- | --- | --- |
| `/` | the 26-card wall, the pack, the dock (Pick Three), the face-down deck to the previous site | `/index.md` |
| `/cards/<id>` | one card at full size with its numbers, trait, moves and receipts | `/cards/<id>.md` |
| `/battle`, `/battle/arena` | the Mat and Arena battle (r4/play) | `/battle.md` |
| `/about` | the bio, every project and links | `/about.md` |
| `/llms.txt`, `/llms-full.txt` | agent indexes | |

The home page's lens writes `/cards/<id>` to the address bar, so a shared lens opens that card's own page.
