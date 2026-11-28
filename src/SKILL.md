---
name: src-skill
description: Pages, components, layouts and styles of kevinliu-studio. Home prints the 26-card wall, cards/[id] one card page each, battle and battle/arena wrap the round battle page, plus about, 404, the .md twins, llms files and robots. Read before editing here.
---

# kevinliu-studio / src

## Purpose
<!-- agent-docs:fill:purpose -->
Every public address lives in `pages/`. Each HTML route has a `.md` twin and an entry in the sitemap. This file sits
in `src/`, not `pages/`, because Astro publishes any `.md` file under `pages/` as a page.

## Mental model & key files
<!-- agent-docs:fill:model -->
- `views/*.astro` hold each page's body and take a language `code`; `pages/x.astro` renders a view in English and
  `pages/[lang]/x.astro` in each other language (docs/i18n.md).
- `views/Home.astro`: the wall, deck, pack, dock, lens and stage, printed by `markup.js`; loads the gallery scripts and the
  sound boot (and, translated, `/<code>/gallery.js` before gallery.js).
- `pages/cards/[id].astro`: the card at full size on its own colour, numbers, trait, moves and receipts, prev and next.
- `pages/battle.astro`, `battle/arena.astro`: `components/BattlePage.astro` with the mode.
- `pages/[...twin].md.ts`: every page's Markdown twin in every language, one endpoint over `TWINS` (`lib/twins.ts`).
- `llms*.txt.ts`, `robots.txt.ts`: the other text endpoints.

## Patterns to follow / invariants
<!-- agent-docs:fill:patterns -->
- One h1 per page, set in the content (the header's name is the h1 only on home).
- Every page passes `seo` with a 50 to 170 character description; `verify-build.mjs` enforces it.

## Common tasks → first action
<!-- agent-docs:fill:tasks -->
- Add a route: a view in `views/` taking `code`, the English page and its `pages/[lang]/` twin over `OTHER`, twin
  endpoints in both, `twinsOf` in `lib/twins.ts`, its words in `i18n/en/ui.json` (then `pnpm i18n:translate`), a
  share image (`og` or `share`), a `graph(page(...))`, the Accept routes and canonical `Link`s in `vercel.json` (root
  and language patterns), smoke route in `scripts/smoke.mjs`.

## Gotchas
<!-- agent-docs:fill:gotchas -->
- Room pages use `<base href="/ex/">`: an `href="#x"` would leave the page. Write `/path#x`.
- Every link a page writes goes through its language: `l.p('/cards')`, `cardPath(f, code)`. A hard `/battle` sends a
  Spanish visitor to English.
