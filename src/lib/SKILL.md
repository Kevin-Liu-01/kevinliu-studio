---
name: src-lib-skill
description: Build-time data for kevinliu-studio. cards.ts loads the rounds' card code in CommonJS sandboxes, twins.ts writes every Markdown twin and llms file, site.ts holds Kevin's facts, battle.ts splits the battle page. Read before editing here.
---

# kevinliu-studio / src/lib

## Purpose
<!-- agent-docs:fill:purpose -->
The data every page and agent file reads, computed once at build.

## Mental model & key files
<!-- agent-docs:fill:model -->
- `cards.ts`: runs `public/ex/{fighters,markup,art,media.gen}.js` and `vendor/ex/face.gen.js` in `vm` contexts with a
  CommonJS shim, because this repo is ESM and the round files are classic scripts with CommonJS exports. Mirrors r4/ex
  `build.mjs`'s `env`, so `card(f)` prints exactly what the rounds print.
  The `vm` contexts are a module shim, not isolation: round code runs with the build's rights (docs/sync.md, Pins).
- `twins.ts`: `homeMd`, `cardsMd`, `cardMd`, `battleMd`, `aboutMd`, `llmsTxt`, `llmsFullTxt`, `qaOf`, and `TWINS` (path to twin).
- `site.ts`: `SITE`, `BIO`, `FACT_LIST` (public, sourced; `q` files a fact under a question on /about), `FACTS`, `factsFor`, `QA`, `ALSO_KNOWN_AS`, `SOCIAL`, `EMAIL`, `PREVIOUS`, the `person` JSON-LD node.
- `schema.ts`: `graph()`, `page()`, `work()`, `cardList`: one JSON-LD `@graph` per page (`docs/seo.md`).
- `share.ts`: the share images for pages the rounds draw none for, rendered by `pages/share/[name].jpg.ts`.
- `battle.ts`: reads `vendor/battle/mat/index.html`, swaps its round-relative paths, splits head and body.

## Patterns to follow / invariants
<!-- agent-docs:fill:patterns -->
- One source per fact. A page never reads round files directly.
- `battle.ts` swaps must each match exactly once; a changed source fails the build loudly.

## Common tasks → first action
<!-- agent-docs:fill:tasks -->
- New page: add its twin to `TWINS` (`src/pages/[...twin].md.ts` serves it in every language), then a line in `llmsTxt`.
- New card field on pages: read it from `fighters` here, never from HTML.

## Gotchas
<!-- agent-docs:fill:gotchas -->
- `FACE[id].hue` holds the card's colours (`energy`, `deep`, `panel`, `glint`, `ink`).
- The battle holds fewer cards than the wall; `battleRoster` reads its roster from the engine bundle `vendor/battle/vendor/engine.js`.
