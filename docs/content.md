# Content model

## Cards

One source: `public/ex/fighters.js` (synced from r4/ex, generated there by `tools/import-roster.py` from
`roster/battle-roster.json` and the copy editor's `copy/overrides.json`). Each fighter has `id`, `title`, `year`, `url`,
`repo`, `disciplines`, `pinned` (the commit its numbers were read at), `what` (one line), `stats` (hp, atk, def, spd),
`cost` (inks), `facts` (build, reach, proof, pace, each with a receipt), `trait` and `moves` (each with a receipt).

`src/lib/cards.ts` loads it and exposes `fighters`, `card()`, `sheet()`, `whatOf()`, `factLines()`, `hueOf()` and the
battle's roster. Pages, twins and JSON-LD all read from there, so a card's words are the same on its face, its page,
its twin and its structured data.

To change a card's words or numbers, change the rounds (r4/ex `copy/overrides.json` or the roster), rebuild there, and
`pnpm sync` here.

## Site facts

`src/lib/site.ts` holds the name, the bio, the social links, the email and the previous site's address.

Decided by Kevin on 2026-11-05:
- `/about` prints Kevin's own bio (`ABOUT`), first person, word for word.
- `BIO` is one third-person line from the same facts with no employer. Metadata, JSON-LD and the other twins use it.

Changed by Kevin on 2026-11-13 (the SEO and answer-engine audit he pasted): the English home page's title is
`HOME_TITLE` ("Kevin Liu — Design engineer at General Translation") and its description `HOME_DESCRIPTION`;
`HOME_LEAD` opens `/index.md` and `llms.txt`; the Person node on every page carries `worksFor` General Translation and
his General Translation author page in `sameAs`. The same day he named his role "design engineer" everywhere: `BIO`,
his /about sentence, the first fact and `jobTitle`. Translated homes and twins keep their translated lines until
`pnpm i18n:translate` carries these.
- The email is `hello@kevinliu.studio`. kevinliu.studio has no MX record yet, so the address receives nothing until
  Kevin sets up mail or forwarding for the domain.
- Analytics stay Vercel Web Analytics and Speed Insights only. No PostHog.

Added on 2026-11-07 (`docs/seo.md`): `FACTS`, public facts about Kevin with their sources, for the About section of
the llms files and the questions on `/about`; `ALSO_KNOWN_AS`; Devpost among the profiles. Kevin may strike any line.

## Rules the content keeps

- Nothing from the franchise the cards are inspired by: no names, marks, fonts, energy icons or trainer sprites.
  The scan in `scripts/sync.mjs` and `scripts/verify-build.mjs` fails on the names.
- No real people's names or photos. Agent Pets' figures carry no names in any text. The Turboslide hero capture with
  a photographer's credit stays out (docs/sync.md).
- General Translation appears on the Atlas card and its records, the wall and the cards index (which print Atlas's
  line), in Kevin's own bio and facts on `/about` and the llms files, in the English home's title, description and
  opening lines, and in every page's Person node (`scripts/rules.mjs` `gtAllowed`). Never in synced card or battle
  code, or in another card's twin. Two round
  captures that showed it are dropped or painted out by the sync (docs/sync.md).
- OMMC participants are minors: nothing here requests or links the OMMC portal's participant routes.
- The Personal Website's `public/media/art/`, `public/media/curation/` (GPS-tagged) and
  `public/media/portfoliomon/trainers/` never come here. The guard fails any image with GPS metadata.

## What did not carry over from the Personal Website, and why

| Kept | Why |
| --- | --- |
| The kl signature (favicon and header mark) | Kevin's mark; the cards' seal prints the same one |
| Social links | canonical, already public |
| Katagami Sans (Latin subset, 45 KB) | Kevin's own type family, OFL; the cards already set in it |
| The release-guard idea (GPS, truncation, per-page checks) | rewritten for static output in `scripts/verify-build.mjs` |

| Left behind | Why |
| --- | --- |
| The Proof design, Archivo and Newsreader | the new look is the card room; Proof was a different direction |
| The 18 essays | each depends on a custom interactive figure; a text-only port would read broken. A follow-up |
| The Vault engines | their own surface; not part of the four goals |
| The old 33-sound kit | replaced by the r4 sound kit |
| TanStack Start, React, Fumadocs, GSAP | no part of this site needs a client framework |
